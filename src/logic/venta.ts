// src/logic/venta.ts
//
// Único lugar donde se calcula la plata de una venta.
//
// Antes la cuenta estaba repetida en ContenedorMostrador, CierreDeMesa y
// useHistorialVentas, y registrarVenta confiaba en el `total` que le pasaba
// el componente. De ahí salieron los dos bugs: en el salón el descuento
// nunca llegaba a la base (se guardaba el total lleno) y en el mostrador el
// total viajaba descontado pero `ventas.descuento` quedaba en 0, así que el
// editor del historial recalculaba el total a precio lleno y borraba el
// descuento.
//
// Invariante que sostiene esto, en todos los caminos de escritura (online,
// cola offline y reconciliación):
//     ventas.total = Σ detalle_ventas.subtotal − ventas.descuento
// con ventas.descuento = descuentoMonto.
import type { DescuentoAplicado, DescuentoVenta } from '../types';

// Mínimo común entre ItemPedidoUI (carrito/mostrador/mesa) y el detalle del
// historial: para calcular solo hacen falta precio y cantidad.
interface ItemCalculable {
    precio: number;
    cantidad: number;
}

export const SIN_DESCUENTO: DescuentoVenta = { tipo: 'monto', valor: 0 };

// Descuento en pesos sobre un subtotal ya calculado. El redondeo del
// porcentaje y el clamp a [0, subtotal] viven acá y en ningún otro lado: si
// el usuario tipea un descuento mayor al total, se aplica el total y el
// `valor` guardado sigue siendo lo que tipeó.
export const calcularDescuento = (subtotal: number, descuento: DescuentoVenta): DescuentoAplicado => {
    const bruto = descuento.tipo === 'porcentaje'
        ? Math.round(subtotal * (descuento.valor / 100))
        : descuento.valor;
    const monto = Math.min(Math.max(bruto, 0), subtotal);
    return { tipo: descuento.tipo, valor: descuento.valor, monto };
};

// Subtotal de los ítems + descuento aplicado + total a cobrar.
export const calcularVenta = (items: ItemCalculable[], descuento: DescuentoVenta) => {
    const subtotal = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const { monto: descuentoMonto } = calcularDescuento(subtotal, descuento);
    return { subtotal, descuentoMonto, total: subtotal - descuentoMonto };
};
