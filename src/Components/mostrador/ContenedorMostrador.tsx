import { useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, X, ChevronDown, AlertTriangle } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import { useMostrador } from '../../context/MostradorContext';
import { useVentas } from '../../context/VentasContext';
import { useAuth } from '../../context/AuthContext';
import { labelMetodo } from '../../config/metodosPago';
import type { MetodoPago } from '../../types';
import TecladoCantidad from './TecladoCantidad';
import type { Producto } from '../../types';

const ContenedorMostrador = () => {
    const { productos, categorias, cargando } = useMenu();
    const { carrito, total, agregar, quitar, aumentar, disminuir, vaciar, cobrar } = useMostrador();
    const { arqueoActivo } = useVentas();
    const { local } = useAuth();
    const [productoGranel, setProductoGranel] = useState<Producto | null>(null);

    const metodosHabilitados = (local?.metodos_pago && local.metodos_pago.length > 0
        ? local.metodos_pago
        : ['efectivo']) as MetodoPago[];

    const [busqueda, setBusqueda] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [cobrando, setCobrando] = useState(false);
    const [metodoElegido, setMetodoElegido] = useState<MetodoPago>(metodosHabilitados[0]);
    const [procesando, setProcesando] = useState(false);

    const productosFiltrados = productos.filter(p => {
        if (!p.activo) return false;
        const cat = categorias.find(c => c.id === categoriaActiva);
        const porCategoria = !categoriaActiva || p.categoria === cat?.nombre;
        const porBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        return porCategoria && porBusqueda;
    });

    const handleCobrar = async () => {
        setProcesando(true);
        try {
            await cobrar(metodoElegido);
            setCobrando(false);
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
                {/* Buscador + categorías */}
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

                {/* Grilla de productos */}
                <div className="flex-1 overflow-y-auto">
                    {productosFiltrados.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-stone-400 text-sm">
                            No hay productos disponibles
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 content-start">
                            {productosFiltrados.map(prod => (
                                <button
                                    key={prod.id}
                                    onClick={() => {
                                        if (prod.tipo_venta === 'granel') {
                                            setProductoGranel(prod);   // abre el teclado
                                        } else {
                                            agregar(prod);              // suma 1 como siempre
                                        }
                                    }}
                                    className="bg-white border border-stone-200 rounded-2xl p-3 text-left hover:border-violet-300 hover:shadow-md transition-all active:scale-95"
                                >
                                    <p className="font-medium text-stone-800 text-sm truncate">{prod.nombre}</p>
                                    <p className="text-xs text-stone-400 mb-2">{prod.categoria ?? 'Sin categoría'}</p>
                                    <p className="font-black text-stone-900">${prod.precio_venta.toLocaleString()}</p>
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
                        <div className="flex flex-col items-center justify-center h-full text-stone-300 text-sm py-8">
                            <ShoppingCart size={32} className="mb-2" />
                            Tocá un producto para agregarlo
                        </div>
                    ) : (
                        carrito.map(item => (
                            <div key={item.id} className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-stone-800 truncate">{item.nombre}</p>
                                    <p className="text-xs text-stone-400">${item.precio.toLocaleString()} c/u</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => disminuir(item.id)} className="w-6 h-6 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center hover:bg-stone-100">
                                        <Minus size={12} />
                                    </button>
                                    <span className="w-6 text-center text-sm font-bold">{item.cantidad}</span>
                                    <button onClick={() => aumentar(item.id)} className="w-6 h-6 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center hover:bg-stone-100">
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <button onClick={() => quitar(item.id)} className="text-stone-300 hover:text-red-500 p-1">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Total + cobro */}
                <div className="border-t border-stone-200 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-stone-500">Total</span>
                        <span className="text-2xl font-black text-stone-900">${total.toLocaleString()}</span>
                    </div>

                    {!cobrando ? (
                        <button
                            onClick={() => setCobrando(true)}
                            disabled={carrito.length === 0}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                        >
                            Cobrar
                        </button>
                    ) : !arqueoActivo ? (
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                <p className="text-xs text-amber-700">
                                    No hay caja abierta. Abrila desde Ventas → Arqueo.
                                </p>
                            </div>
                            <button onClick={() => setCobrando(false)} className="mt-2 w-full bg-amber-100 text-amber-700 py-1.5 rounded-lg text-xs font-medium">
                                Entendido
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
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
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCobrar}
                                    disabled={procesando}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2 rounded-xl flex items-center justify-center gap-1 text-sm font-bold"
                                >
                                    <Check size={16} /> {procesando ? 'Cobrando...' : 'Confirmar'}
                                </button>
                                <button
                                    onClick={() => setCobrando(false)}
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
        </div>
    );
};

export default ContenedorMostrador;