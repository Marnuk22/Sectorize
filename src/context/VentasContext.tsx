// src/context/VentasContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ItemPedidoUI, MesaUI, MetodoPago, VentaUI, ArqueoUI } from '../types';

interface VentasContextType {
    historialVentas: VentaUI[];
    ArqueoSeleccionado: ArqueoUI | null;
    ArqueosHistorial: ArqueoUI[];
    MetodosPago: MetodoPago[];
    registrarVenta: (items: ItemPedidoUI[], total: number, mesa: MesaUI, metodoPago: MetodoPago) => void;
    abrirArqueo: (montoInicial: number) => void;
    cerrarArqueo: (montoFinalReal: number) => void;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

export const VentasProvider = ({ children }: { children: ReactNode }) => {
    const [historialVentas, setHistorialVentas] = useState<VentaUI[]>([]);
    const [idArqueoSeleccionado, setIdArqueoSeleccionado] = useState<string | null>(null);
    const [ArqueosHistorial, setArqueosHistorial] = useState<ArqueoUI[]>([]);

    const ArqueoSeleccionado = ArqueosHistorial.find(a => a.id === idArqueoSeleccionado) ?? null;

    const registrarVenta = (items: ItemPedidoUI[], total: number, mesa: MesaUI, metodoPago: MetodoPago) => {
        const nuevaVenta: VentaUI = {
            id: crypto.randomUUID(),
            fecha: new Date(),
            items,
            total,
            mesa,
            metodoPago
        };
        setHistorialVentas(prev => [...prev, nuevaVenta]);
        console.log("Venta registrada:", nuevaVenta);
    };

    const abrirArqueo = (montoInicial: number) => {
        const nuevoArqueo: ArqueoUI = {
            id: crypto.randomUUID(),
            montoInicial,
            montoFinalReal: null,
            fechaApertura: new Date(),
            fechaCierre: null,
            estado: 'abierto',
        };
        setArqueosHistorial(prev => [...prev, nuevoArqueo]);
        setIdArqueoSeleccionado(nuevoArqueo.id);
    };

    const cerrarArqueo = (montoFinalReal: number) => {
        if (!idArqueoSeleccionado) return;
        setArqueosHistorial(prev =>
            prev.map(a =>
                a.id === idArqueoSeleccionado
                    ? { ...a, montoFinalReal, fechaCierre: new Date(), estado: 'cerrado' as const }
                    : a
            )
        );
    };

    return (
        <VentasContext.Provider value={{
            historialVentas,
            ArqueoSeleccionado,
            ArqueosHistorial,
            MetodosPago: ['efectivo', 'tarjeta', 'transferencia', 'otro'],
            registrarVenta,
            abrirArqueo,
            cerrarArqueo,
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