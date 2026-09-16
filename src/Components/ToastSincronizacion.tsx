import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { EstadoSync } from '../hooks/useReconciliacionOffline';
import type { ResultadoReconciliacion } from '../logic/reconciliacion';

interface Props {
    estado: EstadoSync;
    resultado: ResultadoReconciliacion | null;
}

// Mismo patrón visual que el toast de escaneo de ContenedorMostrador (fixed
// bottom, fondo oscuro) — avisa que se están sincronizando las ventas que
// quedaron encoladas offline (Etapa 3) y el resultado al terminar.
const ToastSincronizacion = ({ estado, resultado }: Props) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const actualizarVisibilidad = () => {
            setVisible(estado !== 'idle');
        };
        actualizarVisibilidad();

        if (estado === 'listo') {
            const t = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(t);
        }
    }, [estado]);

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            {estado === 'sincronizando' && (
                <>
                    <Loader2 size={15} className="animate-spin shrink-0" />
                    Sincronizando ventas pendientes...
                </>
            )}
            {estado === 'listo' && resultado && resultado.fallidas > 0 && (
                <>
                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                    {resultado.ok} venta{resultado.ok === 1 ? '' : 's'} sincronizada{resultado.ok === 1 ? '' : 's'}, {resultado.fallidas} con error — revisar
                </>
            )}
            {estado === 'listo' && resultado && resultado.fallidas === 0 && (
                <>
                    <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                    {resultado.ok} venta{resultado.ok === 1 ? '' : 's'} sincronizada{resultado.ok === 1 ? '' : 's'}
                </>
            )}
        </div>
    );
};

export default ToastSincronizacion;
