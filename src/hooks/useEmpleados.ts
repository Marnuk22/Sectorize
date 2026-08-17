import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type RolEmpleado = 'encargado' | 'empleado';

export interface EmpleadoUI {
    id: string;
    nombre_usuario: string;
    rol: RolEmpleado;
    local_id: string;
    sucursal_nombre: string;
    activo: boolean;
}

interface DatosCrear {
    nombre_usuario: string;
    email: string;
    password: string;
    rol: RolEmpleado;
    local_id: string;
}

interface DatosEditar {
    nombre_usuario: string;
    rol: RolEmpleado;
    local_id: string;
}

const urlFuncion = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gestionar-empleado`;

// Alta/baja/reactivación/restablecer contraseña pegan a la Edge Function
// `gestionar-empleado` (requieren la API admin de Supabase Auth, no se
// pueden hacer con el anon key). Editar nombre/rol/sucursal es un UPDATE
// directo a `perfiles`, habilitado por la policy "dueño edita perfiles de
// su negocio" de la Etapa 7.
export const useEmpleados = () => {
    const { negocio, sucursales } = useAuth();
    const [empleados, setEmpleados] = useState<EmpleadoUI[]>([]);
    const [cargando, setCargando] = useState(true);

    const cargar = async () => {
        if (!negocio) { setCargando(false); return; }
        setCargando(true);

        const { data, error } = await supabase
            .from('perfiles')
            .select('id, nombre_usuario, rol, local_id, activo')
            .eq('negocio_id', negocio.id)
            .neq('rol', 'dueño')
            .order('nombre_usuario');

        if (!error && data) {
            setEmpleados(data.map(p => ({
                id: p.id,
                nombre_usuario: p.nombre_usuario,
                rol: p.rol as RolEmpleado,
                local_id: p.local_id as string,
                sucursal_nombre: sucursales.find(s => s.id === p.local_id)?.nombre ?? 'Sucursal',
                activo: p.activo,
            })));
        }
        setCargando(false);
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [negocio?.id, sucursales.length]);

    const llamarFuncion = async (body: Record<string, unknown>) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No hay sesión activa');

        const res = await fetch(urlFuncion, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const respuesta = await res.json();
        if (!res.ok) throw new Error(respuesta.error ?? 'Ocurrió un error');
        return respuesta;
    };

    const crear = async (datos: DatosCrear) => {
        await llamarFuncion({ accion: 'crear', ...datos });
        await cargar();
    };

    const editar = async (id: string, datos: DatosEditar) => {
        const { error } = await supabase.from('perfiles').update(datos).eq('id', id);
        if (error) throw error;
        await cargar();
    };

    const desactivar = async (id: string) => {
        await llamarFuncion({ accion: 'desactivar', perfil_id: id });
        await cargar();
    };

    const reactivar = async (id: string) => {
        await llamarFuncion({ accion: 'reactivar', perfil_id: id });
        await cargar();
    };

    const restablecerPassword = async (id: string, password: string) => {
        await llamarFuncion({ accion: 'restablecer_password', perfil_id: id, password });
    };

    return { empleados, cargando, crear, editar, desactivar, reactivar, restablecerPassword, recargar: cargar };
};
