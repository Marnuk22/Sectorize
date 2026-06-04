import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Producto, Categoria } from '../types';

interface MenuContextType {
    productos: Producto[];
    categorias: Categoria[];
    cargando: boolean;
    obtenerProductoPorId: (id: string) => Producto | undefined;
    filtrarPorCategoria: (nombre: string) => Producto[];
    agregarProducto: (nuevo: Omit<Producto, 'id' | 'local_id' | 'creado_at' | 'updated_at'>) => Promise<void>;
    editarProducto: (id: string, cambios: Partial<Producto>) => Promise<void>;
    borrarProducto: (id: string) => Promise<void>;
    toggleActivo: (id: string, activo: boolean) => Promise<void>;
    ajustarStock: (id: string, cantidad: number) => Promise<void>;
    agregarCategoria: (nombre: string, icono?: string) => Promise<void>;
    editarCategoria: (id: string, nombre: string, icono?: string) => Promise<void>;
    borrarCategoria: (id: string) => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
    const { localId } = useAuth();
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!localId) return;

        let activo = true;

        const cargar = async () => {
            setCargando(true);
            try {
                const [{ data: prods }, { data: cats }] = await Promise.all([
                    supabase.from('productos').select('*').eq('local_id', localId).order('nombre'),
                    supabase.from('categorias').select('*').eq('local_id', localId).order('orden'),
                ]);
                if (!activo) return;
                if (prods) setProductos(prods as Producto[]);
                if (cats) setCategorias(cats as Categoria[]);
            } catch (err) {
                console.error('Error cargando menú:', err);
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
    }, [localId]);

    const obtenerProductoPorId = (id: string) => productos.find(p => p.id === id);

    const filtrarPorCategoria = (nombre: string) =>
        productos.filter(p => p.categoria === nombre);

    const agregarProducto = async (nuevo: Omit<Producto, 'id' | 'local_id' | 'creado_at' | 'updated_at'>) => {
        const { data, error } = await supabase
            .from('productos')
            .insert({ ...nuevo, local_id: localId })
            .select()
            .single();
        if (error) throw error;
        setProductos(prev => [...prev, data as Producto]);
    };

    const editarProducto = async (id: string, cambios: Partial<Producto>) => {
        const { data, error } = await supabase
            .from('productos')
            .update({ ...cambios, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        setProductos(prev => prev.map(p => p.id === id ? data as Producto : p));
    };

    const borrarProducto = async (id: string) => {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) throw error;
        setProductos(prev => prev.filter(p => p.id !== id));
    };

    const toggleActivo = async (id: string, activo: boolean) => {
        await editarProducto(id, { activo });
    };

    const ajustarStock = async (id: string, cantidad: number) => {
        const producto = productos.find(p => p.id === id);
        if (!producto) return;
        await editarProducto(id, { stock_actual: Math.max(0, producto.stock_actual + cantidad) });
    };

    const agregarCategoria = async (nombre: string, icono?: string) => {
        const { data, error } = await supabase
            .from('categorias')
            .insert({ nombre, icono: icono ?? null, local_id: localId, orden: categorias.length })
            .select()
            .single();
        if (error) throw error;
        setCategorias(prev => [...prev, data as Categoria]);
    };

    const editarCategoria = async (id: string, nombre: string, icono?: string) => {
        const { data, error } = await supabase
            .from('categorias')
            .update({ nombre, icono: icono ?? null })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        setCategorias(prev => prev.map(c => c.id === id ? data as Categoria : c));
    };

    const borrarCategoria = async (id: string) => {
        const { error } = await supabase.from('categorias').delete().eq('id', id);
        if (error) throw error;
        setCategorias(prev => prev.filter(c => c.id !== id));
    };

    return (
        <MenuContext.Provider value={{
            productos, categorias, cargando,
            obtenerProductoPorId, filtrarPorCategoria,
            agregarProducto, editarProducto, borrarProducto,
            toggleActivo, ajustarStock,
            agregarCategoria, editarCategoria, borrarCategoria,
        }}>
            {children}
        </MenuContext.Provider>
    );
};

export const useMenu = () => {
    const context = useContext(MenuContext);
    if (!context) throw new Error('useMenu debe usarse dentro de MenuProvider');
    return context;
};