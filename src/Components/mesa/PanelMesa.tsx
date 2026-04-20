import { useSalon } from "../../context";
import { type Producto } from "../../types"
import AccionesMesa from "./AccionesMesa";
import ListaPedidos from "./ListaPedidos";
import MenuDisplay from "./MenuDisplay";
import CierreDeMesa from "./CierreDeMesa";
import ConfirmarPedidos from "./ConfirmarPedidos";

const PanelMesa = () => {
    const { mesaSeleccionada, agregarProductoAMesa } = useSalon();
    
    // Aquí defines la función "maestra"
    const handleSeleccionProducto = (producto: Producto) => {
        console.log("El mozo eligió:", producto.nombre);
        agregarProductoAMesa(producto); // <--- Aquí se ejecuta la magia del Contexto
    };
    if (!mesaSeleccionada) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10 border-2 border-dashed border-gray-200 rounded-2xl">
                <p>Selecciona una mesa en el salón para cargar pedidos</p>
            </div>
        );
    }
return(
    <div className="bg-gray-100 h-full w-full overflow-y-auto scroll-smooth">
        <div className="flex flex-col h-full w-full">
        {/*Cabecera*/}
            <div className="bg-gray-50 p-4">
                <h2 className="text-xl font-bold text-gray-800">Mesa {mesaSeleccionada.nombre}</h2>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${mesaSeleccionada.estado === 'libre' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {mesaSeleccionada.estado}
                </span>
                <AccionesMesa/>
            </div>
            <div>
                <MenuDisplay onSeleccionar={handleSeleccionProducto} />
            </div>
            <div>
                <ListaPedidos aConfirmar={true} />
                <ConfirmarPedidos />
                <ListaPedidos aConfirmar={false} />
            </div>
            <div> 
                <CierreDeMesa />
            </div>
        </div>
    </div>

)}
export default PanelMesa;