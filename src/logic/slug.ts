// Convierte el nombre de un local en un slug para la URL del catálogo.
// "Verdulería La Esquina" → "verduleria-la-esquina"
// "Doña Rosa & Cía." → "dona-rosa-cia"
export const generarSlug = (texto: string): string => {
    return texto
        .normalize('NFD')                    // separa las letras de sus acentos
        .replace(/[\u0300-\u036f]/g, '')     // borra los acentos (í → i, ñ → n)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')        // fuera todo lo que no sea letra, número, espacio o guion
        .replace(/[\s-]+/g, '-')             // espacios y guiones repetidos → un solo guion
        .replace(/^-+|-+$/g, '');            // sin guiones al principio ni al final
};

// Valida que un slug tenga el formato correcto (el mismo CHECK que pusimos en la base)
export const slugValido = (slug: string): boolean => {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 40;
};