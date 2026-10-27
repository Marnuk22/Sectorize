// src/db/pool.ts

import { Pool } from 'pg';

/** Crea el pool de conexiones a Postgres. */
export const crearPool = (databaseUrl: string): Pool =>
    new Pool({
        connectionString: databaseUrl,
        max: 10,
        idleTimeoutMillis: 30_000,
    });
