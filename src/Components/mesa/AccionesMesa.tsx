import { Printer, Replace } from 'lucide-react';
import { useSalon } from '../../context';
import FormularioMoverMesa from './FormularioMoverMesa';
import { useState } from 'react';

const AccionesMesa = () => {    
    const [modalOpen, setModalOpen] = useState(false);
    const { mesaSeleccionada } = useSalon(); 
        if (!mesaSeleccionada) return null;
    return (
        <>
            <div  className="flex gap-4 mt-4">
                <button className="bg-blue-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
                onClick={() => setModalOpen(true)}>
                    <Replace size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button className="bg-blue-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
                onClick={() => {console.log("Acción de imprimir")}}>
                    <Printer size={20} className="group-hover:scale-110 transition-transform" />
                </button>

                <FormularioMoverMesa 
                mesaOrigenId={mesaSeleccionada.id}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
            />
            </div>
        </>
    )
};
export default AccionesMesa;