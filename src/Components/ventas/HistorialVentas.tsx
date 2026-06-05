import { useState } from 'react';
import { History, Filter, ChevronDown, ChevronUp, RefreshCw, Lock, Sparkles } from 'lucide-react';
import { useHistorialVentas } from '../../hooks/useHistorialVentas';
import { usePlan } from '../../hooks/usePlan';
import type { MetodoPago } from '../../types';
import { labelMetodo, iconoMetodo, colorMetodo } from '../../config/metodosPago';


const HistorialVentas = () => {
    const { ventas, arqueos, cargando, filtros, setFiltros, totalFiltrado, porMetodoFiltrado, recargar } = useHistorialVentas();
    const { puede } = usePlan();
    const historialCompleto = puede('historial_completo');

    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [arqueoExpandido, setArqueoExpandido] = useState<string | null>(null);

    if (cargando) return (
        <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // En plan gratis: solo ventas del arqueo abierto
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
                    <p className="text-sm text-gray-400">
                        {ventasVisibles.length} ventas {!historialCompleto && '(arqueo actual)'}
                    </p>
                    <p className="text-xl font-black text-gray-800">${totalVisible.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={recargar}
                        className="p-2 border rounded-xl hover:bg-gray-50"
                        title="Recargar"
                    >
                        <RefreshCw size={16} className="text-gray-400" />
                    </button>
                    {historialCompleto && (
                        <button
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${mostrarFiltros ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
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
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border">
                    <p className="text-xs font-medium text-gray-500 uppercase">Filtros</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-400">Método de pago</label>
                            <select
                                className="border rounded-xl px-3 py-2 text-sm bg-white"
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
                            <label className="text-xs text-gray-400">Arqueo</label>
                            <select
                                className="border rounded-xl px-3 py-2 text-sm bg-white"
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
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-400">Desde</label>
                            <input
                                type="date"
                                className="border rounded-xl px-3 py-2 text-sm bg-white"
                                value={filtros.fecha_desde}
                                onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-400">Hasta</label>
                            <input
                                type="date"
                                className="border rounded-xl px-3 py-2 text-sm bg-white"
                                value={filtros.fecha_hasta}
                                onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setFiltros({ metodo: 'todos', arqueo_id: 'todos', fecha_desde: '', fecha_hasta: '' })}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}

            {/* Resumen por arqueo — solo plan básico+ */}
            {historialCompleto && arqueos.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase">Resumen por arqueo</p>
                    {arqueos.map(arqueo => (
                        <div key={arqueo.id} className="border rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setArqueoExpandido(arqueoExpandido === arqueo.id ? null : arqueo.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${arqueo.estado === 'abierto' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-gray-700">
                                            {arqueo.fecha_apertura.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {' '}
                                            {arqueo.fecha_apertura.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs text-gray-400">{arqueo.cantidad_ventas} ventas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-black text-gray-800">${arqueo.total_ventas.toLocaleString()}</p>
                                    {arqueoExpandido === arqueo.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </div>
                            </button>

                            {arqueoExpandido === arqueo.id && (
                                <div className="border-t bg-gray-50 p-4 space-y-2">
                                    {(Object.entries(arqueo.por_metodo) as [MetodoPago, number][]).map(([metodo, total]) => {
                                        const Icono = iconoMetodo(metodo);
                                        return (
                                            <div key={metodo} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Icono size={13} className="text-gray-400" />
                                                    <span className="text-sm text-gray-500">{labelMetodo(metodo)}</span>
                                                </div>
                                                <span className="font-bold text-gray-700">${total.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                    {arqueo.estado === 'cerrado' && arqueo.fecha_cierre && (
                                        <div className="pt-2 border-t mt-2 text-xs text-gray-400 text-right">
                                            Cerrado {arqueo.fecha_cierre.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Lista de ventas */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase">Detalle de ventas</p>
                {ventasVisibles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No hay ventas registradas
                    </div>
                ) : (
                    ventasVisibles.map(venta => {
                        const Icono = iconoMetodo(venta.metodo_pago)
;
                        return (
                            <div key={venta.id} className="flex items-center justify-between p-4 bg-white rounded-xl border hover:border-gray-200 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 rounded-xl">
                                        <History size={16} className="text-blue-900" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">Venta #{venta.id.slice(-4).toUpperCase()}</p>
                                        <p className="text-xs text-gray-400">
                                            {venta.fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                            {' · '}
                                            {venta.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${colorMetodo(venta.metodo_pago)}`}>
                                        <Icono size={11} />
                                        {labelMetodo(venta.metodo_pago)}
                                    </span>
                                    <p className="font-black text-gray-900">${venta.total.toLocaleString()}</p>
                                </div>
                            </div>
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

export default HistorialVentas;