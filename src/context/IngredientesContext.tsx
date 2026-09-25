import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useConexion } from './ConexionContext';
import type { Ingrediente, MotivoMovimientoStock } from '../types';

// Context de ingredientes (materia prima para producción por lote) —
// mismo espíritu que MenuContext, pero sin la rama de catálogo compartido
// multisucursal: los ingredientes viven siempre directo en una sucursal
// (decisión de la Etapa 1 de "Producción/ingredientes + Depósito", ver
// ROADMAP). Sin mirror offline todavía (a diferencia de productos) — las
// escrituras se bloquean sin conexión, igual que el resto del inventario.

interface IngredientesContextType {
    ingredientes: Ingrediente[];
    cargando: boolean;
    obtenerIngredientePorId: (id: string) => Ingrediente | undefined;
    agregarIngrediente: (nuevo: Omit<Ingrediente, 'id' | 'local_id' | 'creado_at' | 'updated_at'>) => Promise<Ingrediente>;
    editarIngrediente: (id: string, cambios: Partial<Ingrediente>) => Promise<void>;
    borrarIngrediente: (id: string) => Promise<void>;
    toggleActivo: (id: string, activo: boolean) => Promise<void>;
    registrarMovimientoIngrediente: (
        ingredienteId: string,
        cantidad: number,
        motivo: MotivoMovimientoStock,
        costoUnitario?: number | null,
        nota?: string | null
    ) => Promise<{ stockAnterior: number; stockNuevo: number }>;
    recargarIngredientes: () => Promise<void>;
}

const IngredientesContext = createContext<IngredientesContextType | undefined>(undefined);

export const IngredientesProvider = ({ children }: { children: ReactNode }) => {
    const { localId } = useAuth();
    const { online } = useConexion();
    const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
    const [cargando, setCargando] = useState(true);

    const requiereConexion = () => {
        if (!online) throw new Error('No se puede editar ingredientes sin conexión.');
    };

    const cargar = async () => {
        if (!localId) return;
        setCargando(true);
        const { data, error } = await supabase
            .from('ingredientes')
            .select('*')
            .eq('local_id', localId)
            .order('nombre');
        if (!error) setIngredientes((data ?? []) as Ingrediente[]);
        setCargando(false);
    };

    useEffect(() => {
        if (!localId) return;
        const ejecutar = () => { cargar(); };
        ejecutar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localId]);

    const recargarIngredientes = async () => { await cargar(); };

    const obtenerIngredientePorId = (id: string) => ingredientes.find(i => i.id === id);

    const agregarIngrediente = async (nuevo: Omit<Ingrediente, 'id' | 'local_id' | 'creado_at' | 'updated_at'>) => {
        requiereConexion();
        const { data, error } = await supabase
            .from('ingredientes')
            .insert({ ...nuevo, local_id: localId })
            .select()
            .single();
        if (error) throw error;
        setIngredientes(prev => [...prev, data as Ingrediente]);
        return data as Ingrediente;
    };

    const editarIngrediente = async (id: string, cambios: Partial<Ingrediente>) => {
        requiereConexion();
        const { data, error } = await supabase
            .from('ingredientes')
            .update({ ...cambios, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        setIngredientes(prev => prev.map(i => i.id === id ? data as Ingrediente : i));
    };

    const borrarIngrediente = async (id: string) => {
        requiereConexion();
        const { error } = await supabase.from('ingredientes').delete().eq('id', id);
        if (error) throw error;
        setIngredientes(prev => prev.filter(i => i.id !== id));
    };

    const toggleActivo = async (id: string, activo: boolean) => {
        await editarIngrediente(id, { activo });
    };

    // Suma/resta stock de forma atómica vía RPC — mismo patrón que
    // registrarMovimientoStock en MenuContext.
    const registrarMovimientoIngrediente = async (
        ingredienteId: string,
        cantidad: number,
        motivo: MotivoMovimientoStock,
        costoUnitario: number | null = null,
        nota: string | null = null,
    ) => {
        if (!localId) throw new Error('Sin sesión activa');
        requiereConexion();

        const { data, error } = await supabase.rpc('registrar_movimiento_ingrediente', {
            p_ingrediente_id: ingredienteId,
            p_local_id: localId,
            p_cantidad: cantidad,
            p_motivo: motivo,
            p_costo_unitario: costoUnitario,
            p_nota: nota,
        });
        if (error) throw error;

        const fila = Array.isArray(data) ? data[0] : data;
        if (!fila) throw new Error('La RPC no devolvió el stock actualizado');

        setIngredientes(prev => prev.map(i => i.id === ingredienteId ? { ...i, stock_actual: fila.stock_nuevo } : i));

        return { stockAnterior: fila.stock_anterior as number, stockNuevo: fila.stock_nuevo as number };
    };

    return (
        <IngredientesContext.Provider value={{
            ingredientes, cargando,
            obtenerIngredientePorId, agregarIngrediente, editarIngrediente, borrarIngrediente,
            toggleActivo, registrarMovimientoIngrediente, recargarIngredientes,
        }}>
            {children}
        </IngredientesContext.Provider>
    );
};

export const useIngredientes = () => {
    const context = useContext(IngredientesContext);
    if (!context) throw new Error('useIngredientes debe usarse dentro de IngredientesProvider');
    return context;
};
