-- CUIT del emisor de la sucursal (para facturar: se manda como taxId al
-- link de Factumono, así abre siempre con el CUIT correcto y no con
-- cualquiera de los que tenga la cuenta). Va en locales y no en negocios
-- porque las sucursales podrían facturar con CUIT distintos, y porque
-- AuthContext.actualizarLocal ya existe con su RLS de "editar locales".
-- Solo dígitos; el dígito verificador se valida en el frontend.
alter table public.locales
    add column cuit text;

alter table public.locales
    add constraint locales_cuit_formato check (cuit is null or cuit ~ '^[0-9]{11}$');
