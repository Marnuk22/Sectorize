import { useState, useEffect } from 'react';
import { Check, Sparkles, Clock, AlertCircle, Loader2, XCircle, RotateCcw, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { estadoAcceso } from '../../logic/suscripcion';
import { Tarjeta, Campo, Boton } from '../ui/ComponentesBase';

const PRECIO = 30000;
// App "Vallis ERP" en Tiendanube Partners — id público, no es un secreto.
const TIENDANUBE_APP_ID = '42195';
// Derecho de revocación (Resolución 424/2020 y modif.): 10 días desde el
// cobro para arrepentirse y pedir el reembolso real, no solo cancelar.
const VENTANA_DIAS_REEMBOLSO = 10;

// Días entre hoy y una fecha (redondeado hacia arriba)
const diasRestantes = (fecha: string | null): number => {
    if (!fecha) return 0;
    const ms = new Date(fecha).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

// fecha + N días, en ISO — para reusar diasRestantes() en vez de llamar
// Date.now() de nuevo directo en el render (Date.now() ahí adentro rompe la
// regla de pureza de componentes).
const sumarDias = (fechaISO: string, dias: number): string => {
    const fecha = new Date(fechaISO);
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString();
};

const PanelMiPlan = () => {
    const { negocio, user, perfil, refrescar } = useAuth();
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [emailMP, setEmailMP] = useState(user?.email ?? '');
    const [confirmarCancelar, setConfirmarCancelar] = useState(false);
    const [cancelando, setCancelando] = useState(false);
    const [errorCancelar, setErrorCancelar] = useState('');
    const [confirmarReembolso, setConfirmarReembolso] = useState(false);
    const [reembolsando, setReembolsando] = useState(false);
    const [errorReembolso, setErrorReembolso] = useState('');
    const [avisoReembolso, setAvisoReembolso] = useState('');
    const [conectandoTiendanube, setConectandoTiendanube] = useState(false);
    const [errorTiendanube, setErrorTiendanube] = useState('');
    const [avisoTiendanube, setAvisoTiendanube] = useState('');

    const estado = negocio?.suscripcion_estado ?? 'prueba';
    const diasPrueba = diasRestantes(negocio?.prueba_vence ?? null);
    const diasSuscripcion = diasRestantes(negocio?.suscripcion_vence ?? null);
    // "activa" según la DB no alcanza: si el webhook nunca la marcó vencida,
    // hay que chequear la fecha real (estadoAcceso) para saber si sigue vigente.
    const activaVigente = estado === 'activa' && estadoAcceso(negocio) === 'ok';
    const puedeCancelar = perfil?.rol === 'dueño' && !!negocio?.suscripcion_id && estado !== 'cancelada';

    // Ventana de 10 días desde el último pago aprobado — el chequeo real
    // (server-side, no confiar solo en esto) vive en reembolsar-pago.
    const diasRestantesReembolso = negocio?.ultimo_pago_fecha
        ? diasRestantes(sumarDias(negocio.ultimo_pago_fecha, VENTANA_DIAS_REEMBOLSO))
        : 0;
    const puedeReembolsar = perfil?.rol === 'dueño'
        && !!negocio?.ultimo_pago_id
        && !negocio?.ultimo_pago_reembolsado
        && diasRestantesReembolso > 0;

    // Al volver del callback de OAuth de Tiendanube, Vallis redirige acá con
    // ?tiendanube=conectado|error. Se muestra el aviso una vez y se limpia
    // la URL para que un refresh no lo vuelva a disparar.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const resultado = params.get('tiendanube');
        if (!resultado) return;

        const mostrarResultado = () => {
            if (resultado === 'conectado') setAvisoTiendanube('Tienda de Tiendanube conectada correctamente.');
            else setErrorTiendanube('No se pudo conectar con Tiendanube. Probá de nuevo.');
        };
        mostrarResultado();

        params.delete('tiendanube');
        const query = params.toString();
        const nuevaUrl = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
        window.history.replaceState({}, '', nuevaUrl);
    }, []);

    const handleConectarTiendanube = async () => {
        if (!negocio?.id) return;
        setConectandoTiendanube(true);
        setErrorTiendanube('');
        try {
            const token = crypto.randomUUID();
            const { error: errInsert } = await supabase
                .from('oauth_pendientes')
                .insert({ token, negocio_id: negocio.id });
            if (errInsert) throw errInsert;

            window.location.href = `https://www.tiendanube.com/apps/${TIENDANUBE_APP_ID}/authorize?state=${token}`;
        } catch (err: any) {
            setErrorTiendanube(err.message ?? 'No se pudo iniciar la conexión con Tiendanube');
            setConectandoTiendanube(false);
        }
    };

    const handleCancelar = async () => {
        setCancelando(true);
        setErrorCancelar('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa');

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancelar-suscripcion`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'No se pudo cancelar la suscripción');

            await refrescar();
            setConfirmarCancelar(false);
        } catch (err: any) {
            setErrorCancelar(err.message ?? 'Ocurrió un error');
        } finally {
            setCancelando(false);
        }
    };

    const handleReembolsar = async () => {
        setReembolsando(true);
        setErrorReembolso('');
        setAvisoReembolso('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa');

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reembolsar-pago`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'No se pudo procesar el reembolso');

            await refrescar();
            setConfirmarReembolso(false);
            if (data.aviso) setAvisoReembolso(data.aviso);
        } catch (err: any) {
            setErrorReembolso(err.message ?? 'Ocurrió un error');
        } finally {
            setReembolsando(false);
        }
    };

    const handleSuscribirse = async () => {
        setCargando(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa');

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suscribir`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ payer_email: emailMP }),
                }
            );
            const data = await res.json();
            if (!res.ok || !data.init_point) {
                throw new Error(data.error ?? 'No se pudo iniciar la suscripción');
            }

            // Redirigir a MercadoPago
            window.location.href = data.init_point;
        } catch (err: any) {
            setError(err.message ?? 'Ocurrió un error');
            setCargando(false);
        }
    };

    // --- Tarjeta de estado según la situación ---
    const renderEstado = () => {
        if (activaVigente) {
            return (
                <Tarjeta tono="exito" padding="lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Check size={18} className="text-green-600" />
                        <h3 className="font-bold text-stone-800">Suscripción activa</h3>
                    </div>
                    <p className="text-sm text-stone-600">
                        Tu suscripción a Vallis está al día.
                        {diasSuscripcion > 0 && ` Próxima renovación en ${diasSuscripcion} día${diasSuscripcion === 1 ? '' : 's'}.`}
                    </p>
                </Tarjeta>
            );
        }

        if (estado === 'prueba') {
            const porVencer = diasPrueba <= 2;
            return (
                // amber no es uno de los 4 tonos del sistema (solo hay "alerta"=rojo);
                // se fuerza con !important en vez de agregar un tono nuevo sin acordarlo.
                <Tarjeta tono="acento" padding="lg" className={porVencer ? '!bg-amber-50 !border-amber-200' : ''}>
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={18} className={porVencer ? 'text-amber-600' : 'text-violet-600'} />
                        <h3 className="font-bold text-stone-800">Período de prueba</h3>
                    </div>
                    <p className="text-sm text-stone-600">
                        {diasPrueba > 0
                            ? `Te quedan ${diasPrueba} día${diasPrueba === 1 ? '' : 's'} de prueba gratis.`
                            : 'Tu período de prueba terminó. Suscribite para seguir usando Vallis.'}
                    </p>
                </Tarjeta>
            );
        }

        // vencida o cancelada
        return (
            <Tarjeta tono="alerta" padding="lg">
                <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={18} className="text-red-600" />
                    <h3 className="font-bold text-stone-800">
                        {estado === 'cancelada' ? 'Suscripción cancelada' : 'Suscripción vencida'}
                    </h3>
                </div>
                <p className="text-sm text-stone-600">
                    Reactivá tu suscripción para seguir usando todas las funciones de Vallis.
                </p>
            </Tarjeta>
        );
    };

    const mostrarBoton = !activaVigente;

    return (
        <div className="space-y-4">
            {renderEstado()}

            {/* Tarjeta del plan */}
            <Tarjeta padding="lg">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-stone-800">Vallis</h3>
                        <p className="text-xs text-stone-400">Todas las funciones, sin límites</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-stone-800">${PRECIO.toLocaleString()}</p>
                        <p className="text-xs text-stone-400">/mes</p>
                    </div>
                </div>

                <ul className="space-y-2 mb-4">
                    {['Ventas y arqueos ilimitados', 'Inventario y control de stock', 'Catálogo público', 'Alertas por mail', 'Todas las funciones futuras'].map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
                            <Check size={15} className="text-green-500 shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>

                {mostrarBoton && (
                    <div className="mb-3">
                        <Campo
                            etiqueta="Email de tu cuenta de MercadoPago"
                            type="email"
                            value={emailMP}
                            onChange={(e) => setEmailMP(e.target.value)}
                            placeholder="tu-email@mercadopago.com"
                            ayuda="Usá el email con el que iniciás sesión en MercadoPago, no necesariamente el mismo que usás en Vallis."
                        />
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm mb-3">
                        <AlertCircle size={15} className="shrink-0" /> {error}
                    </div>
                )}

                {mostrarBoton && (
                    <Boton
                        variante="primario"
                        onClick={handleSuscribirse}
                        disabled={cargando || !emailMP.trim()}
                        className="w-full"
                    >
                        {cargando ? <><Loader2 size={16} className="animate-spin" /> Redirigiendo...</> : <><Sparkles size={16} /> Suscribirme</>}
                    </Boton>
                )}
            </Tarjeta>

            {puedeCancelar && (
                <Tarjeta padding="lg">
                    {!confirmarCancelar ? (
                        <button
                            onClick={() => setConfirmarCancelar(true)}
                            className="flex items-center gap-2 text-sm text-stone-400 hover:text-red-500 transition-colors"
                        >
                            <XCircle size={15} />
                            Cancelar suscripción
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-stone-600">
                                Se corta la renovación automática. Vas a seguir teniendo acceso hasta el
                                final del período ya pagado — después, la cuenta queda bloqueada.
                            </p>
                            {errorCancelar && (
                                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl text-red-600 text-xs">
                                    <AlertCircle size={14} className="shrink-0" /> {errorCancelar}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Boton
                                    variante="secundario"
                                    onClick={() => { setConfirmarCancelar(false); setErrorCancelar(''); }}
                                    disabled={cancelando}
                                    className="flex-1"
                                >
                                    Volver
                                </Boton>
                                <Boton
                                    variante="peligro"
                                    onClick={handleCancelar}
                                    disabled={cancelando}
                                    className="flex-1"
                                >
                                    {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
                                </Boton>
                            </div>
                        </div>
                    )}
                </Tarjeta>
            )}

            {puedeReembolsar && (
                <Tarjeta padding="lg">
                    {!confirmarReembolso ? (
                        <button
                            onClick={() => setConfirmarReembolso(true)}
                            className="flex items-center gap-2 text-sm text-stone-400 hover:text-violet-600 transition-colors"
                        >
                            <RotateCcw size={15} />
                            Solicitar reembolso ({diasRestantesReembolso} día{diasRestantesReembolso === 1 ? '' : 's'} restantes)
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-stone-600">
                                Derecho de arrepentimiento: dentro de los 10 días del cobro podés pedir el
                                reembolso real del último pago. Esto además cancela la suscripción — no se
                                te va a volver a cobrar.
                            </p>
                            {errorReembolso && (
                                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl text-red-600 text-xs">
                                    <AlertCircle size={14} className="shrink-0" /> {errorReembolso}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Boton
                                    variante="secundario"
                                    onClick={() => { setConfirmarReembolso(false); setErrorReembolso(''); }}
                                    disabled={reembolsando}
                                    className="flex-1"
                                >
                                    Volver
                                </Boton>
                                <Boton
                                    variante="peligro"
                                    onClick={handleReembolsar}
                                    disabled={reembolsando}
                                    className="flex-1"
                                >
                                    {reembolsando ? 'Procesando...' : 'Sí, reembolsar'}
                                </Boton>
                            </div>
                        </div>
                    )}
                </Tarjeta>
            )}

            {avisoReembolso && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-sm">
                    <AlertCircle size={15} className="shrink-0" /> {avisoReembolso}
                </div>
            )}

            {perfil?.rol === 'dueño' && (
                <Tarjeta padding="lg">
                    <h3 className="font-bold text-stone-800 mb-3">Integraciones</h3>

                    {negocio?.tiendanube_store_id ? (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 text-sm text-stone-600">
                            <Store size={18} className="text-green-600 shrink-0" />
                            <span className="flex-1">Conectado con Tiendanube (tienda #{negocio.tiendanube_store_id})</span>
                            {/* Necesario cuando cambian los permisos de la app: Tiendanube
                                emite un token nuevo solo si se vuelve a autorizar. */}
                            <button
                                onClick={handleConectarTiendanube}
                                disabled={conectandoTiendanube}
                                className="text-xs text-stone-400 hover:text-violet-600 disabled:opacity-60 shrink-0"
                            >
                                {conectandoTiendanube ? 'Redirigiendo...' : 'Reconectar'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleConectarTiendanube}
                            disabled={conectandoTiendanube}
                            className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-sm text-stone-700 disabled:opacity-60"
                        >
                            {conectandoTiendanube ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Store size={18} className="shrink-0" />}
                            Conectar con Tiendanube
                        </button>
                    )}

                    {avisoTiendanube && (
                        <div className="flex items-center gap-2 p-2.5 mt-2 bg-green-50 rounded-xl text-green-700 text-xs">
                            <Check size={14} className="shrink-0" /> {avisoTiendanube}
                        </div>
                    )}
                    {errorTiendanube && (
                        <div className="flex items-center gap-2 p-2.5 mt-2 bg-red-50 rounded-xl text-red-600 text-xs">
                            <AlertCircle size={14} className="shrink-0" /> {errorTiendanube}
                        </div>
                    )}
                </Tarjeta>
            )}
        </div>
    );
};

export default PanelMiPlan;