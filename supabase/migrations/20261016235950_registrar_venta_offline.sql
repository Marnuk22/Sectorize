-- Venta encolada offline -> inserción atómica e idempotente (Etapa 4 del modo
-- offline).
--
-- La reconciliación insertaba `ventas` y `detalle_ventas` en dos llamadas
-- sueltas desde el cliente. Si la segunda fallaba (wifi que se corta justo
-- ahí, un error de red a mitad de camino, etc.) la venta quedaba a medias y
-- atascada para siempre: el reintento chocaba con la PK de `ventas` y nunca
-- llegaba a insertar el detalle, así que el trigger `descontar_stock` no
-- corría nunca y el arqueo quedaba de más.
--
-- Esta función hace las dos cosas en UNA transacción y se puede llamar
-- cualquier cantidad de veces con el mismo id: si la venta ya está no la
-- duplica, y si quedó sin detalle lo completa. Mismo patrón que
-- `procesar_pedido_tiendanube` (idempotencia explícita) y que
-- `registrar_movimiento_stock` (RPC atómica llamada desde el frontend).
--
-- p_items: [{"producto_id": uuid|null, "cantidad": n, "precio_unitario": n}, ...]
-- (producto_id null = línea sin producto de inventario, ej. membresía).
--
-- `security invoker` a propósito (no definer): corre con los permisos y el RLS
-- del cajero logueado, exactamente igual que el insert directo que reemplaza,
-- así no se agrega ninguna capacidad nueva.

create or replace function public.registrar_venta_offline(
    p_id uuid,
    p_local_id uuid,
    p_usuario_id uuid,
    p_arqueo_id uuid,
    p_total numeric,
    p_descuento numeric,
    p_descuento_tipo text,
    p_descuento_valor numeric,
    p_metodo_pago text,
    p_fecha timestamptz,
    p_items jsonb
)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
    v_insertadas int;
begin
    insert into ventas (
        id, local_id, usuario_id, arqueo_id, sector_id, total,
        descuento, descuento_tipo, descuento_valor, metodo_pago, estado, fecha
    )
    values (
        p_id, p_local_id, p_usuario_id, p_arqueo_id, null, p_total,
        p_descuento, p_descuento_tipo, p_descuento_valor, p_metodo_pago,
        'cerrada', p_fecha
    )
    on conflict (id) do nothing;

    -- 0 = la venta ya estaba (reintento de una reconciliación a medias).
    get diagnostics v_insertadas = row_count;

    -- El detalle va entero o no va: es una sola sentencia, así el trigger
    -- `descontar_stock` corre exactamente una vez por ítem y nunca puede
    -- quedar una venta con la mitad de las líneas.
    if not exists (select 1 from detalle_ventas where venta_id = p_id) then
        insert into detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
        select p_id,
               (item->>'producto_id')::uuid,
               (item->>'cantidad')::numeric,
               (item->>'precio_unitario')::numeric
        from jsonb_array_elements(p_items) as item;
    end if;

    return jsonb_build_object('id', p_id, 'ya_existia', v_insertadas = 0);
end;
$function$;

revoke all on function public.registrar_venta_offline(
    uuid, uuid, uuid, uuid, numeric, numeric, text, numeric, text, timestamptz, jsonb
) from public, anon;

grant execute on function public.registrar_venta_offline(
    uuid, uuid, uuid, uuid, numeric, numeric, text, numeric, text, timestamptz, jsonb
) to authenticated, service_role;
