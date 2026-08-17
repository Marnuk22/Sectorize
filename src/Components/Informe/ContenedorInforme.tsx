import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, ShoppingBag, Receipt, BarChart3, Store } from 'lucide-react';
import { useHistorialVentas } from '../../hooks/useHistorialVentas';
import type { DetalleVenta } from '../../hooks/useHistorialVentas';
import { useAuth } from '../../context/AuthContext';
import { exportarInformeAExcel } from '../../logic/exportarVentas';
import { labelMetodo, iconoMetodo } from '../../config/metodosPago';
import { formatearCantidad, type UnidadMedida } from '../../config/unidades';
import { Tarjeta, SeccionDatos, Boton, Campo, EstadoVacio } from '../ui/ComponentesBase';

type Periodo = 'hoy' | 'mes_actual' | 'mes_pasado' | 'personalizado';

const PERIODOS: { id: Periodo; label: string }[] = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'mes_actual', label: 'Este mes' },
    { id: 'mes_pasado', label: 'Mes pasado' },
    { id: 'personalizado', label: 'Personalizado' },
];

// Colores fijos por método para el gráfico de torta (recharts no entiende
// clases Tailwind, necesita hex). "Otros" agrupa métodos custom más allá
// del top 4 para no romper la legibilidad de la torta.
const COLOR_METODO: Record<string, string> = {
    efectivo: '#16a34a',
    tarjeta: '#2563eb',
    transferencia: '#9333ea',
};
const COLOR_OTROS = '#a8a29e';
const LIMITE_PORCIONES_TORTA = 5;

const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
};

const rangoDePeriodo = (periodo: Periodo, personalizado: { desde: string; hasta: string }) => {
    const hoy = new Date();
    if (periodo === 'hoy') {
        const ymd = toYMD(hoy);
        return { desde: ymd, hasta: ymd };
    }
    if (periodo === 'mes_actual') {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        return { desde: toYMD(inicio), hasta: toYMD(hoy) };
    }
    if (periodo === 'mes_pasado') {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        return { desde: toYMD(inicio), hasta: toYMD(fin) };
    }
    return personalizado;
};

interface FilaRanking {
    nombre: string;
    cantidad: number;
    subtotal: number;
    unidadMedida: UnidadMedida;
}

