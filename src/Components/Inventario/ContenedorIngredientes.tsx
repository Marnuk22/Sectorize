import { useState } from 'react';
import { Plus, Search, Edit, Package, Eye, EyeOff, Trash2, MoreHorizontal } from 'lucide-react';
import { useIngredientes } from '../../context/IngredientesContext';
import type { Ingrediente } from '../../types';
import ModalIngrediente from './ModalIngrediente';
import ModalStockIngrediente from './ModalStockIngrediente';
import { Etiqueta, Tarjeta } from '../ui/ComponentesBase';

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });

// Pestaña "Ingredientes" dentro de Inventario (Etapa 3 de "Producción/
// ingredientes + Depósito", ver ROADMAP) — mismo espíritu visual que la
// grilla de productos, pero mucho más simple: sin categorías, código de
// barras ni sync con Tiendanube (eso es exclusivo de productos).
const ContenedorIngredientes = () => {
    const { ingredientes, cargando, toggleActivo, borrarIngrediente } = useIngredientes();
    const [busqueda, setBusqueda] = useState('');
    const [modalIngrediente, setModalIngrediente] = useState<Ingrediente | null | undefined>(undefined);
    const [modalStock, setModalStock] = useState<Ingrediente | null>(null);
    const [confirmarBorrar, setConfirmarBorrar] = useState<Ingrediente | null>(null);
    const [borrando, setBorrando] = useState(false);
    const [errorBorrar, setErrorBorrar] = useState('');
    const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

    const filtrados = ingredientes.filter(i =>
        i.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    const handleBorrar = async () => {
        if (!confirmarBorrar) return;
        setBorrando(true);
        setErrorBorrar('');
        try {
            await borrarIngrediente(confirmarBorrar.id);
            setConfirmarBorrar(null);
        } catch (err: any) {
            setErrorBorrar(err.message ?? 'No se pudo eliminar');
        } finally {
            setBorrando(false);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 px-4 py-3 bg-stone-50 border-b border-stone-200 shrink-0">
                <h2 className="text-lg font-bold text-stone-800 sm:flex-1">Ingredientes</h2>
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            className="w-48 pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Buscar ingrediente..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setModalIngrediente(null)}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap shrink-0"
                    >
                        <Plus size={16} /> Nuevo ingrediente
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {cargando ? (
                    <div className="flex items-center justify-center h-48 text-stone-400 text-sm">Cargando...</div>
                ) : filtrados.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-stone-400 text-sm">
                        {busqueda ? 'No se encontraron ingredientes' : 'Todavía no cargaste ningún ingrediente'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                        {filtrados.map(ing => {
                            const stockBajo = ing.stock_minimo > 0 && ing.stock_actual <= ing.stock_minimo;
                            return (
                                <Tarjeta key={ing.id} tono={stockBajo ? 'alerta' : 'neutral'} padding="sm" className="relative">
                                    <Etiqueta tono={ing.activo ? 'exito' : 'neutral'} className="absolute top-2 right-2">
                                        {ing.activo ? 'Activo' : 'Inactivo'}
                                    </Etiqueta>
                                    <p className="font-medium text-stone-800 text-sm truncate pr-14">{ing.nombre}</p>
                                    {ing.costo_unitario !== null && (
                                        <p className="font-bold text-stone-900">${ing.costo_unitario.toLocaleString()} <span className="text-xs font-normal text-stone-400">/ {ing.unidad_medida}</span></p>
                                    )}
                                    {ing.stock_minimo > 0 ? (
                                        <p className={`text-xs mt-1 flex items-center gap-1 ${stockBajo ? 'text-red-500' : 'text-green-600'}`}>
                                            <Package size={11} /> {stockBajo ? 'Stock bajo: ' : 'Stock: '}{fmt(ing.stock_actual)} {ing.unidad_medida}
                                        </p>
                                    ) : (
                                        <p className="text-xs mt-1 text-stone-400">Sin seguimiento</p>
                                    )}

                                    <div className="flex gap-1 mt-3">
                                        <button
                                            onClick={() => setModalIngrediente(ing)}
                                            className="flex-1 py-1.5 border border-stone-200 rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-stone-50"
                                        >
                                            <Edit size={11} /> Editar
                                        </button>
                                        {ing.stock_minimo > 0 && (
                                            <button
                                                onClick={() => setModalStock(ing)}
                                                className="flex-1 py-1.5 border border-stone-200 rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-stone-50"
                                            >
                                                <Package size={11} /> Stock
                                            </button>
                                        )}
                                        <div className="relative">
                                            {menuAbierto === ing.id && (
                                                <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)} />
                                            )}
                                            <button
                                                onClick={() => setMenuAbierto(m => m === ing.id ? null : ing.id)}
                                                className="py-1.5 px-2 border rounded-lg text-xs border-stone-200 text-stone-500 hover:bg-stone-50"
                                            >
                                                <MoreHorizontal size={11} />
                                            </button>
                                            {menuAbierto === ing.id && (
                                                <div className="absolute right-0 bottom-full mb-1 w-40 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                                                    <button
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 text-left"
                                                        onClick={() => { toggleActivo(ing.id, !ing.activo); setMenuAbierto(null); }}
                                                    >
                                                        {ing.activo ? <EyeOff size={12} className="text-stone-400" /> : <Eye size={12} className="text-stone-400" />}
                                                        {ing.activo ? 'Desactivar' : 'Activar'}
                                                    </button>
                                                    <button
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                                                        onClick={() => { setConfirmarBorrar(ing); setErrorBorrar(''); setMenuAbierto(null); }}
                                                    >
                                                        <Trash2 size={12} /> Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Tarjeta>
                            );
                        })}
                    </div>
                )}
            </div>

            {modalIngrediente !== undefined && (
                <ModalIngrediente ingrediente={modalIngrediente} onCerrar={() => setModalIngrediente(undefined)} />
            )}
            {modalStock && (
                <ModalStockIngrediente ingrediente={modalStock} onCerrar={() => setModalStock(null)} />
            )}

            {confirmarBorrar && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-red-50 rounded-xl shrink-0">
                                <Trash2 size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800">Eliminar ingrediente</h3>
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
                            <button
                                onClick={handleBorrar}
                                disabled={borrando}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                            >
                                {borrando ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContenedorIngredientes;
