import { useState } from 'react';
import { useVentas } from '../context/VentasContext';
import { Calculator, Wallet, History } from 'lucide-react';
import HistorialVentas from './ventas/HistorialVentas.tsx';

const ContenedorVentas  = () => {
    const { historialVentas } = useVentas();
    const [subSeccion, setSubSeccion] = useState<'historial' | 'caja' | 'arqueo'>('historial');
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setSubSeccion('historial')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${subSeccion === 'historial' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <History size={16} /> Historial
                </button>
                <button 
                    onClick={() => setSubSeccion('caja')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${subSeccion === 'caja' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Wallet size={16} /> Movimientos Caja
                </button>
                <button 
                    onClick={() => setSubSeccion('arqueo')}
                    className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${subSeccion === 'arqueo' ? 'bg-white text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Calculator size={16} /> Arqueo
                </button>
            </div>
            {/* Contenido Dinámico */}
            <div className="p-4 min-h-100">
                {subSeccion === 'historial' && (
                    <HistorialVentas ventas={historialVentas} />
                )}
                {subSeccion === 'caja' && <p className="text-center text-gray-400 mt-10 italic">Próximamente: Flujo de caja...</p>}
                {subSeccion === 'arqueo' && <p className="text-center text-gray-400 mt-10 italic">Próximamente: Herramientas de arqueo...</p>}
            </div>
        </div>
    );
};

export default ContenedorVentas;