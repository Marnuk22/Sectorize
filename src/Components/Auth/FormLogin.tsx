import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react';
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
    const [recuperar, setRecuperar] = useState(false);
    const [emailRecuperar, setEmailRecuperar] = useState('');
    const [enviado, setEnviado] = useState(false);

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

    const handleRecuperar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cargando) return;
        setError('');
        setCargando(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperar, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            setEnviado(true);
        } catch (err: any) {
            setError(err.message ?? 'No se pudo enviar el mail');
        } finally {
            setCargando(false);
        }
    };

    if (recuperar) {
        if (enviado) {
            return (
                <div className="text-center space-y-4 py-4">
                    <div className="inline-flex p-4 bg-blue-100 rounded-full">
                        <Mail className="text-blue-600" size={32} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Revisá tu email</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Si <span className="font-medium text-slate-700">{emailRecuperar}</span> tiene una
                            cuenta en Vallis, te llega un link para elegir una contraseña nueva.
                        </p>
                    </div>
                    <button
                        onClick={() => { setRecuperar(false); setEnviado(false); setEmailRecuperar(''); }}
                        className="text-blue-600 font-semibold text-sm hover:underline inline-flex items-center gap-1"
                    >
                        <ArrowLeft size={14} /> Volver a ingresar
                    </button>
                </div>
            );
        }

        return (
            <form onSubmit={handleRecuperar} className="space-y-4">
                <p className="text-sm text-slate-500">
                    Poné el email de tu cuenta y te mandamos un link para elegir una contraseña nueva.
                </p>
                <InputVallis
                    label="Email"
                    icon={Mail}
                    type="email"
                    value={emailRecuperar}
                    onChange={e => setEmailRecuperar(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    autoFocus
                />
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <button
                    type="submit"
                    disabled={cargando}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
                >
                    {cargando ? 'Enviando...' : 'Enviar link'}
                </button>
                <button
                    type="button"
                    onClick={() => { setRecuperar(false); setError(''); }}
                    className="w-full text-slate-400 font-medium text-sm hover:text-slate-600 inline-flex items-center justify-center gap-1"
                >
                    <ArrowLeft size={14} /> Volver
                </button>
            </form>
        );
    }

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
            <div className="text-right -mt-2">
                <button
                    type="button"
                    onClick={() => { setRecuperar(true); setError(''); setEmailRecuperar(email); }}
                    className="text-xs text-slate-400 hover:text-blue-600 hover:underline"
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </div>
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
