-- No se puede retirar más efectivo del que hay en caja.
--
-- El frontend ya valida esto contra el "monto esperado en caja" cacheado en
-- pantalla (ver ModalMovimientoCaja.tsx), pero eso no alcanza contra dos
-- retiros simultáneos leyendo el mismo saldo "antes" — de ahí el trigger acá,
-- que bloquea la fila de `arqueos` (SELECT ... FOR UPDATE) para serializar
-- cualquier retiro concurrente sobre la misma caja antes de sumar el saldo.
create or replace function public.validar_retiro_caja()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    v_disponible numeric;
begin
    if new.tipo = 'retiro' then
        perform 1 from arqueos where id = new.arqueo_id for update;

        select coalesce(sum(case when tipo = 'retiro' then -monto else monto end), 0)
        into v_disponible
        from movimientos_caja
        where arqueo_id = new.arqueo_id;

        if new.monto > v_disponible then
            raise exception 'No hay suficiente efectivo en caja (disponible: %)', v_disponible;
        end if;
    end if;
    return new;
end;
$function$;

create trigger trigger_validar_retiro_caja
before insert on public.movimientos_caja
for each row execute function public.validar_retiro_caja();
