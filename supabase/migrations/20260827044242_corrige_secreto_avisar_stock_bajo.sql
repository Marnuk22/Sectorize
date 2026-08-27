-- Saca el secreto de x-vallis-secret del código fuente de avisar_stock_bajo()
--
-- El valor viejo de x-vallis-secret estaba escrito en texto plano dentro del
-- cuerpo de la función (visible en cualquier pg_dump/exportación del schema).
-- Ese valor puntual ya estaba rotado; este cambio además corrige el patrón
-- de fondo: a partir de ahora el secreto se guarda cifrado en Supabase Vault
-- y la función lo lee en tiempo de ejecución vía vault.decrypted_secrets, en
-- vez de tenerlo hardcodeado.
--
-- El secreto en sí (nombre 'vallis_stock_alert_secret' en vault) se crea
-- aparte, fuera de esta migración versionada, para no dejar el valor en
-- texto plano en el repo. La Edge Function alerta-stock valida contra el
-- mismo valor, leído de la variable de entorno ALERTA_STOCK_SECRET.

CREATE OR REPLACE FUNCTION public.avisar_stock_bajo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_secret text;
begin
    if new.stock_minimo > 0
       and old.stock_actual > old.stock_minimo
       and new.stock_actual <= new.stock_minimo
    then
        update productos set alerta_enviada = true where id = new.id;

        select decrypted_secret into v_secret
        from vault.decrypted_secrets
        where name = 'vallis_stock_alert_secret';

        perform net.http_post(
            url := 'https://wlrwfkhjucomitgoryqu.supabase.co/functions/v1/alerta-stock',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indscndma2hqdWNvbWl0Z29yeXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDMyOTEsImV4cCI6MjA5MzUxOTI5MX0.5nvlaYzX9_dCalB3IQvTN_se0hr0xrwagfmeqZ03Tf0',
                'x-vallis-secret', v_secret
            ),
            body := jsonb_build_object('producto_id', new.id)
        );
    elsif new.stock_minimo > 0
       and old.stock_actual <= old.stock_minimo
       and new.stock_actual > new.stock_minimo
    then
        update productos set alerta_enviada = false where id = new.id;
    end if;
    return new;
end;
$function$;
