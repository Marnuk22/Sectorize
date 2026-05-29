// src/context/MenuContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Producto } from '../types';

interface MenuContextType {
    productos: Producto[];
    categorias: string[];
    obtenerProductoPorId: (id: string) => Producto | undefined;
    obtenerProductoPorNombre: (nombre: string) => Producto | undefined;
    filtrarPorCategoria: (categoria: string) => Producto[];
    agregarProducto: (nuevoProducto: Omit<Producto, 'id'>) => void;
    borrarProducto: (id: string) => void;
    agregarCategoria: (nuevaCat: string) => void;
    borrarCategoria: (cat: string) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<string[]>([
        'Comida',
        'Bebida',
        'Cafetería',
        'Postres'
    ]);

    const obtenerProductoPorId = (id: string) => productos.find(p => p.id === id);

    const obtenerProductoPorNombre = (nombre: string) =>
        productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());

    const filtrarPorCategoria = (categoria: string) =>
        productos.filter(p => p.categoria === categoria);

    const agregarProducto = (nuevoProducto: Omit<Producto, 'id'>) => {
        const productoConId: Producto = {
            ...nuevoProducto,
            id: crypto.randomUUID(),
        };
        setProductos(prev => [...prev, productoConId]);
    };

    const borrarProducto = (id: string) => {
        setProductos(prev => prev.filter(p => p.id !== id));
    };

    const agregarCategoria = (nuevaCat: string) => {
        if (!categorias.includes(nuevaCat)) {
            setCategorias(prev => [...prev, nuevaCat]);
        }
    };

    const borrarCategoria = (cat: string) => {
        setCategorias(prev => prev.filter(c => c !== cat));
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