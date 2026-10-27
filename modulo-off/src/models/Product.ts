// src/models/Product.ts
//
// Entidad `Product` del modulo OFF. Refleja la tabla `productos` de la BD
// local (Postgres) que crea ./sql/001_productos.sql.
//
// A diferencia del resto del proyecto (donde las entidades usan snake_case
// porque las consulta PostgREST tal cual), aca el modelo va en camelCase
// (`imageUrl`) porque el modulo es una API Node isolada y ese es el contrato
// publico de los endpoints. El mapeo a columnas lo hace el repositorio.

/** Estado de un producto en el catalogo local. */
export enum EstadoProducto {
    /** Producto completo: tiene precio y stock, se puede vender. */
    ACTIVE = 'ACTIVE',
    /** Producto incompleto: se creo al escanear un codigo sin datos. */
    INCOMPLETE = 'INCOMPLETE',
}

export interface Product {
    id: string;
    barcode: string;
    name: string;
    brand: string | null;
    category: string | null;
    price: number | null;
    stock: number;
    imageUrl: string | null;
    status: EstadoProducto;
    createdAt: string;
    updatedAt: string;
}

/** Datos minimos para dar de alta un producto incompleto. */
export interface DatosProductoIncompleto {
    barcode: string;
    name: string;
}

/**
 * Datos para promover un producto a ACTIVE (confirmar precio y stock).
 * `productId` es opcional: si viene, se actualiza ese registro local
 * (por ejemplo uno creado como INCOMPLETE); si no, se hace upsert por
 * codigo de barras.
 */
export interface DatosConfirmacionProducto {
    barcode: string;
    productId?: string;
    name?: string;
    brand?: string | null;
    category?: string | null;
    imageUrl?: string | null;
    price: number;
    stock?: number;
}

/** Nombre generico para un producto escaneado del que no se sabe nada. */
export const nombreGenerico = (barcode: string): string => `Producto no identificado (${barcode})`;
