// Alerta inmediata: un producto cruzó su stock mínimo
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTERNAL_FUNCTION_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET')!;

Deno.serve(async (req) => {
    // Esta función solo la debe llamar el trigger de la base (trigger_avisar_stock_bajo),
    // nunca un cliente externo: usa el service role y no valida quién la llama más allá
    // de este secreto compartido.
    if (req.headers.get('x-vallis-secret') !== INTERNAL_FUNCTION_SECRET) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { producto_id } = await req.json();
    if (!producto_id) {
        return new Response(JSON.stringify({ error: 'Falta producto_id' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Traer el producto que cruzó
    const { data: prod, error } = await supabase
        .from('productos')
        .select('local_id, nombre, stock_actual, stock_minimo')
        .eq('id', producto_id)
        .single();

    if (error || !prod) {
        return new Response(JSON.stringify({ error: 'Producto no encontrado' }), { status: 404 });
    }

    // El trigger solo llama acá cuando el cruce ya ocurrió, pero se revalida
    // acá también por las dudas (defensa en profundidad).
    if (prod.stock_minimo <= 0 || prod.stock_actual > prod.stock_minimo) {
        return new Response(JSON.stringify({ error: 'El producto no está en stock bajo' }), { status: 200 });
    }

    // Buscar el mail del dueño
    const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id')
        .eq('local_id', prod.local_id)
        .limit(1);

    if (!perfiles || perfiles.length === 0) {
        return new Response(JSON.stringify({ error: 'Sin perfil' }), { status: 200 });
    }

    const { data: userData } = await supabase.auth.admin.getUserById(perfiles[0].id);
    const email = userData?.user?.email;
    if (!email) {
        return new Response(JSON.stringify({ error: 'Sin email' }), { status: 200 });
    }

    const html = `
        <h2>Stock bajo</h2>
        <p><strong>${prod.nombre}</strong> llegó a su stock mínimo.</p>
        <p>Quedan <strong>${prod.stock_actual}</strong> (mínimo: ${prod.stock_minimo}).</p>
        <p style="color:#888;font-size:13px;">Enviado por Vallis</p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Vallis <avisos@vallis.com.ar>',
            to: email,
            subject: `${prod.nombre} está por agotarse`,
            html,
        }),
    });

    return new Response(JSON.stringify({ enviado: res.ok }), { status: 200 });
});