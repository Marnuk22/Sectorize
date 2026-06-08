export type Plan = 'gratis' | 'basico' | 'premium';

// Todas las features gateables de la app
export type Feature =
    | 'seguimiento_stock'
    | 'historial_completo'
    | 'reportes'
    | 'notificaciones_email';

// Qué planes incluyen cada feature
export const FEATURES: Record<Feature, Plan[]> = {
    seguimiento_stock:    ['basico', 'premium'],
    historial_completo:   ['basico', 'premium'],
    reportes:             ['premium'],
    notificaciones_email: ['premium'],
};

// Info de cada plan para mostrar en la UI
export interface PlanInfo {
    id:          Plan;
    nombre:      string;
    precio:      number;
    descripcion: string;
    features:    string[]; // lista legible de lo que incluye
}

export const PLANES: Record<Plan, PlanInfo> = {
    gratis: {
        id: 'gratis',
        nombre: 'Gratis',
        precio: 0,
        descripcion: 'Para empezar a operar',
        features: [
            'Gestión de salón / mostrador / socios',
            'Inventario básico',
            'Ventas e historial reciente',
            'Arqueos de caja',
        ],
    },
    basico: {
        id: 'basico',
        nombre: 'Básico',
        precio: 20000,
        descripcion: 'Para locales en crecimiento',
        features: [
            'Todo lo del plan Gratis',
            'Seguimiento de stock',
            'Historial completo de ventas',
        ],
    },
    premium: {
        id: 'premium',
        nombre: 'Premium',
        precio: 30000,
        descripcion: 'Para máximo control',
        features: [
            'Todo lo del plan Básico',
            'Reportes y estadísticas',
            'Notificaciones por email de stock bajo',
        ],
    },
};

// Función central para verificar acceso
export const puedeUsar = (plan: Plan, feature: Feature): boolean => {
    return FEATURES[feature].includes(plan);
};