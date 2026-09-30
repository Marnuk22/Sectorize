import { Banknote, CreditCard, ArrowLeftRight, Wallet, type LucideIcon } from 'lucide-react';

// Métodos base con su presentación predefinida
const METODOS_BASE: Record<string, { label: string; icono: LucideIcon; color: string }> = {
    efectivo:      { label: 'Efectivo',      icono: Banknote,       color: 'bg-green-50 text-green-700' },
    debito:        { label: 'Débito',        icono: CreditCard,     color: 'bg-blue-50 text-blue-700' },
    credito:       { label: 'Crédito',       icono: CreditCard,     color: 'bg-indigo-50 text-indigo-700' },
    // Legado: antes de separar débito/crédito. Queda para las ventas viejas
    // y para los locales que todavía lo tienen habilitado.
    tarjeta:       { label: 'Tarjeta',       icono: CreditCard,     color: 'bg-blue-50 text-blue-700' },
    transferencia: { label: 'Transferencia', icono: ArrowLeftRight, color: 'bg-purple-50 text-purple-700' },
};

// Presentación por defecto para métodos personalizados
const DEFAULT = { icono: Wallet, color: 'bg-gray-50 text-gray-700' };

// Devuelve el label legible de un método (capitaliza los custom)
export const labelMetodo = (metodo: string): string => {
    if (METODOS_BASE[metodo]) return METODOS_BASE[metodo].label;
    return metodo.charAt(0).toUpperCase() + metodo.slice(1);
};

// Devuelve el ícono de un método
export const iconoMetodo = (metodo: string): LucideIcon => {
    return METODOS_BASE[metodo]?.icono ?? DEFAULT.icono;
};

// Devuelve las clases de color de un método
export const colorMetodo = (metodo: string): string => {
    return METODOS_BASE[metodo]?.color ?? DEFAULT.color;
};