import { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import { usePlan } from '../../hooks/usePlan';
import type { Producto, Categoria } from '../../types';
import { UNIDADES, type UnidadMedida } from '../../config/unidades';

interface Props {
    producto?: Producto | null;
    onCerrar: () => void;
}

const CAMPOS_INICIALES = {
    nombre: '',
    descripcion: '',
    categoria: '',
    precio_venta: 0,
    precio_costo: null as number | null,
    stock_actual: 0,
    stock_minimo: 5,
    codigo_barras: null as string | null,
    activo: true,
    tipo_venta: 'unidad' as 'unidad' | 'granel',
    unidad_medida: 'unidad' as UnidadMedida,
};

// Unidades que se pueden elegir cuando el producto es a granel (excluye 'unidad')
const UNIDADES_GRANEL = (Object.keys(UNIDADES) as UnidadMedida[]).filter(u => u !== 'unidad');

const ModalProducto = ({ producto, onCerrar }: Props) => {
    const { agregarProducto, editarProducto, categorias, agregarCategoria } = useMenu();
    const { puede } = usePlan();
    const puedeStock = puede('seguimiento_stock');

    const [form, setForm] = useState(CAMPOS_INICIALES);
    const [seguimientoStock, setSeguimientoStock] = useState(false);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (producto) {
            setForm({
                nombre: producto.nombre,
                descripcion: producto.descripcion ?? '',
                categoria: producto.categoria ?? '',
                precio_venta: producto.precio_venta,
                precio_costo: producto.precio_costo,
                stock_actual: producto.stock_actual,
                stock_minimo: producto.stock_minimo,
                codigo_barras: producto.codigo_barras,
                activo: producto.activo,
                tipo_venta: producto.tipo_venta ?? 'unidad',
                unidad_medida: producto.unidad_medida ?? 'unidad',
            });
            setSeguimientoStock(producto.stock_minimo > 0);
        }
    }, [producto]);

    // Cuando cambia el tipo de venta, ajustar la unidad por defecto
    const cambiarTipoVenta = (tipo: 'unidad' | 'granel') => {
        setForm(p => ({
            ...p,
            tipo_venta: tipo,
            unidad_medida: tipo === 'unidad' ? 'unidad' : 'kg', // default a kg si es granel
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
        if (form.precio_venta <= 0) { setError('El precio debe ser mayor a 0'); return; }
        if (form.tipo_venta === 'granel' && form.unidad_medida === 'unidad') {
            setError('Elegí una unidad de medida para el producto a granel'); return;
        }

        setCargando(true);
        setError('');
        try {
            const usaStock = puedeStock && seguimientoStock;
            const datos = {
                ...form,
                nombre: form.nombre.trim(),
                descripcion: form.descripcion || null,
                categoria: form.categoria || null,
                stock_minimo: usaStock ? form.stock_minimo : 0,
                stock_actual: usaStock ? form.stock_actual : 0,
            };

            if (producto) {
                await editarProducto(producto.id, datos);
            } else {
                await agregarProducto(datos);
            }

            if (form.categoria && !categorias.find(c => c.nombre === form.categoria)) {
                await agregarCategoria(form.categoria);
            }

            onCerrar();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const agregarNuevaCategoria = async () => {
        if (nuevaCategoria.trim()) {
            await agregarCategoria(nuevaCategoria.trim());
            setForm(prev => ({ ...prev, categoria: nuevaCategoria.trim() }));
            setNuevaCategoria('');
        }
    };

    // Etiqueta del precio según el tipo
    const labelPrecio = form.tipo_venta === 'granel'
        ? `Precio por ${UNIDADES[form.unidad_medida].label} ($) *`
        : 'Precio de venta ($) *';

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-stone-200">
                    <h2 className="font-bold text-stone-800 text-lg">
                        {producto ? 'Editar producto' : 'Nuevo producto'}
                    </h2>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-stone-500">Nombre *</label>
                            <input
                                className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                value={form.nombre}
                                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                                placeholder="Ej: Almendras, Pizza Margherita"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-stone-500">Categoría</label>
                            <select
                                className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                value={form.categoria}
                                onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                            >
                                <option value="">Sin categoría</option>
                                {categorias.map((c: Categoria) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                <option value="__nueva__">+ Nueva categoría</option>
                            </select>
                        </div>
                    </div>

                    {form.categoria === '__nueva__' && (
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                placeholder="Nombre de la nueva categoría"
                                value={nuevaCategoria}
                                onChange={e => setNuevaCategoria(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={agregarNuevaCategoria}
                                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium"
                            >
                                Agregar
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-stone-500">Descripción (opcional)</label>
                        <textarea
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                            rows={2}
                            value={form.descripcion}
                            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                            placeholder="Ingredientes, preparación..."
                        />
                    </div>

                    {/* Tipo de venta: unidad o granel */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-stone-500">¿Cómo se vende?</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => cambiarTipoVenta('unidad')}
                                className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                                    form.tipo_venta === 'unidad'
                                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                Por unidad
                            </button>
                            <button
                                type="button"
                                onClick={() => cambiarTipoVenta('granel')}
                                className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                                    form.tipo_venta === 'granel'
                                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                A granel (peso/volumen)
                            </button>
                        </div>
                    </div>

                    {/* Precio + (unidad si es granel) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-stone-500">{labelPrecio}</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                value={form.precio_venta}
                                onChange={e => setForm(p => ({ ...p, precio_venta: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                        {form.tipo_venta === 'granel' ? (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-stone-500">Unidad de medida</label>
                                <select
                                    className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    value={form.unidad_medida}
                                    onChange={e => setForm(p => ({ ...p, unidad_medida: e.target.value as UnidadMedida }))}
                                >
                                    {UNIDADES_GRANEL.map(u => (
                                        <option key={u} value={u}>{UNIDADES[u].label}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-stone-500">Precio de costo ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    value={form.precio_costo ?? ''}
                                    onChange={e => setForm(p => ({ ...p, precio_costo: parseFloat(e.target.value) || null }))}
                                    placeholder="Opcional"
                                />
                            </div>
                        )}
                    </div>

                    {/* Precio de costo en su propia fila cuando es granel (para no perderlo) */}
                    {form.tipo_venta === 'granel' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-stone-500">Precio de costo ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                value={form.precio_costo ?? ''}
                                onChange={e => setForm(p => ({ ...p, precio_costo: parseFloat(e.target.value) || null }))}
                                placeholder="Opcional"
                            />
                        </div>
                    )}

                    {/* Toggle seguimiento de stock — gateado por plan */}
                    {puedeStock ? (
                        <div className="flex items-center justify-between p-3 border border-stone-200 rounded-xl">
                            <div>
                                <p className="text-sm font-medium text-stone-700">Seguimiento de stock</p>
                                <p className="text-xs text-stone-400">Descuenta al vender y alerta por email</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSeguimientoStock(!seguimientoStock)}
                                className={`w-10 h-6 rounded-full transition-colors relative ${seguimientoStock ? 'bg-violet-600' : 'bg-stone-200'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${seguimientoStock ? 'left-5' : 'left-1'}`} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 border border-dashed border-stone-200 rounded-xl bg-stone-50">
                            <div className="flex items-center gap-2">
                                <Lock size={16} className="text-stone-400" />
                                <div>
                                    <p className="text-sm font-medium text-stone-500">Seguimiento de stock</p>
                                    <p className="text-xs text-amber-600">Disponible en plan Básico</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stock fields */}
                    {puedeStock && seguimientoStock && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-stone-500">
                                    Stock actual {form.tipo_venta === 'granel' && `(${UNIDADES[form.unidad_medida].label})`}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step={form.tipo_venta === 'granel' ? '0.001' : '1'}
                                    className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    value={form.stock_actual}
                                    onChange={e => setForm(p => ({ ...p, stock_actual: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-stone-500">Alertar cuando queden menos de</label>
                                <input
                                    type="number"
                                    min="0"
                                    step={form.tipo_venta === 'granel' ? '0.001' : '1'}
                                    className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    value={form.stock_minimo}
                                    onChange={e => setForm(p => ({ ...p, stock_minimo: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-3 border border-stone-200 rounded-xl">
                        <div>
                            <p className="text-sm font-medium text-stone-700">Producto activo</p>
                            <p className="text-xs text-stone-400">Visible para los mozos al tomar pedidos</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                            className={`w-10 h-6 rounded-full transition-colors relative ${form.activo ? 'bg-violet-600' : 'bg-stone-200'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.activo ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCerrar}
                            className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={cargando}
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                        >
                            {cargando ? 'Guardando...' : producto ? 'Guardar cambios' : 'Crear producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalProducto;