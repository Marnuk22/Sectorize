import { useState } from 'react';
import { Eye, EyeOff, Lock, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ModalBase, Campo, Boton } from '../ui/ComponentesBase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

// Cambio de contraseña "seguro": no alcanza con que la sesión ya esté
// autenticada (un dispositivo compartido/olvidado con la sesión abierta
// podría cambiarla sin saberla) — se re-valida la contraseña actual contra
// Supabase Auth antes de aplicar la nueva.
const ModalCambiarPassword = ({ isOpen, onClose }: Props) => {
    const { user } = useAuth();
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [verActual, setVerActual] = useState(false);
    const [verNueva, setVerNueva] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [listo, setListo] = useState(false);

    const cerrar = () => {
        setActual(''); setNueva(''); setConfirmar('');
        setError(''); setListo(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cargando) return;
        setError('');

        if (nueva.length < 8) {
            setError('La contraseña nueva debe tener al menos 8 caracteres');
            return;
        }
        if (nueva !== confirmar) {
            setError('Las contraseñas nuevas no coinciden');
            return;
        }
        if (!user?.email) {
            setError('No se pudo identificar la cuenta');
            return;
        }

        setCargando(true);
        try {
            // Re-valida la contraseña actual antes de cambiarla
            const { error: errorActual } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: actual,
            });
            if (errorActual) {
                setError('La contraseña actual no es correcta');
                return;
            }

            const { error: errorUpdate } = await supabase.auth.updateUser({ password: nueva });
            if (errorUpdate) throw errorUpdate;

            setListo(true);
            setTimeout(cerrar, 1200);
        } catch (err: any) {
            setError(err.message ?? 'No se pudo cambiar la contraseña');
        } finally {
            setCargando(false);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={cerrar} titulo="Cambiar contraseña" ancho="sm">
            {listo ? (
                <div className="text-center py-4">
                    <div className="inline-flex p-3 bg-green-100 rounded-full mb-3">
                        <Check className="text-green-600" size={24} />
                    </div>
                    <p className="text-sm font-bold text-stone-700">Contraseña actualizada</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <Campo
                        etiqueta="Contraseña actual"
                        type={verActual ? 'text' : 'password'}
                        value={actual}
                        onChange={e => setActual(e.target.value)}
                        autoComplete="current-password"
                        required
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => setVerActual(!verActual)}
                        className="text-xs text-stone-400 hover:text-stone-600 -mt-2"
                    >
                        {verActual ? <span className="inline-flex items-center gap-1"><EyeOff size={12} /> Ocultar</span> : <span className="inline-flex items-center gap-1"><Eye size={12} /> Mostrar</span>}
                    </button>
                    <Campo
                        etiqueta="Contraseña nueva"
                        type={verNueva ? 'text' : 'password'}
                        value={nueva}
                        onChange={e => setNueva(e.target.value)}
                        ayuda="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setVerNueva(!verNueva)}
                        className="text-xs text-stone-400 hover:text-stone-600 -mt-2"
                    >
                        {verNueva ? <span className="inline-flex items-center gap-1"><EyeOff size={12} /> Ocultar</span> : <span className="inline-flex items-center gap-1"><Eye size={12} /> Mostrar</span>}
                    </button>
                    <Campo
                        etiqueta="Confirmar contraseña nueva"
                        type={verNueva ? 'text' : 'password'}
                        value={confirmar}
                        onChange={e => setConfirmar(e.target.value)}
                        autoComplete="new-password"
                        required
                    />

                    {error && (
                        <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl text-red-600 text-xs">
                            <AlertCircle size={14} className="shrink-0" /> {error}
                        </div>
                    )}

                    <Boton
                        type="submit"
                        variante="primario"
                        icono={<Lock size={15} />}
                        disabled={cargando || !actual || !nueva || !confirmar}
                        className="w-full"
                    >
                        {cargando ? 'Cambiando...' : 'Cambiar contraseña'}
                    </Boton>
                </form>
            )}
        </ModalBase>
    );
};

export default ModalCambiarPassword;
