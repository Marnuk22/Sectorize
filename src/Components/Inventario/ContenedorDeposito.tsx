import { useState, useEffect } from 'react';
import { ArrowLeftRight, Trash2, Package, Plus } from 'lucide-react';
import { useDepositos } from '../../context/DepositosContext';
import { useStockDeposito } from '../../hooks/useStockDeposito';
import { useAuth } from '../../context/AuthContext';
import ModalTransferencia from './ModalTransferencia';
import ModalIngresoDeposito from './ModalIngresoDeposito';
import { Boton, Campo } from '../ui/ComponentesBase';

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });

// Pestaña "Depósito" dentro de Inventario — Etapa 6 de "Producción/
// ingredientes + Depósito" (ver ROADMAP). Depósito es a nivel NEGOCIO (no de
// una sucursal puntual): cualquier sucursal con el módulo activo lo usa.
const ContenedorDeposito = () => {
    const { perfil } = useAuth();
    const { depositos, cargando, crearDeposito, borrarDeposito } = useDepositos();
    const [depositoActivoId, setDepositoActivoId] = useState<string | null>(null);
    const [nombreNuevo, setNombreNuevo] = useState('');
    const [creando, setCreando] = useState(false);
    const [error, setError] = useState('');
    const [modalTransferencia, setModalTransferencia] = useState(false);
    const [modalIngreso, setModalIngreso] = useState(false);

    useEffect(() => {
        const elegirPorDefecto = () => {
            if (!depositoActivoId && depositos.length > 0) setDepositoActivoId(depositos[0].id);
        };
        elegirPorDefecto();
    }, [depositos, depositoActivoId]);

    const { productos, ingredientes, cargando: cargandoStock, recargar } = useStockDeposito(depositoActivoId);

    const handleCrear = async () => {
        if (!nombreNuevo.trim()) return;
        setCreando(true);
        setError('');
        try {
            const creado = await crearDeposito(nombreNuevo.trim());
            setDepositoActivoId(creado.id);
            setNombreNuevo('');
        } catch (err: any) {
            setError(err.message ?? 'No se pudo crear el depósito');
        } finally {
            setCreando(false);
        }
    };

    if (cargando) {
        return <div className="h-full flex items-center justify-center text-stone-400 text-sm">Cargando...</div>;
    }

    if (depositos.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-sm text-center">
                    <p className="text-sm text-stone-500 mb-4">Todavía no hay ningún depósito para este negocio.</p>
                    {perfil?.rol === 'dueño' ? (
                        <div className="space-y-3">
                            <Campo
                                etiqueta="Nombre del depósito"
                                value={nombreNuevo}
                                onChange={e => setNombreNuevo(e.target.value)}
                                placeholder="Ej: Galpón Centro"
                            />
                            {error && <p className="text-xs text-red-500">{error}</p>}
                            <Boton variante="primario" onClick={handleCrear} disabled={creando || !nombreNuevo.trim()} className="w-full">
                                {creando ? 'Creando...' : 'Crear depósito'}
                            </Boton>
                        </div>
                    ) : (
                        <p className="text-xs text-stone-400">Pedile al dueño que cree uno primero.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-stone-50 border-b border-stone-200 shrink-0">
                <select
                    className="border rounded-xl px-3 py-2 text-sm bg-white font-medium text-stone-800"
                    value={depositoActivoId ?? ''}
                    onChange={e => setDepositoActivoId(e.target.value)}
                >
                    {depositos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
                <div className="flex-1" />
                <button
                    onClick={() => setModalIngreso(true)}
                    className="flex items-center gap-2 border border-stone-200 hover:bg-stone-50 text-stone-600 px-4 py-2 rounded-xl text-sm font-medium"
                >
                    <Plus size={16} /> Agregar al depósito
                </button>
                <button
                    onClick={() => setModalTransferencia(true)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold"
                >
                    <ArrowLeftRight size={16} /> Transferir
                </button>
                {perfil?.rol === 'dueño' && depositoActivoId && (
                    <button
                        onClick={() => borrarDeposito(depositoActivoId)}
                        className="p-2 border border-stone-200 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50"
                        title="Eliminar este depósito"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
                {cargandoStock ? (
                    <p className="text-sm text-stone-400">Cargando stock...</p>
                ) : (
                    <>
                        <div>
                            <h3 className="text-xs font-medium text-stone-500 uppercase mb-2">Productos</h3>
                            {productos.length === 0 ? (
                                <p className="text-xs text-stone-400">Sin stock de productos en este depósito.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {productos.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 text-sm">
                                            <span className="text-stone-700 flex items-center gap-2"><Package size={13} className="text-stone-400" /> {p.producto.nombre}</span>
                                            <span className="font-medium text-stone-800">{fmt(p.stock_actual)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xs font-medium text-stone-500 uppercase mb-2">Ingredientes</h3>
                            {ingredientes.length === 0 ? (
                                <p className="text-xs text-stone-400">Sin stock de ingredientes en este depósito.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {ingredientes.map(i => (
                                        <div key={i.id} className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 text-sm">
                                            <span className="text-stone-700 flex items-center gap-2"><Package size={13} className="text-stone-400" /> {i.ingrediente.nombre}</span>
                                            <span className="font-medium text-stone-800">{fmt(i.stock_actual)} {i.ingrediente.unidad_medida}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {modalTransferencia && depositoActivoId && (
                <ModalTransferencia
                    depositoId={depositoActivoId}
                    onCerrar={() => setModalTransferencia(false)}
                    onExito={recargar}
                />
            )}

            {modalIngreso && depositoActivoId && (
                <ModalIngresoDeposito
                    depositoId={depositoActivoId}
                    onCerrar={() => setModalIngreso(false)}
                    onExito={recargar}
                />
            )}
        </div>
    );
};

export default ContenedorDeposito;
