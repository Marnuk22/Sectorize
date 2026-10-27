// src/repositories/ProductRepositoryPg.ts

import { Pool, type PoolClient } from 'pg';
import type { ProductRepository } from './ProductRepository.js';
import { EstadoProducto, nombreGenerico, type DatosConfirmacionProducto, type DatosProductoIncompleto, type Product } from '../models/Product.js';

/** Fila cruda de la tabla `productos` (Postgres). */
interface FilaProducto {
    id: string;
    barcode: string;
    name: string;
    brand: string | null;
    category: string | null;
    price: string | null;
    stock: string;
    image_url: string | null;
    status: EstadoProducto;
    created_at: Date;
    updated_at: Date;
}

const aNumero = (valor: string | null): number | null => {
    if (valor === null || valor === undefined) return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
};

const mapearFila = (fila: FilaProducto): Product => ({
    id: fila.id,
    barcode: fila.barcode,
    name: fila.name,
    brand: fila.brand,
    category: fila.category,
    price: aNumero(fila.price),
    stock: aNumero(fila.stock) ?? 0,
    imageUrl: fila.image_url,
    status: fila.status,
    createdAt: fila.created_at.toISOString(),
    updatedAt: fila.updated_at.toISOString(),
});

/**
 * Repositorio sobre Postgres (la BD local del modulo).
 *
 * Tabla: `productos` — ver ./sql/001_productos.sql
 */
export class ProductRepositoryPg implements ProductRepository {
    constructor(private readonly pool: Pool) {}

    async buscarPorCodigo(barcode: string): Promise<Product | null> {
        const { rows } = await this.pool.query<FilaProducto>(
            'SELECT * FROM productos WHERE barcode = $1 LIMIT 1',
            [barcode],
        );
        return rows[0] ? mapearFila(rows[0]) : null;
    }

    async crearIncompleto(datos: DatosProductoIncompleto): Promise<Product> {
        const { rows } = await this.pool.query<FilaProducto>(
            `INSERT INTO productos (barcode, name, status)
             VALUES ($1, $2, 'INCOMPLETE')
             ON CONFLICT (barcode) DO UPDATE SET updated_at = now()
             RETURNING *`,
            [datos.barcode, datos.name || nombreGenerico(datos.barcode)],
        );
        return mapearFila(rows[0]);
    }

    async confirmar(datos: DatosConfirmacionProducto): Promise<Product> {
        const client: PoolClient = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const { rows: existentes } = await client.query<{ id: string }>(
                'SELECT id FROM productos WHERE barcode = $1 FOR UPDATE',
                [datos.barcode],
            );

            const nombre = datos.name?.trim() || null;
            const stock = datos.stock ?? 0;

            let fila: FilaProducto;
            if (existentes.length > 0) {
                // Actualiza el registro existente (tipicamente un INCOMPLETE
                // que se promueve a ACTIVE) y conserva los datos que el
                // caller no manda.
                const { rows } = await client.query<FilaProducto>(
                    `UPDATE productos SET
                        name       = COALESCE($2, name),
                        brand      = COALESCE($3, brand),
                        category   = COALESCE($4, category),
                        image_url  = COALESCE($5, image_url),
                        price      = $6,
                        stock      = $7,
                        status     = 'ACTIVE',
                        updated_at = now()
                     WHERE barcode = $1
                     RETURNING *`,
                    [
                        datos.barcode,
                        nombre,
                        datos.brand ?? null,
                        datos.category ?? null,
                        datos.imageUrl ?? null,
                        datos.price,
                        stock,
                    ],
                );
                fila = rows[0];
            } else {
                const { rows } = await client.query<FilaProducto>(
                    `INSERT INTO productos (barcode, name, brand, category, image_url, price, stock, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
                     RETURNING *`,
                    [
                        datos.barcode,
                        nombre || nombreGenerico(datos.barcode),
                        datos.brand ?? null,
                        datos.category ?? null,
                        datos.imageUrl ?? null,
                        datos.price,
                        stock,
                    ],
                );
                fila = rows[0];
            }

            await client.query('COMMIT');
            return mapearFila(fila);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async listarPorEstado(status: EstadoProducto): Promise<Product[]> {
        const { rows } = await this.pool.query<FilaProducto>(
            'SELECT * FROM productos WHERE status = $1 ORDER BY created_at DESC',
            [status],
        );
        return rows.map(mapearFila);
    }
}
