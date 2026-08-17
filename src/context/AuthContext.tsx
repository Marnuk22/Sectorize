import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { type User } from '@supabase/supabase-js';
import { type Perfil, type Local, type Negocio } from '../types';

interface AuthContextType {
    user: User | null;
    perfil: Perfil | null;
    local: Local | null;
    negocio: Negocio | null;
    sucursales: Local[];
    localId: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
    actualizarLocal: (cambios: Partial<Local>) => Promise<void>;
    cambiarSucursal: (id: string) => void;
    refrescar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const cachedUser = localStorage.getItem('vallis_user');
            return cachedUser ? JSON.parse(cachedUser) as User : null;
        } catch { return null; }
    });

    const [perfil, setPerfil] = useState<Perfil | null>(() => {
        try {
            const cached = localStorage.getItem('perfil');
            return cached ? JSON.parse(cached) as Perfil : null;
        } catch { return null; }
    });

    const [local, setLocal] = useState<Local | null>(() => {
        try {
            const cached = localStorage.getItem('local');
            return cached ? JSON.parse(cached) as Local : null;
        } catch { return null; }
    });

    const [negocio, setNegocio] = useState<Negocio | null>(() => {
        try {
            const cached = localStorage.getItem('negocio');
            return cached ? JSON.parse(cached) as Negocio : null;
        } catch { return null; }
    });

    const [sucursales, setSucursales] = useState<Local[]>(() => {
        try {
            const cached = localStorage.getItem('sucursales');
            return cached ? JSON.parse(cached) as Local[] : [];
        } catch { return []; }
    });

    const [localId, setLocalId] = useState<string | null>(() => {
        try {
            // La sucursal activa cacheada (que puede diferir de la propia si
            // el dueño cambió de sucursal antes de recargar) manda sobre la
            // propia del perfil, para no desincronizar `local` y `localId`
            // en el primer render.
            const cachedLocal = localStorage.getItem('local');
            if (cachedLocal) return (JSON.parse(cachedLocal) as Local).id;
            const cachedPerfil = localStorage.getItem('perfil');
            return cachedPerfil ? (JSON.parse(cachedPerfil) as Perfil).local_id : null;
        } catch { return null; }
    });

    const [loading, setLoading] = useState(() => {
        const hasUser = localStorage.getItem('vallis_user');
        const hasPerfil = localStorage.getItem('perfil');
        console.log("🔒 [Auth] Estado inicial Caché detectado:", { hasUser: !!hasUser, hasPerfil: !!hasPerfil });
        return !(hasUser && hasPerfil);
    });

    const cargarPerfil = async (authUser: User) => {
        console.log("📡 [Auth] Buscando perfil en DB para el usuario:", authUser.id);
        try {
            const { data, error } = await supabase
                .from('perfiles')
                .select('local_id, nombre_usuario, rol, negocio_id')
                .eq('id', authUser.id)
                .single();

            if (error) throw error;

            if (data) {
                console.log("✅ [Auth] Perfil obtenido con éxito:", data.local_id);
                setPerfil(data as Perfil);
                localStorage.setItem('perfil', JSON.stringify(data));
                localStorage.setItem('vallis_user', JSON.stringify(authUser));

                if (data.negocio_id) {
                    // sucursales_del_usuario() (RLS) ya devuelve todas las del negocio
                    // si es dueño, o solo la propia si es encargado/empleado.
                    const { data: sucursalesData, error: sucursalesError } = await supabase
                        .from('locales')
                        .select('*')
                        .eq('negocio_id', data.negocio_id);

                    if (!sucursalesError && sucursalesData && sucursalesData.length > 0) {
                        setSucursales(sucursalesData as Local[]);
                        localStorage.setItem('sucursales', JSON.stringify(sucursalesData));

                        const guardada = localStorage.getItem('sucursalActivaId');
                        const activa =
                            sucursalesData.find(l => l.id === guardada) ??
                            sucursalesData.find(l => l.id === data.local_id) ??
                            sucursalesData[0];

                        console.log("🏪 [Auth] Sucursal activa:", activa.nombre, activa.modulos);
                        setLocal(activa as Local);
                        setLocalId(activa.id);
                        localStorage.setItem('local', JSON.stringify(activa));
                        localStorage.setItem('sucursalActivaId', activa.id);

                        const { data: negocioData, error: negocioError } = await supabase
                            .from('negocios')
                            .select('*')
                            .eq('id', activa.negocio_id)
                            .single();

                        if (!negocioError && negocioData) {
                            setNegocio(negocioData as Negocio);
                            localStorage.setItem('negocio', JSON.stringify(negocioData));
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('⚠️ [Auth] Error en DB, manteniendo caché si existe:', err);
        } finally {
            setLoading(false);
        }
    };

    // Actualiza campos del local en DB y refresca estado + cache
    const actualizarLocal = async (cambios: Partial<Local>) => {
        if (!localId) throw new Error('No hay local activo');

        const { data, error } = await supabase
            .from('locales')
            .update(cambios)
            .eq('id', localId)
            .select()
            .single();

        if (error) throw error;

        if (data) {
            setLocal(data as Local);
            localStorage.setItem('local', JSON.stringify(data));
        }
    };

    // Cambia la sucursal activa entre las del propio negocio, sin pegarle a
    // la red (ya tenemos las filas completas cacheadas en `sucursales`).
    const cambiarSucursal = (id: string) => {
        const encontrada = sucursales.find(s => s.id === id);
        if (!encontrada) return;
        setLocal(encontrada);
        setLocalId(id);
        localStorage.setItem('local', JSON.stringify(encontrada));
        localStorage.setItem('sucursalActivaId', id);
    };

    const limpiarEstado = () => {
        console.log("🧹 [Auth] Ejecutando limpieza total de estados y localStorage...");
        setUser(null);
        setPerfil(null);
        setLocal(null);
        setNegocio(null);
        setSucursales([]);
        setLocalId(null);
        localStorage.removeItem('perfil');
        localStorage.removeItem('vallis_user');
        localStorage.removeItem('local');
        localStorage.removeItem('negocio');
        localStorage.removeItem('sucursales');
        localStorage.removeItem('sucursalActivaId');
    };

    useEffect(() => {
        console.log("🚀 [Auth] Inicializando AuthProvider Listener...");

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log(`🔄 [Auth Event] Supabase dice: ${event}`, { sessionPresent: !!session });

                if (session) {
                    setUser(session.user);
                    localStorage.setItem('vallis_user', JSON.stringify(session.user));
                    setTimeout(() => {
                        cargarPerfil(session.user);
                    }, 0);
                } else if (event === 'SIGNED_OUT') {
                    limpiarEstado();
                    setLoading(false);
                }
            }
        );

        const fallbackTimer = setTimeout(() => {
            if (loading) {
                console.log("⏱️ [Auth] Fallback activado. Liberando UI con datos locales.");
                setLoading(false);
            }
        }, 1200);

        return () => {
            subscription.unsubscribe();
            clearTimeout(fallbackTimer);
        };
    }, []);

    const signOut = async () => {
        console.log("🚪 [Auth] Cerrando sesión...");
        setLoading(true);
        await supabase.auth.signOut();
        limpiarEstado();
        setLoading(false);
    };

    const refrescar = async () => {
        if (user) {
            await cargarPerfil(user);
        } else {
            const { data } = await supabase.auth.getUser();
            if (data.user) await cargarPerfil(data.user);
        }
    };

    return (
        <AuthContext.Provider value={{ user, perfil, local, negocio, sucursales, localId, loading, signOut, actualizarLocal, cambiarSucursal, refrescar }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
};