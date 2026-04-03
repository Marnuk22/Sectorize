import {type Mesa, type Producto, type Sector, type ItemPedido}  from "../types";

export const PRODUCTOS_CARTA: Producto[] = [
    // --- COMIDA ---
    { id: 1, nombre: 'Pizza Margherita', precio: 1200, categoria: 'Comida' },
    { id: 2, nombre: 'Pizza Pepperoni', precio: 1400, categoria: 'Comida' },
    { id: 3, nombre: 'Hamburguesa Simple', precio: 1000, categoria: 'Comida' },
    { id: 4, nombre: 'Hamburguesa con Queso', precio: 1300, categoria: 'Comida' },
    { id: 5, nombre: 'Papas Fritas Chicas', precio: 700, categoria: 'Comida' },
    
    // --- BEBIDA ---
    { id: 6, nombre: 'Cerveza Quilmes', precio: 500, categoria: 'Bebida' },
    { id: 7, nombre: 'Cerveza IPA Artesanal', precio: 850, categoria: 'Bebida' },
    { id: 8, nombre: 'Coca Cola 500ml', precio: 400, categoria: 'Bebida' },
    { id: 9, nombre: 'Agua con Gas 500ml', precio: 350, categoria: 'Bebida' },
    { id: 10, nombre: 'Jugo de Naranja Natural', precio: 600, categoria: 'Bebida' },
    
    // --- CAFETERÍA ---
    { id: 11, nombre: 'Café Espresso', precio: 300, categoria: 'Cafetería' },
    { id: 12, nombre: 'Café Jarrito', precio: 450, categoria: 'Cafetería' },
    { id: 13, nombre: 'Capuchino Especial', precio: 650, categoria: 'Cafetería' },
    { id: 14, nombre: 'Medialuna de Manteca', precio: 250, categoria: 'Cafetería' },
    { id: 15, nombre: 'Tostado Jamón y Queso', precio: 900, categoria: 'Cafetería' },
];

export const  CATEGORIAS_OFICIALES: string[] = ['Comida', 'Bebida', 'Cafetería', 'Postres'] as const;
const pedidos: ItemPedido[] = [
    { id: 1, nombre: 'Pizza Margherita', precio: 1200, categoria: 'Comida', cantidad: 2 },
    { id: 6, nombre: 'Cerveza Quilmes', precio: 500, categoria: 'Bebida', cantidad: 3 },
    { id: 12, nombre: 'Café Jarrito', precio: 450, categoria: 'Cafetería', cantidad: 1 },
];
const mesasEjemplo: Mesa[] = [
    { id: 1, nombre: "1", estado: 'libre', pedidos: pedidos },
    { id: 2, nombre: "2", estado: 'ocupada', pedidos: [] },
    { id: 3, nombre: "3", estado: 'reservada', pedidos: [] },
    { id: 4, nombre: "4", estado: 'libre', pedidos: [] },
];
const mesasEjemplo2: Mesa[] = [
    { id: 5, nombre: "5", estado: 'libre', pedidos: [] },
    { id: 6, nombre: "6", estado: 'ocupada', pedidos: [] },
    { id: 7, nombre: "7", estado: 'reservada', pedidos: [] },
    { id: 8, nombre: "8", estado: 'libre', pedidos: [] },
];
const mesasEjemplo3: Mesa[] = [
    { id: 9, nombre: "1af", estado: 'libre', pedidos: [] },
    { id: 10, nombre: "2af", estado: 'ocupada', pedidos: [] },
    { id: 11, nombre: "3af", estado: 'reservada', pedidos: [] },
    { id: 12, nombre: "4af" , estado: 'libre', pedidos: [] },
];

export const sectoresEjemplo: Sector[] = [
    {id: 1,  nombre: 'Salón', mesas: mesasEjemplo},
    {id: 2, nombre: 'Patio', mesas: mesasEjemplo3},
    {id: 3, nombre: 'VIP', mesas: mesasEjemplo2},
];