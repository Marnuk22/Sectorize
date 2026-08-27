# ROADMAP — Vallis

Backlog de tareas pendientes. Marcá con `[x]` lo completado. Organizado por prioridad y área.
Para el contexto del proyecto (arquitectura, convenciones, reglas), ver CLAUDE.md.

---

## 🏢 MVP Multisucursal + empleados ✅ (cliente real: verdulería 3 sucursales en Tandil)

Cambio estructural grande: hoy Vallis asume "un usuario = un local". Este MVP introduce un nivel de **negocio** que agrupa **sucursales**, con **empleados por rol**. Toca base, RLS, AuthContext y varias pantallas. **Se hace por etapas, probando cada una antes de la siguiente** (igual que se hizo el bloqueo por suscripción). NO intentar todo de una.

### Decisiones ya cerradas (no reabrir sin motivo)
- **Enfoque de datos:** reusar `locales` como "sucursal" y agregar una tabla `negocios` por encima que las agrupa. Se conserva casi todo lo construido (RLS, AuthContext, Edge Functions) en vez de reescribir. Nota semántica: "local" pasa a significar "sucursal" (nombre legado tolerado, como "gymgestor").
- **Alcance:** MVP a medida de ESTA verdulería, con reglas FIJAS (no configurables), pero sobre un modelo de datos que naturalmente sirve para cualquier multisucursal. NADA de "todo configurable" — eso se agrega si un futuro cliente lo pide.
- **Productos:** catálogo COMPARTIDO a nivel negocio.
- **Stock:** SEPARADO por sucursal.
- **Precios:** iguales por defecto, EDITABLES por sucursal (tabla intermedia `producto_sucursal` con stock y precio; producto base compartido).
- **Roles FIJOS (3):** Dueño (ve las 3 sucursales, config, reportes consolidados) · Encargado (gestiona SU sucursal: vende, stock, reportes de su sucursal, ve costos) · Empleado (solo vende en SU sucursal, no ve costos ni reportes ni edita productos).
- **Empleados:** atados a UNA sucursal fija. El dueño se relaciona al negocio (ve todas).
- **Caja/arqueo:** cada sucursal la suya; el dueño ve por sucursal + consolidado.
- **Reportes:** consolidados (las 3 juntas) + por sucursal, para el dueño.
- **Arranque:** de cero, sin migración de datos previos.

### Etapa 1 — Diseño del modelo de datos (SOLO diseñar, no implementar) ✅
- [x] Modelo propuesto y verificado contra el esquema real (`list_tables`): tabla `negocios` (id, nombre, dueño_id), `locales` gana `negocio_id` (NOT NULL, todos los locales existentes migran a un negocio de 1 sucursal), `perfiles` gana `negocio_id` + `local_id` nullable + rol de 3 niveles (`admin`→`dueño`, se agrega `encargado`; dueño con `local_id` null ve todo el negocio), y tabla `producto_sucursal` (producto_id, local_id, stock, precio) para stock+precio por sucursal.
- [x] Relación catálogo↔stock por sucursal definida sin romper lo que hoy asume producto→local directo: `producto_sucursal` **solo existe para negocios con 2+ sucursales** (la verdulería); los locales de 1 sola sucursal (mayoría de los clientes actuales) siguen usando `productos.stock_actual`/`precio_venta` directo, sin tocar código ni datos. `productos` gana `negocio_id` opcional, mutuamente excluyente con `local_id` (CHECK).
- [x] Diseño completo en `C:\Users\oniam\.claude\plans\smooth-riding-squid.md` (incluye nota de circularidad `negocios.dueño_id`↔`perfiles.negocio_id`, y qué toca cada etapa siguiente). Revisado y aprobado antes de tocar nada — Etapa 2 (migración real) requiere su propia aprobación antes de correr SQL.

