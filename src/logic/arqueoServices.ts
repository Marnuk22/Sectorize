// src/logic/arqueoServices.ts
//
// Lógica pura de arqueo — sin Supabase, solo transforma números ya cargados
// en memoria. Compartida entre el arqueo en curso (ContenedorArqueo) y el
// historial de cierres pasados (HistorialArqueos) para que ambos apliquen
// exactamente el mismo criterio de color.

// Margen de redondeo chico: una diferencia dentro de este rango se considera
// "cuadró" en vez de un faltante/sobrante real.
export const TOLERANCIA_ARQUEO = 1;

export type EstadoDiferencia = 'cuadro' | 'falto' | 'sobro';

export const clasificarDiferencia = (diferencia: number): EstadoDiferencia => {
    if (Math.abs(diferencia) <= TOLERANCIA_ARQUEO) return 'cuadro';
    return diferencia < 0 ? 'falto' : 'sobro';
};
