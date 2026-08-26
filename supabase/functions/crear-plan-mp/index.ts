// Crea el plan de suscripción en MercadoPago. Se ejecuta UNA sola vez.
// Ya no la usa nada (suscribir crea la suscripción sin plan asociado) — queda
// desplegada solo por si hace falta volver a correrla, protegida por secreto.
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const INTERNAL_FUNCTION_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET')!;

Deno.serve(async (req) => {
    if (req.headers.get('x-vallis-secret') !== INTERNAL_FUNCTION_SECRET) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
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
                transaction_amount: 28000,
                currency_id: 'ARS',
            },
            back_url: 'https://app.vallis.com.ar',
        }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data, null, 2), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
    });
});