import { LayoutGrid, Package, DollarSign, Calculator, ShoppingCart, Users, BarChart3, ChefHat, Warehouse, type LucideIcon } from 'lucide-react';

export type ModuloId = 'salon' | 'mostrador' | 'suscripciones' | 'inventario' | 'ventas' | 'arqueos' | 'informe' | 'produccion' | 'deposito';

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
    informe: {
        id: 'informe',
        nombre: 'Informe',
        descripcion: 'Análisis de ventas por período',
        icono: BarChart3,
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
    // Apagados por defecto para todos los tipos de negocio (no aparecen en
    // NEGOCIOS más abajo) — el dueño los activa aparte, más adelante podrían
    // depender del plan pago (mismo criterio que seguimiento_stock).
    produccion: {
        id: 'produccion',
        nombre: 'Producción',
        descripcion: 'Ingredientes, recetas y producción por lote',
        icono: ChefHat,
        esNucleo: false,
    },
    deposito: {
        id: 'deposito',
        nombre: 'Depósito',
        descripcion: 'Ubicación extra de stock, con transferencias',
        icono: Warehouse,
        esNucleo: false,
    },
};

// Tipos de negocio → qué módulos arrancan activos
export type TipoNegocio = 'restaurante' | 'tienda' | 'servicios';

export const NEGOCIOS: Record<TipoNegocio, { nombre: string; descripcion: string; modulos: ModuloId[] }> = {
    restaurante: {
        nombre: 'Restaurante / Bar / Café',
        descripcion: 'Gestión por mesas y sectores',
        modulos: ['inventario', 'ventas', 'arqueos', 'informe', 'salon'],
    },
    tienda: {
        nombre: 'Tienda / Kiosco',
        descripcion: 'Venta directa de productos',
        modulos: ['inventario', 'ventas', 'arqueos', 'informe', 'mostrador'],
    },
    servicios: {
        nombre: 'Servicios / Academias',
        descripcion: 'Membresías y asistencias',
        modulos: ['inventario', 'ventas', 'arqueos', 'informe', 'suscripciones'],
    },
};