const ContenedorInforme = () => {
    const { sucursales } = useAuth();
    const { ventas, cargando, setFiltros, cargarDetalleVenta, sucursalFiltro, setSucursalFiltro } =
        useHistorialVentas({ consolidarPorDefecto: true });

    const [periodo, setPeriodo] = useState<Periodo>('mes_actual');
    const [personalizado, setPersonalizado] = useState({ desde: '', hasta: '' });
    const [detallePorVenta, setDetallePorVenta] = useState<Record<string, DetalleVenta[]>>({});
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const { desde, hasta } = rangoDePeriodo(periodo, personalizado);

    // Traduce el período elegido a los filtros de fecha del hook (mismo hook
    // que usa Historial, ver useHistorialVentas.ts).
    useEffect(() => {
        if (periodo === 'personalizado' && (!personalizado.desde || !personalizado.hasta)) return;
        setFiltros(f => ({ ...f, metodo: 'todos', arqueo_id: 'todos', fecha_desde: desde, fecha_hasta: hasta }));
    }, [periodo, personalizado.desde, personalizado.hasta]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clave por contenido (no por referencia): cambia cuando el conjunto de
    // ventas cambia de verdad (nuevo período, o el hook termina de cargar de
    // forma asíncrona), pero no en cada render donde `ventas` es una nueva
    // referencia con el mismo contenido (useHistorialVentas recalcula el
    // filtro con .filter() en cada render).
    const ventasClave = ventas.map(v => v.id).join(',');

    // Detalle de ítems de cada venta del período (cache caliente del hook,
    // no dispara queries nuevas en el caso típico). Separado del resto para
    // no bloquear el resumen/gráficos mientras se arma el ranking.
    useEffect(() => {
        let vigente = true;

        const cargarDetalles = async () => {
            // Si no hay ventas, el contenido ya cae en el estado vacío (más
            // abajo) y ni el ranking ni detallePorVenta llegan a renderizarse.
            if (ventas.length === 0) return;
            setCargandoDetalle(true);
            const entradas = await Promise.all(ventas.map(async v => [v.id, await cargarDetalleVenta(v.id)] as const));
            if (!vigente) return;
            setDetallePorVenta(Object.fromEntries(entradas));
            setCargandoDetalle(false);
        };

        cargarDetalles();
        return () => { vigente = false; };
    }, [ventasClave]); // eslint-disable-line react-hooks/exhaustive-deps

    const totalPeriodo = useMemo(
        () => ventas.reduce((acc, v) => v.estado === 'cerrada' ? acc + v.total : acc, 0),
        [ventas]
    );
    const cantidadVentas = useMemo(() => ventas.filter(v => v.estado === 'cerrada').length, [ventas]);
    const ticketPromedio = cantidadVentas > 0 ? totalPeriodo / cantidadVentas : 0;

    const ventasPorDia = useMemo(() => {
        const inicio = new Date(desde + 'T00:00:00');
        const fin = new Date(hasta + 'T00:00:00');
        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return [];
        const dias: { fecha: string; etiqueta: string; total: number }[] = [];
        for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
            dias.push({ fecha: toYMD(d), etiqueta: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), total: 0 });
        }
        const porDia = new Map(dias.map(d => [d.fecha, d]));
        for (const v of ventas) {
            if (v.estado !== 'cerrada') continue;
            const entrada = porDia.get(toYMD(v.fecha));
            if (entrada) entrada.total += v.total;
        }
        return dias;
    }, [ventas, desde, hasta]);

    const resumenTextoBarras = useMemo(() => {
        if (ventasPorDia.length === 0) return '';
        const mejor = ventasPorDia.reduce((max, d) => d.total > max.total ? d : max, ventasPorDia[0]);
        return `Ventas por día del período: total $${totalPeriodo.toLocaleString('es-AR')}. Día de mayor venta: ${mejor.etiqueta} con $${mejor.total.toLocaleString('es-AR')}.`;
    }, [ventasPorDia, totalPeriodo]);

    const ranking = useMemo(() => {
        const acc = new Map<string, FilaRanking>();
        for (const venta of ventas) {
            if (venta.estado !== 'cerrada') continue;
            const items = detallePorVenta[venta.id] ?? [];
            for (const item of items) {
                const existente = acc.get(item.nombre);
                if (existente) {
                    existente.cantidad += item.cantidad;
                    existente.subtotal += item.subtotal;
                } else {
                    acc.set(item.nombre, {
                        nombre: item.nombre,
                        cantidad: item.cantidad,
                        subtotal: item.subtotal,
                        unidadMedida: (item.unidad_medida as UnidadMedida) ?? 'unidad',
                    });
                }
            }
        }
        return Array.from(acc.values()).sort((a, b) => b.cantidad - a.cantidad);
    }, [ventas, detallePorVenta]);

    const porMetodo = useMemo(() => {
        const acc: Record<string, number> = {};
        for (const v of ventas) {
            if (v.estado !== 'cerrada') continue;
            acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total;
        }
        let entradas = Object.entries(acc).sort((a, b) => b[1] - a[1]);
        if (entradas.length > LIMITE_PORCIONES_TORTA) {
            const principales = entradas.slice(0, LIMITE_PORCIONES_TORTA - 1);
            const restoTotal = entradas.slice(LIMITE_PORCIONES_TORTA - 1).reduce((s, [, v]) => s + v, 0);
            entradas = [...principales, ['otros', restoTotal]];
        }
        return entradas.map(([metodo, total]) => ({
            metodo,
            total,
            color: metodo === 'otros' ? COLOR_OTROS : (COLOR_METODO[metodo] ?? COLOR_OTROS),
        }));
    }, [ventas]);

    const consolidando = sucursalFiltro === 'todas' && sucursales.length > 1;

    const desglosePorSucursal = useMemo(() => {
        if (!consolidando) return [];
        const acc = new Map<string, { local_id: string; nombre: string; total: number; cantidad: number }>();
        for (const v of ventas) {
            if (v.estado !== 'cerrada') continue;
            const nombre = sucursales.find(s => s.id === v.local_id)?.nombre ?? 'Sucursal';
            const entrada = acc.get(v.local_id) ?? { local_id: v.local_id, nombre, total: 0, cantidad: 0 };
            entrada.total += v.total;
            entrada.cantidad += 1;
            acc.set(v.local_id, entrada);
        }
        return Array.from(acc.values()).sort((a, b) => b.total - a.total);
    }, [ventas, consolidando, sucursales]);

    const handleExportar = () => {
        exportarInformeAExcel({
            resumen: { desde, hasta, totalVendido: totalPeriodo, cantidadVentas, ticketPromedio },
            ventasPorDia: ventasPorDia.map(d => ({ fecha: d.fecha, total: d.total })),
            ranking,
            porMetodo,
            porSucursal: desglosePorSucursal.map(({ nombre, total, cantidad }) => ({ nombre, total, cantidad })),
        });
    };

    // Gate de plan futuro: cuando se quiera activar "Informe" como feature
    // premium, envolver este return con
    // `puede('reportes') ? <>...</> : <FeatureBloqueada .../>`
    // (usePlan().puede ya soporta 'reportes', ver src/config/planes.ts).
    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="text-lg font-bold text-stone-800">Informe</h2>
                    <Boton
                        variante="secundario"
                        icono={<Download size={14} />}
                        onClick={handleExportar}
                        disabled={ventas.length === 0 || cargandoDetalle}
                    >
                        {cargandoDetalle ? 'Cargando...' : 'Exportar informe a Excel'}
                    </Boton>
                </div>

                {/* Selector de período */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1 bg-stone-100 p-1 rounded-xl" role="group" aria-label="Período del informe">
                        {PERIODOS.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                aria-pressed={periodo === p.id}
                                onClick={() => setPeriodo(p.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    periodo === p.id ? 'bg-white text-violet-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {periodo === 'personalizado' && (
                        <div className="flex items-center gap-2">
                            <Campo
                                etiqueta="Desde"
                                type="date"
                                value={personalizado.desde}
                                onChange={e => setPersonalizado(p => ({ ...p, desde: e.target.value }))}
                            />
                            <Campo
                                etiqueta="Hasta"
                                type="date"
                                value={personalizado.hasta}
                                onChange={e => setPersonalizado(p => ({ ...p, hasta: e.target.value }))}
                            />
                        </div>
                    )}
                </div>

                {/* Selector de sucursal — solo aparece si el negocio tiene más de una */}
                {sucursales.length > 1 && (
                    <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit" role="group" aria-label="Sucursal del informe">
                        <button
                            type="button"
                            aria-pressed={sucursalFiltro === 'todas'}
                            onClick={() => setSucursalFiltro('todas')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                sucursalFiltro === 'todas' ? 'bg-white text-violet-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            Todas las sucursales
                        </button>
                        {sucursales.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                aria-pressed={sucursalFiltro === s.id}
                                onClick={() => setSucursalFiltro(s.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    sucursalFiltro === s.id ? 'bg-white text-violet-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                                }`}
                            >
                                {s.nombre}
                            </button>
                        ))}
                    </div>
                )}

                {cargando ? (
                    <div className="flex items-center justify-center py-16" aria-busy="true">
                        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : ventas.length === 0 ? (
                    <EstadoVacio
                        icono={<BarChart3 size={32} className="text-stone-300" />}
                        titulo="No hay ventas en este período"
                        descripcion="Probá con otro rango de fechas."
                    />
                ) : (
                    <>
                        {/* Resumen del período */}
                        <section aria-labelledby="informe-resumen-heading">
                            <h3 id="informe-resumen-heading" className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">
                                Resumen del período
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <SeccionDatos
                                    etiqueta="Total vendido"
                                    icono={<TrendingUp size={14} className="text-violet-500" />}
                                    valor={`$${totalPeriodo.toLocaleString('es-AR')}`}
                                />
                                <SeccionDatos
                                    etiqueta="Cantidad de ventas"
                                    icono={<ShoppingBag size={14} className="text-violet-500" />}
                                    valor={cantidadVentas}
                                />
                                <SeccionDatos
                                    etiqueta="Ticket promedio"
                                    icono={<Receipt size={14} className="text-violet-500" />}
                                    valor={`$${Math.round(ticketPromedio).toLocaleString('es-AR')}`}
                                />
                            </div>
                        </section>

                        {/* Por sucursal — solo en la vista consolidada */}
                        {consolidando && desglosePorSucursal.length > 0 && (
                            <section aria-labelledby="informe-sucursal-heading">
                                <h3 id="informe-sucursal-heading" className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">
                                    Por sucursal
                                </h3>
                                <Tarjeta padding="none" className="overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-stone-200 text-left text-xs text-stone-400 uppercase">
                                                    <th scope="col" className="px-4 py-2.5 font-medium">Sucursal</th>
                                                    <th scope="col" className="px-4 py-2.5 font-medium text-right">Cantidad de ventas</th>
                                                    <th scope="col" className="px-4 py-2.5 font-medium text-right">Total vendido</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {desglosePorSucursal.map(fila => (
                                                    <tr key={fila.local_id}>
                                                        <td className="px-4 py-2.5 text-stone-700 flex items-center gap-2">
                                                            <Store size={14} className="text-stone-400" />
                                                            {fila.nombre}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-stone-600 tabular-nums">{fila.cantidad}</td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-stone-800 tabular-nums">
                                                            ${fila.total.toLocaleString('es-AR')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Tarjeta>
                            </section>
                        )}

                        {/* Ventas por día */}
                        <section aria-labelledby="informe-dia-heading">
                            <h3 id="informe-dia-heading" className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">
                                Ventas por día
                            </h3>
                            <Tarjeta>
                                <div style={{ width: '100%', height: 220 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={ventasPorDia}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                                            <XAxis
                                                dataKey="etiqueta"
                                                tick={{ fontSize: 11, fill: '#a8a29e' }}
                                                axisLine={{ stroke: '#e7e5e4' }}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: '#a8a29e' }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={48}
                                                tickFormatter={(v: number) => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`}
                                            />
                                            <Tooltip
                                                formatter={(value) => [`$${Number(value).toLocaleString('es-AR')}`, 'Total']}
                                                contentStyle={{ borderRadius: 12, borderColor: '#e7e5e4', fontSize: 13 }}
                                            />
                                            <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="sr-only">{resumenTextoBarras}</p>
                            </Tarjeta>
                        </section>

                        {/* Ranking de productos */}
                        <section aria-labelledby="informe-ranking-heading">
                            <h3 id="informe-ranking-heading" className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">
                                Ranking de productos
                            </h3>
                            <Tarjeta padding="none" className="overflow-hidden">
                                {cargandoDetalle ? (
                                    <p className="text-sm text-stone-400 text-center py-8" aria-busy="true">Calculando ranking...</p>
                                ) : ranking.length === 0 ? (
                                    <p className="text-sm text-stone-400 text-center py-8">Sin productos vendidos en este período</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-stone-200 text-left text-xs text-stone-400 uppercase">
                                                    <th scope="col" className="px-4 py-2.5 font-medium">Producto</th>
                                                    <th scope="col" className="px-4 py-2.5 font-medium text-right">Cantidad</th>
                                                    <th scope="col" className="px-4 py-2.5 font-medium text-right">Total facturado</th>
                                                    <th scope="col" className="px-4 py-2.5 font-medium text-right">% del total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {ranking.map(fila => (
                                                    <tr key={fila.nombre}>
                                                        <td className="px-4 py-2.5 text-stone-700">{fila.nombre}</td>
                                                        <td className="px-4 py-2.5 text-right text-stone-600 tabular-nums">
                                                            {formatearCantidad(fila.cantidad, fila.unidadMedida)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-stone-800 tabular-nums">
                                                            ${fila.subtotal.toLocaleString('es-AR')}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-stone-500 tabular-nums">
                                                            {totalPeriodo > 0 ? ((fila.subtotal / totalPeriodo) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Tarjeta>
                        </section>

                        {/* Por método de pago */}
                        <section aria-labelledby="informe-metodo-heading">
                            <h3 id="informe-metodo-heading" className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">
                                Por método de pago
                            </h3>
                            <Tarjeta className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div style={{ width: '100%', height: 200 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={porMetodo}
                                                dataKey="total"
                                                nameKey="metodo"
                                                outerRadius={80}
                                                isAnimationActive={false}
                                                label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                            >
                                                {porMetodo.map(entrada => (
                                                    <Cell key={entrada.metodo} fill={entrada.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-AR')}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <ul className="space-y-2">
                                    {porMetodo.map(entrada => {
                                        const Icono = iconoMetodo(entrada.metodo);
                                        const pct = totalPeriodo > 0 ? (entrada.total / totalPeriodo) * 100 : 0;
                                        return (
                                            <li key={entrada.metodo} className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-stone-600">
                                                    <Icono size={14} className="text-stone-400" />
                                                    {labelMetodo(entrada.metodo)}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <span className="font-bold text-stone-800 tabular-nums">
                                                        ${entrada.total.toLocaleString('es-AR')}
                                                    </span>
                                                    <span className="text-xs text-stone-400 tabular-nums">{pct.toFixed(1)}%</span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Tarjeta>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default ContenedorInforme;
