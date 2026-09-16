import { createContext, useContext, useState, type ReactNode } from 'react';
import { useVentas } from './VentasContext';
import type { ItemPedidoUI, MetodoPago, Producto, MesaUI } from '../types';
import { useMenu } from './MenuContext';

interface MostradorContextType {
    carrito: ItemPedidoUI[];
    total: number;
    agregar: (producto: Producto, cantidad?: number) => void;
    quitar: (productoId: string) => void;
    aumentar: (productoId: string) => void;
    disminuir: (productoId: string) => void;
    vaciar: () => void;
    cobrar: (metodoPago: MetodoPago, totalFinal?: number) => Promise<void>;
}

const MostradorContext = createContext<MostradorContextType | undefined>(undefined);

export const MostradorProvider = ({ children }: { children: ReactNode }) => {
    const { registrarVenta } = useVentas();
    const { recargarProductos, aplicarVentaOffline } = useMenu();
    const [carrito, setCarrito] = useState<ItemPedidoUI[]>([]);

    // El precio de cada ítem ya viene calculado al agregarlo (importante para granel)
    const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    const agregar = (producto: Producto, cantidad?: number) => {
        const esGranel = producto.tipo_venta === 'granel';

        setCarrito(prev => {
            const existe = prev.find(item => item.id === producto.id);

            if (esGranel) {
                // Para granel: la cantidad es el peso/volumen tecleado.
                // El "precio" del ítem es el precio por unidad de medida (precio_venta),
                // y la cantidad es lo que pesó. total = precio_venta * cantidad.
                const cant = cantidad ?? 0;
                if (cant <= 0) return prev;

                if (existe) {
                    // Si ya estaba, sumamos la cantidad (más peso del mismo producto)
                    return prev.map(item =>
                        item.id === producto.id
                            ? { ...item, cantidad: item.cantidad + cant }
                            : item
                    );
                }
                return [...prev, {
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio_venta,   // precio por unidad de medida
                    categoria: producto.categoria,
                    cantidad: cant,                  // el peso/volumen
                    tipo_venta: 'granel',
                    unidad_medida: producto.unidad_medida,
                }];
            }

            // Por unidad: comportamiento de siempre
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
                tipo_venta: 'unidad',
                unidad_medida: producto.unidad_medida,
            }];
        });
    };

    const quitar = (productoId: string) => {
        setCarrito(prev => prev.filter(item => item.id !== productoId));
    };

    // Para productos por unidad, +/- suma de a 1. Para granel, los botones no aplican
    // (se maneja distinto en la UI), pero dejamos la lógica segura.
    const aumentar = (productoId: string) => {
        setCarrito(prev => prev.map(item =>
            item.id === productoId && item.tipo_venta !== 'granel'
                ? { ...item, cantidad: item.cantidad + 1 }
                : item
        ));
    };

    const disminuir = (productoId: string) => {
        setCarrito(prev => prev
            .map(item =>
                item.id === productoId && item.tipo_venta !== 'granel'
                    ? { ...item, cantidad: item.cantidad - 1 }
                    : item
            )
            .filter(item => item.cantidad > 0)
        );
    };

    const vaciar = () => setCarrito([]);

    const cobrar = async (metodoPago: MetodoPago, totalFinal?: number) => {
    if (carrito.length === 0) return;
    const totalACobrar = totalFinal ?? total;
    const mesaVirtual: MesaUI = {
        id: 'mostrador',
        nombre: 'Mostrador',
        estado: 'libre',
        aConfirmar: [],
        pedidos: carrito,
    };
    const { offline } = await registrarVenta(carrito, totalACobrar, mesaVirtual, metodoPago);
    if (offline) {
        // Sin conexión: la venta quedó encolada (Etapa 3), no hay nada que
        // recargar del servidor — se descuenta el stock del catálogo local
        // en vez de pedirle a Supabase el stock real.
        aplicarVentaOffline(carrito.map(item => ({ id: item.id, cantidad: item.cantidad })));
    } else {
        await recargarProductos();
    }
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