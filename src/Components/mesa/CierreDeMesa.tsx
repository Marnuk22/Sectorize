import { useSalon, useVentas } from "../../context";
import { useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";


const CierreDeMesa = () => {
    const { mesaSeleccionada, cerrarMesa } = useSalon();
    const { MetodosPago } = useVentas();
    const [confirmado, setConfirmado] = useState(false);
    const [metodoElegido, setMetodoElegido] = useState(MetodosPago[0]?.id); // Valor por defecto

    if (!mesaSeleccionada) return null;

    const handleFinalizar = () => {
            // Buscamos el objeto completo del método de pago para enviarlo
        const metodoCompleto = MetodosPago.find(m => m.id === metodoElegido) || MetodosPago[0];
            
        cerrarMesa(mesaSeleccionada.id, metodoCompleto);
        setConfirmado(false);
    };

    return (
        <div>
            {!confirmado ? (
            <button className="mt-2 bg-blue-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
            onClick={()  => setConfirmado(true)}
            >Cierre de Mesa</button>
            ):(
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in zoom-in duration-200">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    Seleccionar Método de Pago
                </label>
                <div  className="relative mb-4">  
                    <select
                        value={metodoElegido}
                        onChange={(e) => setMetodoElegido(e.target.value)}
                        className="w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        {MetodosPago.map((metodo) => (
                            <option key={metodo.id} value={metodo.id}>
                                {metodo.nombre}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
                </div>
                <div className="flex gap-2">
                    <button 
                            onClick={handleFinalizar}
                            className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-sm font-bold"
                        >
                            <Check size={16} /> Confirmar
                    </button>
                    <button 
                            onClick={() => setConfirmado(false)}
                            className="bg-gray-200 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-300 transition-colors"
                            title="Cancelar"
>
                            <X size={16} />
                    </button>
                </div>
                </div>
            )}
            </div>
        );
};
export default CierreDeMesa;