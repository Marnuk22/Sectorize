// src/types/index.ts

import type { UnidadMedida } from "../config/unidades";

// ============================================
// ENUMS — espejo exacto de los CHECK de la DB
// ============================================
export type RolUsuario    = 'dueño' | 'encargado' | 'empleado';
export type EstadoArqueo  = 'abierto' | 'cerrado';
export type EstadoVenta   = 'abierta' | 'cerrada' | 'cancelada';
export type MetodoPago    = string
export type EstadoPedido  = 'pendiente' | 'preparando' | 'listo' | 'entregado';
export type TipoMembresia = 'por_tiempo' | 'por_asistencias' | 'clase_suelta';
export type EstadoSuscripcion = 'activa' | 'vencida' | 'cancelada';

// ============================================
// ENTIDADES DB — snake_case, id: string (uuid)
// ============================================
export interface Local {
    id:            string;
    nombre:        string;
    tipo:          string;
    plan:          string;
    modulos:       string[];
    moneda:        string;
    idioma:        string;
    metodos_pago:  string[];
    creado_at:     string;
    slug: string | null;
    whatsapp: string | null;
    catalogo_activo: boolean;
    negocio_id: string;
}

export interface Negocio {
    id: string;
    nombre: string;
    dueño_id: string | null;
    creado_at: string;
    suscripcion_estado: 'prueba' | 'activa' | 'vencida' | 'cancelada';
    suscripcion_id: string | null;
    suscripcion_vence: string | null;
    prueba_vence: string | null;
    multisucursal: boolean;
}

export interface Perfil {
    id:             string;
    local_id:       string | null;
    negocio_id:     string | null;
    nombre_usuario: string;
    rol:            RolUsuario;
    activo:         boolean;
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
    local_id:      string | null;
    negocio_id:    string | null;
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
    tipo_venta: 'unidad' | 'granel';
    unidad_medida: 'unidad' | 'kg' | 'g' | 'l' | 'ml';
    favorito: boolean;
    publicado: boolean;
    imagen_url: string | null;
    alerta_enviada: boolean;
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
    descuento:   number;
    editado_en:  string | null;
}

export interface DetalleVenta {
    id:              string;
    venta_id:        string;
    producto_id:     string;
    cantidad:        number;
    precio_unitario: number;
    subtotal:        number;
}
export interface Socio {
    id:                string;
    local_id:          string;
    nombre:            string;
    apellido:          string | null;
    telefono:          string | null;
    email:             string | null;
    dni:               string | null;
    fecha_nacimiento:  string | null;
    notas:             string | null;
    activo:            boolean;
    creado_at:         string;
}
export interface Membresia {
    id:                    string;
    local_id:              string;
    nombre:                string;
    precio:                number;
    duracion_dias:         number;
    tipo:                  TipoMembresia;
    cantidad_asistencias:  number | null;
    activo:                boolean;
    creado_at:             string;
}

export interface Suscripcion {
    id:                  string;
    local_id:            string;
    socio_id:            string;
    membresia_id:        string;
    venta_id:            string | null;
    fecha_inicio:        string;
    fecha_vencimiento:   string;
    asistencias_usadas:  number;
    estado:              EstadoSuscripcion;
    creado_at:           string;
}

export interface Clase {
    id:           string;
    local_id:     string;
    nombre:       string;
    dia_semana:   number | null;
    hora:         string | null;
    cupo_maximo:  number;
    activo:       boolean;
    creado_at:    string;
}

export interface Asistencia {
    id:         string;
    local_id:   string;
    socio_id:   string;
    clase_id:   string | null;
    fecha:      string;
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
    tipo_venta?: 'unidad' | 'granel';  
    unidad_medida?: UnidadMedida;
}

export interface MesaUI {
    id:         string;
    nombre:     string;
    estado:     EstadoMesa;
    capacidad?: number;
    aConfirmar: ItemPedidoUI[];
    pedidos:    ItemPedidoUI[];
    pos_x?: number | null;
    pos_y?: number | null;
    
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

export interface SocioConEstado extends Socio {
    suscripcionActiva:  Suscripcion | null;
    membresia:          Membresia | null;
    diasRestantes:      number | null;
    estadoMembresia:    'al_dia' | 'por_vencer' | 'vencido' | 'sin_membresia';
}