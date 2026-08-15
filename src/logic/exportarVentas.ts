import * as XLSX from 'xlsx';
import { labelMetodo } from '../config/metodosPago';
import { UNIDADES, type UnidadMedida } from '../config/unidades';
import type { VentaHistorial, DetalleVenta } from '../hooks/useHistorialVentas';

const LABEL_ESTADO: Record<string, string> = {
    abierta: 'Abierta',
    cerrada: 'Cerrada',
    cancelada: 'Cancelada',
};

const FORMATO_FECHA = 'dd/mm/yyyy';
const FORMATO_MONEDA = '#,##0.00';
const FORMATO_CANTIDAD = '#,##0.###';
const FORMATO_PORCENTAJE = '0.0%';

// Aplica un formato de celda nativo a una columna (0-indexada), filas 1..n
// (la fila 0 es el encabezado que pone json_to_sheet).
const formatearColumna = (ws: XLSX.WorkSheet, col: number, filas: number, formato: string) => {
    for (let r = 1; r <= filas; r++) {
        const ref = XLSX.utils.encode_cell({ r, c: col });
        if (ws[ref]) ws[ref].z = formato;
    }
};

// Aplica un formato de celda nativo a una celda puntual (ref tipo "B2").
const formatearCelda = (ws: XLSX.WorkSheet, ref: string, formato: string) => {
    if (ws[ref]) ws[ref].z = formato;
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

export interface ResumenInforme {
    desde: string; // YYYY-MM-DD
    hasta: string; // YYYY-MM-DD
    totalVendido: number;
    cantidadVentas: number;
    ticketPromedio: number;
}

export interface FilaVentaPorDia {
    fecha: string; // YYYY-MM-DD
    total: number;
}

export interface FilaRankingProducto {
    nombre: string;
    cantidad: number;
    unidadMedida: UnidadMedida;
    subtotal: number;
}

export interface FilaPorMetodo {
    metodo: string;
    total: number;
}

const fechaLocal = (ymd: string) => new Date(`${ymd}T00:00:00`);

// Genera y descarga un .xlsx con el contenido del informe: resumen del
// período, ventas por día, ranking de productos y desglose por método de
// pago — el mismo contenido agregado que muestra la pantalla, no las ventas
// crudas (eso es lo que ya hace exportarHistorialAExcel).
export const exportarInformeAExcel = (datos: {
    resumen: ResumenInforme;
    ventasPorDia: FilaVentaPorDia[];
    ranking: FilaRankingProducto[];
    porMetodo: FilaPorMetodo[];
}) => {
    const { resumen, ventasPorDia, ranking, porMetodo } = datos;

    // Resumen: tabla chica de dato/valor en vez de json_to_sheet (no es una
    // lista de registros uniformes).
    const filasResumen: (string | number | Date)[][] = [
        ['Dato', 'Valor'],
        ['Desde', fechaLocal(resumen.desde)],
        ['Hasta', fechaLocal(resumen.hasta)],
        ['Total vendido', resumen.totalVendido],
        ['Cantidad de ventas', resumen.cantidadVentas],
        ['Ticket promedio', resumen.ticketPromedio],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(filasResumen);
    wsResumen['!cols'] = [{ wch: 20 }, { wch: 16 }];
    formatearCelda(wsResumen, 'B2', FORMATO_FECHA);
    formatearCelda(wsResumen, 'B3', FORMATO_FECHA);
    formatearCelda(wsResumen, 'B4', FORMATO_MONEDA);
    formatearCelda(wsResumen, 'B6', FORMATO_MONEDA);

    const filasDia = ventasPorDia.map(d => ({ 'Fecha': fechaLocal(d.fecha), 'Total': d.total }));
    const wsDia = XLSX.utils.json_to_sheet(filasDia);
    wsDia['!cols'] = [{ wch: 12 }, { wch: 14 }];
    formatearColumna(wsDia, 0, filasDia.length, FORMATO_FECHA);
    formatearColumna(wsDia, 1, filasDia.length, FORMATO_MONEDA);

    const filasRanking = ranking.map(r => ({
        'Producto': r.nombre,
        'Cantidad': r.cantidad,
        'Unidad': UNIDADES[r.unidadMedida]?.label ?? r.unidadMedida,
        'Total facturado': r.subtotal,
        '% del total': resumen.totalVendido > 0 ? r.subtotal / resumen.totalVendido : 0,
    }));
    const wsRanking = XLSX.utils.json_to_sheet(filasRanking);
    wsRanking['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 }];
    formatearColumna(wsRanking, 1, filasRanking.length, FORMATO_CANTIDAD);
    formatearColumna(wsRanking, 3, filasRanking.length, FORMATO_MONEDA);
    formatearColumna(wsRanking, 4, filasRanking.length, FORMATO_PORCENTAJE);

    const filasMetodo = porMetodo.map(m => ({
        'Método de pago': labelMetodo(m.metodo),
        'Total': m.total,
        '% del total': resumen.totalVendido > 0 ? m.total / resumen.totalVendido : 0,
    }));
    const wsMetodo = XLSX.utils.json_to_sheet(filasMetodo);
    wsMetodo['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 12 }];
    formatearColumna(wsMetodo, 1, filasMetodo.length, FORMATO_MONEDA);
    formatearColumna(wsMetodo, 2, filasMetodo.length, FORMATO_PORCENTAJE);

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, wsResumen, 'Resumen');
    XLSX.utils.book_append_sheet(libro, wsDia, 'Ventas por día');
    XLSX.utils.book_append_sheet(libro, wsRanking, 'Ranking productos');
    XLSX.utils.book_append_sheet(libro, wsMetodo, 'Por método de pago');

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `informe-vallis-${fechaArchivo}.xlsx`);
};
