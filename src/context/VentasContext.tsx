import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useConexion } from './ConexionContext';
import { encolarVenta, type VentaEncolada } from '../logic/colaVentas';
import type { ItemPedidoUI, MesaUI, MetodoPago, VentaUI, ArqueoUI, MovimientoCajaUI, MotivoRetiro } from '../types';

// Resultado de registrarVenta: el caller (MostradorContext/SalonContext)
// necesita saber si la venta se insertó de verdad o se encoló offline, para
// decidir si recarga el stock desde el servidor o lo descuenta de forma
// optimista en el catálogo local (Etapa 3 del modo offline) — VentasContext
// no puede tocar MenuContext directamente (VentasProvider está afuera de
// MenuProvider, ver CLAUDE.md), así que le devuelve esta info al que llamó.
interface ResultadoVenta {
    offline: boolean;
}

interface VentasContextType {
    historialVentas: VentaUI[];
    arqueoActivo: ArqueoUI | null;
    ArqueosHistorial: ArqueoUI[];
    movimientosCaja: MovimientoCajaUI[];
    MetodosPago: MetodoPago[];
    cargando: boolean;
    registrarVenta: (items: ItemPedidoUI[], total: number, mesa: MesaUI, metodoPago: MetodoPago) => Promise<ResultadoVenta>;
    recargarMovimientosCaja: () => Promise<void>;
    retirarEfectivo: (monto: number, motivoCategoria: MotivoRetiro, nota?: string) => Promise<void>;
    ingresarEfectivo: (monto: number, nota?: string) => Promise<void>;
    abrirArqueo: (montoInicial: number) => Promise<void>;
    cerrarArqueo: (montoFinalReal: number) => Promise<void>;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

const mapMovimiento = (m: any): MovimientoCajaUI => ({
    id: m.id,
    tipo: m.tipo,
    monto: m.monto,
    motivoCategoria: m.motivo_categoria,
    nota: m.nota,
    fecha: new Date(m.creado_at),
});

export const VentasProvider = ({ children }: { children: ReactNode }) => {
    const { localId, user } = useAuth();
    const { online } = useConexion();
    const [historialVentas, setHistorialVentas] = useState<VentaUI[]>([]);
    const [ArqueosHistorial, setArqueosHistorial] = useState<ArqueoUI[]>([]);
    const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCajaUI[]>([]);
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
                        montoFinalEsperado: a.monto_final_esperado,
                        fechaApertura: new Date(a.fecha_apertura),
                        fechaCierre: a.fecha_cierre ? new Date(a.fecha_cierre) : null,
                        estado: a.estado,
                    })));

                    const arqueoAbierto = arqueos.find(a => a.estado === 'abierto');
                    if (arqueoAbierto) {
                        const [{ data: ventas }, { data: movimientos }] = await Promise.all([
                            supabase
                                .from('ventas')
                                .select('*')
                                .eq('arqueo_id', arqueoAbierto.id)
                                .order('fecha', { ascending: false }),
                            supabase
                                .from('movimientos_caja')
                                .select('*')
                                .eq('arqueo_id', arqueoAbierto.id)
                                .order('creado_at', { ascending: false }),
                        ]);

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

                        if (movimientos) {
                            setMovimientosCaja(movimientos.map(mapMovimiento));
                        }
                    } else {
                        // Sin arqueo abierto (ej. se cambió de sucursal): no
                        // dejar movimientos/ventas de una caja vieja visibles.
                        setHistorialVentas([]);
                        setMovimientosCaja([]);
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

    const registrarVenta = async (items: ItemPedidoUI[], total: number, mesa: MesaUI, metodoPago: MetodoPago): Promise<ResultadoVenta> => {
        if (!localId || !user) throw new Error('Sin sesión activa');
        if (!arqueoActivo) throw new Error('No hay arqueo abierto');

        if (!online) {
            // Sin conexión: se encola en vez de insertar. El id se genera
            // acá mismo (no lo asigna Supabase) para que, al reconciliar
            // (Etapa 4), un reintento nunca pueda duplicar la venta.
            const id = crypto.randomUUID();
            const fecha = new Date();
            const ventaEncolada: VentaEncolada = {
                id,
                localId,
                usuarioId: user.id,
                arqueoId: arqueoActivo.id,
                items,
                total,
                metodoPago,
                fecha: fecha.toISOString(),
            };

            try {
                await encolarVenta(ventaEncolada);
            } catch (err) {
                console.error('No se pudo encolar la venta offline:', err);
                throw new Error('No se pudo guardar la venta. Probá de nuevo.');
            }

            setHistorialVentas(prev => [{
                id,
                fecha,
                items,
                total,
                mesa,
                metodoPago,
            }, ...prev]);

            return { offline: true };
        }

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

        return { offline: false };
    };


    const retirarEfectivo = async (monto: number, motivoCategoria: MotivoRetiro, nota?: string) => {
        if (!localId || !user) throw new Error('Sin sesión activa');
        if (!arqueoActivo) throw new Error('No hay arqueo abierto');
        // No se encola (a diferencia de las ventas, Etapa 3): validar que no
        // se retire más de lo que hay en caja depende del saldo REAL en la
        // base (trigger validar_retiro_caja) — offline solo tendríamos un
        // saldo optimista, con el mismo riesgo que el stock si algo falla al
        // reconciliar. Mismo criterio que abrir/cerrar caja.
        if (!online) throw new Error('No se puede retirar efectivo sin conexión.');
        if (monto <= 0) throw new Error('El monto tiene que ser mayor a cero');

        const { data, error } = await supabase
            .from('movimientos_caja')
            .insert({
                local_id: localId,
                arqueo_id: arqueoActivo.id,
                tipo: 'retiro',
                monto,
                motivo_categoria: motivoCategoria,
                nota: nota?.trim() || null,
                usuario_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        setMovimientosCaja(prev => [mapMovimiento(data), ...prev]);
    };

    const ingresarEfectivo = async (monto: number, nota?: string) => {
        if (!localId || !user) throw new Error('Sin sesión activa');
        if (!arqueoActivo) throw new Error('No hay arqueo abierto');
        // Mismo criterio que retirarEfectivo/abrir-cerrar caja: no se encola.
        if (!online) throw new Error('No se puede depositar efectivo sin conexión.');
        if (monto <= 0) throw new Error('El monto tiene que ser mayor a cero');

        const { data, error } = await supabase
            .from('movimientos_caja')
            .insert({
                local_id: localId,
                arqueo_id: arqueoActivo.id,
                tipo: 'deposito',
                monto,
                nota: nota?.trim() || null,
                usuario_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        setMovimientosCaja(prev => [mapMovimiento(data), ...prev]);
    };

    // Se usa después de reconciliar ventas offline (Etapa 4): el trigger
    // `registrar_venta_efectivo_caja` recién dispara cuando el INSERT real
    // en `ventas` pasa (no cuando se encoló), así que "Monto esperado en
    // caja" queda de menos hasta que esto se vuelve a pedir.
    const recargarMovimientosCaja = async () => {
        if (!arqueoActivo) return;
        const { data } = await supabase
            .from('movimientos_caja')
            .select('*')
            .eq('arqueo_id', arqueoActivo.id)
            .order('creado_at', { ascending: false });
        if (data) setMovimientosCaja(data.map(mapMovimiento));
    };

    const abrirArqueo = async (montoInicial: number) => {
        if (!localId || !user) return;
        // Abrir/cerrar caja necesita el registro real en Supabase — no tiene
        // sentido encolarlo (Etapa 3: la cola es solo para ventas).
        if (!online) throw new Error('No se puede abrir la caja sin conexión.');
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
            montoFinalEsperado: null,
            fechaApertura: new Date(data.fecha_apertura),
            fechaCierre: null,
            estado: 'abierto',
        }, ...prev]);

        // El trigger `registrar_apertura_caja` ya insertó la fila 'apertura'
        // en movimientos_caja del lado de la base — se relee para que
        // aparezca en la lista sin duplicar esa lógica acá.
        const { data: movimientos } = await supabase
            .from('movimientos_caja')
            .select('*')
            .eq('arqueo_id', data.id)
            .order('creado_at', { ascending: false });

        setMovimientosCaja(movimientos ? movimientos.map(mapMovimiento) : []);
    };

    const cerrarArqueo = async (montoFinalReal: number) => {
        if (!arqueoActivo) return;
        if (!online) throw new Error('No se puede cerrar la caja sin conexión.');

        // Solo EFECTIVO entra en la caja — tarjeta/transferencia quedan
        // afuera del esperado (antes esto sumaba TODOS los métodos de pago,
        // lo cual era un bug: una venta con tarjeta no pone plata física en
        // el cajón). Se re-consulta la base en vez de confiar en el estado
        // cacheado del cliente, mismo criterio que ya usaba este cierre.
        const [{ data: ventas }, { data: movimientos }] = await Promise.all([
            supabase
                .from('ventas')
                .select('total')
                .eq('arqueo_id', arqueoActivo.id)
                .eq('estado', 'cerrada')
                .eq('metodo_pago', 'efectivo'),
            supabase
                .from('movimientos_caja')
                .select('tipo, monto')
                .eq('arqueo_id', arqueoActivo.id)
                .in('tipo', ['retiro', 'deposito']),
        ]);

        const totalVentasEfectivo = ventas?.reduce((acc, v) => acc + v.total, 0) ?? 0;
        const totalDepositos = movimientos?.filter(m => m.tipo === 'deposito').reduce((acc, m) => acc + m.monto, 0) ?? 0;
        const totalRetiros = movimientos?.filter(m => m.tipo === 'retiro').reduce((acc, m) => acc + m.monto, 0) ?? 0;
        const montoEsperado = arqueoActivo.montoInicial + totalVentasEfectivo + totalDepositos - totalRetiros;

        const { data, error } = await supabase
            .from('arqueos')
            .update({
                estado: 'cerrado',
                monto_final_real: montoFinalReal,
                monto_final_esperado: montoEsperado,
                fecha_cierre: new Date().toISOString(),
            })
            .eq('id', arqueoActivo.id)
            .select()
            .maybeSingle();

        if (error) throw error;
        // Un UPDATE bloqueado por RLS no es un error de Postgres (0 filas
        // afectadas es "éxito" para la sintaxis) — sin este chequeo, un
        // permiso insuficiente se ve en pantalla como "caja cerrada" cuando
        // en la base sigue abierta.
        if (!data) throw new Error('No se pudo cerrar la caja (sin permiso)');

        setArqueosHistorial(prev => prev.map(a =>
            a.id === arqueoActivo.id
                ? { ...a, montoFinalReal, montoFinalEsperado: montoEsperado, fechaCierre: new Date(), estado: 'cerrado' as const }
                : a
        ));
        setHistorialVentas([]);
        setMovimientosCaja([]);
    };

    return (
        <VentasContext.Provider value={{
            historialVentas,
            arqueoActivo,
            ArqueosHistorial,
            movimientosCaja,
            MetodosPago: ['efectivo', 'tarjeta', 'transferencia', 'otro'],
            cargando,
            registrarVenta,
            recargarMovimientosCaja,
            abrirArqueo,
            cerrarArqueo,
            retirarEfectivo,
            ingresarEfectivo,
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