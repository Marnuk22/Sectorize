// tests/helpers.ts
//
// Utilidades compartidas por los tests: doubles del repositorio y del
// cliente HTTP de Open Food Facts.

import { vi, type MockInstance } from 'vitest';
import { EstadoProducto, type DatosConfirmacionProducto, type DatosProductoIncompleto, type Product } from '../src/models/Product.js';
import { ProductRepositoryMem } from '../src/repositories/ProductRepositoryMem.js';

export interface RepositorioEspia {
    repo: ProductRepositoryMem;
    buscarPorCodigo: MockInstance<(barcode: string) => Promise<Product | null>>;
    crearIncompleto: MockInstance<(datos: DatosProductoIncompleto) => Promise<Product>>;
    confirmar: MockInstance<(datos: DatosConfirmacionProducto) => Promise<Product>>;
    listarPorEstado: MockInstance<(status: EstadoProducto) => Promise<Product[]>>;
}

/** Repositorio en memoria con spies para poder verificar las llamadas. */
export const crearRepositorioEspia = (): RepositorioEspia => {
    const repo = new ProductRepositoryMem();
    return {
        repo,
        buscarPorCodigo: vi.spyOn(repo, 'buscarPorCodigo'),
        crearIncompleto: vi.spyOn(repo, 'crearIncompleto'),
        confirmar: vi.spyOn(repo, 'confirmar'),
        listarPorEstado: vi.spyOn(repo, 'listarPorEstado'),
    };
};

/** Producto de ejemplo (ya activo). */
export const productoActivo = (over: Partial<Product> = {}): Product => ({
    id: '11111111-1111-1111-1111-111111111111',
    barcode: '7791234567890',
    name: 'Coca-Cola 500ml',
    brand: 'Coca-Cola',
    category: 'Bebidas',
    price: 2500,
    stock: 24,
    imageUrl: null,
    status: EstadoProducto.ACTIVE,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
});

/** Respuesta cruda de OFF (formato de la API v2). */
export const respuestaOFF = (producto: Record<string, unknown> | null, status = 1) => ({
    status,
    status_verbose: status === 1 ? 'product found' : 'product not found',
    code: '7791234567890',
    product: producto ?? undefined,
});

/** Crea un `fetch` falso que devuelve la respuesta cruda de OFF. */
export const fetchMockOK = (cuerpo: unknown, status = 200) =>
    vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => cuerpo,
    })) as unknown as typeof fetch;

/** Crea un `fetch` falso que siempre falla (error de red). */
export const fetchMockErrorRed = (mensaje = 'getaddrinfo ENOTFOUND world.openfoodfacts.org') =>
    vi.fn(async () => {
        throw new Error(mensaje);
    }) as unknown as typeof fetch;

/**
 * Crea un `fetch` falso que nunca responde: sirve para probar el timeout
 * real del servicio (el AbortController aborta la promesa).
 */
export const fetchMockColgado = () =>
    vi.fn((_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
            });
        })) as unknown as typeof fetch;
