import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMenu } from '../../context/MenuContext';
import { useIngredientes } from '../../context/IngredientesContext';
import { Boton } from '../ui/ComponentesBase';

interface Props {
    depositoId: string;
    onCerrar: () => void;
    onExito: () => void;
}

// Transferencia de stock entre la sucursal activa y un depósito, en
// cualquier dirección, para un producto o un ingrediente — vía la RPC
// atómica transferir_stock (Etapa 2 de "Producción/ingredientes + Depósito").
const ModalTransferencia = ({ depositoId, onCerrar, onExito }: Props) => {
    const { localId } = useAuth();
    const { productos } = useMenu();
    const { ingredientes } = useIngredientes();
    const [tipo, setTipo] = useState<'producto' | 'ingrediente'>('producto');
    const [itemId, setItemId] = useState('');
    const [direccion, setDireccion] = useState<'a_deposito' | 'a_sucursal'>('a_deposito');
    const [cantidad, setCantidad] = useState(1);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const opciones = tipo === 'producto' ? productos : ingredientes;

    const handleTransferir = async () => {
        if (!itemId || cantidad <= 0) return;
        setGuardando(true);
        setError('');
        try {
            const { error: errRpc } = await supabase.rpc('transferir_stock', {
                p_tipo: tipo,
                p_item_id: itemId,
                p_local_id: localId,
                p_deposito_id: depositoId,
                p_cantidad: cantidad,
                p_direccion: direccion,
            });
            if (errRpc) throw errRpc;
            onExito();
            onCerrar();
        } catch (err: any) {
            setError(err.message ?? 'No se pudo transferir');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between p-5 border-b border-stone-200">
                    <h2 className="font-bold text-stone-800">Transferir</h2>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setTipo('producto'); setItemId(''); }}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${tipo === 'producto' ? 'bg-violet-50 border-violet-400 text-violet-700' : 'border-stone-200 text-stone-500'}`}
                        >
                            Producto
                        </button>
                        <button
                            onClick={() => { setTipo('ingrediente'); setItemId(''); }}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${tipo === 'ingrediente' ? 'bg-violet-50 border-violet-400 text-violet-700' : 'border-stone-200 text-stone-500'}`}
                        >
                            Ingrediente
                        </button>
                    </div>

                    <select
                        className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                        value={itemId}
                        onChange={e => setItemId(e.target.value)}
                    >
                        <option value="">Elegir {tipo === 'producto' ? 'producto' : 'ingrediente'}...</option>
                        {opciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setDireccion('a_deposito')}
                            className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${direccion === 'a_deposito' ? 'bg-green-50 border-green-400 text-green-700' : 'border-stone-200 text-stone-500'}`}
                        >
                            Sucursal → Depósito
                        </button>
                        <button
                            onClick={() => setDireccion('a_sucursal')}
                            className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${direccion === 'a_sucursal' ? 'bg-green-50 border-green-400 text-green-700' : 'border-stone-200 text-stone-500'}`}
                        >
                            Depósito → Sucursal
                        </button>
                    </div>

                    <input
                        type="number"
                        min="0"
                        step="any"
                        className="w-full text-center text-lg font-bold border border-stone-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={cantidad}
                        onChange={e => setCantidad(parseFloat(e.target.value) || 0)}
                    />

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex gap-3">
                        <Boton variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Boton>
                        <Boton
                            variante="primario"
                            onClick={handleTransferir}
                            disabled={guardando || !itemId || cantidad <= 0}
                            className="flex-1"
                        >
                            {guardando ? 'Transfiriendo...' : 'Confirmar'}
                        </Boton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalTransferencia;
