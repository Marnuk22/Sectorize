import { useState } from 'react';
import { Coffee, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import InputVallis from './InputVallis';

// Se muestra cuando el usuario llega desde el link de "olvidé mi
// contraseña" del mail (Supabase ya le creó una sesión de recuperación,
// ver AuthContext / evento PASSWORD_RECOVERY). No hace falta pedirle la
// contraseña vieja acá: el link del mail ya demuestra que tiene acceso a
// esa casilla, que es la verificación de identidad.
const PantallaRestablecerPassword = () => {
    const { salirDeRecuperacion } = useAuth();
    const [nueva, setNueva] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [verClave, setVerClave] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [listo, setListo] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cargando) return;
        setError('');

        if (nueva.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (nueva !== confirmar) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setCargando(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: nueva });
            if (error) throw error;
            setListo(true);
            // La sesión de recuperación cerró su propósito: se cierra y se
            // vuelve al login para que entre con la contraseña nueva.
            setTimeout(async () => {
                await supabase.auth.signOut();
                salirDeRecuperacion();
            }, 1500);
        } catch (err: any) {
            setError(err.message ?? 'No se pudo cambiar la contraseña');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <div className="inline-flex p-4 bg-blue-600 rounded-3xl shadow-xl mb-4">
                        <Coffee className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight italic">VALLIS</h1>
                    <p className="text-slate-500 mt-2">Elegí tu contraseña nueva</p>
                </header>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    {listo ? (
                        <div className="text-center py-4">
                            <div className="inline-flex p-3 bg-green-100 rounded-full mb-3">
                                <Check className="text-green-600" size={28} />
                            </div>
                            <p className="font-bold text-slate-800">Contraseña actualizada</p>
                            <p className="text-sm text-slate-500 mt-1">Ya podés iniciar sesión con ella.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <InputVallis
                                label="Contraseña nueva"
                                icon={Lock}
                                type={verClave ? 'text' : 'password'}
                                value={nueva}
                                onChange={e => setNueva(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                required
                                autoFocus
                                rightElement={
                                    <button type="button" onClick={() => setVerClave(!verClave)} className="p-2 text-slate-400">
                                        {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                }
                            />
                            <InputVallis
                                label="Confirmar contraseña"
                                icon={Lock}
                                type={verClave ? 'text' : 'password'}
                                value={confirmar}
                                onChange={e => setConfirmar(e.target.value)}
                                placeholder="Repetila"
                                required
                            />
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={cargando}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
                            >
                                {cargando ? 'Guardando...' : 'Guardar contraseña'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PantallaRestablecerPassword;
