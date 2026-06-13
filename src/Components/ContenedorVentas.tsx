import { useState } from 'react';
import { useVentas } from '../context/VentasContext';
import { Calculator, History } from 'lucide-react';
import HistorialVentas from './ventas/HistorialVentas';
import ContenedorArqueo from './ventas/ContenedorArqueo';

const ContenedorVentas = () => {
    const { historialVentas, arqueoActivo } = useVentas();
    const [subSeccion, setSubSeccion] = useState<'historial' | 'arqueo'>('arqueo');

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Pestañas Arqueo / Historial */}
            <div className="flex items-center bg-stone-50 border-b border-stone-200 shrink-0">
                <button
                    onClick={() => setSubSeccion('arqueo')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${subSeccion === 'arqueo' ? 'bg-white text-violet-700 border-b-2 border-violet-600' : 'text-stone-400 hover:text-stone-600'}`}
                >
                    <Calculator size={16} />
                    Arqueo
                    {arqueoActivo && (
                        <span className="w-2 h-2 rounded-full bg-green-500" title="Caja abierta" />
                    )}
                </button>
                <button
                    onClick={() => setSubSeccion('historial')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${subSeccion === 'historial' ? 'bg-white text-violet-700 border-b-2 border-violet-600' : 'text-stone-400 hover:text-stone-600'}`}
                >
                    <History size={16} />
                    Historial
                    {historialVentas.length > 0 && (
                        <span className="bg-violet-100 text-violet-700 text-xs px-1.5 py-0.5 rounded-full">
                            {historialVentas.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {subSeccion === 'arqueo' && <ContenedorArqueo />}
                {subSeccion === 'historial' && <HistorialVentas/>}
            </div>
        </div>
    );
};

export default ContenedorVentas;