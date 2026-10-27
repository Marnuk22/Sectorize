// src/app.ts

import express, { type Express } from 'express';
import { AppError } from './errors.js';
import { productosRoutes } from './routes/productosRoutes.js';
import type { ProductService } from './services/ProductService.js';

export interface AppOptions {
    productoService: ProductService;
    allowOrigin?: string;
}

/**
 * Arma la app Express con CORS manual (mismo criterio que las Edge Functions
 * de Supabase del proyecto: headers a mano, sin dependencias extra).
 */
export const crearApp = ({ productoService, allowOrigin = '*' }: AppOptions): Express => {
    const app = express();

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', allowOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.sendStatus(204);
            return;
        }
        next();
    });

    app.use(express.json({ limit: '1mb' }));

    app.use('/api/products', productosRoutes(productoService));

    app.use((_req, res) => {
        res.status(404).json({ error: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta no existe.' });
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (err instanceof AppError) {
            res.status(err.status).json({ error: err.code, mensaje: err.message });
            return;
        }
        console.error('Error no controlado en el modulo OFF:', err);
        res.status(500).json({
            error: 'ERROR_INTERNO',
            mensaje: 'Error interno del servidor.',
        });
    });

    return app;
};
