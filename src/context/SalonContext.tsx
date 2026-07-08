import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import type { SectorUI as Sector, MesaUI as Mesa, ItemPedidoUI as ItemPedido, MetodoPago, Producto } from '../types';
import { MesaService } from '../logic/MesaServices';
import { useVentas } from './VentasContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useMenu } from './MenuContext';

interface SalonContextType {
    sectores: Sector[];
    mesaSeleccionada: Mesa | null;
    sectorSeleccionado: Sector | null;
    cargando: boolean;
    sectorBuscado: (idMesa: string) => string | null;
    seleccionarSector: (idSector: string | null) => void;
    seleccionarMesa: (idMesa: string | null) => void;
    agregarProductoAMesa: (producto: Producto) => void;
    cerrarMesa: (idMesa: string, metodoPago: MetodoPago) => Promise<void>;
    actualizarPosicionMesa: (idMesa: string, x: number, y: number) => Promise<void>;
    onAumentarProducto: (productoId: string) => void;
    onAumentarAconfirmar: (productoId: string) => void;
    onDisminuirProducto: (productoId: string) => void;
    onDisminuirAConfirmar: (productoId: string) => void;
    onEliminarProducto: (productoId: string) => void;
    onEliminarAConfirmar: (productoId: string) => void;
    onNotaAConfirmar: (productoId: string, nota: string) => void;
    agregarSector: (nombre: string) => void;
    borrarSector: (idSector: string) => void;
    agregarMesaASector: (idSector: string, nombreMesa: string) => void;
    borrarMesa: (idMesa: string) => void;
    confirmarPedidoMesa: (idMesa: string) => void;
    transferirMesa: (idMesaOrigen: string, idMesaDestino: string) => void;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
    const { registrarVenta } = useVentas();
    const {recargarProductos} = useMenu();
    const { localId } = useAuth();
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [cargando, setCargando] = useState(true);
    const [idMesaSeleccionada, setIdMesaSeleccionada] = useState<string | null>(null);
    const [idSectorSeleccionado, setIdSectorSeleccionado] = useState<string | null>(null);

