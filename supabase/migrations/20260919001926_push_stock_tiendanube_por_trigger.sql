-- El push de stock a Tiendanube pasa de estar enganchado a mano en dos
-- funciones (descontar_stock y registrar_movimiento_stock) a vivir en
-- triggers sobre las tablas donde realmente está el stock. Motivo: el botón
-- "Stock" (ajustarStock) y el campo stock del formulario de edición hacen
-- un UPDATE directo sobre productos.stock_actual y no pasaban por ninguna
-- de las dos, así que esos cambios nunca se empujaban. Un trigger cubre
-- cualquier camino, presente o futuro (mismo patrón que avisar_stock_bajo).

create or replace function public.trg_empujar_stock_productos()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    -- Catálogo compartido: la fila de productos no tiene local_id (el stock
    -- real vive en producto_sucursal, ver trigger de abajo).
    if new.local_id is not null
       and old.stock_actual is distinct from new.stock_actual
    then
        perform public.empujar_stock_tiendanube(new.id, new.local_id, new.stock_actual);
    end if;
    return new;
end;
$function$;

create or replace function public.trg_empujar_stock_producto_sucursal()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if old.stock_actual is distinct from new.stock_actual then
        perform public.empujar_stock_tiendanube(new.producto_id, new.local_id, new.stock_actual);
    end if;
    return new;
end;
$function$;

create trigger trigger_empujar_stock_tiendanube
    after update of stock_actual on public.productos
    for each row execute function public.trg_empujar_stock_productos();

create trigger trigger_empujar_stock_tiendanube
    after update of stock_actual on public.producto_sucursal
    for each row execute function public.trg_empujar_stock_producto_sucursal();

-- Se sacan las llamadas explícitas para no empujar dos veces por el mismo
-- cambio (el trigger de arriba ya las cubre).
create or replace function public.descontar_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if new.producto_id is not null then
        update productos
        set stock_actual = greatest(stock_actual - new.cantidad, 0)
        where id = new.producto_id
          and stock_minimo > 0;
    end if;
    return new;
end;
$function$;

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

    if p_motivo not in ('ingreso', 'ajuste', 'merma', 'devolucion') then
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
