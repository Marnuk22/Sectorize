// src/controllers/productosController.ts

import type { Request, Response } from 'express';
import type { ProductService } from '../services/ProductService.js';

/**
 * Controllers REST del modulo de productos.
 *
 *  GET  /api/products/scan/:barcode  → { action, source, product, suggestion, mensaje }
 *  POST /api/products/confirm-off    → { product }
 *  GET  /api/products/incomplete     → { productos }
 */
export const productosController = (servicio: ProductService) => ({
    escanear: async (req: Request, res: Response): Promise<void> => {
        const resultado = await servicio.processBarcodeScan(String(req.params.barcode));
        res.json(resultado);
    },

    confirmar: async (req: Request, res: Response): Promise<void> => {
        const cuerpo = (req.body ?? {}) as Record<string, unknown>;

        const producto = await servicio.confirmOFFProduct({
            barcode: String(cuerpo.barcode ?? ''),
            price: Number(cuerpo.price),
            ...(cuerpo.productId !== undefined ? { productId: String(cuerpo.productId) } : {}),
            ...(cuerpo.name !== undefined ? { name: String(cuerpo.name) } : {}),
            ...(cuerpo.brand !== undefined ? { brand: cuerpo.brand === null ? null : String(cuerpo.brand) } : {}),
            ...(cuerpo.category !== undefined ? { category: cuerpo.category === null ? null : String(cuerpo.category) } : {}),
            ...(cuerpo.imageUrl !== undefined ? { imageUrl: cuerpo.imageUrl === null ? null : String(cuerpo.imageUrl) } : {}),
            ...(cuerpo.stock !== undefined ? { stock: Number(cuerpo.stock) } : {}),
        });

        res.json({ product: producto });
    },

    listarIncompletos: async (_req: Request, res: Response): Promise<void> => {
        res.json({ productos: await servicio.listarIncompletos() });
    },
});
