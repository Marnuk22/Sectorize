import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';
import { imprimirComanda } from '../../logic/impresion';
import { useImpresoras } from '../../context/ImpresorasContext';

const ConfirmarPedidos = () => {
    const { mesaSeleccionada, confirmarPedidoMesa } = useSalon();
    const { local } = useAuth();
    const { impresorasDeComandas } = useImpresoras();

    if (!mesaSeleccionada) return null;

    const tieneCosasParaConfirmar = mesaSeleccionada?.aConfirmar && mesaSeleccionada.aConfirmar.length > 0;
    if (!tieneCosasParaConfirmar) return null;

    const handleConfirmar = () => {
        // Capturar lo nuevo ANTES de confirmar (porque confirmar vacía aConfirmar)
        const itemsNuevos = [...mesaSeleccionada.aConfirmar];

        // Imprimir la comanda de lo nuevo para la cocina
        imprimirComanda({
            local: local?.nombre ?? 'Vallis',
            mesa: mesaSeleccionada.nombre,
            items: itemsNuevos,
                impresoras: impresorasDeComandas().map(i => i.nombre_sistema),
        });

        // Confirmar (mueve aConfirmar -> pedidos)
        confirmarPedidoMesa(mesaSeleccionada.id);
    };

    return (
        <div className="p-4 bg-indigo-50 border-y border-indigo-100 flex justify-between items-center my-2">
            <button
                onClick={handleConfirmar}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
            >
                Confirmar pedido
            </button>
        </div>
    );
};

export default ConfirmarPedidos;