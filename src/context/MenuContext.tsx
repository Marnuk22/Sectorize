// src/context/MenuContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Producto } from '../types';
import { PRODUCTOS_CARTA, CATEGORIAS_OFICIALES} from '../Data/DataSet';

interface MenuContextType {
    productos: Producto[];
    categorias: string[];
    // --- Consultas ---
    obtenerProductoPorId: (id: number) => Producto | undefined;
    obtenerProductoPorNombre: (nombre: string) => Producto | undefined;
    filtrarPorCategoria: (categoria: string) => Producto[];
    // --- Acciones de Gestión ---
    agregarProducto: (nuevoProducto: Omit<Producto, 'id'>) => void;
    borrarProducto: (id: number) => void;
    agregarCategoria: (nuevaCat: string) => void;
    borrarCategoria: (cat: string) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
    const [productos, setProductos] = useState<Producto[]>(PRODUCTOS_CARTA);
    const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_OFICIALES);
    // --- LÓGICA DE CONSULTA ---
    const obtenerProductoPorId = (id: number) => productos.find(p => p.id === id);

    const obtenerProductoPorNombre = (nombre: string) => productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());

    const filtrarPorCategoria = (categoria: string) => productos.filter(p => p.categoria === categoria);

    // --- LÓGICA DE GESTIÓN ---
    const agregarProducto = (nuevoProducto: Omit<Producto, 'id'>) => {
        const productoConId: Producto = {
            ...nuevoProducto,
            id: productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1
        };
        setProductos(prev => [...prev, productoConId]);
    };

    const borrarProducto = (id: number) => {
        setProductos(prev => prev.filter(p => p.id !== id));
    };

    const agregarCategoria = (nuevaCat: string) => {
        if (!categorias.includes(nuevaCat)) {
            setCategorias(prev => [...prev, nuevaCat]);
        }
    };

    const borrarCategoria = (cat: string) => {
        setCategorias(prev => prev.filter(c => c !== cat));
        // Opcional: Podrías borrar también los productos de esa categoría o avisar al usuario
    };

    return (
        <MenuContext.Provider value={{
            productos,
            categorias,
            obtenerProductoPorId,
            obtenerProductoPorNombre,
            filtrarPorCategoria,
            agregarProducto,
            borrarProducto,
            agregarCategoria,
            borrarCategoria
        }}>
            {children}
        </MenuContext.Provider>
    );
};

export const useMenu = () => {
    const context = useContext(MenuContext);
    if (!context) throw new Error("useMenu debe usarse dentro de MenuProvider");
    return context;
};