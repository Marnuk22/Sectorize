// src/config.ts

import 'dotenv/config';

const numero = (valor: string | undefined, porDefecto: number): number => {
    const n = Number(valor);
    return valor !== undefined && Number.isFinite(n) ? n : porDefecto;
};

export interface Config {
    port: number;
    databaseUrl: string | null;
    migrateOnStart: boolean;
    offBaseUrl: string;
    offTimeoutMs: number;
    offUserAgent: string;
    allowOrigin: string;
}

export const cargarConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
    port: numero(env.PORT, 4000),
    databaseUrl: env.DATABASE_URL?.trim() || null,
    migrateOnStart: String(env.MIGRATE_ON_START ?? 'false').toLowerCase() === 'true',
    offBaseUrl: env.OFF_BASE_URL?.trim() || 'https://world.openfoodfacts.org',
    offTimeoutMs: numero(env.OFF_TIMEOUT_MS, 3000),
    offUserAgent:
        env.OFF_USER_AGENT?.trim() ||
        'Vallis/0.1 (https://vallis.com.ar; contacto@vallis.com.ar)',
    allowOrigin: env.ALLOW_ORIGIN?.trim() || '*',
});
