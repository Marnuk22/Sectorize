// Botón "Ya lo invité" del mail al integrador (vía vallis.com.ar/invitacion/):
// marca el add-on como activo y prende el módulo en todas las sucursales del
// negocio. Sin login: la autorización es el token de un solo uso del mail.
// Es POST a propósito: los antivirus de correo abren los links (GET) para
// revisarlos, y eso no tiene que consumir el token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// localhost para probar la página de la landing en local. No abre nada: la
// autorización es el token, CORS no es la barrera acá.
const ORIGENES = ['https://vallis.com.ar', 'https://www.vallis.com.ar'];
const esLocal = (o: string) => /^http:\/\/localhost:\d+$/.test(o);

Deno.serve(async (req) => {
    const origen = req.headers.get('Origin') ?? '';
    const cors = {
        'Access-Control-Allow-Origin': ORIGENES.includes(origen) || esLocal(origen) ? origen : ORIGENES[0],
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin',
    };
    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

    try {
        const { token } = await req.json().catch(() => ({}));
        if (typeof token !== 'string' || !token) return json({ error: 'Link inválido' }, 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: pendiente } = await supabase
            .from('addon_invitaciones_pendientes')
            .select('negocio_id, addon')
            .eq('token', token)
            .maybeSingle();
        if (!pendiente) return json({ error: 'Este link ya se usó o el cliente desactivó el add-on.' }, 404);

        const { data: negocio } = await supabase
            .from('negocios')
            .select('nombre')
            .eq('id', pendiente.negocio_id)
            .single();

        const { data: fila, error: errUpd } = await supabase
            .from('negocio_addons')
            .update({ estado: 'activo', invitado_en: new Date().toISOString() })
            .eq('negocio_id', pendiente.negocio_id)
            .eq('addon', pendiente.addon)
            .select('addon')
            .maybeSingle();
        if (errUpd) {
            console.error('Error marcando invitado:', errUpd);
            return json({ error: 'No se pudo confirmar. Probá de nuevo.' }, 500);
        }
        if (!fila) {
            await supabase.from('addon_invitaciones_pendientes').delete().eq('token', token);
            return json({ error: 'El cliente desactivó el add-on antes de la confirmación.' }, 404);
        }

        const { error: errModulo } = await supabase.rpc('set_modulo_negocio', {
            p_negocio_id: pendiente.negocio_id,
            p_modulo: pendiente.addon,
            p_activo: true,
        });
        if (errModulo) {
            // El token no se borra: el mismo link sirve para reintentar.
            console.error('Error prendiendo el módulo:', errModulo);
            return json({ error: 'No se pudo habilitar el módulo. Probá de nuevo.' }, 500);
        }

        // Se borra recién al final: si algo falló antes, el link sigue sirviendo para reintentar.
        await supabase.from('addon_invitaciones_pendientes').delete().eq('token', token);

        return json({ ok: true, negocio: negocio?.nombre ?? null });
    } catch (err) {
        console.error(err);
        return json({ error: 'Error interno' }, 500);
    }
});
