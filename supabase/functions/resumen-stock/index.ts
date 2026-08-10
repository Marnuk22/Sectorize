// Resumen diario de stock bajo — envía un mail por cada local con productos por debajo del mínimo
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async () => {
    // Cliente con service_role: puede leer todos los locales (sin RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Traer productos con seguimiento que estén en o por debajo del mínimo
    // y que no hayan disparado ya la alerta inmediata (evita mandarla duplicada)
    const { data: productos, error } = await supabase
        .from('productos')
        .select('local_id, nombre, stock_actual, stock_minimo')
        .gt('stock_minimo', 0)
        .eq('activo', true)
        .eq('alerta_enviada', false);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const bajos = (productos ?? []).filter(p => p.stock_actual <= p.stock_minimo);

    if (bajos.length === 0) {
        return new Response(JSON.stringify({ mensaje: 'Sin productos bajos' }), { status: 200 });
    }

    // Agrupar por local
    const porLocal = new Map<string, typeof bajos>();
    for (const p of bajos) {
        if (!porLocal.has(p.local_id)) porLocal.set(p.local_id, []);
        porLocal.get(p.local_id)!.push(p);
    }

    let enviados = 0;

    for (const [localId, items] of porLocal) {
        // Buscar el mail del dueño (el primer perfil admin del local)
        const { data: perfiles } = await supabase
            .from('perfiles')
            .select('id')
            .eq('local_id', localId)
            .limit(1);

        if (!perfiles || perfiles.length === 0) continue;

        // El mail está en auth.users
        const { data: userData } = await supabase.auth.admin.getUserById(perfiles[0].id);
        const email = userData?.user?.email;
        if (!email) continue;

        const filas = items
            .map(p => `<li><strong>${p.nombre}</strong>: quedan ${p.stock_actual} (mínimo ${p.stock_minimo})</li>`)
            .join('');

        const html = `
            <h2>Productos por reponer</h2>
            <p>Estos productos están en su stock mínimo o por debajo:</p>
            <ul>${filas}</ul>
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
                subject: `Tenés ${items.length} producto${items.length === 1 ? '' : 's'} por reponer`,
                html,
            }),
        });

        if (res.ok) enviados++;
    }

    return new Response(JSON.stringify({ enviados }), { status: 200 });
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/resumen-stock' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/
