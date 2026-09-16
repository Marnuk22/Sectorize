// src/logic/reconciliacion.ts
//
// Etapa 4 del modo offline: procesa la cola de ventas encoladas (Etapa 3)
// contra Supabase, se dispara al volver la conexión (ver
// useReconciliacionOffline). Secuencial, no Promise.all — mismo patrón que
// ModalImportar/ModalIngresoMercaderia: si una venta falla no bloquea el
// resto, y la que falla queda en la cola para revisión manual (panel
// dedicado: fuera de alcance de esta etapa, ver ROADMAP "Etapa 4.2").
import { supabase } from '../lib/supabase';
import { leerColaVentas, quitarVentaDeCola } from './colaVentas';

export interface ResultadoReconciliacion {
    ok: number;
    fallidas: number;
}

export const reconciliarVentas = async (): Promise<ResultadoReconciliacion> => {
    const cola = await leerColaVentas();
    // FIFO real: IndexedDB no garantiza orden de inserción con id tipo UUID,
    // hay que ordenar a mano por la fecha real de la venta.
    const ordenada = [...cola].sort((a, b) => a.fecha.localeCompare(b.fecha));

    let ok = 0;
    let fallidas = 0;

    for (const venta of ordenada) {
        try {
            // id y fecha explícitos: el mismo id generado offline (así un
            // reintento futuro nunca puede duplicar la venta — si el insert
            // de detalle_ventas de abajo llegara a fallar, el próximo intento
            // choca con unique constraint en vez de crear una venta gemela)
            // y la fecha real de cuando ocurrió, no la de sincronización.
            const { error: errorVenta } = await supabase
                .from('ventas')
                .insert({
                    id: venta.id,
                    local_id: venta.localId,
                    usuario_id: venta.usuarioId,
                    arqueo_id: venta.arqueoId,
                    sector_id: null,
                    total: venta.total,
                    metodo_pago: venta.metodoPago,
                    estado: 'cerrada',
                    fecha: venta.fecha,
                });
            if (errorVenta) throw errorVenta;

            const { error: errorDetalle } = await supabase
                .from('detalle_ventas')
                .insert(venta.items.map(item => ({
                    venta_id: venta.id,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    producto_id: (item as any).esProductoInventario === false ? null : item.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                })));
            if (errorDetalle) throw errorDetalle;

            await quitarVentaDeCola(venta.id);
            ok++;
        } catch (err) {
            console.error(`No se pudo reconciliar la venta ${venta.id}:`, err);
            fallidas++;
        }
    }

    return { ok, fallidas };
};
