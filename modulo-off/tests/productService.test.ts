// tests/productService.test.ts
//
// Logica central del modulo: escaneo de codigos de barras.
//   a) producto existente en la BD local
//   b) ausente localmente pero existente en OFF
//   c) inexistente en ambas bases
//   d) fallo de red/timeout contra OFF

import { describe, expect, it } from 'vitest';
import { EstadoProducto } from '../src/models/Product.js';
import { OpenFoodFactsService } from '../src/services/OpenFoodFactsService.js';
import { ProductService } from '../src/services/ProductService.js';
import { AppError } from '../src/errors.js';
import {
    crearRepositorioEspia,
    fetchMockColgado,
    fetchMockErrorRed,
    fetchMockOK,
    productoActivo,
    respuestaOFF,
} from './helpers.js';

const OFF_ENCONTRADO = {
    code: '7791234567890',
    product_name: 'Coca-Cola Original 500ml',
    brands: 'Coca-Cola',
    categories: 'Bebidas,Bebidas carbonatadas,Agua',
    image_front_url: 'https://images.openfoodfacts.org/front.jpg',
    quantity: '500 ml',
    nutriscore_grade: 'e',
};

const crearServicio = (fetchImpl: typeof fetch, timeoutMs = 3000) => {
    const espia = crearRepositorioEspia();
    const off = new OpenFoodFactsService({ fetchImpl, timeoutMs });
    const servicio = new ProductService(espia.repo, off);
    return { servicio, espia };
};

describe('ProductService.processBarcodeScan', () => {
    it('a) devuelve el producto local si esta ACTIVE y no consulta a OFF', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(OFF_ENCONTRADO));
        const { servicio, espia } = crearServicio(fetchImpl);

        const local = productoActivo();
        espia.buscarPorCodigo.mockResolvedValue(local);

        const resultado = await servicio.processBarcodeScan('7791234567890');

        expect(resultado.action).toBe('FOUND_ACTIVE');
        expect(resultado.source).toBe('LOCAL');
        expect(resultado.product?.id).toBe(local.id);
        expect(resultado.product?.status).toBe(EstadoProducto.ACTIVE);
        expect(resultado.suggestion).toBeNull();

        // No tiene sentido pegarle a OFF si ya lo tenemos en la BD.
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(espia.crearIncompleto).not.toHaveBeenCalled();
    });

    it('b) sugiere los datos de OFF cuando no esta en la BD local', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(OFF_ENCONTRADO));
        const { servicio, espia } = crearServicio(fetchImpl);

        espia.buscarPorCodigo.mockResolvedValue(null);

        const resultado = await servicio.processBarcodeScan('7791234567890');

        expect(resultado.action).toBe('PROMPT_PRICE_OFF');
        expect(resultado.source).toBe('OFF');
        expect(resultado.suggestion).not.toBeNull();
        expect(resultado.suggestion?.nombre).toBe('Coca-Cola Original 500ml');
        expect(resultado.suggestion?.marca).toBe('Coca-Cola');
        expect(resultado.suggestion?.categoria).toBe('Bebidas');
        expect(resultado.suggestion?.imagenUrl).toBe('https://images.openfoodfacts.org/front.jpg');
        expect(resultado.suggestion?.fuente).toBe('OFF');

        // Todavia no se crea nada en la BD: falta que el usuario confirme.
        expect(espia.crearIncompleto).not.toHaveBeenCalled();
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('b2) si ya hay un INCOMPLETE local, propone OFF sin duplicar el registro', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(OFF_ENCONTRADO));
        const { servicio, espia } = crearServicio(fetchImpl);

        const incompleto = productoActivo({
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Producto no identificado (7791234567890)',
            price: null,
            status: EstadoProducto.INCOMPLETE,
        });
        espia.buscarPorCodigo.mockResolvedValue(incompleto);

        const resultado = await servicio.processBarcodeScan('7791234567890');

        expect(resultado.action).toBe('PROMPT_PRICE_OFF');
        expect(resultado.product?.id).toBe(incompleto.id);
        expect(espia.crearIncompleto).not.toHaveBeenCalled();
    });

    it('c) crea un registro INCOMPLETE si no esta en la BD ni en OFF', async () => {
        // OFF responde status 0 = no encontrado
        const fetchImpl = fetchMockOK(respuestaOFF(null, 0));
        const { servicio, espia } = crearServicio(fetchImpl);

        espia.buscarPorCodigo.mockResolvedValue(null);

        const resultado = await servicio.processBarcodeScan('7791234567890');

        expect(resultado.action).toBe('PROMPT_INCOMPLETE');
        expect(resultado.source).toBe('NONE');
        expect(resultado.suggestion).toBeNull();

        expect(espia.crearIncompleto).toHaveBeenCalledTimes(1);
        expect(espia.crearIncompleto).toHaveBeenCalledWith({
            barcode: '7791234567890',
            name: 'Producto no identificado (7791234567890)',
        });

        expect(resultado.product?.status).toBe(EstadoProducto.INCOMPLETE);
        expect(resultado.product?.name).toBe('Producto no identificado (7791234567890)');
        expect(resultado.product?.price).toBeNull();
    });

    it('c2) si OFF responde 404, tambien se crea el INCOMPLETE', async () => {
        const fetchImpl = fetchMockOK({ status: 0 }, 404);
        const { servicio, espia } = crearServicio(fetchImpl);
        espia.buscarPorCodigo.mockResolvedValue(null);

        const resultado = await servicio.processBarcodeScan('7791234567890');

        expect(resultado.action).toBe('PROMPT_INCOMPLETE');
        expect(espia.crearIncompleto).toHaveBeenCalledTimes(1);
    });

    it('d) un error de red contra OFF se comporta como "no encontrado"', async () => {
        const fetchImpl = fetchMockErrorRed();
        const { servicio, espia } = crearServicio(fetchImpl);
        espia.buscarPorCodigo.mockResolvedValue(null);

        const resultado = await servicio.processBarcodeScan('7791234567890');

        expect(resultado.action).toBe('PROMPT_INCOMPLETE');
        expect(espia.crearIncompleto).toHaveBeenCalledTimes(1);
        expect(resultado.product?.status).toBe(EstadoProducto.INCOMPLETE);
        expect(resultado.mensaje).toContain('Open Food Facts no respondio');
    });

    it('d2) un timeout contra OFF tambien se comporta como "no encontrado"', async () => {
        // fetch que nunca responde: el timeout real (50ms) aborta la peticion
        const fetchImpl = fetchMockColgado();
        const { servicio, espia } = crearServicio(fetchImpl, 50);
        espia.buscarPorCodigo.mockResolvedValue(null);

        const resultado = await servicio.processBarcodeScan('7791234567890');

        expect(resultado.action).toBe('PROMPT_INCOMPLETE');
        expect(espia.crearIncompleto).toHaveBeenCalledTimes(1);
        expect(resultado.product?.status).toBe(EstadoProducto.INCOMPLETE);
        expect(resultado.mensaje).toContain('TIMEOUT');
    });

    it('rechaza codigos de barras invalidos', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(OFF_ENCONTRADO));
        const { servicio } = crearServicio(fetchImpl);

        await expect(servicio.processBarcodeScan('12')).rejects.toBeInstanceOf(AppError);
        await expect(servicio.processBarcodeScan('')).rejects.toMatchObject({ code: 'CODIGO_INVALIDO' });
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});

describe('ProductService.confirmOFFProduct', () => {
    it('promueve a ACTIVE el INCOMPLETE creado por un escaneo', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(null, 0));
        const { servicio, espia } = crearServicio(fetchImpl);
        espia.buscarPorCodigo.mockResolvedValue(null);

        const escaneo = await servicio.processBarcodeScan('7791234567890');
        const id = escaneo.product?.id as string;

        const producto = await servicio.confirmOFFProduct({
            barcode: '7791234567890',
            productId: id,
            name: 'Coca-Cola Original 500ml',
            brand: 'Coca-Cola',
            category: 'Bebidas',
            imageUrl: 'https://images.openfoodfacts.org/front.jpg',
            price: 2500,
            stock: 12,
        });

        expect(producto.status).toBe(EstadoProducto.ACTIVE);
        expect(producto.price).toBe(2500);
        expect(producto.stock).toBe(12);
        expect(producto.name).toBe('Coca-Cola Original 500ml');
        expect(producto.id).toBe(id);

        // A partir de ahora el repositorio responde de verdad (ya no mockeado)
        // y el siguiente escaneo tiene que pegarle a la BD local.
        espia.buscarPorCodigo.mockRestore();

        const segundo = await servicio.processBarcodeScan('7791234567890');
        expect(segundo.action).toBe('FOUND_ACTIVE');
        expect(segundo.product?.id).toBe(id);
        expect(fetchImpl).toHaveBeenCalledTimes(1); // no vuelve a pegarle a OFF
    });

    it('crea el producto si el codigo no existia todavia (confirmacion desde OFF)', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(OFF_ENCONTRADO));
        const { servicio } = crearServicio(fetchImpl);

        // El frontend manda los datos que propuso OFF, mas el precio.
        const producto = await servicio.confirmOFFProduct({
            barcode: '7791234567890',
            name: 'Coca-Cola Original 500ml',
            brand: 'Coca-Cola',
            category: 'Bebidas',
            imageUrl: 'https://images.openfoodfacts.org/front.jpg',
            price: 2500,
        });

        expect(producto.status).toBe(EstadoProducto.ACTIVE);
        expect(producto.stock).toBe(0);
        expect(producto.category).toBe('Bebidas');
        expect(producto.imageUrl).toBe('https://images.openfoodfacts.org/front.jpg');
    });

    it('valida el precio y el stock', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(OFF_ENCONTRADO));
        const { servicio } = crearServicio(fetchImpl);

        await expect(
            servicio.confirmOFFProduct({ barcode: '7791234567890', price: -1 }),
        ).rejects.toMatchObject({ code: 'PRECIO_INVALIDO' });

        await expect(
            servicio.confirmOFFProduct({ barcode: '7791234567890', price: 100, stock: -5 }),
        ).rejects.toMatchObject({ code: 'STOCK_INVALIDO' });
    });
});

describe('ProductService.listarIncompletos', () => {
    it('devuelve solo los productos incompletos', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(null, 0));
        const { servicio, espia } = crearServicio(fetchImpl);
        espia.buscarPorCodigo.mockResolvedValue(null);

        await servicio.processBarcodeScan('1111111111111');
        await servicio.processBarcodeScan('2222222222222');
        await servicio.confirmOFFProduct({ barcode: '2222222222222', price: 100 });

        const incompletos = await servicio.listarIncompletos();

        expect(incompletos).toHaveLength(1);
        expect(incompletos[0].barcode).toBe('1111111111111');
        expect(incompletos[0].status).toBe(EstadoProducto.INCOMPLETE);
    });
});
