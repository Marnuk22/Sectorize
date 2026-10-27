// tests/openFoodFacts.service.test.ts
//
// Cliente de Open Food Facts: mapeo de la respuesta, timeout y User-Agent.

import { describe, expect, it } from 'vitest';
import { OpenFoodFactsError, OpenFoodFactsService } from '../src/services/OpenFoodFactsService.js';
import { fetchMockColgado, fetchMockErrorRed, fetchMockOK, respuestaOFF } from './helpers.js';

const PRODUCTO_OFF = {
    code: '7791234567890',
    product_name: 'Coca-Cola Original 500ml',
    brands: 'Coca-Cola',
    categories: 'Bebidas,Bebidas carbonatadas,Agua',
    image_front_url: 'https://images.openfoodfacts.org/front.jpg',
    quantity: '500 ml',
    nutriscore_grade: 'e',
};

describe('OpenFoodFactsService.buscarPorCodigo', () => {
    it('arma la URL de la API v2 y manda el User-Agent', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(PRODUCTO_OFF));
        const servicio = new OpenFoodFactsService({ fetchImpl });

        await servicio.buscarPorCodigo('7791234567890');

        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, opciones] = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [
            string,
            { headers: Record<string, string> },
        ];
        expect(url).toBe('https://world.openfoodfacts.org/api/v2/product/7791234567890.json');
        expect(opciones.headers['User-Agent']).toContain('Vallis');
        expect(opciones.headers.Accept).toBe('application/json');
    });

    it('mapea los campos que nos interesan', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(PRODUCTO_OFF));
        const servicio = new OpenFoodFactsService({ fetchImpl });

        const producto = await servicio.buscarPorCodigo('7791234567890');

        expect(producto).not.toBeNull();
        expect(producto?.name).toBe('Coca-Cola Original 500ml');
        expect(producto?.brand).toBe('Coca-Cola');
        expect(producto?.category).toBe('Bebidas');
        expect(producto?.imageUrl).toBe('https://images.openfoodfacts.org/front.jpg');
        expect(producto?.quantity).toBe('500 ml');
        expect(producto?.nutriscore).toBe('e');
    });

    it('devuelve null cuando OFF responde status 0 (no encontrado)', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(null, 0));
        const servicio = new OpenFoodFactsService({ fetchImpl });

        expect(await servicio.buscarPorCodigo('7791234567890')).toBeNull();
    });

    it('devuelve null cuando OFF responde 404', async () => {
        const fetchImpl = fetchMockOK({ status: 0 }, 404);
        const servicio = new OpenFoodFactsService({ fetchImpl });

        expect(await servicio.buscarPorCodigo('7791234567890')).toBeNull();
    });

    it('lanza TIMEOUT si OFF no responde dentro del timeout', async () => {
        const servicio = new OpenFoodFactsService({ fetchImpl: fetchMockColgado(), timeoutMs: 50 });

        await expect(servicio.buscarPorCodigo('7791234567890')).rejects.toMatchObject({
            name: 'OpenFoodFactsError',
            code: 'TIMEOUT',
        });
    });

    it('lanza NETWORK si la peticion falla', async () => {
        const servicio = new OpenFoodFactsService({ fetchImpl: fetchMockErrorRed() });

        const error = await servicio.buscarPorCodigo('7791234567890').catch(e => e);
        expect(error).toBeInstanceOf(OpenFoodFactsError);
        expect(error.code).toBe('NETWORK');
    });

    it('lanza HTTP si OFF responde con error de servidor', async () => {
        const fetchImpl = fetchMockOK({}, 503);
        const servicio = new OpenFoodFactsService({ fetchImpl });

        await expect(servicio.buscarPorCodigo('7791234567890')).rejects.toMatchObject({
            code: 'HTTP',
        });
    });
});

describe('OpenFoodFactsService.obtenerSugerencia', () => {
    it('devuelve la sugerencia con los datos de OFF', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(PRODUCTO_OFF));
        const servicio = new OpenFoodFactsService({ fetchImpl });

        const sugerencia = await servicio.obtenerSugerencia('7791234567890');

        expect(sugerencia).toEqual({
            barcode: '7791234567890',
            nombre: 'Coca-Cola Original 500ml',
            marca: 'Coca-Cola',
            categoria: 'Bebidas',
            imagenUrl: 'https://images.openfoodfacts.org/front.jpg',
            cantidad: '500 ml',
            nutriscore: 'e',
            fuente: 'OFF',
        });
    });

    it('usa el nombre generico si OFF no trae nombre', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF({ code: '7791234567890', brands: 'Marca X' }));
        const servicio = new OpenFoodFactsService({ fetchImpl });

        const sugerencia = await servicio.obtenerSugerencia('7791234567890');

        expect(sugerencia?.nombre).toBe('Producto no identificado (7791234567890)');
        expect(sugerencia?.marca).toBe('Marca X');
    });

    it('devuelve null si OFF no tiene el producto', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(null, 0));
        const servicio = new OpenFoodFactsService({ fetchImpl });

        expect(await servicio.obtenerSugerencia('7791234567890')).toBeNull();
    });
});
