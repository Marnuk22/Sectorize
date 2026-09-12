import { generarComanda, generarTicket, generarReporteArqueo, generarEtiquetaZPL, type DatosComanda, type DatosTicket, type DatosArqueo } from './comanda';
import { imprimirHTML, imprimirZPL } from './qz';
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

    // Sin impresoras configuradas: caso normal para un local que no imprime,
    // no un error — se skipea en silencio (antes tiraba un alert() en CADA
    // venta, molestando a cualquiera que no use impresoras).
    if (opciones.impresoras.length === 0) return;
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
    // Ver comentario equivalente en imprimirComanda: sin impresoras
    // configuradas es normal, no un error.
    if (opciones.impresoras.length === 0) return;
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
    // Ver comentario equivalente en imprimirComanda: sin impresoras
    // configuradas es normal, no un error.
    if (opciones.impresoras.length === 0) return;

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

interface ImpresoraEtiqueta {
    nombreSistema: string;
    dpi: number | null;
    anchoMm: number | null;
    altoMm: number | null;
}

interface OpcionesEtiqueta {
    nombre: string;
    precio: number;
    codigoBarras: string;
    impresoras: ImpresoraEtiqueta[];
}

// A diferencia de comanda/ticket/arqueo (imprimirHTML, mismo texto a
// cualquier térmica), acá cada impresora necesita SU PROPIO dpi/ancho/alto
// para calcular la plantilla ZPL — por eso recibe los objetos completos, no
// solo los nombres de sistema.
export const imprimirEtiqueta = async (opciones: OpcionesEtiqueta) => {
    // Ver comentario equivalente en imprimirComanda: sin impresoras
    // configuradas es normal, no un error.
    if (opciones.impresoras.length === 0) return;

    for (const impresora of opciones.impresoras) {
        if (!impresora.dpi || !impresora.anchoMm || !impresora.altoMm) {
            alert(`La impresora "${impresora.nombreSistema}" no tiene configurado el DPI o el tamaño de etiqueta. Configurala desde el menú → Impresoras.`);
            continue;
        }
        const zpl = generarEtiquetaZPL(
            { nombre: opciones.nombre, precio: opciones.precio, codigoBarras: opciones.codigoBarras },
            { dpi: impresora.dpi, anchoMm: impresora.anchoMm, altoMm: impresora.altoMm }
        );
        try {
            await imprimirZPL(zpl, impresora.nombreSistema);
        } catch (err) {
            console.error(`Error al imprimir etiqueta en ${impresora.nombreSistema}:`, err);
            alert(`No se pudo imprimir en "${impresora.nombreSistema}". Verificá que QZ Tray esté abierto.`);
        }
    }
};