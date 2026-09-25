import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Producto, Ingrediente } from '../types';

export interface FilaProductoDeposito { id: string; stock_actual: number; producto: Producto; }
export interface FilaIngredienteDeposito { id: string; stock_actual: number; ingrediente: Ingrediente; }

// Stock de un depósito puntual — on-demand, igual que useReceta/useKardexProducto.
export const useStockDeposito = (depositoId: string | null) => {
    const [productos, setProductos] = useState<FilaProductoDeposito[]>([]);
    const [ingredientes, setIngredientes] = useState<FilaIngredienteDeposito[]>([]);
    const [cargando, setCargando] = useState(false);

    const cargar = async () => {
        if (!depositoId) { setProductos([]); setIngredientes([]); return; }
        setCargando(true);
        const [prods, ings] = await Promise.all([
            supabase.from('producto_deposito').select('id, stock_actual, producto:productos(*)').eq('deposito_id', depositoId),
            supabase.from('ingrediente_deposito').select('id, stock_actual, ingrediente:ingredientes(*)').eq('deposito_id', depositoId),
        ]);
        setProductos((prods.data ?? []) as unknown as FilaProductoDeposito[]);
        setIngredientes((ings.data ?? []) as unknown as FilaIngredienteDeposito[]);
        setCargando(false);
    };

    useEffect(() => {
        let activo = true;
        const ejecutar = async () => { await cargar(); if (!activo) return; };
        ejecutar();
        return () => { activo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [depositoId]);

    return { productos, ingredientes, cargando, recargar: cargar };
};
