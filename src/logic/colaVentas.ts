// src/logic/colaVentas.ts
//
// Cola de ventas registradas offline — Etapa 3 del modo offline. A
// diferencia de catalogoLocal.ts (un espejo que se reemplaza entero en cada
// sync), esto es un log de solo AGREGAR: cada venta offline se suma a la
// cola, nunca se pisan entre sí. La reconciliación (Etapa 4, todavía sin
// implementar) es quien procesa y vacía esta cola — quitarVentaDeCola ya
// queda lista para eso.
import type { ItemPedidoUI, MetodoPago } from '../types';

const DB_NAME = 'vallis_cola_ventas';
const DB_VERSION = 1;
const STORE_NAME = 'ventas';

export interface VentaEncolada {
    // UUID generado en el cliente al momento de la venta — es el mismo id
    // que se va a usar como id real en `ventas` al reconciliar, para que un
    // reintento nunca pueda duplicar la venta.
    id: string;
    localId: string;
    usuarioId: string;
    arqueoId: string; // el arqueo que estaba activo al vender
    items: ItemPedidoUI[];
    total: number;
    metodoPago: MetodoPago;
    fecha: string; // ISO — cuándo ocurrió la venta, no cuándo se sincroniza
}

const abrirDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB no disponible en este navegador'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const encolarVenta = async (venta: VentaEncolada): Promise<void> => {
    const db = await abrirDB();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).add(venta);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

export const leerColaVentas = async (): Promise<VentaEncolada[]> => {
    const db = await abrirDB();
    try {
        return await new Promise<VentaEncolada[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).getAll();
            request.onsuccess = () => resolve(request.result as VentaEncolada[]);
            request.onerror = () => reject(request.error);
        });
    } finally {
        db.close();
    }
};

// Sin uso todavía (llega con la reconciliación, Etapa 4) — queda ya resuelto
// para no tener que volver a tocar este archivo en esa etapa.
export const quitarVentaDeCola = async (id: string): Promise<void> => {
    const db = await abrirDB();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};
