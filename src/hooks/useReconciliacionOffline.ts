import { useEffect, useRef, useState } from 'react';
import { useConexion } from '../context/ConexionContext';
import { reconciliarVentas, type ResultadoReconciliacion } from '../logic/reconciliacion';

export type EstadoSync = 'idle' | 'sincronizando' | 'listo';

// Dispara la reconciliación (Etapa 4) en la transición offline -> online.
// Vive en un hook aparte (no adentro de VentasContext ni de MenuContext)
// porque necesita refrescar los dos a la vez, y ninguno de los dos puede ver
// al otro (mismo gotcha de orden de providers ya documentado) — el llamador
// (LayoutPrincipal, que sí está adentro de ambos) le pasa las dos funciones.
export const useReconciliacionOffline = (
    recargarProductos: () => Promise<void>,
    recargarMovimientosCaja: () => Promise<void>,
) => {
    const { online } = useConexion();
    const eraOfflineRef = useRef(false);
    const [estado, setEstado] = useState<EstadoSync>('idle');
    const [resultado, setResultado] = useState<ResultadoReconciliacion | null>(null);

    // En refs para no re-disparar el efecto si el padre re-renderiza con
    // funciones nuevas (MenuContext/VentasContext no las memoizan) — mismo
    // patrón que useEscaner.ts/ModalEscanerCamara.tsx.
    const recargarProductosRef = useRef(recargarProductos);
    const recargarMovimientosCajaRef = useRef(recargarMovimientosCaja);
    useEffect(() => { recargarProductosRef.current = recargarProductos; }, [recargarProductos]);
    useEffect(() => { recargarMovimientosCajaRef.current = recargarMovimientosCaja; }, [recargarMovimientosCaja]);

    useEffect(() => {
        if (!online) {
            eraOfflineRef.current = true;
            return;
        }
        // Solo dispara en la transición false -> true — si ya estaba online,
        // no hay nada que reconciliar.
        if (!eraOfflineRef.current) return;
        eraOfflineRef.current = false;

        let activo = true;

        const reconciliar = async () => {
            setEstado('sincronizando');
            setResultado(null);
            try {
                const res = await reconciliarVentas();
                if (!activo) return;

                if (res.ok > 0) {
                    await recargarProductosRef.current();
                    await recargarMovimientosCajaRef.current();
                }
                if (!activo) return;

                if (res.ok === 0 && res.fallidas === 0) {
                    // No había nada encolado — no hace falta molestar con un toast.
                    setEstado('idle');
                    return;
                }
                setResultado(res);
                setEstado('listo');
            } catch (err) {
                console.error('Error al reconciliar ventas offline:', err);
                if (activo) setEstado('idle');
            }
        };

        reconciliar();
        return () => { activo = false; };
    }, [online]);

    return { estado, resultado };
};
