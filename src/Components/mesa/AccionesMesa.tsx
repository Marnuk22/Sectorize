import { Printer, Replace } from 'lucide-react';
import { useSalon } from '../../context';
import { useAuth } from '../../context/AuthContext';
import { imprimirTicket } from '../../logic/impresion';
import FormularioMoverMesa from './FormularioMoverMesa';
import { useState } from 'react';
import { useImpresoras } from '../../context/ImpresorasContext';

const AccionesMesa = () => {    
    const [modalOpen, setModalOpen] = useState(false);
    const { mesaSeleccionada } = useSalon(); 
    const { local } = useAuth();
    const { impresorasDeTickets } = useImpresoras();

    if (!mesaSeleccionada) return null;

    const handleImprimirTicket = () => {
        const items = mesaSeleccionada.pedidos;
        const total = items.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
        imprimirTicket({
            local: local?.nombre ?? 'Vallis',
            mesa: `Mesa ${mesaSeleccionada.nombre}`,
            items,
            subtotal: total,  // Por ahora el subtotal es igual al total, sin descuentos
            total,
            impresoras: impresorasDeTickets().map(i => i.nombre_sistema),
        });
    };
    
    return (
        <>
            <div  className="flex gap-4 mt-4">
                <button className="bg-blue-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
                onClick={() => setModalOpen(true)}>
                    <Replace size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button className="bg-blue-900 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
                onClick={handleImprimirTicket}>
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