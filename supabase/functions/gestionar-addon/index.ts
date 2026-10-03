// Activa o desactiva un add-on pago del negocio (hoy solo 'facturacion'),
// dueño-only. El add-on se cobra dentro de la MISMA suscripción de
// MercadoPago: se le cambia el monto con PUT /preapproval/{id} (sin
// re-autorización, verificado en sandbox). Orden: primero MercadoPago, y solo
// si sale bien se toca la base, para que nunca queden desincronizados.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Separados por coma. A quién avisar para que invite al cliente en Factumono.
const AVISO_ADDON_EMAILS = (Deno.env.get('AVISO_ADDON_EMAILS') ?? '').split(',').map(e => e.trim()).filter(Boolean);

const URL_CONFIRMAR_INVITACION = 'https://vallis.com.ar/invitacion/';
const ADDONS_VALIDOS = ['facturacion'];
// Versión del texto de consentimiento que muestra PanelMiPlan. Si cambia el
// texto, cambiar las dos (acá y CONSENTIMIENTO_FACTURACION_VERSION en el panel).
const CONSENTIMIENTO_VERSION = 'facturacion-v1-2026-09-30';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Evita inyectar HTML con el nombre del negocio en el mail.
const escapar = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const cambiarMontoMP = async (suscripcionId: string, monto: number) => {
    const res = await fetch(`https://api.mercadopago.com/preapproval/${suscripcionId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_recurring: { transaction_amount: monto, currency_id: 'ARS' } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) console.error('Error MP cambiando monto:', data);
    return res.ok;
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return json({ error: 'No autorizado' }, 401);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!user) return json({ error: 'No autorizado' }, 401);

        const { data: perfil } = await supabase
            .from('perfiles')
            .select('negocio_id, rol')
            .eq('id', user.id)
            .single();
        if (!perfil?.negocio_id || perfil.rol !== 'dueño') {
            return json({ error: 'Solo el dueño puede gestionar los add-ons' }, 403);
        }
        const negocioId = perfil.negocio_id;

        const { addon, activar, consentimiento } = await req.json().catch(() => ({}));
        if (!ADDONS_VALIDOS.includes(addon) || typeof activar !== 'boolean') {
            return json({ error: 'Pedido inválido' }, 400);
        }
        // Sin consentimiento de la versión vigente no se activa (se valida acá,
        // no solo con la casilla del frontend).
        if (activar && consentimiento !== CONSENTIMIENTO_VERSION) {
            return json({ error: 'Tenés que aceptar las condiciones del servicio de facturación.' }, 400);
        }

        const { data: negocio } = await supabase
            .from('negocios')
            .select('nombre, suscripcion_id, suscripcion_estado')
            .eq('id', negocioId)
            .single();
        if (!negocio) return json({ error: 'Negocio no encontrado' }, 404);

        if (activar && (negocio.suscripcion_estado === 'vencida' || negocio.suscripcion_estado === 'cancelada')) {
            return json({ error: 'Reactivá tu suscripción antes de sumar un add-on.' }, 400);
        }

        const { data: actuales } = await supabase
            .from('negocio_addons')
            .select('addon')
            .eq('negocio_id', negocioId);
        const activos = new Set((actuales ?? []).map(a => a.addon));

        // Idempotente: pedir lo que ya está no toca nada.
        if (activar === activos.has(addon)) return json({ ok: true });

        if (activar) activos.add(addon); else activos.delete(addon);

        const { data: precios } = await supabase.from('precios').select('clave, monto');
        const precio = (clave: string) => Number(precios?.find(p => p.clave === clave)?.monto ?? NaN);
        const montoNuevo = precio('base') + [...activos].reduce((acc, a) => acc + precio(`addon_${a}`), 0);
        if (!Number.isFinite(montoNuevo)) {
            console.error('Faltan precios en la tabla precios');
            return json({ error: 'Error interno' }, 500);
        }

        // Si hay una suscripción viva (pendiente, autorizada o pausada) se le
        // cambia el monto. Se mira el estado real en MP y no suscripcion_estado:
        // entre la autorización y el primer cobro el negocio sigue en 'prueba'
        // pero la suscripción ya existe. Sin suscripción viva no hay nada que
        // cambiar: `suscribir` suma los add-ons al crearla.
        let montoAnterior: number | null = null;
        if (negocio.suscripcion_id) {
            const resGet = await fetch(`https://api.mercadopago.com/preapproval/${negocio.suscripcion_id}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
            });
            const pre = await resGet.json().catch(() => ({}));
            if (!resGet.ok) {
                console.error('Error MP leyendo suscripción:', pre);
                return json({ error: 'No se pudo consultar tu suscripción en MercadoPago. Probá de nuevo.' }, 502);
            }
            if (pre.status !== 'cancelled') {
                montoAnterior = pre.auto_recurring?.transaction_amount ?? null;
                const ok = await cambiarMontoMP(negocio.suscripcion_id, montoNuevo);
                if (!ok) return json({ error: 'MercadoPago no aceptó el cambio de monto. Probá de nuevo.' }, 502);
            }
        }

        // Si la base falla después de cambiar MP, se vuelve MP atrás.
        const revertirMP = async () => {
            if (negocio.suscripcion_id && montoAnterior !== null) await cambiarMontoMP(negocio.suscripcion_id, montoAnterior);
        };

        if (activar) {
            const { error: errAlta } = await supabase
                .from('negocio_addons')
                .insert({
                    negocio_id: negocioId,
                    addon,
                    estado: 'pendiente_invitacion',
                    consentimiento_en: new Date().toISOString(),
                    consentimiento_version: CONSENTIMIENTO_VERSION,
                    consentimiento_por: user.id,
                });
            if (errAlta) {
                console.error('Error guardando add-on:', errAlta);
                await revertirMP();
                return json({ error: 'No se pudo activar. Probá de nuevo.' }, 500);
            }

            const token = crypto.randomUUID();
            await supabase.from('addon_invitaciones_pendientes').insert({ token, negocio_id: negocioId, addon });

            // Best-effort: si el mail falla el add-on igual queda activo; el
            // pendiente se ve con el SQL del ROADMAP.
            if (AVISO_ADDON_EMAILS.length > 0) {
                const nombre = escapar(negocio.nombre ?? 'Sin nombre');
                const mailCliente = escapar(user.email ?? '(sin mail)');
                const link = `${URL_CONFIRMAR_INVITACION}?token=${token}`;
                const html = `
                    <h2>Nuevo cliente de Facturación</h2>
                    <p><strong>${nombre}</strong> activó el add-on de facturación electrónica.</p>
                    <p>Invitalo a Factumono con este mail: <strong>${mailCliente}</strong><br>
                    (app.factumono.com.ar/users → "Invitar a un usuario")</p>
                    <p>Cuando lo hayas invitado, confirmalo acá para habilitarle el botón de facturar:</p>
                    <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold;">Ya lo invité</a></p>
                    <p style="color:#888;font-size:13px;">Enviado por Vallis</p>
                `;
                const resMail = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: 'Vallis <avisos@vallis.com.ar>',
                        to: AVISO_ADDON_EMAILS,
                        subject: `Invitar a Factumono: ${negocio.nombre ?? 'nuevo cliente'}`,
                        html,
                    }),
                }).catch(err => { console.error('Error mandando mail de aviso:', err); return null; });
                if (resMail && !resMail.ok) console.error('Resend rechazó el aviso:', resMail.status, await resMail.text());
            } else {
                console.error('AVISO_ADDON_EMAILS vacío: nadie se entera del alta');
            }

            return json({ ok: true, estado: 'pendiente_invitacion' });
        }

        // Desactivar: se pierde al instante (decidido), sin esperar al próximo cobro.
        const { error: errBaja } = await supabase
            .from('negocio_addons')
            .delete()
            .eq('negocio_id', negocioId)
            .eq('addon', addon);
        if (errBaja) {
            console.error('Error dando de baja add-on:', errBaja);
            await revertirMP();
            return json({ error: 'No se pudo desactivar. Probá de nuevo.' }, 500);
        }
        await supabase.from('addon_invitaciones_pendientes').delete().eq('negocio_id', negocioId).eq('addon', addon);

        const { error: errModulo } = await supabase.rpc('set_modulo_negocio', {
            p_negocio_id: negocioId,
            p_modulo: addon,
            p_activo: false,
        });
        // Ya no se cobra y el add-on ya no figura: si falla sacar el módulo,
        // se loguea para arreglarlo a mano (el cliente no queda cobrado de más).
        if (errModulo) console.error('Error apagando el módulo:', errModulo);

        return json({ ok: true, estado: null });
    } catch (err) {
        console.error(err);
        return json({ error: 'Error interno' }, 500);
    }
});
