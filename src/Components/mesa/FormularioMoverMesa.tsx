import { useState } from 'react';
import { Replace, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSalon } from '../../context';

interface ModalTransferenciaProps {
    mesaOrigenId: string;
    isOpen: boolean;
    onClose: () => void;
}

const FormularioMoverMesa = ({ mesaOrigenId, isOpen, onClose }: ModalTransferenciaProps) => {
    const [idDestino, setIdDestino] = useState('');
    const { transferirMesa, seleccionarMesa, seleccionarSector, sectorBuscado, sectores } = useSalon();

    if (!isOpen) return null;

    // Buscar mesa destino por nombre (el usuario escribe el nombre visible)
    const buscarMesaPorNombre = (nombre: string) => {
        for (const sector of sectores) {
            const mesa = sector.mesas.find(m => m.nombre === nombre);
            if (mesa) return mesa;
        }
        return null;
    };

    const ejecutarTransferencia = () => {
        if (!idDestino.trim()) return;

        const mesaDestino = buscarMesaPorNombre(idDestino.trim());
        if (!mesaDestino) return;
        if (mesaDestino.id === mesaOrigenId) return;

        transferirMesa(mesaOrigenId, mesaDestino.id);

        const nuevoSector = sectorBuscado(mesaDestino.id);
        if (nuevoSector !== null) {
            seleccionarSector(nuevoSector);
            seleccionarMesa(mesaDestino.id);
        }

        setIdDestino('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-blue-900 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <Replace size={20} />
                        <span className="font-semibold text-lg">Transferir Mesa {sectores.flatMap(s => s.mesas).find(m => m.id === mesaOrigenId)?.nombre}</span>
                    </div>
                    <button onClick={onClose} className="hover:bg-blue-800 p-1 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la mesa destino
                    </label>
                    <input
                        type="text"
                        autoFocus
                        value={idDestino}
                        onChange={e => setIdDestino(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && ejecutarTransferencia()}
                        placeholder="Ej: Mesa 3"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-xl text-center font-bold transition-colors"
                    />
                    <div className="mt-4 flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p className="text-xs">Los pedidos se moverán a la mesa destino y esta quedará libre.</p>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={ejecutarTransferencia}
                        className="flex-1 px-4 py-2 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <CheckCircle2 size={18} /> Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormularioMoverMesa;