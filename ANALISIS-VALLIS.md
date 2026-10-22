# Análisis de Vallis (Sectorize) — estructura, venta, salón, billing y base de datos

> Documento generado a partir del código real del repo (no de suposiciones).
> Fuentes: `src/`, `supabase/migrations/` (26 archivos), `schema_actual.sql`,
> `schema_propio.sql`, `src/types/index.ts`, `CLAUDE.md`, `ROADMAP.md`.
>
> ⚠️ `schema_actual.sql` y `schema_propio.sql` están **desactualizados** (reflejan solo la
> migración base `20260828011402`). La fuente de verdad del esquema son las migraciones.

---

## 1. Resumen del proyecto

**Qué es:** app **POS / gestión multi-tenant** para locales chicos (restaurantes/bares,
tiendas/kioscos, gimnasios/academias). Un único codebase sirve a todos los tipos de negocio:
qué ve cada local depende de **datos** (`plan` y `modulos` en la DB), no de builds separados.

> El nombre del paquete npm es `gymgestor` (residuo de un pivote anterior); el producto es **Vallis**.

### 1.1 Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript ~5.9 |
| Build/dev | Vite 7 (`react-swc`) |
| Estilos | Tailwind CSS 4 + PostCSS (paleta `stone` + acento `violet`) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions Deno) |
| Gráficos | Recharts |
| Utilidades | papaparse, xlsx, barcode-detector + qz-tray, lucide-react, clsx, tailwind-merge, class-variance-authority |
| Integraciones | MercadoPago (billing), Resend (emails), Factumono (facturación), TiendaNube |
| Package manager | pnpm 11.5 (también hay `package-lock.json` residual) |
| Deploy | Vercel (app + landing estática). Edge Functions vía Supabase CLI |
| Tests | ❌ No hay test runner configurado |

### 1.2 Estructura

```
src/
  Components/     UI por dominio (ui, Auth, Inventario, mesa, mostrador, afiliados,
                  ventas, Usuario, planes, Informe, Board.tsx, NavBar.tsx)
  context/        10 Context providers por dominio
  hooks/          usePlan, useModulos, useArqueo, useHistorialVentas, ...
  logic/          lógica de negocio pura + servicios (sin Supabase)
  config/         modulos.ts, planes.ts, unidades.ts, metodosPago.ts
  types/index.ts  tipos DB vs tipos UI
  lib/supabase.ts cliente único de Supabase
supabase/
  migrations/     26 migraciones
  functions/      14 Edge Functions
vallis-landing/   sitio marketing + catálogo público (Vercel)
schema_actual.sql / schema_propio.sql   referencia de esquema (desactualizados)
CLAUDE.md / ROADMAP.md
```

**Convenciones:** todo en **español**. UI compuesta desde primitivas de `ComponentesBase.tsx`.

### 1.3 Arquitectura

- **Navegación sin router:** `App.tsx` elige la primera sección disponible según `useModulos()` y
  renderiza `NavBar` + `Board`. La sección es un string en estado local resuelto en un `switch` en `Board.tsx`.
- **Gating en dos ejes ortogonales** (`src/config/`):
  - `modulos.ts`: secciones de negocio. Núcleo (`inventario`, `ventas`, `arqueos`, `informe`)
    siempre; opt-in según tipo de negocio (`salon`, `mostrador`, `suscripciones`); ocultos (`produccion`, `deposito`, `facturacion`). Se leen con `useModulos()`.
  - `planes.ts`: features pagas (`seguimiento_stock`, `historial_completo`, `reportes`, `notificaciones_email`) por plan. Se gatea con `puedeUsar(plan, feature)` / `usePlan()`.
- **Estado:** sin store externo (Redux/Zustand). Un **React Context por dominio**, montado en
  `App.tsx`:
  `AuthProvider → ConexionProvider → VentasProvider → MenuProvider → SalonProvider → MostradorProvider → AfiliadosProvider → IngredientesProvider → DepositosProvider → ImpresorasProvider`.
  ⚠️ El orden importa: `VentasProvider` está *fuera* de `MenuProvider`, así que Ventas no puede
  usar `useMenu()`; el refresco de stock post-venta se llama desde Mostrador/Salón.
- **Acceso a datos:** los providers hablan **directo a Supabase**. La lógica pura se factoriza en
  `src/logic/*Services.ts` (deliberadamente libre de Supabase). `AuthContext` cachea
  `user`/`perfil`/`local` en `localStorage`.
- **Backend:** RLS multi-tenant (ver §5), integridad por **triggers/DB** (descuento de stock,
  alertas, movimientos de caja), 26 migraciones y 14 Edge Functions.
- **Offline:** cola de ventas en IndexedDB (`colaVentas.ts`) + reconciliación al recuperar conexión.
- **Multi-sucursal:** billing a nivel negocio; `producto_sucursal` para stock por sucursal.

