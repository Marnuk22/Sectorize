// Genera un link de suscripción para un negocio (cubre todas sus sucursales)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PLAN_ID = 'da358770571245aebdf3a4641b2fdb3d';

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

        // Buscar el negocio del usuario (la suscripción es por negocio, no por sucursal)
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('local_id, negocio_id')
            .eq('id', user.id)
            .single();

        if (!perfil || !perfil.negocio_id) {
            return new Response(JSON.stringify({ error: 'Sin negocio' }), { status: 400, headers: cors });
        }

        // Email de la cuenta de MercadoPago del pagador (puede diferir del email de login)
        let payerEmail = user.email;
        try {
            const body = await req.json();
            if (body?.payer_email) payerEmail = body.payer_email;
        } catch {
            // sin body, se usa el email de login
        }

        // Crear la suscripción SIN plan asociado, en estado pendiente (para redirigir)
        const res = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reason: 'Vallis - Suscripción mensual',
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: 30000,
                    currency_id: 'ARS',
                    start_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                },
                payer_email: payerEmail,
                back_url: 'https://app.vallis.com.ar',
                external_reference: perfil.negocio_id,
                status: 'pending',
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Error MP:', data);
            return new Response(JSON.stringify({ error: data.message || 'No se pudo crear la suscripción', cause: data.cause }), { status: res.status, headers: cors });
        }

        // Guardar el id de la suscripción en el negocio (aplica a todas sus sucursales)
        await supabase
            .from('negocios')
            .update({ suscripcion_id: data.id })
            .eq('id', perfil.negocio_id);

        // Devolver el link al que redirigir
        return new Response(JSON.stringify({ init_point: data.init_point }), {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500, headers: cors });
    }
});