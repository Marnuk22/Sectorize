import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { ItemPedidoUI, MesaUI, MetodoPago, VentaUI, ArqueoUI } from '../types';

interface VentasContextType {
    historialVentas: VentaUI[];
    arqueoActivo: ArqueoUI | null;
    ArqueosHistorial: ArqueoUI[];
    MetodosPago: MetodoPago[];
    cargando: boolean;
    registrarVenta: (items: ItemPedidoUI[], total: number, mesa: MesaUI, metodoPago: MetodoPago) => Promise<void>;
    abrirArqueo: (montoInicial: number) => Promise<void>;
    cerrarArqueo: (montoFinalReal: number) => Promise<void>;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

export const VentasProvider = ({ children }: { children: ReactNode }) => {
    const { localId, user } = useAuth();
    const [historialVentas, setHistorialVentas] = useState<VentaUI[]>([]);
    const [ArqueosHistorial, setArqueosHistorial] = useState<ArqueoUI[]>([]);
    const [cargando, setCargando] = useState(true);

    const arqueoActivo = ArqueosHistorial.find(a => a.estado === 'abierto') ?? null;

    useEffect(() => {
        if (!localId) return;

        let activo = true;

        const cargar = async () => {
            setCargando(true);
            try {
                const { data: arqueos } = await supabase
                    .from('arqueos')
                    .select('*')
                    .eq('local_id', localId)
                    .order('fecha_apertura', { ascending: false });

                if (!activo) return;

                if (arqueos) {
                    setArqueosHistorial(arqueos.map(a => ({
                        id: a.id,
                        montoInicial: a.monto_inicial,
                        montoFinalReal: a.monto_final_real,
                        fechaApertura: new Date(a.fecha_apertura),
                        fechaCierre: a.fecha_cierre ? new Date(a.fecha_cierre) : null,
                        estado: a.estado,
                    })));

                    const arqueoAbierto = arqueos.find(a => a.estado === 'abierto');
                    if (arqueoAbierto) {
                        const { data: ventas } = await supabase
                            .from('ventas')
                            .select('*')
                            .eq('arqueo_id', arqueoAbierto.id)
                            .order('fecha', { ascending: false });

                        if (!activo) return;

                        if (ventas) {
                            setHistorialVentas(ventas.map(v => ({
                                id: v.id,
                                fecha: new Date(v.fecha),
                                items: [],
                                total: v.total,
                                mesa: { id: '', nombre: 'Mesa', estado: 'libre' as const, aConfirmar: [], pedidos: [] },
                                metodoPago: v.metodo_pago,
                            })));
                        }
                    }
                }
            } catch (err) {
                console.error('Error cargando ventas:', err);
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
    }, [localId]);

    const registrarVenta = async (items: ItemPedidoUI[], total: number, mesa: MesaUI, metodoPago: MetodoPago) => {
        if (!localId || !user) throw new Error('Sin sesión activa');
        if (!arqueoActivo) throw new Error('No hay arqueo abierto');

        const { data: venta, error: ventaError } = await supabase
            .from('ventas')
            .insert({
                local_id: localId,
                usuario_id: user.id,
                arqueo_id: arqueoActivo.id,
                sector_id: null,
                total,
                metodo_pago: metodoPago,
                estado: 'cerrada',
            })
            .select()
            .single();

        if (ventaError) throw ventaError;

        const { error: detalleError } = await supabase
            .from('detalle_ventas')
            .insert(items.map(item => ({
                venta_id: venta.id,
                // Si el item no es un producto del inventario (ej: membresía), producto_id va null
                producto_id: (item as any).esProductoInventario === false ? null : item.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio,
            })));

        if (detalleError) throw detalleError;

        setHistorialVentas(prev => [{
            id: venta.id,
            fecha: new Date(venta.fecha),
            items,
            total,
            mesa,
            metodoPago,
        }, ...prev]);
    };

    const abrirArqueo = async (montoInicial: number) => {
        if (!localId || !user) return;
        if (arqueoActivo) throw new Error('Ya hay un arqueo abierto');

        const { data, error } = await supabase
            .from('arqueos')
            .insert({ local_id: localId, usuario_id: user.id, monto_inicial: montoInicial, estado: 'abierto' })
            .select()
            .single();

        if (error) throw error;

        setArqueosHistorial(prev => [{
            id: data.id,
            montoInicial: data.monto_inicial,
            montoFinalReal: null,
            fechaApertura: new Date(data.fecha_apertura),
            fechaCierre: null,
            estado: 'abierto',
        }, ...prev]);
    };

    const cerrarArqueo = async (montoFinalReal: number) => {
        if (!arqueoActivo) return;

        const { data: ventas } = await supabase
            .from('ventas')
            .select('total')
            .eq('arqueo_id', arqueoActivo.id)
            .eq('estado', 'cerrada');

        const totalVentas = ventas?.reduce((acc, v) => acc + v.total, 0) ?? 0;
        const montoEsperado = arqueoActivo.montoInicial + totalVentas;

        const { error } = await supabase
            .from('arqueos')
            .update({
                estado: 'cerrado',
                monto_final_real: montoFinalReal,
                monto_final_esperado: montoEsperado,
                fecha_cierre: new Date().toISOString(),
            })
            .eq('id', arqueoActivo.id);

        if (error) throw error;

        setArqueosHistorial(prev => prev.map(a =>
            a.id === arqueoActivo.id
                ? { ...a, montoFinalReal, fechaCierre: new Date(), estado: 'cerrado' as const }
                : a
        ));
        setHistorialVentas([]);
    };

    return (
        <VentasContext.Provider value={{
            historialVentas,
            arqueoActivo,
            ArqueosHistorial,
            MetodosPago: ['efectivo', 'tarjeta', 'transferencia', 'otro'],
            cargando,
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
    if (!context) throw new Error('useVentas debe usarse dentro de VentasProvider');
    return context;
};