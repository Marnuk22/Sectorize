-- Corrige escalación de privilegios en handle_new_user()
--
-- handle_new_user() confiaba ciegamente en raw_user_meta_data->>'local_id'
-- y raw_user_meta_data->>'rol', que vienen de options.data en
-- supabase.auth.signUp() del lado del cliente, sin ninguna validación
-- server-side. Cualquiera podía registrarse pasando el local_id de un
-- negocio ajeno y rol: 'empleado' (o 'encargado'), y las funciones
-- sucursales_del_usuario()/sucursales_gestionables() le daban acceso real
-- de lectura y escritura sobre ese local (ventas, stock, arqueos, socios).
--
-- Fix: todo usuario nuevo se crea SIEMPRE con local_id = NULL y
-- rol = 'empleado' fijo, sin acceso a ningún local hasta que se le asigne
-- explícitamente por un camino server-side confiable (ver nota en
-- CLAUDE.md/ROADMAP sobre el flujo de invitación pendiente de diseñar).
-- nombre_usuario se sigue tomando del metadata/email: no tiene ninguna
-- implicancia de seguridad, es solo un nombre para mostrar.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.perfiles (id, local_id, nombre_usuario, rol)
  VALUES (
    NEW.id,
    NULL,
    COALESCE(NEW.raw_user_meta_data->>'nombre_usuario', split_part(NEW.email, '@', 1)),
    'empleado'
  );
  RETURN NEW;
END;
$function$;
