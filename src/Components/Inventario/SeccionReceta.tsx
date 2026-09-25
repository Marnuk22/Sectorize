import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useReceta } from '../../hooks/useReceta';
import { useIngredientes } from '../../context/IngredientesContext';

interface Props {
    productoId: string;
}

// Receta (BOM) de un producto: qué ingredientes consume y en qué cantidad
// por cada unidad producida. Vive dentro de ModalProducto, visible solo si
// el módulo "produccion" está activo — ver ROADMAP, Etapa 4 de
// "Producción/ingredientes + Depósito".
const SeccionReceta = ({ productoId }: Props) => {
    const { items, cargando, agregarItem, editarItem, borrarItem } = useReceta(productoId);
    const { ingredientes } = useIngredientes();
    const [ingredienteNuevo, setIngredienteNuevo] = useState('');
    const [cantidadNueva, setCantidadNueva] = useState<number>(1);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const disponibles = ingredientes.filter(i => !items.some(it => it.ingrediente_id === i.id));

    const handleAgregar = async () => {
        if (!ingredienteNuevo || cantidadNueva <= 0) return;
        setGuardando(true);
        setError('');
        try {
            await agregarItem(ingredienteNuevo, cantidadNueva);
            setIngredienteNuevo('');
            setCantidadNueva(1);
        } catch (err: any) {
            setError(err.message ?? 'No se pudo agregar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="pt-4 border-t border-stone-100">
            <label className="text-xs font-medium text-stone-500 uppercase">Receta</label>
            <p className="text-xs text-stone-400 mb-3">
                Ingredientes que consume 1 unidad de este producto. Solo cuenta los de la sucursal activa.
            </p>

            {cargando ? (
                <p className="text-xs text-stone-400">Cargando...</p>
            ) : items.length === 0 ? (
                <p className="text-xs text-stone-400 mb-2">Todavía no tiene receta cargada.</p>
            ) : (
                <div className="space-y-2 mb-3">
                    {items.map(it => (
                        <div key={it.id} className="flex items-center gap-2 p-2 rounded-xl border border-stone-200">
                            <span className="flex-1 text-sm text-stone-700 truncate">{it.ingrediente.nombre}</span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-20 border border-stone-200 rounded-lg px-2 py-1 text-sm text-right"
                                defaultValue={it.cantidad}
                                onBlur={e => {
                                    const v = parseFloat(e.target.value);
                                    if (!isNaN(v) && v > 0 && v !== it.cantidad) editarItem(it.id, v);
                                }}
                            />
                            <span className="text-xs text-stone-400 w-10">{it.ingrediente.unidad_medida}</span>
                            <button onClick={() => borrarItem(it.id)} className="p-1 text-stone-400 hover:text-red-500">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {disponibles.length > 0 ? (
                <div className="flex gap-2">
                    <select
                        className="flex-1 border rounded-xl px-2 py-2 text-sm bg-white"
                        value={ingredienteNuevo}
                        onChange={e => setIngredienteNuevo(e.target.value)}
                    >
                        <option value="">Elegir ingrediente...</option>
                        {disponibles.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                    <input
                        type="number"
                        min="0"
                        step="any"
                        className="w-20 border border-stone-200 rounded-xl px-2 py-2 text-sm"
                        value={cantidadNueva}
                        onChange={e => setCantidadNueva(parseFloat(e.target.value) || 0)}
                    />
                    <button
                        onClick={handleAgregar}
                        disabled={!ingredienteNuevo || guardando}
                        className="px-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl flex items-center justify-center"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            ) : (
                <p className="text-xs text-stone-400">
                    {ingredientes.length === 0
                        ? 'No hay ingredientes cargados en esta sucursal todavía.'
                        : 'Ya se usaron todos los ingredientes disponibles.'}
                </p>
            )}

            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
    );
};

export default SeccionReceta;
