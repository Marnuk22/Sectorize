import { WifiOff } from 'lucide-react';
import { useConexion } from '../hooks/useConexion';

// Etapa 1 del modo offline — solo detecta y avisa, no hace nada más todavía
// (sin catálogo local, cola de ventas ni sincronización, eso es de etapas
// siguientes). Mismo patrón visual que BannerGracia (AccesoSuscripcion.tsx),
// pero informativo puro, sin acción — tono ámbar, no bloquea nada.
const BannerOffline = () => {
    const { online } = useConexion();
    if (online) return null;

    return (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2">
            <WifiOff size={15} className="text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800 font-medium">
                Sin conexión — vendiendo en modo local
            </span>
        </div>
    );
};

export default BannerOffline;
