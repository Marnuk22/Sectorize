// Botón de Arrepentimiento (Resolución 424/2020 y modif.) — reembolsa el
// último pago aprobado de la suscripción y cancela la suscripción, dentro
// de la ventana legal de 10 días desde el cobro. Dueño-only.
//
// Deshace la compra ENTERA a propósito (reembolso + cancelación atómica):
// si solo se reembolsara la última cuota y la suscripción siguiera activa,
// el mes que viene se vuelve a cobrar y el arrepentimiento no sirvió de
// nada — ver CLAUDE.md/ROADMAP.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VENTANA_DIAS = 10;

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!user) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors });
        }

        // Solo el dueño puede pedir el reembolso del negocio
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('negocio_id, rol')
            .eq('id', user.id)
            .single();

        if (!perfil || perfil.rol !== 'dueño' || !perfil.negocio_id) {
            return new Response(JSON.stringify({ error: 'Solo el dueño puede solicitar el reembolso' }), { status: 403, headers: cors });
        }

        const { data: negocio } = await supabase
            .from('negocios')
            .select('suscripcion_id, ultimo_pago_id, ultimo_pago_fecha, ultimo_pago_reembolsado')
            .eq('id', perfil.negocio_id)
            .single();

        if (!negocio?.ultimo_pago_id) {
            return new Response(JSON.stringify({ error: 'No hay ningún pago registrado para reembolsar' }), { status: 400, headers: cors });
        }
        if (negocio.ultimo_pago_reembolsado) {
            return new Response(JSON.stringify({ error: 'Ese pago ya fue reembolsado' }), { status: 400, headers: cors });
        }

        // Validación server-side de la ventana de 10 días — nunca confiar
        // solo en que el botón esté oculto/deshabilitado en el frontend.
        const fechaPago = negocio.ultimo_pago_fecha ? new Date(negocio.ultimo_pago_fecha) : null;
        const diasTranscurridos = fechaPago ? (Date.now() - fechaPago.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
        if (diasTranscurridos > VENTANA_DIAS) {
            return new Response(JSON.stringify({ error: 'La ventana de 10 días para el reembolso ya venció' }), { status: 400, headers: cors });
        }

        // Reembolso total (body vacío) — confirmado en sandbox contra la API real.
        const resReembolso = await fetch(`https://api.mercadopago.com/v1/payments/${negocio.ultimo_pago_id}/refunds`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                // Evita que un reintento de red duplique el reembolso — de
                // todas formas MercadoPago ya rechaza un segundo reembolso
                // sobre el mismo pago (confirmado: 400 "not valid for the
                // current payment state"), esto es una capa extra.
                'X-Idempotency-Key': `refund-${negocio.ultimo_pago_id}`,
            },
        });
        const dataReembolso = await resReembolso.json();
        if (!resReembolso.ok) {
            console.error('Error MP reembolsando:', dataReembolso);
            return new Response(JSON.stringify({ error: dataReembolso.message ?? 'No se pudo procesar el reembolso' }), { status: resReembolso.status, headers: cors });
        }

        // El reembolso ya se hizo — a partir de acá, aunque algo falle abajo,
        // el dinero ya volvió, así que se marca el flag igual (no se puede
        // "deshacer" el reembolso reportando error al dueño).
        let avisoParcial: string | undefined;

        // Cancelar la suscripción (mismo PUT que cancelar-suscripcion) para
        // que no se vuelva a cobrar el mes que viene.
        if (negocio.suscripcion_id) {
            try {
                const resCancelar = await fetch(`https://api.mercadopago.com/preapproval/${negocio.suscripcion_id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'cancelled' }),
                });
                if (!resCancelar.ok) {
                    const dataCancelar = await resCancelar.json();
                    console.error('Error MP cancelando tras reembolso:', dataCancelar);
                    avisoParcial = 'El reembolso se procesó, pero no se pudo cancelar la suscripción automáticamente — cancelala a mano desde el mismo panel.';
                }
            } catch (err) {
                console.error('Error de red cancelando tras reembolso:', err);
                avisoParcial = 'El reembolso se procesó, pero no se pudo cancelar la suscripción automáticamente — cancelala a mano desde el mismo panel.';
            }
        }

        await supabase
            .from('negocios')
            .update({
                ultimo_pago_reembolsado: true,
                suscripcion_estado: 'cancelada',
                suscripcion_vence: new Date().toISOString(),
            })
            .eq('id', perfil.negocio_id);

        return new Response(JSON.stringify({ ok: true, aviso: avisoParcial }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers: cors });
    }
});
