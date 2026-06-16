// Configuración de unidades de medida para venta a granel
// Concepto: cada unidad tiene un "factor" hacia su unidad base.
// Peso → base gramo. Volumen → base mililitro. Unidad → entero.

export type UnidadMedida = 'unidad' | 'kg' | 'g' | 'l' | 'ml';

interface ConfigUnidad {
    label: string;        // cómo se muestra: "kg", "g", "L"
    factor: number;       // cuántas unidades base equivale (1 kg = 1000 g)
    base: 'g' | 'ml' | 'u'; // a qué grupo pertenece (para no mezclar peso con volumen)
    fraccionable: boolean; // si admite decimales (0.250) o solo enteros
}

export const UNIDADES: Record<UnidadMedida, ConfigUnidad> = {
    unidad: { label: 'unidad', factor: 1,    base: 'u',  fraccionable: false },
    kg:     { label: 'kg',     factor: 1000, base: 'g',  fraccionable: true  },
    g:      { label: 'g',      factor: 1,    base: 'g',  fraccionable: true  },
    l:      { label: 'L',      factor: 1000, base: 'ml', fraccionable: true  },
    ml:     { label: 'ml',     factor: 1,    base: 'ml', fraccionable: true  },
};

// Unidades compatibles para vender, según la unidad en que se cargó el precio.
// Ej: si el precio es por kg, podés vender en kg o en g (ambas base 'g').
export const unidadesCompatibles = (unidadPrecio: UnidadMedida): UnidadMedida[] => {
    const baseObjetivo = UNIDADES[unidadPrecio].base;
    return (Object.keys(UNIDADES) as UnidadMedida[])
        .filter(u => UNIDADES[u].base === baseObjetivo);
};

// Convierte una cantidad de una unidad a otra (dentro de la misma base).
// Ej: convertir(250, 'g', 'kg') => 0.25
export const convertir = (cantidad: number, desde: UnidadMedida, hacia: UnidadMedida): number => {
    if (UNIDADES[desde].base !== UNIDADES[hacia].base) {
        console.warn(`No se puede convertir entre ${desde} y ${hacia} (bases distintas)`);
        return cantidad;
    }
    // Pasar a base, después a la unidad destino
    const enBase = cantidad * UNIDADES[desde].factor;
    return enBase / UNIDADES[hacia].factor;
};

// Calcula el precio de una venta a granel.
// precio: el precio cargado (en unidadPrecio)
// cantidad: cuánto se vende (en unidadVenta)
// Ej: precioGranel(8000, 'kg', 250, 'g') => 2000
//     (almendras a $8000/kg, cliente lleva 250g)
export const precioGranel = (
    precio: number,
    unidadPrecio: UnidadMedida,
    cantidad: number,
    unidadVenta: UnidadMedida
): number => {
    // Convertir la cantidad vendida a la unidad del precio
    const cantidadEnUnidadPrecio = convertir(cantidad, unidadVenta, unidadPrecio);
    return Math.round(precio * cantidadEnUnidadPrecio);
};

// Formatea una cantidad con su unidad para mostrar: "0.250 kg", "3 unidad"
export const formatearCantidad = (cantidad: number, unidad: UnidadMedida): string => {
    const config = UNIDADES[unidad];
    if (!config.fraccionable) {
        return `${cantidad} ${config.label}`;
    }
    // Para fraccionables, mostramos hasta 3 decimales pero sin ceros sobrantes
    const texto = cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 });
    return `${texto} ${config.label}`;
};