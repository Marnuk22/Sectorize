import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { MovimientoStockUI } from '../types';

// Historial de movimientos de stock (kardex) de un producto puntual — a
// diferencia de `productos` en MenuContext, esto no es estado compartido de
// la app, se consulta on-demand solo cuando se abre el panel de un producto.
export const useKardexProducto = (productoId: string | null) => {
    const [movimientos, setMovimientos] = useState<MovimientoStockUI[]>([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        let activo = true;

        const cargar = async () => {
            if (!productoId) { setMovimientos([]); return; }
            setCargando(true);

            const { data } = await supabase
                .from('movimientos_stock')
                .select('*')
                .eq('producto_id', productoId)
                .order('creado_at', { ascending: false });

            if (!activo) return;
            setMovimientos((data ?? []).map(m => ({
                id: m.id,
                cantidad: m.cantidad,
                motivo: m.motivo,
                costoUnitario: m.costo_unitario,
                nota: m.nota,
                fecha: new Date(m.creado_at),
            })));
            setCargando(false);
        };

        cargar();
        return () => { activo = false; };
    }, [productoId]);

    return { movimientos, cargando };
};
