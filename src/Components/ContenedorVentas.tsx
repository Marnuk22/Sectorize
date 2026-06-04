import { useState } from 'react';
import { useVentas } from '../context/VentasContext';
import { Calculator, History } from 'lucide-react';
import HistorialVentas from './ventas/HistorialVentas';
import ContenedorArqueo from './ventas/ContenedorArqueo';

const ContenedorVentas = () => {
    const { historialVentas, arqueoActivo } = useVentas();
    const [subSeccion, setSubSeccion] = useState<'historial' | 'arqueo'>('arqueo');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
            <div className="flex items-center">
                <button
                    onClick={() => setSubSeccion('arqueo')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${subSeccion === 'arqueo' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Calculator size={16} />
                    Arqueo
                    {arqueoActivo && (
                        <span className="w-2 h-2 rounded-full bg-green-500" title="Caja abierta" />
                    )}
                </button>
                <button
                    onClick={() => setSubSeccion('historial')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${subSeccion === 'historial' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <History size={16} />
                    Historial
                    {historialVentas.length > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                            {historialVentas.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="p-4">
                {subSeccion === 'arqueo' && <ContenedorArqueo />}
                {subSeccion === 'historial' && <HistorialVentas/>}
            </div>
        </div>
    );
};

export default ContenedorVentas;