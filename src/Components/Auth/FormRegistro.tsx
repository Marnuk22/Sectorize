import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Eye, EyeOff, Lock, Store } from 'lucide-react';
import InputVallis from './InputVallis';

const MENSAJES: Record<string, string> = {
    'User already registered': 'Ya existe una cuenta con ese email',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 8 caracteres',
};

const FormRegistro = () => {
    const [nombreLocal, setNombreLocal] = useState('');
    const [email, setEmail]             = useState('');
    const [clave, setClave]             = useState('');
    const [verClave, setVerClave]       = useState(false);
    const [cargando, setCargando]       = useState(false);
    const [error, setError]             = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cargando) return;
        setError('');

        if (nombreLocal.trim().length < 2) {
            setError('El nombre del local debe tener al menos 2 caracteres');
            return;
        }
        if (clave.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setCargando(true);
        try {
            // 1. Crear usuario en Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password: clave,
            });
            if (authError) throw authError;
            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            // 2. Crear local y vincular perfil atómicamente
            const { error: fnError } = await supabase.rpc('registrar_local_y_perfil', {
                p_user_id: authData.user.id,
                p_nombre_local: nombreLocal.trim(),
                p_nombre_usuario: email.split('@')[0],
            });
            if (fnError) throw fnError;

        } catch (err: any) {
            setError(MENSAJES[err.message] ?? err.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputVallis
                label="Nombre del local"
                icon={Store}
                value={nombreLocal}
                onChange={e => setNombreLocal(e.target.value)}
                placeholder="Ej: Cafetería Central"
                required
            />
            <InputVallis
                label="Email"
                icon={Mail}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
            />
            <InputVallis
                label="Contraseña"
                icon={Lock}
                type={verClave ? 'text' : 'password'}
                value={clave}
                onChange={e => setClave(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                rightElement={
                    <button type="button" onClick={() => setVerClave(!verClave)} className="p-2 text-slate-400">
                        {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                }
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
                type="submit"
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
            >
                {cargando ? 'Creando local...' : 'Crear mi local'}
            </button>
        </form>
    );
};

export default FormRegistro;