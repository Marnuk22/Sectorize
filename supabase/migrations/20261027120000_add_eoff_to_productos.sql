-- Agrega flag `eoff` a productos: indica si el producto existe en Open Food Facts.
-- Se usa en Venta rápida para distinguir productos traídos de OFF de los creados
-- a mano (sin datos de OFF). Valor default: false.
alter table public.productos
    add column if not exists eoff boolean default false not null;
