-- Conexión OAuth de Tiendanube: identificador de tienda visible en negocios,
-- access_token en tabla aparte (nunca se lee vía select('*') de AuthContext),
-- y tokens de state de un solo uso para el handshake OAuth (evita pasar el
-- negocio_id en texto plano como state, mitigando CSRF de account-linking).

alter table public.negocios
    add column tiendanube_store_id text;

create table public.negocio_tiendanube (
    negocio_id     uuid primary key references public.negocios(id) on delete cascade,
    access_token   text not null,
    conectado_en   timestamptz not null default now()
);

alter table public.negocio_tiendanube enable row level security;
-- Sin políticas: ni authenticated ni anon pueden leer/escribir esta tabla
-- desde el cliente. Solo el service role (Edge Functions) la usa.

create table public.oauth_pendientes (
    token       text primary key,
    negocio_id  uuid not null references public.negocios(id) on delete cascade,
    creado_en   timestamptz not null default now()
);

alter table public.oauth_pendientes enable row level security;

-- El dueño autenticado puede crear su propio token de state (desde el botón
-- "Conectar con Tiendanube"), pero no leer ni borrar filas — eso lo hace la
-- Edge Function del callback con el service role.
create policy "Dueño puede crear su token de conexión Tiendanube"
    on public.oauth_pendientes
    for insert
    to authenticated
    with check (
        negocio_id = (select negocio_id from public.perfiles where id = auth.uid())
        and (select rol from public.perfiles where id = auth.uid()) = 'dueño'
    );
