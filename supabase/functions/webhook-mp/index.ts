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

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // external_reference es el negocio_id que guardamos al suscribir. Las
        // suscripciones creadas ANTES de la migración a suscripción-por-negocio
        // llevan un local_id ahí (no se puede cambiar retroactivamente en MP),
        // así que si no matchea un negocio directo, se resuelve como local viejo.
        const resolverNegocioId = async (externalRef: string | null | undefined): Promise<string | null> => {
            if (!externalRef) return null;
            const { data: negocioDirecto } = await supabase
                .from('negocios').select('id').eq('id', externalRef).maybeSingle();
            if (negocioDirecto) return externalRef;

            const { data: localViejo } = await supabase
                .from('locales').select('negocio_id').eq('id', externalRef).maybeSingle();
            return localViejo?.negocio_id ?? null;
        };

        // --- Cobro puntual de una suscripción (una cuota) ---
        // Es la ÚNICA confirmación real de que se cobró algo: el evento
        // subscription_preapproval con status 'authorized' solo dice que el
        // pagador aceptó el mandato de cobro recurrente, NO que ya se le
        // cobró (MercadoPago cobra la primera cuota recién ~1 hora después,
        // y puede rechazarse). Por eso acá, y no en 'authorized', es donde se
        // activa el acceso.
        if (tipo === 'subscription_authorized_payment') {
            const res = await fetch(`https://api.mercadopago.com/authorized_payments/${id}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
            });
            const cobro = await res.json();

            const negocioId = await resolverNegocioId(cobro.external_reference);
            if (!negocioId) return new Response('ok', { status: 200 });

            // El status de la cuota (`cobro.status`) puede quedar en "processed"
            // tanto si se cobró bien como si se agotaron los reintentos y quedó
            // rechazada — el estado real del cobro está anidado en `payment.status`.
            if (cobro.payment?.status === 'approved') {
                // Re-consultamos la suscripción para la fecha real del próximo cobro.
                const resSub = await fetch(`https://api.mercadopago.com/preapproval/${cobro.preapproval_id}`, {
                    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
                });
                const sub = await resSub.json();

                await supabase
                    .from('negocios')
                    .update({
                        suscripcion_estado: 'activa',
                        suscripcion_id: cobro.preapproval_id,
                        suscripcion_vence: sub.next_payment_date ?? null,
                        // Para el Botón de Arrepentimiento (reembolsar-pago):
                        // necesita saber CUÁL fue el último pago aprobado y
                        // CUÁNDO, para poder reembolsarlo dentro de la
                        // ventana de 10 días. cobro.payment sigue el mismo
                        // shape del recurso Payment estándar de MP (id, status,
                        // etc.), confirmado en sandbox al probar el reembolso.
                        ultimo_pago_id: cobro.payment?.id ? String(cobro.payment.id) : null,
                        ultimo_pago_fecha: new Date().toISOString(),
                        ultimo_pago_reembolsado: false,
                    })
                    .eq('id', negocioId);
            }
            // Si no fue "approved" (rechazada, en proceso, etc.) no tocamos nada:
            // MercadoPago reintenta solo hasta 4 veces por cuota, y si se agotan
            // los reintentos de 3 cuotas seguidas cancela la suscripción sola —
            // ese evento sí llega por subscription_preapproval con status
            // "cancelled", y ahí abajo se bloquea el acceso.

            return new Response('ok', { status: 200 });
        }

        // Nos interesan además los eventos de la suscripción en sí
        if (tipo !== 'subscription_preapproval') {
            return new Response('ok', { status: 200 });  // otros eventos: los ignoramos pero respondemos ok
        }

        // Consultar el estado real de la suscripción a MercadoPago
        const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
        });
        const sub = await res.json();

        const externalRef = sub.external_reference;
        const estadoMP = sub.status;  // 'authorized', 'paused', 'cancelled'

        if (!externalRef) return new Response('ok', { status: 200 });

        // "authorized" solo confirma que el pagador aceptó el mandato de cobro
        // recurrente, no que ya se le cobró algo — eso se maneja arriba, en
        // subscription_authorized_payment. Acá no hay nada que actualizar todavía.
        if (estadoMP === 'authorized') {
            return new Response('ok', { status: 200 });
        }

        // Traducir el estado de MercadoPago al nuestro
        let estado: string;
        let vence: string | null = null;

        if (estadoMP === 'paused') {
            estado = 'vencida';
            vence = new Date().toISOString();
        } else if (estadoMP === 'cancelled') {
            estado = 'cancelada';
            vence = new Date().toISOString();
        } else {
            estado = 'vencida';
            vence = new Date().toISOString();
        }

        const negocioId = await resolverNegocioId(externalRef);
        if (!negocioId) return new Response('ok', { status: 200 });

        await supabase
            .from('negocios')
            .update({
                suscripcion_estado: estado,
                suscripcion_id: id,
                suscripcion_vence: vence,
            })
            .eq('id', negocioId);

        return new Response('ok', { status: 200 });

    } catch (err) {
        console.error('Error webhook:', err);
        // Igual respondemos 200: si devolvemos error, MP reintenta en loop
        return new Response('ok', { status: 200 });
    }
});
