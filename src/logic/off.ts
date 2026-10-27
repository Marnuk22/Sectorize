// src/logic/off.ts
//
// Cliente del modulo de Open Food Facts (backend local en modulo-off/).
//
// El modulo resuelve el codigo de barras (contra su BD local y contra OFF) y
// devuelve una sugerencia + la accion a tomar. El alta real del producto en el
// catalogo la hace la UI con MenuContext.agregarProducto (Supabase): este
// cliente solo lee, nunca escribe en `productos`.

/** Base del API local. Se puede cambiar con VITE_OFF_API_URL. */
export const API_OFF_BASE = import.meta.env.VITE_OFF_API_URL ?? 'http://localhost:4000';

/** Estados de un producto en el modulo OFF. */
export type EstadoProductoOFF = 'ACTIVE' | 'INCOMPLETE';

/** Accion que hay que hacer segun el resultado del escaneo. */
export type AccionEscaneo = 'FOUND_ACTIVE' | 'PROMPT_PRICE_OFF' | 'PROMPT_INCOMPLETE';

export interface ProductoOFF {
    id: string;
    barcode: string;
    name: string;
    brand: string | null;
    category: string | null;
    price: number | null;
    stock: number;
    imageUrl: string | null;
    status: EstadoProductoOFF;
    createdAt: string;
    updatedAt: string;
}

export interface SugerenciaOFF {
    barcode: string;
    nombre: string;
    marca: string | null;
    categoria: string | null;
    imagenUrl: string | null;
    cantidad: string | null;
    nutriscore: string | null;
    fuente: 'OFF';
}

export interface ResultadoEscaneo {
    action: AccionEscaneo;
    source: 'LOCAL' | 'OFF' | 'NONE';
    product: ProductoOFF | null;
    suggestion: SugerenciaOFF | null;
    mensaje: string;
}

export interface DatosConfirmacionOFF {
    barcode: string;
    productId?: string;
    name?: string;
    brand?: string | null;
    category?: string | null;
    imageUrl?: string | null;
    price: number;
    stock?: number;
}

/** Error con el mensaje que devuelve el backend. */
export class ErrorOFF extends Error {
    readonly codigo: string;

    constructor(codigo: string, mensaje: string) {
        super(mensaje);
        this.name = 'ErrorOFF';
        this.codigo = codigo;
    }
}

const pedir = async <T>(ruta: string, opciones?: RequestInit): Promise<T> => {
    let respuesta: Response;
    try {
        respuesta = await fetch(`${API_OFF_BASE}${ruta}`, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones,
        });
    } catch {
        throw new ErrorOFF(
            'API_INACCESIBLE',
            `No se pudo contactar al modulo OFF (${API_OFF_BASE}). ¿Está corriendo?`,
        );
    }

    let cuerpo: unknown = null;
    try {
        cuerpo = await respuesta.json();
    } catch {
        cuerpo = null;
    }

    if (!respuesta.ok) {
        const datos = cuerpo as { error?: string; mensaje?: string } | null;
        throw new ErrorOFF(
            datos?.error ?? 'ERROR_API',
            datos?.mensaje ?? `La API fallo con status ${respuesta.status}`,
        );
    }

    return cuerpo as T;
};

/** Escanea un codigo de barras: busca local, en OFF, o crea el INCOMPLETE. */
export const escanearCodigoBarras = (barcode: string): Promise<ResultadoEscaneo> =>
    pedir<ResultadoEscaneo>(`/api/products/scan/${encodeURIComponent(barcode.trim())}`);

/**
 * Heuristica para decidir si lo tipeado en un buscador "parece" un codigo de
 * barras de OFF (EAN/UPC: solo digitos, 4 a 20). Sirve para no disparar una
 * consulta a Open Food Facts con cualquier texto.
 */
export const pareceCodigoBarras = (valor: string): boolean =>
    /^\d{4,20}$/.test(valor.trim());

/** Confirma un producto (de OFF o INCOMPLETE) con precio y stock. */
export const confirmarProductoOFF = (datos: DatosConfirmacionOFF): Promise<{ product: ProductoOFF }> =>
    pedir<{ product: ProductoOFF }>('/api/products/confirm-off', {
        method: 'POST',
        body: JSON.stringify(datos),
    });

/** Lista los productos que quedaron incompletos. */
export const listarIncompletosOFF = (): Promise<{ productos: ProductoOFF[] }> =>
    pedir<{ productos: ProductoOFF[] }>('/api/products/incomplete');
