import { useState } from 'react';
import { Plus, Edit, Trash2, Clock, Hash, Ticket } from 'lucide-react';
import { useAfiliados } from '../../context/AfiliadosContext';
import ModalMembresia from './ModalMembresia';
import type { Membresia, TipoMembresia } from '../../types';

const ICONO_TIPO: Record<TipoMembresia, typeof Clock> = {
    por_tiempo:      Clock,
    por_asistencias: Hash,
    clase_suelta:    Ticket,
};

const LABEL_TIPO: Record<TipoMembresia, string> = {
    por_tiempo:      'Por tiempo',
    por_asistencias: 'Por asistencias',
    clase_suelta:    'Clase suelta',
};

const PanelMembresias = () => {
    const { membresias, borrarMembresia } = useAfiliados();
    const [modal, setModal] = useState<Membresia | null | undefined>(undefined);

    return (
        <div className="space-y-3">
            <button
                onClick={() => setModal(null)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm"
            >
                <Plus size={16} /> Nueva membresía
            </button>

            {membresias.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                    Todavía no creaste membresías. Creá la primera para poder asignarla a tus socios.
                </div>
            ) : (
                membresias.map(m => {
                    const Icono = ICONO_TIPO[m.tipo];
                    return (
                        <div key={m.id} className="border rounded-2xl p-4 flex items-center gap-3">
                            <div className="p-2.5 bg-gray-100 rounded-xl">
                                <Icono size={18} className="text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 truncate">{m.nombre}</p>
                                <p className="text-xs text-gray-400">
                                    {LABEL_TIPO[m.tipo]}
                                    {m.tipo === 'por_tiempo' && ` · ${m.duracion_dias} días`}
                                    {m.tipo === 'por_asistencias' && ` · ${m.cantidad_asistencias} clases`}
                                </p>
                            </div>
                            <p className="font-black text-gray-900">${m.precio.toLocaleString()}</p>
                            <div className="flex gap-1">
                                <button onClick={() => setModal(m)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600">
                                    <Edit size={15} />
                                </button>
                                <button onClick={() => borrarMembresia(m.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    );
                })
            )}

            {modal !== undefined && (
                <ModalMembresia membresia={modal} onCerrar={() => setModal(undefined)} />
            )}
        </div>
    );
};

export default PanelMembresias;