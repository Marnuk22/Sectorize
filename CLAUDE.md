# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Vallis** — a multi-tenant POS/management app for small businesses ("locales"): restaurants/bars (tables & sectors), stores (quick counter sales), and gyms/academies (memberships & attendance). One codebase serves all business types; which features are visible is driven entirely by data on the `local` (its `plan` and `modulos`), not by separate builds. The npm package name (`gymgestor`) is a legacy leftover from an earlier pivot — ignore it.

The repo root is the main React app. `vallis-landing/` is a separate static marketing site (plain HTML, deployed on Vercel) — it has no `package.json` and is unrelated to the pnpm build. **Note: the folder is `vallis-landing/`, NOT `landing/`.** The public product catalog lives inside it at `vallis-landing/c/` and is served at `vallis.com.ar/c/{slug}` via a rewrite in `vallis-landing/vercel.json`.

- App deployed at: **app.vallis.com.ar**
- Landing + catalog at: **vallis.com.ar**
- Supabase project ref: **wlrwfkhjucomitgoryqu**

## Commands

Package manager is **pnpm** (see `packageManager` in package.json).

- `pnpm dev` — start the Vite dev server
- `pnpm build` — typecheck (`tsc -b`) then production build (`vite build`)
- `pnpm lint` — ESLint over the whole repo
- `pnpm preview` — preview the production build

There is no test runner configured in this project.

Supabase Edge Functions (`supabase/functions/*`) are Deno-based and deployed via the Supabase CLI (`supabase functions deploy <name>`); they are not part of the pnpm build. **Deploying is a separate channel from Git/Vercel** — a function deploy does NOT require a commit, and a commit does NOT deploy functions. Still commit the function code to `supabase/` for backup/versioning.

## Architecture

### Feature gating: módulos + planes

Two independent, orthogonal config systems in `src/config/` decide what a given `local` sees:

- `modulos.ts` — which **business sections** exist (`salon`, `mostrador`, `suscripciones`, `inventario`, `ventas`, `arqueos`). `inventario`/`ventas`/`arqueos` are "núcleo" (every local has them); `salon`/`mostrador`/`suscripciones` are opt-in per business type (`NEGOCIOS`: restaurante/tienda/servicios). A local's active modules live in `local.modulos: string[]` in the DB. Read via `useModulos()`.
- `planes.ts` — which **paid features** are unlocked (`seguimiento_stock`, `historial_completo`, `reportes`, `notificaciones_email`) per plan (`gratis`/`basico`/`premium`). Gate a feature with `puedeUsar(plan, feature)` or the `usePlan()` hook (`puede(feature)`), and show `<FeatureBloqueada>` when locked.

`App.tsx` picks the first available section from `ORDEN_MODULOS` based on `useModulos()` and renders `NavBar` + `Board` for whichever section is active — there's no router; navigation is a `seccion` string in local state, switched in a big `switch` inside `Board.tsx`. Los paneles de usuario (Datos del local, Configuración, Impresoras, Catálogo, Mi plan) se abren desde `MenuUsuario` en un `PanelLateral`, no son secciones del NavBar.

### State: per-domain React Context, no external store

Each business domain owns a Context provider in `src/context/`, all mounted in `App.tsx` once a user/local exists: `AuthContext`, `SalonContext` (sectors/tables/orders), `MenuContext` (products/catalog), `VentasContext` (sales/checkout), `MostradorContext` (quick counter sales), `AfiliadosContext` (members/memberships), `ImpresorasContext` (printers). Providers talk to Supabase directly (`supabase.from(...)`) — there is no separate API/service layer between components and the DB, except for pure business logic factored into `src/logic/*Services.ts` (e.g. `MesaService` in `MesaServices.ts`), which is deliberately Supabase-free and only transforms in-memory UI state.

`AuthContext` caches `user`/`perfil`/`local` in `localStorage` (`vallis_user`, `perfil`, `local`) for instant boot on reload, then reconciles against Supabase in the background — preserve this cache-then-refresh pattern rather than blocking render on a network round trip. `AuthContext` loads the local with `.select('*')`, so any new column on `locales` is available automatically. It also exposes `actualizarLocal(cambios: Partial<Local>)` which updates DB + state + localStorage together.

**CRITICAL — onAuthStateChange:** never call an async Supabase function directly inside the `onAuthStateChange` callback — it deadlocks. Defer with `setTimeout(() => { ... }, 0)`. Context loaders use a `let activo = true` flag with cleanup to avoid setting state after unmount.

