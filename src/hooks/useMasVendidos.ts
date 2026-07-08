import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Devuelve los IDs de los productos más vendidos del último mes, ordenados
export const useMasVendidos = (limite = 5) => {
    const { localId } = useAuth();
    const [masVendidos, setMasVendidos] = useState<string[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;

        const calcular = async () => {
            if (!localId) { setCargando(false); return; }
            setCargando(true);

            // Fecha de hace 30 días
            const hace30dias = new Date();
            hace30dias.setDate(hace30dias.getDate() - 30);

            // 1. Traer las ventas del último mes de este local
            const { data: ventas, error: errVentas } = await supabase
                .from('ventas')
                .select('id')
                .eq('local_id', localId)
                .gte('fecha', hace30dias.toISOString());

            if (errVentas || !ventas || !activo) {
                if (activo) { setMasVendidos([]); setCargando(false); }
                return;
            }

            if (ventas.length === 0) {
                if (activo) { setMasVendidos([]); setCargando(false); }
                return;
            }

            const idsVentas = ventas.map(v => v.id);

            // 2. Traer los detalles de esas ventas
            const { data: detalles, error: errDet } = await supabase
                .from('detalle_ventas')
                .select('producto_id, cantidad')
                .in('venta_id', idsVentas);

            if (errDet || !detalles || !activo) {
                if (activo) { setMasVendidos([]); setCargando(false); }
                return;
            }

            // 3. Sumar cantidad por producto
            const conteo: Record<string, number> = {};
            for (const d of detalles) {
                if (!d.producto_id) continue; // ignorar productos borrados (null)
                conteo[d.producto_id] = (conteo[d.producto_id] ?? 0) + 1;
            }

            // 4. Ordenar por cantidad y quedarse con el top
            const top = Object.entries(conteo)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limite)
                .map(([id]) => id);

            if (activo) {
                setMasVendidos(top);
                setCargando(false);
            }
        };

        calcular();
        return () => { activo = false; };
    }, [localId, limite]);

    return { masVendidos, cargando };
};