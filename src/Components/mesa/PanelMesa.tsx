import { useSalon } from "../../context";
import { useAuth } from "../../context/AuthContext";
import { type Producto } from "../../types"
import { imprimirComanda } from "../../logic/impresion";
import { Printer } from "lucide-react";
import AccionesMesa from "./AccionesMesa";
import ListaPedidos from "./ListaPedidos";
import MenuDisplay from "./MenuDisplay";
import CierreDeMesa from "./CierreDeMesa";
import ConfirmarPedidos from "./ConfirmarPedidos";
import { useImpresoras } from '../../context/ImpresorasContext';

const PanelMesa = () => {
    const { mesaSeleccionada, agregarProductoAMesa } = useSalon();
    const { local } = useAuth();
    const { impresorasDeComandas } = useImpresoras();

    const handleSeleccionProducto = (producto: Producto) => {
        agregarProductoAMesa(producto);
    };

    if (!mesaSeleccionada) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10 border-2 border-dashed border-gray-200 rounded-2xl">
                <p>Selecciona una mesa en el salón para cargar pedidos</p>
            </div>
        );
    }

    const handleReimprimir = () => {
        imprimirComanda({
            local: local?.nombre ?? 'Vallis',
            mesa: mesaSeleccionada.nombre,
            items: mesaSeleccionada.pedidos,
            impresoras: impresorasDeComandas().map(i => i.nombre_sistema),
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Estado + acciones (el nombre ya lo muestra el header del drawer) */}
            <div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${mesaSeleccionada.estado === 'libre' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {mesaSeleccionada.estado}
                </span>
                <div className="mt-3">
                    <AccionesMesa />
                </div>
            </div>

            <MenuDisplay onSeleccionar={handleSeleccionProducto} />

            <div className="space-y-2">
                <ListaPedidos aConfirmar={true} />
                <ConfirmarPedidos />
                <ListaPedidos aConfirmar={false} />
            </div>

            {/* Reimprimir comanda: solo si hay pedidos confirmados */}
            {mesaSeleccionada.pedidos.length > 0 && (
                <button
                    onClick={handleReimprimir}
                    className="flex items-center justify-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Printer size={16} /> Reimprimir comanda
                </button>
            )}

            <CierreDeMesa />
        </div>
    );
};

export default PanelMesa;