// src/models/OpenFoodFacts.ts
//
// Tipos de la respuesta de Open Food Facts y la "sugerencia" que el modulo
// devuelve al frontend cuando el producto no esta en la BD local.

/** Subconjunto de los campos de OFF que nos interesan. */
export interface ProductoOFF {
    code: string;
    name: string | null;
    brand: string | null;
    category: string | null;
    imageUrl: string | null;
    quantity: string | null;
    nutriscore: string | null;
}

/**
 * Sugerencia de datos para un producto encontrado en OFF. El frontend la
 * muestra al usuario y le pide el precio (y el stock) antes de confirmar.
 */
export interface SugerenciaOFF {
    barcode: string;
    nombre: string;
    marca: string | null;
    categoria: string | null;
    imagenUrl: string | null;
    cantidad: string | null;
    nutriscore: string | null;
    fuente: 'OFF';
}
