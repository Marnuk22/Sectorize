import { useSalon } from "../../context";
import { type Producto } from "../../types"
import AccionesMesa from "./AccionesMesa";
import ListaPedidos from "./ListaPedidos";
import MenuDisplay from "./MenuDisplay";
import CierreDeMesa from "./CierreDeMesa";
import ConfirmarPedidos from "./ConfirmarPedidos";

const PanelMesa = () => {
    const { mesaSeleccionada, agregarProductoAMesa } = useSalon();

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

            <CierreDeMesa />
        </div>
    );
};

export default PanelMesa;