### Etapa 2 — Migración del esquema ✅
- [x] Tablas migradas en Supabase: `negocios` creada, `locales.negocio_id` (NOT NULL, cada local existente migró a su propio negocio de 1 sucursal), `perfiles.negocio_id` + roles unificados (`admin`→`dueño`, se agregó `encargado`), `productos.negocio_id` opcional + `producto_sucursal` creada (sin policies todavía, 0 filas — se activa en la Etapa 5).
- [x] `registrar_local_y_perfil` reescrita: crea negocio + local + perfil dueño en un solo alta.
- [x] Rollback: no se guardó un script aparte — el historial de migraciones de Supabase (`list_migrations`) ya es el registro reversible, una por una.
- **Nota:** un primer intento de esta etapa violó el CHECK de `rol` por el orden de los pasos (update antes de ampliar el constraint); se detectó al toque porque la migración corrió en una sola transacción y quedó todo revertido — no hubo estado parcial. Se corrigió reordenando (ampliar constraint → update → angostar constraint) y se reaplicó bien.
- **Incidente post-Etapa 2 (detectado y resuelto durante el diseño de la Etapa 3):** el rename `admin`→`dueño` rompió en silencio 7 policies que comparaban el rol en texto plano (`arqueos`, `categorias`, `mesas`, `productos`, `sectores`, cancelar `ventas`, editar `locales`) — ningún dueño podía abrir caja, editar productos/mesas/sectores/categorías, cancelar ventas ni editar su local hasta que se aplicó un hotfix puntual (7 `ALTER POLICY`, mismo alcance, solo el valor del rol corregido). Verificado con roles simulados antes y después.

### Etapa 3 — RLS multisucursal (el paso más delicado) ✅
- [x] Policies reescritas para las 14 tablas con `local_id` del dominio del MVP (retail: `locales`, `productos`, `categorias`, `mesas`, `sectores`, `arqueos`, `ventas`, `detalle_ventas`; gimnasio, a pedido, aunque no las use esta verdulería: `socios`, `membresias`, `suscripciones`, `clases`, `asistencias`) vía dos funciones reutilizables (`sucursales_del_usuario()`, `sucursales_gestionables()`): dueño ve/gestiona todas las sucursales de su negocio, encargado solo la propia (gestiona en las tablas dueño-only), empleado solo ve/opera la propia. Se agregaron policies nuevas para `negocios` (antes deny-all). Quedaron fuera a propósito `impresoras` (sin necesidad de vista consolidada) y `producto_sucursal`/`productos.negocio_id` (0 filas, sin UI todavía — se diseña en la Etapa 5).
- [x] Bloqueo por suscripción integrado con el modelo nuevo — ver Etapa 3.5.
- [x] Probado con roles simulados (`SET LOCAL ROLE authenticated` + `request.jwt.claims`): un dueño con una segunda sucursal temporal (creada y revertida dentro de la misma transacción) pudo verla y gestionarla; confirmado que NO puede ver ni tocar una sucursal de otro negocio.
- [x] Advisor de seguridad corrido sin hallazgos nuevos relevantes.

### Etapa 3.5 — Suscripción a nivel negocio ✅
- [x] Decisión de negocio: la suscripción se paga y evalúa a nivel **negocio**, no por sucursal — si el dueño paga, se habilitan todas sus sucursales juntas; si no, se bloquean todas juntas.
- [x] `suscripcion_estado`/`suscripcion_id`/`suscripcion_vence`/`prueba_vence` movidas de `locales` a `negocios` (con backfill verificado antes del DROP). `estado_acceso_local` mantiene nombre y firma pero ahora resuelve sucursal → negocio → estado, así que ninguna policy de la Etapa 3 necesitó tocarse de nuevo.
- [x] Edge Functions `suscribir` (ahora usa `negocio_id` como `external_reference`) y `webhook-mp` (con fallback: si el `external_reference` no matchea un negocio directo, lo trata como un `local_id` viejo y resuelve su negocio — necesario porque ya existen 3 suscripciones reales de MercadoPago, una activa y pagando, creadas antes de este cambio y con `external_reference = local_id` fijado del lado de MP) desplegadas.
- [x] Frontend: tipo `Negocio` separado de `Local`; `AuthContext` carga y cachea `negocio` con el mismo patrón cache-then-refresh; `suscripcion.ts`, `AccesoSuscripcion` y `PanelMiPlan` migrados. Confirmado en `pnpm dev` que "Mi suscripción" se sigue viendo bien.

