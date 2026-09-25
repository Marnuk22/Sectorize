import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMenu } from '../../context/MenuContext';
import { useIngredientes } from '../../context/IngredientesContext';
import { useReceta } from '../../hooks/useReceta';
import type { Producto } from '../../types';
import { Boton } from '../ui/ComponentesBase';

interface Props {
    producto: Producto;
    onCerrar: () => void;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });

// Producción por lote: arma una tanda de N unidades de un producto,
// descuenta los ingredientes según su receta (× cantidad) y suma el stock
// del producto terminado — todo vía la RPC atómica registrar_produccion
// (ver ROADMAP, Etapa 5 de "Producción/ingredientes + Depósito").
const ModalProduccion = ({ producto, onCerrar }: Props) => {
    const { localId } = useAuth();
    const { recargarProductos } = useMenu();
    const { recargarIngredientes } = useIngredientes();
    const { items, cargando } = useReceta(producto.id);
    const [cantidad, setCantidad] = useState(1);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const consumo = items.map(it => ({
        ...it,
        necesaria: it.cantidad * cantidad,
        alcanza: it.ingrediente.stock_actual >= it.cantidad * cantidad,
    }));
    const algunoInsuficiente = consumo.some(c => !c.alcanza);

    const handleProducir = async () => {
        setGuardando(true);
        setError('');
        try {
            const { error: errRpc } = await supabase.rpc('registrar_produccion', {
                p_producto_id: producto.id,
                p_local_id: localId,
                p_cantidad: cantidad,
                p_nota: null,
            });
            if (errRpc) throw errRpc;

            await Promise.all([recargarProductos(), recargarIngredientes()]);
            onCerrar();
        } catch (err: any) {
            setError(err.message ?? 'No se pudo registrar la producción');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-stone-200">
                    <div>
                        <h2 className="font-bold text-stone-800">Producir</h2>
                        <p className="text-sm text-stone-400">{producto.nombre}</p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {cargando ? (
                        <p className="text-sm text-stone-400">Cargando receta...</p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-stone-500">
                            Este producto todavía no tiene una receta cargada — andá a "Editar" y agregala primero.
                        </p>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-stone-600 shrink-0">Cantidad a producir</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    className="flex-1 text-center text-lg font-bold border border-stone-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    value={cantidad}
                                    onChange={e => setCantidad(Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                            </div>

                            <div className="space-y-2">
                                {consumo.map(c => (
                                    <div key={c.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-sm ${c.alcanza ? 'border-stone-200' : 'border-red-300 bg-red-50'}`}>
                                        <span className="text-stone-700">{c.ingrediente.nombre}</span>
                                        <span className={c.alcanza ? 'text-stone-500' : 'text-red-600 font-medium'}>
                                            {fmt(c.necesaria)} / {fmt(c.ingrediente.stock_actual)} {c.ingrediente.unidad_medida}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {algunoInsuficiente && (
                                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl text-red-600 text-xs">
                                    <AlertCircle size={14} className="shrink-0" /> No alcanza el stock de algún ingrediente para esta cantidad.
                                </div>
                            )}
                        </>
                    )}

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <Boton variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Boton>
                        <Boton
                            variante="primario"
                            onClick={handleProducir}
                            disabled={guardando || items.length === 0 || cantidad <= 0 || algunoInsuficiente}
                            className="flex-1"
                        >
                            {guardando ? 'Produciendo...' : 'Confirmar'}
                        </Boton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalProduccion;