---

## 2. Flujo de venta

### 2.1 Archivos muertos (vacíos, 0 bytes)
- `src/logic/ventas.servces.tsx` (nombre mal escrito "servces")
- `src/Components/ventas/CajaVentas.tsx`
- `src/hooks/useArqueo.ts`

La lógica real de ventas vive en `src/context/VentasContext.tsx`; el contenedor de la sección es
`src/Components/ContenedorVentas.tsx`; el servicio de arqueo puro es `src/logic/arqueoServices.ts`.

### 2.2 Venta por MOSTRADOR
- `src/Components/mostrador/ContenedorMostrador.tsx` — UI (grid, carrito, cobro, descuento, escáner, granel).
- `src/Components/mostrador/TecladoCantidad.tsx` — teclado tipo balanza para `tipo_venta === 'granel'`.
- `src/context/MostradorContext.tsx` — `useMostrador()`. `agregar(producto, cantidad?)`, total =
  `carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0)`.
- Métodos de pago: `src/config/metodosPago.ts` (label/icono/color). En la UI salen de
  `local.metodos_pago` (fallback `['efectivo']`). `VentasContext` expone un `MetodosPago`
  hardcodeado que **no se consume**.
- `handleCobrar()`: captura snapshot para el ticket → `await cobrar(metodoElegido, totalFinal)` →
  `imprimirTicket` (no bloqueante) → confirmación con vuelto.
- `MostradorContext.cobrar()`: arma `mesaVirtual` (`id:'mostrador'`) → `registrarVenta(...)` →
  si offline `aplicarVentaOffline`, si no `recargarProductos()` → `vaciar()`.
- Descuento/vuelto: `descuento = % ? round(total*(valor/100)) : valor`; `totalFinal = total - descuentoAplicado`;
  vuelto solo en efectivo con `pagaCon > totalFinal`.

### 2.3 Inserción real (`VentasContext.registrarVenta`, líneas 130-208)
- Exige `localId`, `user` y `arqueoActivo` (si no hay caja abierta lanza `'No hay arqueo abierto'`).
- **Online:** INSERT en `ventas` `{ local_id, usuario_id, arqueo_id, sector_id: null, total, metodo_pago, estado:'cerrada' }`
  y luego INSERT en `detalle_ventas` por ítem `{ venta_id, producto_id (null si no es de inventario), cantidad, precio_unitario }`.
  Actualiza `historialVentas` local.
- **Offline:** ver §2.6.

### 2.4 Venta por SALÓN
- `SalonContext.cerrarMesa(idMesa, metodoPago)`: recalcula `total = Σ(precio*cantidad)` de
  `mesa.pedidos` (**sin descuento**) → `registrarVenta(...)` → stock → limpia mesa a `'libre'` (memoria).
- `CierreDeMesa.tsx` calcula descuento y total para el ticket, pero **no lo pasa** a `cerrarMesa`.

### 2.5 Descuento de stock
- **Lo hace un trigger de la DB**, no el frontend. `trigger_descontar_stock` AFTER INSERT en
  `detalle_ventas` → `descontar_stock()`: resta con `GREATEST(...,0)` si `producto_id IS NOT NULL AND stock_minimo > 0`.
  Versión vigente (catálogo compartido) descuenta `producto_sucursal` si el producto está allí, si no `productos`.
- El frontend **no** descuenta stock online. Offline usa descuento optimista (`MenuContext.aplicarVentaOffline`).
- Refresco de stock: lo dispara el **caller** (`MostradorContext.cobrar` → `recargarProductos()`;
  `SalonContext.cerrarMesa` → `recargarProductos()`; `useReconciliacionOffline` tras reconciliar).
- `ajustarStock` (lee del estado y pisa) tiene race; existe `registrarMovimientoStock` (RPC atómica).

### 2.6 Cola OFFLINE
- `src/logic/colaVentas.ts`: IndexedDB `vallis_cola_ventas`, keyPath `id` (UUID cliente).
  `encolarVenta` (usa `add`), `leerColaVentas`, `quitarVentaDeCola`.
- `src/logic/reconciliacion.ts`: `reconciliarVentas()` lee la cola, ordena por `fecha` (FIFO real),
  inserta secuencialmente en `ventas` (con `id`/`fecha` explícitos → evita duplicado por PK) y en
  `detalle_ventas`; si ambas pasan, quita de la cola.
- `src/hooks/useReconciliacionOffline.ts`: dispara en la transición offline→online; si `ok > 0`
  recarga productos y movimientos de caja. UI: `src/Components/ToastSincronizacion.tsx`.
- `src/context/ConexionContext.tsx`: ping HEAD a `locales` cada 15s (timeout 6s) + eventos `online`/`offline`.

### 2.7 Impresión
- API: `src/logic/impresion.ts` (`imprimirComanda`, `imprimirTicket`, `imprimirArqueo`, `imprimirEtiqueta`).
- Formato: `src/logic/comanda.ts` (`generarComanda` sin precios; `generarTicket` con subtotal/descuento/total;
  `generarReporteArqueo`; `generarEtiquetaZPL`).
- Transporte: `src/logic/qz.ts` (QZ Tray). Destinos vía `src/context/ImpresorasContext.tsx`
  (`impresorasDeComandas/DeTickets/DeEtiquetas`). Si no hay impresoras, `impresion.ts` retorna en silencio.

### 2.8 Arqueos / caja
- `VentasContext`: `arqueoActivo`, `abrirArqueo`, `cerrarArqueo` (re-consulta la DB para el esperado,
  solo efectivo), `retirarEfectivo`/`ingresarEfectivo`, `recargarMovimientosCaja`.
- Componentes: `src/Components/ventas/ContenedorArqueo.tsx`, `ModalMovimientoCaja.tsx`,
  `HistorialVentas.tsx`, `HistorialArqueos.tsx`; hook `src/hooks/useHistorialVentas.ts`.
- Triggers DB: `registrar_apertura_caja` (on `arqueos`), `registrar_venta_efectivo_caja` (on `ventas`),
  `validar_retiro_caja` (BEFORE INSERT en `movimientos_caja`).

### 2.9 Gotchas del flujo de venta
1. **Descuento de mostrador no persiste**: `ventas.descuento` queda en 0 mientras `ventas.total` es
   descontado y `detalle_ventas` guarda precio lleno → `sum(subtotales) ≠ total`. Al editar,
   `useHistorialVentas.editarVenta` recalcula con descuento 0 y **borra** el descuento.
2. **Descuento de salón se ignora en la venta** (solo se imprime descontado).
3. **Sin transacción** entre `ventas` y `detalle_ventas` (inserts separados) → ventas huérfanas posibles.
4. **Reconciliación no idempotente ante fallo parcial**: si `detalle_ventas` falla tras insertar
   `ventas`, el reintento choca con la PK y la venta queda fallida **para siempre** (no se limpia, no
   descuenta stock). Sin panel de revisión (Etapa 4.2 pendiente).
5. **No se puede vender offline tras recargar**: los arqueos se cargan solo de Supabase al montar.
6. **La reconciliación solo corre en transición offline→online** (`eraOfflineRef` arranca en `false`):
   una cola pendiente al abrir la app online no se sincroniza hasta un ciclo real offline→online.
7. **Refresco de stock manual y descentralizado**.
8. **`fecha` distinta según camino**: online `now()` del servidor; offline reloj del cliente.
9. **`trigger_avisar_stock_bajo` es solo sobre `productos`**, no `producto_sucursal` → en catálogo
   compartido no dispara la alerta de stock bajo.
10. **Arqueo cerrado con ventas encoladas** queda con `monto_final_esperado` desactualizado.
11. **`sector_id` siempre `null`** en la venta (y no hay `mesa_id`).
12. **Impresión de ticket posterior al cobro** (no bloqueante): si falla, la venta ya quedó registrada.
13. `cobrar`/`cerrarMesa` online no manejan "creí estar online pero falló el insert" (lanza, no encola).

---

## 3. Módulo de salón (mesas/pedidos)

### 3.1 Componentes (`src/Components/mesa/`)
| Archivo | Responsabilidad |
|---|---|
| `PanelMesa.tsx` | Panel derecho de la mesa: acciones, buscador, listas, reimprimir comanda, cierre. |
| `MenuDisplay.tsx` | Buscador + favoritos (`useFavoritos(6)`); `onSeleccionar` → `agregarProductoAMesa`. |
| `ListaPedidos.tsx` | Tabla de ítems (parametrizada `aConfirmar`); +/−/✕ y notas; total de la lista. |
| `ConfirmarPedidos.tsx` | Imprime comanda de lo nuevo y mueve `aConfirmar → pedidos`. |
| `CierreDeMesa.tsx` | Cobro: método, descuento ($/%), resumen, "Cobrar", "Imprimir sin cobrar". Exige arqueo. |
| `AccionesMesa.tsx` | Transferir mesa e imprimir ticket. |
| `FormularioMoverMesa.tsx` | Modal "Transferir Mesa": busca destino **por nombre**. |
| `FormularioNuevaMesa.tsx` | Modal alta de mesa (nombre ≤20). |

Contenedores: `ContenedorSectores.tsx` (pestañas de sectores), `ContendedorMesas.tsx`
(**nombre mal escrito**; lienzo con drag & drop y modo "Acomodar"), `FormularioNuevoSector.tsx`.

