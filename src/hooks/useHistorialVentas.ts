import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { calcularVenta } from '../logic/venta';
import type { DescuentoVenta, EstadoVenta, MetodoPago, TipoDescuento } from '../types';

export interface VentaHistorial {
    id: string;
    local_id: string;
    fecha: Date;
    total: number;
    metodo_pago: MetodoPago;
    estado: EstadoVenta;
    arqueo_id: string;
    fecha_apertura_arqueo: Date;
    fecha_cierre_arqueo: Date | null;
    resumenItems: string;
    descuento: number;
    descuentoTipo: TipoDescuento;
    descuentoValor: number;
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

// Datos propios de la fila de `arqueos`, sin el resumen: los totales se
// derivan de las ventas vivas (ver useMemo más abajo) para que editar una
// venta se refleje en su arqueo sin recargar la página.
interface ArqueoBase {
    id: string;
    fecha_apertura: Date;
    fecha_cierre: Date | null;
    estado: 'abierto' | 'cerrado';
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

// PostgREST corta cada respuesta en 1000 filas (max-rows de Supabase): las
// ventas se piden por páginas de ese tamaño hasta traerlas todas.
const TAMAÑO_PAGINA = 1000;

// El detalle va embebido en la misma consulta de ventas. Antes se pedía
// aparte con .in('venta_id', [todos los ids]) y, pasadas ~680 ventas, la URL
// superaba el límite del gateway (400 Bad Request) y como el error no se
// miraba, todas las ventas aparecían "Sin productos" (Karamelon, 2026-10-06).
const SELECT_VENTAS = `
    id, local_id, fecha, total, metodo_pago, estado, arqueo_id, descuento, descuento_tipo, descuento_valor, editado_en,
    arqueos (fecha_apertura, fecha_cierre, estado),
    detalle_ventas (cantidad, precio_unitario, subtotal, productos (nombre, tipo_venta, unidad_medida))
`;

// `any`: sin tipos generados de Supabase, el join embebido "productos" se
// infiere mal (array en vez de objeto único) y forzar el tipo correcto sería
// más frágil que castear.
const aDetalle = (d: any): DetalleVenta => ({
    nombre: d.productos?.nombre ?? 'Producto eliminado',
    cantidad: d.cantidad,
    precio: d.precio_unitario,
    subtotal: d.subtotal,
    tipo_venta: d.productos?.tipo_venta ?? 'unidad',
    unidad_medida: d.productos?.unidad_medida ?? 'unidad',
});

// Texto corto para la fila de la lista, ej. "Cerveza x2, Papas x1 +2"
const resumenDeItems = (items: DetalleVenta[]): string => {
    if (items.length === 0) return 'Sin productos';
    const visibles = items.slice(0, 2).map(i => `${i.nombre} x${fmtCantidad(i.cantidad)}`);
    const resto = items.length > 2 ? ` +${items.length - 2}` : '';
    return visibles.join(', ') + resto;
};

interface OpcionesHistorial {
    // Arranca mostrando todas las sucursales del negocio en vez de solo la
    // activa (Informe la usa así; Historial no la pasa, sigue como siempre).
    consolidarPorDefecto?: boolean;
}

export const useHistorialVentas = (opciones: OpcionesHistorial = {}) => {
    const { localId, sucursales } = useAuth();
    const [ventas, setVentas] = useState<VentaHistorial[]>([]);
    const [arqueosBase, setArqueosBase] = useState<ArqueoBase[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState('');
    const [filtros, setFiltros] = useState<Filtros>({
        metodo: 'todos',
        arqueo_id: 'todos',
        fecha_desde: '',
        fecha_hasta: '',
    });
    const [detalles, setDetalles] = useState<Record<string, DetalleVenta[]>>({});

    // 'todas' consolida las sucursales del negocio (dueño); un local_id puntual
    // filtra a una sola. Con 1 sola sucursal esto no cambia nada (siempre localId).
    const [sucursalFiltro, setSucursalFiltro] = useState<string>(opciones.consolidarPorDefecto ? 'todas' : 'propia');

    useEffect(() => {
        if (!localId) return;
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localId, sucursalFiltro, sucursales.length]);

    const cargarDatos = async () => {
        setCargando(true);
        setErrorCarga('');

        const idsSucursales = sucursalFiltro === 'todas' && sucursales.length > 1
            ? sucursales.map(s => s.id)
            : null;

        const data: any[] = [];
        for (let desde = 0; ; desde += TAMAÑO_PAGINA) {
            let queryVentas = supabase
                .from('ventas')
                .select(SELECT_VENTAS)
                // id como desempate: el orden tiene que ser estable entre páginas
                .order('fecha', { ascending: false })
                .order('id', { ascending: false })
                .range(desde, desde + TAMAÑO_PAGINA - 1);
            queryVentas = idsSucursales ? queryVentas.in('local_id', idsSucursales) : queryVentas.eq('local_id', localId);

            const { data: pagina, error } = await queryVentas;
            if (error) {
                // No mostrar un historial a medias como si estuviera completo.
                console.error(error);
                setErrorCarga('No se pudo cargar el historial de ventas. Probá recargar.');
                setVentas([]);
                setCargando(false);
                return;
            }
            data.push(...(pagina ?? []));
            if (!pagina || pagina.length < TAMAÑO_PAGINA) break;
        }

        // Ítems de cada venta, para el preview de cada fila y para precalentar
        // el cache de cargarDetalleVenta.
        const itemsPorVenta: Record<string, DetalleVenta[]> = {};
        for (const v of data) itemsPorVenta[v.id] = (v.detalle_ventas ?? []).map(aDetalle);

        const ventasFormateadas: VentaHistorial[] = data.map((v: any) => ({
            id: v.id,
            local_id: v.local_id,
            fecha: new Date(v.fecha),
            total: v.total,
            metodo_pago: v.metodo_pago,
            estado: v.estado,
            arqueo_id: v.arqueo_id,
            fecha_apertura_arqueo: new Date(v.arqueos.fecha_apertura),
            fecha_cierre_arqueo: v.arqueos.fecha_cierre ? new Date(v.arqueos.fecha_cierre) : null,
            resumenItems: resumenDeItems(itemsPorVenta[v.id]),
            descuento: v.descuento,
            // Fallback para las filas cargadas antes de que existieran las
            // columnas (todas quedan como monto fijo).
            descuentoTipo: (v.descuento_tipo ?? 'monto') as TipoDescuento,
            descuentoValor: v.descuento_valor ?? 0,
            editadoEn: v.editado_en ? new Date(v.editado_en) : null,
        }));

        setVentas(ventasFormateadas);
        setDetalles(prev => ({ ...prev, ...itemsPorVenta }));

        // Armar resumen por arqueo
        let queryArqueos = supabase.from('arqueos').select('*').order('fecha_apertura', { ascending: false });
        queryArqueos = idsSucursales ? queryArqueos.in('local_id', idsSucursales) : queryArqueos.eq('local_id', localId);
        const { data: arqs } = await queryArqueos;

        if (arqs) {
            setArqueosBase(arqs.map(a => ({
                id: a.id,
                fecha_apertura: new Date(a.fecha_apertura),
                fecha_cierre: a.fecha_cierre ? new Date(a.fecha_cierre) : null,
                estado: a.estado,
            })));
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

    // Resumen por arqueo derivado de las ventas vivas (cuenta TODAS las ventas
    // del arqueo, no las filtradas). Al editar una venta, editarVenta actualiza
    // `ventas` y este useMemo recalcula solo: el arqueo se ve al día sin
    // recargar. Antes era estado aparte y quedaba viejo hasta refrescar.
    const arqueos: ArqueoResumen[] = useMemo(() => arqueosBase.map(a => {
        const ventasArqueo = ventas.filter(v => v.arqueo_id === a.id);
        const por_metodo = ventasArqueo.reduce((acc, v) => {
            acc[v.metodo_pago] = (acc[v.metodo_pago] ?? 0) + v.total;
            return acc;
        }, {} as Record<string, number>);

        return {
            id: a.id,
            fecha_apertura: a.fecha_apertura,
            fecha_cierre: a.fecha_cierre,
            estado: a.estado,
            total_ventas: ventasArqueo.reduce((acc, v) => acc + v.total, 0),
            cantidad_ventas: ventasArqueo.length,
            por_metodo,
        };
    }), [arqueosBase, ventas]);


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

        const items: DetalleVenta[] = (data ?? []).map(aDetalle);

        // Guardar en caché
        setDetalles(prev => ({ ...prev, [ventaId]: items }));
        return items;
    };

    // Edita método de pago y descuento de una venta ya registrada. El total se
    // recalcula con el mismo calcularVenta que usa el POS, nunca a mano acá:
    // así el invariante total = Σ subtotales − descuento se mantiene. Solo se
    // llama con ventas del arqueo abierto (ver puedeEditar en HistorialVentas).
    const editarVenta = async (ventaId: string, cambios: { metodo_pago: MetodoPago; descuento: DescuentoVenta }): Promise<number> => {
        const items = detalles[ventaId] ?? [];
        // Sin detalle no hay subtotal: recalcular daría total 0.
        if (items.length === 0) throw new Error('Todavía no cargó el detalle de la venta. Probá de nuevo.');
        const { descuentoMonto, total: nuevoTotal } = calcularVenta(items, cambios.descuento);
        const editadoEn = new Date();

        const { data, error } = await supabase
            .from('ventas')
            .update({
                metodo_pago: cambios.metodo_pago,
                descuento: descuentoMonto,
                descuento_tipo: cambios.descuento.tipo,
                descuento_valor: cambios.descuento.valor,
                total: nuevoTotal,
                editado_en: editadoEn.toISOString(),
            })
            .eq('id', ventaId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('No se pudo editar la venta (sin permiso)');

        setVentas(prev => prev.map(v => v.id === ventaId
            ? {
                ...v,
                metodo_pago: cambios.metodo_pago,
                descuento: descuentoMonto,
                descuentoTipo: cambios.descuento.tipo,
                descuentoValor: cambios.descuento.valor,
                total: nuevoTotal,
                editadoEn,
            }
            : v
        ));

        return nuevoTotal;
    };

    return {
        ventas: ventasFiltradas,
        arqueos,
        cargando,
        errorCarga,
        filtros,
        setFiltros,
        sucursalFiltro,
        setSucursalFiltro,
        totalFiltrado,
        porMetodoFiltrado,
        recargar: cargarDatos,
        cargarDetalleVenta,
        editarVenta,
    };
};