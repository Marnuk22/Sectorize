import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { MetodoPago, EstadoVenta } from '../types';

export interface VentaHistorial {
    id: string;
    fecha: Date;
    total: number;
    metodo_pago: MetodoPago;
    estado: EstadoVenta;
    arqueo_id: string;
    fecha_apertura_arqueo: Date;
    fecha_cierre_arqueo: Date | null;
    resumenItems: string;
    descuento: number;
    editadoEn: Date | null;
}

export interface ArqueoResumen {
    id: string;
    fecha_apertura: Date;
    fecha_cierre: Date | null;
    estado: 'abierto' | 'cerrado';
    total_ventas: number;
    cantidad_ventas: number;
    por_metodo: Record<string, number>;
}

interface Filtros {
    metodo: MetodoPago | 'todos';
    arqueo_id: string | 'todos';
    fecha_desde: string;
    fecha_hasta: string;
}

export interface DetalleVenta {
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    tipo_venta?: 'unidad' | 'granel';
    unidad_medida?: string;
}

const fmtCantidad = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });

// Texto corto para la fila de la lista, ej. "Cerveza x2, Papas x1 +2"
const resumenDeItems = (items: DetalleVenta[]): string => {
    if (items.length === 0) return 'Sin productos';
    const visibles = items.slice(0, 2).map(i => `${i.nombre} x${fmtCantidad(i.cantidad)}`);
    const resto = items.length > 2 ? ` +${items.length - 2}` : '';
    return visibles.join(', ') + resto;
};

