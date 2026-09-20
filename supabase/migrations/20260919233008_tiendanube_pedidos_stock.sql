-- Pedidos de Tiendanube -> descuento de stock en Vallis.
--
-- 1) movimientos_stock.usuario_id nullable: los movimientos que vienen de un
--    webhook no tienen usuario de Vallis.
-- 2) motivo: se suman 'venta_online' y 'cancelacion_online'.
-- 3) tiendanube_pedidos_procesados: idempotencia — Tiendanube reintenta
--    hasta 16 veces y avisa que puede mandar el mismo evento repetido.
-- 4) procesar_pedido_tiendanube(): aplica todo el pedido de forma atómica
--    (marcador + todos los movimientos en una sola transacción).

alter table public.movimientos_stock alter column usuario_id drop not null;

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
    check (motivo in ('ingreso', 'ajuste', 'merma', 'devolucion', 'venta_online', 'cancelacion_online'));

create table public.tiendanube_pedidos_procesados (
    negocio_id   uuid not null references public.negocios(id) on delete cascade,
    order_id     text not null,
    evento       text not null check (evento in ('order/created', 'order/cancelled')),
    procesado_en timestamptz not null default now(),
    primary key (negocio_id, order_id, evento)
);

alter table public.tiendanube_pedidos_procesados enable row level security;
-- Sin políticas: solo el service role / funciones SECURITY DEFINER la tocan.

-- p_items: [{"product_id": "123", "variant_id": "456", "cantidad": 2}, ...]
-- (la Edge Function ya suma las líneas repetidas por variante).
create or replace function public.procesar_pedido_tiendanube(
    p_negocio_id uuid,
    p_order_id text,
    p_evento text,
    p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_local_id uuid;
    v_filas int;
    v_item jsonb;
    v_producto_id uuid;
    v_es_compartido boolean;
    v_stock_anterior numeric;
    v_stock_minimo numeric;
    v_stock_nuevo numeric;
    v_delta numeric;
    v_motivo text;
    v_aplicados int := 0;
    v_salteados int := 0;
begin
    if p_evento not in ('order/created', 'order/cancelled') then
        raise exception 'Evento inválido: %', p_evento;
    end if;

    select tiendanube_local_id into v_local_id from negocios where id = p_negocio_id;
    -- Falla a propósito (y revierte todo, incluido el marcador): Tiendanube
    -- va a reintentar, y cuando el negocio designe su sucursal se procesa.
    if v_local_id is null then
        raise exception 'El negocio % no tiene sucursal designada para Tiendanube', p_negocio_id;
    end if;

    insert into tiendanube_pedidos_procesados (negocio_id, order_id, evento)
    values (p_negocio_id, p_order_id, p_evento)
    on conflict do nothing;

    get diagnostics v_filas = row_count;
    if v_filas = 0 then
        return jsonb_build_object('duplicado', true);
    end if;

    v_motivo := case p_evento when 'order/created' then 'venta_online' else 'cancelacion_online' end;

    for v_item in select * from jsonb_array_elements(p_items) loop
        v_delta := (v_item->>'cantidad')::numeric;
        if p_evento = 'order/created' then
            v_delta := -v_delta;
        end if;

        select id into v_producto_id
        from productos
        where tiendanube_producto_id = v_item->>'product_id'
          and tiendanube_variant_id = v_item->>'variant_id'
          and (negocio_id = p_negocio_id or local_id = v_local_id)
        limit 1;

        -- Producto creado directo en Tiendanube (no vinculado a Vallis).
        if v_producto_id is null then
            v_salteados := v_salteados + 1;
            continue;
        end if;

        select exists (
            select 1 from producto_sucursal
            where producto_id = v_producto_id and local_id = v_local_id
        ) into v_es_compartido;

        if v_es_compartido then
            select stock_actual, stock_minimo into v_stock_anterior, v_stock_minimo
            from producto_sucursal
            where producto_id = v_producto_id and local_id = v_local_id
            for update;
        else
            select stock_actual, stock_minimo into v_stock_anterior, v_stock_minimo
            from productos
            where id = v_producto_id
            for update;
        end if;

        -- Mismo criterio que descontar_stock() para ventas físicas: solo
        -- productos con seguimiento de stock.
        if v_stock_anterior is null or v_stock_minimo <= 0 then
            v_salteados := v_salteados + 1;
            continue;
        end if;

        v_stock_nuevo := greatest(v_stock_anterior + v_delta, 0);

        -- Stock ya en el piso (0) y el pedido resta: no cambia nada, y
        -- movimientos_stock no admite cantidad 0 — se saltea en vez de
        -- revertir el pedido entero.
        if v_stock_nuevo = v_stock_anterior then
            v_salteados := v_salteados + 1;
            continue;
        end if;

        if v_es_compartido then
            update producto_sucursal
            set stock_actual = v_stock_nuevo
            where producto_id = v_producto_id and local_id = v_local_id;
        else
            update productos
            set stock_actual = v_stock_nuevo, updated_at = now()
            where id = v_producto_id;
        end if;

        insert into movimientos_stock (local_id, producto_id, cantidad, motivo, nota, usuario_id)
        values (v_local_id, v_producto_id, v_stock_nuevo - v_stock_anterior, v_motivo,
                'Pedido Tiendanube #' || p_order_id, null);

        v_aplicados := v_aplicados + 1;
    end loop;

    return jsonb_build_object('aplicados', v_aplicados, 'salteados', v_salteados);
end;
$function$;

revoke all on function public.procesar_pedido_tiendanube(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.procesar_pedido_tiendanube(uuid, text, text, jsonb) to service_role;
