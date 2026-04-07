import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type  { Mesa, Sector, Producto, ItemPedido, MetodoPago } from '../types';
import { MesaService } from '../logic/MesaServices';
import { useVentas } from './VentasContext';
import { sectoresEjemplo } from '../Data/DataSet';

interface SalonContextType {
    sectores: Sector[];
    mesaSeleccionada: Mesa | null;
    sectorSeleccionado: Sector | null;
    sectorBuscado: (idMesa: number) => number | null;
    // --- Acciones de Selección ---
    seleccionarSector: (idSector: number | null) => void;
    seleccionarMesa: (idMesa: number | null) => void;
    // --- Operaciones de Pedido ---
    agregarProductoAMesa: (producto: Producto) => void;
    cerrarMesa: (idMesa: number, metodoPago: MetodoPago) => void;
    onAumentarProducto: (productoId: number) => void;
    onDisminuirProducto: (productoId: number) => void;
    onEliminarProducto: (productoId: number) => void;
    // --- Gestión de Estructura ---
    agregarSector: (nombre: string) => void;
    borrarSector: (idSector: number) => void;
    agregarMesaASector: (idSector: number, nombreMesa: string) => void;
    borrarMesa: (idMesa: number) => void;
    //Funcionalidades adicionales podrían ir aquí, como CambiarMesa, etc.
    transferirMesa: (idMesaOrigen: number, idMesaDestino: number) => void;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
    const { registrarVenta } = useVentas();
    // Estado principal: Una lista de sectores, y cada sector tiene sus mesas
    const [sectores, setSectores] = useState<Sector[]>([...sectoresEjemplo]);
    // 1. Guardas solo el "puntero" (el ID)
    const [idMesaSeleccionada, setIdMesaSeleccionada] = useState<number | null>(null);
    const [idSectorSeleccionado, setIdSectorSeleccionado] = useState<number | null>(null);

    //SELECCIONAR SECTOR 

    // Helper para encontrar la mesa actual en el árbol de sectores
    const buscarMesa = (id: number): Mesa | null => {
        for (const sector of sectores) {
            const mesa = sector.mesas.find(m => m.id === id);
            if (mesa) return mesa;
        }
        return null;
    };

    const sectorBuscado = (idMesa: number): number | null => {
        for (const sector of sectores) {
            const mesa = sector.mesas.find(m => m.id === idMesa);
            if (mesa) return sector.id;
        }
        return null;
    };


    const mesaSeleccionada = useMemo(() => {
        if (!idMesaSeleccionada) return null;
        return buscarMesa(idMesaSeleccionada);
    }, [idMesaSeleccionada, sectores]);

    const sectorSeleccionado = useMemo(() => {
        if (!idSectorSeleccionado) return null;
        return sectores.find(s => s.id === idSectorSeleccionado) || null;
    }, [idSectorSeleccionado, sectores]);

    // --- Acciones de Selección (Limpias) ---
    const seleccionarSector = (id: number | null) => {
        setIdSectorSeleccionado(id);
        setIdMesaSeleccionada(null); // Reset de mesa al cambiar de sector
    };

    const seleccionarMesa = (id: number | null) => {
        setIdMesaSeleccionada(id);
    };
///////////////////////////////////////
    // --- LÓGICA DE GESTIÓN ---
    const agregarSector = (nombre: string) => {
        const nuevoSector: Sector = { id: Date.now(), nombre, mesas: [] };
        setSectores(prev => [...prev, nuevoSector]);
    };

    const agregarMesaASector = (idSector: number, nombreMesa: string) => {
        setSectores(prev => prev.map(sector => {
            if (sector.id === idSector) {
                return MesaService.agregarMesa(sector, nombreMesa);;
            }
            return sector;
        }));
    };

    // --- LÓGICA DE OPERACIÓN (USANDO MESASERVICE) ---

    const agregarProductoAMesa = (producto: Producto) => {
        if (!idMesaSeleccionada) return;

        setSectores(prev => prev.map(sector => ({
            ...sector,
            mesas: sector.mesas.map(mesa => 
                mesa.id === idMesaSeleccionada 
                    ? MesaService.agregarProducto(mesa, producto) 
                    : mesa
            )
        })));
    };

