import type { ItemPedidoUI } from '../types';

export interface DatosComanda {
    local: string;
    mesa: string;
    sector?: string;
    items: ItemPedidoUI[];
    mozo?: string;
    fecha: Date;
}

// Ancho típico de una térmica de 80mm en caracteres monoespaciados
const ANCHO = 42;

const centrar = (texto: string): string => {
    if (texto.length >= ANCHO) return texto;
    const espacios = Math.floor((ANCHO - texto.length) / 2);
    return ' '.repeat(espacios) + texto;
};

const linea = (char = '-'): string => char.repeat(ANCHO);

const filaItem = (item: ItemPedidoUI): string => `${item.cantidad}x ${item.nombre}`;

// Genera el texto plano de la comanda de cocina (sin precios)
export const generarComanda = (datos: DatosComanda): string => {
    const lineas: string[] = [];

    lineas.push(centrar('*** COMANDA ***'));
    lineas.push(linea());
    lineas.push(`${datos.mesa}${datos.sector ? ` - ${datos.sector}` : ''}`);

    const hora = datos.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const dia = datos.fecha.toLocaleDateString('es-AR');
    lineas.push(`${dia}  ${hora}`);

    if (datos.mozo) lineas.push(`Mozo: ${datos.mozo}`);

    lineas.push(linea());

    datos.items.forEach(item => {
        lineas.push(filaItem(item));
    });

    lineas.push(linea());
    lineas.push(centrar('Vallis'));

    return lineas.join('\n');
};