    useEffect(() => {
        if (!localId) return;

        let activo = true;

        const cargar = async () => {
            setCargando(true);
            try {
                const [{ data: sectoresDB, error: errorSectores }, { data: mesasDB, error: errorMesas }] = await Promise.all([
                    supabase.from('sectores').select('*').eq('local_id', localId).order('creado_at'),
                    supabase.from('mesas').select('*').eq('local_id', localId).order('creado_at'),
                ]);

                if (!activo) return;
                if (errorSectores) throw errorSectores;
                if (errorMesas) throw errorMesas;

                const sectoresUI: Sector[] = (sectoresDB ?? []).map(sector => ({
                    id: sector.id,
                    nombre: sector.nombre,
                    mesas: (mesasDB ?? [])
                        .filter(m => m.sector_id === sector.id)
                        .map(m => ({
                            id: m.id,
                            nombre: m.nombre,
                            capacidad: m.capacidad ?? undefined,
                            estado: m.estado === 'ocupado' ? 'ocupada' : m.estado === 'reservado' ? 'reservada' : 'libre' as const,
                            aConfirmar: [],
                            pedidos: [],
                            pos_x: m.pos_x,
                            pos_y: m.pos_y, 
                        }))
                }));

                setSectores(sectoresUI);
            } catch (err) {
                console.error('Error cargando salón:', err);
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
    }, [localId]);

    const buscarMesa = (id: string): Mesa | null => {
        for (const sector of sectores) {
            const mesa = sector.mesas.find(m => m.id === id);
            if (mesa) return mesa;
        }
        return null;
    };

    const sectorBuscado = (idMesa: string): string | null => {
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

    const seleccionarSector = (id: string | null) => {
        setIdSectorSeleccionado(id);
        setIdMesaSeleccionada(null);
    };

    const seleccionarMesa = (id: string | null) => setIdMesaSeleccionada(id);

    const agregarSector = async (nombre: string) => {
        if (!localId) return;
        const { data, error } = await supabase
            .from('sectores')
            .insert({ nombre, local_id: localId })
            .select()
            .single();
        if (error) { console.error('Error creando sector:', error); return; }
        setSectores(prev => [...prev, { id: data.id, nombre: data.nombre, mesas: [] }]);
    };

    const borrarSector = async (idSector: string) => {
        const { error } = await supabase.from('sectores').delete().eq('id', idSector);
        if (error) { console.error('Error borrando sector:', error); return; }
        setSectores(prev => prev.filter(s => s.id !== idSector));
        if (mesaSeleccionada && sectores.find(s => s.id === idSector)?.mesas.some(m => m.id === mesaSeleccionada.id)) {
            setIdMesaSeleccionada(null);
        }
    };

    const agregarMesaASector = async (idSector: string, nombreMesa: string) => {
        if (!localId) return;
        const { data, error } = await supabase
            .from('mesas')
            .insert({ nombre: nombreMesa, sector_id: idSector, local_id: localId })
            .select()
            .single();
        if (error) { console.error('Error creando mesa:', error); return; }
        const nuevaMesa: Mesa = { id: data.id, nombre: data.nombre, estado: 'libre', aConfirmar: [], pedidos: [], pos_x: null, pos_y: null };
        setSectores(prev => prev.map(sector =>
            sector.id === idSector ? { ...sector, mesas: [...sector.mesas, nuevaMesa] } : sector
        ));
    };

    const borrarMesa = async (idMesa: string) => {
        const { error } = await supabase.from('mesas').delete().eq('id', idMesa);
        if (error) { console.error('Error borrando mesa:', error); return; }
        setSectores(prev => prev.map(sector => ({
            ...sector,
            mesas: sector.mesas.filter(m => m.id !== idMesa)
        })));
        if (idMesaSeleccionada === idMesa) setIdMesaSeleccionada(null);
    };

    const agregarProductoAMesa = (producto: Producto) => {
        if (!idMesaSeleccionada) return;
        const item: ItemPedido = {
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio_venta,
            categoria: producto.categoria,
            cantidad: 1,
        };
        setSectores(prev => prev.map(sector => ({
            ...sector,
            mesas: sector.mesas.map(mesa =>
                mesa.id === idMesaSeleccionada ? MesaService.agregarProducto(mesa, item) : mesa
            )
        })));
    };

    const cerrarMesa = async (idMesa: string, metodoPago: MetodoPago) => {
        const mesa = buscarMesa(idMesa);
        if (!mesa || mesa.pedidos.length === 0) return;
        const total = mesa.pedidos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
        try {
            await registrarVenta(mesa.pedidos, total, mesa, metodoPago);
            await recargarProductos();
            setSectores(prev => prev.map(sector => ({
                ...sector,
                mesas: sector.mesas.map(m =>
                    m.id === idMesa ? { ...m, pedidos: [], aConfirmar: [], estado: 'libre' as const } : m
                )
            })));
            setIdMesaSeleccionada(null);
        } catch (err) {
            console.error('Error al cerrar mesa:', err);
        }
    };

    const actualizarPedidoMesa = (nuevosPedidos: ItemPedido[]) => {
        setSectores(prev => prev.map(sector => {
            if (sector.id !== idSectorSeleccionado) return sector;
            return {
                ...sector,
                mesas: sector.mesas.map(mesa =>
                    mesa.id === idMesaSeleccionada
                        ? { ...mesa, pedidos: nuevosPedidos, estado: nuevosPedidos.length > 0 || mesa.aConfirmar.length > 0 ? 'ocupada' as const : 'libre' as const }
                        : mesa
                )
            };
        }));
    };

    const actualizarPosicionMesa = async (idMesa: string, x: number, y: number) => {
        // Actualizar en memoria (inmediato, para que se vea fluido)
        setSectores(prev => prev.map(sector => ({
            ...sector,
            mesas: sector.mesas.map(mesa =>
                mesa.id === idMesa ? { ...mesa, pos_x: x, pos_y: y } : mesa
            )
        })));

        // Guardar en la base de datos
        const { error } = await supabase
            .from('mesas')
            .update({ pos_x: x, pos_y: y })
            .eq('id', idMesa);

        if (error) console.error('Error guardando posición de mesa:', error);
    };

    const actualizarConfirmadosMesa = (nuevosPedidos: ItemPedido[]) => {
        setSectores(prev => prev.map(sector => {
            if (sector.id !== idSectorSeleccionado) return sector;
            return {
                ...sector,
                mesas: sector.mesas.map(mesa =>
                    mesa.id === idMesaSeleccionada
                        ? { ...mesa, aConfirmar: nuevosPedidos, estado: nuevosPedidos.length > 0 || mesa.pedidos.length > 0 ? 'ocupada' as const : 'libre' as const }
                        : mesa
                )
            };
        }));
    };

    const onAumentarProducto = (productoId: string) => {
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        actualizarPedidoMesa(mesa.pedidos.map(item =>
            item.id === productoId ? { ...item, cantidad: item.cantidad + 1 } : item
        ));
    };

    const onAumentarAconfirmar = (productoId: string) => {
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        actualizarConfirmadosMesa(mesa.aConfirmar.map(item =>
            item.id === productoId ? { ...item, cantidad: item.cantidad + 1 } : item
        ));
    };

    const onDisminuirProducto = (productoId: string) => {
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        actualizarPedidoMesa(mesa.pedidos.map(item =>
            item.id === productoId ? { ...item, cantidad: Math.max(0, item.cantidad - 1) } : item
        ));
    };

    const onDisminuirAConfirmar = (productoId: string) => {
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        actualizarConfirmadosMesa(mesa.aConfirmar.map(item =>
            item.id === productoId ? { ...item, cantidad: Math.max(0, item.cantidad - 1) } : item
        ));
    };

    const onEliminarProducto = (productoId: string) => {
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        actualizarPedidoMesa(mesa.pedidos.filter(item => item.id !== productoId));
    };

    const onEliminarAConfirmar = (productoId: string) => {
        if (!idSectorSeleccionado || !idMesaSeleccionada) return;
        const mesa = buscarMesa(idMesaSeleccionada);
        if (!mesa) return;
        actualizarConfirmadosMesa(mesa.aConfirmar.filter(item => item.id !== productoId));
    };

    const onNotaAConfirmar = (productoId: string, nota: string) => {
    if (!idSectorSeleccionado || !idMesaSeleccionada) return;
    const mesa = buscarMesa(idMesaSeleccionada);
    if (!mesa) return;
    actualizarConfirmadosMesa(mesa.aConfirmar.map(item =>
        item.id === productoId ? { ...item, notas: nota } : item
    ));
};

    const transferirMesa = (idMesaOrigen: string, idMesaDestino: string) => {
        const mesaOrigen = buscarMesa(idMesaOrigen);
        const mesaDestino = buscarMesa(idMesaDestino);
        if (!mesaOrigen || !mesaDestino) return;
        if (mesaDestino.pedidos.length > 0) { console.error("La mesa destino no está vacía"); return; }
        const pedidosAMover = mesaOrigen.pedidos;
        setSectores(prev => prev.map(sector => ({
            ...sector,
            mesas: sector.mesas.map((mesa: Mesa) => {
                if (mesa.id === idMesaOrigen) return { ...mesa, pedidos: [], estado: 'libre' as const };
                if (mesa.id === idMesaDestino) return { ...mesa, pedidos: pedidosAMover, estado: 'ocupada' as const };
                return mesa;
            })
        })));
    };

    const confirmarPedidoMesa = (idMesa: string) => {
        const mesa = buscarMesa(idMesa);
        if (!mesa) return;
        actualizarPedidoMesa([...mesa.pedidos, ...mesa.aConfirmar]);
        actualizarConfirmadosMesa([]);
    };

    return (
        <SalonContext.Provider value={{
            sectores, mesaSeleccionada, sectorSeleccionado, cargando,
            sectorBuscado, seleccionarMesa, seleccionarSector,
            agregarProductoAMesa, cerrarMesa, agregarSector, actualizarPosicionMesa, agregarMesaASector,
            borrarSector, borrarMesa, onAumentarProducto, onAumentarAconfirmar,
            onDisminuirProducto, onDisminuirAConfirmar, onEliminarProducto,
            onEliminarAConfirmar, confirmarPedidoMesa, transferirMesa, onNotaAConfirmar
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