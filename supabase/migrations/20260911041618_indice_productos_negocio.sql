-- Faltaba índice en productos.negocio_id — es el campo que usa MenuContext.tsx
-- para traer el catálogo compartido en negocios de 2+ sucursales
-- (`WHERE negocio_id = X`), y hoy solo había índice en local_id (camino
-- directo). Sin esto esa consulta hace seq scan a medida que crece el
-- catálogo. No cambia comportamiento, solo performance.
create index idx_productos_negocio on public.productos using btree (negocio_id);
