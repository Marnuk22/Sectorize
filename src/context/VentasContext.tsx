import { createContext, useContext, useState, type ReactNode } from 'react';
import { type ItemPedido, type Mesa, type MetodoPago, type Venta} from '../types';
import {MetodosPagoEjemplo} from '../Data/DataSet';


interface VentasContextType {
    historialVentas: Venta[];
    registrarVenta: (items: ItemPedido[], total: number, mesa: Mesa, metodoPago: MetodoPago) => void;
    MetodosPago: MetodoPago[]; // Aquí podrías cargar esto desde un servicio o definirlo estático
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

export const VentasProvider = ({ children }: { children: ReactNode }) => {
    const [historialVentas, setHistorialVentas] = useState<Venta[]>([]);
    const [metodosPago] = useState<MetodoPago[]>([...MetodosPagoEjemplo])

    const registrarVenta = (items: ItemPedido[], total: number, mesa: Mesa, metodoPago: MetodoPago) => {
        const nuevaVenta: Venta = {
            id: Date.now(),
            fecha: new Date(),
            items,
            total,
            mesa,
            metodoPago // Aquí podrías hacer que el usuario elija el método de pago en la UI
        };
        setHistorialVentas(prev => [...prev, nuevaVenta]);
        console.log("Venta registrada con éxito:", nuevaVenta);
    };
    return (
        <VentasContext.Provider value={{ 
            historialVentas,
            registrarVenta,
            MetodosPago: metodosPago
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