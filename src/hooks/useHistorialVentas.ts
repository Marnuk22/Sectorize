import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { MetodoPago } from '../types';

export interface VentaHistorial {
    id: string;
    fecha: Date;
    total: number;
    metodo_pago: MetodoPago;
    arqueo_id: string;
    fecha_apertura_arqueo: Date;
    fecha_cierre_arqueo: Date | null;
}

export interface ArqueoResumen {
    id: string;
    fecha_apertura: Date;
    fecha_cierre: Date | null;
    estado: 'abierto' | 'cerrado';
    total_ventas: number;
    cantidad_ventas: number;
    por_metodo: Record<MetodoPago, number>;
}

interface Filtros {
    metodo: MetodoPago | 'todos';
    arqueo_id: string | 'todos';
    fecha_desde: string;
    fecha_hasta: string;
}

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

    useEffect(() => {
        if (!localId) return;
        cargarDatos();
    }, [localId]);

    const cargarDatos = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('ventas')
            .select(`
                id, fecha, total, metodo_pago, arqueo_id,
                arqueos (fecha_apertura, fecha_cierre, estado)
            `)
            .eq('local_id', localId)
            .order('fecha', { ascending: false });

        if (error) { console.error(error); setCargando(false); return; }

        const ventasFormateadas: VentaHistorial[] = (data ?? []).map((v: any) => ({
            id: v.id,
            fecha: new Date(v.fecha),
            total: v.total,
            metodo_pago: v.metodo_pago,
            arqueo_id: v.arqueo_id,
            fecha_apertura_arqueo: new Date(v.arqueos.fecha_apertura),
            fecha_cierre_arqueo: v.arqueos.fecha_cierre ? new Date(v.arqueos.fecha_cierre) : null,
        }));

        setVentas(ventasFormateadas);

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
                }, {} as Record<MetodoPago, number>);

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

    return {
        ventas: ventasFiltradas,
        arqueos,
        cargando,
        filtros,
        setFiltros,
        totalFiltrado,
        porMetodoFiltrado,
        recargar: cargarDatos,
    };
};