### 3.2 `src/context/SalonContext.tsx`
- Estado: `sectores: SectorUI[]` (anidado), `cargando`, `idMesaSeleccionada`, `idSectorSeleccionado`.
- Carga inicial: lee `sectores` y `mesas` con `.eq('local_id', localId)` y arma el árbol;
  siempre deja `aConfirmar: []` y `pedidos: []`.
- Funciones: `seleccionarMesa/Sector`, `agregarProductoAMesa`, `onAumentar*`, `onDisminuir*`,
  `onEliminar*`, `onNotaAConfirmar`, `confirmarPedidoMesa`, `agregarSector`, `borrarSector`,
  `agregarMesaASector`, `borrarMesa`, `actualizarPosicionMesa`, `transferirMesa`, `cerrarMesa`.
- **Persiste solo 5 cosas:** INSERT `sectores`, DELETE `sectores`, INSERT `mesas`,
  DELETE `mesas`, UPDATE `pos_x/pos_y` de `mesas`. Todo lo demás es estado React en memoria.

### 3.3 Modelo de datos
- `sectores`: `id, local_id, nombre, capacidad, estado, posicion_x, posicion_y, creado_at`
  (CHECK estado `libre|ocupado|reservado`).
- `mesas`: `id, sector_id, local_id, nombre, capacidad, estado, creado_at, pos_x, pos_y`.
- **No hay tabla de pedidos en curso ni `jsonb` en `mesas`.** `MesaUI.pedidos`/`aConfirmar` son
  UI-only. Al recargar se pierden los pedidos y las mesas vuelven a `'libre'` (el `estado` de la DB
  nunca se escribe).
- La venta guarda `sector_id = null` y **no existe `mesa_id`** → las ventas no se atribuyen a mesa.

### 3.4 Flujo completo
1. `seleccionarMesa(id)` → `agregarProductoAMesa(producto)` (`MesaService.agregarProducto`) agrega a
   `aConfirmar` y marca `'ocupada'` (memoria).
2. Ajustes/notas sobre `aConfirmar`.
3. `ConfirmarPedidos.handleConfirmar` → `imprimirComanda` → `confirmarPedidoMesa` (`aConfirmar → pedidos`).
4. `CierreDeMesa.handleCobrar` → `imprimirTicket` → `cerrarMesa(idMesa, metodoElegido)`.
5. `SalonContext.cerrarMesa` → `registrarVenta` → stock → limpia y libera la mesa (memoria).

### 3.5 Impresión desde salón
- **Comanda** (cocina, sin precios): en `ConfirmarPedidos` (solo lo nuevo) y `PanelMesa` (reimprimir).
  `generarComanda` soporta `sector` pero ningún llamador lo pasa.
- **Ticket** (cliente, con precios): en `AccionesMesa` (sin descuento) y `CierreDeMesa`.
- Destinos: impresoras `imprime_comandas` / `imprime_tickets`.

### 3.6 Gating
- `modulos.ts`: `salon: { esNucleo:false }`. Solo **restaurante** lo trae activo por defecto
  (`['inventario','ventas','arqueos','informe','salon']`). Se activa según `local.modulos` (`useModulos`).
- Nav: `NavBar.tsx` mapea `salon → 'sectores'`; `Board.tsx` renderiza `ContenedorSectores`.
- Se prende/apaga desde el toggle de módulos en `PanelConfiguracion`.

### 3.7 Multi-sucursal y RLS
- Cliente filtra `.eq('local_id', localId)` (recarga al cambiar sucursal).
- RLS `mesas`/`sectores`: SELECT vía `sucursales_del_usuario()`; ALL vía `sucursales_gestionables()`
  y `estado_acceso_local <> 'bloqueado'`. **`empleado` puede ver pero no escribir**; `encargado` solo su
  sucursal; `dueño` todas.

### 3.8 Gotchas del salón
1. **Pedidos volátiles**: sin persistencia ni realtime; no sirve multiusuario ni sobrevive refresh.
2. **Descuento de `CierreDeMesa` no llega a la venta** (se recalcula sin descuento).
3. **`sector_id` siempre `null`** y sin `mesa_id`: no hay atribución a mesa/sector.
4. **`transferirMesa` no mueve `aConfirmar` ni persiste**; el destino se busca por nombre (ambiguo).
5. **`MesaService.agregarMesa` y `.confirmarPedido` son código muerto**; validaciones de nombre
   inconsistentes (≤25 vs ≤20).
