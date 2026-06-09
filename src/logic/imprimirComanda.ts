import { generarComanda, type DatosComanda } from './comanda';
import type { ItemPedidoUI } from '../types';

interface OpcionesImpresion {
    local: string;
    mesa: string;
    sector?: string;
    items: ItemPedidoUI[];
    mozo?: string;
}

// Por ahora "imprime" a la consola. Cuando integremos QZ Tray,
// acá adentro se cambia el console.log por el envío a la impresora.
export const imprimirComanda = (opciones: OpcionesImpresion) => {
    if (opciones.items.length === 0) {
        console.warn('No hay items para imprimir en la comanda');
        return;
    }

    const datos: DatosComanda = {
        ...opciones,
        fecha: new Date(),
    };

    const texto = generarComanda(datos);

    // --- ANDAMIAJE TEMPORAL: mostrar en consola ---
    console.log('%c=== COMANDA ===', 'font-weight: bold; color: #4f46e5');
    console.log(texto);
    // --- Cuando esté QZ Tray, acá va el envío a la impresora ---
};