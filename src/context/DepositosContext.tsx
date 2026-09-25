import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Deposito } from '../types';

// Depósitos: ubicación extra a nivel NEGOCIO (no de una sucursal puntual),
// ver ROADMAP "Producción/ingredientes + Depósito", Etapa 6. Alta/baja
// dueño-only (RLS lo exige); lectura para cualquiera del negocio.

interface DepositosContextType {
    depositos: Deposito[];
    cargando: boolean;
    crearDeposito: (nombre: string) => Promise<Deposito>;
    borrarDeposito: (id: string) => Promise<void>;
}

const DepositosContext = createContext<DepositosContextType | undefined>(undefined);

export const DepositosProvider = ({ children }: { children: ReactNode }) => {
    const { negocio } = useAuth();
    const [depositos, setDepositos] = useState<Deposito[]>([]);
    const [cargando, setCargando] = useState(true);

    const cargar = async () => {
        if (!negocio?.id) return;
        setCargando(true);
        const { data, error } = await supabase
            .from('depositos')
            .select('*')
            .eq('negocio_id', negocio.id)
            .order('creado_at');
        if (!error) setDepositos((data ?? []) as Deposito[]);
        setCargando(false);
    };

    useEffect(() => {
        if (!negocio?.id) return;
        const ejecutar = () => { cargar(); };
        ejecutar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [negocio?.id]);

    const crearDeposito = async (nombre: string) => {
        const { data, error } = await supabase
            .from('depositos')
            .insert({ nombre, negocio_id: negocio?.id })
            .select()
            .single();
        if (error) throw error;
        setDepositos(prev => [...prev, data as Deposito]);
        return data as Deposito;
    };

    const borrarDeposito = async (id: string) => {
        const { error } = await supabase.from('depositos').delete().eq('id', id);
        if (error) throw error;
        setDepositos(prev => prev.filter(d => d.id !== id));
    };

    return (
        <DepositosContext.Provider value={{ depositos, cargando, crearDeposito, borrarDeposito }}>
            {children}
        </DepositosContext.Provider>
    );
};

export const useDepositos = () => {
    const context = useContext(DepositosContext);
    if (!context) throw new Error('useDepositos debe usarse dentro de DepositosProvider');
    return context;
};
