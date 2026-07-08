import { useMemo } from 'react';
import { useMenu } from '../context/MenuContext';
import { useMasVendidos } from './useMasVendidos';
import type { Producto } from '../types';

// Combina favoritos manuales + más vendidos, sin duplicados.
// Manuales primero, los más vendidos rellenan el resto.
export const useFavoritos = (limite = 8): { favoritos: Producto[]; cargando: boolean } => {
    const { productos } = useMenu();
    const { masVendidos, cargando } = useMasVendidos(5);

    const favoritos = useMemo(() => {
        // 1. Favoritos manuales (activos), en su orden natural
        const manuales = productos.filter(p => p.favorito && p.activo);

        // 2. Más vendidos que NO estén ya en los manuales
        const idsManuales = new Set(manuales.map(p => p.id));
        const vendidos = masVendidos
            .map(id => productos.find(p => p.id === id))
            .filter((p): p is Producto => !!p && p.activo && !idsManuales.has(p.id));

        // 3. Combinar: manuales primero, vendidos rellenan
        return [...manuales, ...vendidos].slice(0, limite);
    }, [productos, masVendidos, limite]);

    return { favoritos, cargando };
};