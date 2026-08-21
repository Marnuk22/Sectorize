import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Eye, EyeOff, Lock, Store, UtensilsCrossed, ShoppingBag, Dumbbell, ArrowLeft, Sparkles, Building2 } from 'lucide-react';
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
    const [paso, setPaso]               = useState<1 | 2 | 3>(1);
    const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null);
    const [multisucursal, setMultisucursal] = useState<boolean | null>(null);
    const [nombreLocal, setNombreLocal] = useState('');
    const [email, setEmail]             = useState('');
    const [clave, setClave]             = useState('');
    const [verClave, setVerClave]       = useState(false);
    const [cargando, setCargando]       = useState(false);
    const [error, setError]             = useState('');
    const [registroExitoso, setRegistroExitoso] = useState(false);

    const elegirTipo = (tipo: TipoNegocio) => {
        setTipoNegocio(tipo);
        setPaso(2);
    };

    const elegirAlcance = (esMultisucursal: boolean) => {
        setMultisucursal(esMultisucursal);
        setPaso(3);
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

            const { error: fnError } = await supabase.rpc('registrar_local_y_perfil', {
                p_user_id: authData.user.id,
                p_nombre_local: nombreLocal.trim(),
                p_nombre_usuario: email.split('@')[0],
                p_modulos: NEGOCIOS[tipoNegocio].modulos,
                p_plan: 'premium',   // fase de prueba: todos acceden a premium
                p_multisucursal: multisucursal ?? false,
            });
            if (fnError) throw fnError;
            setRegistroExitoso(true);
        } catch (err: any) {
            setError(MENSAJES[err.message] ?? err.message);
        } finally {
            setCargando(false);
        }
    };

    // Pantalla de confirmación de email
    if (registroExitoso) {
        return (
            <div className="text-center space-y-4 py-4">
                <div className="inline-flex p-4 bg-green-100 rounded-full">
                    <Mail className="text-green-600" size={32} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Revisá tu email</h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Te enviamos un correo a <span className="font-medium text-slate-700">{email}</span> con
                        un enlace para confirmar tu cuenta. Hacé click en él para activar tu local.
                    </p>
                </div>
                <p className="text-xs text-slate-400">
                    ¿No te llegó? Revisá la carpeta de spam.
                </p>
            </div>
        );
    }

    // PASO 1 — Tipo de negocio
    if (paso === 1) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-slate-500 text-center mb-4">¿Qué tipo de negocio tenés?</p>
                {(Object.keys(NEGOCIOS) as TipoNegocio[]).map(tipo => {
                    const Icono = ICONOS_NEGOCIO[tipo];
                    const negocio = NEGOCIOS[tipo];
                    return (
                        <button
                            key={tipo}
                            onClick={() => elegirTipo(tipo)}
                            className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-violet-400 hover:bg-violet-50 transition-all text-left group"
                        >
                            <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-violet-100 transition-colors">
                                <Icono size={24} className="text-slate-600 group-hover:text-violet-600" />
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

    // PASO 2 — Único local o multisucursal
    if (paso === 2) {
        return (
            <div className="space-y-3">
                <button
                    type="button"
                    onClick={() => setPaso(1)}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-1"
                >
                    <ArrowLeft size={16} /> Volver
                </button>
                <p className="text-sm text-slate-500 text-center mb-4">¿Tenés un solo local o varias sucursales?</p>
                <button
                    onClick={() => elegirAlcance(false)}
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-violet-400 hover:bg-violet-50 transition-all text-left group"
                >
                    <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-violet-100 transition-colors">
                        <Store size={24} className="text-slate-600 group-hover:text-violet-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">Un solo local</p>
                        <p className="text-xs text-slate-400">Manejo un único local por ahora</p>
                    </div>
                </button>
                <button
                    onClick={() => elegirAlcance(true)}
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-violet-400 hover:bg-violet-50 transition-all text-left group"
                >
                    <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-violet-100 transition-colors">
                        <Building2 size={24} className="text-slate-600 group-hover:text-violet-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">Varias sucursales</p>
                        <p className="text-xs text-slate-400">Manejo (o voy a manejar) más de un local</p>
                    </div>
                </button>
            </div>
        );
    }

    // PASO 3 — Datos de la cuenta
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <button
                type="button"
                onClick={() => setPaso(2)}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
            >
                <ArrowLeft size={16} /> Volver
            </button>

            {/* Aviso de fase de prueba */}
            <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                <Sparkles size={18} className="text-violet-600 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-violet-800">14 días gratis para probar Vallis</p>
                    <p className="text-xs text-violet-600 mt-0.5">
                        Vas a tener todas las funciones disponibles sin cargo. Después, seguís con una
                        suscripción mensual que podés cancelar cuando quieras.
                    </p>
                </div>
            </div>

            {/* Resumen del tipo de negocio elegido */}
            <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl text-sm text-stone-600">
                {tipoNegocio && NEGOCIOS[tipoNegocio].nombre}
            </div>

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

            <label className="flex items-start gap-2 text-xs text-slate-500">
                <input type="checkbox" required className="mt-0.5 accent-violet-600" />
                <span>
                    Acepto los{' '}
                    <a
                        href="https://vallis.com.ar/terminos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 underline"
                    >
                        Términos y Condiciones
                    </a>{' '}
                    de Vallis.
                </span>
            </label>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
                type="submit"
                disabled={cargando}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
            >
                {cargando ? 'Creando local...' : 'Crear mi local'}
            </button>
        </form>
    );
};

export default FormRegistro;