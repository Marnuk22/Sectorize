import { useSalon } from '../../context/SalonContext';

const ConfirmarPedidos = () => {
    const { mesaSeleccionada, confirmarPedidoMesa } = useSalon();

    if (!mesaSeleccionada) return null;

// 1. Solo verificamos si el array tiene algo
    const tieneCosasParaConfirmar = mesaSeleccionada?.aConfirmar && mesaSeleccionada.aConfirmar.length > 0;
    
    // 2. Si está vacío, no renderizamos nada
    if (!tieneCosasParaConfirmar) return null;

    return (
        <div className="p-4 bg-indigo-50 border-y border-indigo-100 flex justify-between items-center my-2">
            <button 
                onClick={() => confirmarPedidoMesa(mesaSeleccionada.id)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
            >
                Confirmar pedido
            </button>
        </div>
    );
};

export default ConfirmarPedidos;