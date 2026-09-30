-- Add-ons pagos por negocio (hoy solo 'facturacion'), cobrados dentro de la
-- MISMA suscripción de MercadoPago: activar/desactivar cambia su monto
-- (PUT /preapproval/{id}, verificado en sandbox 2026-09-30). Todas las
-- escrituras las hace la Edge Function gestionar-addon con el service role.

-- Precios en la base (no en el código) para ajustarlos por tipo de cambio
-- sin redeploy: update precios set monto = ... where clave = ...
-- Ojo: cambiar un precio NO cambia las suscripciones ya creadas.
create table public.precios (
    clave  text primary key,
    monto  numeric not null check (monto > 0)
);

insert into public.precios (clave, monto) values
    ('base', 30000),
    ('addon_facturacion', 10000);

alter table public.precios enable row level security;

create policy "Cualquier usuario logueado lee los precios"
    on public.precios
    for select
    to authenticated
    using (true);

-- Estado del add-on por negocio. 'pendiente_invitacion': ya se cobra, pero
-- falta que el integrador invite al cliente en Factumono (manual, sin API);
-- el módulo 'facturacion' recién se prende en locales al pasar a 'activo'.
create table public.negocio_addons (
    negocio_id    uuid not null references public.negocios(id) on delete cascade,
    addon         text not null check (addon in ('facturacion')),
    estado        text not null check (estado in ('pendiente_invitacion', 'activo')),
    activado_en   timestamptz not null default now(),
    invitado_en   timestamptz,
    primary key (negocio_id, addon)
);

alter table public.negocio_addons enable row level security;

create policy "Usuarios del negocio ven sus add-ons"
    on public.negocio_addons
    for select
    to authenticated
    using (negocio_id = (select negocio_id from public.perfiles where id = auth.uid()));

-- Token de un solo uso del botón "Ya lo invité" del mail al integrador.
-- Tabla aparte y sin políticas: el cliente no puede leer su propio token y
-- marcarse invitado solo.
create table public.addon_invitaciones_pendientes (
    token       text primary key,
    negocio_id  uuid not null references public.negocios(id) on delete cascade,
    addon       text not null,
    creado_en   timestamptz not null default now()
);

alter table public.addon_invitaciones_pendientes enable row level security;
