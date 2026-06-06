import { useState } from 'react';
import PanelMesa from './mesa/PanelMesa.tsx';
import { useSalon } from '../context/index.ts';
import FormularioNuevaMesa from './mesa/FormularioNuevaMesa.tsx';
import { X } from 'lucide-react';

const ContenedorMesas = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { mesaSeleccionada, seleccionarMesa, agregarMesaASector, sectorSeleccionado } = useSalon();
    if (!sectorSeleccionado) return null;

    const handleCrearMesa = (nombreRecibido: string) => {
        agregarMesaASector(sectorSeleccionado.id, nombreRecibido);
        setIsModalOpen(false);
    };

    return (
        <div className="mt-2 animate-in fade-in duration-500">
            <button
                className="flex items-center justify-center gap-2 bg-white p-4 rounded-lg shadow-sm border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors font-bold w-40 h-14 mb-4"
                onClick={() => setIsModalOpen(true)}
            >
                <span className="text-xs text-indigo-600">+ agregar mesa</span>
            </button>

            {sectorSeleccionado.mesas.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sectorSeleccionado.mesas.map((mesa) => (
                        <div
                            key={mesa.id}
                            onClick={() => seleccionarMesa(mesa.id)}
                            className={`bg-gray-200 p-6 rounded-xl shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                                mesaSeleccionada?.id === mesa.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'
                            }`}
                        >
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

            {/* Modal nueva mesa */}
            <FormularioNuevaMesa
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirmar={handleCrearMesa}
            />

            {/* Drawer lateral del panel de mesa */}
            {mesaSeleccionada && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200"
                        onClick={() => seleccionarMesa(null)}
                    />
                    {/* Panel */}
                    <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                            <h2 className="font-bold text-gray-800">{mesaSeleccionada.nombre}</h2>
                            <button
                                onClick={() => seleccionarMesa(null)}
                                className="p-2 hover:bg-gray-200 rounded-xl"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <PanelMesa />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ContenedorMesas;