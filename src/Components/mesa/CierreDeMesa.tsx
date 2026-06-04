import { useSalon, useVentas } from "../../context";
import { useState } from "react";
import { ChevronDown, Check, X, AlertTriangle } from "lucide-react";
import type { MetodoPago } from "../../types";

const LABELS: Record<MetodoPago, string> = {
    efectivo:      'Efectivo',
    tarjeta:       'Tarjeta',
    transferencia: 'Transferencia',
    otro:          'Otro',
};

const CierreDeMesa = () => {
    const { mesaSeleccionada, cerrarMesa } = useSalon();
    const { MetodosPago, arqueoActivo } = useVentas();
    const [confirmado, setConfirmado] = useState(false);
    const [metodoElegido, setMetodoElegido] = useState<MetodoPago>(MetodosPago[0]);

    if (!mesaSeleccionada) return null;

    const handleFinalizar = () => {
        cerrarMesa(mesaSeleccionada.id, metodoElegido);
        setConfirmado(false);
    };

    return (
        <div>
            {!confirmado ? (
                <button
                    className="mt-2 bg-blue-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
                    onClick={() => setConfirmado(true)}
                >
                    Cierre de Mesa
                </button>
            ) : !arqueoActivo ? (
                // Sin arqueo abierto — mostrar advertencia
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-bold text-amber-800 text-sm">No hay caja abierta</p>
                            <p className="text-xs text-amber-700 mt-1">
                                Para cobrar una mesa primero tenés que abrir la caja desde la sección Ventas → Arqueo.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setConfirmado(false)}
                        className="mt-3 w-full bg-amber-100 text-amber-700 py-2 rounded-md hover:bg-amber-200 transition-colors text-sm font-medium"
                    >
                        Entendido
                    </button>
                </div>
            ) : (
                // Con arqueo abierto — selector de método de pago
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in zoom-in duration-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                        Método de pago
                    </label>
                    <div className="relative mb-4">
                        <select
                            value={metodoElegido}
                            onChange={e => setMetodoElegido(e.target.value as MetodoPago)}
                            className="w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            {MetodosPago.map(metodo => (
                                <option key={metodo} value={metodo}>
                                    {LABELS[metodo]}
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