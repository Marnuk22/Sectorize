import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Socio, Membresia, Suscripcion, SocioConEstado, MetodoPago } from '../types';
import { useVentas } from './VentasContext';

interface AfiliadosContextType {
    socios: SocioConEstado[];
    membresias: Membresia[];
    cargando: boolean;
    agregarSocio: (datos: Omit<Socio, 'id' | 'local_id' | 'creado_at' | 'activo'>) => Promise<void>;
    editarSocio: (id: string, cambios: Partial<Socio>) => Promise<void>;
    borrarSocio: (id: string) => Promise<void>;
    agregarMembresia: (datos: Omit<Membresia, 'id' | 'local_id' | 'creado_at' | 'activo'>) => Promise<void>;
    editarMembresia: (id: string, cambios: Partial<Membresia>) => Promise<void>;
    borrarMembresia: (id: string) => Promise<void>;
    recargar: () => void;
    asignarMembresia: (socioId: string, membresiaId: string, metodoPago: MetodoPago) => Promise<void>;
}

const AfiliadosContext = createContext<AfiliadosContextType | undefined>(undefined);

// Calcula el estado de membresía de un socio según su suscripción activa
const calcularEstado = (
    socio: Socio,
    suscripciones: Suscripcion[],
    membresias: Membresia[]
): SocioConEstado => {
    const subsSocio = suscripciones
        .filter(s => s.socio_id === socio.id && s.estado === 'activa')
        .sort((a, b) => new Date(b.fecha_vencimiento).getTime() - new Date(a.fecha_vencimiento).getTime());

    const suscripcionActiva = subsSocio[0] ?? null;

    if (!suscripcionActiva) {
        return {
            ...socio,
            suscripcionActiva: null,
            membresia: null,
            diasRestantes: null,
            estadoMembresia: 'sin_membresia',
        };
    }

    const membresia = membresias.find(m => m.id === suscripcionActiva.membresia_id) ?? null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(suscripcionActiva.fecha_vencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    let estadoMembresia: SocioConEstado['estadoMembresia'];
    if (diasRestantes < 0) estadoMembresia = 'vencido';
    else if (diasRestantes <= 5) estadoMembresia = 'por_vencer';
    else estadoMembresia = 'al_dia';

    return {
        ...socio,
        suscripcionActiva,
        membresia,
        diasRestantes,
        estadoMembresia,
    };
};

export const AfiliadosProvider = ({ children }: { children: ReactNode }) => {
    const { localId } = useAuth();
    const { registrarVenta } = useVentas();
    const [socios, setSocios] = useState<SocioConEstado[]>([]);
    const [membresias, setMembresias] = useState<Membresia[]>([]);
    const [cargando, setCargando] = useState(true);
    

    const cargarTodo = async (id: string, activo: { current: boolean }) => {
        setCargando(true);
        try {
            const [{ data: sociosDB }, { data: membresiasDB }, { data: suscripcionesDB }] = await Promise.all([
                supabase.from('socios').select('*').eq('local_id', id).order('nombre'),
                supabase.from('membresias').select('*').eq('local_id', id).order('precio'),
                supabase.from('suscripciones').select('*').eq('local_id', id),
            ]);

            if (!activo.current) return;

            const membs = (membresiasDB ?? []) as Membresia[];
            const subs = (suscripcionesDB ?? []) as Suscripcion[];

            setMembresias(membs);
            setSocios((sociosDB ?? []).map(s => calcularEstado(s as Socio, subs, membs)));
        } catch (err) {
            console.error('Error cargando afiliados:', err);
        } finally {
            if (activo.current) setCargando(false);
        }
    };

    useEffect(() => {
        if (!localId) return;
        const activo = { current: true };
        cargarTodo(localId, activo);
        return () => { activo.current = false; };
    }, [localId]);

    const recargar = () => {
        if (localId) cargarTodo(localId, { current: true });
    };

    const agregarSocio = async (datos: Omit<Socio, 'id' | 'local_id' | 'creado_at' | 'activo'>) => {
        const { error } = await supabase.from('socios').insert({ ...datos, local_id: localId });
        if (error) throw error;
        recargar();
    };

    const editarSocio = async (id: string, cambios: Partial<Socio>) => {
        const { error } = await supabase.from('socios').update(cambios).eq('id', id);
        if (error) throw error;
        recargar();
    };

    const borrarSocio = async (id: string) => {
        const { error } = await supabase.from('socios').delete().eq('id', id);
        if (error) throw error;
        recargar();
    };

    const agregarMembresia = async (datos: Omit<Membresia, 'id' | 'local_id' | 'creado_at' | 'activo'>) => {
        const { error } = await supabase.from('membresias').insert({ ...datos, local_id: localId });
        if (error) throw error;
        recargar();
    };

    const editarMembresia = async (id: string, cambios: Partial<Membresia>) => {
        const { error } = await supabase.from('membresias').update(cambios).eq('id', id);
        if (error) throw error;
        recargar();
    };

    const borrarMembresia = async (id: string) => {
        const { error } = await supabase.from('membresias').delete().eq('id', id);
        if (error) throw error;
        recargar();
    };

    const asignarMembresia = async (socioId: string, membresiaId: string, metodoPago: MetodoPago) => {
        const membresia = membresias.find(m => m.id === membresiaId);
        if (!membresia) throw new Error('Membresía no encontrada');

        const socio = socios.find(s => s.id === socioId);
        if (!socio) throw new Error('Socio no encontrado');

        // 1. Cobrar: registrar la venta en el arqueo (mesa virtual)
        const itemVenta = {
            id: membresia.id,
            nombre: `Membresía: ${membresia.nombre}`,
            precio: membresia.precio,
            categoria: 'Membresías',
            cantidad: 1,
            esProductoInventario: false,  // ← marca que NO es producto del inventario
        };
        const mesaVirtual = {   
            id: 'afiliados',
            nombre: socio.nombre,
            estado: 'libre' as const,
            aConfirmar: [],
            pedidos: [itemVenta],
        };

        await registrarVenta([itemVenta], membresia.precio, mesaVirtual, metodoPago);

        // 2. Calcular fecha de inicio y vencimiento
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Si tiene una suscripción vigente, sumar al vencimiento actual (renovación)
        let fechaInicio = hoy;
        if (socio.suscripcionActiva && socio.diasRestantes !== null && socio.diasRestantes >= 0) {
            fechaInicio = new Date(socio.suscripcionActiva.fecha_vencimiento);
        }

        const fechaVencimiento = new Date(fechaInicio);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + membresia.duracion_dias);

        // 3. Marcar suscripciones anteriores como vencidas
        if (socio.suscripcionActiva) {
            await supabase
                .from('suscripciones')
                .update({ estado: 'vencida' })
                .eq('id', socio.suscripcionActiva.id);
        }

        // 4. Crear la nueva suscripción
        const { error } = await supabase.from('suscripciones').insert({
            local_id: localId,
            socio_id: socioId,
            membresia_id: membresiaId,
            fecha_inicio: hoy.toISOString().split('T')[0],
            fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
            estado: 'activa',
        });

        if (error) throw error;
        recargar();
    };

    return (
        <AfiliadosContext.Provider value={{
            socios, membresias, cargando,
            agregarSocio, editarSocio, borrarSocio,
            agregarMembresia, editarMembresia, borrarMembresia,
            recargar, asignarMembresia,
        }}>
            {children}
        </AfiliadosContext.Provider>
    );
};

export const useAfiliados = () => {
    const context = useContext(AfiliadosContext);
    if (!context) throw new Error('useAfiliados debe usarse dentro de AfiliadosProvider');
    return context;
};