// src/routes/productosRoutes.ts

import { Router } from 'express';
import { productosController } from '../controllers/productosController.js';
import type { ProductService } from '../services/ProductService.js';

export const productosRoutes = (servicio: ProductService): Router => {
    const router = Router();
    const controller = productosController(servicio);

    router.get('/health', (_req, res) => {
        res.json({ ok: true, modulo: 'open-food-facts' });
    });

    router.get('/scan/:barcode', controller.escanear);
    router.post('/confirm-off', controller.confirmar);
    router.get('/incomplete', controller.listarIncompletos);

    return router;
};
