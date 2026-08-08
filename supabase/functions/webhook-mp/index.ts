// Recibe las notificaciones de MercadoPago sobre suscripciones
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
    try {
        const body = await req.json();

        // MercadoPago avisa el tipo de evento y el id del recurso
        const tipo = body.type;
        const id = body.data?.id;

        // Nos interesan los eventos de suscripción
        if (tipo !== 'subscription_preapproval') {
            return new Response('ok', { status: 200 });  // otros eventos: los ignoramos pero respondemos ok
        }

        // Consultar el estado real de la suscripción a MercadoPago
        const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
        });
        const sub = await res.json();

        // external_reference es el local_id que guardamos al suscribir
        const localId = sub.external_reference;
        const estadoMP = sub.status;  // 'authorized', 'paused', 'cancelled'

        if (!localId) return new Response('ok', { status: 200 });

        // Traducir el estado de MercadoPago al nuestro
        let estado: string;
        let vence: string | null = null;

        if (estadoMP === 'authorized') {
            estado = 'activa';
            // La próxima fecha de cobro marca hasta cuándo está paga
            if (sub.next_payment_date) vence = sub.next_payment_date;
        } else if (estadoMP === 'paused') {
            estado = 'vencida';
            vence = new Date().toISOString();
        } else if (estadoMP === 'cancelled') {
            estado = 'cancelada';
            vence = new Date().toISOString();
        } else {
            estado = 'vencida';
            vence = new Date().toISOString();
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
            .from('locales')
            .update({
                suscripcion_estado: estado,
                suscripcion_id: id,
                suscripcion_vence: vence,
            })
            .eq('id', localId);

        return new Response('ok', { status: 200 });

    } catch (err) {
        console.error('Error webhook:', err);
        // Igual respondemos 200: si devolvemos error, MP reintenta en loop
        return new Response('ok', { status: 200 });
    }
});