// src/logic/MesaService.ts

import  type  { Mesa, Sector, Producto } from "../types";
export const MesaService = {
  // Ahora pedimos el nombre que el usuario escribió
    agregarMesa: (sector: Sector, nombreElegido: string): Sector => {
    
        const maxId = sector.mesas.length > 0 
            ? Math.max(...sector.mesas.map(m => m.id)) 
            : 0;

        // Validación básica: que no esté vacío  y  que  no  supere cierta longitud, por ejemplo 25 caracteres.
        const nombreLimpio = nombreElegido.trim();
        if (!nombreLimpio) {
            throw new Error("El nombre de la mesa no puede estar vacío");
        }
        if (nombreLimpio.length > 25) {
            throw new Error("El nombre de la mesa no puede exceder 25 caracteres");
        }

        const nuevaMesa: Mesa = {
            id: maxId+1, // El ID sigue siendo la clave para React
            nombre: nombreElegido,   // Aquí guardamos lo que el usuario escribió
            estado: 'libre',
            pedidos: []
        };

        return {
            ...sector,
            mesas: [...sector.mesas, nuevaMesa]
        };
    },

    agregarProducto: (mesa: Mesa, producto: Producto): Mesa => {
        const itemExistente = mesa.pedidos.find(p => p.id === producto.id);
            return {
                ...mesa,
                estado: 'ocupada',
                pedidos: itemExistente ? mesa.pedidos.map(p => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p)
                : [...mesa.pedidos, { ...producto, cantidad: 1 }]
            };
    },
  // ... resto de funciones
};