import { createContext, useContext, useState, type ReactNode } from 'react';
import { type ItemPedido, type Mesa } from '../types';

interface Venta {
    id: number;
    fecha: Date;
    items: ItemPedido[];
    total: number;
    mesa: Mesa;
}

interface VentasContextType {
    historialVentas: Venta[];
    registrarVenta: (items: ItemPedido[], total: number, mesa: Mesa) => void;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

export const VentasProvider = ({ children }: { children: ReactNode }) => {
    const [historialVentas, setHistorialVentas] = useState<Venta[]>([]);

    const registrarVenta = (items: ItemPedido[], total: number, mesa: Mesa) => {
        const nuevaVenta: Venta = {
            id: Date.now(),
            fecha: new Date(),
            items,
            total,
            mesa
        };
        setHistorialVentas(prev => [...prev, nuevaVenta]);
        console.log("Venta registrada con éxito:", nuevaVenta);
    };
    return (
        <VentasContext.Provider value={{ 
            historialVentas,
            registrarVenta 
            }}>
            {children}
        </VentasContext.Provider>
    );
};
export const useVentas = () => {
    const context = useContext(VentasContext);
    if (!context) throw new Error("useVentas debe usarse dentro de VentasProvider");
    return context;
};