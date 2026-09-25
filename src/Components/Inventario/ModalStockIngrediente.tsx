import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useIngredientes } from '../../context/IngredientesContext';
import type { Ingrediente } from '../../types';
import { Boton } from '../ui/ComponentesBase';

interface Props {
    ingrediente: Ingrediente;
    onCerrar: () => void;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });

// Mismo diseño que ModalStock (productos), pero vía registrarMovimientoIngrediente
// (atómico por RPC, deja rastro en movimientos_ingredientes) en vez de un
// ajustarStock que pise el valor leído en el front.
const ModalStockIngrediente = ({ ingrediente, onCerrar }: Props) => {
    const { registrarMovimientoIngrediente } = useIngredientes();
    const [cantidad, setCantidad] = useState(1);
    const [modo, setModo] = useState<'sumar' | 'restar'>('sumar');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        setCargando(true);
        setError('');
        try {
            await registrarMovimientoIngrediente(
                ingrediente.id,
                modo === 'sumar' ? cantidad : -cantidad,
                'ajuste'
            );
            onCerrar();
        } catch (err: any) {
            setError(err.message ?? 'No se pudo ajustar el stock');
        } finally {
            setCargando(false);
        }
    };

    const stockResultante = modo === 'sumar'
        ? ingrediente.stock_actual + cantidad
        : Math.max(0, ingrediente.stock_actual - cantidad);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between p-5 border-b border-stone-200">
                    <div>
                        <h2 className="font-bold text-stone-800">Ajustar stock</h2>
                        <p className="text-sm text-stone-400">{ingrediente.nombre}</p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="text-center p-4 bg-stone-50 rounded-xl">
                        <p className="text-xs text-stone-400 mb-1">Stock actual</p>
                        <p className="text-3xl font-black text-stone-800">{fmt(ingrediente.stock_actual)} <span className="text-base font-normal text-stone-400">{ingrediente.unidad_medida}</span></p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setModo('sumar')}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${modo === 'sumar' ? 'bg-green-50 border-green-400 text-green-700' : 'border-stone-200 text-stone-500'}`}
                        >
                            Entrada de stock
                        </button>
                        <button
                            onClick={() => setModo('restar')}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${modo === 'restar' ? 'bg-red-50 border-red-400 text-red-700' : 'border-stone-200 text-stone-500'}`}
                        >
                            Quita de stock
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCantidad(prev => Math.max(0, Math.round((prev - 1) * 1000) / 1000))}
                            className="w-10 h-10 border border-stone-200 rounded-xl flex items-center justify-center hover:bg-stone-50"
                        >
                            <Minus size={16} />
                        </button>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            className="flex-1 text-center text-xl font-bold border border-stone-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            value={cantidad}
                            onChange={e => {
                                const v = parseFloat(e.target.value);
                                setCantidad(isNaN(v) ? 0 : Math.max(0, v));
                            }}
                        />
                        <button
                            onClick={() => setCantidad(prev => Math.round((prev + 1) * 1000) / 1000)}
                            className="w-10 h-10 border border-stone-200 rounded-xl flex items-center justify-center hover:bg-stone-50"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className={`text-center p-3 rounded-xl ${modo === 'sumar' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-xs text-stone-400 mb-1">Stock resultante</p>
                        <p className={`text-2xl font-black ${modo === 'sumar' ? 'text-green-700' : 'text-red-700'}`}>
                            {fmt(stockResultante)}
                        </p>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex gap-3">
                        <Boton variante="secundario" onClick={onCerrar} className="flex-1">
                            Cancelar
                        </Boton>
                        <Boton variante="primario" onClick={handleGuardar} disabled={cargando} className="flex-1">
                            {cargando ? 'Guardando...' : 'Confirmar'}
                        </Boton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalStockIngrediente;
