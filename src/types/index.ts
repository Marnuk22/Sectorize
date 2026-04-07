// src/types/index.ts

export type EstadoMesa = 'libre' | 'ocupada' | 'reservada';
export type CategoriaProducto = 'Comida' | 'Bebida' | 'Cafetería';
export type EstadoPedido = 'pendiente' | 'preparando' | 'listo' | 'entregado';

export interface Producto {
    id: number;
    nombre: string;
    precio: number;
    categoria: CategoriaProducto;
}

export interface ItemPedido extends Producto {
    cantidad: number;
    notas?: string;
}

export interface Mesa {
    id: number;
    nombre: string;
    estado: EstadoMesa;
    pedidos: ItemPedido[]; // La mesa contiene la lista de lo que se pidió
}

export interface Sector {
    id: number;
    nombre: string;
    mesas: Mesa[];
}

// Esta es la "Comanda" que va a cocina, referenciando a la mesa por ID
export interface Comanda {
    id: number;
    idMesa: number; 
    items: ItemPedido[];
    total: number;
    estado: EstadoPedido;
}

export interface MetodoPago {
    id: string;          // UUID o ID numérico
    nombre: string;      // "Efectivo", "Tarjeta Débito", "Transferencia"
    activo?: boolean;     // Para "borrar" lógicamente (desactivar) sin romper ventas viejas
    icono?: string;      // Nombre del icono de Lucide para la UI
    recargo?: number;    // Por si quieres aplicar un 10% automático a tarjetas
}

export interface Venta {
    id: number;
    fecha: Date;
    items: ItemPedido[];
    total: number;
    mesa: Mesa;
    metodoPago?: MetodoPago;
}