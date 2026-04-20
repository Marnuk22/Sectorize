import type { Venta } from "../../types";
import { History } from "lucide-react";

interface Props {
    ventas: Venta[];
}

const HistorialVentas = ({ ventas }: Props) => {
    return (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-medium text-gray-500">{ventas.length} ventas</span>
                            <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                Total: ${ventas.reduce((acc, v) => acc + v.total, 0).toFixed(2)}
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            {ventas.map((venta, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <History className="text-blue-900" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">Venta #{venta.id.toString().slice(-4)}</h3>
                                            <p className="text-xs text-gray-400">{venta.fecha.toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-gray-900">${venta.total.toFixed(2)}</p>
                                        <p className="text-[10px] uppercase font-bold text-blue-500 tracking-tighter">
                                            {venta.metodoPago?.nombre || 'Efectivo'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
    )}

export default HistorialVentas;