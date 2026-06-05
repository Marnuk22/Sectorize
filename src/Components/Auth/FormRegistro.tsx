import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Eye, EyeOff, Lock, Store, UtensilsCrossed, ShoppingBag, Dumbbell, ArrowLeft } from 'lucide-react';
import InputVallis from './InputVallis';
import { NEGOCIOS, type TipoNegocio } from '../../config/modulos';

const MENSAJES: Record<string, string> = {
    'User already registered': 'Ya existe una cuenta con ese email',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 8 caracteres',
};

const ICONOS_NEGOCIO: Record<TipoNegocio, typeof Store> = {
    restaurante: UtensilsCrossed,
    tienda:      ShoppingBag,
    servicios:   Dumbbell,
};

const FormRegistro = () => {
    const [paso, setPaso]               = useState<1 | 2>(1);
    const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null);
    const [nombreLocal, setNombreLocal] = useState('');
    const [email, setEmail]             = useState('');
    const [clave, setClave]             = useState('');
    const [verClave, setVerClave]       = useState(false);
    const [cargando, setCargando]       = useState(false);
    const [error, setError]             = useState('');

    const elegirTipo = (tipo: TipoNegocio) => {
        setTipoNegocio(tipo);
        setPaso(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cargando || !tipoNegocio) return;
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
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password: clave,
            });
            if (authError) throw authError;
            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            // Pasar los módulos según el tipo de negocio elegido
            const { error: fnError } = await supabase.rpc('registrar_local_y_perfil', {
                p_user_id: authData.user.id,
                p_nombre_local: nombreLocal.trim(),
                p_nombre_usuario: email.split('@')[0],
                p_modulos: NEGOCIOS[tipoNegocio].modulos,
            });
            if (fnError) throw fnError;

        } catch (err: any) {
            setError(MENSAJES[err.message] ?? err.message);
        } finally {
            setCargando(false);
        }
    };

    // PASO 1 — Elegir tipo de negocio
    if (paso === 1) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-slate-500 text-center mb-4">
                    ¿Qué tipo de negocio tenés?
                </p>
                {(Object.keys(NEGOCIOS) as TipoNegocio[]).map(tipo => {
                    const Icono = ICONOS_NEGOCIO[tipo];
                    const negocio = NEGOCIOS[tipo];
                    return (
                        <button
                            key={tipo}
                            onClick={() => elegirTipo(tipo)}
                            className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                        >
                            <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-blue-100 transition-colors">
                                <Icono size={24} className="text-slate-600 group-hover:text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{negocio.nombre}</p>
                                <p className="text-xs text-slate-400">{negocio.descripcion}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    }

    // PASO 2 — Datos del local
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <button
                type="button"
                onClick={() => setPaso(1)}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
            >
                <ArrowLeft size={16} /> Cambiar tipo de negocio
            </button>

            {tipoNegocio && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-xl text-sm text-blue-700">
                    {(() => {
                        const Icono = ICONOS_NEGOCIO[tipoNegocio];
                        return <Icono size={16} />;
                    })()}
                    {NEGOCIOS[tipoNegocio].nombre}
                </div>
            )}

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