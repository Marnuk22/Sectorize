import { useState, useEffect } from 'react';
import { History, Filter, ChevronDown, ChevronUp, RefreshCw, Lock, Sparkles, Printer, Pencil, Download } from 'lucide-react';
import { useImpresoras } from '../../context/ImpresorasContext';
import { useAuth } from '../../context/AuthContext';
import { imprimirArqueo } from '../../logic/impresion';
import { exportarHistorialAExcel } from '../../logic/exportarVentas';
import { useHistorialVentas } from '../../hooks/useHistorialVentas';
import { usePlan } from '../../hooks/usePlan';
import type { MetodoPago } from '../../types';
import { labelMetodo, iconoMetodo, colorMetodo } from '../../config/metodosPago';
import type { VentaHistorial, DetalleVenta } from '../../hooks/useHistorialVentas';
import { Campo, Boton } from '../ui/ComponentesBase';
import PanelLateral from '../Usuario/PanelLateral';

const fmtEditado = (fecha: Date) => fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

const HistorialVentas = () => {
    const { ventas, arqueos, cargando, filtros, setFiltros, totalFiltrado, porMetodoFiltrado, recargar, cargarDetalleVenta, editarVenta } = useHistorialVentas();
    const { puede } = usePlan();
    const historialCompleto = puede('historial_completo');
    const { impresorasDeTickets } = useImpresoras();
    const { local, perfil } = useAuth();

    const metodosHabilitados = (local?.metodos_pago && local.metodos_pago.length > 0
        ? local.metodos_pago
        : ['efectivo']) as MetodoPago[];

    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [arqueoExpandido, setArqueoExpandido] = useState<string | null>(null);
    const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaHistorial | null>(null);
    const [exportando, setExportando] = useState(false);

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
    // Solo se puede editar una venta del arqueo que sigue abierto: los
    // agregados de un arqueo ya cerrado no se recalculan solos.
    const puedeEditar = (venta: VentaHistorial) =>
        perfil?.rol === 'admin' && !!arqueoAbierto && venta.arqueo_id === arqueoAbierto.id;

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

    // Exporta exactamente lo que se ve en pantalla: mismos filtros y mismo
    // límite de plan gratis (solo arqueo abierto) que ventasVisibles.
    const handleExportar = async () => {
        setExportando(true);
        try {
            const detallePorVenta: Record<string, DetalleVenta[]> = {};
            await Promise.all(ventasVisibles.map(async venta => {
                detallePorVenta[venta.id] = await cargarDetalleVenta(venta.id);
            }));
            exportarHistorialAExcel(ventasVisibles, detallePorVenta);
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">

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
                    <Boton
                        variante="secundario"
                        icono={<Download size={14} />}
                        onClick={handleExportar}
                        disabled={exportando || ventasVisibles.length === 0}
                    >
                        {exportando ? 'Generando...' : 'Exportar a Excel'}
                    </Boton>
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
                            <div key={metodo} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${colorMetodo(metodo)}`}>
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
                                            <div className="pt-3 mt-2 border-t border-stone-200">
                                                <p className="text-xs font-medium text-stone-400 uppercase mb-1.5">Ventas de esta caja</p>
                                                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
                                                    {ventasDelArqueo.map(venta => (
                                                        <FilaVentaTicket
                                                            key={venta.id}
                                                            venta={venta}
                                                            onClick={() => setVentaSeleccionada(venta)}
                                                        />
                                                    ))}
                                                </div>
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
            <div>
                <p className="text-xs font-medium text-stone-400 uppercase mb-1.5">Detalle de ventas</p>
                {ventasVisibles.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-sm">
                        No hay ventas registradas
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
                        {ventasVisibles.map(venta => (
                            <FilaVentaTicket
                                key={venta.id}
                                venta={venta}
                                onClick={() => setVentaSeleccionada(venta)}
                            />
                        ))}
                    </div>
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

            {/* Detalle completo de una venta, en panel lateral */}
            <PanelLateral
                titulo={ventaSeleccionada ? `Venta #${ventaSeleccionada.id.slice(-4).toUpperCase()}` : ''}
                abierto={ventaSeleccionada !== null}
                onCerrar={() => setVentaSeleccionada(null)}
            >
                {ventaSeleccionada && (
                    <DetalleVentaPanel
                        key={ventaSeleccionada.id}
                        venta={ventaSeleccionada}
                        cargarDetalle={cargarDetalleVenta}
                        puedeEditar={puedeEditar(ventaSeleccionada)}
                        metodosHabilitados={metodosHabilitados}
                        editarVenta={editarVenta}
                    />
                )}
            </PanelLateral>
        </div>
    );
};

// --- Fila densa tipo ticket: hora, preview de productos, método, total ---
interface FilaVentaTicketProps {
    venta: VentaHistorial;
    onClick: () => void;
}

const FilaVentaTicket = ({ venta, onClick }: FilaVentaTicketProps) => {
    const Icono = iconoMetodo(venta.metodo_pago);
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-stone-50 transition-colors text-left"
        >
            <span className="text-xs text-stone-400 tabular-nums shrink-0">
                {venta.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex-1 min-w-0 text-sm text-stone-600 truncate">
                {venta.resumenItems}
                {venta.editadoEn && (
                    <span className="text-stone-400"> · editado {fmtEditado(venta.editadoEn)}</span>
                )}
            </span>
            <Icono size={13} className="text-stone-400 shrink-0" />
            <span className="font-bold text-stone-900 text-sm shrink-0 tabular-nums">
                ${venta.total.toLocaleString()}
            </span>
        </button>
    );
};

// --- Contenido del panel lateral: método, fecha, detalle de productos y edición ---
interface DetalleVentaPanelProps {
    venta: VentaHistorial;
    cargarDetalle: (ventaId: string) => Promise<DetalleVenta[]>;
    puedeEditar: boolean;
    metodosHabilitados: MetodoPago[];
    editarVenta: (ventaId: string, cambios: { metodo_pago: MetodoPago; descuento: number }) => Promise<number>;
}

const DetalleVentaPanel = ({ venta, cargarDetalle, puedeEditar, metodosHabilitados, editarVenta }: DetalleVentaPanelProps) => {
    const [detalle, setDetalle] = useState<DetalleVenta[] | null>(null);
    const [editando, setEditando] = useState(false);
    const [metodoEdit, setMetodoEdit] = useState<MetodoPago>(venta.metodo_pago);
    const [descuentoEdit, setDescuentoEdit] = useState(String(venta.descuento));
    const [guardando, setGuardando] = useState(false);
    const [errorEdit, setErrorEdit] = useState('');
    const Icono = iconoMetodo(venta.metodo_pago);

    // El panel se remonta con key={venta.id} (ver donde se usa), así que acá
    // no hace falta resetear `detalle` a mano al cambiar de venta.
    useEffect(() => {
        let vigente = true;
        cargarDetalle(venta.id).then(items => { if (vigente) setDetalle(items); });
        return () => { vigente = false; };
    }, [venta.id, cargarDetalle]);

    // Subtotal de ítems (antes del descuento). Mientras el detalle no cargó,
    // se estima desde venta.total + venta.descuento (misma cuenta que hace el hook).
    const subtotalItems = detalle
        ? detalle.reduce((acc, i) => acc + i.subtotal, 0)
        : venta.total + venta.descuento;
    const descuentoNum = parseFloat(descuentoEdit) || 0;
    const totalPreview = Math.max(0, subtotalItems - descuentoNum);

    const handleGuardar = async () => {
        setGuardando(true);
        setErrorEdit('');
        try {
            await editarVenta(venta.id, { metodo_pago: metodoEdit, descuento: descuentoNum });
            setEditando(false);
        } catch {
            setErrorEdit('No se pudo guardar el cambio.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-50 rounded-xl shrink-0">
                        <History size={18} className="text-violet-700" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-stone-800 capitalize">
                            {venta.fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-xs text-stone-400">
                            {venta.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            {venta.editadoEn && ` · editado ${fmtEditado(venta.editadoEn)}`}
                        </p>
                    </div>
                </div>
                {!editando && (
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium shrink-0 ${colorMetodo(venta.metodo_pago)}`}>
                        <Icono size={12} />
                        {labelMetodo(venta.metodo_pago)}
                    </span>
                )}
            </div>

            <div className="border-t border-stone-100 pt-3">
                {detalle === null ? (
                    <p className="text-xs text-stone-400 text-center py-4">Cargando detalle...</p>
                ) : detalle.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-4">Sin detalle disponible</p>
                ) : (
                    <div className="space-y-2">
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
                )}
            </div>

            {editando ? (
                <div className="border-t border-stone-200 pt-3 space-y-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-stone-500">Método de pago</label>
                        <select
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                            value={metodoEdit}
                            onChange={e => setMetodoEdit(e.target.value as MetodoPago)}
                        >
                            {metodosHabilitados.map(m => (
                                <option key={m} value={m}>{labelMetodo(m)}</option>
                            ))}
                        </select>
                    </div>
                    <Campo
                        etiqueta="Descuento ($)"
                        type="number"
                        min="0"
                        value={descuentoEdit}
                        onChange={e => setDescuentoEdit(e.target.value)}
                    />
                    <div className="flex items-center justify-between text-sm bg-stone-50 rounded-xl px-3 py-2">
                        <span className="text-stone-500">Nuevo total</span>
                        <span className="font-bold text-stone-800">${totalPreview.toLocaleString()}</span>
                    </div>
                    {errorEdit && <p className="text-xs text-red-500">{errorEdit}</p>}
                    <div className="flex gap-2">
                        <Boton variante="secundario" className="flex-1" onClick={() => setEditando(false)} disabled={guardando}>
                            Cancelar
                        </Boton>
                        <Boton variante="primario" className="flex-1" onClick={handleGuardar} disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </Boton>
                    </div>
                </div>
            ) : puedeEditar && (
                <Boton variante="secundario" icono={<Pencil size={14} />} className="w-full" onClick={() => setEditando(true)}>
                    Editar venta
                </Boton>
            )}

            <div className="flex items-center justify-between border-t border-stone-200 pt-3">
                <span className="font-bold text-stone-700">Total</span>
                <span className="text-xl font-black text-stone-900">${venta.total.toLocaleString()}</span>
            </div>
        </div>
    );
};

export default HistorialVentas;