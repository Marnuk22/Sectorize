import { useState } from 'react';

interface FormularioNuevaMesaProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmar: (nombre: string) => void; // Cambiamos onGuardar por onConfirmar para ser más genéricos
}

const FormularioNuevaMesa = ({ isOpen, onClose, onConfirmar }: FormularioNuevaMesaProps) => {
    const [nombre, setNombre] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const manejarEnvio = () => {
        const nombreLimpio = nombre.trim();
        
        if (!nombreLimpio) {
            setError("El nombre es obligatorio");
            return;
        }

        if (nombreLimpio.length > 20) {
            setError("El nombre es demasiado largo");
            return;
        }

        onConfirmar(nombreLimpio);
        setNombre(""); 
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-150 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-xs animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Nueva Mesa</h2>
                
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
                    Identificador / Nombre
                </label>
                
                <input 
                    autoFocus
                    className={`w-full p-3 border-2 rounded-xl mb-1 outline-none transition-all ${
                        error ? 'border-red-400 bg-red-50' : 'border-gray-100 focus:border-indigo-500'
                    }`}
                    placeholder="Ej: Mesa 5, Barra, VIP..."
                    value={nombre}
                    onChange={(e) => { setNombre(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && manejarEnvio()}
                />

                {error && <p className="text-red-500 text-xs mt-1 mb-2 ml-1 font-medium italic">{error}</p>}

                <div className="flex gap-2 mt-6">
                    <button 
                        onClick={() => { setNombre(""); setError(null); onClose(); }} 
                        className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={manejarEnvio} 
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                    >
                        Crear Mesa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormularioNuevaMesa;