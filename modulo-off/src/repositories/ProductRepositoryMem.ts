// src/repositories/ProductRepositoryMem.ts

import { randomUUID } from 'node:crypto';
import type { ProductRepository } from './ProductRepository.js';
import { EstadoProducto, nombreGenerico, type DatosConfirmacionProducto, type DatosProductoIncompleto, type Product } from '../models/Product.js';

/**
 * Implementacion en memoria del repositorio. Sirve para dos cosas:
 *  - los tests (hermeticos, sin necesidad de una BD levantada);
 *  - arrancar el modulo en local sin Postgres (`pnpm start` sin DATABASE_URL).
 *
 * NO es persistente: al reiniciar el proceso se pierde todo. Para el
 * prototipo alcanza; para el modulo real, usar `ProductRepositoryPg`.
 */
export class ProductRepositoryMem implements ProductRepository {
    private readonly productos = new Map<string, Product>();

    async buscarPorCodigo(barcode: string): Promise<Product | null> {
        return this.productos.get(barcode) ?? null;
    }

    async crearIncompleto(datos: DatosProductoIncompleto): Promise<Product> {
        const ahora = new Date().toISOString();
        const producto: Product = {
            id: randomUUID(),
            barcode: datos.barcode,
            name: datos.name || nombreGenerico(datos.barcode),
            brand: null,
            category: null,
            price: null,
            stock: 0,
            imageUrl: null,
            status: EstadoProducto.INCOMPLETE,
            createdAt: ahora,
            updatedAt: ahora,
        };
        this.productos.set(producto.barcode, producto);
        return producto;
    }

    async confirmar(datos: DatosConfirmacionProducto): Promise<Product> {
        const ahora = new Date().toISOString();
        const existente = this.productos.get(datos.barcode);
        const producto: Product = {
            id: existente?.id ?? randomUUID(),
            barcode: datos.barcode,
            name: datos.name?.trim() || existente?.name || nombreGenerico(datos.barcode),
            brand: datos.brand !== undefined ? datos.brand : existente?.brand ?? null,
            category: datos.category !== undefined ? datos.category : existente?.category ?? null,
            price: datos.price,
            stock: datos.stock ?? existente?.stock ?? 0,
            imageUrl: datos.imageUrl !== undefined ? datos.imageUrl : existente?.imageUrl ?? null,
            status: EstadoProducto.ACTIVE,
            createdAt: existente?.createdAt ?? ahora,
            updatedAt: ahora,
        };
        this.productos.set(producto.barcode, producto);
        return producto;
    }

    async listarPorEstado(status: EstadoProducto): Promise<Product[]> {
        return [...this.productos.values()].filter(p => p.status === status);
    }
}
