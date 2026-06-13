import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useSalon } from '../../context/SalonContext.tsx';

interface ListaPedidosProps {
    aConfirmar: boolean;
}

const ListaPedidos = ({ aConfirmar }: ListaPedidosProps) => {
    const salon = useSalon();
    const { mesaSeleccionada, onNotaAConfirmar } = salon;

    // Elegir las funciones según si es aConfirmar o pedidos confirmados
    const onAumentar = aConfirmar ? salon.onAumentarAconfirmar : salon.onAumentarProducto;
    const onDisminuir = aConfirmar ? salon.onDisminuirAConfirmar : salon.onDisminuirProducto;
    const onEliminar = aConfirmar ? salon.onEliminarAConfirmar : salon.onEliminarProducto;

    // Estado para saber qué ítem tiene el campo de nota abierto
    const [notaAbierta, setNotaAbierta] = useState<string | null>(null);

    if (!mesaSeleccionada) return (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center text-gray-400 italic">
            Selecciona una mesa para ver sus pedidos.
        </div>
    );

    const pedidos = aConfirmar ? mesaSeleccionada.aConfirmar : mesaSeleccionada.pedidos;

    return (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Detalle del Pedido
                </h3>
            </div>

            <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                    <tbody className="divide-y divide-gray-100">
                        {pedidos.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                                    No hay productos cargados
                                </td>
                            </tr>
                        ) : (
                            pedidos.map((item) => (
                                <tr key={item.id} className="text-sm hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-gray-800">
                                        <div>{item.nombre}</div>
                                        {/* Mostrar la nota si existe */}
                                        {item.notas && item.notas.trim() && (
                                            <div className="text-xs text-amber-600 italic mt-0.5">
                                                ✎ {item.notas}
                                            </div>
                                        )}
                                        {/* Campo para editar la nota (solo en aConfirmar) */}
                                        {aConfirmar && notaAbierta === item.id && (
                                            <input
                                                autoFocus
                                                type="text"
                                                defaultValue={item.notas ?? ''}
                                                placeholder="Ej: sin sal, bien cocido..."
                                                onBlur={(e) => {
                                                    onNotaAConfirmar(item.id, e.target.value);
                                                    setNotaAbierta(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        onNotaAConfirmar(item.id, (e.target as HTMLInputElement).value);
                                                        setNotaAbierta(null);
                                                    }
                                                }}
                                                className="mt-1 w-full text-xs border border-amber-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                        ${(item.precio * item.cantidad).toLocaleString()}
                                    </td>
                                    <td className="p-4 rounded-r-2xl w-48">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Botón de nota (solo en aConfirmar) */}
                                            {aConfirmar && (
                                                <button
                                                    onClick={() => setNotaAbierta(notaAbierta === item.id ? null : item.id)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${
                                                        item.notas
                                                            ? 'border-amber-300 bg-amber-50 text-amber-600'
                                                            : 'border-gray-200 text-gray-400 hover:bg-gray-100'
                                                    }`}
                                                    title="Agregar nota"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => onDisminuir(item.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                                            >-</button>

                                            <span className="px-2 py-3 font-medium text-red-600">
                                                {item.cantidad}x
                                            </span>

                                            <button
                                                onClick={() => onAumentar(item.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                                            >+</button>

                                            <button
                                                onClick={() => onEliminar(item.id)}
                                                className="ml-1 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                title="Quitar"
                                            >✕</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pedidos.length > 0 && (
                <div className="bg-red-50 px-4 py-3 flex justify-between items-center border-t border-red-100">
                    <span className="text-red-800 font-bold">TOTAL</span>
                    <span className="text-xl font-black text-red-600">
                        ${pedidos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0).toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
};

export default ListaPedidos;