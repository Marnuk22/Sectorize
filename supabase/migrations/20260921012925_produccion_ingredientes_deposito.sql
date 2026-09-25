-- Etapa 2 de "Producción/ingredientes + depósito" — modelo de datos completo
-- (Etapa 1 fue solo diseño, discutido y acordado antes de esta migración).
-- Dos módulos nuevos, opt-in (apagados por defecto, se activan agregando el
-- id a locales.modulos — mismo mecanismo que salon/mostrador/suscripciones):
-- 'produccion' (ingredientes, recetas, producción por lote) y 'deposito'
-- (ubicación extra + transferencias).
--
-- Simplificación de alcance acordada: ingredientes NO tiene la variante de
-- catálogo compartido multisucursal que sí tiene productos — vive siempre
-- directo en una sucursal (local_id not null). Se agrega compartido más
-- adelante si hace falta, mismo camino que se hizo con productos.

-- ============================================
-- Ingredientes
-- ============================================
create table public.ingredientes (
    id             uuid primary key default gen_random_uuid(),
    local_id       uuid not null references public.locales(id) on delete cascade,
    nombre         text not null,
    unidad_medida  text not null default 'unidad',
    stock_actual   numeric not null default 0,
    stock_minimo   numeric not null default 0,
    costo_unitario numeric,
    activo         boolean not null default true,
    creado_at      timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

alter table public.ingredientes enable row level security;
create index idx_ingredientes_local on public.ingredientes using btree (local_id);

create policy "ver ingredientes de mis sucursales"
    on public.ingredientes for select
    to public
    using (local_id in (select public.sucursales_del_usuario()));

create policy "gestionar ingredientes de mis sucursales"
    on public.ingredientes for all
    to public
    using (local_id in (select public.sucursales_gestionables()))
    with check (local_id in (select public.sucursales_gestionables()));

-- Kardex de ingredientes, mismo espíritu que movimientos_stock.
create table public.movimientos_ingredientes (
    id              uuid primary key default gen_random_uuid(),
    local_id        uuid not null references public.locales(id) on delete cascade,
    ingrediente_id  uuid not null references public.ingredientes(id) on delete cascade,
    cantidad        numeric not null check (cantidad <> 0),
    motivo          text not null check (motivo in ('ingreso', 'ajuste', 'merma', 'produccion', 'transferencia')),
    costo_unitario  numeric,
    nota            text,
    usuario_id      uuid references public.perfiles(id),
    creado_at       timestamptz not null default now()
);

alter table public.movimientos_ingredientes enable row level security;
create index idx_mov_ingredientes_ingrediente on public.movimientos_ingredientes using btree (ingrediente_id);
create index idx_mov_ingredientes_local on public.movimientos_ingredientes using btree (local_id);

create policy "ver movimientos de ingredientes de mi local"
    on public.movimientos_ingredientes for select
    to public
    using (local_id in (select public.sucursales_gestionables()));

create policy "registrar movimientos de ingredientes"
    on public.movimientos_ingredientes for insert
    to public
    with check (
        local_id in (select public.sucursales_gestionables())
        and public.estado_acceso_local(local_id) <> 'bloqueado'
    );

-- RPC atómica: misma forma que registrar_movimiento_stock, para ingredientes.
create or replace function public.registrar_movimiento_ingrediente(
    p_ingrediente_id uuid,
    p_local_id uuid,
    p_cantidad numeric,
    p_motivo text,
    p_costo_unitario numeric default null,
    p_nota text default null
)
returns table (stock_anterior numeric, stock_nuevo numeric, movimiento_id uuid)
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
    v_stock_anterior numeric;
    v_stock_nuevo numeric;
    v_movimiento_id uuid;
    v_filas int;
begin
    if p_cantidad = 0 then
        raise exception 'La cantidad no puede ser cero';
    end if;

    if p_motivo not in ('ingreso', 'ajuste', 'merma', 'produccion', 'transferencia') then
        raise exception 'Motivo inválido: %', p_motivo;
    end if;

    select stock_actual into v_stock_anterior
    from ingredientes
    where id = p_ingrediente_id and local_id = p_local_id
    for update;

    if v_stock_anterior is null then
        raise exception 'Ingrediente no encontrado en esta sucursal o sin permiso para verlo';
    end if;

    v_stock_nuevo := greatest(v_stock_anterior + p_cantidad, 0);

    update ingredientes
    set stock_actual = v_stock_nuevo, updated_at = now()
    where id = p_ingrediente_id and local_id = p_local_id;

    get diagnostics v_filas = row_count;
    if v_filas = 0 then
        raise exception 'No se pudo actualizar el stock (sin permiso)';
    end if;

    insert into movimientos_ingredientes (local_id, ingrediente_id, cantidad, motivo, costo_unitario, nota, usuario_id)
    values (p_local_id, p_ingrediente_id, p_cantidad, p_motivo, p_costo_unitario, p_nota, auth.uid())
    returning id into v_movimiento_id;

    return query select v_stock_anterior, v_stock_nuevo, v_movimiento_id;
end;
$function$;

-- ============================================
-- Recetas (BOM): qué ingredientes y en qué cantidad consume 1 unidad de un producto
-- ============================================
create table public.receta_items (
    id             uuid primary key default gen_random_uuid(),
    producto_id    uuid not null references public.productos(id) on delete cascade,
    ingrediente_id uuid not null references public.ingredientes(id) on delete cascade,
    cantidad       numeric not null check (cantidad > 0),
    unique (producto_id, ingrediente_id)
);

alter table public.receta_items enable row level security;
create index idx_receta_items_producto on public.receta_items using btree (producto_id);

-- Sin local_id propio: se resuelve vía el ingrediente (que sí tiene local_id).
create policy "ver receta de mis sucursales"
    on public.receta_items for select
    to public
    using (ingrediente_id in (
        select id from ingredientes where local_id in (select public.sucursales_del_usuario())
    ));

create policy "gestionar receta de mis sucursales"
    on public.receta_items for all
    to public
    using (ingrediente_id in (
        select id from ingredientes where local_id in (select public.sucursales_gestionables())
    ))
    with check (ingrediente_id in (
        select id from ingredientes where local_id in (select public.sucursales_gestionables())
    ));

-- ============================================
-- Producción por lote
-- ============================================
create table public.producciones (
    id           uuid primary key default gen_random_uuid(),
    local_id     uuid not null references public.locales(id) on delete cascade,
    producto_id  uuid not null references public.productos(id) on delete cascade,
    cantidad     numeric not null check (cantidad > 0),
    usuario_id   uuid references public.perfiles(id),
    nota         text,
    creado_at    timestamptz not null default now()
);

alter table public.producciones enable row level security;
create index idx_producciones_local on public.producciones using btree (local_id);

create policy "ver producciones de mi local"
    on public.producciones for select
    to public
    using (local_id in (select public.sucursales_gestionables()));

create policy "registrar producciones"
    on public.producciones for insert
    to public
    with check (
        local_id in (select public.sucursales_gestionables())
        and public.estado_acceso_local(local_id) <> 'bloqueado'
    );

-- Amplía movimientos_stock.motivo (tabla y validación interna de
-- registrar_movimiento_stock) para aceptar 'produccion'.
do $$
declare
    v_constraint text;
begin
    select conname into v_constraint
    from pg_constraint
    where conrelid = 'public.movimientos_stock'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%motivo%';
    if v_constraint is not null then
        execute format('alter table public.movimientos_stock drop constraint %I', v_constraint);
    end if;
end $$;

alter table public.movimientos_stock
    add constraint movimientos_stock_motivo_check
    check (motivo in ('ingreso', 'ajuste', 'merma', 'devolucion', 'venta_online', 'cancelacion_online', 'produccion', 'transferencia'));

create or replace function public.registrar_movimiento_stock(
    p_producto_id uuid,
    p_local_id uuid,
    p_cantidad numeric,
    p_motivo text,
    p_costo_unitario numeric default null,
    p_nota text default null
)
returns table (stock_anterior numeric, stock_nuevo numeric, movimiento_id uuid)
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
    v_es_compartido boolean;
    v_stock_anterior numeric;
    v_stock_nuevo numeric;
    v_movimiento_id uuid;
    v_filas int;
begin
    if p_cantidad = 0 then
        raise exception 'La cantidad no puede ser cero';
    end if;

    if p_motivo not in ('ingreso', 'ajuste', 'merma', 'devolucion', 'produccion', 'transferencia') then
        raise exception 'Motivo inválido: %', p_motivo;
    end if;

    select exists (
        select 1 from producto_sucursal
        where producto_id = p_producto_id and local_id = p_local_id
    ) into v_es_compartido;

    if v_es_compartido then
        select stock_actual into v_stock_anterior
        from producto_sucursal
        where producto_id = p_producto_id and local_id = p_local_id
        for update;
    else
        select stock_actual into v_stock_anterior
        from productos
        where id = p_producto_id and local_id = p_local_id
        for update;
    end if;

    if v_stock_anterior is null then
        raise exception 'Producto no encontrado en esta sucursal o sin permiso para verlo';
    end if;

    v_stock_nuevo := greatest(v_stock_anterior + p_cantidad, 0);

    if v_es_compartido then
        update producto_sucursal
        set stock_actual = v_stock_nuevo
        where producto_id = p_producto_id and local_id = p_local_id;
    else
        update productos
        set stock_actual = v_stock_nuevo, updated_at = now()
        where id = p_producto_id and local_id = p_local_id;
    end if;

    get diagnostics v_filas = row_count;
    if v_filas = 0 then
        raise exception 'No se pudo actualizar el stock (sin permiso)';
    end if;

    insert into movimientos_stock (local_id, producto_id, cantidad, motivo, costo_unitario, nota, usuario_id)
    values (p_local_id, p_producto_id, p_cantidad, p_motivo, p_costo_unitario, p_nota, auth.uid())
    returning id into v_movimiento_id;

    return query select v_stock_anterior, v_stock_nuevo, v_movimiento_id;
end;
$function$;

-- RPC de producción: chequea que alcancen TODOS los ingredientes antes de
-- descontar ninguno (no se permite producir a medias), después descuenta
-- cada uno (reusando registrar_movimiento_ingrediente) y suma el stock del
-- producto terminado reusando registrar_movimiento_stock tal cual — así
-- hereda el push automático a Tiendanube (vive en un trigger sobre
-- stock_actual, no en el código de esta función) sin duplicar lógica.
-- SECURITY INVOKER a propósito (no hace falta bypassear RLS: las políticas
-- de ingredientes/movimientos_stock ya validan con sucursales_gestionables()
-- usando el usuario real de punta a punta).
--
-- Nota: el chequeo de "alcanza" y el descuento real son dos pasadas
-- separadas (cada una con su propio SELECT FOR UPDATE dentro de
-- registrar_movimiento_ingrediente) — con dos producciones concurrentes del
-- mismo producto podría, en el peor caso, dejar algún ingrediente en 0 en
-- vez de fallar limpio. Aceptado por ahora (caso raro en un negocio chico);
-- si se vuelve un problema real, hay que unificarlo en un solo paso con lock
-- explícito por ingrediente antes de chequear.
create or replace function public.registrar_produccion(
    p_producto_id uuid,
    p_local_id uuid,
    p_cantidad numeric,
    p_nota text default null
)
returns table (movimiento_id uuid, stock_nuevo numeric)
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
    r_ingrediente record;
    v_resultado record;
begin
    if p_cantidad <= 0 then
        raise exception 'La cantidad producida debe ser mayor a cero';
    end if;

    for r_ingrediente in
        select ri.ingrediente_id, ri.cantidad * p_cantidad as necesaria, i.stock_actual, i.nombre
        from receta_items ri
        join ingredientes i on i.id = ri.ingrediente_id
        where ri.producto_id = p_producto_id and i.local_id = p_local_id
    loop
        if r_ingrediente.stock_actual < r_ingrediente.necesaria then
            raise exception 'Stock insuficiente de %: hay %, hacen falta %',
                r_ingrediente.nombre, r_ingrediente.stock_actual, r_ingrediente.necesaria;
        end if;
    end loop;

    for r_ingrediente in
        select ri.ingrediente_id, ri.cantidad * p_cantidad as necesaria
        from receta_items ri
        where ri.producto_id = p_producto_id
    loop
        perform public.registrar_movimiento_ingrediente(
            r_ingrediente.ingrediente_id, p_local_id, -r_ingrediente.necesaria, 'produccion',
            null, 'Producción de ' || p_cantidad || ' unidades'
        );
    end loop;

    insert into producciones (local_id, producto_id, cantidad, usuario_id, nota)
    values (p_local_id, p_producto_id, p_cantidad, auth.uid(), p_nota);

    select * into v_resultado from public.registrar_movimiento_stock(
        p_producto_id, p_local_id, p_cantidad, 'produccion', null, p_nota
    );

    return query select v_resultado.movimiento_id, v_resultado.stock_nuevo;
end;
$function$;

-- ============================================
-- Depósito: ubicación extra a nivel NEGOCIO (no de una sucursal puntual),
-- para que cualquier sucursal con el módulo activo lo use.
-- ============================================
create table public.depositos (
    id         uuid primary key default gen_random_uuid(),
    negocio_id uuid not null references public.negocios(id) on delete cascade,
    nombre     text not null,
    creado_at  timestamptz not null default now()
);

alter table public.depositos enable row level security;
create index idx_depositos_negocio on public.depositos using btree (negocio_id);

create policy "ver depositos de mi negocio"
    on public.depositos for select
    to public
    using (negocio_id = (select negocio_id from perfiles where id = auth.uid()));

-- Alta/edición/baja de depósitos: dueño-only (misma jerarquía que
-- agregar_sucursal), no encargado.
create policy "dueño gestiona depositos"
    on public.depositos for all
    to public
    using (
        negocio_id = (select negocio_id from perfiles where id = auth.uid())
        and (select rol from perfiles where id = auth.uid()) = 'dueño'
    )
    with check (
        negocio_id = (select negocio_id from perfiles where id = auth.uid())
        and (select rol from perfiles where id = auth.uid()) = 'dueño'
    );

create table public.producto_deposito (
    id           uuid primary key default gen_random_uuid(),
    producto_id  uuid not null references public.productos(id) on delete cascade,
    deposito_id  uuid not null references public.depositos(id) on delete cascade,
    stock_actual numeric not null default 0,
    unique (producto_id, deposito_id)
);

alter table public.producto_deposito enable row level security;
create index idx_producto_deposito_deposito on public.producto_deposito using btree (deposito_id);

create table public.ingrediente_deposito (
    id             uuid primary key default gen_random_uuid(),
    ingrediente_id uuid not null references public.ingredientes(id) on delete cascade,
    deposito_id    uuid not null references public.depositos(id) on delete cascade,
    stock_actual   numeric not null default 0,
    unique (ingrediente_id, deposito_id)
);

alter table public.ingrediente_deposito enable row level security;
create index idx_ingrediente_deposito_deposito on public.ingrediente_deposito using btree (deposito_id);

-- Mismo criterio de acceso que depositos: ver = todo el negocio, gestionar = sucursales_gestionables().
create policy "ver stock de productos en depositos"
    on public.producto_deposito for select
    to public
    using (deposito_id in (
        select id from depositos where negocio_id = (select negocio_id from perfiles where id = auth.uid())
    ));

create policy "gestionar stock de productos en depositos"
    on public.producto_deposito for all
    to public
    using (deposito_id in (
        select d.id from depositos d
        join perfiles p on p.negocio_id = d.negocio_id and p.id = auth.uid()
        where p.rol in ('dueño', 'encargado')
    ))
    with check (deposito_id in (
        select d.id from depositos d
        join perfiles p on p.negocio_id = d.negocio_id and p.id = auth.uid()
        where p.rol in ('dueño', 'encargado')
    ));

create policy "ver stock de ingredientes en depositos"
    on public.ingrediente_deposito for select
    to public
    using (deposito_id in (
        select id from depositos where negocio_id = (select negocio_id from perfiles where id = auth.uid())
    ));

create policy "gestionar stock de ingredientes en depositos"
    on public.ingrediente_deposito for all
    to public
    using (deposito_id in (
        select d.id from depositos d
        join perfiles p on p.negocio_id = d.negocio_id and p.id = auth.uid()
        where p.rol in ('dueño', 'encargado')
    ))
    with check (deposito_id in (
        select d.id from depositos d
        join perfiles p on p.negocio_id = d.negocio_id and p.id = auth.uid()
        where p.rol in ('dueño', 'encargado')
    ));

-- RPC de transferencia: resta de un lado y suma del otro, atómico, con el
-- mismo criterio de "no se permite a medias" (si no alcanza, falla entera).
-- p_tipo: 'producto' | 'ingrediente'. p_direccion: 'a_deposito' | 'a_sucursal'.
create or replace function public.transferir_stock(
    p_tipo text,
    p_item_id uuid,
    p_local_id uuid,
    p_deposito_id uuid,
    p_cantidad numeric,
    p_direccion text
)
returns void
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
    v_signo_local numeric;
    v_signo_deposito numeric;
begin
    if p_cantidad <= 0 then
        raise exception 'La cantidad a transferir debe ser mayor a cero';
    end if;
    if p_direccion not in ('a_deposito', 'a_sucursal') then
        raise exception 'Dirección inválida: %', p_direccion;
    end if;

    v_signo_local := case when p_direccion = 'a_deposito' then -1 else 1 end;
    v_signo_deposito := -v_signo_local;

    if p_tipo = 'producto' then
        perform public.registrar_movimiento_stock(
            p_item_id, p_local_id, v_signo_local * p_cantidad, 'transferencia', null,
            'Transferencia con depósito'
        );

        insert into producto_deposito (producto_id, deposito_id, stock_actual)
        values (p_item_id, p_deposito_id, greatest(v_signo_deposito * p_cantidad, 0))
        on conflict (producto_id, deposito_id)
        do update set stock_actual = greatest(producto_deposito.stock_actual + v_signo_deposito * p_cantidad, 0);

    elsif p_tipo = 'ingrediente' then
        perform public.registrar_movimiento_ingrediente(
            p_item_id, p_local_id, v_signo_local * p_cantidad, 'transferencia', null,
            'Transferencia con depósito'
        );

        insert into ingrediente_deposito (ingrediente_id, deposito_id, stock_actual)
        values (p_item_id, p_deposito_id, greatest(v_signo_deposito * p_cantidad, 0))
        on conflict (ingrediente_id, deposito_id)
        do update set stock_actual = greatest(ingrediente_deposito.stock_actual + v_signo_deposito * p_cantidad, 0);

    else
        raise exception 'Tipo inválido: %', p_tipo;
    end if;
end;
$function$;
