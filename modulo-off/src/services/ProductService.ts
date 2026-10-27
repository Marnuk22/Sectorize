// src/services/ProductService.ts

import { AppError } from '../errors.js';
import type { SugerenciaOFF } from '../models/OpenFoodFacts.js';
import { EstadoProducto, nombreGenerico, type DatosConfirmacionProducto, type Product } from '../models/Product.js';
import type { ProductRepository } from '../repositories/ProductRepository.js';
import { OpenFoodFactsError, OpenFoodFactsService } from './OpenFoodFactsService.js';

/** Que tiene que hacer el frontend segun el resultado del escaneo. */
export type AccionEscaneo =
    /** El producto estaba en la BD local y esta activo: se puede vender. */
    | 'FOUND_ACTIVE'
    /** Salio de OFF: hay que pedirle el precio al usuario antes de confirmarlo. */
    | 'PROMPT_PRICE_OFF'
    /** No se conoce el producto: hay que completar los datos a mano. */
    | 'PROMPT_INCOMPLETE';

/** De donde salio la informacion del producto. */
export type OrigenEscaneo = 'LOCAL' | 'OFF' | 'NONE';

export interface ResultadoEscaneo {
    action: AccionEscaneo;
    source: OrigenEscaneo;
    product: Product | null;
    suggestion: SugerenciaOFF | null;
    mensaje: string;
}

const CODIGO_VALIDO = /^[A-Za-z0-9][A-Za-z0-9-]{3,19}$/;

/**
 * Logica del escaneo de codigos de barras:
 *
 *  1. Busca el codigo en la BD local. Si esta ACTIVE, lo devuelve tal cual.
 *  2. Si no esta (o esta INCOMPLETE), consulta Open Food Facts:
 *     - si OFF lo tiene, devuelve la sugerencia de datos y la accion
 *       PROMPT_PRICE_OFF (el frontend pide el precio y confirma);
 *     - si OFF tampoco lo tiene, crea el registro local INCOMPLETE con un
 *       nombre generico y devuelve PROMPT_INCOMPLETE.
 *
 * Un fallo de red/timeout contra OFF se trata como "OFF no lo tiene": el
 * escaneo nunca debe cortar la operacion del local.
 */
export class ProductService {
    constructor(
        private readonly repositorio: ProductRepository,
        private readonly off: OpenFoodFactsService,
    ) {}

    async processBarcodeScan(barcode: string): Promise<ResultadoEscaneo> {
        const codigo = this.normalizarCodigo(barcode);

        const local = await this.repositorio.buscarPorCodigo(codigo);

        if (local && local.status === EstadoProducto.ACTIVE) {
            return {
                action: 'FOUND_ACTIVE',
                source: 'LOCAL',
                product: local,
                suggestion: null,
                mensaje: 'Producto encontrado en el catalogo local.',
            };
        }

        // OFF: si falla por red o timeout, se sigue como "no encontrado".
        let sugerencia: SugerenciaOFF | null = null;
        let avisoOFF: string | null = null;
        try {
            sugerencia = await this.off.obtenerSugerencia(codigo);
        } catch (err) {
            if (err instanceof OpenFoodFactsError) {
                avisoOFF = `Open Food Facts no respondio (${err.code}); se trata como producto desconocido.`;
                console.warn(`[OFF] ${codigo}: ${err.message}`);
            } else {
                throw err;
            }
        }

        if (sugerencia) {
            return {
                action: 'PROMPT_PRICE_OFF',
                source: 'OFF',
                // Si ya habia un INCOMPLETE local, se devuelve para que la
                // confirmacion promueva ese registro y no duplique.
                product: local,
                suggestion: sugerencia,
                mensaje: 'Producto encontrado en Open Food Facts. Ingresa el precio para confirmarlo.',
            };
        }

        // Ni local ni OFF: se crea (o se reutiliza) el registro INCOMPLETE.
        const producto = local ?? (await this.repositorio.crearIncompleto({
            barcode: codigo,
            name: nombreGenerico(codigo),
        }));

        return {
            action: 'PROMPT_INCOMPLETE',
            source: 'NONE',
            product: producto,
            suggestion: null,
            mensaje: avisoOFF ?? 'Producto desconocido. Completá los datos para activarlo.',
        };
    }

    /**
     * Confirma un producto (de OFF o de un INCOMPLETE local): le asigna
     * precio y stock y lo pasa a ACTIVE.
     */
    async confirmOFFProduct(datos: DatosConfirmacionProducto): Promise<Product> {
        const codigo = this.normalizarCodigo(datos.barcode);

        const precio = Number(datos.price);
        if (!Number.isFinite(precio) || precio < 0) {
            throw new AppError('PRECIO_INVALIDO', 'El precio debe ser un numero mayor o igual a 0.');
        }

        const stock = datos.stock === undefined ? undefined : Number(datos.stock);
        if (stock !== undefined && (!Number.isFinite(stock) || stock < 0)) {
            throw new AppError('STOCK_INVALIDO', 'El stock debe ser un numero mayor o igual a 0.');
        }

        const nombre = datos.name?.trim();
        if (datos.name !== undefined && !nombre) {
            throw new AppError('NOMBRE_INVALIDO', 'El nombre no puede estar vacio.');
        }

        return this.repositorio.confirmar({
            barcode: codigo,
            ...(datos.productId ? { productId: datos.productId } : {}),
            ...(nombre ? { name: nombre } : {}),
            ...(datos.brand !== undefined ? { brand: datos.brand } : {}),
            ...(datos.category !== undefined ? { category: datos.category } : {}),
            ...(datos.imageUrl !== undefined ? { imageUrl: datos.imageUrl } : {}),
            price: precio,
            ...(stock !== undefined ? { stock } : {}),
        });
    }

    /** Lista los productos incompletos (los que faltan por completar). */
    async listarIncompletos(): Promise<Product[]> {
        return this.repositorio.listarPorEstado(EstadoProducto.INCOMPLETE);
    }

    private normalizarCodigo(barcode: string): string {
        const codigo = (barcode ?? '').trim().toUpperCase();
        if (!CODIGO_VALIDO.test(codigo)) {
            throw new AppError(
                'CODIGO_INVALIDO',
                'El codigo de barras debe tener entre 4 y 20 caracteres alfanumericos.',
            );
        }
        return codigo;
    }
}