### Etapa 4 — AuthContext y selección de sucursal ✅
- [x] `AuthContext` resuelve usuario → negocio + sucursal activa + rol: nueva query a `locales` por `negocio_id` (la RLS de la Etapa 3 ya devuelve todas si es dueño o solo la propia si es encargado/empleado, sin bifurcar por rol en el frontend), nuevos `sucursales: Local[]` y `cambiarSucursal(id)` cacheados en localStorage (`sucursales`, `sucursalActivaId`), mismo patrón cache-then-refresh.
- [x] Empleado/encargado: sin cambios, siguen entrando directo a su única sucursal. Dueño: selector "Sucursal activa" en `MenuUsuario`, visible solo si `sucursales.length > 1` (hoy ningún negocio real tiene más de 1 — no cambia nada visible todavía).
- [x] Se auditaron los ~20 consumidores existentes de `local`/`localId` (5 contexts de dominio, hooks, paneles, tickets) — todos ya eran reactivos (`useEffect([localId])` o lectura directa en render), así que no se renombró nada y ninguno necesitó cambios.
- [x] Probado en vivo: sucursal temporal creada en un negocio real, selector apareció, cambio de sucursal refetcheó Inventario/Ventas correctamente, sucursal de prueba borrada al confirmar.

### Etapa 5 — Adaptar las pantallas al contexto de sucursal ✅
- [x] Selector de sucursal para el dueño (cambiar entre sucursales sin cerrar sesión) — quedó resuelto en la Etapa 4, ya que todos los contexts ya reaccionaban a `localId`.
- [x] **Etapa 5a — Alta de sucursal:** función `agregar_sucursal` (SECURITY DEFINER, solo dueño, hereda `modulos`/`plan` de una sucursal existente) + botón "Agregar sucursal" en `MenuUsuario`. De paso se cerró una policy vieja y peligrosa (`"cualquiera puede crear un local"` en `locales`, `INSERT WITH CHECK true`) que había quedado abierta desde antes del modelo de negocios. Probado en vivo: sucursal nueva creada, catálogo independiente confirmado (cada sucursal con su propio inventario, como corresponde hasta la 5b).
- [x] **Etapa 5b — Catálogo compartido (backend):** RLS de `producto_sucursal` (dueño/encargado gestionan su alcance, empleado solo ve) y de `productos` extendida con el camino `negocio_id` (lectura para todo el negocio, escritura del registro compartido dueño-only; el camino `local_id` queda intacto). Nueva función `estado_acceso_negocio`, con `estado_acceso_local` convertida en wrapper suyo (mismo nombre/firma, cero policies retocadas). `agregar_sucursal` ahora migra sola el catálogo de un negocio la primera vez que pasa de 1 a 2 sucursales (preserva el stock real de cada producto en su sucursal de origen, sin fusionar por nombre, con stub en 0 para la sucursal nueva) y solo agrega stubs en altas siguientes. Probado con datos simulados — el negocio real de KioscoNuevo/Kiosco2 (2 sucursales con catálogos independientes hoy) queda sin tocar a propósito hasta la Etapa 5c, para que el corte sea atómico y el dueño no vea un Inventario vacío en el medio.
- [x] **Etapa 5c — Catálogo compartido (frontend):** `MenuContext` bifurca solo (`compartido = sucursales.length > 1`, sin queries extra para detectarlo) entre el camino directo (local_id, sin cambios) y el compartido (`producto_sucursal` embebido + aplanado a la misma forma `Producto` de siempre). Los 5 componentes de Inventario no necesitaron ningún cambio — todos pasan exclusivamente por `useMenu()`. `types/index.ts`: `Producto.local_id` nullable + `negocio_id` nuevo. Migrados los 4 productos reales de KioscoNuevo/Kiosco2 al modelo compartido (stock real preservado en su sucursal de origen, stub en 0 en la otra). Confirmado en vivo: ambas sucursales ven el mismo catálogo de 4 productos.

### Etapa 6 — Reportes consolidados ✅
- [x] Vista del dueño: reporte consolidado (todas las sucursales sumadas) + desglose por sucursal. Todo del lado del frontend — la RLS de la Etapa 3 ya dejaba leer ventas/arqueos de todo el negocio, sin migraciones nuevas.
- [x] `useHistorialVentas` gana `sucursalFiltro`/`setSucursalFiltro` (`'todas' | 'propia' | local_id` puntual) detrás de un opt-in `consolidarPorDefecto` para no cambiar el comportamiento de `HistorialVentas.tsx`, que sigue viendo solo su sucursal activa sin tocarse. `ContenedorInforme.tsx` suma el selector de sucursal (solo visible con 2+ sucursales) y una sección "Por sucursal" en modo consolidado. `exportarInformeAExcel` gana una hoja "Por sucursal" condicional. Confirmado en vivo con el negocio real de KioscoNuevo/Kiosco2.
- **Hotfix crítico encontrado al probar esta etapa:** vender en una sucursal distinta a la del perfil del dueño (ej. Kiosco2 con el dueño de KioscoNuevo) fallaba en silencio ("elijo productos, cobro, no pasa nada"). Causa: las policies de escritura de `ventas`/`detalle_ventas` de la Etapa 3 comparaban contra `perfiles.local_id` fijo (la sucursal física del dueño) en vez de la sucursal activa/seleccionada — quedó así a propósito en la Etapa 3 ("no tiene sentido cross-sucursal todavía sin el selector de la Etapa 4") y nunca se revisó cuando el selector de la Etapa 4 se usó de verdad. Corregido con la migración `fix_ventas_vender_en_sucursal_activa` (`ALTER POLICY` en las 3 policies afectadas, mismo criterio que el resto: `local_id IN (SELECT sucursales_del_usuario())`). Verificado con INSERT simulado antes/después y confirmado en vivo.

### Etapa 7 — Gestión de empleados ✅
- [x] Pantalla "Empleados" (dueño-only, `MenuUsuario` → `PanelEmpleados`) para crear encargados/empleados, asignarles sucursal y rol, editarlos, restablecer su contraseña y desactivarlos/reactivarlos.
- [x] **Alta por credenciales directas** (decisión tomada): el dueño carga mail + contraseña temporal, sin invitación por mail. Se apoya en un trigger `on_auth_user_created` ya activo en la DB (no documentado hasta ahora) que auto-inserta la fila en `perfiles` leyendo `local_id`/`nombre_usuario`/`rol` de `raw_user_meta_data` al crear un `auth.users` — el mismo mecanismo que ya usaba `registrar_local_y_perfil` para el dueño (hace `UPDATE`, no `INSERT`, porque la fila ya existe). Edge Function nueva `gestionar-empleado` (service role, solo callable por un dueño) maneja `crear`/`desactivar`/`reactivar`/`restablecer_password` vía `auth.admin.*`.
- [x] `perfiles.activo` nuevo; `sucursales_del_usuario()`/`sucursales_gestionables()` ahora exigen `activo = true`, así que desactivar a alguien le corta el acceso a TODAS las tablas de negocio al instante (no depende de que expire su JWT), sin tocar ninguna de las ~14 policies que ya dependían de esas dos funciones.
- [x] Permisos por rol: por ahora fijos, no elegibles por el dueño al crear (se evaluó pedirle al dueño elegir permisos por empleado al momento de crearlo; se pospuso por complejidad — ver "Cabos sueltos" más abajo). Un empleado por defecto puede abrir/cerrar la caja de su propia sucursal y vender; no ve costos, no edita productos, no ve reportes.
- **Hallazgo de seguridad no relacionado, cerrado en el camino:** la policy vieja "usuario actualiza su perfil" (`id = auth.uid()`, sin restricción de columnas) le permitía a CUALQUIER usuario autenticado auto-asignarse `rol='dueño'` editando su propia fila. Cerrado con un trigger (`proteger_campos_sensibles_perfil`) que fija `rol`/`negocio_id`/`local_id`/`activo` al valor viejo cuando el que edita es el dueño de la fila (no afecta la edición de un dueño sobre la fila de OTRO perfil, que sigue habilitada).
- **2 bugs reales encontrados al probar con la primera cuenta empleado real (nunca se había probado un rol no-dueño hasta esta etapa):**
  - `MenuContext` decidía catálogo compartido con `sucursales.length > 1`, pero `sucursales` viene filtrado por RLS por rol (dueño ve todas, encargado/empleado solo la propia) — daba falso negativo para esos roles y el Inventario se veía vacío en negocios compartidos. Se agregó un chequeo de respaldo contra `producto_sucursal` (que sí pueden leer para su propia sucursal) cuando `sucursales.length === 1`.
  - `cerrarArqueo` (`VentasContext.tsx`) hacía el `UPDATE` sin `.select()` ni chequeo de filas afectadas — cuando RLS bloqueaba el update (empleado sin permiso todavía en ese momento), Postgres no tira error por un `UPDATE` de 0 filas, así que la pantalla mostraba "caja cerrada" con la caja en realidad seguía abierta en la base. Corregido: ahora chequea que `data` no sea null y tira error explícito si no.

