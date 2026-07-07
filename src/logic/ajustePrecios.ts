export type TipoAjuste = 'porcentaje' | 'monto';
export type TipoRedondeo = 'ninguno' | 'decena' | 'centena' | 'entero';

// Calcula el precio nuevo aplicando el ajuste y el redondeo
export const calcularPrecioNuevo = (
    precioActual: number,
    tipoAjuste: TipoAjuste,
    valor: number,
    redondeo: TipoRedondeo
): number => {
    // 1. Aplicar el ajuste
    let nuevo: number;
    if (tipoAjuste === 'porcentaje') {
        nuevo = precioActual * (1 + valor / 100);
    } else {
        nuevo = precioActual + valor;
    }

    // No permitir precios negativos
    if (nuevo < 0) nuevo = 0;

    // 2. Aplicar el redondeo
    switch (redondeo) {
        case 'entero':
            nuevo = Math.round(nuevo);
            break;
        case 'decena':
            nuevo = Math.round(nuevo / 10) * 10;
            break;
        case 'centena':
            nuevo = Math.round(nuevo / 100) * 100;
            break;
        case 'ninguno':
        default:
            // Redondear a 2 decimales para evitar cosas como 1344.9999
            nuevo = Math.round(nuevo * 100) / 100;
            break;
    }

    return nuevo;
};  