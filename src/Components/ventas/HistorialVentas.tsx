import { useState } from 'react';
import { History, Filter, ChevronDown, ChevronUp, RefreshCw, Lock, Sparkles, Printer } from 'lucide-react';
import { useImpresoras } from '../../context/ImpresorasContext';
import { useAuth } from '../../context/AuthContext';
import { imprimirArqueo } from '../../logic/impresion';
import { useHistorialVentas } from '../../hooks/useHistorialVentas';
import { usePlan } from '../../hooks/usePlan';
import type { MetodoPago } from '../../types';
import { labelMetodo, iconoMetodo, colorMetodo } from '../../config/metodosPago';
import type { VentaHistorial, DetalleVenta } from '../../hooks/useHistorialVentas';
import { Tarjeta, FilaDato, Campo } from '../ui/ComponentesBase';


const HistorialVentas = () => {
    const { ventas, arqueos, cargando, filtros, setFiltros, totalFiltrado, porMetodoFiltrado, recargar, cargarDetalleVenta } = useHistorialVentas();
    const { puede } = usePlan();
    const historialCompleto = puede('historial_completo');
    const { impresorasDeTickets } = useImpresoras();
    const { local } = useAuth();

    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [arqueoExpandido, setArqueoExpandido] = useState<string | null>(null);

    const handleReimprimirArqueo = (arqueo: typeof arqueos[number]) => {
        imprimirArqueo({
            local: local?.nombre ?? 'Vallis',
            fechaApertura: arqueo.fecha_apertura,
            fechaCierre: arqueo.fecha_cierre ?? undefined,
            montoInicial: 0,
            totalVentas: arqueo.total_ventas,
            cantidadVentas: arqueo.cantidad_ventas,
            porMetodo: Object.fromEntries(
                (Object.entries(arqueo.por_metodo) as [MetodoPago, number][])
                    .map(([m, v]) => [labelMetodo(m), v])
            ),
            montoEsperado: arqueo.total_ventas,
            impresoras: impresorasDeTickets().map(i => i.nombre_sistema),
        });
    };

    if (cargando) return (
        <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const arqueoAbierto = arqueos.find(a => a.estado === 'abierto');
    const ventasVisibles = historialCompleto
        ? ventas
        : ventas.filter(v => arqueoAbierto && v.arqueo_id === arqueoAbierto.id);

    const totalVisible = historialCompleto
        ? totalFiltrado
        : ventasVisibles.reduce((acc, v) => acc + v.total, 0);

    const porMetodoVisible = historialCompleto
        ? porMetodoFiltrado
        : ventasVisibles.reduce((acc, v) => {
            acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total;
            return acc;
        }, {} as Record<MetodoPago, number>);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">

            {/* Header con totales */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-stone-400">
                        {ventasVisibles.length} ventas {!historialCompleto && '(arqueo actual)'}
                    </p>
                    <p className="text-xl font-black text-stone-800">${totalVisible.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={recargar}
                        className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50"
                        title="Recargar"
                    >
                        <RefreshCw size={16} className="text-stone-400" />
                    </button>
                    {historialCompleto && (
                        <button
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${mostrarFiltros ? 'bg-violet-50 border-violet-200 text-violet-700' : 'border-stone-200 hover:bg-stone-50 text-stone-600'}`}
                        >
                            <Filter size={14} /> Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Resumen por método */}
            {Object.keys(porMetodoVisible).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(porMetodoVisible) as [MetodoPago, number][]).map(([metodo, total]) => {
                        const Icono = iconoMetodo(metodo);
                        return (
                            <div key={metodo} className={`flex items-center gap-2 p-3 rounded-xl ${colorMetodo(metodo)}`}>
                                <Icono size={15} />
                                <div>
                                    <p className="text-xs font-medium">{labelMetodo(metodo)}</p>
                                    <p className="font-black text-sm">${total.toLocaleString()}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Panel de filtros — solo plan básico+ */}
            {historialCompleto && mostrarFiltros && (
                <div className="bg-stone-50 rounded-2xl p-4 space-y-3 border border-stone-200">
                    <p className="text-xs font-medium text-stone-500 uppercase">Filtros</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-stone-400">Método de pago</label>
                            <select
                                className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                                value={filtros.metodo}
                                onChange={e => setFiltros(f => ({ ...f, metodo: e.target.value as MetodoPago | 'todos' }))}
                            >
                                <option value="todos">Todos</option>
                                {Array.from(new Set(ventas.map(v => v.metodo_pago))).map(m => (
                                <option key={m} value={m}>{labelMetodo(m)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-stone-400">Arqueo</label>
                            <select
                                className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                                value={filtros.arqueo_id}
                                onChange={e => setFiltros(f => ({ ...f, arqueo_id: e.target.value }))}
                            >
                                <option value="todos">Todos</option>
                                {arqueos.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.fecha_apertura.toLocaleDateString('es-AR')} {a.estado === 'abierto' ? '(abierto)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Campo
                            etiqueta="Desde"
                            type="date"
                            className="bg-white"
                            value={filtros.fecha_desde}
                            onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
                        />
                        <Campo
                            etiqueta="Hasta"
                            type="date"
                            className="bg-white"
                            value={filtros.fecha_hasta}
                            onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
                        />
                    </div>
                    <button
                        onClick={() => setFiltros({ metodo: 'todos', arqueo_id: 'todos', fecha_desde: '', fecha_hasta: '' })}
                        className="text-xs text-violet-600 hover:underline"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}

            {/* Resumen por arqueo — solo plan básico+ */}
            {historialCompleto && arqueos.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-stone-400 uppercase">Resumen por arqueo</p>
                    {arqueos.map(arqueo => (
                        <div key={arqueo.id} className="border border-stone-200 rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setArqueoExpandido(arqueoExpandido === arqueo.id ? null : arqueo.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${arqueo.estado === 'abierto' ? 'bg-green-500' : 'bg-stone-300'}`} />
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-stone-700">
                                            {arqueo.fecha_apertura.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {' '}
                                            {arqueo.fecha_apertura.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs text-stone-400">{arqueo.cantidad_ventas} ventas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-black text-stone-800">${arqueo.total_ventas.toLocaleString()}</p>
                                    {arqueoExpandido === arqueo.id ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                                </div>
                            </button>

                            {arqueoExpandido === arqueo.id && (
                                <div className="border-t border-stone-200 bg-stone-50 p-4 space-y-2">
                                    {(Object.entries(arqueo.por_metodo) as [MetodoPago, number][]).map(([metodo, total]) => {
                                        const Icono = iconoMetodo(metodo);
                                        return (
                                            <div key={metodo} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Icono size={13} className="text-stone-400" />
                                                    <span className="text-sm text-stone-500">{labelMetodo(metodo)}</span>
                                                </div>
                                                <span className="font-bold text-stone-700">${total.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                    {arqueo.estado === 'cerrado' && arqueo.fecha_cierre && (
                                        <div className="pt-2 border-t border-stone-200 mt-2 text-xs text-stone-400 text-right">
                                            Cerrado {arqueo.fecha_cierre.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                    {/* Ventas de este arqueo */}
                                    {(() => {
                                        const ventasDelArqueo = ventas.filter(v => v.arqueo_id === arqueo.id);
                                        return ventasDelArqueo.length > 0 ? (
                                            <div className="pt-3 mt-2 border-t border-stone-200 space-y-2">
                                                <p className="text-xs font-medium text-stone-400 uppercase">Ventas de esta caja</p>
                                                {ventasDelArqueo.map(venta => (
                                                    <FilaVentaExpandible
                                                        key={venta.id}
                                                        venta={venta}
                                                        cargarDetalle={cargarDetalleVenta}
                                                    />
                                                ))}
                                            </div>
                                        ) : null;
                                    })()}
                                    {/* Botón reimprimir */}
                                    <button
                                        onClick={() => handleReimprimirArqueo(arqueo)}
                                        className="w-full mt-2 flex items-center justify-center gap-2 border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Printer size={14} /> Reimprimir reporte
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Lista de ventas */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-stone-400 uppercase">Detalle de ventas</p>
                {ventasVisibles.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-sm">
                        No hay ventas registradas
                    </div>
                ) : (
                    ventasVisibles.map(venta => {
                        const Icono = iconoMetodo(venta.metodo_pago);
                        return (
                            <FilaDato
                                key={venta.id}
                                className="hover:border-violet-300 transition-colors"
                                icono={
                                    <div className="p-2 bg-violet-50 rounded-xl">
                                        <History size={16} className="text-violet-700" />
                                    </div>
                                }
                                etiqueta={`Venta #${venta.id.slice(-4).toUpperCase()}`}
                                subetiqueta={`${venta.fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} · ${venta.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                                valor={
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${colorMetodo(venta.metodo_pago)}`}>
                                            <Icono size={11} />
                                            {labelMetodo(venta.metodo_pago)}
                                        </span>
                                        <span className="font-black text-stone-900">${venta.total.toLocaleString()}</span>
                                    </div>
                                }
                            />
                        );
                    })
                )}
            </div>

            {/* CTA upgrade para plan gratis */}
            {!historialCompleto && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <Lock size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800 flex items-center gap-1">
                            <Sparkles size={14} /> Historial completo
                        </p>
                        <p className="text-xs text-amber-700">
                            Accedé a todas tus ventas históricas, filtros por fecha y resumen por arqueo con el plan Básico.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
// --- Venta individual expandible (muestra sus productos al abrir) ---
interface FilaVentaProps {
    venta: VentaHistorial;
    cargarDetalle: (ventaId: string) => Promise<DetalleVenta[]>;
}

const FilaVentaExpandible = ({ venta, cargarDetalle }: FilaVentaProps) => {
    const [abierta, setAbierta] = useState(false);
    const [detalle, setDetalle] = useState<DetalleVenta[] | null>(null);
    const [cargandoDet, setCargandoDet] = useState(false);
    const Icono = iconoMetodo(venta.metodo_pago);

    const toggle = async () => {
        const nuevoEstado = !abierta;
        setAbierta(nuevoEstado);
        // Cargar el detalle solo la primera vez que se abre
        if (nuevoEstado && detalle === null) {
            setCargandoDet(true);
            const items = await cargarDetalle(venta.id);
            setDetalle(items);
            setCargandoDet(false);
        }
    };

    return (
        <Tarjeta padding="none" className="overflow-hidden">
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-violet-50 rounded-lg">
                        <History size={14} className="text-violet-700" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-stone-800 text-sm">Venta #{venta.id.slice(-4).toUpperCase()}</p>
                        <p className="text-xs text-stone-400">
                            {venta.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${colorMetodo(venta.metodo_pago)}`}>
                        <Icono size={11} />
                        {labelMetodo(venta.metodo_pago)}
                    </span>
                    <p className="font-black text-stone-900 text-sm">${venta.total.toLocaleString()}</p>
                    {abierta ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
                </div>
            </button>

            {abierta && (
                <div className="border-t border-stone-200 bg-stone-50 p-3">
                    {cargandoDet ? (
                        <p className="text-xs text-stone-400 text-center py-2">Cargando detalle...</p>
                    ) : detalle && detalle.length > 0 ? (
                        <div className="space-y-1.5">
                            {detalle.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-stone-700">{item.nombre}</span>
                                        <span className="text-stone-400 text-xs ml-2">
                                            {item.tipo_venta === 'granel'
                                                ? `${item.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${item.unidad_medida} × $${item.precio.toLocaleString()}`
                                                : `${item.cantidad} × $${item.precio.toLocaleString()}`}
                                        </span>
                                    </div>
                                    <span className="font-bold text-stone-700">${item.subtotal.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-stone-400 text-center py-2">Sin detalle disponible</p>
                    )}
                </div>
            )}
        </Tarjeta>
    );
};
export default HistorialVentas;