import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { RecetaItem, Ingrediente } from '../types';

export type RecetaItemConIngrediente = RecetaItem & { ingrediente: Ingrediente };

// Receta (BOM) de un producto puntual — igual que el kardex, se consulta
// on-demand desde ModalProducto, no es estado compartido de ningún context.
export const useReceta = (productoId: string | null) => {
    const [items, setItems] = useState<RecetaItemConIngrediente[]>([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        let activo = true;

        const cargar = async () => {
            if (!productoId) { setItems([]); return; }
            setCargando(true);

            const { data } = await supabase
                .from('receta_items')
                .select('*, ingrediente:ingredientes(*)')
                .eq('producto_id', productoId);

            if (!activo) return;
            setItems((data ?? []) as unknown as RecetaItemConIngrediente[]);
            setCargando(false);
        };

        cargar();
        return () => { activo = false; };
    }, [productoId]);

    const recargar = async () => {
        if (!productoId) return;
        const { data } = await supabase
            .from('receta_items')
            .select('*, ingrediente:ingredientes(*)')
            .eq('producto_id', productoId);
        setItems((data ?? []) as unknown as RecetaItemConIngrediente[]);
    };

    const agregarItem = async (ingredienteId: string, cantidad: number) => {
        const { error } = await supabase
            .from('receta_items')
            .insert({ producto_id: productoId, ingrediente_id: ingredienteId, cantidad });
        if (error) throw error;
        await recargar();
    };

    const editarItem = async (id: string, cantidad: number) => {
        const { error } = await supabase.from('receta_items').update({ cantidad }).eq('id', id);
        if (error) throw error;
        await recargar();
    };

    const borrarItem = async (id: string) => {
        const { error } = await supabase.from('receta_items').delete().eq('id', id);
        if (error) throw error;
        await recargar();
    };

    return { items, cargando, agregarItem, editarItem, borrarItem };
};
