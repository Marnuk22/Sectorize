import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useKardexProducto } from '../../hooks/useKardexProducto';
import type { Producto, MotivoMovimientoStock } from '../../types';
import { Etiqueta } from '../ui/ComponentesBase';

const LABELS_MOTIVO: Record<MotivoMovimientoStock, string> = {
    ingreso: 'Ingreso',
    ajuste: 'Ajuste',
    merma: 'Merma',
    devolucion: 'Devolución',
    venta_online: 'Venta online',
    cancelacion_online: 'Cancelación online',
};

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });

interface Props {
    producto: Producto;
    onCerrar: () => void;
}

// Kardex: historial de movimientos de stock de este producto puntual
// (entradas/salidas/ajustes con fecha y usuario) — ver CLAUDE.md/ROADMAP,
// libro de auditoría al lado de productos.stock_actual.
const ModalKardexProducto = ({ producto, onCerrar }: Props) => {
    const { movimientos, cargando } = useKardexProducto(producto.id);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-stone-200 shrink-0">
                    <div>
                        <h2 className="font-bold text-stone-800">Historial de stock</h2>
                        <p className="text-sm text-stone-400">{producto.nombre}</p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                    {cargando && (
                        <div className="flex items-center justify-center py-10">
                            <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    {!cargando && movimientos.length === 0 && (
                        <p className="text-center text-stone-400 text-sm py-10">
                            Todavía no hay movimientos registrados para este producto.
                        </p>
                    )}
                    {movimientos.map(m => (
                        <div key={m.id} className="flex items-center justify-between gap-2 border border-stone-100 rounded-xl p-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                                {m.cantidad >= 0
                                    ? <ArrowUpCircle size={15} className="text-green-600 shrink-0" />
                                    : <ArrowDownCircle size={15} className="text-red-500 shrink-0" />}
                                <div className="min-w-0">
                                    <p className="text-sm text-stone-700">
                                        {LABELS_MOTIVO[m.motivo]}
                                        {m.costoUnitario !== null && (
                                            <span className="text-stone-400"> · costo ${m.costoUnitario.toLocaleString()}</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-stone-400 truncate">
                                        {m.fecha.toLocaleDateString('es-AR')} {m.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        {m.nota && ` · ${m.nota}`}
                                    </p>
                                </div>
                            </div>
                            <Etiqueta tono={m.cantidad >= 0 ? 'exito' : 'alerta'} className="shrink-0">
                                {m.cantidad >= 0 ? '+' : ''}{fmt(m.cantidad)}
                            </Etiqueta>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModalKardexProducto;
