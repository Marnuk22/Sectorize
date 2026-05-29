import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { type User } from '@supabase/supabase-js';
import { type Perfil } from '../types';

interface AuthContextType {
    user: User | null;
    perfil: Perfil | null;
    localId: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser]       = useState<User | null>(null);
    const [perfil, setPerfil]   = useState<Perfil | null>(null);
    const [localId, setLocalId] = useState<string | null>(() => {
        try {
            const cached = localStorage.getItem('perfil');
            if (cached) return (JSON.parse(cached) as Perfil).local_id;
        } catch { /* ignorar */ }
        return null;
    });
    const [loading, setLoading] = useState(true);

    const cargarPerfil = async (authUser: User) => {
        setUser(authUser);

        // Aplicar cache inmediatamente si existe
        try {
            const cached = localStorage.getItem('perfil');
            if (cached) {
                const perfilCacheado = JSON.parse(cached) as Perfil;
                setPerfil(perfilCacheado);
                setLocalId(perfilCacheado.local_id);
            }
        } catch { /* ignorar */ }

        // Verificar con DB en segundo plano
        const { data, error } = await supabase
            .from('perfiles')
            .select('local_id, nombre_usuario, rol')
            .eq('id', authUser.id)
            .single();

        if (error) {
            console.warn('Sin perfil:', error.message);
            return;
        }

        if (data) {
            setUser(authUser);
            setPerfil(data as Perfil);
            setLocalId(data.local_id);
            localStorage.setItem('perfil', JSON.stringify(data));
        }
    };

    const limpiarEstado = () => {
        setUser(null);
        setPerfil(null);
        setLocalId(null);
        localStorage.removeItem('perfil');
    };

    useEffect(() => {
        // Verificar sesión existente al arrancar
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                cargarPerfil(session.user).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Escuchar cambios futuros
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (_event === 'INITIAL_SESSION') return;
                if (session) {
                    setLoading(true);
                    await cargarPerfil(session.user);
                    setLoading(false);
                } else {
                    limpiarEstado();
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, perfil, localId, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
};