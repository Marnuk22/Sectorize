// src/db/migrar.ts
//
// Aplica los .sql de ./sql en orden. Pensado para la BD local del modulo
// (no toca ningun entorno de produccion).
//
//   pnpm migrate

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarConfig } from '../config.js';
import { crearPool } from './pool.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const carpetaSql = join(aqui, '..', '..', 'sql');

export const aplicarMigraciones = async (): Promise<void> => {
    const config = cargarConfig();
    if (!config.databaseUrl) {
        throw new Error('Falta DATABASE_URL: no se puede migrar la base de datos.');
    }

    const pool = crearPool(config.databaseUrl);
    try {
        const archivos = (await readdir(carpetaSql))
            .filter(n => n.endsWith('.sql'))
            .sort();

        for (const archivo of archivos) {
            const sql = await readFile(join(carpetaSql, archivo), 'utf8');
            await pool.query(sql);
            console.log(`[migracion] aplicado ${archivo}`);
        }
    } finally {
        await pool.end();
    }
};

// Si se ejecuta directo (`pnpm migrate`), aplica y sale.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    aplicarMigraciones()
        .then(() => console.log('Migraciones aplicadas.'))
        .catch(err => {
            console.error('Error aplicando migraciones:', err.message);
            process.exit(1);
        });
}
