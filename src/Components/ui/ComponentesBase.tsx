import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Package } from 'lucide-react';

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
    none: '',
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
    onClick?: () => void;
    className?: string;
}

// `interactiva`/`onClick` agregan active:scale, que crea un stacking context y
// atrapa el z-index de un menú flotante hijo (ver CLAUDE.md). No usar en una
// Tarjeta que contenga un menú de acciones tipo ⋯.
export const Tarjeta = ({
    children,
    tono = 'neutral',
    padding = 'md',
    interactiva = false,
    onClick,
    className = '',
}: TarjetaProps) => {
    const clases = `rounded-2xl border text-left ${TONOS[tono]} ${PADDINGS[padding]} ${
        interactiva || onClick
            ? 'cursor-pointer transition-colors hover:border-violet-300 active:scale-[0.99]'
            : ''
    } ${className}`;

    if (onClick) {
        return <button type="button" onClick={onClick} className={clases}>{children}</button>;
    }

    return <div className={clases}>{children}</div>;
};

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
        className={`inline-flex items-center justify-center gap-1.5 font-bold rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${
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

/* ---------------------------------------------------------------------- */
/* Etiqueta: pill chico de estado (tono + texto). Reemplaza los
   `<span className="text-[10px] px-2 py-0.5 rounded-full ...">` a mano
   repetidos en Inventario ("Activo/Inactivo") e Historial (método de pago). */
/* ---------------------------------------------------------------------- */
const TONOS_ETIQUETA: Record<TonoDato, string> = {
    neutral: 'bg-stone-100 text-stone-500',
    exito: 'bg-green-50 text-green-700',
    alerta: 'bg-red-50 text-red-600',
    acento: 'bg-violet-50 text-violet-700',
};

interface EtiquetaProps {
    children: ReactNode;
    tono?: TonoDato;
    icono?: ReactNode;
    className?: string;
}

export const Etiqueta = ({ children, tono = 'neutral', icono, className = '' }: EtiquetaProps) => (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${TONOS_ETIQUETA[tono]} ${className}`}>
        {icono}
        {children}
    </span>
);

/* ---------------------------------------------------------------------- */
/* Campo: input con label arriba + texto de ayuda/error abajo. Reemplaza el
   bloque `<label>...</label><input className="border border-stone-200 ...">`
   repetido en PanelDatosLocal, PanelMiPlan, PanelConfiguracion, filtros de
   HistorialVentas.                                                        */
/* ---------------------------------------------------------------------- */
interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
    etiqueta: string;
    ayuda?: string;
    error?: string;
}

export const Campo = ({ etiqueta, ayuda, error, className = '', ...props }: CampoProps) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-stone-500">{etiqueta}</label>
        <input
            className={`border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${className}`}
            {...props}
        />
        {error ? (
            <p className="text-xs text-red-500">{error}</p>
        ) : ayuda ? (
            <p className="text-xs text-stone-400">{ayuda}</p>
        ) : null}
    </div>
);

/* ---------------------------------------------------------------------- */
/* TarjetaProducto: tarjeta de producto compartida entre la grilla de
   Inventario (con pill de estado, badges, línea de stock y acciones) y la
   de Mostrador (clickeable, sin acciones). Sobre `Tarjeta` para heredar
   borde/radio/padding. Si se le pasa `acciones` (con el menú ⋯ de
   Inventario), NO pasarle también `onClick`/`interactiva` — ver el gotcha
   de stacking context en el comentario de `Tarjeta`.                      */
/* ---------------------------------------------------------------------- */
const TONO_SUBTEXTO_STOCK: Record<'exito' | 'alerta' | 'neutral', string> = {
    exito: 'text-green-600',
    alerta: 'text-red-500',
    neutral: 'text-stone-400',
};

interface TarjetaProductoProps {
    nombre: string;
    precio: number;
    unidadLabel?: string;
    categoria?: string | null;
    stockInfo?: { texto: string; tono: 'exito' | 'alerta' | 'neutral' };
    pill?: ReactNode;
    badges?: ReactNode;
    acciones?: ReactNode;
    alerta?: boolean;
    onClick?: () => void;
    className?: string;
}

