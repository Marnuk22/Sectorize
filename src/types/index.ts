// src/types/index.ts

// ============================================
// ENUMS — espejo exacto de los CHECK de la DB
// ============================================
export type RolUsuario    = 'admin' | 'empleado';
export type EstadoArqueo  = 'abierto' | 'cerrado';
export type EstadoVenta   = 'abierta' | 'cerrada' | 'cancelada';
export type MetodoPago    = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';
export type EstadoPedido  = 'pendiente' | 'preparando' | 'listo' | 'entregado';

// ============================================
// ENTIDADES DB — snake_case, id: string (uuid)
// ============================================
export interface Local {
    id:         string;
    nombre:     string;
    tipo:       string;
    plan:       string;
    modulos:    string[];
    creado_at:  string;
}

export interface Perfil {
    id:             string;
    local_id:       string;
    nombre_usuario: string;
    rol:            RolUsuario;
    creado_at:      string;
    updated_at:     string;
}

export interface Sector {
    id:         string;
    local_id:   string;
    nombre:     string;
    capacidad:  number | null;
    estado:     'libre' | 'ocupado' | 'reservado';
    posicion_x: number;
    posicion_y: number;
    creado_at:  string;
}

export interface MesaDB {
    id:         string;
    sector_id:  string;
    local_id:   string;
    nombre:     string;
    capacidad:  number | null;
    estado:     'libre' | 'ocupado' | 'reservado';
    creado_at:  string;
}

export interface Categoria {
    id:        string;
    local_id:  string;
    nombre:    string;
    icono:     string | null;
    orden:     number;
    activa:    boolean;
}

export interface Producto {
    id:            string;
    local_id:      string;
    nombre:        string;
    descripcion:   string | null;
    categoria:     string | null;
    precio_venta:  number;
    precio_costo:  number | null;
    stock_actual:  number;
    stock_minimo:  number;
    codigo_barras: string | null;
    activo:        boolean;
    creado_at:     string;
    updated_at:    string;
}

export interface Arqueo {
    id:                    string;
    local_id:              string;
    usuario_id:            string;
    monto_inicial:         number;
    monto_final_esperado:  number | null;
    monto_final_real:      number | null;
    estado:                EstadoArqueo;
    fecha_apertura:        string;
    fecha_cierre:          string | null;
}

export interface Venta {
    id:          string;
    local_id:    string;
    arqueo_id:   string;
    usuario_id:  string;
    sector_id:   string | null;
    total:       number;
    metodo_pago: MetodoPago;
    estado:      EstadoVenta;
    fecha:       string;
}

export interface DetalleVenta {
    id:              string;
    venta_id:        string;
    producto_id:     string;
    cantidad:        number;
    precio_unitario: number;
    subtotal:        number;
}

// ============================================
// TIPOS UI — solo frontend, nunca van a la DB
// ============================================
export type EstadoMesa = 'libre' | 'ocupada' | 'reservada';

export interface ItemPedidoUI {
    id:        string;
    nombre:    string;
    precio:    number;
    categoria: string | null;
    cantidad:  number;
    notas?:    string;
}

export interface MesaUI {
    id:         string;
    nombre:     string;
    estado:     EstadoMesa;
    capacidad?: number;
    aConfirmar: ItemPedidoUI[];
    pedidos:    ItemPedidoUI[];
}

export interface SectorUI {
    id:     string;
    nombre: string;
    mesas:  MesaUI[];
}

export interface VentaUI {
    id:          string;
    fecha:       Date;
    items:       ItemPedidoUI[];
    total:       number;
    mesa:        MesaUI;
    metodoPago:  MetodoPago;
}

export interface ArqueoUI {
    id:              string;
    montoInicial:    number;
    montoFinalReal:  number | null;
    fechaApertura:   Date;
    fechaCierre:     Date | null;
    estado:          EstadoArqueo;
}

// Venta con relaciones cargadas (para historial)
export interface VentaConDetalle extends Venta {
    detalles: DetalleVenta[];
    sector?:  Sector;
}