    const cerrarMesa = (idMesa: number, metodoPago: MetodoPago) => {
        const mesa = buscarMesa(idMesa);
        if (mesa && mesa.pedidos.length > 0) {
            const total = mesa.pedidos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
            registrarVenta(mesa.pedidos, total, mesa, metodoPago);

            // Limpiamos la mesa en el estado
            setSectores(prev => prev.map(sector => ({
                ...sector,
                mesas: sector.mesas.map(m => 
                    m.id === idMesa ? { ...m, pedidos: [], estado: 'libre' } : m
                )
            })));
            setIdMesaSeleccionada(null);
        }
    };

    const borrarSector = (idSector: number) => {
        setSectores(prev => prev.filter(s => s.id !== idSector));
        
        // Tip Pro: Si la mesa seleccionada estaba en ese sector, la deseleccionamos
        if (mesaSeleccionada && sectores.find(s => s.id === idSector)?.mesas.some(m => m.id === mesaSeleccionada.id)) {
            setIdMesaSeleccionada(null);
        }
    };

    const borrarMesa = (idMesa: number) => {
        setSectores(prev => prev.map(sector => ({
            ...sector,
            // Filtramos las mesas de cada sector, quitando la que coincida con el ID
            mesas: sector.mesas.filter(m => m.id !== idMesa)
        })));

        // Si el mozo estaba viendo esa mesa justo ahora, limpiamos la selección
        if (idMesaSeleccionada === idMesa) {
            setIdMesaSeleccionada(null);
        }
    };  

    const actualizarPedidoMesa = (nuevosPedidos: ItemPedido[]) => {
        setSectores(prevSectores => 
            prevSectores.map(sector => {
                if (sector.id !== idSectorSeleccionado) return sector;
                
                return {
                    ...sector,
                    mesas: sector.mesas.map(mesa => 
                        mesa.id === idMesaSeleccionada 
                            ? { ...mesa, pedidos: nuevosPedidos, estado: nuevosPedidos.length > 0 ? 'ocupada' : 'libre' } 
                            : mesa
                    )
                };
            })
        );
        // Aquí también podrías disparar el fetch(PUT/POST) a tu API
    };

    const onAumentarProducto = (productoId: number) => {
        console.log("Intentando aumentar producto con ID:", productoId);
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        const nuevosPedidos = mesa.pedidos.map(item =>
            item.id === productoId ? { ...item, cantidad: item.cantidad + 1 } : item
        );
        actualizarPedidoMesa(nuevosPedidos);
    };

    const onDisminuirProducto = (productoId: number) => {
        console.log("Intentando disminuir producto con ID:", productoId);
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        const nuevosPedidos = mesa.pedidos.map(item =>
            item.id === productoId ? { ...item, cantidad: Math.max(0, item.cantidad - 1) } : item
        );
        actualizarPedidoMesa(nuevosPedidos);
    };


    const onEliminarProducto = (productoId: number) => {
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        const nuevosPedidos = mesa.pedidos.filter(item => item.id !== productoId);
        actualizarPedidoMesa(nuevosPedidos);
    };

    const transferirMesa = (idMesaOrigen: number, idMesaDestino: number) => {
        const mesaOrigen = buscarMesa(idMesaOrigen);
        const mesaDestino = buscarMesa(idMesaDestino);

        // Validaciones críticas
        if (!mesaOrigen || !mesaDestino) return;
        if (mesaDestino.pedidos.length > 0) {
            console.error("La mesa destino no está vacía");
            return;
        }
        const pedidosAMover = mesaOrigen.pedidos;

        setSectores(prevSectores => prevSectores.map(sector => ({
        ...sector,
        mesas: sector.mesas.map((mesa: Mesa) => {
            // Si es la mesa de origen, la vaciamos
            if (mesa.id === idMesaOrigen) {
                return { ...mesa, pedidos: [], estado: 'libre' };
            }
            // Si es la mesa de destino, le pasamos los pedidos
            if (mesa.id === idMesaDestino) {
                return { ...mesa, pedidos: pedidosAMover, estado: 'ocupada' };
            }
            return mesa;
        })
    })));
}
    return (
        <SalonContext.Provider value={{
            sectores,
            mesaSeleccionada, 
            sectorSeleccionado,
            sectorBuscado,
            seleccionarMesa,
            seleccionarSector,
            agregarProductoAMesa, 
            cerrarMesa, 
            agregarSector, 
            agregarMesaASector,
            borrarSector,
            borrarMesa,
            onAumentarProducto,
            onDisminuirProducto,
            onEliminarProducto,
            transferirMesa
        }}>
            {children}
        </SalonContext.Provider>
    );
};
export const useSalon = () => {
    const context = useContext(SalonContext);
    if (!context) throw new Error("useSalon debe usarse dentro de SalonProvider");
    return context;
};