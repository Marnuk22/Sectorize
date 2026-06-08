import { LayoutGrid, Package, DollarSign, Calculator, ShoppingCart, Users, type LucideIcon } from 'lucide-react';

export type ModuloId = 'salon' | 'mostrador' | 'suscripciones' | 'inventario' | 'ventas' | 'arqueos';

export interface ModuloConfig {
    id:          ModuloId;
    nombre:      string;
    descripcion: string;
    icono:       LucideIcon;
    esNucleo:    boolean; // true = lo tienen todos los locales
}

// Definición de todos los módulos disponibles
export const MODULOS: Record<ModuloId, ModuloConfig> = {
    inventario: {
        id: 'inventario',
        nombre: 'Inventario',
        descripcion: 'Gestión de productos y stock',
        icono: Package,
        esNucleo: true,
    },
    ventas: {
        id: 'ventas',
        nombre: 'Ventas',
        descripcion: 'Registro de ventas e historial',
        icono: DollarSign,
        esNucleo: true,
    },
    arqueos: {
        id: 'arqueos',
        nombre: 'Arqueos',
        descripcion: 'Control de caja',
        icono: Calculator,
        esNucleo: true,
    },
    salon: {
        id: 'salon',
        nombre: 'Salón',
        descripcion: 'Sectores, mesas y pedidos',
        icono: LayoutGrid,
        esNucleo: false,
    },
    mostrador: {
        id: 'mostrador',
        nombre: 'Venta rápida',
        descripcion: 'Cobro directo sin mesas',
        icono: ShoppingCart,
        esNucleo: false,
    },
    suscripciones: {
        id: 'suscripciones',
        nombre: 'Afiliados',
        descripcion: 'Membresías y asistencias',
        icono: Users,
        esNucleo: false,
    },
};

// Tipos de negocio → qué módulos arrancan activos
export type TipoNegocio = 'restaurante' | 'tienda' | 'servicios';

export const NEGOCIOS: Record<TipoNegocio, { nombre: string; descripcion: string; modulos: ModuloId[] }> = {
    restaurante: {
        nombre: 'Restaurante / Bar / Café',
        descripcion: 'Gestión por mesas y sectores',
        modulos: ['inventario', 'ventas', 'arqueos', 'salon'],
    },
    tienda: {
        nombre: 'Tienda / Kiosco',
        descripcion: 'Venta directa de productos',
        modulos: ['inventario', 'ventas', 'arqueos', 'mostrador'],
    },
    servicios: {
        nombre: 'Servicios / Academias',
        descripcion: 'Membresías y asistencias',
        modulos: ['inventario', 'ventas', 'arqueos', 'suscripciones'],
    },
};