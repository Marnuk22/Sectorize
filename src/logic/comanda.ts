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

export interface DatosArqueo {
    local: string;
    fechaApertura: Date;
    fechaCierre?: Date;
    montoInicial: number;
    totalVentas: number;
    cantidadVentas: number;
    porMetodo: Record<string, number>;
    montoEsperado: number;
    montoReal?: number;       // lo contado físicamente (solo en cierre)
    diferencia?: number;      // montoReal - montoEsperado (solo en cierre)
}

export const generarReporteArqueo = (datos: DatosArqueo): string => {
    const lineas: string[] = [];

    lineas.push(centrar(datos.local));
    lineas.push(centrar('CIERRE DE CAJA'));
    lineas.push(linea());

    const fmtFecha = (f: Date) =>
        `${f.toLocaleDateString('es-AR')} ${f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;

    lineas.push(`Apertura: ${fmtFecha(datos.fechaApertura)}`);
    if (datos.fechaCierre) {
        lineas.push(`Cierre:   ${fmtFecha(datos.fechaCierre)}`);
    }

    lineas.push(linea());

    lineas.push(filaPrecio('Monto inicial', datos.montoInicial));
    lineas.push(filaPrecio('Total vendido', datos.totalVentas));
    lineas.push(`Cantidad de ventas: ${datos.cantidadVentas}`);

    lineas.push(linea());
    lineas.push('Por método de pago:');
    Object.entries(datos.porMetodo).forEach(([metodo, monto]) => {
        lineas.push(filaPrecio(`  ${metodo}`, monto));
    });

    lineas.push(linea());
    lineas.push(filaPrecio('Esperado en caja', datos.montoEsperado));

    // Si es un cierre con conteo físico
    if (datos.montoReal != null) {
        lineas.push(filaPrecio('Contado', datos.montoReal));
        const dif = datos.diferencia ?? 0;
        const signo = dif >= 0 ? '+' : '';
        lineas.push(filaPrecio('Diferencia', dif));
        lineas.push('');
        lineas.push(centrar(dif === 0 ? 'Caja exacta' : dif > 0 ? `Sobrante ${signo}${dif}` : `Faltante ${dif}`));
    }

    lineas.push(linea());
    lineas.push(centrar('Vallis'));

    return lineas.join('\n');
}

/* ------------------------------------------------------------------------ */
/* Etiqueta de producto (ZPL, impresoras Zebra) — código de barras + nombre
   + precio. A diferencia de comanda/ticket/arqueo (texto plano para
   térmicas ESC/POS vía imprimirHTML), esto genera comandos ZPL crudos que
   se mandan directo a la impresora con imprimirZPL (qz.ts).

   Las posiciones se calculan en puntos a partir de dpi/anchoMm/altoMm —
   nunca hardcodeadas — porque no hay una impresora/etiqueta física puntual
   todavía: cada comercio configura la suya (ver PanelImpresoras). Alcance
   actual: solo Zebra (ZPL nativo) — Argox usa PPLA/PPLB y aunque algunos
   modelos emulan ZPL, no se puede validar sin hardware real, queda fuera
   por ahora.

   IMPORTANTE: esta plantilla no se pudo probar contra una impresora Zebra
   real — el primer comercio que la use es quien valida en la práctica que
   imprime bien (posiciones, legibilidad del código a la distancia típica
   de un lector de mostrador, etc.). Si hace falta ajustar, tocar solo las
   proporciones de acá abajo, no los `^FO`/`^A0`/`^BC`/`^BE` sueltos en el
   armado del ZPL. */
export interface DatosEtiqueta {
    nombre: string;
    precio: number;
    codigoBarras: string;
}

export interface ConfigEtiquetaImpresora {
    dpi: number;       // 203 | 300
    anchoMm: number;
    altoMm: number;
}

const mmAPuntos = (mm: number, dpi: number): number => Math.round((mm * dpi) / 25.4);

// EAN-13 real: exactamente 13 dígitos numéricos (código de fábrica). Todo lo
// demás —incluidos los generados, que arrancan con "V"— va como Code128.
const esEAN13 = (codigo: string): boolean => /^\d{13}$/.test(codigo);

export const generarEtiquetaZPL = (datos: DatosEtiqueta, config: ConfigEtiquetaImpresora): string => {
    const { dpi, anchoMm, altoMm } = config;
    const anchoPts = mmAPuntos(anchoMm, dpi);
    const altoPts = mmAPuntos(altoMm, dpi);

    // Proporciones respecto al DPI/alto, no puntos fijos — así la misma
    // plantilla sirve tanto en 203 como en 300 dpi y con distintos tamaños
    // de etiqueta.
    const margen = Math.round(dpi * 0.04);
    const altoTextoNombre = Math.round(dpi * 0.09);
    const altoTextoPrecio = Math.round(dpi * 0.13);
    const altoBarras = Math.max(Math.round(altoPts * 0.35), Math.round(dpi * 0.2));

    // Code128 a este DPI no lee bien un texto larguísimo en el ancho típico
    // de una etiqueta chica — se trunca, el nombre completo ya está en el
    // sistema igual.
    const nombreTruncado = datos.nombre.length > 28 ? datos.nombre.slice(0, 28) : datos.nombre;
    const precioTexto = `$${datos.precio.toLocaleString('es-AR')}`;

    const yNombre = margen;
    const yPrecio = yNombre + altoTextoNombre + margen;
    const yBarras = yPrecio + altoTextoPrecio + margen;

    const comandoBarras = esEAN13(datos.codigoBarras)
        ? `^BY2\n^FO${margen},${yBarras}^BEN,${altoBarras},Y,N\n^FD${datos.codigoBarras}^FS`
        : `^BY2\n^FO${margen},${yBarras}^BCN,${altoBarras},Y,N,N\n^FD${datos.codigoBarras}^FS`;

    return [
        '^XA',
        `^PW${anchoPts}`,
        `^LL${altoPts}`,
        `^FO${margen},${yNombre}^A0N,${altoTextoNombre},${altoTextoNombre}^FD${nombreTruncado}^FS`,
        `^FO${margen},${yPrecio}^A0N,${altoTextoPrecio},${altoTextoPrecio}^FD${precioTexto}^FS`,
        comandoBarras,
        '^XZ',
    ].join('\n');
};