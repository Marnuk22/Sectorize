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

const filaItem = (item: ItemPedidoUI): string => {
    let texto = `${item.cantidad}x ${item.nombre}`;
    if (item.notas && item.notas.trim()) {
        texto += `\n   >> ${item.notas}`;
    }
    return texto;
};

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

// --- Ticket de venta (para el cliente, CON precios) ---

export interface DatosTicket {
    local: string;
    mesa?: string;
    items: ItemPedidoUI[];
    subtotal: number;       // total antes del descuento
    descuento?: number; 
    total: number;
    metodoPago?: string;
    fecha: Date;
}

// Formatea una fila con nombre a la izquierda y precio a la derecha, alineados
const filaPrecio = (nombre: string, precio: number): string => {
    const precioStr = `$${precio.toLocaleString('es-AR')}`;
    const espacioDisponible = ANCHO - precioStr.length;
    let nombreCortado = nombre;
    if (nombre.length > espacioDisponible - 1) {
        nombreCortado = nombre.slice(0, espacioDisponible - 1);
    }
    const relleno = ANCHO - nombreCortado.length - precioStr.length;
    return nombreCortado + ' '.repeat(Math.max(1, relleno)) + precioStr;
};

export const generarTicket = (datos: DatosTicket): string => {
    const lineas: string[] = [];

    lineas.push(centrar(datos.local));
    lineas.push(linea());

    const hora = datos.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const dia = datos.fecha.toLocaleDateString('es-AR');
    lineas.push(`${dia}  ${hora}`);
    if (datos.mesa) lineas.push(datos.mesa);

    lineas.push(linea());

    // Cada item con su subtotal (cantidad x precio)
    datos.items.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        lineas.push(filaPrecio(`${item.cantidad}x ${item.nombre}`, subtotal));
    });

    lineas.push(linea());
    
    // Si hay descuento, mostramos subtotal y descuento antes del total
    if (datos.descuento && datos.descuento > 0) {
        lineas.push(filaPrecio('Subtotal', datos.subtotal));
        lineas.push(filaPrecio('Descuento', -datos.descuento));
    }
    lineas.push(filaPrecio('TOTAL', datos.total));

    if (datos.metodoPago) {
        lineas.push('');
        lineas.push(`Pago: ${datos.metodoPago}`);
    }

    lineas.push(linea());
    lineas.push(centrar('¡Gracias por su visita!'));
    lineas.push(centrar('Vallis'));

    return lineas.join('\n');
};