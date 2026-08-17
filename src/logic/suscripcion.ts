import type { Negocio } from '../types';

export const DIAS_GRACIA = 3;

// Flag para desactivar el bloqueo mientras se prueba. Poner en false y listo.
export const BLOQUEO_ACTIVO = true;

export type EstadoAcceso = 'ok' | 'gracia' | 'bloqueado';

const MS_DIA = 1000 * 60 * 60 * 24;

// Qué fecha manda para cada estado
const fechaReferencia = (negocio: Negocio): string | null => {
    if (negocio.suscripcion_estado === 'activa') return negocio.suscripcion_vence;
    if (negocio.suscripcion_estado === 'prueba') return negocio.prueba_vence;
    return negocio.suscripcion_vence; // vencida / cancelada: la fecha de prueba ya no aplica
};

const evaluarVencimiento = (fechaVencimiento: string): EstadoAcceso => {
    const vence = new Date(fechaVencimiento).getTime();
    const ahora = Date.now();
    if (ahora <= vence) return 'ok';
    const limiteGracia = vence + DIAS_GRACIA * MS_DIA;
    return ahora <= limiteGracia ? 'gracia' : 'bloqueado';
};

export const estadoAcceso = (negocio: Negocio | null): EstadoAcceso => {
    if (!negocio) return 'ok'; // sin datos todavía, no bloquear por las dudas
    const fecha = fechaReferencia(negocio);
    if (!fecha) {
        // vencida/cancelada sin fecha (dato viejo/manual): bloquear directo, sin gracia
        const esTerminal = negocio.suscripcion_estado === 'vencida' || negocio.suscripcion_estado === 'cancelada';
        return esTerminal ? 'bloqueado' : 'ok';
    }
    return evaluarVencimiento(fecha);
};

// Días de gracia que quedan antes del bloqueo definitivo (para el banner)
export const diasGraciaRestantes = (negocio: Negocio | null): number => {
    if (!negocio) return 0;
    const fecha = fechaReferencia(negocio);
    if (!fecha) return 0;
    const limite = new Date(fecha).getTime() + DIAS_GRACIA * MS_DIA;
    return Math.max(0, Math.ceil((limite - Date.now()) / MS_DIA));
};
