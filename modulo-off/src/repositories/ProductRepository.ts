// src/repositories/ProductRepository.ts

import type { DatosConfirmacionProducto, DatosProductoIncompleto, Product } from '../models/Product.js';
import type { EstadoProducto } from '../models/Product.js';

/**
 * Contrato de persistencia de productos. Hay dos implementaciones:
 *  - `ProductRepositoryPg`  → Postgres (la real, en local).
 *  - `ProductRepositoryMem` → en memoria, para tests y para probar el
 *    modulo sin levantar la BD.
 */
export interface ProductRepository {
    /** Busca un producto por codigo de barras (cualquier estado). */
    buscarPorCodigo(barcode: string): Promise<Product | null>;

    /** Crea un producto en estado INCOMPLETE. */
    crearIncompleto(datos: DatosProductoIncompleto): Promise<Product>;

    /**
     * Confirma un producto: lo pasa a ACTIVE con precio y stock.
     * Si ya existe un producto con ese codigo de barras lo actualiza
     * (promoviendo el INCOMPLETE a ACTIVE); si no, lo crea.
     */
    confirmar(datos: DatosConfirmacionProducto): Promise<Product>;

    /** Lista los productos de un estado (util para revisar los INCOMPLETE). */
    listarPorEstado(status: EstadoProducto): Promise<Product[]>;
}
