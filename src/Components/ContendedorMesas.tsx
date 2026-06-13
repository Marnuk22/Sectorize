import { useState } from 'react';
import PanelMesa from './mesa/PanelMesa.tsx';
import { useSalon } from '../context/index.ts';
import FormularioNuevaMesa from './mesa/FormularioNuevaMesa.tsx';
import { Plus, LayoutGrid } from 'lucide-react';

const ContenedorMesas = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { mesaSeleccionada, seleccionarMesa, agregarMesaASector, sectorSeleccionado } = useSalon();
    if (!sectorSeleccionado) return null;

    const handleCrearMesa = (nombreRecibido: string) => {
        agregarMesaASector(sectorSeleccionado.id, nombreRecibido);
        setIsModalOpen(false);
    };

    return (
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] min-h-0">

            {/* COLUMNA IZQUIERDA: grilla de mesas */}
            <div className="overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
                        {sectorSeleccionado.nombre}
                    </h2>
                    <button
                        className="flex items-center gap-1 text-xs font-bold text-violet-600 border border-dashed border-violet-300 hover:border-violet-500 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus size={14} /> Mesa
                    </button>
                </div>

                {sectorSeleccionado.mesas.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {sectorSeleccionado.mesas.map((mesa) => {
                            const ocupada = mesa.estado !== 'libre';
                            const seleccionada = mesaSeleccionada?.id === mesa.id;
                            return (
                                <button
                                    key={mesa.id}
                                    onClick={() => seleccionarMesa(mesa.id)}
                                    className={`aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition-all
                                        ${seleccionada
                                            ? 'border-violet-500 ring-2 ring-violet-200'
                                            : 'border-transparent'}
                                        ${ocupada
                                            ? 'bg-red-50 hover:bg-red-100'
                                            : 'bg-green-50 hover:bg-green-100'}`}
                                >
                                    <span className="text-sm font-bold text-stone-800">{mesa.nombre}</span>
                                    <span className={`text-[10px] font-bold uppercase mt-0.5 ${ocupada ? 'text-red-500' : 'text-green-600'}`}>
                                        {mesa.estado}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                        <LayoutGrid size={32} className="mb-2" />
                        <p className="text-sm">No hay mesas en este sector.</p>
                    </div>
                )}
            </div>

            {/* COLUMNA DERECHA: panel de la mesa */}
            <div className="lg:border-l border-stone-200 bg-stone-50/50 h-full min-h-0">
                {mesaSeleccionada ? (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
                            <h2 className="font-bold text-stone-800">{mesaSeleccionada.nombre}</h2>
                            <button
                                onClick={() => seleccionarMesa(null)}
                                className="text-xs text-stone-400 hover:text-stone-600"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <PanelMesa />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                        <LayoutGrid size={36} className="mb-3" />
                        <p className="text-sm font-medium">Seleccioná una mesa</p>
                        <p className="text-xs mt-1">para ver y cargar su pedido</p>
                    </div>
                )}
            </div>

            {/* Modal nueva mesa */}
            <FormularioNuevaMesa
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirmar={handleCrearMesa}
            />
        </div>
    );
};

export default ContenedorMesas;