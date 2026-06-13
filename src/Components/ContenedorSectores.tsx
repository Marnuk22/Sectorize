import ContenedorMesa from './ContendedorMesas.tsx';
import { useState } from 'react';
import { useSalon } from '../context/index.ts';
import FormularioNuevoSector from './FormularioNuevoSector.tsx';
import { Plus } from 'lucide-react';

const ContenedorSectores = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { sectores, sectorSeleccionado, seleccionarSector, agregarSector } = useSalon();

    const handleCrearSector = (nombreRecibido: string) => {
        agregarSector(nombreRecibido);
        setIsModalOpen(false);
    };

    return (
        <div className="h-full flex flex-col bg-stone-200/60 overflow-hidden">
            {/* Pestañas de sectores tipo explorador */}
            <div className="flex items-end gap-0.5 px-2 pt-1.5 shrink-0">
                {sectores.map((sector) => {
                    const activo = sectorSeleccionado?.id === sector.id;
                    return (
                        <button
                            key={sector.id}
                            onClick={() => seleccionarSector(sector.id)}
                            className={`text-xs font-medium whitespace-nowrap transition-colors rounded-t-lg
                                ${activo
                                    ? 'bg-white text-violet-700 text-sm px-4 py-2 relative top-px'
                                    : 'bg-stone-300/70 text-stone-600 text-sm px-3.5 py-1.5 hover:bg-stone-300'}`}
                        >
                            {sector.nombre}
                        </button>
                    );
                })}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-stone-500 hover:text-violet-600 px-2 py-1 transition-colors"
                    title="Agregar sector"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Contenido: mesas + panel (se conecta con la pestaña activa) */}
            {sectorSeleccionado ? (
                <div className="flex-1 min-h-0 bg-white rounded-tr-xl overflow-hidden">
                    <ContenedorMesa />
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-white rounded-tr-xl p-10 text-center text-stone-400 font-medium">
                    Seleccioná un sector para gestionar las mesas.
                </div>
            )}

            <FormularioNuevoSector
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirmar={handleCrearSector}
            />
        </div>
    );
};

export default ContenedorSectores;