6. Archivos vacíos con nombre mal escrito (`piso.servces.tsx`, `ventas.servces.tsx`); `ContendedorMesas.tsx`.
7. Columnas sin uso: `sectores.capacidad/estado/posicion_x/y`, `mesas.capacidad`.
8. Escrituras sin verificar RLS (0 filas no se detecta en pantalla).
9. Sin realtime (otro dispositivo no se refleja).
10. Posible staleness en `onAumentar*` (leen mesa desde closure no funcional).
11. Pendientes (ROADMAP): dividir cuenta, comensales, tiempo de mesa. **No existe "unir mesas"**.
12. Cobro bloqueado sin caja abierta; abrir/cerrar caja requiere conexión.
13. `ItemPedido.id` = id del producto → no se pueden separar variantes con notas distintas.

---

## 4. Billing MercadoPago y planes

### 4.1 Edge Functions (`supabase/functions/`)
| Función | Qué hace | Escribe | Auth |
|---|---|---|---|
| `suscribir` | Crea Preapproval en MP y devuelve `init_point`. Monto = `base + Σ addons` (tabla `precios`). `external_reference = negocio_id`. | `negocios.suscripcion_id` | JWT + rol `dueño` |
| `crear-plan-mp` | **Legacy, sin llamadores.** Crea un plan de preapproval con `28000` hardcodeado. | — | header `x-vallis-secret` |
| `webhook-mp` | Procesa eventos de MP. **Sin verificación de firma** (re-consulta a MP con el token). Siempre 200. | `negocios` | `verify_jwt=false` |
| `cancelar-suscripcion` | `PUT preapproval {status:'cancelled'}` + update local. Cancela optimista. | `negocios` | JWT + `dueño` (idempotente) |
| `reembolsar-pago` | "Botón de Arrepentimiento" (10 días): reembolsa el último pago y cancela. Idempotency-Key. | `negocios` | JWT + `dueño` |

**Eventos de `webhook-mp`:**
- `subscription_authorized_payment`: consulta `/authorized_payments/{id}`; si `cobro.payment.status === 'approved'`
  re-consulta `/preapproval/{id}` y pone `suscripcion_estado='activa'`, `suscripcion_vence=next_payment_date`,
  `ultimo_pago_id/fecha`, `ultimo_pago_reembolsado=false`. Si no, no toca nada.
- `subscription_preapproval`: `paused → 'vencida'`, `cancelled → 'cancelada'`, otro → `'vencida'`.
  `authorized` a nivel suscripción **no escribe nada**.
- Otros tipos: ignora.

**Resolución de negocio:** primero `negocios.id`; si no, interpreta `external_reference` como `local_id`
viejo y resuelve por `locales.negocio_id` (compatibilidad retro).

### 4.2 Modelo de datos
- **Billing por NEGOCIO, no por local.** Tabla `negocios`: `suscripcion_estado` (`prueba|activa|vencida|cancelada`,
  default `prueba`), `suscripcion_id`, `suscripcion_vence`, `prueba_vence` (`now()+14 days`),
  `multisucursal`, `ultimo_pago_id/fecha/reembolsado`, `tiendanube_store_id/local_id`.
- **`suscripciones` NO es billing**: es la membresía de un socio de gimnasio (`socio_id`, `membresia_id`, `venta_id`).
- Funciones SQL: `estado_acceso_negocio` (activa/prueba/resto con **3 días de gracia**),
  `estado_acceso_local` (wrapper). Usadas por RLS (bloqueo de escritura).
- Add-ons: `precios` (seed `base=30000`, `addon_facturacion=10000`), `negocio_addons`
  (estado `pendiente_invitacion|activo`, consentimiento), `addon_invitaciones_pendientes` (token).
  RPC `set_modulo_negocio` (service_role) prende/apaga módulos en todas las sucursales.
- `locales.plan` (`gratis` por defecto) y `locales.modulos text[]` viven por local.

### 4.3 Prueba de 14 días
- Gestionada por Vallis, no por MP. `negocios.prueba_vence DEFAULT now()+14 days`, seteada en
  `registrar_local_y_perfil`. Registro en `src/Components/Auth/FormRegistro.tsx` (`p_plan:'premium'`).
- UI: `src/Components/Usuario/PanelMiPlan.tsx` (tarjeta "Período de prueba" y días restantes).
- `src/logic/suscripcion.ts`: `estadoAcceso()`, `DIAS_GRACIA=3`, `BLOQUEO_ACTIVO=true`.

### 4.4 `authorized` ≠ pagado
- `subscription_preapproval status='authorized'` = aceptó el mandato, **no** cobró → `webhook-mp` no activa.
- La activación real llega con `subscription_authorized_payment` y `payment.status === 'approved'`.
- Suspensión: MP reintenta ~10 días; cancelación automática → evento → `'cancelada'`.
- Bloqueo real en DB: policies de escritura exigen `estado_acceso_local(local_id) <> 'bloqueado'`
  (SELECT sigue abierto). Frontend: `AccesoSuscripcion.tsx` (`PantallaBloqueo`/`BannerGracia`) envuelve el layout.

