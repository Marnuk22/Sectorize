import * as XLSX from 'xlsx';
import { labelMetodo } from '../config/metodosPago';
import type { VentaHistorial, DetalleVenta } from '../hooks/useHistorialVentas';

const LABEL_ESTADO: Record<string, string> = {
    abierta: 'Abierta',
    cerrada: 'Cerrada',
    cancelada: 'Cancelada',
};

const FORMATO_FECHA = 'dd/mm/yyyy';
const FORMATO_MONEDA = '#,##0.00';
const FORMATO_CANTIDAD = '#,##0.###';

// Aplica un formato de celda nativo a una columna (0-indexada), filas 1..n
// (la fila 0 es el encabezado que pone json_to_sheet).
const formatearColumna = (ws: XLSX.WorkSheet, col: number, filas: number, formato: string) => {
    for (let r = 1; r <= filas; r++) {
        const ref = XLSX.utils.encode_cell({ r, c: col });
        if (ws[ref]) ws[ref].z = formato;
    }
};

// Genera y descarga un .xlsx con el historial de ventas: una hoja de ventas
// y otra con el detalle de productos vendidos. `detallePorVenta` viene del
// cache de cargarDetalleVenta (useHistorialVentas), no dispara queries nuevas.
export const exportarHistorialAExcel = (
    ventas: VentaHistorial[],
    detallePorVenta: Record<string, DetalleVenta[]>,
) => {
    const filasVentas = ventas.map(v => ({
        'Fecha': v.fecha,
        'Hora': v.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        'Método de pago': labelMetodo(v.metodo_pago),
        'Estado': LABEL_ESTADO[v.estado] ?? v.estado,
        'Descuento': v.descuento,
        'Total': v.total,
        'Modificado': v.editadoEn ?? '',
    }));

    const filasDetalle: Record<string, string | number | Date>[] = [];
    for (const venta of ventas) {
        const items: DetalleVenta[] = detallePorVenta[venta.id] ?? [];
        for (const item of items) {
            filasDetalle.push({
                'Fecha de venta': venta.fecha,
                'Producto': item.nombre,
                'Cantidad': item.cantidad,
                'Precio unitario': item.precio,
                'Subtotal': item.subtotal,
            });
        }
    }

    const wsVentas = XLSX.utils.json_to_sheet(filasVentas);
    wsVentas['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    formatearColumna(wsVentas, 0, filasVentas.length, FORMATO_FECHA);   // Fecha
    formatearColumna(wsVentas, 4, filasVentas.length, FORMATO_MONEDA);  // Descuento
    formatearColumna(wsVentas, 5, filasVentas.length, FORMATO_MONEDA);  // Total
    formatearColumna(wsVentas, 6, filasVentas.length, FORMATO_FECHA);   // Modificado

    const wsDetalle = XLSX.utils.json_to_sheet(filasDetalle);
    wsDetalle['!cols'] = [
        { wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
    ];
    formatearColumna(wsDetalle, 0, filasDetalle.length, FORMATO_FECHA);    // Fecha de venta
    formatearColumna(wsDetalle, 2, filasDetalle.length, FORMATO_CANTIDAD); // Cantidad
    formatearColumna(wsDetalle, 3, filasDetalle.length, FORMATO_MONEDA);   // Precio unitario
    formatearColumna(wsDetalle, 4, filasDetalle.length, FORMATO_MONEDA);   // Subtotal

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, wsVentas, 'Ventas');
    XLSX.utils.book_append_sheet(libro, wsDetalle, 'Detalle');

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `ventas-vallis-${fechaArchivo}.xlsx`);
};
