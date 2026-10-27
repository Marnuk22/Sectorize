import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        // La suite es rapida y no toca la red: el fetch de OFF siempre va
        // mockeado. Los tests de Postgres solo corren si hay DATABASE_URL.
        testTimeout: 10_000,
        hookTimeout: 20_000,
    },
});