### 4.5 Planes y features
- `src/config/planes.ts`: `Plan = gratis|basico|premium`; `Feature = seguimiento_stock|historial_completo|reportes|notificaciones_email`.
  `FEATURES`: stock/historial → basico+premium; reportes/email → premium. `puedeUsar(plan, feature)`.
  `PLANES` con precios 0/20000/30000.
- `src/hooks/usePlan.ts`: `plan = local?.plan ?? 'gratis'`.
- `FeatureBloqueada.tsx`: componente presentacional.
- Uso real: `HistorialVentas` (`historial_completo`), `ModalProducto` (`seguimiento_stock`).
  **`puede('reportes')` documentado pero NO activado.**
- ⚠️ **Todos los locales se crean con `plan='premium'` y nadie actualiza `locales.plan`** → `usePlan`
  nunca bloquea. El bloqueo real es `suscripcion_estado` (nivel negocio). Los precios de `planes.ts`
  no reflejan el cobro real (un único plan "Vallis" a `precios.base = 30000`).

### 4.6 Addons y empleados
- `gestionar-addon` (dueño-only): activa/desactiva `facturacion`; cambia el monto de la **misma**
  suscripción (`PUT preapproval`); si la DB falla, revierte MP. Activar exige consentimiento
  (`facturacion-v1-2026-09-30`), inserta `negocio_addons` (`pendiente_invitacion`) + token, y manda
  mail (best-effort). Desactivar borra y llama `set_modulo_negocio(false)`.
- `confirmar-invitacion-addon`: **sin login**, autorización por token de un solo uso (POST); CORS a
  vallis.com.ar + localhost; pone `activo` + `set_modulo_negocio(true)`.
- `gestionar-empleado` (dueño-only): crear/desactivar/reactivar/reset password vía `auth.admin`;
  escribe `perfiles`. **Sin cobro por empleado.**
- Frontend: `PanelMiPlan.tsx` (llama a las funciones con `Bearer`), `PanelEmpleados.tsx`,
  `ModalEmpleado.tsx`, `useEmpleados.ts`.

### 4.7 Secrets
- Frontend `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Edge Functions: `MP_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `INTERNAL_FUNCTION_SECRET`, `ALERTA_STOCK_SECRET`, `RESEND_API_KEY`, `AVISO_ADDON_EMAILS`,
  `TIENDANUBE_CLIENT_ID/SECRET`, `GROQ_API_KEY`.
- `MP_PLAN_ID` mencionado en CLAUDE.md pero **no usado**. `MP_WEBHOOK_SECRET` **no implementado**.

### 4.8 Gotchas del billing
1. `webhook-mp` **sin verificación de firma** (único HMAC real: Tiendanube); `verify_jwt=false`.
2. `verify_jwt=false` generalizado en `config.toml`; varias funciones dependen de `getUser()` manual.
3. `registrar_local_y_perfil` recibe `p_user_id` sin verificar `auth.uid()` (escalación posible, sin arreglar).
4. `ultimo_pago_fecha = now()` (no la fecha real del cobro) → ventana de 10 días imprecisa.
5. Cancelación/reembolso **optimistas**; reembolso + cancelación **no atómicos**.
6. `webhook-mp` siempre 200 → oculta fallos.
7. `planes.ts` desalineado del cobro real; `crear-plan-mp` hardcodea 28000; todos `premium` fijo.
8. Billing por negocio vs plan por local (feature por sucursal, suscripción compartida).
9. Cambiar `precios` no actualiza suscripciones existentes.
10. `suscripciones` ⚠️ **no** es billing (fácil confusión).
11. Add-on queda cobrado aunque falle el mail de invitación.
12. Flujo de reembolso nunca probado end-to-end en producción; `factumono.ts` con `VALIDAR_CUIT=false`.

---

## 5. Esquema de base de datos

### 5.1 Tablas (32 en `public`)

**Base (17):** `arqueos`, `asistencias`, `categorias`, `clases`, `detalle_ventas`, `impresoras`,
`locales`, `membresias`, `mesas`, `negocios`, `perfiles`, `producto_sucursal`, `productos`,
`sectores`, `socios`, `suscripciones`, `ventas`.

**Añadidas por migraciones (15):** `movimientos_caja`, `movimientos_stock`, `negocio_tiendanube`,
`oauth_pendientes`, `tiendanube_pedidos_procesados`, `ingredientes`, `movimientos_ingredientes`,
`receta_items`, `producciones`, `depositos`, `producto_deposito`, `ingrediente_deposito`, `precios`,
`negocio_addons`, `addon_invitaciones_pendientes`.

Columnas clave:
- `productos`: `local_id` XOR `negocio_id` (CHECK), `tipo_venta (unidad|granel)`,
  `unidad_medida (unidad|kg|g|l|ml)`, `publicado`, `alerta_enviada`, `tiendanube_producto_id/variant_id`.
