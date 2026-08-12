import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
    titulo: string;
    abierto: boolean;
    onCerrar: () => void;
    children: ReactNode;
}

const PanelLateral = ({ titulo, abierto, onCerrar, children }: Props) => {
    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/30 animate-in fade-in duration-200"
                onClick={onCerrar}
            />

            {/* Panel */}
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-bold text-stone-800 text-lg">{titulo}</h2>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PanelLateral;