**Pendiente para más adelante (no bloquea el MVP):**
- [ ] Elegir permisos por empleado al crearlo (hoy son fijos por rol) — el dueño pidió esto pero se acordó arrancar con el permiso por defecto (empleado puede abrir/cerrar caja) e implementar la selección más adelante.
- [ ] Evaluar si el encargado también puede dar de alta empleados de su propia sucursal (hoy la pantalla es dueño-only) — mencionado de pasada, no confirmado.

---

## 🔴 Cabo suelto de cobros ✅

- [x] **Suscripción de prueba de MercadoPago** — revisadas las 3 suscripciones reales contra el estado actual en MercadoPago (API `/preapproval/{id}`, con la app "Vallis" vía MCP): la única que cobró plata real (Florymanux100pre, $100 ARS el 07/08) ya está `cancelled` en MP — no hay riesgo de cobro. Las otras dos (CafeEjemplo, LocalPrueba) quedaron en `pending` (nunca autorizadas por el pagador, nunca cobraron nada) — se decidió dejarlas así, no cobran solas. **Nota menor sin urgencia:** el negocio "CafeEjemplo" tiene `suscripcion_estado = 'activa'` en la base de Vallis pero en MP nunca pasó de `pending` — el dato quedó desactualizado (es una cuenta de prueba, no un cliente real, no se corrigió).

---

## 🟡 Cabos sueltos (cortos, mejoran el pulido)

- [ ] Mail de contacto en el catálogo público: campo en `locales` + agregarlo a `catalogo_publico()` + botón en la página. (WhatsApp ya funciona.)
- [ ] Footer de la landing (`vallis-landing/index.html`) con contacto: mail manuel@vallis.com.ar como texto + botón WhatsApp. Falta el número real. Nunca se aplicó.
- [ ] `preview.jpg` (1200×630) + favicon de la landing (están referenciados pero no existen).
- [ ] Google Search Console + sitemap para la landing.

---

## 🟢 Features de la app (frontend)

