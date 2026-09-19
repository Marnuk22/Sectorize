-- Corrige empujar_stock_tiendanube: la versión anterior armaba la llamada
-- como un PUT a /products/{id}/variants/{variant_id}, pero pg_net solo
-- tiene http_post (no existe http_put) — el POST a esa ruta devolvía 404
-- Not Found en cada intento.
--
-- Tiendanube tiene un endpoint de stock que sí usa POST y toca SOLO stock:
-- POST /products/{product_id}/variants/stock con
-- {"action": "replace", "value": N, "id": <variant_id>}.
-- ("id" es opcional según la doc; se manda igual para no pisar el stock de
-- otras variantes si el comercio agrega alguna a mano en Tiendanube. La doc
-- no muestra un ejemplo de "replace" junto con "id" — si Tiendanube lo
-- rechaza con 422, sacar "id" de acá.)
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

    if v_store_id is null or v_tn_local_id is null or v_tn_local_id <> p_local_id then
        return;
    end if;

    select access_token into v_access_token
    from negocio_tiendanube
    where negocio_id = v_negocio_id;

    if v_access_token is null then
        return;
    end if;

    perform net.http_post(
        url := 'https://api.tiendanube.com/v1/' || v_store_id
            || '/products/' || v_tn_producto_id
            || '/variants/stock',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_access_token,
            'User-Agent', 'Vallis ERP (soporte@vallis.com.ar)'
        ),
        body := jsonb_build_object(
            'action', 'replace',
            'value', round(p_stock_nuevo)::int,
            'id', v_tn_variant_id::bigint
        )
    );
end;
$function$;
