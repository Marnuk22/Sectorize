-- La unique de codigo_barras era GLOBAL a toda la tabla `productos` (sin
-- scope por tenant): dos negocios sin ninguna relación entre sí no podían
-- cargar el mismo código de barras real de fábrica (ej. el EAN-13 de una
-- Coca-Cola 500ml), aunque RLS los aísla en todo lo demás. Probablemente
-- quedó así de antes del modelo multi-negocio y nunca se revisó.
--
-- Reemplazo por DOS unique parciales, uno por cada modo en que puede vivir
-- un producto (`productos.local_id` y `productos.negocio_id` son
-- mutuamente excluyentes, ver CLAUDE.md):
--   - Modo directo (negocio de 1 sola sucursal): único por local_id.
--   - Modo compartido (negocio de 2+ sucursales, catálogo compartido):
--     único por negocio_id (no por local_id, que en este modo siempre es
--     NULL en la fila de `productos` — el stock por sucursal vive en
--     `producto_sucursal`, pero el código de barras es del producto
--     compartido, no de la sucursal).
--
-- Solo cambia la restricción, ninguna fila existente se modifica. Es seguro
-- sin limpiar datos antes: la unique global anterior ya garantizaba que no
-- existen duplicados hoy dentro de ningún scope más chico.
alter table public.productos drop constraint productos_codigo_barras_key;

create unique index productos_codigo_barras_local_key
    on public.productos (local_id, codigo_barras)
    where local_id is not null and codigo_barras is not null;

create unique index productos_codigo_barras_negocio_key
    on public.productos (negocio_id, codigo_barras)
    where negocio_id is not null and codigo_barras is not null;
