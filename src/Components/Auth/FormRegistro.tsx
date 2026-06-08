import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Eye, EyeOff, Lock, Store, UtensilsCrossed, ShoppingBag, Dumbbell, ArrowLeft, Check, Banknote } from 'lucide-react';
import InputVallis from './InputVallis';
import { NEGOCIOS, type TipoNegocio } from '../../config/modulos';
import { PLANES, type Plan } from '../../config/planes';

const MENSAJES: Record<string, string> = {
    'User already registered': 'Ya existe una cuenta con ese email',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 8 caracteres',
};

const ICONOS_NEGOCIO: Record<TipoNegocio, typeof Store> = {
    restaurante: UtensilsCrossed,
    tienda:      ShoppingBag,
    servicios:   Dumbbell,
};

// Planes ofrecidos en el registro (sin gratis)
const PLANES_REGISTRO: Plan[] = ['basico', 'premium'];

const FormRegistro = () => {
    const [paso, setPaso]               = useState<1 | 2 | 3>(1);
    const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio | null>(null);
    const [planElegido, setPlanElegido] = useState<Plan | null>(null);
    const [pagoEfectivo, setPagoEfectivo] = useState(false);
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

    const elegirPlan = (plan: Plan) => {
        setPlanElegido(plan);
        setPaso(3);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cargando || !tipoNegocio || !planElegido) return;
        setError('');

        if (nombreLocal.trim().length < 2) {
            setError('El nombre del local debe tener al menos 2 caracteres');
            return;
        }
        if (clave.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (!pagoEfectivo) {
            setError('Confirmá el método de pago para continuar');
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
                p_plan: planElegido,
            });
            if (fnError) throw fnError;

        } catch (err: any) {
            setError(MENSAJES[err.message] ?? err.message);
        } finally {
            setCargando(false);
        }
    };

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

    // PASO 2 — Elegir plan
    if (paso === 2) {
        return (
            <div className="space-y-3">
                <button
                    type="button"
                    onClick={() => setPaso(1)}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-2"
                >
                    <ArrowLeft size={16} /> Volver
                </button>
                <p className="text-sm text-slate-500 text-center mb-4">Elegí tu plan</p>
                {PLANES_REGISTRO.map(planId => {
                    const plan = PLANES[planId];
                    return (
                        <button
                            key={planId}
                            onClick={() => elegirPlan(planId)}
                            className="w-full p-4 border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="font-bold text-slate-800">{plan.nombre}</p>
                                    <p className="text-xs text-slate-400">{plan.descripcion}</p>
                                </div>
                                <p className="text-xl font-black text-slate-800">${plan.precio.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mes</span></p>
                            </div>
                            <ul className="space-y-1">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                        <Check size={13} className="text-green-500 shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </button>
                    );
                })}
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

            {/* Resumen de lo elegido */}
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-xl text-sm text-blue-700">
                {tipoNegocio && NEGOCIOS[tipoNegocio].nombre} · Plan {planElegido && PLANES[planElegido].nombre}
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

            {/* Casilla pago en efectivo (provisorio) */}
            <button
                type="button"
                onClick={() => setPagoEfectivo(!pagoEfectivo)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${pagoEfectivo ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${pagoEfectivo ? 'bg-green-600' : 'border border-slate-300'}`}>
                    {pagoEfectivo && <Check size={13} className="text-white" />}
                </div>
                <Banknote size={18} className={pagoEfectivo ? 'text-green-600' : 'text-slate-400'} />
                <div className="text-left">
                    <p className={`text-sm font-medium ${pagoEfectivo ? 'text-green-700' : 'text-slate-600'}`}>Pago en efectivo</p>
                    <p className="text-xs text-slate-400">Coordinaremos el cobro (provisorio)</p>
                </div>
            </button>

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