import { useSalon, useVentas } from "../../context";
import { useState } from "react";
import { ChevronDown, Check, X, AlertTriangle, Printer } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { MetodoPago } from "../../types";
import { labelMetodo } from "../../config/metodosPago";
import { imprimirTicket } from "../../logic/impresion";
import { useImpresoras } from '../../context/ImpresorasContext';

type TipoDescuento = 'monto' | 'porcentaje';

const CierreDeMesa = () => {
    const { mesaSeleccionada, cerrarMesa } = useSalon();
    const { arqueoActivo } = useVentas();
    const { local } = useAuth();
    const { impresorasDeTickets } = useImpresoras();

    const metodosHabilitados = (local?.metodos_pago && local.metodos_pago.length > 0
        ? local.metodos_pago
        : ['efectivo']) as MetodoPago[];

    const [confirmado, setConfirmado] = useState(false);
    const [metodoElegido, setMetodoElegido] = useState<MetodoPago>(metodosHabilitados[0]);
    const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento>('monto');
    const [valorDescuento, setValorDescuento] = useState('');

    if (!mesaSeleccionada) return null;

    // Cálculos del cobro
    const subtotal = mesaSeleccionada.pedidos.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
    const valorNum = parseFloat(valorDescuento) || 0;
    const descuento = tipoDescuento === 'porcentaje'
        ? Math.round(subtotal * (valorNum / 100))
        : valorNum;
    const descuentoAplicado = Math.min(descuento, subtotal);
    const total = subtotal - descuentoAplicado;

    const cerrar = () => {
        setConfirmado(false);
        setValorDescuento('');
    };

    // Arma las opciones del ticket (reutilizado por cobrar e imprimir)
    const opcionesTicket = () => ({
        local: local?.nombre ?? 'Vallis',
        mesa: `Mesa ${mesaSeleccionada.nombre}`,
        items: [...mesaSeleccionada.pedidos],
        subtotal,
        descuento: descuentoAplicado > 0 ? descuentoAplicado : undefined,
        total,
        metodoPago: labelMetodo(metodoElegido),
        impresoras: impresorasDeTickets().map(i => i.nombre_sistema),
    });

    // Solo imprime, sin cobrar (para revisar antes)
    const handleImprimirSinCobrar = () => {
        imprimirTicket(opcionesTicket());
    };

    // Imprime y cobra (cierra la mesa)
    const handleCobrar = () => {
        imprimirTicket(opcionesTicket());
        cerrarMesa(mesaSeleccionada.id, metodoElegido);
        cerrar();
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
                        onClick={cerrar}
                        className="mt-3 w-full bg-amber-100 text-amber-700 py-2 rounded-md hover:bg-amber-200 transition-colors text-sm font-medium"
                    >
                        Entendido
                    </button>
                </div>
            ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-3">
                    {/* Método de pago */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Método de pago
                        </label>
                        <div className="relative">
                            <select
                                value={metodoElegido}
                                onChange={e => setMetodoElegido(e.target.value as MetodoPago)}
                                className="w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                {metodosHabilitados.map(metodo => (
                                    <option key={metodo} value={metodo}>
                                        {labelMetodo(metodo)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {/* Descuento */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Descuento (opcional)
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={tipoDescuento}
                                onChange={e => setTipoDescuento(e.target.value as TipoDescuento)}
                                className="bg-white border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                <option value="monto">$</option>
                                <option value="porcentaje">%</option>
                            </select>
                            <input
                                type="number"
                                min="0"
                                value={valorDescuento}
                                onChange={e => setValorDescuento(e.target.value)}
                                placeholder="0"
                                className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="bg-white rounded-md p-3 border border-gray-200 space-y-1 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString('es-AR')}</span>
                        </div>
                        {descuentoAplicado > 0 && (
                            <div className="flex justify-between text-red-500">
                                <span>Descuento</span>
                                <span>-${descuentoAplicado.toLocaleString('es-AR')}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
                            <span>Total</span>
                            <span>${total.toLocaleString('es-AR')}</span>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCobrar}
                            className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-sm font-bold"
                        >
                            <Check size={16} /> Cobrar ${total.toLocaleString('es-AR')}
                        </button>
                        <button
                            onClick={handleImprimirSinCobrar}
                            title="Imprimir sin cobrar"
                            className="bg-white border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            <Printer size={16} />
                        </button>
                        <button
                            onClick={cerrar}
                            title="Cancelar"
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