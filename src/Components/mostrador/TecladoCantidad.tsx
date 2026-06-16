import { useState, useEffect } from 'react';
import { X, Delete, Check } from 'lucide-react';
import type { Producto } from '../../types';
import { UNIDADES } from '../../config/unidades';

interface Props {
    producto: Producto;
    onConfirmar: (cantidad: number) => void;
    onCerrar: () => void;
}

const TecladoCantidad = ({ producto, onConfirmar, onCerrar }: Props) => {
    const [valor, setValor] = useState('');
    const unidad = UNIDADES[producto.unidad_medida].label;

    const cantidad = parseFloat(valor) || 0;
    const totalEstimado = Math.round(producto.precio_venta * cantidad);

    const teclear = (t: string) => {
        // Evitar más de un punto decimal
        if (t === '.' && valor.includes('.')) return;
        // Evitar empezar con punto
        if (t === '.' && valor === '') { setValor('0.'); return; }
        // Limitar a 3 decimales
        if (valor.includes('.')) {
            const decimales = valor.split('.')[1];
            if (decimales && decimales.length >= 3 && t !== '.') return;
        }
        setValor(valor + t);
    };

    const borrar = () => setValor(valor.slice(0, -1));

    const confirmar = () => {
        if (cantidad > 0) {
            onConfirmar(cantidad);
            onCerrar();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                teclear(e.key);
            } else if (e.key === '.' || e.key === ',') {
                // Punto o coma (en teclados en español la coma es el decimal)
                teclear('.');
            } else if (e.key === 'Backspace') {
                borrar();
            } else if (e.key === 'Enter') {
                confirmar();
            } else if (e.key === 'Escape') {
                onCerrar();
            }
        };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    });

    const teclas = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0'];

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-200">
                    <div className="min-w-0">
                        <p className="font-bold text-stone-800 truncate">{producto.nombre}</p>
                        <p className="text-xs text-stone-400">
                            ${producto.precio_venta.toLocaleString('es-AR')} por {unidad}
                        </p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Display estilo balanza */}
                <div className="bg-stone-50 px-4 py-5 text-center border-b border-stone-200">
                    <div className="flex items-end justify-center gap-2">
                        <span className="text-4xl font-black text-stone-800 tabular-nums">
                            {valor || '0'}
                        </span>
                        <span className="text-lg font-medium text-stone-400 mb-1">{unidad}</span>
                    </div>
                    <p className="text-sm text-violet-600 font-bold mt-2">
                        Total: ${totalEstimado.toLocaleString('es-AR')}
                    </p>
                </div>

                {/* Teclado */}
                <div className="grid grid-cols-3 gap-1 p-3">
                    {teclas.map(t => (
                        <button
                            key={t}
                            onClick={() => teclear(t)}
                            className="py-4 text-xl font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors"
                        >
                            {t}
                        </button>
                    ))}
                    <button
                        onClick={borrar}
                        className="py-4 flex items-center justify-center text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors"
                    >
                        <Delete size={20} />
                    </button>
                </div>

                {/* Confirmar */}
                <div className="p-3 pt-0">
                    <button
                        onClick={confirmar}
                        disabled={cantidad <= 0}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <Check size={18} /> Agregar al carrito
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TecladoCantidad;