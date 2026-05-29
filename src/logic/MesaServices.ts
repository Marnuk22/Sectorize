// src/logic/MesaServices.ts
import type { MesaUI as Mesa, SectorUI as Sector, ItemPedidoUI as ItemPedido } from '../types';

export const MesaService = {
    agregarMesa: (sector: Sector, nombreElegido: string): Sector => {
        const nombreLimpio = nombreElegido.trim();
        if (!nombreLimpio) throw new Error("El nombre de la mesa no puede estar vacío");
        if (nombreLimpio.length > 25) throw new Error("El nombre de la mesa no puede exceder 25 caracteres");

        const nuevaMesa: Mesa = {
            id: Date.now().toString(),
            nombre: nombreElegido,
            estado: 'libre',
            aConfirmar: [],
            pedidos: []
        };

        return { ...sector, mesas: [...sector.mesas, nuevaMesa] };
    },

    agregarProducto: (mesa: Mesa, item: ItemPedido): Mesa => {
        const itemExistente = mesa.aConfirmar.find(p => p.id === item.id);
        return {
            ...mesa,
            estado: 'ocupada',
            aConfirmar: itemExistente
                ? mesa.aConfirmar.map(p => p.id === item.id ? { ...p, cantidad: p.cantidad + 1 } : p)
                : [...mesa.aConfirmar, { ...item, cantidad: 1 }]
        };
    },

    confirmarPedido: (mesa: Mesa): Mesa => {
        return {
            ...mesa,
            pedidos: [...mesa.pedidos, ...mesa.aConfirmar],
            aConfirmar: [],
            estado: 'ocupada'
        };
    }
};