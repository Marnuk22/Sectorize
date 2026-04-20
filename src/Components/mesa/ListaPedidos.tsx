import { useSalon } from '../../context/SalonContext.tsx';

interface ListaPedidosProps {
    aConfirmar: boolean; // Si es true, muestra "aConfirmar", si es false, muestra "pedidos"
}

const ListaPedidos = ({ aConfirmar }: ListaPedidosProps) => {
    const { mesaSeleccionada } = useSalon();
    const onAumentar = aConfirmar ? useSalon().onAumentarAconfirmar : useSalon().onAumentarProducto;
    const onDisminuir = aConfirmar ? useSalon().onDisminuirAConfirmar : useSalon().onDisminuirProducto;
    const onEliminar = aConfirmar ? useSalon().onEliminarAConfirmar : useSalon().onEliminarProducto;

    // Si no hay mesa, no mostramos nada
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
                                        {item.nombre}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                        ${(item.precio * item.cantidad).toLocaleString()}
                                    </td>
                                    <td className="p-4 rounded-r-2xl w-40">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Botón Disminuir */}
                                            <button 
                                                onClick={() => onDisminuir(item.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                                                >-</button>

                                            <td className="px-4 py-3 font-medium text-red-600">
                                                {item.cantidad}x
                                            </td>
                                            {/* Botón Aumentar */}
                                            <button 
                                                onClick={() => onAumentar(item.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                                            >+</button>

                                             {/* Botón Eliminar (Icono de basura o X) */}
                                            <button 
                                                onClick={() => onEliminar(item.id)}
                                                className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
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

            {/* Total acumulado al pie de la tabla */}
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