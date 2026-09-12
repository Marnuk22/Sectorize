import { useEffect, useRef, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { BarcodeDetector } from 'barcode-detector/pure';
import { ModalBase } from '../ui/ComponentesBase';

interface Props {
    abierto: boolean;
    onCerrar: () => void;
    onDetectar: (codigo: string) => void;
}

// Escaneo por cámara — alternativa al lector físico USB/Bluetooth
// (useEscaner.ts) para cuando no hay uno a mano. Usa el ponyfill
// `barcode-detector` (ZXing-WASM) en vez del BarcodeDetector nativo del
// navegador porque ese no anda en Safari/iPhone; el ponyfill cubre ambos
// casos con el mismo código sin tocar el global de la página.
const ModalEscanerCamara = ({ abierto, onCerrar, onDetectar }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number | null>(null);
    const [error, setError] = useState('');

    // En un ref para no reiniciar la cámara si el padre re-renderiza con
    // una función inline nueva en cada render (mismo patrón que useEscaner).
    const onDetectarRef = useRef(onDetectar);
    useEffect(() => { onDetectarRef.current = onDetectar; }, [onDetectar]);

    useEffect(() => {
        if (!abierto) return;

        let activo = true;

        const iniciar = async () => {
            setError('');
            try {
                const detector = new BarcodeDetector({
                    formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
                });

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                });
                if (!activo) { stream.getTracks().forEach(t => t.stop()); return; }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const detectarFrame = async () => {
                    if (!activo || !videoRef.current) return;
                    try {
                        const resultados = await detector.detect(videoRef.current);
                        if (resultados.length > 0) {
                            onDetectarRef.current(resultados[0].rawValue);
                            return; // el padre cierra el modal al detectar, no pedimos más frames
                        }
                    } catch {
                        // un frame fallido no es grave, se reintenta en el próximo
                    }
                    if (activo) frameRef.current = requestAnimationFrame(detectarFrame);
                };
                frameRef.current = requestAnimationFrame(detectarFrame);
            } catch (err) {
                console.error('Error al acceder a la cámara:', err);
                if (activo) setError('No se pudo acceder a la cámara. Verificá los permisos del navegador.');
            }
        };

        iniciar();

        return () => {
            activo = false;
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, [abierto]);

    return (
        <ModalBase isOpen={abierto} onClose={onCerrar} titulo="Escanear código de barras">
            <div className="space-y-3">
                {error ? (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
                    </div>
                ) : (
                    <div className="relative rounded-xl overflow-hidden bg-stone-900 aspect-square">
                        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-8 border-2 border-violet-400 rounded-lg pointer-events-none" />
                    </div>
                )}
                <p className="text-xs text-stone-400 text-center flex items-center justify-center gap-1">
                    <Camera size={12} /> Apuntá la cámara al código de barras
                </p>
                <button
                    onClick={onCerrar}
                    className="w-full py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                    Cancelar
                </button>
            </div>
        </ModalBase>
    );
};

export default ModalEscanerCamara;
