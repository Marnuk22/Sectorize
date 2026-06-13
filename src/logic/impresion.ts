import { generarComanda, generarTicket, type DatosComanda, type DatosTicket } from './comanda';
import type { ItemPedidoUI } from '../types';
import {imprimirTexto, imprimirHTML} from "./qz";


interface OpcionesImpresion {
    local: string;
    mesa: string;
    sector?: string;
    items: ItemPedidoUI[];
    mozo?: string;
    impresora?: string; // Nombre de la impresora a usar (opcional, por si queremos elegir entre varias)
}

// Por ahora "imprime" a la consola. Cuando integremos QZ Tray,
// acá adentro se cambia el console.log por el envío a la impresora.
export const imprimirComanda = async (opciones: OpcionesImpresion) => {
    if (opciones.items.length === 0) {
        console.warn('No hay items para imprimir en la comanda');
        return;
    }

    const datos: DatosComanda = {
        ...opciones,
        fecha: new Date(),
    };

    const texto = generarComanda(datos);

    try {
        await imprimirHTML(texto, opciones.impresora);
    } catch (error) {
        console.error('Error al imprimir la comanda:', error);
        alert('No se pudo imprimir. Verificá que QZ Tray esté abierto.');
    }
};

interface OpcionesTicket {
    local: string;
    mesa?: string;
    items: ItemPedidoUI[];
    subtotal: number;      
    descuento?: number;     
    total: number;
    metodoPago?: string;
    impresora?: string;
}

export const imprimirTicket = async (opciones: OpcionesTicket) => {
    if (opciones.items.length === 0) {
        console.warn('No hay items para el ticket');
        return;
    }

    const datos: DatosTicket = {
        ...opciones,
        fecha: new Date(),
    };

    const texto = generarTicket(datos);

    try {
        await imprimirHTML(texto, opciones.impresora);
    } catch (err) {
        console.error('Error al imprimir el ticket:', err);
        alert('No se pudo imprimir. Verificá que QZ Tray esté abierto.');
    }
};