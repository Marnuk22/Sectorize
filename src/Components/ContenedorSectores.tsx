import ContenedorMesa from './ContendedorMesas.tsx';
import { useState } from 'react';
import { useSalon } from '../context/index.ts';
import FormularioNuevoSector from './FormularioNuevoSector.tsx';

const ContenedorSectores = () => {
    const  [isModalOpen, setIsModalOpen] = useState(false);// Estado para controlar la visibilidad del modal de nuevo sector
    // estado con los datos que llegan por props
    const { sectores, sectorSeleccionado, seleccionarSector, agregarSector } = useSalon();
    const  handleCrearSector = (nombreRecibido: string) => {
        // El formulario ya se encargó de que 'nombreRecibido' no sea vacío
        agregarSector(nombreRecibido);
        setIsModalOpen(false);
} 
    {/*
    const [idSectorSeleccionado, setIdSectorSeleccionado] = useState<number | null>(null);
    
    const sectorSeleccionado = sectores.find(s => s.id === idSectorSeleccionado) || null;
    */}
    return (
        <>
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
            {sectores.map((sector) => (
                <button 
                    key={sector.id} 
                    onClick={() => seleccionarSector(sector.id)}
                    className={`p-4 rounded-lg shadow-sm ${sectorSeleccionado?.id === sector.id ? 'bg-indigo-50 border-2 border-indigo-500' : 'bg-white'}`}
                >
                    <h3 className="text-lg font-semibold text-gray-800">{sector.nombre}</h3>
                </button>
            ))}
            <button className="flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-sm min-w-37.5"
                onClick={()=> setIsModalOpen(true)}>
                <h3 className="text-lg font-semibold text-gray-800">Agregar Sector</h3>
            </button>
        </nav>
            {sectorSeleccionado ? (
                <ContenedorMesa></ContenedorMesa>
            ) : (
                <div className="p-10 text-center text-gray-400 font-medium">
                    Por favor, selecciona un sector para comenzar a gestionar las mesas.
                </div>
            )}
            <FormularioNuevoSector
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirmar={handleCrearSector}
            />
        </>
    );
};

export default ContenedorSectores;
