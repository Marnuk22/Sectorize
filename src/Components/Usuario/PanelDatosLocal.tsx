import { useState } from 'react';
import { Store, Check, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModulos } from '../../hooks/useModulos';
import { cuitValido, soloDigitos } from '../../logic/factumono';

interface Props {
    onCerrar: () => void;
}

const PanelDatosLocal = ({ onCerrar }: Props) => {
    const { local, perfil, actualizarLocal } = useAuth();
    const { tiene } = useModulos();
    const mostrarCuit = tiene('facturacion') && perfil?.rol === 'dueño';
    const [cuit, setCuit] = useState(local?.cuit ?? '');
    const [nombre, setNombre] = useState(local?.nombre ?? '');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [guardado, setGuardado] = useState(false);

    const handleGuardar = async () => {
        if (nombre.trim().length < 2) {
            setError('El nombre debe tener al menos 2 caracteres');
            return;
        }
        if (mostrarCuit && cuit.trim() && !cuitValido(cuit)) {
            setError('El CUIT no es válido (11 dígitos, revisá el último número).');
            return;
        }
        setGuardando(true);
        setError('');
        try {
            await actualizarLocal({
                nombre: nombre.trim(),
                ...(mostrarCuit ? { cuit: cuit.trim() ? soloDigitos(cuit) : null } : {}),
            });
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
                <label className="text-xs font-medium text-stone-500">Nombre del local</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500">
                    <Store size={18} className="text-stone-400" />
                    <input
                        className="flex-1 text-sm outline-none"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder="Nombre del local"
                    />
                </div>
                <p className="text-xs text-stone-400">Este nombre aparece en el menú principal.</p>
            </div>

            {mostrarCuit && (
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-stone-500">CUIT del emisor</label>
                    <div className="flex items-center gap-2 border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500">
                        <FileText size={18} className="text-stone-400" />
                        <input
                            className="flex-1 text-sm outline-none"
                            inputMode="numeric"
                            value={cuit}
                            onChange={e => setCuit(e.target.value)}
                            placeholder="20-12345678-9"
                        />
                    </div>
                    <p className="text-xs text-stone-400">Con este CUIT se abre Factumono al facturar. Tiene que ser uno de los de tu cuenta de Factumono.</p>
                </div>
            )}

            {/* Tipo de negocio — solo lectura por ahora */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-500">Módulos activos</label>
                <div className="flex flex-wrap gap-2">
                    {(local?.modulos ?? []).map(m => (
                        <span key={m} className="text-xs px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full capitalize">
                            {m}
                        </span>
                    ))}
                </div>
                <p className="text-xs text-stone-400">El tipo de negocio define tus módulos. Contactanos para cambiarlo.</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
                {guardado ? <><Check size={16} /> Guardado</> : guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
        </div>
    );
};

export default PanelDatosLocal;