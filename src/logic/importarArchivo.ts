import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { UnidadMedida } from "../config/unidades";

// Resultado de leer un archivo: las columnas detectadas y las filas de datos
export interface ArchivoLeido {
    columnas: string[];              // nombres de las columnas (encabezados)
    filas: Record<string, string>[]; // cada fila como objeto { columna: valor }
}

// Lee un archivo Excel, CSV o TXT y devuelve columnas + filas
export const leerArchivo = (archivo: File): Promise<ArchivoLeido> => {
    return new Promise((resolve, reject) => {
        const nombre = archivo.name.toLowerCase();

        // Excel (.xlsx, .xls)
        if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls')) {
            const lector = new FileReader();
            lector.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const libro = XLSX.read(data, { type: 'array' });
                    const primeraHoja = libro.Sheets[libro.SheetNames[0]];
                    // Convertir a JSON: cada fila un objeto con las columnas como claves
                    const json = XLSX.utils.sheet_to_json<Record<string, any>>(primeraHoja, { defval: '' });
                    resolve(procesarFilas(json));
                } catch (err) {
                    reject(new Error('No se pudo leer el archivo Excel. Verificá que no esté dañado.'));
                }
            };
            lector.onerror = () => reject(new Error('Error al leer el archivo.'));
            lector.readAsArrayBuffer(archivo);
            return;
        }

        // CSV o TXT
        if (nombre.endsWith('.csv') || nombre.endsWith('.txt')) {
            Papa.parse<Record<string, string>>(archivo, {
                header: true,           // primera fila = encabezados
                skipEmptyLines: true,
                complete: (resultado) => {
                    resolve(procesarFilas(resultado.data));
                },
                error: () => reject(new Error('No se pudo leer el archivo CSV/TXT.')),
            });
            return;
        }

        reject(new Error('Formato no soportado. Usá Excel (.xlsx), CSV o TXT.'));
    });
};

// Normaliza las filas: extrae columnas y convierte todo a string
const procesarFilas = (filas: Record<string, any>[]): ArchivoLeido => {
    if (filas.length === 0) {
        return { columnas: [], filas: [] };
    }
    // Las columnas son las claves de la primera fila
    const columnas = Object.keys(filas[0]);
    // Convertir todos los valores a string (limpio)
    const filasLimpias = filas.map(fila => {
        const limpia: Record<string, string> = {};
        for (const col of columnas) {
            limpia[col] = String(fila[col] ?? '').trim();
        }
        return limpia;
    });
    return { columnas, filas: filasLimpias };
};

// Campos de Vallis a los que se puede mapear una columna del archivo
export interface CampoImportable {
    id: string;              // clave interna
    label: string;           // cómo se muestra
    obligatorio: boolean;
    aliases: string[];       // nombres de columna que lo detectan automáticamente
}

export const CAMPOS_IMPORTABLES: CampoImportable[] = [
    { id: 'nombre',        label: 'Nombre',           obligatorio: true,  aliases: ['nombre', 'producto', 'descripcion producto', 'articulo', 'item', 'name'] },
    { id: 'precio_venta',  label: 'Precio de venta',  obligatorio: true,  aliases: ['precio', 'precio venta', 'precio_venta', 'venta', 'pvp', 'price', 'valor'] },
    { id: 'categoria',     label: 'Categoría',        obligatorio: false, aliases: ['categoria', 'categoría', 'rubro', 'tipo', 'category', 'familia'] },
    { id: 'precio_costo',  label: 'Precio de costo',  obligatorio: false, aliases: ['costo', 'precio costo', 'precio_costo', 'compra', 'cost'] },
    { id: 'codigo_barras', label: 'Código de barras', obligatorio: false, aliases: ['codigo', 'código', 'codigo barras', 'codigo_barras', 'barcode', 'ean', 'sku', 'cod'] },
    { id: 'stock_actual',  label: 'Stock actual',     obligatorio: false, aliases: ['stock', 'cantidad', 'existencia', 'inventario', 'qty'] },
    { id: 'descripcion',   label: 'Descripción',      obligatorio: false, aliases: ['descripcion', 'descripción', 'detalle', 'nota', 'observacion'] },
    { id: 'tipo_venta',    label: 'Tipo de venta',    obligatorio: false, aliases: ['tipo venta', 'tipo_venta', 'venta', 'modalidad'] },
    { id: 'unidad_medida', label: 'Unidad de medida', obligatorio: false, aliases: ['unidad', 'unidad medida', 'unidad_medida', 'medida', 'um'] },
];

// Normaliza un texto para comparar (sin acentos, minúsculas, sin espacios extra)
const normalizar = (texto: string): string =>
    texto.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
        .trim();

// Dado el listado de columnas del archivo, sugiere un mapeo automático:
// { campo_vallis: columna_archivo }
export const detectarMapeo = (columnas: string[]): Record<string, string> => {
    const mapeo: Record<string, string> = {};

    for (const campo of CAMPOS_IMPORTABLES) {
        // Buscar una columna cuyo nombre normalizado coincida con algún alias
        const columnaMatch = columnas.find(col => {
            const colNorm = normalizar(col);
            return campo.aliases.some(alias => normalizar(alias) === colNorm);
        });
        if (columnaMatch) {
            mapeo[campo.id] = columnaMatch;
        }
    }

    return mapeo;
};

// Un producto listo para importar, con su estado de validación
export interface ProductoImportar {
    fila: number;                    // número de fila en el archivo (para mostrar)
    nombre: string;
    precio_venta: number;
    categoria: string | null;
    precio_costo: number | null;
    codigo_barras: string | null;
    stock_actual: number;
    descripcion: string | null;
    tipo_venta: 'unidad' | 'granel';
    unidad_medida: UnidadMedida;
    valido: boolean;
    errores: string[];
}

// Convierte un texto de precio en formato argentino/internacional a número.
// Maneja: "1.500,50" (AR), "1500.50" (US), "1.500" (miles AR), "1500", "$1.500,50"
const parsearPrecio = (texto: string): number => {
    // Limpiar símbolos de moneda y espacios, dejar solo dígitos, puntos y comas
    let limpio = texto.replace(/[^0-9.,]/g, '').trim();
    if (!limpio) return NaN;

    const tieneComa = limpio.includes(',');
    const tienePunto = limpio.includes('.');

    if (tieneComa && tienePunto) {
        // Formato con ambos: el ÚLTIMO separador es el decimal
        // "1.500,50" → coma es decimal → quitar puntos, coma a punto
        // "1,500.50" → punto es decimal → quitar comas
        if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
            // Coma es el decimal (formato argentino)
            limpio = limpio.replace(/\./g, '').replace(',', '.');
        } else {
            // Punto es el decimal (formato inglés)
            limpio = limpio.replace(/,/g, '');
        }
    } else if (tieneComa) {
        // Solo coma: es el separador decimal argentino → coma a punto
        limpio = limpio.replace(',', '.');
    } else if (tienePunto) {
        // Solo punto: ambiguo. Si hay más de un punto, o el grupo tras el punto
        // tiene 3 dígitos, asumimos miles ("1.500" → 1500).
        const partes = limpio.split('.');
        if (partes.length > 2) {
            // Varios puntos = todos son de miles: "1.500.000"
            limpio = partes.join('');
        } else if (partes[1] && partes[1].length === 3) {
            // Un punto con 3 dígitos después = miles: "1.500" → 1500
            limpio = partes.join('');
        }
        // Si tras el punto hay 1, 2 o 4+ dígitos, lo dejamos como decimal ("1.5", "1.50")
    }

    return parseFloat(limpio);
};

// Repara un código de barras que Excel pudo haber roto en notación exponencial.
// "7.79123E+12" → "7791234567890"

const parsearCodigoBarras = (texto: string): string => {
    const limpio = texto.trim();
    if (!limpio) return '';
    // Detectar notación exponencial (contiene 'E' o 'e' con signo)
    if (/e\+?\d+/i.test(limpio)) {
        const num = Number(limpio);
        if (!isNaN(num)) {
            // Convertir a entero sin notación científica
            return BigInt(Math.round(num)).toString();
        }
    }
    return limpio;
};
// Convierte las filas del archivo en productos, aplicando el mapeo y validando
export const convertirProductos = (
    archivo: ArchivoLeido,
    mapeo: Record<string, string>,
    existentes: { nombre: string; codigo_barras: string | null }[] = []
): ProductoImportar[] => {
    // Para detectar duplicados DENTRO del archivo: vamos acumulando lo ya visto
    const nombresVistos = new Set<string>();
    const codigosVistos = new Set<string>();

    return archivo.filas.map((fila, i) => {
        const errores: string[] = [];

        const valor = (campoId: string): string => {
            const columna = mapeo[campoId];
            return columna ? (fila[columna] ?? '').trim() : '';
        };

        // Nombre (obligatorio)
        const nombre = valor('nombre');
        if (!nombre) errores.push('Falta el nombre');

        // Precio de venta (obligatorio, numérico) — formato argentino/internacional
        const precio_venta = parsearPrecio(valor('precio_venta'));
        if (isNaN(precio_venta) || precio_venta <= 0) {
            errores.push('Precio inválido');
        }

        // Precio de costo (opcional, numérico)
        const costoTexto = valor('precio_costo');
        const precio_costo = costoTexto ? parsearPrecio(costoTexto) : null;

        // Stock (opcional, numérico)
        const stock_actual = valor('stock_actual') ? parsearPrecio(valor('stock_actual')) : 0;

        // Código de barras (reparado de notación exponencial)
        const codigoActual = parsearCodigoBarras(valor('codigo_barras'));

        // Tipo de venta (opcional): normalizar a 'unidad' o 'granel'
        const tipoTexto = normalizar(valor('tipo_venta'));
        const tipo_venta: 'unidad' | 'granel' =
            (tipoTexto.includes('granel') || tipoTexto.includes('peso') || tipoTexto.includes('kg')) ? 'granel' : 'unidad';

        // Unidad de medida (opcional): validar contra las conocidas
        const unidadTexto = normalizar(valor('unidad_medida'));
        const unidadesValidas = ['kg', 'g', 'l', 'ml', 'unidad'];
        let unidad_medida: UnidadMedida = (unidadesValidas.includes(unidadTexto) ? unidadTexto : 'unidad') as UnidadMedida;
        if (tipo_venta === 'granel' && unidad_medida === 'unidad') unidad_medida = 'kg';
        if (tipo_venta === 'unidad') unidad_medida = 'unidad';

        // --- Detección de duplicados ---
        const nombreNorm = normalizar(nombre);

        // 1. Contra el inventario existente
        const dupNombreBD = nombre && existentes.some(e => normalizar(e.nombre) === nombreNorm);
        const dupCodigoBD = codigoActual && existentes.some(e => e.codigo_barras && e.codigo_barras === codigoActual);

        // 2. Dentro del mismo archivo (filas anteriores ya procesadas)
        const dupNombreArchivo = nombre && nombresVistos.has(nombreNorm);
        const dupCodigoArchivo = codigoActual && codigosVistos.has(codigoActual);

        if (dupNombreBD) errores.push('Ya existe un producto con ese nombre');
        else if (dupCodigoBD) errores.push('Ya existe un producto con ese código');
        else if (dupNombreArchivo) errores.push('Nombre repetido en el archivo');
        else if (dupCodigoArchivo) errores.push('Código repetido en el archivo');

        // Registrar lo visto (solo si es válido hasta acá, para no bloquear por sí mismo)
        if (nombre) nombresVistos.add(nombreNorm);
        if (codigoActual) codigosVistos.add(codigoActual);

        return {
            fila: i + 2,
            nombre,
            precio_venta: isNaN(precio_venta) ? 0 : precio_venta,
            categoria: valor('categoria') || null,
            precio_costo: (precio_costo !== null && !isNaN(precio_costo)) ? precio_costo : null,
            codigo_barras: codigoActual || null,
            stock_actual: isNaN(stock_actual) ? 0 : stock_actual,
            descripcion: valor('descripcion') || null,
            tipo_venta,
            unidad_medida,
            valido: errores.length === 0,
            errores,
        };
    });
};