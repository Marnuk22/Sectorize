// src/services/OpenFoodFactsService.ts

import type { ProductoOFF, SugerenciaOFF } from '../models/OpenFoodFacts.js';

/** Error tipado de la consulta a OFF: permite distinguir timeout de red. */
export class OpenFoodFactsError extends Error {
    readonly code: 'TIMEOUT' | 'NETWORK' | 'HTTP' | 'FORMATO';

    constructor(code: OpenFoodFactsError['code'], mensaje: string) {
        super(mensaje);
        this.name = 'OpenFoodFactsError';
        this.code = code;
    }
}

export interface OpenFoodFactsOptions {
    baseUrl?: string;
    timeoutMs?: number;
    userAgent?: string;
    /** Inyectable para testear sin tocar la red. */
    fetchImpl?: typeof fetch;
}

const USUARIO_AGENTE_POR_DEFECTO =
    'Vallis/0.1 (https://vallis.com.ar; contacto@vallis.com.ar)';

/**
 * Cliente de Open Food Facts.
 *
 * - Timeout corto (3000ms por defecto): OFF es lento a veces y el escaner
 *   no puede quedar colgado esperando.
 * - User-Agent descriptivo: OFF pide identificar al cliente y bloquea
 *   (HTTP 403) a los que no lo mandan.
 */
export class OpenFoodFactsService {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;
    private readonly userAgent: string;
    private readonly fetchImpl: typeof fetch;

    constructor(options: OpenFoodFactsOptions = {}) {
        this.baseUrl = (options.baseUrl ?? 'https://world.openfoodfacts.org').replace(/\/+$/, '');
        this.timeoutMs = options.timeoutMs ?? 3000;
        this.userAgent = options.userAgent ?? USUARIO_AGENTE_POR_DEFECTO;
        this.fetchImpl = options.fetchImpl ?? fetch;
    }

    /**
     * Busca un producto por codigo de barras.
     * Devuelve `null` cuando OFF responde que no lo tiene.
     * Lanza `OpenFoodFactsError` si hay timeout, error de red o respuesta
     * invalida — el ProductService trata esos casos como "no encontrado".
     */
    async buscarPorCodigo(barcode: string): Promise<ProductoOFF | null> {
        const url = `${this.baseUrl}/api/v2/product/${encodeURIComponent(barcode)}.json`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const respuesta = await this.fetchImpl(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'User-Agent': this.userAgent,
                },
                signal: controller.signal,
            });

            if (respuesta.status === 404) return null;

            if (!respuesta.ok) {
                throw new OpenFoodFactsError(
                    'HTTP',
                    `Open Food Facts respondio ${respuesta.status}`,
                );
            }

            let cuerpo: unknown;
            try {
                cuerpo = await respuesta.json();
            } catch {
                throw new OpenFoodFactsError('FORMATO', 'La respuesta de OFF no es JSON valido');
            }

            return mapearRespuesta(cuerpo, barcode);
        } catch (err) {
            if (err instanceof OpenFoodFactsError) throw err;
            if (err instanceof Error && err.name === 'AbortError') {
                throw new OpenFoodFactsError(
                    'TIMEOUT',
                    `OFF no respondio en ${this.timeoutMs}ms`,
                );
            }
            throw new OpenFoodFactsError(
                'NETWORK',
                err instanceof Error ? err.message : 'Error de red consultando OFF',
            );
        } finally {
            clearTimeout(timer);
        }
    }

    /** Busca y devuelve la sugerencia lista para mostrar en el frontend. */
    async obtenerSugerencia(barcode: string): Promise<SugerenciaOFF | null> {
        const producto = await this.buscarPorCodigo(barcode);
        if (!producto) return null;
        return {
            barcode: producto.code,
            nombre: producto.name ?? `Producto no identificado (${barcode})`,
            marca: producto.brand,
            categoria: producto.category,
            imagenUrl: producto.imageUrl,
            cantidad: producto.quantity,
            nutriscore: producto.nutriscore,
            fuente: 'OFF',
        };
    }
}

/* ---------------------------------------------------------------------- */

/** Traduce la respuesta cruda de OFF al modelo del modulo. */
const mapearRespuesta = (cuerpo: unknown, barcode: string): ProductoOFF | null => {
    if (typeof cuerpo !== 'object' || cuerpo === null) return null;
    const raiz = cuerpo as { status?: number | string; product?: unknown };
    const producto = raiz.product as Record<string, unknown> | undefined | null;

    // OFF usa status: 0 para "no encontrado" y status: 1 con el producto.
    if (!producto || String(raiz.status ?? '') === '0') return null;

    const texto = (valor: unknown): string | null => {
        if (typeof valor !== 'string') return null;
        const limpio = valor.trim();
        return limpio.length > 0 ? limpio : null;
    };

    const nombre =
        texto(producto.product_name) ??
        texto(producto.product_name_es) ??
        texto(producto.generic_name) ??
        texto(producto.product_name_en);

    const marca = texto(producto.brands);

    const categoria =
        primeraCategoria(producto.categories) ??
        primeraCategoria(producto.categories_tags as unknown) ??
        texto(producto.category);

    const selectedImages = producto.selected_images as Record<string, unknown> | undefined;
    const frontImage = selectedImages?.front as Record<string, unknown> | undefined;

    const imagenUrl =
        texto(producto.image_front_url) ??
        texto(producto.image_url) ??
        texto(frontImage?.display) ??
        texto(frontImage?.img);

    const codigo = texto(producto.code) ?? barcode;

    return {
        code: codigo,
        name: nombre,
        brand: marca,
        category: categoria,
        imageUrl: imagenUrl,
        quantity: texto(producto.quantity),
        nutriscore: texto(producto.nutriscore_grade),
    };
};

/** OFF manda las categorias como "Bebidas,Bebidas carbonatadas,Agua". */
const primeraCategoria = (valor: unknown): string | null => {
    if (Array.isArray(valor)) {
        for (const item of valor) {
            if (typeof item === 'string' && item.trim()) return item.trim();
        }
        return null;
    }
    if (typeof valor !== 'string' || !valor.trim()) return null;
    const primera = valor.split(',')[0]?.trim();
    return primera ? primera : null;
};
