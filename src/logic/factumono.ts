import { Factumono, ValidationError, VoucherType, Concept, SalesCondition, CustomerDocumentType, CustomerTaxCondition } from '@factumono/sdk';
import type { VentaHistorial, DetalleVenta } from '../hooks/useHistorialVentas';

// Factumono no tiene API: "Comprobante por URL" arma un link que abre su
// formulario de Factura C con la venta precargada, y una persona toca
// "Emitir" ahí. Vallis no se entera del CAE ni del número (ver ROADMAP,
// sección Facturación).

// IDs de ARCA verificados contra COMMON_MEASURE_UNITS del propio SDK. Lo que
// no está mapeado (ml) va como "otras unidades" con la unidad en la descripción.
const UNIDAD_ARCA: Record<string, number> = { unidad: 7, kg: 1, g: 14, l: 5 };
const OTRAS_UNIDADES = 98;

const CONDICION_VENTA: Record<string, SalesCondition> = {
    efectivo: SalesCondition.Contado,
    debito: SalesCondition.TarjetaDeDebito,
    credito: SalesCondition.TarjetaDeCredito,
    transferencia: SalesCondition.TransferenciaBancaria,
    // 'tarjeta' (legado, sin distinguir) cae en Otra: la persona elige en el formulario.
};

// Día calendario en Argentina, "YYYY-MM-DD" (el SDK no acepta Date porque
// depende de la zona horaria).
const diaArgentina = (fecha: Date) =>
    fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

const redondear2 = (n: number) => Math.round(n * 100) / 100;

const MENSAJES: Record<string, string> = {
    itemsMax: 'La venta tiene más de 50 líneas, Factumono no acepta más en un solo comprobante.',
    issuedAtMax10DaysPast: 'La venta tiene más de 10 días: ARCA ya no permite facturarla.',
    itemsRequired: 'La venta no tiene productos para facturar.',
    customerNameInvalid: 'El nombre del cliente es demasiado largo (máximo 200 caracteres).',
    customerAddressInvalid: 'El domicilio del cliente es demasiado largo (máximo 300 caracteres).',
};

// ⚠️ TEMPORAL — MODO PRUEBA con un CUIT de mentira (21-00000000-2). En false:
// no se valida el dígito verificador, no se exige tener el CUIT cargado y NO
// se manda taxId a Factumono (el SDK igual rechaza prefijos inválidos, y así
// abre el CUIT que tenga activo la cuenta de prueba). VOLVER A true antes de
// abrir la facturación a cualquier cliente real (ver ROADMAP, sección Facturación).
export const VALIDAR_CUIT = false;

// Deja solo los dígitos (el usuario puede escribir 20-12345678-9).
export const soloDigitos = (cuit: string) => cuit.replace(/\D/g, '');

// CUIT/CUIL: 11 dígitos, el último es verificador (módulo 11).
export const cuitValido = (cuit: string) => {
    const d = soloDigitos(cuit);
    if (d.length !== 11) return false;
    if (!VALIDAR_CUIT) return true;
    return verificadorOk(d);
};

// Siempre estricto: el interruptor VALIDAR_CUIT es solo para el CUIT de
// prueba del emisor, el del cliente se valida siempre.
const verificadorOk = (d: string) => {
    if (d.length !== 11) return false;
    const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = pesos.reduce((acc, p, i) => acc + p * Number(d[i]), 0);
    const resto = suma % 11;
    const verificador = resto === 0 ? 0 : 11 - resto;
    return verificador !== 10 && verificador === Number(d[10]);
};

export type ResultadoFactura = { ok: true; url: string } | { ok: false; errores: string[] };

// Cliente identificado. Sin receptor (null) va como Consumidor Final anónimo;
// si la venta supera el monto que ARCA permite sin identificar, lo avisa el
// formulario de Factumono (esa regla no está en el SDK).
export type TipoDocumento = 'DNI' | 'CUIT' | 'CUIL';
export type CondicionIva = 'ConsumidorFinal' | 'Monotributo' | 'ResponsableInscripto' | 'Exento';

export interface Receptor {
    tipoDocumento: TipoDocumento;
    numero: string;
    condicionIva: CondicionIva;
    nombre: string;
    domicilio: string;
}

