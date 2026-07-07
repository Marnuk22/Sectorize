import { useState } from 'react';
import { Search, Plus } from 'lucide-react'; // Iconos de la librería que instalamos
import {type Producto } from  "../../types/index.ts"; // La base de datos y el tipo
import { useMenu } from '../../context/MenuContext.tsx';

interface MenuDisplayProps {
    onSeleccionar: (producto: Producto) => void; // Función que le avisa al padre qué elegimos
}

const MenuDisplay = ({ onSeleccionar }: MenuDisplayProps) => {
        const  {productos} = useMenu();
    // 1. Estado para lo que el usuario escribe en el input
    const [busqueda, setBusqueda] = useState("");
    
    // 2. Lógica de filtrado (Se ejecuta en cada renderizado)
    const resultados = busqueda.trim() === "" 
        ? [] // Si el input está vacío, no mostramos nada
        : productos.filter(p => 
           p.activo && p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        );

    return (
        <div className="relative w-full"> {/* 'relative' para que la lista flote respecto a este div */}
            <div className="relative flex items-center">
                <Search className="absolute left-4 text-stone-400" size={18} />
                <input 
                    type="text"
                    className="w-full pl-12 pr-4 py-4 bg-stone-100 border-none rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none font-medium transition-all"
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)} // Actualiza el estado con cada tecla
                />
            </div>
        {/* Si hay resultados, mostramos este bloque */}
            {resultados.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 z-150 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-75 overflow-y-auto"> {/* Scroll interno si hay muchos productos */}
                        {resultados.map((producto) => (
                            <button
                                key={producto.id}
                                onClick={() => {
                                    onSeleccionar(producto); // Enviamos el producto al pedido
                                    setBusqueda(""); // ¡IMPORTANTE! Limpiamos el buscador al terminar
                                }}
                                className="w-full flex justify-between items-center p-4 hover:bg-violet-50 border-b border-stone-50 last:border-none transition-colors group"
                            >
                                <div className="text-left">
                                    <p className="font-bold text-stone-800">{producto.nombre}</p>
                                    <p className="text-xs text-stone-400 uppercase">{producto.categoria}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-violet-600">${producto.precio_venta.toLocaleString()}</span>
                                    <Plus size={16} className="text-violet-600" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
export default MenuDisplay;