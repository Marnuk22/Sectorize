-- Los locales nuevos arrancan con débito y crédito separados en vez de
-- 'tarjeta' (Factumono necesita la condición de venta exacta). Los locales
-- existentes no se tocan: el dueño lo cambia desde Configuración.
alter table locales
    alter column metodos_pago set default array['efectivo', 'debito', 'credito', 'transferencia']::text[];
