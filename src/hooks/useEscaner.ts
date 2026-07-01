import { useEffect, useRef } from 'react';

// Detecta escaneos de un lector de código de barras (que actúa como teclado).
// Distingue un escaneo de la escritura humana por la velocidad entre teclas.
export const useEscaner = (onEscaneo: (codigo: string) => void, activo = true) => {
    const buffer = useRef('');
    const ultimaTecla = useRef(0);

    // Guardamos el callback en un ref para no re-registrar el listener en cada render
    const callbackRef = useRef(onEscaneo);
    useEffect(() => {
        callbackRef.current = onEscaneo;
    }, [onEscaneo]);

    useEffect(() => {
        if (!activo) return;

        const TIEMPO_MAX_ENTRE_TECLAS = 50; // ms — más rápido que un humano

        const handleKeyDown = (e: KeyboardEvent) => {
            // Si el foco está en un input/textarea, no interceptamos
            // (para no romper la escritura normal en campos)
            const target = e.target as HTMLElement;
            const enCampo = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            const ahora = Date.now();
            const tiempoDesdeUltima = ahora - ultimaTecla.current;
            ultimaTecla.current = ahora;

            // Si pasó mucho tiempo desde la última tecla, reiniciar el buffer
            if (tiempoDesdeUltima > TIEMPO_MAX_ENTRE_TECLAS) {
                buffer.current = '';
            }

            if (e.key === 'Enter') {
                // Si hay un buffer acumulado rápido, es un escaneo
                if (buffer.current.length >= 3) {
                    const codigo = buffer.current;
                    buffer.current = '';
                    // Solo procesar si NO estamos en un campo de texto
                    // (salvo que quieras permitir escaneo dentro de campos)
                    if (!enCampo) {
                        e.preventDefault();
                        callbackRef.current(codigo);
                    }
                }
                return;
            }

            // Acumular solo caracteres imprimibles (números, letras)
            if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activo]);
};