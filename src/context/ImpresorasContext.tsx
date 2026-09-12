import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Impresora {
    id: string;
    nombre: string;            // nombre amigable: "Cocina", "Caja"
    nombre_sistema: string;    // nombre real en QZ Tray
    imprime_comandas: boolean;
    imprime_tickets: boolean;
    imprime_etiquetas: boolean;
    // Solo tienen sentido cuando imprime_etiquetas = true (ver migración
    // config_impresora_etiquetas) — determinan cómo se calculan las
    // posiciones en la plantilla ZPL, nunca hardcodeadas.
    dpi: number | null;
    ancho_mm: number | null;
    alto_mm: number | null;
}

interface ImpresorasContextType {
    impresoras: Impresora[];
    cargando: boolean;
    agregarImpresora: (datos: Omit<Impresora, 'id'>) => Promise<void>;
    editarImpresora: (id: string, cambios: Partial<Omit<Impresora, 'id'>>) => Promise<void>;
    borrarImpresora: (id: string) => Promise<void>;
    // Helpers: devuelven las impresoras que deben imprimir cada tipo de documento
    impresorasDeComandas: () => Impresora[];
    impresorasDeTickets: () => Impresora[];
    impresorasDeEtiquetas: () => Impresora[];
}

const ImpresorasContext = createContext<ImpresorasContextType | undefined>(undefined);

export const ImpresorasProvider = ({ children }: { children: ReactNode }) => {
    const { localId } = useAuth();
    const [impresoras, setImpresoras] = useState<Impresora[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!localId) return;
        let activo = true;

        const cargar = async () => {
            setCargando(true);
            try {
                const { data, error } = await supabase
                    .from('impresoras')
                    .select('*')
                    .eq('local_id', localId)
                    .order('creado_at');

                if (!activo) return;
                if (error) throw error;
                setImpresoras((data ?? []) as Impresora[]);
            } catch (err) {
                console.error('Error cargando impresoras:', err);
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargar();
        return () => { activo = false; };
    }, [localId]);

    const recargar = async () => {
        if (!localId) return;
        const { data } = await supabase
            .from('impresoras')
            .select('*')
            .eq('local_id', localId)
            .order('creado_at');
        setImpresoras((data ?? []) as Impresora[]);
    };

    const agregarImpresora = async (datos: Omit<Impresora, 'id'>) => {
        const { error } = await supabase
            .from('impresoras')
            .insert({ ...datos, local_id: localId });
        if (error) throw error;
        await recargar();
    };

    const editarImpresora = async (id: string, cambios: Partial<Omit<Impresora, 'id'>>) => {
        const { error } = await supabase
            .from('impresoras')
            .update(cambios)
            .eq('id', id);
        if (error) throw error;
        await recargar();
    };

    const borrarImpresora = async (id: string) => {
        const { error } = await supabase
            .from('impresoras')
            .delete()
            .eq('id', id);
        if (error) throw error;
        await recargar();
    };

    const impresorasDeComandas = () => impresoras.filter(i => i.imprime_comandas);
    const impresorasDeTickets = () => impresoras.filter(i => i.imprime_tickets);
    const impresorasDeEtiquetas = () => impresoras.filter(i => i.imprime_etiquetas);

    return (
        <ImpresorasContext.Provider value={{
            impresoras, cargando,
            agregarImpresora, editarImpresora, borrarImpresora,
            impresorasDeComandas, impresorasDeTickets, impresorasDeEtiquetas,
        }}>
            {children}
        </ImpresorasContext.Provider>
    );
};

export const useImpresoras = () => {
    const context = useContext(ImpresorasContext);
    if (!context) throw new Error('useImpresoras debe usarse dentro de ImpresorasProvider');
    return context;
};