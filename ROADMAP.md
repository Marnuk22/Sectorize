# ROADMAP — Vallis

Backlog de tareas pendientes. Marcá con `[x]` lo completado. Organizado por prioridad y área.
Para el contexto del proyecto (arquitectura, convenciones, reglas), ver CLAUDE.md.

---

## 🔴 En curso / inmediato

### Cobros MercadoPago — cerrar el pago de prueba
- [x] Completar UN pago de prueba de suscripción de punta a punta. Se confirmó que la API directa de `/preapproval` exige que collector y payer sean del mismo tipo (real o test) — con un usuario de prueba de MP el pedido daba `Both payer and collector must be real or test users` al usar el token `APP_USR-` real. Se resolvió por la vía alternativa (ver ítem de abajo). De paso se detectó y arregló que el webhook de la app no tenía suscripto el topic `subscription_preapproval`; se registró con `save_webhook` y se reconcilió a mano el local que había quedado en `prueba` disparándole la notificación real (`suscripcion_estado` pasó a `activa` correctamente).
- [x] Alternativa si el sandbox falla: probar en producción pagando con otra cuenta (dinero real que vuelve menos comisión ~5-6%), después cancelar la suscripción. **Hecho con dinero real — falta cancelar esa suscripción de prueba para que no se cobre de nuevo el próximo mes.**
- [x] Resolver el `payer_email` flexible: agregar un campo "Email de tu cuenta de MercadoPago" en `PanelMiPlan` y mandar ESE como `payer_email` (no `user.email`), para que el mail del local y el de la cuenta que paga puedan ser distintos.
- [x] Revertir valores de prueba a producción: `transaction_amount` quedó en 30000 (precio real, ya no es el valor de prueba de 100 que tenía antes) y el `MP_ACCESS_TOKEN` es el token `APP_USR-` real (confirmado porque el pago recién probado fue real).

### Bloqueo por suscripción — terminar Etapa 2
- [x] Confirmar que estén cubiertas TODAS las tablas de escritura en el RLS: verificar que productos, categorías, arqueos y mesas tengan la condición `estado_acceso_local(...) <> 'bloqueado'` (además de las ya aplicadas).
- [x] Probar el combo completo con un local de prueba en `bloqueado`: no puede vender/cargar producto/abrir arqueo/gestionar socios, PERO sí puede ver todo (SELECT). Un local `ok` opera normal. Verificado con inserts/updates/deletes simulados en `productos`, `arqueos`, `ventas` y `socios`: rechazados en bloqueado, permitidos en ok; SELECT nunca da error en ninguno de los dos casos. Falta solo confirmar el banner de `gracia` en la app real (Etapa 1 ya lo tenía probado por separado).
- [x] Verificar que `estado_acceso_local` (SQL) y `estadoAcceso` (frontend, Etapa 1) den el mismo resultado en todos los casos (mismos 3 días de gracia, mismo manejo de nulls, mismo operador de comparación).
- [x] Correr el advisor de seguridad de Supabase después de aplicar todo el RLS, y revisar que no haya quedado ningún hueco.
- [x] Redeployar `webhook-mp` (`supabase functions deploy webhook-mp`) para que el fix de fecha en vencida/cancelada tome efecto en producción.

---

## 🟡 Cabos sueltos (cortos, mejoran el pulido)

- [x] Redundancia de alertas de stock: la alerta inmediata (al cruzar) y el resumen diario se solapan (un producto que cruzó a las 15h llega 2 veces). Solución: flag `alerta_enviada` boolean en el producto — la inmediata lo pone en true, el resumen ignora los true, se resetea al reponer.
- [ ] Mail de contacto en el catálogo público: campo en `locales` + agregarlo a `catalogo_publico()` + botón en la página. (WhatsApp ya funciona.)
- [ ] Footer de la landing (`vallis-landing/index.html`) con contacto: mail manuel@vallis.com.ar como texto + botón WhatsApp. Falta el número real. Nunca se aplicó.
- [ ] `preview.jpg` (1200×630) + favicon de la landing (están referenciados pero no existen).
- [ ] Google Search Console + sitemap para la landing.
- [x] Cambiar el `<title>` de la app: dice "gymgestor", debería decir "Vallis". (Ya decía "Vallis", no hacía falta tocarlo.)
- [x] Cambiar el `name` en `package.json`: dice "gymgestor".
- [x] Limpieza menor DB: `mesas` tiene dos policies SELECT idénticas; versiones viejas de `registrar_local_y_perfil` (3 y 4 params) probablemente huérfanas, se pueden borrar si nada las llama.

