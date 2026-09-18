-- Sincronización de catálogo Vallis -> Tiendanube.
--
-- 1) Mapeo producto Vallis <-> producto/variante Tiendanube (lo llena el
--    sync manual, Edge Function tiendanube-sync-producto).
-- 2) negocios.tiendanube_local_id: qué sucursal es "la" conectada a
--    Tiendanube -- Tiendanube tiene un solo número de stock por producto,
--    no por sucursal, así que hace falta saber cuál manda.
-- 3) empujar_stock_tiendanube(): función fire-and-forget (net.http_post ya
--    es async, mismo patrón que avisar_stock_bajo) que solo toca el stock
--    de la variante en Tiendanube -- nunca nombre/precio/visibility, eso
--    queda exclusivo del sync manual. Se llama desde los dos lugares donde
--    ya se mueve stock: la venta física (descontar_stock) y el ingreso/
--    ajuste de mercadería (registrar_movimiento_stock).

alter table public.productos
    add column tiendanube_producto_id text,
    add column tiendanube_variant_id text;

alter table public.negocios
    add column tiendanube_local_id uuid references public.locales(id);

create or replace function public.empujar_stock_tiendanube(
    p_producto_id uuid,
    p_local_id uuid,
    p_stock_nuevo numeric
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_tn_producto_id text;
    v_tn_variant_id text;
    v_producto_local_id uuid;
    v_producto_negocio_id uuid;
    v_negocio_id uuid;
    v_store_id text;
    v_tn_local_id uuid;
    v_access_token text;
begin
    select tiendanube_producto_id, tiendanube_variant_id, local_id, negocio_id
    into v_tn_producto_id, v_tn_variant_id, v_producto_local_id, v_producto_negocio_id
    from productos
    where id = p_producto_id;

    -- Producto no vinculado a Tiendanube: nada que hacer.
    if v_tn_producto_id is null or v_tn_variant_id is null then
        return;
    end if;

    v_negocio_id := coalesce(
        v_producto_negocio_id,
        (select negocio_id from locales where id = v_producto_local_id)
    );

    select tiendanube_store_id, tiendanube_local_id
    into v_store_id, v_tn_local_id
    from negocios
    where id = v_negocio_id;

    -- Tiendanube no tiene stock por sucursal: solo empujamos si el
    -- movimiento pasó en la sucursal designada como "la" de Tiendanube.
    if v_store_id is null or v_tn_local_id is null or v_tn_local_id <> p_local_id then
        return;
    end if;

    select access_token into v_access_token
    from negocio_tiendanube
    where negocio_id = v_negocio_id;

    if v_access_token is null then
        return;
    end if;

    -- Fire and forget: net.http_post encola la llamada de forma asíncrona,
    -- no espera respuesta ni bloquea/revierte esta transacción si
    -- Tiendanube no responde o devuelve error.
    perform net.http_post(
        url := 'https://api.tiendanube.com/v1/' || v_store_id
            || '/products/' || v_tn_producto_id
            || '/variants/' || v_tn_variant_id,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_access_token,
            'User-Agent', 'Vallis ERP (soporte@vallis.com.ar)'
        ),
        body := jsonb_build_object('stock', p_stock_nuevo)
    );
end;
$function$;

-- Venta física: además de descontar, empuja el stock nuevo si el producto
-- está vinculado y la venta fue en la sucursal conectada a Tiendanube.
create or replace function public.descontar_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_local_id uuid;
    v_stock_nuevo numeric;
begin
    if new.producto_id is not null then
        update productos
        set stock_actual = greatest(stock_actual - new.cantidad, 0)
        where id = new.producto_id
          and stock_minimo > 0
        returning stock_actual into v_stock_nuevo;

        if v_stock_nuevo is not null then
            select local_id into v_local_id from ventas where id = new.venta_id;
            perform public.empujar_stock_tiendanube(new.producto_id, v_local_id, v_stock_nuevo);
        end if;
    end if;
    return new;
end;
$function$;

-- Ingreso/ajuste de mercadería: misma idea, al final de la RPC atómica ya
-- existente (mismo v_stock_nuevo que ya calculó, no se vuelve a leer nada).
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

    perform public.empujar_stock_tiendanube(p_producto_id, p_local_id, v_stock_nuevo);

    return query select v_stock_anterior, v_stock_nuevo, v_movimiento_id;
end;
$function$;
