// tests/productos.controller.test.ts
//
// Endpoints REST del modulo:
//   GET  /api/products/scan/:barcode
//   POST /api/products/confirm-off
//   GET  /api/products/incomplete

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { EstadoProducto } from '../src/models/Product.js';
import { OpenFoodFactsService } from '../src/services/OpenFoodFactsService.js';
import { ProductService } from '../src/services/ProductService.js';
import { ProductRepositoryMem } from '../src/repositories/ProductRepositoryMem.js';
import { fetchMockErrorRed, fetchMockOK, respuestaOFF } from './helpers.js';

const PRODUCTO_OFF = {
    code: '7791234567890',
    product_name: 'Coca-Cola Original 500ml',
    brands: 'Coca-Cola',
    categories: 'Bebidas',
    image_front_url: 'https://images.openfoodfacts.org/front.jpg',
};

const crearAppDePrueba = (fetchImpl: typeof fetch) => {
    const repo = new ProductRepositoryMem();
    const off = new OpenFoodFactsService({ fetchImpl });
    const servicio = new ProductService(repo, off);
    return { app: crearApp({ productoService: servicio }), repo };
};

describe('GET /api/products/scan/:barcode', () => {
    it('responde con la accion segun de donde sale el producto', async () => {
        const fetchImpl = fetchMockOK(respuestaOFF(PRODUCTO_OFF));
        const { app } = crearAppDePrueba(fetchImpl);

        const res = await request(app).get('/api/products/scan/7791234567890');

        expect(res.status).toBe(200);
        expect(res.body.action).toBe('PROMPT_PRICE_OFF');
        expect(res.body.source).toBe('OFF');
        expect(res.body.suggestion.nombre).toBe('Coca-Cola Original 500ml');
    });

    it('devuelve 400 con un codigo de barras invalido', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(PRODUCTO_OFF)));

        const res = await request(app).get('/api/products/scan/ab');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('CODIGO_INVALIDO');
    });

    it('crea el INCOMPLETE y lo informa cuando no se conoce el producto', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(null, 0)));

        const res = await request(app).get('/api/products/scan/7791234567890');

        expect(res.status).toBe(200);
        expect(res.body.action).toBe('PROMPT_INCOMPLETE');
        expect(res.body.product.status).toBe(EstadoProducto.INCOMPLETE);
        expect(res.body.product.name).toBe('Producto no identificado (7791234567890)');
    });

    it('trata un fallo de red de OFF como producto desconocido', async () => {
        const { app } = crearAppDePrueba(fetchMockErrorRed());

        const res = await request(app).get('/api/products/scan/7791234567890');

        expect(res.status).toBe(200);
        expect(res.body.action).toBe('PROMPT_INCOMPLETE');
    });
});

describe('POST /api/products/confirm-off', () => {
    it('confirma el producto con precio y stock y lo deja ACTIVE', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(PRODUCTO_OFF)));

        const res = await request(app)
            .post('/api/products/confirm-off')
            .send({
                barcode: '7791234567890',
                name: 'Coca-Cola Original 500ml',
                brand: 'Coca-Cola',
                category: 'Bebidas',
                imageUrl: 'https://images.openfoodfacts.org/front.jpg',
                price: 2500,
                stock: 12,
            });

        expect(res.status).toBe(200);
        expect(res.body.product.status).toBe(EstadoProducto.ACTIVE);
        expect(res.body.product.price).toBe(2500);
        expect(res.body.product.stock).toBe(12);
    });

    it('rechaza precios negativos', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(PRODUCTO_OFF)));

        const res = await request(app)
            .post('/api/products/confirm-off')
            .send({ barcode: '7791234567890', price: -10 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('PRECIO_INVALIDO');
    });

    it('rechaza un codigo de barras invalido', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(PRODUCTO_OFF)));

        const res = await request(app)
            .post('/api/products/confirm-off')
            .send({ barcode: '??', price: 100 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('CODIGO_INVALIDO');
    });
});

describe('GET /api/products/incomplete', () => {
    it('lista los productos que falta completar', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(null, 0)));

        await request(app).get('/api/products/scan/1111111111111');
        await request(app).get('/api/products/scan/2222222222222');

        const res = await request(app).get('/api/products/incomplete');

        expect(res.status).toBe(200);
        expect(res.body.productos).toHaveLength(2);
        expect(res.body.productos[0].status).toBe(EstadoProducto.INCOMPLETE);
    });
});

describe('otros endpoints', () => {
    it('health responde ok', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(null, 0)));

        const res = await request(app).get('/api/products/health');

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    it('una ruta desconocida devuelve 404 en JSON', async () => {
        const { app } = crearAppDePrueba(fetchMockOK(respuestaOFF(null, 0)));

        const res = await request(app).get('/api/no-existe');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('RUTA_NO_ENCONTRADA');
    });
});
