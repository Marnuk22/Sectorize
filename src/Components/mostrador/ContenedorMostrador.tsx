import { useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, X, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import { useMostrador } from '../../context/MostradorContext';
import { useVentas } from '../../context/VentasContext';
import { useAuth } from '../../context/AuthContext';
import { labelMetodo } from '../../config/metodosPago';
import type { MetodoPago } from '../../types';
import TecladoCantidad from './TecladoCantidad';
import type { Producto } from '../../types';
import { useImpresoras } from '../../context/ImpresorasContext';
import { imprimirTicket } from '../../logic/impresion';
import { UNIDADES } from '../../config/unidades';
import { useEscaner } from '../../hooks/useEscaner';
import { useFavoritos } from '../../hooks/useFavoritos';

type TipoDescuento = 'monto' | 'porcentaje';

const ContenedorMostrador = () => {
    const { productos, categorias, cargando } = useMenu();
    const { carrito, total, agregar, quitar, aumentar, disminuir, vaciar, cobrar } = useMostrador();
    const { arqueoActivo } = useVentas();
    const { local } = useAuth();
    const { impresorasDeTickets } = useImpresoras();
    const [productoGranel, setProductoGranel] = useState<Producto | null>(null);
    const { favoritos } = useFavoritos();

    const metodosHabilitados = (local?.metodos_pago && local.metodos_pago.length > 0
        ? local.metodos_pago
        : ['efectivo']) as MetodoPago[];

    const [busqueda, setBusqueda] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [cobrando, setCobrando] = useState(false);
    const [metodoElegido, setMetodoElegido] = useState<MetodoPago>(metodosHabilitados[0]);
    const [procesando, setProcesando] = useState(false);

    // Descuento
    const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento>('monto');
    const [valorDescuento, setValorDescuento] = useState('');
    // Pago / vuelto
    const [pagaCon, setPagaCon] = useState('');
    // Confirmación visual
    const [exito, setExito] = useState<{ vuelto: number } | null>(null);

    // Escaneo de código de barras
    const [avisoEscaner, setAvisoEscaner] = useState<string | null>(null);

    const handleEscaneo = (codigo: string) => {
        const prod = productos.find(p => p.codigo_barras === codigo);
        if (!prod) {
            setAvisoEscaner(`No se encontró un producto con el código ${codigo}`);
            setTimeout(() => setAvisoEscaner(null), 3000);
            return;
        }
        if (!prod.activo) {
            setAvisoEscaner(`"${prod.nombre}" está inactivo`);
            setTimeout(() => setAvisoEscaner(null), 3000);
            return;
        }
        // Producto a granel: no se puede escanear directo (necesita peso), abrir teclado
        if (prod.tipo_venta === 'granel') {
            setProductoGranel(prod);
            return;
        }
        // Producto por unidad: sumar al carrito
        agregar(prod);
        setAvisoEscaner(`✓ ${prod.nombre} agregado`);
        setTimeout(() => setAvisoEscaner(null), 1500);
    };

    // Activar el escáner solo cuando no se está cobrando
    useEscaner(handleEscaneo, !cobrando);

    const productosFiltrados = productos.filter(p => {
        if (!p.activo) return false;
        const cat = categorias.find(c => c.id === categoriaActiva);
        const porCategoria = !categoriaActiva || p.categoria === cat?.nombre;
        const porBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        return porCategoria && porBusqueda;
    });

    // Los favoritos van primero en la grilla
    const idsFavoritos = new Set(favoritos.map(f => f.id));
    const productosOrdenados = [...productosFiltrados].sort((a, b) => {
        const aFav = idsFavoritos.has(a.id) ? 0 : 1;
        const bFav = idsFavoritos.has(b.id) ? 0 : 1;
        return aFav - bFav;
    });

    // Cálculos del cobro
    const valorNum = parseFloat(valorDescuento) || 0;
    const descuento = tipoDescuento === 'porcentaje'
        ? Math.round(total * (valorNum / 100))
        : valorNum;
    const descuentoAplicado = Math.min(descuento, total);
    const totalFinal = total - descuentoAplicado;

    const esEfectivo = metodoElegido === 'efectivo';
    const pagaConNum = parseFloat(pagaCon) || 0;
    const vuelto = esEfectivo && pagaConNum > totalFinal ? pagaConNum - totalFinal : 0;

    const resetCobro = () => {
        setCobrando(false);
        setValorDescuento('');
        setPagaCon('');
    };

    const handleCobrar = async () => {
        setProcesando(true);
        try {
            const itemsTicket = [...carrito];
            const subtotalTicket = total;
            const descTicket = descuentoAplicado;
            const totalTicket = totalFinal;
            const vueltoFinal = vuelto;

            // Cobrar primero (registra y vacía)
            await cobrar(metodoElegido, totalFinal);

            // Imprimir después (no bloquea el cobro)
            try {
                await imprimirTicket({
                    local: local?.nombre ?? 'Vallis',
                    items: itemsTicket,
                    subtotal: subtotalTicket,
                    descuento: descTicket > 0 ? descTicket : undefined,
                    total: totalTicket,
                    metodoPago: labelMetodo(metodoElegido),
                    impresoras: impresorasDeTickets().map(i => i.nombre_sistema),
                });
            } catch (errImpresion) {
                console.error('Error al imprimir el ticket:', errImpresion);
            }

            // Confirmación visual
            resetCobro();
            setExito({ vuelto: vueltoFinal });
            setTimeout(() => setExito(null), 3500);
        } catch (err) {
            console.error('Error al cobrar:', err);
        } finally {
            setProcesando(false);
        }
    };

    if (cargando) return (
        <div className="flex items-center justify-center h-full bg-white">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="h-full bg-white overflow-hidden flex flex-col lg:flex-row gap-4 p-4">
            {/* Columna productos */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="space-y-3 mb-3 shrink-0">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Buscar producto..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                        <button
                            onClick={() => setCategoriaActiva(null)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm transition-colors ${!categoriaActiva ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                        >
                            Todos
                        </button>
                        {categorias.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? null : cat.id)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm transition-colors ${categoriaActiva === cat.id ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {productosFiltrados.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-stone-400 text-sm">
                            No hay productos disponibles
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 content-start">
                            {productosOrdenados.map(prod => (
                                <button
                                    key={prod.id}
                                    onClick={() => {
                                        if (prod.tipo_venta === 'granel') {
                                            setProductoGranel(prod);
                                        } else {
                                            agregar(prod);
                                        }
                                    }}
                                    className="bg-white border border-stone-200 rounded-2xl p-3 text-left hover:border-violet-300 hover:shadow-md transition-all active:scale-95"
                                >
                                    <p className="font-medium text-stone-800 text-sm truncate">{prod.nombre}</p>
                                    <p className="text-xs text-stone-400 mb-2">{prod.categoria ?? 'Sin categoría'}</p>
                                    <p className="font-black text-stone-900">
                                        ${prod.precio_venta.toLocaleString()}
                                        {prod.tipo_venta === 'granel' && (
                                            <span className="text-xs font-normal text-stone-400"> /{UNIDADES[prod.unidad_medida].label}</span>
                                        )}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Columna carrito */}
            <div className="w-full lg:w-80 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col min-h-0 lg:h-full">
                <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={18} className="text-violet-600" />
                        <h3 className="font-bold text-stone-800">Carrito</h3>
                        {carrito.length > 0 && (
                            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                                {carrito.length}
                            </span>
                        )}
                    </div>
                    {carrito.length > 0 && (
                        <button onClick={vaciar} className="text-xs text-red-400 hover:text-red-600">
                            Vaciar
                        </button>
                    )}
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
                    {carrito.length === 0 ? (
                        exito ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <CheckCircle2 size={44} className="text-green-500 mb-2" />
                                <p className="font-bold text-stone-800">Venta registrada</p>
                                {exito.vuelto > 0 && (
                                    <p className="text-sm text-stone-500 mt-1">
                                        Vuelto: <span className="font-bold text-green-600">${exito.vuelto.toLocaleString()}</span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-stone-300 text-sm py-8">
                                <ShoppingCart size={32} className="mb-2" />
                                Tocá un producto para agregarlo
                            </div>
                        )
                    ) : (
                        carrito.map(item => {
                            const esGranel = item.tipo_venta === 'granel';
                            const unidadLabel = item.unidad_medida ? UNIDADES[item.unidad_medida].label : '';
                            return (
                                <div key={item.id} className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-stone-800 truncate">{item.nombre}</p>
                                        <p className="text-xs text-stone-400">
                                            {esGranel
                                                ? `${item.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${unidadLabel} × $${item.precio.toLocaleString()}`
                                                : `$${item.precio.toLocaleString()} c/u`}
                                        </p>
                                    </div>
                                    {esGranel ? (
                                        // Granel: mostrar el subtotal, sin botones +/-
                                        <span className="text-sm font-bold text-stone-700">
                                            ${(item.precio * item.cantidad).toLocaleString()}
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => disminuir(item.id)} className="w-6 h-6 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center hover:bg-stone-100">
                                                <Minus size={12} />
                                            </button>
                                            <span className="w-6 text-center text-sm font-bold">{item.cantidad}</span>
                                            <button onClick={() => aumentar(item.id)} className="w-6 h-6 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center hover:bg-stone-100">
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    )}
                                    <button onClick={() => quitar(item.id)} className="text-stone-300 hover:text-red-500 p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Total + cobro */}
                <div className="border-t border-stone-200 p-4 space-y-3">
                    {!cobrando ? (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-stone-500">Total</span>
                                <span className="text-2xl font-black text-stone-900">${total.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => setCobrando(true)}
                                disabled={carrito.length === 0}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Cobrar
                            </button>
                        </>
                    ) : !arqueoActivo ? (
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                <p className="text-xs text-amber-700">
                                    No hay caja abierta. Abrila desde Ventas → Arqueo.
                                </p>
                            </div>
                            <button onClick={resetCobro} className="mt-2 w-full bg-amber-100 text-amber-700 py-1.5 rounded-lg text-xs font-medium">
                                Entendido
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Método de pago */}
                            <div className="relative">
                                <select
                                    value={metodoElegido}
                                    onChange={e => setMetodoElegido(e.target.value as MetodoPago)}
                                    className="w-full appearance-none bg-white border border-stone-200 rounded-xl px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                >
                                    {metodosHabilitados.map(m => (
                                        <option key={m} value={m}>{labelMetodo(m)}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-2.5 text-stone-400 pointer-events-none" size={16} />
                            </div>

                            {/* Descuento */}
                            <div className="flex gap-2">
                                <select
                                    value={tipoDescuento}
                                    onChange={e => setTipoDescuento(e.target.value as TipoDescuento)}
                                    className="bg-white border border-stone-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                >
                                    <option value="monto">$</option>
                                    <option value="porcentaje">%</option>
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    value={valorDescuento}
                                    onChange={e => setValorDescuento(e.target.value)}
                                    placeholder="Descuento"
                                    className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            </div>

                            {/* Paga con (solo efectivo) */}
                            {esEfectivo && (
                                <input
                                    type="number"
                                    min="0"
                                    value={pagaCon}
                                    onChange={e => setPagaCon(e.target.value)}
                                    placeholder="Paga con..."
                                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                />
                            )}

                            {/* Resumen */}
                            <div className="bg-white rounded-xl p-3 border border-stone-200 space-y-1 text-sm">
                                <div className="flex justify-between text-stone-500">
                                    <span>Subtotal</span>
                                    <span>${total.toLocaleString()}</span>
                                </div>
                                {descuentoAplicado > 0 && (
                                    <div className="flex justify-between text-red-500">
                                        <span>Descuento</span>
                                        <span>-${descuentoAplicado.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-stone-800 text-base pt-1 border-t border-stone-100">
                                    <span>Total</span>
                                    <span>${totalFinal.toLocaleString()}</span>
                                </div>
                                {esEfectivo && vuelto > 0 && (
                                    <div className="flex justify-between text-green-600 font-bold pt-1">
                                        <span>Vuelto</span>
                                        <span>${vuelto.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCobrar}
                                    disabled={procesando}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl flex items-center justify-center gap-1 text-sm font-bold"
                                >
                                    <Check size={16} /> {procesando ? 'Cobrando...' : `Cobrar $${totalFinal.toLocaleString()}`}
                                </button>
                                <button
                                    onClick={resetCobro}
                                    className="bg-stone-200 text-stone-600 px-3 rounded-xl hover:bg-stone-300"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {productoGranel && (
                <TecladoCantidad
                    producto={productoGranel}
                    onConfirmar={(cantidad) => agregar(productoGranel, cantidad)}
                    onCerrar={() => setProductoGranel(null)}
                />
            )}

            {avisoEscaner && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                    {avisoEscaner}
                </div>
            )}
        </div>
    );
};

export default ContenedorMostrador;