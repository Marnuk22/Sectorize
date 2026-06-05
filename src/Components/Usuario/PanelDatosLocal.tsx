import { useState } from 'react';
import { Store, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
    onCerrar: () => void;
}

const PanelDatosLocal = ({ onCerrar }: Props) => {
    const { local, actualizarLocal } = useAuth();
    const [nombre, setNombre] = useState(local?.nombre ?? '');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [guardado, setGuardado] = useState(false);

    const handleGuardar = async () => {
        if (nombre.trim().length < 2) {
            setError('El nombre debe tener al menos 2 caracteres');
            return;
        }
        setGuardando(true);
        setError('');
        try {
            await actualizarLocal({ nombre: nombre.trim() });
            setGuardado(true);
            setTimeout(() => { setGuardado(false); onCerrar(); }, 800);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Nombre del local</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                    <Store size={18} className="text-gray-400" />
                    <input
                        className="flex-1 text-sm outline-none"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder="Nombre del local"
                    />
                </div>
                <p className="text-xs text-gray-400">Este nombre aparece en el menú principal.</p>
            </div>

            {/* Tipo de negocio — solo lectura por ahora */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Módulos activos</label>
                <div className="flex flex-wrap gap-2">
                    {(local?.modulos ?? []).map(m => (
                        <span key={m} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                            {m}
                        </span>
                    ))}
                </div>
                <p className="text-xs text-gray-400">El tipo de negocio define tus módulos. Contactanos para cambiarlo.</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
                {guardado ? <><Check size={16} /> Guardado</> : guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
        </div>
    );
};

export default PanelDatosLocal;