export const CONDICIONES_IVA: { id: CondicionIva; label: string }[] = [
    { id: 'ConsumidorFinal',      label: 'Consumidor Final' },
    { id: 'Monotributo',          label: 'Monotributo' },
    { id: 'ResponsableInscripto', label: 'Responsable Inscripto' },
    { id: 'Exento',               label: 'Exento' },
];

const TIPO_DOCUMENTO: Record<TipoDocumento, CustomerDocumentType> = {
    DNI: CustomerDocumentType.DNI,
    CUIT: CustomerDocumentType.CUIT,
    CUIL: CustomerDocumentType.CUIL,
};

const validarReceptor = (r: Receptor): string[] => {
    const errores: string[] = [];
    const numero = soloDigitos(r.numero);
    if (r.tipoDocumento === 'DNI') {
        if (numero.length < 7 || numero.length > 8) errores.push('El DNI tiene que tener 7 u 8 dígitos.');
    } else if (!verificadorOk(numero)) {
        errores.push(`El ${r.tipoDocumento} del cliente no es válido (11 dígitos, revisá el último número).`);
    }
    // Monotributo, RI y Exento se identifican con CUIT ante ARCA.
    if (r.condicionIva !== 'ConsumidorFinal' && r.tipoDocumento !== 'CUIT') {
        errores.push('Para un cliente que no es Consumidor Final, identificalo con su CUIT.');
    }
    return errores;
};

// cuitEmisor: se manda como taxId para que Factumono abra con ESE CUIT (si la
// cuenta no lo tiene, Factumono lo ignora y abre el que tenga activo). Sin
// CUIT cargado NO se arma el link: facturar con el contribuyente equivocado
// es un problema fiscal real, mejor pedir que se cargue.
export const armarUrlFactumono = (venta: VentaHistorial, detalle: DetalleVenta[], cuitEmisor: string | null, receptor: Receptor | null): ResultadoFactura => {
    if (VALIDAR_CUIT && (!cuitEmisor || !cuitValido(cuitEmisor))) {
        return { ok: false, errores: ['Cargá el CUIT del emisor en "Datos del local" antes de facturar.'] };
    }
    if (receptor) {
        const errores = validarReceptor(receptor);
        if (errores.length > 0) return { ok: false, errores };
    }

    const subtotal = detalle.reduce((acc, i) => acc + i.subtotal, 0);
    // El SDK no tiene campo de descuento: se reparte proporcionalmente en el
    // precio unitario de cada línea, para que el total facturado coincida
    // con lo que pagó el cliente (puede haber diferencias de centavos por
    // redondeo — la persona lo revisa en el formulario antes de emitir).
    const factor = subtotal > 0 ? venta.total / subtotal : 1;

    try {
        const url = Factumono.createVoucherUrl({
            type: VoucherType.FacturaC,
            ...(VALIDAR_CUIT && cuitEmisor ? { taxId: soloDigitos(cuitEmisor) } : {}),
            concept: Concept.Productos,
            issuedAt: diaArgentina(venta.fecha),
            salesCondition: CONDICION_VENTA[venta.metodo_pago] ?? SalesCondition.Otra,
            ...(receptor ? {
                customer: {
                    taxCondition: CustomerTaxCondition[receptor.condicionIva],
                    documentType: TIPO_DOCUMENTO[receptor.tipoDocumento],
                    documentNumber: soloDigitos(receptor.numero),
                    ...(receptor.nombre.trim() ? { name: receptor.nombre.trim() } : {}),
                    ...(receptor.domicilio.trim() ? { address: receptor.domicilio.trim() } : {}),
                },
            } : {}),
            items: detalle.map(i => {
                const unidad = i.unidad_medida ?? 'unidad';
                const idArca = UNIDAD_ARCA[unidad];
                return {
                    description: idArca === undefined ? `${i.nombre} (${unidad})` : i.nombre,
                    quantity: i.cantidad,
                    unitPrice: redondear2(i.precio * factor),
                    unitMeasureId: idArca ?? OTRAS_UNIDADES,
                };
            }),
        });
        return { ok: true, url };
    } catch (err) {
        if (err instanceof ValidationError) {
            return { ok: false, errores: err.errors.map(e => MENSAJES[e.code] ?? `${e.path}: ${e.message}`) };
        }
        throw err;
    }
};
