import { generarComanda, generarTicket, generarReporteArqueo, type DatosComanda, type DatosTicket, type DatosArqueo } from './comanda';
import { imprimirHTML } from './qz';
import type { ItemPedidoUI } from '../types';

interface OpcionesComanda {
    local: string;
    mesa: string;
    sector?: string;
    items: ItemPedidoUI[];
    mozo?: string;
    impresoras: string[];   // nombres de sistema de las impresoras destino
}

export const imprimirComanda = async (opciones: OpcionesComanda) => {
    if (opciones.items.length === 0) {
        console.warn('No hay items para imprimir en la comanda');
        return;
    }

    if (opciones.impresoras.length === 0) {
        alert('No hay impresoras configuradas para comandas. Configurá una desde el menú → Impresoras.');
        return;
    }
    const datos: DatosComanda = {
        local: opciones.local,
        mesa: opciones.mesa,
        sector: opciones.sector,
        items: opciones.items,
        mozo: opciones.mozo,
        fecha: new Date(),
    };
    const texto = generarComanda(datos);

    // Mandar a cada impresora configurada
    for (const impresora of opciones.impresoras) {
        try {
            await imprimirHTML(texto, impresora);
        } catch (err) {
            console.error(`Error al imprimir comanda en ${impresora}:`, err);
            alert(`No se pudo imprimir en "${impresora}". Verificá que QZ Tray esté abierto.`);
        }
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
    impresoras: string[];
}

export const imprimirTicket = async (opciones: OpcionesTicket) => {
    if (opciones.items.length === 0) {
        console.warn('No hay items para el ticket');
        return;
    }
    if (opciones.impresoras.length === 0) {
        alert('No hay impresoras configuradas para tickets. Configurá una desde el menú → Impresoras.');
        return;
    }
    const datos: DatosTicket = {
        local: opciones.local,
        mesa: opciones.mesa,
        items: opciones.items,
        subtotal: opciones.subtotal,
        descuento: opciones.descuento,
        total: opciones.total,
        metodoPago: opciones.metodoPago,
        fecha: new Date(),
    };
    const texto = generarTicket(datos);

    for (const impresora of opciones.impresoras) {
        try {
            await imprimirHTML(texto, impresora);
        } catch (err) {
            console.error(`Error al imprimir ticket en ${impresora}:`, err);
            alert(`No se pudo imprimir en "${impresora}". Verificá que QZ Tray esté abierto.`);
        }
    }
};

interface OpcionesArqueo extends Omit<DatosArqueo, never> {
    impresoras: string[];
}

export const imprimirArqueo = async (opciones: OpcionesArqueo) => {
    if (opciones.impresoras.length === 0) {
        alert('No hay impresoras configuradas para tickets. Configurá una desde el menú → Impresoras.');
        return;
    }

    const { impresoras, ...datos } = opciones;
    const texto = generarReporteArqueo(datos as DatosArqueo);

    for (const impresora of impresoras) {
        try {
            await imprimirHTML(texto, impresora);
        } catch (err) {
            console.error(`Error al imprimir arqueo en ${impresora}:`, err);
            alert(`No se pudo imprimir en "${impresora}". Verificá que QZ Tray esté abierto.`);
        }
    }
};