export const useHistorialVentas = () => {
    const { localId } = useAuth();
    const [ventas, setVentas] = useState<VentaHistorial[]>([]);
    const [arqueos, setArqueos] = useState<ArqueoResumen[]>([]);
    const [cargando, setCargando] = useState(true);
    const [filtros, setFiltros] = useState<Filtros>({
        metodo: 'todos',
        arqueo_id: 'todos',
        fecha_desde: '',
        fecha_hasta: '',
    });
    const [detalles, setDetalles] = useState<Record<string, DetalleVenta[]>>({});


    useEffect(() => {
        if (!localId) return;
        cargarDatos();
    }, [localId]);

    const cargarDatos = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('ventas')
            .select(`
                id, fecha, total, metodo_pago, estado, arqueo_id, descuento, editado_en,
                arqueos (fecha_apertura, fecha_cierre, estado)
            `)
            .eq('local_id', localId)
            .order('fecha', { ascending: false });

        if (error) { console.error(error); setCargando(false); return; }

        const ventaIds = (data ?? []).map((v: any) => v.id);

        // Ítems de todas las ventas en una sola query (no N+1), para el preview
        // de cada fila y para precalentar el cache de cargarDetalleVenta.
        const { data: detallesRaw } = ventaIds.length > 0
            ? await supabase
                .from('detalle_ventas')
                .select('venta_id, cantidad, precio_unitario, subtotal, productos(nombre, tipo_venta, unidad_medida)')
                .in('venta_id', ventaIds)
            : { data: [] as any[] };

        const itemsPorVenta: Record<string, DetalleVenta[]> = {};
        for (const id of ventaIds) itemsPorVenta[id] = [];
        // `any`: igual que cargarDetalleVenta más abajo — sin tipos generados de
        // Supabase, el join embebido "productos" se infiere mal (array en vez de
        // objeto único) y forzar el tipo correcto sería más frágil que castear.
        for (const d of (detallesRaw ?? []) as any[]) {
            itemsPorVenta[d.venta_id].push({
                nombre: d.productos?.nombre ?? 'Producto eliminado',
                cantidad: d.cantidad,
                precio: d.precio_unitario,
                subtotal: d.subtotal,
                tipo_venta: d.productos?.tipo_venta ?? 'unidad',
                unidad_medida: d.productos?.unidad_medida ?? 'unidad',
            });
        }

        const ventasFormateadas: VentaHistorial[] = (data ?? []).map((v: any) => ({
            id: v.id,
            fecha: new Date(v.fecha),
            total: v.total,
            metodo_pago: v.metodo_pago,
            estado: v.estado,
            arqueo_id: v.arqueo_id,
            fecha_apertura_arqueo: new Date(v.arqueos.fecha_apertura),
            fecha_cierre_arqueo: v.arqueos.fecha_cierre ? new Date(v.arqueos.fecha_cierre) : null,
            resumenItems: resumenDeItems(itemsPorVenta[v.id]),
            descuento: v.descuento,
            editadoEn: v.editado_en ? new Date(v.editado_en) : null,
        }));

        setVentas(ventasFormateadas);
        setDetalles(prev => ({ ...prev, ...itemsPorVenta }));

        // Armar resumen por arqueo
        const { data: arqs } = await supabase
            .from('arqueos')
            .select('*')
            .eq('local_id', localId)
            .order('fecha_apertura', { ascending: false });

        if (arqs) {
            const resumenes: ArqueoResumen[] = arqs.map(a => {
                const ventasArqueo = ventasFormateadas.filter(v => v.arqueo_id === a.id);
                const por_metodo = ventasArqueo.reduce((acc, v) => {
                    acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total;
                    return acc;
                }, {} as Record<string, number>);

                return {
                    id: a.id,
                    fecha_apertura: new Date(a.fecha_apertura),
                    fecha_cierre: a.fecha_cierre ? new Date(a.fecha_cierre) : null,
                    estado: a.estado,
                    total_ventas: ventasArqueo.reduce((acc, v) => acc + v.total, 0),
                    cantidad_ventas: ventasArqueo.length,
                    por_metodo,
                };
            });
            setArqueos(resumenes);
        }

        setCargando(false);
    };

    // Aplicar filtros
    const ventasFiltradas = ventas.filter(v => {
        if (filtros.metodo !== 'todos' && v.metodo_pago !== filtros.metodo) return false;
        if (filtros.arqueo_id !== 'todos' && v.arqueo_id !== filtros.arqueo_id) return false;
        if (filtros.fecha_desde && v.fecha < new Date(filtros.fecha_desde)) return false;
        if (filtros.fecha_hasta && v.fecha > new Date(filtros.fecha_hasta + 'T23:59:59')) return false;
        return true;
    });

    const totalFiltrado = ventasFiltradas.reduce((acc, v) => acc + v.total, 0);

    const porMetodoFiltrado = ventasFiltradas.reduce((acc, v) => {
        acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total;
        return acc;
    }, {} as Record<MetodoPago, number>);


    // Carga el detalle de una venta (bajo demanda, con caché en memoria)
    const cargarDetalleVenta = async (ventaId: string): Promise<DetalleVenta[]> => {
        // Si ya lo trajimos antes, devolvemos el caché
        if (detalles[ventaId]) return detalles[ventaId];

        const { data, error } = await supabase
            .from('detalle_ventas')
            .select(`
                cantidad,
                precio_unitario,
                subtotal,
                productos ( nombre, tipo_venta, unidad_medida )
            `)
            .eq('venta_id', ventaId);

        if (error) { console.error(error); return []; }

        const items: DetalleVenta[] = (data ?? []).map((d: any) => ({
            nombre: d.productos?.nombre ?? 'Producto eliminado',
            cantidad: d.cantidad,
            precio: d.precio_unitario,
            subtotal: d.subtotal,
            tipo_venta: d.productos?.tipo_venta ?? 'unidad',
            unidad_medida: d.productos?.unidad_medida ?? 'unidad',
        }));

        // Guardar en caché
        setDetalles(prev => ({ ...prev, [ventaId]: items }));
        return items;
    };

    // Edita método de pago y descuento de una venta ya registrada, recalculando
    // el total a partir de sus ítems (cache de cargarDetalleVenta/cargarDatos).
    const editarVenta = async (ventaId: string, cambios: { metodo_pago: MetodoPago; descuento: number }): Promise<number> => {
        const items = detalles[ventaId] ?? [];
        const sumaSubtotales = items.reduce((acc, i) => acc + i.subtotal, 0);
        const nuevoTotal = Math.max(0, sumaSubtotales - cambios.descuento);
        const editadoEn = new Date();

        const { error } = await supabase
            .from('ventas')
            .update({
                metodo_pago: cambios.metodo_pago,
                descuento: cambios.descuento,
                total: nuevoTotal,
                editado_en: editadoEn.toISOString(),
            })
            .eq('id', ventaId);

        if (error) throw error;

        setVentas(prev => prev.map(v => v.id === ventaId
            ? { ...v, metodo_pago: cambios.metodo_pago, descuento: cambios.descuento, total: nuevoTotal, editadoEn }
            : v
        ));

        return nuevoTotal;
    };

    return {
        ventas: ventasFiltradas,
        arqueos,
        cargando,
        filtros,
        setFiltros,
        totalFiltrado,
        porMetodoFiltrado,
        recargar: cargarDatos,
        cargarDetalleVenta,
        editarVenta,
    };
};