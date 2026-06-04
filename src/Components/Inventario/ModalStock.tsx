import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import type { Producto } from '../../types';

interface Props {
    producto: Producto;
    onCerrar: () => void;
}

const ModalStock = ({ producto, onCerrar }: Props) => {
    const { ajustarStock } = useMenu();
    const [cantidad, setCantidad] = useState(1);
    const [modo, setModo] = useState<'sumar' | 'restar'>('sumar');
    const [cargando, setCargando] = useState(false);

    const handleGuardar = async () => {
        setCargando(true);
        try {
            await ajustarStock(producto.id, modo === 'sumar' ? cantidad : -cantidad);
            onCerrar();
        } finally {
            setCargando(false);
        }
    };

    const stockResultante = modo === 'sumar'
        ? producto.stock_actual + cantidad
        : Math.max(0, producto.stock_actual - cantidad);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="font-bold text-gray-800">Ajustar stock</h2>
                        <p className="text-sm text-gray-400">{producto.nombre}</p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-gray-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Stock actual */}
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-400 mb-1">Stock actual</p>
                        <p className="text-3xl font-black text-gray-800">{producto.stock_actual}</p>
                    </div>

                    {/* Modo sumar/restar */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setModo('sumar')}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${modo === 'sumar' ? 'bg-green-50 border-green-400 text-green-700' : 'border-gray-200 text-gray-500'}`}
                        >
                            Entrada de stock
                        </button>
                        <button
                            onClick={() => setModo('restar')}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${modo === 'restar' ? 'bg-red-50 border-red-400 text-red-700' : 'border-gray-200 text-gray-500'}`}
                        >
                            Ajuste manual
                        </button>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
                            className="w-10 h-10 border rounded-xl flex items-center justify-center hover:bg-gray-50"
                        >
                            <Minus size={16} />
                        </button>
                        <input
                            type="number"
                            min="1"
                            className="flex-1 text-center text-xl font-bold border rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={cantidad}
                            onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button
                            onClick={() => setCantidad(prev => prev + 1)}
                            className="w-10 h-10 border rounded-xl flex items-center justify-center hover:bg-gray-50"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Stock resultante */}
                    <div className={`text-center p-3 rounded-xl ${modo === 'sumar' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-xs text-gray-400 mb-1">Stock resultante</p>
                        <p className={`text-2xl font-black ${modo === 'sumar' ? 'text-green-700' : 'text-red-700'}`}>
                            {stockResultante}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCerrar}
                            className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleGuardar}
                            disabled={cargando}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                        >
                            {cargando ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalStock;