// src/logic/catalogoLocal.ts
//
// Espejo de solo lectura del catálogo de productos en IndexedDB — Etapa 2
// del modo offline. Se guarda el `Producto[]` ya aplanado (mismo shape que
// usa el resto de la app, con stock/precio ya resueltos vía
// producto_sucursal si el negocio es compartido), no las tablas crudas por
// separado — alcanza para mostrar el catálogo y es más simple.
//
// Reemplazo completo en cada guardado (no particionado por local_id): el
// alcance de esta etapa es una sola sucursal, así que lo que hay guardado
// siempre es "el catálogo de la última sucursal con la que este navegador
// sincronizó". Si en el futuro hace falta multisucursal offline, ahí sí
// habría que particionar por local_id (fuera de alcance por ahora).
import type { Producto } from '../types';

const DB_NAME = 'vallis_catalogo_local';
const DB_VERSION = 1;
const STORE_NAME = 'productos';

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

export const guardarCatalogoLocal = async (productos: Producto[]): Promise<void> => {
    const db = await abrirDB();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
            for (const producto of productos) {
                store.put(producto);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

export const leerCatalogoLocal = async (): Promise<Producto[]> => {
    const db = await abrirDB();
    try {
        return await new Promise<Producto[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result as Producto[]);
            request.onerror = () => reject(request.error);
        });
    } finally {
        db.close();
    }
};
