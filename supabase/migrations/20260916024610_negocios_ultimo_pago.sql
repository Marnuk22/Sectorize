-- Botón de Arrepentimiento (Resolución 424/2020) — necesita saber cuál fue
-- el último pago aprobado de la suscripción y cuándo, para poder reembolsarlo
-- (POST /v1/payments/{id}/refunds) dentro de la ventana legal de 10 días.
--
-- ultimo_pago_reembolsado es una capa extra de seguridad: MercadoPago ya
-- rechaza un segundo reembolso sobre el mismo pago (confirmado en sandbox,
-- 400 bad_request), pero esto evita el intento y da un mensaje claro en
-- español en vez del error crudo de la API.
alter table public.negocios
    add column ultimo_pago_id text,
    add column ultimo_pago_fecha timestamptz,
    add column ultimo_pago_reembolsado boolean not null default false;
