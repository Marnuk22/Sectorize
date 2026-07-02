import { useState } from 'react';
import { Plus, Search, Edit, Package, Eye, EyeOff, Trash2, Upload } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import type { Producto } from '../../types';
import ModalProducto from '../Inventario/ModalProducto';
import ModalStock from '../Inventario/ModalStock';
import ModalImportar from '../Inventario/ModalImportar';

const ContenedorInventario = () => {
    const { productos, categorias, cargando, toggleActivo, agregarCategoria, borrarCategoria, borrarProducto  } = useMenu();
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [modalProducto, setModalProducto] = useState<Producto | null | undefined>(undefined);
    const [modalStock, setModalStock] = useState<Producto | null>(null);
    const [modalImportar, setModalImportar] = useState(false);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [agregandoCategoria, setAgregandoCategoria] = useState(false);
    const [confirmarBorrar, setConfirmarBorrar] = useState<Producto | null>(null);
    const [borrando, setBorrando] = useState(false);
    const [errorBorrar, setErrorBorrar] = useState('');

    const productosFiltrados = productos.filter(p => {
        const catActiva = categorias.find(c => c.id === categoriaActiva);
        const porCategoria = !categoriaActiva || p.categoria === catActiva?.nombre;
        const porBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        return porCategoria && porBusqueda;
    });

    const stockBajo = (p: Producto) => p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo;
    const tieneStock = (p: Producto) => p.stock_minimo > 0;

    const handleAgregarCategoria = () => {
        if (nuevaCategoria.trim()) {
            agregarCategoria(nuevaCategoria.trim());
            setNuevaCategoria('');
            setAgregandoCategoria(false);
        }
    };

    if (cargando) return (
        <div className="flex items-center justify-center h-full bg-white">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const handleBorrar = async () => {
        if (!confirmarBorrar) return;
        setBorrando(true);
        setErrorBorrar('');
        try {
            await borrarProducto(confirmarBorrar.id);
            setConfirmarBorrar(null);
        } catch (err: any) {
            if (err.message === 'TIENE_VENTAS') {
                setErrorBorrar('Este producto tiene ventas registradas. No se puede borrar, pero podés desactivarlo.');
            } else {
                setErrorBorrar('No se pudo borrar el producto.');
            }
        } finally {
            setBorrando(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Topbar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-stone-50 border-b border-stone-200 shrink-0">
                <h2 className="text-lg font-bold text-stone-800 w-full sm:flex-1 sm:w-auto">Inventario</h2>
                <div className="relative flex-1 sm:flex-none">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        className="w-full sm:w-48 pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Buscar producto..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setModalImportar(true)}
                    className="flex items-center gap-2 border border-stone-200 hover:bg-stone-50 text-stone-600 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
                >
                    <Upload size={16} /> Importar
                </button>
                <button
                    onClick={() => setModalProducto(null)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap"
                >
                    <Plus size={16} /> Nuevo producto
                </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
                {/* Sidebar categorías */}
                <div className="w-full lg:w-44 lg:flex-shrink-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto no-scrollbar pb-2 lg:pb-0 shrink-0">
                    <button
                        onClick={() => setCategoriaActiva(null)}
                        className={`whitespace-nowrap shrink-0 lg:w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${!categoriaActiva ? 'bg-violet-50 shadow-sm font-medium text-violet-700 border border-violet-100' : 'text-stone-500 hover:bg-stone-50'}`}
                    >
                        Todos ({productos.length})
                    </button>
                    {categorias.map(cat => (
                        <div key={cat.id} className="flex items-center gap-1 group shrink-0 lg:w-full">
                            <button
                                onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? null : cat.id)}
                                className={`whitespace-nowrap flex-1 text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                    categoriaActiva === cat.id
                                        ? 'bg-violet-50 shadow-sm font-medium text-violet-700 border border-violet-100'
                                        : 'text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                {cat.nombre} ({productos.filter(p => p.categoria === cat.nombre).length})
                            </button>
                            <button
                                onClick={() => borrarCategoria(cat.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1 shrink-0"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {agregandoCategoria ? (
                        <div className="flex lg:flex-col gap-1 shrink-0">
                            <input
                                autoFocus
                                className="w-32 lg:w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                placeholder="Nombre..."
                                value={nuevaCategoria}
                                onChange={e => setNuevaCategoria(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAgregarCategoria()}
                            />
                            <div className="flex gap-1">
                                <button onClick={handleAgregarCategoria} className="flex-1 px-3 lg:px-0 py-1 bg-violet-600 text-white rounded-lg text-xs">Ok</button>
                                <button onClick={() => setAgregandoCategoria(false)} className="flex-1 px-3 lg:px-0 py-1 border border-stone-200 rounded-lg text-xs">×</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setAgregandoCategoria(true)}
                            className="whitespace-nowrap shrink-0 lg:w-full text-left px-3 py-2 text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                        >
                            <Plus size={12} /> Nueva categoría
                        </button>
                    )}
                </div>

                {/* Grid productos */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {productosFiltrados.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-stone-400 text-sm">
                            {busqueda ? 'No se encontraron productos' : 'No hay productos en esta categoría'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                            {productosFiltrados.map(prod => (
                                <div
                                    key={prod.id}
                                    className={`bg-white border rounded-2xl p-3 relative transition-all ${!prod.activo ? 'opacity-60' : ''} ${stockBajo(prod) ? 'border-red-200' : 'border-stone-200'}`}
                                >
                                    <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${prod.activo ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                                        {prod.activo ? 'Activo' : 'Inactivo'}
                                    </span>

                                    <p className="font-medium text-stone-800 text-sm pr-12 truncate">{prod.nombre}</p>
                                    <p className="text-xs text-stone-400 mb-2">{prod.categoria ?? 'Sin categoría'}</p>
                                    <p className="font-bold text-stone-900">${prod.precio_venta.toLocaleString()}</p>

                                    {tieneStock(prod) ? (
                                        <p className={`text-xs mt-1 flex items-center gap-1 ${stockBajo(prod) ? 'text-red-500' : 'text-green-600'}`}>
                                            <Package size={11} />
                                            {stockBajo(prod) ? `Stock bajo: ${prod.stock_actual}` : `Stock: ${prod.stock_actual}`}
                                        </p>
                                    ) : (
                                        <p className="text-xs mt-1 text-stone-400">Sin seguimiento</p>
                                    )}

                                    <div className="flex gap-1 mt-3">
                                        <button
                                            onClick={() => setModalProducto(prod)}
                                            className="flex-1 py-1.5 border border-stone-200 rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-stone-50"
                                        >
                                            <Edit size={11} /> Editar
                                        </button>
                                        {tieneStock(prod) && (
                                            <button
                                                onClick={() => setModalStock(prod)}
                                                className="flex-1 py-1.5 border border-stone-200 rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-stone-50"
                                            >
                                                <Package size={11} /> Stock
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleActivo(prod.id, !prod.activo)}
                                            className="py-1.5 px-2 border border-stone-200 rounded-lg text-xs hover:bg-stone-50"
                                            title={prod.activo ? 'Desactivar' : 'Activar'}
                                        >
                                            {prod.activo ? <EyeOff size={11} /> : <Eye size={11} />}
                                        </button>

                                        <button
                                            onClick={() => { setConfirmarBorrar(prod); setErrorBorrar(''); }}
                                            className="py-1.5 px-2 border border-stone-200 rounded-lg text-xs hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modales */}
            {modalProducto !== undefined && (
                <ModalProducto
                    producto={modalProducto}
                    onCerrar={() => setModalProducto(undefined)}
                />
            )}
            {modalStock && (
                <ModalStock
                    producto={modalStock}
                    onCerrar={() => setModalStock(null)}
                />
            )}
            {modalImportar && (
                <ModalImportar onCerrar={() => setModalImportar(false)} />
            )}

            {confirmarBorrar && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-red-50 rounded-xl shrink-0">
                                <Trash2 size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800">Eliminar producto</h3>
                                <p className="text-sm text-stone-500 mt-1">
                                    ¿Seguro que querés eliminar <strong className="text-stone-700">{confirmarBorrar.nombre}</strong>? Esta acción no se puede deshacer.
                                </p>
                            </div>
                        </div>

                        {errorBorrar && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-sm mb-3">
                                <span>{errorBorrar}</span>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setConfirmarBorrar(null); setErrorBorrar(''); }}
                                className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                            >
                                Cancelar
                            </button>
                            {errorBorrar ? (
                                // Si tiene ventas, ofrecer desactivar en vez de borrar
                                <button
                                    onClick={async () => {
                                        await toggleActivo(confirmarBorrar.id, false);
                                        setConfirmarBorrar(null);
                                        setErrorBorrar('');
                                    }}
                                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold"
                                >
                                    Desactivar
                                </button>
                            ) : (
                                <button
                                    onClick={handleBorrar}
                                    disabled={borrando}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                                >
                                    {borrando ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContenedorInventario;