// Callback de OAuth de Tiendanube: recibe el code, lo canjea por un access_token
// y lo asocia al negocio de Vallis que inició la conexión.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TIENDANUBE_CLIENT_ID = Deno.env.get('TIENDANUBE_CLIENT_ID')!;
const TIENDANUBE_CLIENT_SECRET = Deno.env.get('TIENDANUBE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VALLIS_URL = 'https://app.vallis.com.ar';
// Ventana de validez del token de state (oauth_pendientes) — no confundir
// con el code de Tiendanube en sí, que expira en 30 segundos.
const VENTANA_STATE_MS = 10 * 60 * 1000;

const WEBHOOK_PEDIDOS_URL = `${SUPABASE_URL}/functions/v1/tiendanube-webhook-pedido`;

// Registra order/created y order/cancelled contra la tienda. La doc no dice
// qué pasa si se registra dos veces el mismo evento+url, así que se consulta
// antes con GET /webhooks para no duplicar.
const registrarWebhooksPedidos = async (storeId: string, accessToken: string) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Vallis ERP (soporte@vallis.com.ar)',
    };
    for (const event of ['order/created', 'order/cancelled']) {
        try {
            const resLista = await fetch(
                `https://api.tiendanube.com/v1/${storeId}/webhooks?event=${encodeURIComponent(event)}`,
                { headers },
            );
            const existentes = resLista.ok ? await resLista.json() : [];
            const yaRegistrado = Array.isArray(existentes)
                && existentes.some((w: { event: string; url: string }) => w.event === event && w.url === WEBHOOK_PEDIDOS_URL);
            if (yaRegistrado) continue;

            const resAlta = await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ event, url: WEBHOOK_PEDIDOS_URL }),
            });
            if (!resAlta.ok) console.error(`Error registrando webhook ${event}:`, resAlta.status, await resAlta.text());
        } catch (err) {
            console.error(`Error registrando webhook ${event}:`, err);
        }
    }
};

Deno.serve(async (req) => {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const redirigir = (resultado: 'conectado' | 'error') =>
        Response.redirect(`${VALLIS_URL}/?tiendanube=${resultado}`, 302);

    if (!code || !state) return redirigir('error');

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // El state es un token random de un solo uso generado por el botón
        // "Conectar con Tiendanube" (no el negocio_id directo): así nadie
        // puede armar un link con el state de un negocio ajeno y hacer que
        // otro dueño autorice sin querer una conexión a esa cuenta.
        const { data: pendiente } = await supabase
            .from('oauth_pendientes')
            .select('negocio_id, creado_en')
            .eq('token', state)
            .maybeSingle();

        if (!pendiente) return redirigir('error');

        // De un solo uso: se borra apenas se lee, haya vencido o no.
        await supabase.from('oauth_pendientes').delete().eq('token', state);

        const vencido = Date.now() - new Date(pendiente.creado_en).getTime() > VENTANA_STATE_MS;
        if (vencido) return redirigir('error');

        const resToken = await fetch('https://www.tiendanube.com/apps/authorize/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: TIENDANUBE_CLIENT_ID,
                client_secret: TIENDANUBE_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
            }),
        });
        const dataToken = await resToken.json();

        if (!resToken.ok || !dataToken.access_token || !dataToken.user_id) {
            console.error('Error canjeando code de Tiendanube:', dataToken);
            return redirigir('error');
        }

        const negocioId = pendiente.negocio_id;
        const storeId = String(dataToken.user_id);

        await supabase.from('negocios').update({ tiendanube_store_id: storeId }).eq('id', negocioId);
        await supabase.from('negocio_tiendanube').upsert({
            negocio_id: negocioId,
            access_token: dataToken.access_token,
            conectado_en: new Date().toISOString(),
        });

        // Best-effort: si falla, la conexión igual quedó hecha (el webhook se
        // puede registrar después) — no se rompe el redirect de éxito.
        await registrarWebhooksPedidos(storeId, dataToken.access_token);

        return redirigir('conectado');
    } catch (err) {
        console.error('Error en tiendanube-oauth-callback:', err);
        return redirigir('error');
    }
});
