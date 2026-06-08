import { createContext, useContext, useState, type ReactNode } from 'react';
import { useVentas } from './VentasContext';
import type { ItemPedidoUI, MetodoPago, Producto, MesaUI } from '../types';

interface MostradorContextType {
    carrito: ItemPedidoUI[];
    total: number;
    agregar: (producto: Producto) => void;
    quitar: (productoId: string) => void;
    aumentar: (productoId: string) => void;
    disminuir: (productoId: string) => void;
    vaciar: () => void;
    cobrar: (metodoPago: MetodoPago) => Promise<void>;
}

const MostradorContext = createContext<MostradorContextType | undefined>(undefined);

export const MostradorProvider = ({ children }: { children: ReactNode }) => {
    const { registrarVenta } = useVentas();
    const [carrito, setCarrito] = useState<ItemPedidoUI[]>([]);

    const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    const agregar = (producto: Producto) => {
        setCarrito(prev => {
            const existe = prev.find(item => item.id === producto.id);
            if (existe) {
                return prev.map(item =>
                    item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
                );
            }
            return [...prev, {
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio_venta,
                categoria: producto.categoria,
                cantidad: 1,
            }];
        });
    };

    const quitar = (productoId: string) => {
        setCarrito(prev => prev.filter(item => item.id !== productoId));
    };

    const aumentar = (productoId: string) => {
        setCarrito(prev => prev.map(item =>
            item.id === productoId ? { ...item, cantidad: item.cantidad + 1 } : item
        ));
    };

    const disminuir = (productoId: string) => {
        setCarrito(prev => prev
            .map(item => item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item)
            .filter(item => item.cantidad > 0)
        );
    };

    const vaciar = () => setCarrito([]);

    const cobrar = async (metodoPago: MetodoPago) => {
        if (carrito.length === 0) return;
        // Mesa virtual para reutilizar registrarVenta del núcleo
        const mesaVirtual: MesaUI = {
            id: 'mostrador',
            nombre: 'Mostrador',
            estado: 'libre',
            aConfirmar: [],
            pedidos: carrito,
        };
        await registrarVenta(carrito, total, mesaVirtual, metodoPago);
        vaciar();
    };

    return (
        <MostradorContext.Provider value={{ carrito, total, agregar, quitar, aumentar, disminuir, vaciar, cobrar }}>
            {children}
        </MostradorContext.Provider>
    );
};

export const useMostrador = () => {
    const context = useContext(MostradorContext);
    if (!context) throw new Error('useMostrador debe usarse dentro de MostradorProvider');
    return context;
};