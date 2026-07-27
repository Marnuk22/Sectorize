// Genera un link de suscripción para un local
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

        // Buscar el local del usuario
        const { data: perfil } = await supabase
            .from('perfiles')
            .select('local_id')
            .eq('id', user.id)
            .single();

        if (!perfil) {
            return new Response(JSON.stringify({ error: 'Sin local' }), { status: 400, headers: cors });
        }

        // Crear la suscripción en MercadoPago, asociada al plan
        const res = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                preapproval_plan_id: PLAN_ID,
                back_url: 'https://app.vallis.com.ar',
                external_reference: perfil.local_id,  // así el webhook sabe qué local es
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Error MP:', data);
            return new Response(JSON.stringify({ error: 'No se pudo crear la suscripción' }), { status: 500, headers: cors });
        }

        // Guardar el id de la suscripción en el local
        await supabase
            .from('locales')
            .update({ suscripcion_id: data.id })
            .eq('id', perfil.local_id);

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