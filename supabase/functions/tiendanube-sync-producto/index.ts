// Sincroniza un producto de Vallis con Tiendanube: crea o actualiza
// nombre/precio/stock/visibilidad. Disparado a mano por el dueño/encargado
// (botón "Sincronizar con Tiendanube" en Inventario) — el push automático
// de SOLO stock ante ventas/ingresos vive en la DB (empujar_stock_tiendanube),
// no acá.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const USER_AGENT = 'Vallis ERP (soporte@vallis.com.ar)';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
};

const jsonRes = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return jsonRes({ error: 'No autorizado' }, 401);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!user) return jsonRes({ error: 'No autorizado' }, 401);

        const { data: perfil } = await supabase
            .from('perfiles')
            .select('negocio_id, rol')
            .eq('id', user.id)
            .single();

        if (!perfil?.negocio_id || (perfil.rol !== 'dueño' && perfil.rol !== 'encargado')) {
            return jsonRes({ error: 'No tenés permiso para sincronizar productos' }, 403);
        }

        const { producto_id } = await req.json();
        if (!producto_id) return jsonRes({ error: 'Falta producto_id' }, 400);

        const { data: producto } = await supabase
            .from('productos')
            .select('id, nombre, precio_venta, stock_actual, tipo_venta, tiendanube_producto_id, tiendanube_variant_id, local_id, negocio_id')
            .eq('id', producto_id)
            .maybeSingle();

        if (!producto) return jsonRes({ error: 'Producto no encontrado' }, 404);

        // Resolver a qué negocio pertenece (directo, o vía la sucursal si es
        // catálogo no compartido) y confirmar que es el mismo del usuario.
        let negocioIdProducto = producto.negocio_id as string | null;
        if (!negocioIdProducto && producto.local_id) {
            const { data: local } = await supabase.from('locales').select('negocio_id').eq('id', producto.local_id).maybeSingle();
            negocioIdProducto = local?.negocio_id ?? null;
        }
        if (negocioIdProducto !== perfil.negocio_id) {
            return jsonRes({ error: 'Ese producto no pertenece a tu negocio' }, 403);
        }

        if (producto.tipo_venta !== 'unidad') {
            return jsonRes({ error: 'Los productos a granel no se pueden sincronizar con Tiendanube' }, 400);
        }

        const { data: negocio } = await supabase
            .from('negocios')
            .select('tiendanube_store_id')
            .eq('id', perfil.negocio_id)
            .single();

        if (!negocio?.tiendanube_store_id) {
            return jsonRes({ error: 'Este negocio todavía no está conectado con Tiendanube' }, 400);
        }

        const { data: conexion } = await supabase
            .from('negocio_tiendanube')
            .select('access_token')
            .eq('negocio_id', perfil.negocio_id)
            .maybeSingle();

        if (!conexion?.access_token) {
            return jsonRes({ error: 'No se encontró la conexión con Tiendanube. Reconectá desde Mi plan.' }, 400);
        }

        const storeId = negocio.tiendanube_store_id;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${conexion.access_token}`,
            'User-Agent': USER_AGENT,
        };
        const precio = producto.precio_venta.toFixed(2);
        const stock = Math.round(producto.stock_actual);
        const visibility = stock > 0 ? 'visible' : 'hidden';

        if (!producto.tiendanube_producto_id || !producto.tiendanube_variant_id) {
            // Producto nuevo en Tiendanube.
            const resCrear = await fetch(`https://api.tiendanube.com/v1/${storeId}/products`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: { es: producto.nombre },
                    variants: [{ price: precio, stock, stock_management: true }],
                    visibility,
                }),
            });
            const dataCrear = await resCrear.json();
            if (!resCrear.ok) {
                console.error('Error creando producto en Tiendanube:', dataCrear);
                return jsonRes({ error: 'No se pudo crear el producto en Tiendanube' }, 502);
            }

            const tnProductoId = String(dataCrear.id);
            const tnVariantId = String(dataCrear.variants?.[0]?.id);

            await supabase
                .from('productos')
                .update({ tiendanube_producto_id: tnProductoId, tiendanube_variant_id: tnVariantId })
                .eq('id', producto.id);

            return jsonRes({ ok: true, creado: true });
        }

        // Producto ya vinculado: actualizar precio+stock de la variante, y
        // visibilidad del producto (dos llamadas, la API no las combina).
        const resVariante = await fetch(
            `https://api.tiendanube.com/v1/${storeId}/products/${producto.tiendanube_producto_id}/variants/${producto.tiendanube_variant_id}`,
            { method: 'PUT', headers, body: JSON.stringify({ price: precio, stock }) }
        );
        if (!resVariante.ok) {
            const dataVariante = await resVariante.json();
            console.error('Error actualizando variante en Tiendanube:', dataVariante);
            return jsonRes({ error: 'No se pudo actualizar precio/stock en Tiendanube' }, 502);
        }

        const resVisibilidad = await fetch(`https://api.tiendanube.com/v1/${storeId}/products/${producto.tiendanube_producto_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ visibility }),
        });
        if (!resVisibilidad.ok) {
            const dataVisibilidad = await resVisibilidad.json();
            console.error('Error actualizando visibilidad en Tiendanube:', dataVisibilidad);
            // El precio/stock ya se actualizó bien — avisamos parcial en vez de error total.
            return jsonRes({ ok: true, aviso: 'Precio y stock actualizados, pero no se pudo actualizar la visibilidad' });
        }

        return jsonRes({ ok: true, creado: false });

    } catch (err) {
        console.error(err);
        return jsonRes({ error: 'Error interno' }, 500);
    }
});
