import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload, RotateCcw, AlertCircle } from 'lucide-react';

interface Props {
    // Se llama con el Blob/File listo para procesar, o null si el usuario
    // borra la grabación/archivo actual (habilita/deshabilita "Procesar" en el padre).
    onCambio: (audio: Blob | null) => void;
}

// Tipos de audio que suele soportar MediaRecorder según navegador — se
// elige el primero disponible, sin forzar uno que el navegador no soporte.
const TIPOS_SOPORTADOS = ['audio/webm', 'audio/mp4', 'audio/ogg'];
const elegirMimeType = () => TIPOS_SOPORTADOS.find(t => MediaRecorder.isTypeSupported(t)) ?? '';

const formatearTiempo = (segundos: number) =>
    `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

const GrabadorAudio = ({ onCambio }: Props) => {
    const [grabando, setGrabando] = useState(false);
    const [segundos, setSegundos] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);

    // Limpieza si el modal se cierra a mitad de una grabación
    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const iniciarGrabacion = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mimeType = elegirMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunksRef.current = [];

            recorder.ondataavailable = e => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
                setAudioUrl(URL.createObjectURL(blob));
                onCambio(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setGrabando(true);
            setSegundos(0);
            timerRef.current = window.setInterval(() => setSegundos(s => s + 1), 1000);
        } catch {
            setError('No se pudo acceder al micrófono. Revisá los permisos del navegador.');
        }
    };

    const detenerGrabacion = () => {
        mediaRecorderRef.current?.stop();
        setGrabando(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        setAudioUrl(URL.createObjectURL(file));
        onCambio(file);
    };

    const limpiar = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        onCambio(null);
    };

    // --- Ya hay un audio listo (grabado o subido) ---
    if (audioUrl) {
        return (
            <div className="space-y-3">
                <audio controls src={audioUrl} className="w-full" />
                <button
                    onClick={limpiar}
                    className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700"
                >
                    <RotateCcw size={14} /> Grabar o subir otro
                </button>
            </div>
        );
    }

    // --- Grabando ---
    if (grabando) {
        return (
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-lg font-bold text-stone-800 tabular-nums">{formatearTiempo(segundos)}</span>
                </div>
                <button
                    onClick={detenerGrabacion}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                >
                    <Square size={15} className="fill-white" /> Detener
                </button>
            </div>
        );
    }

    // --- Estado inicial: elegir grabar o subir ---
    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={iniciarGrabacion}
                    className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 hover:border-violet-300 hover:bg-violet-50/30 rounded-2xl p-6 transition-colors"
                >
                    <div className="p-3 bg-violet-100 rounded-full">
                        <Mic size={22} className="text-violet-600" />
                    </div>
                    <span className="text-sm font-medium text-stone-700">Grabar audio</span>
                </button>

                <label className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 hover:border-violet-300 hover:bg-violet-50/30 rounded-2xl p-6 transition-colors cursor-pointer">
                    <input type="file" accept="audio/*" onChange={handleArchivo} className="hidden" />
                    <div className="p-3 bg-stone-100 rounded-full">
                        <Upload size={22} className="text-stone-500" />
                    </div>
                    <span className="text-sm font-medium text-stone-700">Subir archivo</span>
                </label>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
            )}
        </div>
    );
};

export default GrabadorAudio;
