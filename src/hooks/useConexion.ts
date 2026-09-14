import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Detecta si hay conexión REAL a Supabase — navigator.onLine solo no
// alcanza, puede marcar "online" con wifi conectado pero sin internet real
// (el caso típico de un corte de proveedor con el router todavía andando).
const INTERVALO_MS = 15000;
const TIMEOUT_MS = 6000;

export const useConexion = () => {
    const [online, setOnline] = useState(true);
    const controllerRef = useRef<AbortController | null>(null);
    const montadoRef = useRef(true);

    const verificar = useCallback(async () => {
        // Ping solapado: si había uno en vuelo, se cancela — el más nuevo manda.
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        let resultado: boolean;
        try {
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
            // HEAD + count exact: no baja filas, mínimo tráfico. Sirve como
            // ping independiente del rol/tenant — si el request llega y
            // responde (aunque RLS devuelva 0 filas) hay conexión real.
            const { error } = await supabase
                .from('locales')
                .select('id', { count: 'exact', head: true })
                .limit(1)
                .abortSignal(controller.signal);
            clearTimeout(timeoutId);
            resultado = !error;
        } catch {
            // Cualquier excepción (falla de red real, o el AbortError del
            // abort propio/timeout) = sin conexión. Nunca se propaga.
            resultado = false;
        }

        // Descarta el resultado si el componente ya se desmontó, o si este
        // ping ya no es el más reciente (uno más nuevo lo reemplazó antes de
        // terminar) — nunca deja que un ping viejo pise el estado de uno nuevo.
        if (!montadoRef.current || controllerRef.current !== controller) return;
        setOnline(resultado);
    }, []);

    useEffect(() => {
        montadoRef.current = true;
        verificar(); // chequeo inicial

        const intervalo = setInterval(verificar, INTERVALO_MS);

        // navigator.onLine no alcanza solo, pero sirve para reaccionar más
        // rápido: apenas el SO dice que no hay red, no hace falta esperar un
        // timeout para marcar offline; y cuando vuelve, forzamos un ping
        // real en vez de asumir que ya hay internet de nuevo.
        const handleOffline = () => {
            controllerRef.current?.abort();
            setOnline(false);
        };
        const handleOnline = () => verificar();
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            montadoRef.current = false;
            clearInterval(intervalo);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            controllerRef.current?.abort();
        };
    }, [verificar]);

    return { online };
};