---

## 🔵 Deuda de diseño (aplicar la gramática de ComponentesBase)

Diagnóstico hecho: falta una gramática de contenedor consistente; jerarquía visual plana; densidad mal calibrada. Ya existe `ComponentesBase.tsx` (Tarjeta, SeccionDatos, FilaDato) y el arqueo ya está convertido.

- [x] Aplicar la gramática (Tarjeta/SeccionDatos/FilaDato/Campo/Etiqueta) a Inventario, Mostrador, Historial y los paneles de usuario (Mi plan, Ayuda, Impresoras, Catálogo). De paso se corrigió una fuga de paleta real (`gray`/`blue` en vez de `stone`/`violet`) en PanelConfiguracion, PanelAyuda, PanelLateral y PanelDatosLocal. Quedaron afuera a propósito: los bloques que no encajan en los primitivos (formularios grandes, resumen por método de pago con colores categóricos por método) y los modals tipo wizard/panel lateral (ver nota abajo).
- [x] Crear componentes base que faltaban: `Etiqueta`, `Campo`, `TarjetaProducto`. (`Boton`, `EstadoVacio` y `Modal`=`ModalBase` ya existían de antes; esta lista estaba desactualizada.)
- [x] Grilla dentada del inventario: se revisó y **no había tal bug** (el grid ya fuerza altura pareja). Se creó `TarjetaProducto` de todos modos, por duplicación real entre Inventario y Mostrador.
- Nota: `ModalStock` y `TecladoCantidad` se evaluaron para migrar a `ModalBase` pero tienen layout de varias zonas separadas por `border-b` a todo el ancho (header, franja de display, teclado), que `ModalBase` no soporta (asume un solo bloque con padding parejo) — se dejaron con su overlay actual, igual que los modals grandes (`ModalImportar`/`ModalProducto`/`ModalAjustePrecios`) y `PanelLateral`.

---

## 🟢 Features de la app (frontend)

- [ ] Notas configurables en descuentos: que el motivo del descuento salga en el ticket.
- [ ] Impresoras Capa 2: permisos de impresión por categoría.
- [ ] Features de mesa: dividir cuenta, cantidad de comensales, tiempo de mesa.
- [ ] Estadísticas para el dueño: producto estrella, horas pico, ticket promedio.

---

## 🟣 Con código de servidor (Edge Functions)

- [ ] Resumen semanal por mail (variación del resumen diario que ya funciona).
- [ ] Interpretar facturas de proveedor con IA (integrar una API de IA como secreto en una Edge Function).
- [ ] Facturación electrónica (proyecto grande: requiere contador + cliente real + configuración AFIP por local — CUIT, certificado, punto de venta). No encarar hasta tener un cliente que la necesite y pague.

---

## ⚫ Proyectos futuros (grandes, sin apuro)

- [ ] Carrito en el catálogo: mutar la vidriera actual a tienda con pedidos. Requiere tabla de pedidos, notificación al comercio, estados de pedido, manejo de stock.
- [ ] Cobro 2 — Marketplace: que los gimnasios cobren las cuotas a sus socios vía MercadoPago (OAuth por cada gimnasio, split de pagos, responsabilidad sobre plata de terceros). El más grande del roadmap.
- [ ] Rubro reventa/celulares: inventario serializado (IMEI). Por ahora se carga cada equipo como producto individual con stock 1. Esperar feedback del amigo.
- [ ] WhatsApp bot.
- [ ] Cuenta corriente / fiado digital.
- [ ] Migrar opciones del menú de usuario a una Configuración dedicada (`PanelConfiguracion` ya existe).
- [ ] Firma digital QZ Tray (impresión silenciosa sin el diálogo del navegador).

---

## 📝 Notas de mantenimiento

- Validación de firma del webhook de MercadoPago con `MP_WEBHOOK_SECRET` (guardado en el gestor, no implementado en código — la seguridad actual es re-consultar el estado a MP, que ya es robusto). Opcional.
- Auditar la carpeta de skills y este ROADMAP cada tanto: borrar lo que ya no aplica.
