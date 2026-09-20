// Webhook de Tiendanube: order/created descuenta stock en Vallis y
// order/cancelled lo repone. El payload solo trae store_id/event/id, así que
// se pide el detalle del pedido a la API. Toda la lógica de stock + la
// idempotencia viven en la RPC procesar_pedido_tiendanube (atómica).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TIENDANUBE_CLIENT_SECRET = Deno.env.get('TIENDANUBE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const USER_AGENT = 'Vallis ERP (soporte@vallis.com.ar)';
const EVENTOS = ['order/created', 'order/cancelled'];

const bytesAHex = (bytes: Uint8Array) =>
    Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

const bytesABase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

// La doc de Tiendanube no aclara si el header viene en hex o base64 (su
// ejemplo en PHP usa hash_hmac, que da hex) — se acepta cualquiera de los
// dos, ambos derivados del HMAC real, así que no debilita la verificación.
const compararSeguro = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
};

const firmaValida = async (cuerpo: string, header: string | null) => {
    if (!header) return false;
    const clave = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(TIENDANUBE_CLIENT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo)));
    return compararSeguro(bytesAHex(firma), header.trim().toLowerCase())
        || compararSeguro(bytesABase64(firma), header.trim());
};

Deno.serve(async (req) => {
    try {
        const cuerpo = await req.text();

        if (!(await firmaValida(cuerpo, req.headers.get('x-linkedstore-hmac-sha256')))) {
            return new Response('Firma inválida', { status: 401 });
        }

        const { store_id, event, id } = JSON.parse(cuerpo);
        if (!EVENTOS.includes(event) || !store_id || !id) return new Response('ok', { status: 200 });

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: negocio } = await supabase
            .from('negocios')
            .select('id')
            .eq('tiendanube_store_id', String(store_id))
            .maybeSingle();
        // Tienda que no está conectada a ningún negocio de Vallis: nada que hacer.
        if (!negocio) return new Response('ok', { status: 200 });

        const { data: conexion } = await supabase
            .from('negocio_tiendanube')
            .select('access_token')
            .eq('negocio_id', negocio.id)
            .maybeSingle();
        if (!conexion?.access_token) return new Response('ok', { status: 200 });

        const resPedido = await fetch(`https://api.tiendanube.com/v1/${store_id}/orders/${id}`, {
            headers: {
                'Authorization': `Bearer ${conexion.access_token}`,
                'User-Agent': USER_AGENT,
            },
        });
        if (resPedido.status === 404) return new Response('ok', { status: 200 });
        if (!resPedido.ok) {
            console.error('Error pidiendo pedido a Tiendanube:', resPedido.status, await resPedido.text());
            // 500 a propósito: Tiendanube reintenta, y este error suele ser transitorio.
            return new Response('error', { status: 500 });
        }
        const pedido = await resPedido.json();

        // La misma variante puede venir en varias líneas, y quantity/ids
        // llegan a veces como string y a veces como número: se suma por
        // variante y se normaliza todo a texto/número.
        const porVariante = new Map<string, { product_id: string; variant_id: string; cantidad: number }>();
        for (const linea of pedido.products ?? []) {
            const clave = `${linea.product_id}:${linea.variant_id}`;
            const previo = porVariante.get(clave);
            const cantidad = Number(linea.quantity) || 0;
            if (previo) previo.cantidad += cantidad;
            else porVariante.set(clave, { product_id: String(linea.product_id), variant_id: String(linea.variant_id), cantidad });
        }

        const { data, error } = await supabase.rpc('procesar_pedido_tiendanube', {
            p_negocio_id: negocio.id,
            p_order_id: String(id),
            p_evento: event,
            p_items: [...porVariante.values()],
        });
        if (error) {
            console.error('Error procesando pedido:', error);
            return new Response('error', { status: 500 });
        }

        console.log(`Pedido ${id} (${event}):`, JSON.stringify(data));
        return new Response('ok', { status: 200 });

    } catch (err) {
        console.error('Error webhook Tiendanube:', err);
        return new Response('error', { status: 500 });
    }
});
