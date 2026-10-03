-- Constancia del consentimiento informado al activar un add-on (Ley 25.326):
-- en facturación, el cliente acepta que Vallis, como titular de la cuenta de
-- Factumono que lo invita, puede ver su CUIT y sus comprobantes. Se guarda
-- cuándo y qué versión del texto aceptó; lo escribe gestionar-addon.
alter table public.negocio_addons
    add column consentimiento_en      timestamptz,
    add column consentimiento_version text,
    add column consentimiento_por     uuid references auth.users(id) on delete set null;
