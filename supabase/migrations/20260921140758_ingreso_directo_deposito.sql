-- Carga de stock DIRECTA en un depósito (mercadería que llegó ahí, no vino
-- de una sucursal) — a diferencia de transferir_stock, esto no toca ningún
-- stock de sucursal. Atómico (INSERT/UPDATE server-side, no un upsert desde
-- el cliente con el valor final ya calculado, que perdería una suma si dos
-- ingresos llegan al mismo tiempo).
create or replace function public.ingresar_stock_deposito(
    p_tipo text,
    p_item_id uuid,
    p_deposito_id uuid,
    p_cantidad numeric
)
returns numeric
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
    v_stock_nuevo numeric;
begin
    if p_cantidad <= 0 then
        raise exception 'La cantidad debe ser mayor a cero';
    end if;

    if p_tipo = 'producto' then
        insert into producto_deposito (producto_id, deposito_id, stock_actual)
        values (p_item_id, p_deposito_id, p_cantidad)
        on conflict (producto_id, deposito_id)
        do update set stock_actual = producto_deposito.stock_actual + p_cantidad
        returning stock_actual into v_stock_nuevo;

    elsif p_tipo = 'ingrediente' then
        insert into ingrediente_deposito (ingrediente_id, deposito_id, stock_actual)
        values (p_item_id, p_deposito_id, p_cantidad)
        on conflict (ingrediente_id, deposito_id)
        do update set stock_actual = ingrediente_deposito.stock_actual + p_cantidad
        returning stock_actual into v_stock_nuevo;

    else
        raise exception 'Tipo inválido: %', p_tipo;
    end if;

    return v_stock_nuevo;
end;
$function$;
