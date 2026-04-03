import { useSalon } from "../../context";

const CierreDeMesa = () => {
    const { mesaSeleccionada, cerrarMesa } = useSalon();
    if (!mesaSeleccionada) return null;
    return (
        <div>
            <button className="mt-2 bg-blue-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
            onClick={()  => cerrarMesa(mesaSeleccionada.id)}
            >Cierre de Mesa</button>
        </div>  
    )
}
export default CierreDeMesa;