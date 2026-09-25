import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useIngredientes } from '../../context/IngredientesContext';
import type { Ingrediente } from '../../types';
import { Campo, Boton } from '../ui/ComponentesBase';
import { UNIDADES } from '../../config/unidades';
import type { UnidadMedida } from '../../config/unidades';

interface Props {
    ingrediente: Ingrediente | null; // null = crear
    onCerrar: () => void;
}

const CAMPOS_INICIALES = {
    nombre: '',
    unidad_medida: 'unidad' as UnidadMedida,
    stock_actual: 0,
    stock_minimo: 0,
    costo_unitario: null as number | null,
    activo: true,
};

const ModalIngrediente = ({ ingrediente, onCerrar }: Props) => {
    const { agregarIngrediente, editarIngrediente } = useIngredientes();
    const [form, setForm] = useState(CAMPOS_INICIALES);
    const [seguimientoStock, setSeguimientoStock] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargarDesdeIngrediente = () => {
            if (!ingrediente) return;
            setForm({
                nombre: ingrediente.nombre,
                unidad_medida: ingrediente.unidad_medida as UnidadMedida,
                stock_actual: ingrediente.stock_actual,
                stock_minimo: ingrediente.stock_minimo,
                costo_unitario: ingrediente.costo_unitario,
                activo: ingrediente.activo,
            });
            setSeguimientoStock(ingrediente.stock_minimo > 0);
        };
        cargarDesdeIngrediente();
    }, [ingrediente]);

    const handleGuardar = async () => {
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
        setCargando(true);
        setError('');
        try {
            const datos = {
                ...form,
                nombre: form.nombre.trim(),
                stock_minimo: seguimientoStock ? form.stock_minimo : 0,
                stock_actual: seguimientoStock ? form.stock_actual : 0,
            };
            if (ingrediente) {
                await editarIngrediente(ingrediente.id, datos);
            } else {
                await agregarIngrediente(datos);
            }
            onCerrar();
        } catch (err: any) {
            setError(err.message ?? 'No se pudo guardar');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-stone-200">
                    <h2 className="font-bold text-stone-800">{ingrediente ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h2>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <Campo
                        etiqueta="Nombre"
                        value={form.nombre}
                        onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                        placeholder="Ej: Harina 000"
                        autoFocus
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-stone-500 uppercase">Unidad de medida</label>
                        <select
                            className="border rounded-xl px-3 py-2 text-sm bg-white"
                            value={form.unidad_medida}
                            onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value as UnidadMedida }))}
                        >
                            {Object.keys(UNIDADES).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>

                    <Campo
                        etiqueta="Costo por unidad (opcional)"
                        type="number"
                        value={form.costo_unitario ?? ''}
                        onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value ? parseFloat(e.target.value) : null }))}
                        placeholder="0"
                    />

                    <label className="flex items-center gap-2 text-sm text-stone-600">
                        <input
                            type="checkbox"
                            checked={seguimientoStock}
                            onChange={e => setSeguimientoStock(e.target.checked)}
                            className="rounded"
                        />
                        Llevar seguimiento de stock
                    </label>

                    {seguimientoStock && (
                        <div className="grid grid-cols-2 gap-3">
                            <Campo
                                etiqueta="Stock actual"
                                type="number"
                                value={form.stock_actual}
                                onChange={e => setForm(f => ({ ...f, stock_actual: parseFloat(e.target.value) || 0 }))}
                            />
                            <Campo
                                etiqueta="Stock mínimo"
                                type="number"
                                value={form.stock_minimo}
                                onChange={e => setForm(f => ({ ...f, stock_minimo: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <Boton variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Boton>
                        <Boton variante="primario" onClick={handleGuardar} disabled={cargando} className="flex-1">
                            {cargando ? 'Guardando...' : 'Guardar'}
                        </Boton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalIngrediente;
