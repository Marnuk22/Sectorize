import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Sistema de tonos: reemplaza las franjas de color ad-hoc (verde de "Caja abierta",
 * violeta de "Monto esperado", etc.) por un set fijo de 4 tonos reutilizables.
 * Cualquier bloque de datos que necesite destacarse usa uno de estos, nunca
 * un color suelto definido a mano.
 */
export type TonoDato = 'neutral' | 'exito' | 'alerta' | 'acento';

const TONOS: Record<TonoDato, string> = {
    neutral: 'bg-white border-stone-200',
    exito: 'bg-green-50 border-green-200',
    alerta: 'bg-red-50 border-red-200',
    acento: 'bg-violet-50 border-violet-200',
};

const PADDINGS = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
} as const;

/* ---------------------------------------------------------------------- */
/* Tarjeta: el contenedor base. Todo bloque de contenido agrupado (una
   fila de datos, una tarjeta de producto, una franja de estado) nace de
   acá para que borde / redondeo / padding sean siempre los mismos.       */
/* ---------------------------------------------------------------------- */
interface TarjetaProps {
    children: ReactNode;
    tono?: TonoDato;
    padding?: keyof typeof PADDINGS;
    interactiva?: boolean;
    className?: string;
}

export const Tarjeta = ({
    children,
    tono = 'neutral',
    padding = 'md',
    interactiva = false,
    className = '',
}: TarjetaProps) => (
    <div
        className={`rounded-2xl border ${TONOS[tono]} ${PADDINGS[padding]} ${
            interactiva
                ? 'cursor-pointer transition-colors hover:border-violet-300 active:scale-[0.99]'
                : ''
        } ${className}`}
    >
        {children}
    </div>
);

/* ---------------------------------------------------------------------- */
/* SeccionDatos: bloque grande con etiqueta + valor destacado.
   Uso: "Total vendido / $86.753", "Ventas / 5", "Monto inicial / $0"     */
/* ---------------------------------------------------------------------- */
interface SeccionDatosProps {
    etiqueta: string;
    valor: ReactNode;
    icono?: ReactNode;
    tono?: TonoDato;
    className?: string;
}

export const SeccionDatos = ({
    etiqueta,
    valor,
    icono,
    tono = 'neutral',
    className = '',
}: SeccionDatosProps) => (
    <Tarjeta tono={tono} className={className}>
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">
            {icono}
            {etiqueta}
        </div>
        <div className="text-2xl font-bold text-stone-800">{valor}</div>
    </Tarjeta>
);

/* ---------------------------------------------------------------------- */
/* FilaDato: fila label-izquierda / valor-derecha, dentro de una tarjeta.
   Uso: "Efectivo — $86.753", "Caja abierta — Inicial: $0",
   "Monto esperado en caja — $86.753" (con tono="acento" y destacado)      */
/* ---------------------------------------------------------------------- */
interface FilaDatoProps {
    etiqueta: ReactNode;
    valor: ReactNode;
    subetiqueta?: string;
    icono?: ReactNode;
    tono?: TonoDato;
    destacado?: boolean;
    className?: string;
}

export const FilaDato = ({
    etiqueta,
    valor,
    subetiqueta,
    icono,
    tono = 'neutral',
    destacado = false,
    className = '',
}: FilaDatoProps) => (
    <Tarjeta tono={tono} className={`flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2.5">
            {icono && <span className="shrink-0">{icono}</span>}
            <div>
                <p className="text-sm font-bold text-stone-700">{etiqueta}</p>
                {subetiqueta && <p className="text-xs text-stone-400">{subetiqueta}</p>}
            </div>
        </div>
        <span
            className={
                destacado
                    ? 'text-xl font-bold text-stone-800'
                    : 'text-sm font-bold text-stone-800'
            }
        >
            {valor}
        </span>
    </Tarjeta>
);

/* ---------------------------------------------------------------------- */
/* Boton: 5 variantes fijas + 3 tamaños fijos. Nadie vuelve a escribir
   padding/radio a mano — reemplaza los ~5 estilos de botón distintos que
   hoy conviven en la app (modal, "+", "Acomodar", "Cobrar", etc).
   `activo` es para botones toggle tipo "Acomodar / Listo".               */
/* ---------------------------------------------------------------------- */
type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'acento';
type TamañoBoton = 'sm' | 'md' | 'lg';

const VARIANTES_BOTON: Record<VarianteBoton, string> = {
    primario: 'bg-violet-600 text-white hover:bg-violet-700',
    secundario: 'border border-stone-300 text-stone-600 hover:bg-stone-50',
    peligro: 'border border-red-300 text-red-600 hover:bg-red-50',
    fantasma: 'text-stone-500 hover:bg-stone-100 hover:text-stone-700',
    acento: 'border border-dashed border-violet-300 text-violet-600 hover:border-violet-500 hover:bg-violet-50',
};

const TAMAÑOS_BOTON: Record<TamañoBoton, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-sm',
};

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variante?: VarianteBoton;
    tamaño?: TamañoBoton;
    icono?: ReactNode;
    activo?: boolean;
}

export const Boton = ({
    variante = 'secundario',
    tamaño = 'md',
    icono,
    activo = false,
    className = '',
    children,
    ...props
}: BotonProps) => (
    <button
        className={`inline-flex items-center justify-center gap-1.5 font-bold rounded-lg transition-colors whitespace-nowrap ${
            TAMAÑOS_BOTON[tamaño]
        } ${
            activo
                ? 'bg-violet-600 text-white border border-violet-600 hover:bg-violet-700'
                : VARIANTES_BOTON[variante]
        } ${className}`}
        {...props}
    >
        {icono}
        {children}
    </button>
);

/* ---------------------------------------------------------------------- */
/* EstadoVacio: icono + titulo + descripcion opcional + accion opcional.
   Reemplaza las ~4 pantallas vacías armadas a mano (caja cerrada, sin
   sector, sin mesas, sin mesa seleccionada) por una sola plantilla.       */
/* ---------------------------------------------------------------------- */
interface EstadoVacioProps {
    icono: ReactNode;
    titulo: string;
    descripcion?: string;
    accion?: ReactNode;
    className?: string;
}

export const EstadoVacio = ({
    icono,
    titulo,
    descripcion,
    accion,
    className = '',
}: EstadoVacioProps) => (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-10 text-stone-400 ${className}`}>
        <div className="mb-3">{icono}</div>
        <p className="text-sm font-bold text-stone-500">{titulo}</p>
        {descripcion && <p className="text-xs mt-1">{descripcion}</p>}
        {accion && <div className="mt-4">{accion}</div>}
    </div>
);

/* ---------------------------------------------------------------------- */
/* ModalBase: overlay + contenedor centrado + ancho + titulo, todo fijo.
   Ningún modal vuelve a escribir "bg-black/40 backdrop-blur-sm..." a
   mano — así se corta de raíz la fuga a otra paleta (gray/indigo) que
   apareció en FormularioNuevoSector al no partir de una base común.      */
/* ---------------------------------------------------------------------- */
type AnchoModal = 'sm' | 'md' | 'lg';

const ANCHOS_MODAL: Record<AnchoModal, string> = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-lg',
};

interface ModalBaseProps {
    isOpen: boolean;
    onClose: () => void;
    titulo?: string;
    children: ReactNode;
    ancho?: AnchoModal;
}

export const ModalBase = ({ isOpen, onClose, titulo, children, ancho = 'sm' }: ModalBaseProps) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-150 p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white p-6 rounded-2xl shadow-2xl w-full ${ANCHOS_MODAL[ancho]} animate-in fade-in zoom-in duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {titulo && <h2 className="text-lg font-bold text-stone-800 mb-4">{titulo}</h2>}
                {children}
            </div>
        </div>
    );
};