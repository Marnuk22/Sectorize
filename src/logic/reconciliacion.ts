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
            // Una sola RPC, atómica e idempotente (ver la migración
            // registrar_venta_offline): la venta y su detalle entran juntos o
            // no entra nada, y reintentar con el mismo id nunca duplica ni
            // deja la venta a medias. Antes eran dos inserts sueltos: si
            // fallaba el de detalle_ventas, el reintento chocaba con la PK de
            // ventas y el trigger descontar_stock no corría nunca (venta y
            // arqueo quedaban mal para siempre).
            //
            // El descuento viaja ya calculado (venta.total / venta.descuento,
            // de calcularVenta al momento de la venta): acá NO se recalcula,
            // así una venta encolada se sube por exactamente lo que se cobró
            // aunque después cambien el redondeo o el clamp.
            const { error } = await supabase.rpc('registrar_venta_offline', {
                p_id: venta.id,
                p_local_id: venta.localId,
                p_usuario_id: venta.usuarioId,
                p_arqueo_id: venta.arqueoId,
                p_total: venta.total,
                p_descuento: venta.descuento?.monto ?? 0,
                p_descuento_tipo: venta.descuento?.tipo ?? 'monto',
                p_descuento_valor: venta.descuento?.valor ?? 0,
                p_metodo_pago: venta.metodoPago,
                p_fecha: venta.fecha,
                p_items: venta.items.map(item => ({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    producto_id: (item as any).esProductoInventario === false ? null : item.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                })),
            });
            if (error) throw error;

            await quitarVentaDeCola(venta.id);
            ok++;
        } catch (err) {
            console.error(`No se pudo reconciliar la venta ${venta.id}:`, err);
            fallidas++;
        }
    }

    return { ok, fallidas };
};
