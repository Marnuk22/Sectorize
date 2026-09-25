-- Dos bugs preexistentes encontrados al probar el catálogo compartido con
-- la integración de Tiendanube (no relacionados a Tiendanube en sí):
--
-- 1) descontar_stock() (venta física) solo tocaba productos.stock_actual,
--    nunca producto_sucursal — en un negocio de catálogo compartido, una
--    venta física no descontaba el stock real (el que se ve en Inventario).
-- 2) agregar_sucursal() creaba la fila de producto_sucursal de la sucursal
--    nueva con stock_minimo=0 fijo, en vez de copiar el valor real del
--    producto — la sucursal nueva siempre nacía sin seguimiento de stock,
--    sin importar cómo estuviera configurado el producto.

create or replace function public.descontar_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_local_id uuid;
    v_es_compartido boolean;
begin
    if new.producto_id is not null then
        select local_id into v_local_id from ventas where id = new.venta_id;

        select exists (
            select 1 from producto_sucursal
            where producto_id = new.producto_id and local_id = v_local_id
        ) into v_es_compartido;

        if v_es_compartido then
            update producto_sucursal
            set stock_actual = greatest(stock_actual - new.cantidad, 0)
            where producto_id = new.producto_id
              and local_id = v_local_id
              and stock_minimo > 0;
        else
            update productos
            set stock_actual = greatest(stock_actual - new.cantidad, 0)
            where id = new.producto_id
              and stock_minimo > 0;
        end if;
    end if;
    return new;
end;
$function$;

create or replace function public.agregar_sucursal(p_nombre text) returns uuid
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
    v_negocio_id uuid;
    v_local_id uuid;
    v_modulos text[];
    v_plan text;
    v_sucursales_previas int;
    r_producto record;
begin
    select p.negocio_id into v_negocio_id
    from perfiles p where p.id = auth.uid() and p.rol = 'dueño';

    if v_negocio_id is null then
        raise exception 'Solo el dueño puede agregar sucursales';
    end if;

    select count(*) into v_sucursales_previas from locales where negocio_id = v_negocio_id;

    select modulos, plan into v_modulos, v_plan
    from locales where negocio_id = v_negocio_id limit 1;

    insert into locales (nombre, negocio_id, modulos, plan)
    values (p_nombre, v_negocio_id, v_modulos, v_plan)
    returning id into v_local_id;

    if v_sucursales_previas = 1 then
        for r_producto in
            select * from productos where local_id in (select id from locales where negocio_id = v_negocio_id)
        loop
            insert into producto_sucursal (producto_id, local_id, stock_actual, stock_minimo, precio_venta, precio_costo)
            values (r_producto.id, r_producto.local_id, r_producto.stock_actual, r_producto.stock_minimo, r_producto.precio_venta, r_producto.precio_costo);

            insert into producto_sucursal (producto_id, local_id, stock_actual, stock_minimo, precio_venta, precio_costo)
            values (r_producto.id, v_local_id, 0, r_producto.stock_minimo, r_producto.precio_venta, r_producto.precio_costo);

            update productos set negocio_id = v_negocio_id, local_id = null where id = r_producto.id;
        end loop;
    elsif v_sucursales_previas > 1 then
        insert into producto_sucursal (producto_id, local_id, stock_actual, stock_minimo, precio_venta, precio_costo)
        select id, v_local_id, 0, stock_minimo, precio_venta, precio_costo
        from productos where negocio_id = v_negocio_id;
    end if;

    return v_local_id;
end;
$$;

-- Corrige el dato que ya quedó mal cargado en la prueba de esta sesión.
update producto_sucursal
set stock_minimo = 5
where producto_id = '3975ac67-6b6f-4a78-bf50-bbfbeddaaa84'
  and local_id = '1e7e737c-a137-40ec-8778-7262483f9022';