- `ventas`: `metodo_pago text` **sin CHECK**, `estado (abierta|cerrada|cancelada)`, `descuento`, `editado_en`.
- `detalle_ventas.subtotal` es **GENERATED**.
- `locales`: `plan`, `modulos text[]`, `metodos_pago text[]`, `slug` (regex), `catalogo_activo`, `cuit` (11 dígitos).
- `precios` (seed `base=30000`, `addon_facturacion=10000`).
- `negocio_addons` PK `(negocio_id, addon)`; `tiendanube_pedidos_procesados` PK `(negocio_id, order_id, evento)`.

### 5.2 FKs / jerarquía
`negocios → locales → perfiles / datos operativos`. FKs notables: `perfiles.id → auth.users CASCADE`;
`detalle_ventas.venta_id → ventas CASCADE`; `mesas.sector_id → sectores CASCADE`;
`negocios.dueño_id → perfiles` (circularidad con `perfiles.negocio_id`).
Sin CASCADE: `detalle_ventas.producto_id`, `ventas.arqueo_id`, `negocios.dueño_id`, `suscripciones.venta_id`.

### 5.3 RLS multi-tenant (patrón real)
No se usa `perfiles.local_id` directo salvo en `impresoras` y storage. La forma dominante:
- `sucursales_del_usuario()` → visibles (dueño: todas; encargado/empleado: la propia).
- `sucursales_gestionables()` → gestionables (dueño todas; encargado la propia; **no empleado**).
- `negocio_del_usuario()` → `negocio_id` si rol dueño.

Ejemplos:
```sql
USING (local_id IN (SELECT public.sucursales_del_usuario()));
USING (local_id IN (SELECT public.sucursales_gestionables())
   AND public.estado_acceso_local(local_id) <> 'bloqueado');
USING (negocio_id = (SELECT negocio_id FROM public.perfiles WHERE id = auth.uid()));  -- tablas nuevas
```
Lectura pública del catálogo vía `catalogo_publico(slug)` (no se abre la tabla a `anon`).

### 5.4 `catalogo_publico(p_slug)` (SECURITY DEFINER, `SET search_path`)
Devuelve `local {nombre, whatsapp, slug}` + `productos[]` (`publicado AND activo`) con
`id, nombre, descripcion, categoria, precio_venta, imagen_url, sin_stock`. **Nunca** `precio_costo`
ni `stock_actual`. Sirve `vallis.com.ar/c/{slug}` (anon).

### 5.5 Triggers y funciones
`handle_new_user` (rol/local fijos), `registrar_local_y_perfil`, `agregar_sucursal`,
`descontar_stock`, `avisar_stock_bajo` (Vault), `estado_acceso_negocio/local`, `negocio_del_usuario`,
`sucursales_del_usuario/gestionables`, `slug_disponible`, `proteger_campos_sensibles_perfil`,
`registrar_apertura_caja`, `registrar_venta_efectivo_caja`, `validar_retiro_caja`,
`registrar_movimiento_stock`, `empujar_stock_tiendanube`, `trg_empujar_stock_*`,
`procesar_pedido_tiendanube`, `registrar_movimiento_ingrediente`, `registrar_produccion`,
`transferir_stock`, `ingresar_stock_deposito`, `set_modulo_negocio`.

**9 triggers finales en `public`** (incluye `trigger_empujar_stock_tiendanube` en `productos`
**y** en `producto_sucursal`, mismo nombre).

**Cron `resumen-stock-diario`:** diario 23:00 UTC (20:00 ART) → Edge Function `resumen-stock`.
**No está en ninguna migración** (creado manualmente, no reproducible desde el repo).

### 5.6 Extensiones
`pg_cron` (schema `pg_catalog`), `pg_net` (schema `public`), Supabase **Vault**
(`vault.decrypted_secrets` para el secreto de alerta de stock).

### 5.7 Enums / constraints
**No hay tipos/enums custom en `public`**; todos son `text` + `CHECK`. El único `CREATE TYPE` es
`storage.buckettype` (infra). CHECKs relevantes: rol, `productos_local_o_negocio`,
`tipo_venta`/`unidad_medida`, estados de venta/arqueo/membresía/suscripción/mesa, `cantidad>0`,
slug, CUIT, DPI, motivos de `movimientos_stock`/`movimientos_ingredientes`. Constraints base creadas
`NOT VALID` y luego `VALIDATE` (`20260911041340`).

