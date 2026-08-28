// Cancela la suscripción de MercadoPago del negocio (dueño-only)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        // Verificar quién pide (el usuario logueado)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!user) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors });
        }

        // Solo el dueño puede cancelar la suscripción del negocio
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('negocio_id, rol')
            .eq('id', user.id)
            .single();

        if (!perfil || perfil.rol !== 'dueño' || !perfil.negocio_id) {
            return new Response(JSON.stringify({ error: 'Solo el dueño puede cancelar la suscripción' }), { status: 403, headers: cors });
        }

        const { data: negocio } = await supabase
            .from('negocios')
            .select('suscripcion_id, suscripcion_estado')
            .eq('id', perfil.negocio_id)
            .single();

        if (!negocio?.suscripcion_id) {
            return new Response(JSON.stringify({ error: 'No hay ninguna suscripción para cancelar' }), { status: 400, headers: cors });
        }
        if (negocio.suscripcion_estado === 'cancelada') {
            return new Response(JSON.stringify({ ok: true, yaEstaba: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // Cancelar en MercadoPago
        const res = await fetch(`https://api.mercadopago.com/preapproval/${negocio.suscripcion_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'cancelled' }),
        });

        const data = await res.json();
        if (!res.ok) {
            console.error('Error MP cancelando:', data);
            return new Response(JSON.stringify({ error: data.message ?? 'No se pudo cancelar la suscripción' }), { status: res.status, headers: cors });
        }

        // Actualizamos ya mismo (misma traducción que usa webhook-mp para
        // 'cancelled'); el webhook igual va a confirmar el mismo estado apenas
        // llegue la notificación, así que esto es solo para no esperarlo.
        await supabase
            .from('negocios')
            .update({ suscripcion_estado: 'cancelada', suscripcion_vence: new Date().toISOString() })
            .eq('id', perfil.negocio_id);

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers: cors });
    }
});
