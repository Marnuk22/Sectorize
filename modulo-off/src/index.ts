// src/index.ts
//
// Arranque del modulo OFF en local.
//
//   pnpm dev            (con tsx watch)
//   pnpm start
//
// Si no hay DATABASE_URL, arranca con el repositorio en memoria (para
// probar rapido). Con DATABASE_URL, usa Postgres (recordá correr
// `pnpm migrate` antes).

import { crearApp } from './app.js';
import { cargarConfig } from './config.js';
import { aplicarMigraciones } from './db/migrar.js';
import { crearPool } from './db/pool.js';
import { ProductRepositoryMem } from './repositories/ProductRepositoryMem.js';
import { ProductRepositoryPg } from './repositories/ProductRepositoryPg.js';
import type { ProductRepository } from './repositories/ProductRepository.js';
import { OpenFoodFactsService } from './services/OpenFoodFactsService.js';
import { ProductService } from './services/ProductService.js';

const main = async () => {
    const config = cargarConfig();

    if (config.migrateOnStart && config.databaseUrl) {
        await aplicarMigraciones();
    }

    let repositorio: ProductRepository;
    let pool = null;

    if (config.databaseUrl) {
        pool = crearPool(config.databaseUrl);
        repositorio = new ProductRepositoryPg(pool);
        console.log('[db] usando Postgres');
    } else {
        repositorio = new ProductRepositoryMem();
        console.log('[db] sin DATABASE_URL: usando repositorio en memoria (no persiste)');
    }

    const off = new OpenFoodFactsService({
        baseUrl: config.offBaseUrl,
        timeoutMs: config.offTimeoutMs,
        userAgent: config.offUserAgent,
    });

    const productoService = new ProductService(repositorio, off);
    const app = crearApp({ productoService, allowOrigin: config.allowOrigin });

    const server = app.listen(config.port, () => {
        console.log(`[off] modulo escuchando en http://localhost:${config.port}`);
        console.log('[off] endpoints: GET /api/products/scan/:barcode | POST /api/products/confirm-off');
    });

    const cerrar = async () => {
        server.close();
        if (pool) await pool.end();
        process.exit(0);
    };

    process.on('SIGINT', cerrar);
    process.on('SIGTERM', cerrar);
};

main().catch(err => {
    console.error('No se pudo arrancar el modulo OFF:', err);
    process.exit(1);
});
