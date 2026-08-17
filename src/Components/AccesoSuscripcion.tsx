import { useState, type ReactNode } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BLOQUEO_ACTIVO, diasGraciaRestantes, estadoAcceso } from '../logic/suscripcion';
import PanelLateral from './Usuario/PanelLateral';
import PanelMiPlan from './Usuario/PanelMiPlan';

interface PanelPagoProps {
    abierto: boolean;
    onCerrar: () => void;
}

const PanelPago = ({ abierto, onCerrar }: PanelPagoProps) => (
    <PanelLateral titulo="Mi suscripción" abierto={abierto} onCerrar={onCerrar}>
        <PanelMiPlan />
    </PanelLateral>
);

const PantallaBloqueo = ({ onPagar }: { onPagar: () => void }) => (
    <div className="h-full flex items-center justify-center bg-stone-50 p-6">
        <div className="max-w-sm w-full text-center bg-white border border-stone-200 rounded-2xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} className="text-red-500" />
            </div>
            <h2 className="font-bold text-stone-800 text-lg mb-1">Tu suscripción venció</h2>
            <p className="text-sm text-stone-500 mb-6">
                Regularizá tu suscripción a Vallis para seguir usando el sistema.
            </p>
            <button
                onClick={onPagar}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
                Ir a pagar
            </button>
        </div>
    </div>
);

const BannerGracia = ({ dias, onPagar }: { dias: number; onPagar: () => void }) => (
    <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
        <span className="text-sm text-amber-800 flex items-center gap-1.5">
            <Sparkles size={15} className="text-amber-600 shrink-0" />
            Tu suscripción venció. Te quedan {dias} día{dias === 1 ? '' : 's'} para regularizarla.
        </span>
        <button
            onClick={onPagar}
            className="text-sm font-bold text-amber-800 underline underline-offset-2 hover:text-amber-900"
        >
            Pagar ahora
        </button>
    </div>
);

const AccesoSuscripcion = ({ children }: { children: ReactNode }) => {
    const { negocio } = useAuth();
    const [panelPago, setPanelPago] = useState(false);

    const estado = BLOQUEO_ACTIVO ? estadoAcceso(negocio) : 'ok';

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {estado === 'gracia' && (
                <BannerGracia dias={diasGraciaRestantes(negocio)} onPagar={() => setPanelPago(true)} />
            )}

            <div className="flex-1 min-h-0">
                {estado === 'bloqueado'
                    ? <PantallaBloqueo onPagar={() => setPanelPago(true)} />
                    : children}
            </div>

            <PanelPago abierto={panelPago} onCerrar={() => setPanelPago(false)} />
        </div>
    );
};

export default AccesoSuscripcion;