export const TarjetaProducto = ({
    nombre,
    precio,
    unidadLabel,
    categoria,
    stockInfo,
    pill,
    badges,
    acciones,
    alerta = false,
    onClick,
    className = '',
}: TarjetaProductoProps) => (
    <Tarjeta
        tono={alerta ? 'alerta' : 'neutral'}
        padding="sm"
        onClick={onClick}
        className={`relative ${className}`}
    >
        {pill && <div className="absolute top-2 right-2">{pill}</div>}
        <p className={`font-medium text-stone-800 text-sm truncate flex items-center gap-1 ${pill ? 'pr-12' : ''}`}>
            {badges}
            {nombre}
        </p>
        {categoria !== undefined && <p className="text-xs text-stone-400 mb-2">{categoria ?? 'Sin categoría'}</p>}
        <p className="font-bold text-stone-900">
            ${precio.toLocaleString()}
            {unidadLabel && <span className="text-xs font-normal text-stone-400"> {unidadLabel}</span>}
        </p>
        {stockInfo && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${TONO_SUBTEXTO_STOCK[stockInfo.tono]}`}>
                <Package size={11} />
                {stockInfo.texto}
            </p>
        )}
        {acciones && <div className="flex gap-1 mt-3">{acciones}</div>}
    </Tarjeta>
);

/* ---------------------------------------------------------------------- */
/* MenuFlotante: el desplegable "⋯" que nunca se sale de la pantalla.      */
/* ---------------------------------------------------------------------- */
/* Se renderiza en un portal al body con posición FIJA, calculada a partir
   del botón que lo abre: si no hay lugar abajo abre hacia arriba, y en
   horizontal se recorta contra el viewport.

   Por qué un portal y no un `absolute` dentro de la tarjeta: el menú
   estaba anclado con `absolute` dentro de la grilla, y esa grilla vive
   dentro de un `overflow-y-auto` — el recorte del contenedor se llevaba
   por delante las últimas opciones (el menú de producto tiene hasta 9
   ítems, ~300px, y siempre abría para abajo). Con `fixed` en el body el
   menú escapa del recorte y además se puede voltear según el espacio
   que haya de verdad.

   Uso:
     const botonRef = useRef<HTMLButtonElement>(null);
     <button ref={botonRef} onClick={() => setAbierto(a => !a)}>⋯</button>
     <MenuFlotante abierto={abierto} anclaRef={botonRef} onCerrar={() => setAbierto(false)}>
        ...items...
     </MenuFlotante>                                                        */

const MARGEN_MENU = 8;

interface MenuFlotanteProps {
    abierto: boolean;
    anclaRef: RefObject<HTMLElement | null>;
    onCerrar: () => void;
    children: ReactNode;
    ancho?: string;
    /** El menú toma el ancho del ancla (para desplegables de un input). */
    ajustar?: boolean;
    /** Fondo para cerrar al click afuera. False cuando el ancla es un input:
        el fondo se comería el click para seguir escribiendo. */
    conFondo?: boolean;
    className?: string;
}

export const MenuFlotante = ({ abierto, anclaRef, onCerrar, children, ancho = 'w-44', ajustar = false, conFondo = true, className = '' }: MenuFlotanteProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    // En ref para no re-disparar el efecto de posicionado cuando el padre
    // pasa un callback inline nuevo en cada render (mismo patrón que
    // useReconciliacionOffline).
    const onCerrarRef = useRef(onCerrar);
    useEffect(() => { onCerrarRef.current = onCerrar; }, [onCerrar]);

    const calcular = useCallback(() => {
        const ancla = anclaRef.current;
        const menu = menuRef.current;
        if (!ancla || !menu) return;

        const r = ancla.getBoundingClientRect();

        // El ancho se fija ANTES de medir el alto: si el menú copia el ancho
        // del ancla, el alto depende del ancho (el texto de cada ítem puede
        // partirse en dos líneas).
        if (ajustar) menu.style.width = `${r.width}px`;

        const alto = menu.offsetHeight;
        const anchoMenu = ajustar ? r.width : menu.offsetWidth;
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        // Si el ancla se fue de la pantalla (scrollear la grilla), el menú
        // no tiene a qué quedarse pegado: se cierra.
        if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) {
            onCerrarRef.current();
            return;
        }

        // Vertical: abajo por defecto; si no entra, para arriba; si tampoco
        // entra (viewport muy bajo), se ancla al borde y scrollea por dentro.
        let top = r.bottom + 4;
        if (top + alto > vh - MARGEN_MENU) {
            const arriba = r.top - 4 - alto;
            top = arriba >= MARGEN_MENU ? arriba : Math.max(MARGEN_MENU, vh - alto - MARGEN_MENU);
        }

        // Horizontal: alineado al borde derecho del ancla; si no entra, se
        // corre a la izquierda; nunca se sale del viewport.
        let left = r.right - anchoMenu;
        if (left + anchoMenu > vw - MARGEN_MENU) left = vw - anchoMenu - MARGEN_MENU;
        if (left < MARGEN_MENU) left = MARGEN_MENU;

        setPos({ top, left });
    }, [anclaRef, ajustar]);

    useLayoutEffect(() => {
        if (!abierto) return;

        calcular();

        // `capture`: los scrolls de contenedores internos (la grilla) también
        // mueven el ancla, así que hay que escucharlos para que el menú
        // siga pegado al botón.
        const alMover = () => calcular();
        const alPresionar = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCerrarRef.current();
        };
        window.addEventListener('scroll', alMover, true);
        window.addEventListener('resize', alMover);
        window.addEventListener('keydown', alPresionar);
        return () => {
            window.removeEventListener('scroll', alMover, true);
            window.removeEventListener('resize', alMover);
            window.removeEventListener('keydown', alPresionar);
        };
    }, [abierto, calcular]);

    if (!abierto) return null;

    return createPortal(
        <>
            {/* Fondo para cerrar al tocar afuera */}
            {conFondo && (
                <div className="fixed inset-0 z-40" onClick={() => onCerrarRef.current()} />
            )}

            <div
                ref={menuRef}
                className={`fixed z-50 bg-white border border-stone-200 rounded-xl shadow-xl py-1 overflow-y-auto ${ajustar ? '' : ancho} ${className}`}
                style={{
                    top: pos?.top ?? 0,
                    left: pos?.left ?? 0,
                    maxHeight: `calc(100vh - ${MARGEN_MENU * 2}px)`,
                    // Hasta tener la posición calculada no se muestra: evita
                    // el flash en la esquina (0,0).
                    visibility: pos ? 'visible' : 'hidden',
                }}
            >
                {children}
            </div>
        </>,
        document.body
    );
};