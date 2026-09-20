-- Una cancelación solo repone stock si el pedido ya se había descontado
-- antes (marcador 'order/created'). Sin esto, cancelar un pedido anterior
-- al registro del webhook (o cuyo 'created' llegó desordenado) inflaría el
-- stock de Vallis con unidades que nunca se restaron. Falla a propósito
-- (Tiendanube reintenta: si fue desorden, el 'created' se procesa en el
-- ínterin y el reintento ya pasa; si el pedido es anterior al webhook,
-- los reintentos se agotan sin efecto).
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
    if v_local_id is null then
        raise exception 'El negocio % no tiene sucursal designada para Tiendanube', p_negocio_id;
    end if;

    if p_evento = 'order/cancelled' and not exists (
        select 1 from tiendanube_pedidos_procesados
        where negocio_id = p_negocio_id and order_id = p_order_id and evento = 'order/created'
    ) then
        raise exception 'Cancelación del pedido % sin descuento previo', p_order_id;
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

        if v_stock_anterior is null or v_stock_minimo <= 0 then
            v_salteados := v_salteados + 1;
            continue;
        end if;

        v_stock_nuevo := greatest(v_stock_anterior + v_delta, 0);

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
