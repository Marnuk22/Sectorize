import { useState, useRef } from 'react';
import PanelMesa from './mesa/PanelMesa.tsx';
import { useSalon } from '../context/index.ts';
import FormularioNuevaMesa from './mesa/FormularioNuevaMesa.tsx';
import { Plus, LayoutGrid, Move, Check } from 'lucide-react';
import type { MesaUI } from '../types';

// Tamaño de cada mesa en el lienzo (px)
const TAM_MESA = 76;
const GAP = 12;

const ContenedorMesas = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const { mesaSeleccionada, seleccionarMesa, agregarMesaASector, sectorSeleccionado, actualizarPosicionMesa } = useSalon();

    if (!sectorSeleccionado) return null;

    const handleCrearMesa = (nombreRecibido: string) => {
        agregarMesaASector(sectorSeleccionado.id, nombreRecibido);
        setIsModalOpen(false);
    };

    // Calcula la posición de una mesa: usa pos_x/pos_y si existe,
    // o una posición de grilla automática según su índice
    const posicionMesa = (mesa: MesaUI, indice: number, columnas: number) => {
        if (mesa.pos_x != null && mesa.pos_y != null) {
            return { x: mesa.pos_x, y: mesa.pos_y };
        }
        // Grilla automática para las que no tienen posición
        const col = indice % columnas;
        const fila = Math.floor(indice / columnas);
        return {
            x: col * (TAM_MESA + GAP),
            y: fila * (TAM_MESA + GAP),
        };
    };

    return (
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] min-h-0">

            {/* COLUMNA IZQUIERDA: lienzo de mesas */}
            <div className="flex flex-col overflow-hidden p-4">
                <div className="flex items-center justify-between mb-3 shrink-0">
                    <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
                        {sectorSeleccionado.nombre}
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Botón modo edición */}
                        <button
                            onClick={() => setModoEdicion(!modoEdicion)}
                            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${
                                modoEdicion
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'text-stone-500 border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                            {modoEdicion ? <><Check size={14} /> Listo</> : <><Move size={14} /> Acomodar</>}
                        </button>
                        <button
                            className="flex items-center gap-1 text-xs font-bold text-violet-600 border border-dashed border-violet-300 hover:border-violet-500 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Plus size={14} /> Mesa
                        </button>
                    </div>
                </div>

                {sectorSeleccionado.mesas.length > 0 ? (
                    <div
                        className={`relative flex-1 min-h-0 overflow-auto rounded-xl ${
                            modoEdicion ? 'bg-stone-100 border-2 border-dashed border-violet-200' : ''
                        }`}
                    >
                        {sectorSeleccionado.mesas.map((mesa, indice) => (
                            <MesaArrastrable
                                key={mesa.id}
                                mesa={mesa}
                                posicion={posicionMesa(mesa, indice, 5)}
                                modoEdicion={modoEdicion}
                                seleccionada={mesaSeleccionada?.id === mesa.id}
                                onSeleccionar={() => seleccionarMesa(mesa.id)}
                                onMover={(x, y) => actualizarPosicionMesa(mesa.id, x, y)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                        <LayoutGrid size={32} className="mb-2" />
                        <p className="text-sm">No hay mesas en este sector.</p>
                    </div>
                )}
            </div>

            {/* COLUMNA DERECHA: panel de la mesa */}
            <div className="lg:border-l border-stone-200 bg-stone-50/50 h-full min-h-0">
                {mesaSeleccionada ? (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
                            <h2 className="font-bold text-stone-800">{mesaSeleccionada.nombre}</h2>
                            <button
                                onClick={() => seleccionarMesa(null)}
                                className="text-xs text-stone-400 hover:text-stone-600"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <PanelMesa />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                        <LayoutGrid size={36} className="mb-3" />
                        <p className="text-sm font-medium">Seleccioná una mesa</p>
                        <p className="text-xs mt-1">para ver y cargar su pedido</p>
                    </div>
                )}
            </div>

            {/* Modal nueva mesa */}
            <FormularioNuevaMesa
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirmar={handleCrearMesa}
            />
        </div>
    );
};

// --- Mesa individual arrastrable ---
interface MesaArrastrableProps {
    mesa: MesaUI;
    posicion: { x: number; y: number };
    modoEdicion: boolean;
    seleccionada: boolean;
    onSeleccionar: () => void;
    onMover: (x: number, y: number) => void;
}

const MesaArrastrable = ({ mesa, posicion, modoEdicion, seleccionada, onSeleccionar, onMover }: MesaArrastrableProps) => {
    const [pos, setPos] = useState(posicion);
    const arrastrando = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const movido = useRef(false);

    // Si cambia la posición desde afuera (recarga), sincronizamos
    // (solo cuando no estamos arrastrando)
    if (!arrastrando.current && (pos.x !== posicion.x || pos.y !== posicion.y)) {
        // Evita sincronizar si el usuario acaba de mover
        if (!movido.current) {
            setPos(posicion);
        }
    }

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!modoEdicion) return;
        e.preventDefault();
        arrastrando.current = true;
        movido.current = false;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        offset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!arrastrando.current) return;
        movido.current = true;
        const contenedor = (e.currentTarget as HTMLElement).parentElement;
        if (!contenedor) return;
        const rectCont = contenedor.getBoundingClientRect();
        const nuevoX = e.clientX - rectCont.left - offset.current.x + contenedor.scrollLeft;
        const nuevoY = e.clientY - rectCont.top - offset.current.y + contenedor.scrollTop;
        setPos({
            x: Math.max(0, nuevoX),
            y: Math.max(0, nuevoY),
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!arrastrando.current) return;
        arrastrando.current = false;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        if (movido.current) {
            // Se arrastró: guardar la nueva posición
            onMover(Math.round(pos.x), Math.round(pos.y));
        } else {
            // No se movió (fue un toque): seleccionar
            if (!modoEdicion) onSeleccionar();
        }
    };

    const handleClick = () => {
        // En modo normal, el click selecciona
        if (!modoEdicion) onSeleccionar();
    };

    const ocupada = mesa.estado !== 'libre';

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: TAM_MESA,
                height: TAM_MESA,
                touchAction: 'none',
            }}
            className={`flex flex-col items-center justify-center rounded-xl border-2 transition-colors select-none
                ${modoEdicion ? 'cursor-move' : 'cursor-pointer'}
                ${seleccionada ? 'border-violet-500 ring-2 ring-violet-200' : 'border-transparent'}
                ${ocupada ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100'}`}
        >
            <span className="text-sm font-bold text-stone-800">{mesa.nombre}</span>
            <span className={`text-[10px] font-bold uppercase mt-0.5 ${ocupada ? 'text-red-500' : 'text-green-600'}`}>
                {mesa.estado}
            </span>
        </div>
    );
};

export default ContenedorMesas;