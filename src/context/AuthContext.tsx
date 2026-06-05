import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { type User } from '@supabase/supabase-js';
import { type Perfil, type Local } from '../types';

interface AuthContextType {
    user: User | null;
    perfil: Perfil | null;
    local: Local | null;
    localId: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
    actualizarLocal: (cambios: Partial<Local>) => Promise<void>;
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

    const [localId, setLocalId] = useState<string | null>(() => {
        try {
            const cached = localStorage.getItem('perfil');
            return cached ? (JSON.parse(cached) as Perfil).local_id : null;
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
                .select('local_id, nombre_usuario, rol')
                .eq('id', authUser.id)
                .single();

            if (error) throw error;

            if (data) {
                console.log("✅ [Auth] Perfil obtenido con éxito:", data.local_id);
                setPerfil(data as Perfil);
                setLocalId(data.local_id);
                localStorage.setItem('perfil', JSON.stringify(data));
                localStorage.setItem('vallis_user', JSON.stringify(authUser));

                if (data.local_id) {
                    const { data: localData, error: localError } = await supabase
                        .from('locales')
                        .select('*')
                        .eq('id', data.local_id)
                        .single();

                    if (!localError && localData) {
                        console.log("🏪 [Auth] Local obtenido:", localData.nombre, localData.modulos);
                        setLocal(localData as Local);
                        localStorage.setItem('local', JSON.stringify(localData));
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

    const limpiarEstado = () => {
        console.log("🧹 [Auth] Ejecutando limpieza total de estados y localStorage...");
        setUser(null);
        setPerfil(null);
        setLocal(null);
        setLocalId(null);
        localStorage.removeItem('perfil');
        localStorage.removeItem('vallis_user');
        localStorage.removeItem('local');
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

    return (
        <AuthContext.Provider value={{ user, perfil, local, localId, loading, signOut, actualizarLocal }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
};