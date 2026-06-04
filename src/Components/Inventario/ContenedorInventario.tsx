import { useState } from 'react';
import { Plus, Search, Edit, Package, Eye, EyeOff } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import type { Producto } from '../../types';
import ModalProducto from '../Inventario/ModalProducto';
import ModalStock from '../Inventario/ModalStock';

const ContenedorInventario = () => {
    const { productos, categorias, cargando, borrarProducto, toggleActivo, agregarCategoria, borrarCategoria } = useMenu();
    const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [modalProducto, setModalProducto] = useState<Producto | null | undefined>(undefined);
    const [modalStock, setModalStock] = useState<Producto | null>(null);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [agregandoCategoria, setAgregandoCategoria] = useState(false);

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
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Topbar */}
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800 flex-1">Inventario</h2>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className="pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                        placeholder="Buscar producto..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setModalProducto(null)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold"
                >
                    <Plus size={16} /> Nuevo producto
                </button>
            </div>

            <div className="flex gap-4">
                {/* Sidebar categorías */}
                <div className="w-40 flex-shrink-0 space-y-1">
                    <button
                        onClick={() => setCategoriaActiva(null)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${!categoriaActiva ? 'bg-white shadow-sm font-medium text-blue-900 border border-gray-100' : 'text-gray-500 hover:bg-white'}`}
                    >
                        Todos ({productos.length})
                    </button>
                    {categorias.map(cat => (
                        <div key={cat.id} className="flex items-center gap-1 group">
                            <button
                                onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? null : cat.id)}
                                className={`flex-1 text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                    categoriaActiva === cat.id 
                                        ? 'bg-white shadow-sm font-medium text-blue-900 border border-gray-100' 
                                        : 'text-gray-500 hover:bg-white'
                                }`}
                            >
                                {cat.nombre} ({productos.filter(p => p.categoria === cat.nombre).length})
                            </button>
                            <button
                                onClick={() => borrarCategoria(cat.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {/* Agregar categoría */}
                    {agregandoCategoria ? (
                        <div className="space-y-1">
                            <input
                                autoFocus
                                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre..."
                                value={nuevaCategoria}
                                onChange={e => setNuevaCategoria(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAgregarCategoria()}
                            />
                            <div className="flex gap-1">
                                <button onClick={handleAgregarCategoria} className="flex-1 py-1 bg-blue-600 text-white rounded-lg text-xs">Ok</button>
                                <button onClick={() => setAgregandoCategoria(false)} className="flex-1 py-1 border rounded-lg text-xs">×</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setAgregandoCategoria(true)}
                            className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                            <Plus size={12} /> Nueva categoría
                        </button>
                    )}
                </div>

                {/* Grid productos */}
                {productosFiltrados.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center h-48 text-gray-400 text-sm">
                        {busqueda ? 'No se encontraron productos' : 'No hay productos en esta categoría'}
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {productosFiltrados.map(prod => (
                            <div
                                key={prod.id}
                                className={`bg-white border rounded-2xl p-3 relative transition-all ${!prod.activo ? 'opacity-60' : ''} ${stockBajo(prod) ? 'border-red-200' : 'border-gray-100'}`}
                            >
                                {/* Badge estado */}
                                <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${prod.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {prod.activo ? 'Activo' : 'Inactivo'}
                                </span>

                                <p className="font-medium text-gray-800 text-sm pr-12 truncate">{prod.nombre}</p>
                                <p className="text-xs text-gray-400 mb-2">{prod.categoria ?? 'Sin categoría'}</p>
                                <p className="font-bold text-gray-900">${prod.precio_venta.toLocaleString()}</p>

                                {/* Stock */}
                                {tieneStock(prod) ? (
                                    <p className={`text-xs mt-1 flex items-center gap-1 ${stockBajo(prod) ? 'text-red-500' : 'text-green-600'}`}>
                                        <Package size={11} />
                                        {stockBajo(prod) ? `Stock bajo: ${prod.stock_actual}` : `Stock: ${prod.stock_actual}`}
                                    </p>
                                ) : (
                                    <p className="text-xs mt-1 text-gray-400">Sin seguimiento</p>
                                )}

                                {/* Acciones */}
                                <div className="flex gap-1 mt-3">
                                    <button
                                        onClick={() => setModalProducto(prod)}
                                        className="flex-1 py-1.5 border rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-gray-50"
                                    >
                                        <Edit size={11} /> Editar
                                    </button>
                                    {tieneStock(prod) && (
                                        <button
                                            onClick={() => setModalStock(prod)}
                                            className="flex-1 py-1.5 border rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-gray-50"
                                        >
                                            <Package size={11} /> Stock
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleActivo(prod.id, !prod.activo)}
                                        className="py-1.5 px-2 border rounded-lg text-xs hover:bg-gray-50"
                                        title={prod.activo ? 'Desactivar' : 'Activar'}
                                    >
                                        {prod.activo ? <EyeOff size={11} /> : <Eye size={11} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
        </div>
    );
};

export default ContenedorInventario;