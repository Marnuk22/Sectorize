// tests/productRepository.pg.test.ts
//
// Integracion contra Postgres (la BD local del modulo).
// Solo corre si hay DATABASE_URL definida:
//
//   docker compose up -d
//   $env:DATABASE_URL='postgres://off:off@localhost:5433/vallis_off'
//   pnpm test
//
// (el resto de la suite no necesita BD: usa el repositorio en memoria)

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EstadoProducto } from '../src/models/Product.js';
import { ProductRepositoryPg } from '../src/repositories/ProductRepositoryPg.js';

const databaseUrl = process.env.DATABASE_URL?.trim();
const aqui = dirname(fileURLToPath(import.meta.url));
const archivoSql = join(aqui, '..', 'sql', '001_productos.sql');

describe.skipIf(!databaseUrl)('ProductRepositoryPg (Postgres)', () => {
    let pool: Pool;
    let repo: ProductRepositoryPg;

    beforeAll(async () => {
        pool = new Pool({ connectionString: databaseUrl });
        const sql = await readFile(archivoSql, 'utf8');
        await pool.query(sql);
        repo = new ProductRepositoryPg(pool);
        await pool.query('DELETE FROM productos');
    });

    afterAll(async () => {
        if (pool) {
            await pool.query('DELETE FROM productos');
            await pool.end();
        }
    });

    it('crea un INCOMPLETE y lo encuentra por codigo de barras', async () => {
        const creado = await repo.crearIncompleto({
            barcode: '7791234567890',
            name: 'Producto no identificado (7791234567890)',
        });

        expect(creado.status).toBe(EstadoProducto.INCOMPLETE);
        expect(creado.price).toBeNull();

        const encontrado = await repo.buscarPorCodigo('7791234567890');
        expect(encontrado?.id).toBe(creado.id);
        expect(encontrado?.name).toBe('Producto no identificado (7791234567890)');
    });

    it('confirmar promueve el INCOMPLETE a ACTIVE sin duplicar la fila', async () => {
        const creado = await repo.crearIncompleto({
            barcode: '7791234567891',
            name: 'Producto no identificado (7791234567891)',
        });

        const confirmado = await repo.confirmar({
            barcode: '7791234567891',
            name: 'Coca-Cola Original 500ml',
            brand: 'Coca-Cola',
            category: 'Bebidas',
            price: 2500,
            stock: 12,
        });

        expect(confirmado.id).toBe(creado.id);
        expect(confirmado.status).toBe(EstadoProducto.ACTIVE);
        expect(confirmado.price).toBe(2500);
        expect(confirmado.stock).toBe(12);

        const filas = await pool.query('SELECT * FROM productos WHERE barcode = $1', ['7791234567891']);
        expect(filas.rowCount).toBe(1);
    });

    it('confirmar un codigo que no existia crea el producto', async () => {
        const producto = await repo.confirmar({
            barcode: '7791234567892',
            name: 'Agua Mineral 500ml',
            price: 1500,
        });

        expect(producto.status).toBe(EstadoProducto.ACTIVE);
        expect(producto.stock).toBe(0);

        const encontrados = await repo.listarPorEstado(EstadoProducto.ACTIVE);
        expect(encontrados.some(p => p.barcode === '7791234567892')).toBe(true);
    });

    it('listarPorEstado devuelve solo los INCOMPLETE', async () => {
        await repo.crearIncompleto({ barcode: '7791234567893', name: 'Incompleto' });

        const incompletos = await repo.listarPorEstado(EstadoProducto.INCOMPLETE);
        expect(incompletos.length).toBeGreaterThan(0);
        expect(incompletos.every(p => p.status === EstadoProducto.INCOMPLETE)).toBe(true);
    });
});
