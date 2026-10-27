// Edge Function: modulo-off-productToDB
//
// Endpoint unico expuesto: GET /api/products/scan/:barcode
//
// Resuelve un codigo de barras contra Open Food Facts y devuelve la accion
// que el frontend debe tomar (misma forma que el modulo Node legado):
//
//   FOUND_ACTIVE  -> ya estaba en catalogo local (no aplica aca, queda para futura)
//   PROMPT_PRICE_OFF -> OFF lo tiene: frontend pide precio y stock
//   PROMPT_INCOMPLETE -> OFF no lo tiene: frontend crea a mano
//
// Flag `eoff` (existe en Open Food Facts) lo resuelve el frontend segun `source`.
//
// Variables de entorno requeridas:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (solo para futura persistencia; hoy se deja lista)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type AccionEscaneo = 'FOUND_ACTIVE' | 'PROMPT_PRICE_OFF' | 'PROMPT_INCOMPLETE';

type ProductoOFF = {
    id: string;
    barcode: string;
    name: string;
    brand: string | null;
    category: string | null;
    price: number | null;
    stock: number;
    imageUrl: string | null;
    status: 'ACTIVE' | 'INCOMPLETE';
    createdAt: string;
    updatedAt: string;
};

type SugerenciaOFF = {
    barcode: string;
    nombre: string;
    marca: string | null;
    categoria: string | null;
    imagenUrl: string | null;
    cantidad: string | null;
    nutriscore: string | null;
    fuente: 'OFF';
};

type ResultadoEscaneo = {
    action: AccionEscaneo;
    source: 'LOCAL' | 'OFF' | 'NONE';
    product: ProductoOFF | null;
    suggestion: SugerenciaOFF | null;
    mensaje: string;
};

const ahoraISO = () => new Date().toISOString();

const productoGenerico = (barcode: string): ProductoOFF => ({
    id: crypto.randomUUID(),
    barcode,
    name: `Producto no identificado (${barcode})`,
    brand: null,
    category: null,
    price: null,
    stock: 0,
    imageUrl: null,
    status: 'INCOMPLETE',
    createdAt: ahoraISO(),
    updatedAt: ahoraISO(),
});

/**
 * Consulta Open Food Facts. Devuelve la sugerencia si lo encuentra, o null.
 */
const obtenerSugerenciaOFF = async (barcode: string): Promise<SugerenciaOFF | null> => {
    try {
        const res = await fetch(`${OFF_API_BASE}/${barcode}.json`, {
            headers: { 'User-Agent': 'Vallis / modulo-off-productToDB (contacto@vallis.com.ar)' },
        });

        if (!res.ok) return null;

        const data = await res.json().catch(() => null);
        if (!data || data.status !== 1) return null;

        const producto = data.product ?? {};
        const imagenUrl =
            producto.image_front_url ??
            producto.image_url ??
            (producto.image_small_url ?? null);

        return {
            barcode,
            nombre: producto.product_name ?? producto.generic_name ?? `Producto (${barcode})`,
            marca: producto.brands ?? null,
            categoria: producto.categories ?? null,
            imagenUrl,
            cantidad: producto.quantity ?? null,
            nutriscore: producto.nutriscore_grade ?? null,
            fuente: 'OFF',
        };
    } catch (err) {
        console.error('[OFF] error consultando OFF:', err);
        return null;
    }
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors });
    }

    try {
        const url = new URL(req.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);

        // Esperamos: /api/products/scan/:barcode
        const apiIndex = pathSegments.indexOf('api');
        if (apiIndex === -1 || pathSegments[apiIndex + 1] !== 'products' || pathSegments[apiIndex + 2] !== 'scan') {
            return json({ error: 'Ruta no encontrada. Uso: GET /api/products/scan/:barcode' }, 404);
        }

        const barcode = pathSegments[apiIndex + 3];
        if (!barcode) {
            return json({ error: 'Codigo de barras requerido' }, 400);
        }

        // Cliente Supabase (lista para futura persistencia; hoy no se usa en scan)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const sugerencia = await obtenerSugerenciaOFF(barcode);

        const resultado: ResultadoEscaneo = sugerencia
            ? {
                  action: 'PROMPT_PRICE_OFF',
                  source: 'OFF',
                  product: null,
                  suggestion: sugerencia,
                  mensaje: 'Producto encontrado en Open Food Facts. Ingresa el precio para confirmarlo.',
              }
            : {
                  action: 'PROMPT_INCOMPLETE',
                  source: 'NONE',
                  product: productoGenerico(barcode),
                  suggestion: null,
                  mensaje: 'Producto desconocido. Completá los datos para activarlo.',
              };

        return json(resultado);
    } catch (err) {
        console.error('Error interno:', err);
        return json({ error: 'Error interno del servidor' }, 500);
    }
});
