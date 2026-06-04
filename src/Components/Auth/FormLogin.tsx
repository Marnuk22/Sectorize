import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Eye, EyeOff, Lock } from 'lucide-react';
import InputVallis from './InputVallis';

const MENSAJES: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'Email not confirmed': 'Confirmá tu email antes de ingresar',
};

const FormLogin = () => {
    const [email, setEmail]       = useState('');
    const [clave, setClave]       = useState('');
    const [verClave, setVerClave] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError]       = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cargando) return;
        setError('');
        setCargando(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
            if (error) throw error;
        } catch (err: any) {
            setError(MENSAJES[err.message] ?? err.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
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
                {cargando ? 'Ingresando...' : 'Comenzar jornada'}
            </button>
        </form>
    );
};

export default FormLogin;