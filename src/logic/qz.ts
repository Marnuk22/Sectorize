import qz from 'qz-tray';

// Estado de conexión para no reconectar innecesariamente
let conectando: Promise<void> | null = null;

// Conecta a QZ Tray (si ya está conectado, no hace nada)
const conectar = async (): Promise<void> => {
    if (qz.websocket.isActive()) return;

    // Evita lanzar varias conexiones en paralelo
    if (conectando) return conectando;

    conectando = qz.websocket.connect()
        .then(() => {
            console.log('✅ Conectado a QZ Tray');
        })
        .catch((err: unknown) => {
            console.error('❌ No se pudo conectar a QZ Tray:', err);
            throw new Error('No se pudo conectar con QZ Tray. ¿Está instalado y abierto?');
        })
        .finally(() => {
            conectando = null;
        });

    await conectando;
};

// Imprime texto plano (raw) en la impresora indicada
export const imprimirTexto = async (texto: string, nombreImpresora?: string): Promise<void> => {
    await conectar();

    // Si no se especifica impresora, usa la predeterminada del sistema
    const impresora = nombreImpresora
        ? await qz.printers.find(nombreImpresora)
        : await qz.printers.getDefault();

    const config = qz.configs.create(impresora);

    // Los datos a imprimir: texto plano + corte de papel al final
    const datos = [
        texto + '\n\n\n',  // espacio al final para que el corte no pegue al texto
        '\x1D\x56\x01',     // comando ESC/POS de corte parcial de papel
    ];

    await qz.print(config, datos);
};

// Imprime ZPL crudo (etiquetas Zebra) — a diferencia de imprimirTexto, NO
// agrega el trailer de corte ESC/POS (eso es específico de térmicas de
// tickets/comandas y no aplica acá). El ZPL ya trae su propio ^XA...^XZ.
export const imprimirZPL = async (zpl: string, nombreImpresora?: string): Promise<void> => {
    await conectar();

    const impresora = nombreImpresora
        ? await qz.printers.find(nombreImpresora)
        : await qz.printers.getDefault();

    const config = qz.configs.create(impresora);

    await qz.print(config, [zpl]);
};

// Devuelve la lista de impresoras instaladas que detecta QZ Tray
export const listarImpresoras = async (): Promise<string[]> => {
    await conectar();
    const impresoras = await qz.printers.find();
    // qz.printers.find() puede devolver un string o un array
    return Array.isArray(impresoras) ? impresoras : [impresoras];
};

// Imprime como HTML — compatible con cualquier impresora (PDF, láser, térmica)
// Útil para probar sin térmica. El texto se muestra monoespaciado tipo ticket.
export const imprimirHTML = async (texto: string, nombreImpresora?: string): Promise<void> => {
    await conectar();

    const impresora = nombreImpresora
        ? await qz.printers.find(nombreImpresora)
        : await qz.printers.getDefault();

    const config = qz.configs.create(impresora);

    // Envolvemos el texto en HTML con fuente monoespaciada (estilo ticket)
    const html = `
        <html>
            <body style="font-family: 'Courier New', monospace; font-size: 12px; white-space: pre; margin: 0; padding: 10px;">${texto}</body>
        </html>
    `;

    const datos = [{
        type: 'html' as const,
        format: 'plain' as const,
        data: html,
    }];

    await qz.print(config, datos);
};

// Expone conectar por si querés verificar la conexión desde otro lado
export const conectarQZ = conectar;