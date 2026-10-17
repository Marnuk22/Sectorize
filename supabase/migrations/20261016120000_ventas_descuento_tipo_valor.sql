-- Descuento de venta: guardar con qué forma se cargó ($ o %) y el valor tipeado.
--
-- Hasta ahora el POS restaba el descuento del total, pero nunca escribía
-- `ventas.descuento` (quedaba en el DEFAULT 0): la venta no dejaba rastro de
-- cuánto ni de cómo se descontó, y el editor del historial no tenía con qué
-- precargar el campo (por eso recalculaba el total a precio lleno).
--
-- El monto efectivamente aplicado sigue viviendo en `ventas.descuento`
-- (numeric, ya existía). Estas dos columnas guardan el insumo, para poder
-- mostrarlo y volver a editarlo.
--
-- Invariante: ventas.total = Σ detalle_ventas.subtotal − ventas.descuento.
-- Toda la cuenta vive en un solo lugar: src/logic/venta.ts (calcularVenta).
--
-- Aditivas y con DEFAULT, así que el frontend viejo sigue funcionando hasta
-- que se despliegue el nuevo. Aplicar ANTES de deployar el frontend.

alter table public.ventas
    add column descuento_tipo  text    not null default 'monto',
    add column descuento_valor numeric not null default 0;

alter table public.ventas
    add constraint ventas_descuento_tipo_check
        check (descuento_tipo in ('monto', 'porcentaje')),
    add constraint ventas_descuento_valor_check
        check (descuento_valor >= 0);