- [x] **Exportar historial de ventas a Excel (.xlsx)** — en el navegador con SheetJS, dos hojas (Ventas + Detalle). Incluye N° de venta en ambas hojas (para cruzarlas), fila de totales en la hoja Ventas, columna "Modificado" que se omite si ninguna venta exportada fue editada, y montos como número real (no texto) con formato de moneda.
- [x] **Página de Informe / Reportes de ventas** — sección nueva (módulo núcleo `informe`, migración a `locales.modulos`) para analizar el período: resumen (total, cantidad de ventas, ticket promedio), ventas por día (gráfico de barras recharts), ranking por producto (cantidad + total + %, ordenado por cantidad vendida), por método de pago (torta + lista accesible), botón exportar a Excel propio (hojas Resumen/Ventas por día/Ranking/Por método, no las mismas que Historial). Selector de período (este mes / mes pasado / hoy / personalizado). Solo lectura (accesible aun con suscripción vencida). Gate `puede('reportes')` documentado en el código pero no activado — queda para cuando se quiera convertir en feature premium. Filtrable por sucursal / consolidado desde la Etapa 6 de multisucursal.
- [ ] Notas configurables en descuentos: que el motivo del descuento salga en el ticket.
- [ ] Impresoras Capa 2: permisos de impresión por categoría.
- [ ] Features de mesa: dividir cuenta, cantidad de comensales, tiempo de mesa.
- [ ] Estadísticas para el dueño: producto estrella, horas pico, ticket promedio (queda cubierto en gran parte por la página de Informe).

---

## 🟣 Con código de servidor (Edge Functions)

- [ ] Resumen semanal por mail (variación del resumen diario que ya funciona).
- [ ] Interpretar facturas de proveedor con IA (integrar una API de IA como secreto en una Edge Function).
- [ ] Facturación electrónica — **hay un cliente concreto esperándola (ex jefe).** Requiere: prima contadora validando la lógica fiscal, definir alcance mínimo para el caso concreto (condición fiscal, tipo de comprobante, a quién factura, volumen), configuración fiscal por local (CUIT, certificado, punto de venta), sandbox de homologación antes de producción. Opciones evaluadas: conexión directa vía Arca SDK (afipts.com, TypeScript, sin costo por factura pero toda la lógica fiscal es propia — viable con la prima al lado) vs. intermediario (TusFacturasAPP / AfipSDK, pagan por comprobante pero resuelven lo fiscal). Decidir modelo de quién paga la facturación (Vallis absorbe / cada comercio su cuenta) con la prima. Nota: ARCA reemplazó a AFIP en 2024, hay cambios técnicos — cuidado con info vieja que diga "AFIP".

---

## ⚫ Proyectos futuros (grandes, sin apuro)

- [ ] Carrito en el catálogo: mutar la vidriera actual a tienda con pedidos. Requiere tabla de pedidos, notificación al comercio, estados de pedido, manejo de stock.
- [ ] Cobro 2 — Marketplace: que los gimnasios cobren las cuotas a sus socios vía MercadoPago (OAuth por cada gimnasio, split de pagos, responsabilidad sobre plata de terceros).
- [ ] Rubro reventa/celulares: inventario serializado (IMEI). Por ahora se carga cada equipo como producto individual con stock 1. Esperar feedback del amigo.
- [ ] WhatsApp bot.
- [ ] Cuenta corriente / fiado digital.
- [ ] Migrar opciones del menú de usuario a una Configuración dedicada (`PanelConfiguracion` ya existe).
- [ ] Firma digital QZ Tray (impresión silenciosa sin el diálogo del navegador).

---

## 📝 Notas de mantenimiento

- Validación de firma del webhook de MercadoPago con `MP_WEBHOOK_SECRET` (guardado en el gestor, no implementado en código — la seguridad actual es re-consultar el estado a MP, que ya es robusto). Opcional.
- Auditar la carpeta de skills y este ROADMAP cada tanto: borrar lo que ya no aplica.

---

## ✅ Hecho (hitos recientes, referencia)

