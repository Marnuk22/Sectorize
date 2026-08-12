import { useState } from 'react';
import { Check, Sparkles, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { estadoAcceso } from '../../logic/suscripcion';
import { Tarjeta, Campo, Boton } from '../ui/ComponentesBase';

const PRECIO = 30000;

// Días entre hoy y una fecha (redondeado hacia arriba)
const diasRestantes = (fecha: string | null): number => {
    if (!fecha) return 0;
    const ms = new Date(fecha).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

const PanelMiPlan = () => {
    const { local, user } = useAuth();
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [emailMP, setEmailMP] = useState(user?.email ?? '');

    const estado = local?.suscripcion_estado ?? 'prueba';
    const diasPrueba = diasRestantes(local?.prueba_vence ?? null);
    const diasSuscripcion = diasRestantes(local?.suscripcion_vence ?? null);
    // "activa" según la DB no alcanza: si el webhook nunca la marcó vencida,
    // hay que chequear la fecha real (estadoAcceso) para saber si sigue vigente.
    const activaVigente = estado === 'activa' && estadoAcceso(local) === 'ok';

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
        </div>
    );
};

export default PanelMiPlan;