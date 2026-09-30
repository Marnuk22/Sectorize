-- Prende/apaga un módulo en TODAS las sucursales de un negocio en una sola
-- sentencia (array_append/array_remove en la base), en vez de leer la lista
-- en JS y reescribirla entera: así un toggle concurrente no pisa al otro.
-- Solo para Edge Functions (service role): hoy la usan gestionar-addon y
-- confirmar-invitacion-addon para el add-on de facturación.
create or replace function public.set_modulo_negocio(p_negocio_id uuid, p_modulo text, p_activo boolean)
returns void
language sql
security definer
set search_path = public
as $$
    update locales
    set modulos = case
        when p_activo then array_append(array_remove(coalesce(modulos, '{}'), p_modulo), p_modulo)
        else array_remove(coalesce(modulos, '{}'), p_modulo)
    end
    where negocio_id = p_negocio_id;
$$;

revoke execute on function public.set_modulo_negocio(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_modulo_negocio(uuid, text, boolean) to service_role;
