import { useState } from 'react';
import PanelMesa from './mesa/PanelMesa.tsx';
import { useSalon } from '../context/index.ts';
import FormularioNuevaMesa from './mesa/FormularioNuevaMesa.tsx';

const  ContenedorMesas = () => {
    const  [isModalOpen, setIsModalOpen] = useState(false);
    const { mesaSeleccionada, seleccionarMesa, agregarMesaASector, sectorSeleccionado } = useSalon();
    if (!sectorSeleccionado) return null;
    const handleCrearMesa = (nombreRecibido: string) => {
        // El formulario ya se encargó de que 'nombreRecibido' no sea vacío
        agregarMesaASector(sectorSeleccionado.id, nombreRecibido);
        setIsModalOpen(false);
};
    return (
        <>
            <button  
                className="flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-sm min-w-37.5 border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors text-gray-500 font-bold"
                onClick={()=> setIsModalOpen(true)}
                >
                <span className="text-xs text-indigo-600">+  agregar mesa</span>
            </button>
        <div  className={`transition-all duration-300 overflow-y-auto h-full pr-2 ${mesaSeleccionada ? 'w-2/3' : 'w-full'}`}>

            {sectorSeleccionado.mesas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {sectorSeleccionado.mesas.map((mesa) => (
                        <div 
                        key={mesa.id} 
                        onClick={() => seleccionarMesa(mesa.id)}
                        className={`bg-white p-6 rounded-xl shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                                mesaSeleccionada?.id === mesa.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'
                            }`}>
                            <h3 className="text-lg font-semibold text-gray-800">{mesa.nombre}</h3>
                            <p className={`text-sm font-bold mt-2 uppercase ${mesa.estado === 'libre' ? 'text-green-500' : 'text-red-500'}`}>
                                {mesa.estado}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">No hay mesas disponibles.</p>
            )}
            {/* --- MODAL PARA NUEVA MESA --- */}
            <FormularioNuevaMesa 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onConfirmar={handleCrearMesa}
            />
            
            {/* --- PANEL LATERAL (DRAWER) --- */}
            <div className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-110 transition-transform duration-300 ease-in-out w-full md:w-1/3 flex flex-col ${
                mesaSeleccionada ? 'translate-x-0' : 'translate-x-full'
            }`}>
                {mesaSeleccionada && (
                    <>
                        {/* Cabecera del Panel */}
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <PanelMesa/>
                        </div>
                    </>
                    )}
            </div>
        </div>
        </>
    )
}

export default ContenedorMesas;