- **Cobros MercadoPago:** suscripción por `/preapproval` funcionando de punta a punta (pago real confirmado, webhook con topic `subscription_preapproval` suscripto, `payer_email` flexible vía campo en PanelMiPlan, precio real $30.000, token `APP_USR-` productivo).
- **Bloqueo por suscripción completo:** Etapa 1 (frontend: `estadoAcceso`, gracia 3 días, banner, pantalla de bloqueo) + Etapa 2 (RLS: función `estado_acceso_local`, policies de escritura en todas las tablas de negocio, SELECT abierto, verificado por rol y advisor de seguridad corrido).
- **Redundancia de alertas de stock** resuelta con flag `alerta_enviada`.
- **Deuda de diseño:** gramática de ComponentesBase aplicada a Inventario, Mostrador, Historial y paneles de usuario; creados `Etiqueta`, `Campo`, `TarjetaProducto`; corregida fuga de paleta gray/blue → stone/violet. Modals grandes (wizard) y PanelLateral quedaron fuera a propósito (ModalBase no soporta esos layouts).
- **Limpieza:** `package.json` name, policies duplicadas en `mesas`, versiones huérfanas de `registrar_local_y_perfil`.
- **Auditoría de seguridad (security-review):** `alerta-stock`, `resumen-stock` y `crear-plan-mp` estaban desplegadas con `verify_jwt: false` y sin ningún chequeo propio en el código — cualquiera con la URL podía invocarlas (cruzando tenants en el caso de `alerta-stock`, que además mandaba el aviso de "stock bajo" sin verificar que el stock estuviera realmente bajo). Arreglado agregando un secreto compartido (`INTERNAL_FUNCTION_SECRET`, header `x-vallis-secret`) que valida cada función antes de hacer nada, y que el trigger `avisar_stock_bajo()` y el cron `resumen-stock-diario` ahora mandan en la llamada. `alerta-stock` también revalida `stock_actual <= stock_minimo` como defensa en profundidad. `crear-plan-mp` (script de un solo uso, ya sin ningún llamador real) quedó con el mismo secreto en vez de borrarse.
- **`webhook-mp` activaba el acceso pago con solo `authorized`, sin confirmar que se cobró:** el estado `authorized` de una suscripción de MercadoPago solo significa que el pagador aceptó el mandato de cobro recurrente — el cobro real de la primera cuota pasa aparte, ~1 hora después, y puede fallar. Con el código viejo, apenas llegaba `authorized` ya se marcaba `suscripcion_estado = 'activa'`, dando acceso completo sin haber cobrado un peso; si el cobro fallaba, MercadoPago no pausa la suscripción de inmediato (reintenta hasta 4 veces por cuota en 10 días, y recién cancela sola después de 3 cuotas rechazadas), así que el acceso gratis podía durar semanas. Se agregó el tópico de webhook `subscription_authorized_payment` (confirmado con `save_webhook`, sumado a `subscription_preapproval` que ya estaba) — `webhook-mp` ahora solo marca `activa` cuando llega ese evento con `payment.status === 'approved'` (verificado con datos reales de la única suscripción que cobró de verdad, vía `authorized_payments/{id}`; el `status` externo del objeto puede quedar en `"processed"` tanto si se cobró bien como si se agotaron los reintentos, la señal real está anidada en `payment.status`). `authorized` a nivel de la suscripción ya no escribe nada por sí solo.
- **`editarVenta` no tenía policy de RLS que la respalde:** la única policy `UPDATE` de `ventas` exigía `estado = 'abierta'`, pero las ventas del Historial que se editan (método de pago/descuento) están todas `cerrada` — RLS bloqueaba el UPDATE en silencio (0 filas) y el frontend no lo detectaba, así que mostraba el cambio como guardado sin haberlo guardado nunca. Se agregó la policy `"dueño y encargado editan ventas registradas"` (mismo criterio que la policy ya existente de cancelar ventas: `sucursales_gestionables()`, sin restricción de `estado`) y se corrigió `editarVenta` (`useHistorialVentas.ts`) para que chequee `.select().maybeSingle()` y tire error si RLS bloqueó, mismo patrón que ya se usa en `cerrarArqueo`. Verificado con roles simulados (dueño edita su venta cerrada: 1 fila; edita una ajena: 0 filas).