### Provider order matters

In `App.tsx` the order is `VentasProvider` OUTSIDE `MenuProvider`, then `SalonProvider` / `MostradorProvider` inside. So `VentasContext` canNOT use `useMenu()` (MenuProvider doesn't exist yet at that level), but `MostradorContext` and `SalonContext` CAN (they're inside MenuProvider). This is why the post-sale stock refresh (`recargarProductos`) is called from Mostrador/Salón contexts, not from `registrarVenta`.

### Types: DB shape vs UI shape

`src/types/index.ts` is split into two clearly separated halves:
- **DB entities** — mirror the Postgres tables 1:1 (snake_case fields, `id: string` uuid, enum unions matching DB `CHECK` constraints exactly — e.g. `EstadoVenta`, `RolUsuario`).
- **UI types** — suffixed `UI` (`MesaUI`, `SectorUI`, `ItemPedidoUI`, `VentaUI`, `ArqueoUI`), frontend-only shapes that never round-trip to the DB as-is; contexts map DB rows into these before putting them in state.

When adding a field that exists in the DB, add it to the DB entity interface; only add to a `*UI` type if the frontend actually needs to carry it in local state. **Watch out:** shared types derived from a form's initial-values object (e.g. `CAMPOS_INICIALES` in `ModalProducto`) also need the new field, or duplicate/edit flows break at compile time. Adding a required field to `Producto` will surface compile errors everywhere a product is created (import, modal, duplicate) — add the field with its default in each.

### Backend: Supabase (Postgres + Auth + Edge Functions)

- No local migrations directory — schema changes are managed directly against the Supabase project via the SQL Editor (see `supabase/.temp/project-ref`). There is no versioned SQL; keep a note of triggers/functions/policies since they live only in Supabase, not the repo.
- Edge Functions in `supabase/functions/<name>/index.ts` are independent Deno scripts (own `deno.json` import map, `Deno.serve`, manual CORS headers, manual JWT check via `supabase.auth.getUser()`). Current functions: `suscribir` / `crear-plan-mp` / `webhook-mp` (MercadoPago subscription billing), `alerta-stock` / `resumen-stock` (stock email alerts).
- Frontend Supabase client is a single instance at `src/lib/supabase.ts`, configured from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

**RLS pattern:** every tenant table filters by `local_id IN (SELECT local_id FROM perfiles WHERE id = auth.uid())`. Public reads (the catalog) never open the table to `anon`; instead a `SECURITY DEFINER` function (`catalogo_publico(slug)`) returns only safe columns as JSON — never `precio_costo` or raw `stock_actual`.

**Secrets:** `MP_ACCESS_TOKEN`, `MP_PLAN_ID`, `RESEND_API_KEY` live in Supabase secrets (`supabase secrets set`), never in code. Secrets are write-only (can't be read back). After changing a secret, redeploy the functions that use it so they pick up the new value. `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into every function.

**The anon key is public by design** (it's identity, not capability). It's hardcoded in the catalog page (`vallis-landing/c/index.html`) because that Vercel project has no build step. Env vars in a frontend are NOT secret — Vite inlines them literally. Rule: if the browser needs it, it isn't a secret.

### Data-integrity rules live in the DB (triggers), not the frontend

- **Stock discount:** a trigger `trigger_descontar_stock` (AFTER INSERT on `detalle_ventas`) subtracts sold quantity from the product, `GREATEST(stock_actual - cantidad, 0)`, only when `stock_minimo > 0` and `producto_id IS NOT NULL`. `registrarVenta` does NOT discount stock in code — it's the trigger. A comment in `registrarVenta` documents this.
- **Stock alerts:** `trigger_avisar_stock_bajo` (AFTER UPDATE OF stock_actual) fires only on the *crossing* (`old.stock_actual > old.stock_minimo AND new.stock_actual <= new.stock_minimo`) and calls the `alerta-stock` Edge Function via `net.http_post`. A daily cron (`resumen-stock-diario`, 23:00 UTC = 20:00 ART) calls `resumen-stock`.
- Extensions enabled: `pg_cron`, `pg_net`.
- General principle: integrity rules go close to the data (DB); presentation and external-service orchestration go higher up (frontend / Edge Functions).

### Granel (sold-by-weight) architecture

- `productos.tipo_venta`: `'unidad' | 'granel'`; `unidad_medida`: `'unidad' | 'kg' | 'g' | 'l' | 'ml'` (see `src/config/unidades.ts`, the single source of truth for `UnidadMedida`).
- `detalle_ventas.cantidad`, `productos.stock_actual`, `productos.stock_minimo` are all **numeric** (accept decimals like 0.250 kg). `detalle_ventas.subtotal` is a GENERATED column (`cantidad * precio_unitario`).
- Stock inputs use `parseFloat` + `step="any"`. Display with `toLocaleString('es-AR', { maximumFractionDigits: 3 })` so integers show clean and decimals show up to 3 places.
- **"Más vendidos" counts BY LINES (+1 per sale line), not by summing quantity** — otherwise a 0.250 kg sale would count as a fraction. See `useMasVendidos`.

### Printing (QZ Tray)

Receipt/comanda printing goes through `src/logic/qz.ts` (QZ Tray websocket bridge) → `src/logic/comanda.ts` (formats comanda/ticket/arqueo text) → `src/logic/impresion.ts` (`imprimirComanda`/`imprimirTicket`/`imprimirArqueo`, the public API used by components). Printer names are per-local config surfaced via `ImpresorasContext`; always check `impresoras.length === 0` before attempting a print, matching the existing functions.

## Conventions

- **Spanish throughout**: identifiers, types, UI copy, and log messages are all in Spanish (`Producto`, `agregarProductoAMesa`, `"No hay impresoras configuradas..."`). Keep new code consistent — don't switch to English identifiers.
- **UI base components**: `src/Components/ui/ComponentesBase.tsx` defines the design-system primitives (`Tarjeta`, `SeccionDatos`, `FilaDato`, and where present `Boton`, `EstadoVacio`, `ModalBase`) with fixed tones/sizes/variants (tones: `neutral`/`exito`/`alerta`/`acento`). New UI should compose these rather than hand-writing Tailwind for cards, buttons, or modals — the point is to stop one-off color/spacing drift.
- **Visual language**: warm greys via the `stone` palette (NEVER `gray`/`slate`); accent `violet` (violet-600); green = ok/free/active, red = alert, amber = warning; white surfaces, `stone-200` borders, `rounded-xl`/`rounded-2xl`.
- **Stacking-context gotcha**: `opacity` and `active:scale`/`transform` create a stacking context and will trap a child's `z-index` and make floating menus render translucent/behind siblings. Never put them on a card that contains a floating menu (the ⋯ actions menu). Apply `opacity` only to the info block, keep the actions row outside it.
- Components are organized by domain under `src/Components/<Dominio>/` (`Auth/`, `Inventario/`, `Usuario/`, `afiliados/`, `mesa/`, `mostrador/`, `planes/`, `ventas/`); top-level files (`Board.tsx`, `NavBar.tsx`, etc.) are cross-domain shells.

## MercadoPago subscription billing (in progress)

- Model: **automatic subscription** (Preapproval), $28.000 ARS/month, subscription WITHOUT associated plan (`auto_recurring` inline + `status: 'pending'` → returns `init_point` to redirect). The 7-day free trial is managed by Vallis (`prueba_vence` on `locales`), NOT by MercadoPago.
- `locales` has `suscripcion_estado` (`prueba`/`activa`/`vencida`/`cancelada`, default `prueba`), `suscripcion_id`, `suscripcion_vence`, `prueba_vence`.
- `suscribir` creates the subscription and saves `suscripcion_id`; `external_reference = local_id` is the thread the webhook uses. `webhook-mp` re-queries MP for the real status (doesn't trust the notification), translates it, and updates the local; it always responds 200 to avoid MP retry loops.
- **Known open issue:** `payer_email` in a `pending` subscription is the email MercadoPago ties the payer to — it forces the payer to log in with that exact email. A local whose email differs from the payer's MercadoPago account gets blocked. Planned fix: add a "MercadoPago email" field in `PanelMiPlan` and send THAT as `payer_email`, instead of `user.email`.
- **Going to production** = swap the `MP_ACCESS_TOKEN` secret to the real `APP_USR-` token, set `payer_email` back to the payer's real email, configure the webhook in the production tab of the MP panel, redeploy. No code rewrite.

## Developer context

- Windows, VS Code, repo at `C:\Users\oniam\Vallis\Sectorize`.
- Student developer; prefers changes applied one at a time, reporting errors as they come.
- Legacy leftovers to eventually fix: `index.html` app title still says "gymgestor"; `package.json` name is `gymgestor`.
