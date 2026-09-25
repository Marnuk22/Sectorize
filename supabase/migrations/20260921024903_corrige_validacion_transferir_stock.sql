-- transferir_stock no validaba que el origen tuviera stock suficiente antes
-- de mover: registrar_movimiento_stock/registrar_movimiento_ingrediente
-- flotan en 0 en vez de fallar (mismo criterio que una merma), así que una
-- transferencia más grande de lo disponible sumaba igual el total del otro
-- lado y solo vaciaba el origen a 0 — creaba stock de la nada. Ahora se
-- chequea el origen antes de aplicar cualquiera de los dos lados.
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
    v_stock_local numeric;
    v_stock_deposito numeric;
    v_es_compartido boolean;
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
        select exists (
            select 1 from producto_sucursal where producto_id = p_item_id and local_id = p_local_id
        ) into v_es_compartido;

        if v_es_compartido then
            select stock_actual into v_stock_local from producto_sucursal where producto_id = p_item_id and local_id = p_local_id;
        else
            select stock_actual into v_stock_local from productos where id = p_item_id and local_id = p_local_id;
        end if;

        select coalesce(stock_actual, 0) into v_stock_deposito from producto_deposito where producto_id = p_item_id and deposito_id = p_deposito_id;
        v_stock_deposito := coalesce(v_stock_deposito, 0);

        if p_direccion = 'a_deposito' and coalesce(v_stock_local, 0) < p_cantidad then
            raise exception 'No hay suficiente stock en la sucursal para transferir';
        end if;
        if p_direccion = 'a_sucursal' and v_stock_deposito < p_cantidad then
            raise exception 'No hay suficiente stock en el depósito para transferir';
        end if;

        perform public.registrar_movimiento_stock(
            p_item_id, p_local_id, v_signo_local * p_cantidad, 'transferencia', null,
            'Transferencia con depósito'
        );

        insert into producto_deposito (producto_id, deposito_id, stock_actual)
        values (p_item_id, p_deposito_id, greatest(v_signo_deposito * p_cantidad, 0))
        on conflict (producto_id, deposito_id)
        do update set stock_actual = greatest(producto_deposito.stock_actual + v_signo_deposito * p_cantidad, 0);

    elsif p_tipo = 'ingrediente' then
        select stock_actual into v_stock_local from ingredientes where id = p_item_id and local_id = p_local_id;

        select coalesce(stock_actual, 0) into v_stock_deposito from ingrediente_deposito where ingrediente_id = p_item_id and deposito_id = p_deposito_id;
        v_stock_deposito := coalesce(v_stock_deposito, 0);

        if p_direccion = 'a_deposito' and coalesce(v_stock_local, 0) < p_cantidad then
            raise exception 'No hay suficiente stock en la sucursal para transferir';
        end if;
        if p_direccion = 'a_sucursal' and v_stock_deposito < p_cantidad then
            raise exception 'No hay suficiente stock en el depósito para transferir';
        end if;

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
