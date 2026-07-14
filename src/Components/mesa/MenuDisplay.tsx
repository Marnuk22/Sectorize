import { useState } from 'react';
import { Search, Plus, Star } from 'lucide-react';
import { type Producto } from "../../types/index.ts";
import { useMenu } from '../../context/MenuContext.tsx';
import { useFavoritos } from '../../hooks/useFavoritos';

interface MenuDisplayProps {
    onSeleccionar: (producto: Producto) => void;
}

const MenuDisplay = ({ onSeleccionar }: MenuDisplayProps) => {
    const { productos } = useMenu();
    const { favoritos } = useFavoritos(6);
    const [busqueda, setBusqueda] = useState("");

    const resultados = busqueda.trim() === ""
        ? []
        : productos.filter(p =>
            p.activo && p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        );

    return (
        <div className="w-full space-y-2">
            {/* Accesos rápidos: solo cuando no se está buscando */}
            {busqueda.trim() === "" && favoritos.length > 0 && (
                <div>
                    <p className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                        <Star size={10} className="text-amber-400 fill-amber-400" /> Accesos rápidos
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {favoritos.map(producto => (
                            <button
                                key={producto.id}
                                onClick={() => onSeleccionar(producto)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-700 hover:bg-violet-50 hover:border-violet-200 transition-colors"
                            >
                                {producto.nombre}
                                <span className="text-violet-600 font-bold">${producto.precio_venta.toLocaleString()}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Buscador */}
            <div className="relative w-full">
                <div className="relative flex items-center">
                    <Search className="absolute left-4 text-stone-400" size={18} />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-stone-100 border-none rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none font-medium transition-all"
                        placeholder="Buscar producto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {resultados.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-75 overflow-y-auto">
                            {resultados.map((producto) => (
                                <button
                                    key={producto.id}
                                    onClick={() => {
                                        onSeleccionar(producto);
                                        setBusqueda("");
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
        </div>
    );
};

export default MenuDisplay;