-- Mantenimiento: valida los CHECK y FOREIGN KEY que quedaron en NOT VALID.
--
-- NOT VALID no significa "sin aplicar" — Postgres ya exige estas reglas en
-- cada INSERT/UPDATE desde que se creó cada constraint. Lo único que falta
-- es el escaneo de una sola vez contra las filas que ya existían en ese
-- momento, para confirmar que ninguna las viola. VALIDATE CONSTRAINT es de
-- solo lectura (un SELECT bajo el capó) y no bloquea escrituras concurrentes
-- como sí lo haría recrear el constraint de cero.
--
-- Si alguno de estos statements fallara, no es un error de esta migración:
-- significa que encontramos datos viejos que efectivamente violan la regla,
-- y hay que decidir caso por caso qué hacer con esas filas.

-- CHECK
alter table public.arqueos validate constraint arqueos_estado_check;
alter table public.clases validate constraint clases_dia_semana_check;
alter table public.detalle_ventas validate constraint detalle_ventas_cantidad_check;
alter table public.detalle_ventas validate constraint detalle_ventas_precio_unitario_check;
alter table public.locales validate constraint slug_formato;
alter table public.membresias validate constraint membresias_tipo_check;
alter table public.mesas validate constraint mesas_estado_check;
alter table public.perfiles validate constraint perfiles_rol_check;
alter table public.productos validate constraint productos_local_o_negocio;
alter table public.productos validate constraint productos_precio_costo_check;
alter table public.productos validate constraint productos_precio_venta_check;
alter table public.productos validate constraint tipo_venta_valido;
alter table public.productos validate constraint unidad_medida_valida;
alter table public.sectores validate constraint sectores_estado_check;
alter table public.suscripciones validate constraint suscripciones_estado_check;
alter table public.ventas validate constraint ventas_descuento_check;
alter table public.ventas validate constraint ventas_estado_check;
alter table public.ventas validate constraint ventas_total_check;

-- FOREIGN KEY
alter table public.arqueos validate constraint arqueos_local_id_fkey;
alter table public.arqueos validate constraint arqueos_usuario_id_fkey;
alter table public.asistencias validate constraint asistencias_clase_id_fkey;
alter table public.asistencias validate constraint asistencias_local_id_fkey;
alter table public.asistencias validate constraint asistencias_socio_id_fkey;
alter table public.categorias validate constraint categorias_local_id_fkey;
alter table public.clases validate constraint clases_local_id_fkey;
alter table public.detalle_ventas validate constraint detalle_ventas_producto_id_fkey;
alter table public.detalle_ventas validate constraint detalle_ventas_venta_id_fkey;
alter table public.impresoras validate constraint impresoras_local_id_fkey;
alter table public.locales validate constraint locales_negocio_id_fkey;
alter table public.membresias validate constraint membresias_local_id_fkey;
alter table public.mesas validate constraint mesas_local_id_fkey;
alter table public.mesas validate constraint mesas_sector_id_fkey;
alter table public.negocios validate constraint "negocios_dueño_id_fkey";
alter table public.perfiles validate constraint perfiles_id_fkey;
alter table public.perfiles validate constraint perfiles_local_id_fkey;
alter table public.perfiles validate constraint perfiles_negocio_id_fkey;
alter table public.producto_sucursal validate constraint producto_sucursal_local_id_fkey;
alter table public.producto_sucursal validate constraint producto_sucursal_producto_id_fkey;
alter table public.productos validate constraint productos_local_id_fkey;
alter table public.productos validate constraint productos_negocio_id_fkey;
alter table public.sectores validate constraint sectores_local_id_fkey;
alter table public.socios validate constraint socios_local_id_fkey;
alter table public.suscripciones validate constraint suscripciones_local_id_fkey;
alter table public.suscripciones validate constraint suscripciones_membresia_id_fkey;
alter table public.suscripciones validate constraint suscripciones_socio_id_fkey;
alter table public.suscripciones validate constraint suscripciones_venta_id_fkey;
alter table public.ventas validate constraint ventas_arqueo_id_fkey;
alter table public.ventas validate constraint ventas_local_id_fkey;
alter table public.ventas validate constraint ventas_sector_id_fkey;
alter table public.ventas validate constraint ventas_usuario_id_fkey;