### 5.8 Migraciones (26) por tema
- **Base:** `20260828011402_remote_schema`
- **Seguridad auth/secretos:** `20260827044148`, `20260827044242`
- **Caja:** `20260906210154`, `20260906234735`
- **Stock/kardex/índices:** `20260906211618`, `20260911033149`, `20260911041340`, `20260911041618`
- **Impresoras:** `20260912191945`
- **Suscripción/fiscal:** `20260916024610`, `20260925202620`, `20260930070828`
- **Tiendanube:** `20260917041734`, `20260918020359`, `20260918235305`, `20260919001926`, `20260919233008`, `20260919233127`
- **Bug catálogo compartido:** `20260920193341`
- **Producción/ingredientes/depósito:** `20260921012925`, `20260921024903`, `20260921140758`
- **Métodos de pago:** `20260930043224`
- **Add-ons:** `20260930061936`, `20260930063923`

### 5.9 Índices
Base: `idx_*` por local/venta/arqueo/perfil/sector + `locales_slug_key`, `producto_sucursal(...)`.
Añadidos: `idx_productos_negocio`, dos UNIQUE parciales de código de barras por local/negocio,
`idx_movimientos_caja_*`, `idx_movimientos_stock_*`, `idx_ingredientes_local`, `idx_mov_ingredientes_*`,
`idx_receta_items_producto`, `idx_producciones_local`, `idx_depositos_negocio`, `idx_*_deposito`.
**Ausentes:** `productos.tiendanube_*` (los usa `procesar_pedido_tiendanube`), `receta_items.ingrediente_id`,
`producto_deposito.producto_id`/`ingrediente_deposito.ingrediente_id`, `movimientos_stock.creado_at`/`motivo`.

### 5.10 Gotchas del esquema
1. **RLS sin políticas (deny-all, solo service_role):** `negocio_tiendanube`, `tiendanube_pedidos_procesados`,
   `addon_invitaciones_pendientes`. `oauth_pendientes` solo INSERT.
2. **Las 32 tablas tienen RLS habilitado.**
3. **Verdad cacheada denormalizada:** `*.stock_actual` es la fuente de verdad; los libros de movimientos
   son append-only pero **no** son la fuente de verdad aún → por eso las mutaciones usan RPC con `FOR UPDATE`.
4. `productos.alerta_enviada` es guard anti-duplicado.
5. Circularidad `negocios.dueño_id ↔ perfiles.negocio_id`.
6. `productos.local_id` XOR `negocio_id` (directo vs compartido); `producto_sucursal` solo con 2+ sucursales.
7. `registrar_local_y_perfil` no valida `p_user_id = auth.uid()` (deuda abierta).
8. `handle_new_user` y `proteger_campos_sensibles_perfil` **sin `SET search_path`**.
9. Clave anon hardcodeada en `avisar_stock_bajo()` (pública por diseño, pero versionada).
10. `metodos_pago` desincronizado (`tarjeta` en locales viejos); `ventas.metodo_pago` sin CHECK.
11. Grants por defecto de Supabase incluyen `TRUNCATE` a `anon`/`authenticated` (no alcanzable vía PostgREST).
12. Mismo nombre de trigger en dos tablas.
13. `schema_actual.sql`/`schema_propio.sql` y `src/types/index.ts` **desactualizados**.
14. Cron fuera de migraciones.
15. Policies de escritura chequean bloqueo; las de SELECT generalmente no.
16. FKs sin CASCADE (pueden bloquear deletes).
17. `negocios.tiendanube_local_id` se carga a mano por SQL (pendiente UI).
18. Sin variante compartida para ingredientes/recetas.
19. `registrar_produccion`/`transferir_stock` con ventana de concurrencia (puede quedar en 0 en vez de fallar).
20. Bucket `productos` aísla fotos por `local_id` (no `negocio_id`).

---

## 6. Deuda técnica transversal (prioridades sugeridas)

**Alto impacto / correctitud**
- Persistencia de pedidos de salón + realtime (hoy se pierden al recargar).
- Descuentos: persistir `ventas.descuento` y pasarlo desde mostrador y salón; alinear detalle vs total.
- Reconciliación offline idempotente + panel de ventas fallidas (Etapa 4.2).
- Reconciliar la cola al montar (no solo en transición offline→online).
- Permitir venta offline tras recargar (cachear arqueo activo).
- Transacción para `ventas` + `detalle_ventas`.

**Seguridad**
- Verificar firma del webhook de MP.
- `registrar_local_y_perfil`: validar `auth.uid()`.
- `SET search_path` en funciones SECURITY DEFINER faltantes.

**Consistencia / mantenibilidad**
- Alinear `planes.ts`/`usePlan` con el cobro real (o eliminar el gating muerto); decidir plan por local vs negocio.
- Versionar el cron `resumen-stock-diario`.
- Regenerar `schema_actual.sql`/`schema_propio.sql` y `src/types/index.ts`.
- Limpiar archivos vacíos y nombres mal escritos (`servces`, `ContendedorMesas`).
- Considerar tests (hoy no hay runner).
