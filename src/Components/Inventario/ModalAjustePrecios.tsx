import { useState, useMemo } from 'react';
import { X, TrendingUp, Check, AlertCircle } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import { calcularPrecioNuevo, type TipoAjuste, type TipoRedondeo } from '../../logic/ajustePrecios';

interface Props {
    onCerrar: () => void;
}

type Alcance = 'todos' | 'categoria' | 'seleccion';

const ModalAjustePrecios = ({ onCerrar }: Props) => {
    const { productos, categorias, actualizarPreciosMasivo } = useMenu();

    const [alcance, setAlcance] = useState<Alcance>('todos');
    const [categoriaElegida, setCategoriaElegida] = useState('');
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [tipoAjuste, setTipoAjuste] = useState<TipoAjuste>('porcentaje');
    const [valor, setValor] = useState('');
    const [redondeo, setRedondeo] = useState<TipoRedondeo>('decena');
    const [aplicando, setAplicando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState<number | null>(null);

    // Productos afectados según el alcance
    const productosAfectados = useMemo(() => {
        if (alcance === 'todos') return productos;
        if (alcance === 'categoria') {
            const cat = categorias.find(c => c.id === categoriaElegida);
            return productos.filter(p => p.categoria === cat?.nombre);
        }
        return productos.filter(p => seleccionados.has(p.id));
    }, [alcance, categoriaElegida, seleccionados, productos, categorias]);

    const valorNum = parseFloat(valor) || 0;

    // Vista previa: precio viejo → nuevo de cada afectado
    const previa = useMemo(() => {
        return productosAfectados.map(p => ({
            id: p.id,
            nombre: p.nombre,
            precioViejo: p.precio_venta,
            precioNuevo: calcularPrecioNuevo(p.precio_venta, tipoAjuste, valorNum, redondeo),
        }));
    }, [productosAfectados, tipoAjuste, valorNum, redondeo]);

    const toggleSeleccion = (id: string) => {
        setSeleccionados(prev => {
            const nuevo = new Set(prev);
            if (nuevo.has(id)) nuevo.delete(id);
            else nuevo.add(id);
            return nuevo;
        });
    };

    const handleAplicar = async () => {
        if (valorNum === 0) { setError('Ingresá un valor de ajuste'); return; }
        if (productosAfectados.length === 0) { setError('No hay productos seleccionados'); return; }

        setAplicando(true);
        setError('');
        try {
            const cambios = previa.map(p => ({ id: p.id, precio_venta: p.precioNuevo }));
            await actualizarPreciosMasivo(cambios);
            setExito(cambios.length);
            setTimeout(() => { onCerrar(); }, 2000);
        } catch (err: any) {
            setError('No se pudieron actualizar los precios. Intentá de nuevo.');
        } finally {
            setAplicando(false);
        }
    };

    if (exito !== null) {
        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <div className="inline-flex p-4 bg-green-100 rounded-full mb-3">
                        <Check size={32} className="text-green-600" />
                    </div>
                    <h3 className="font-bold text-stone-800 text-lg">Precios actualizados</h3>
                    <p className="text-sm text-stone-500 mt-1">
                        Se actualizaron <strong className="text-green-600">{exito}</strong> productos correctamente.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-violet-100 rounded-xl">
                            <TrendingUp size={20} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-stone-800 text-lg">Ajustar precios</h2>
                            <p className="text-xs text-stone-400">Actualizá varios precios de una vez</p>
                        </div>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Zona 1: Alcance */}
                    <div>
                        <label className="text-sm font-medium text-stone-700 block mb-2">¿A qué productos?</label>
                        <div className="grid grid-cols-3 gap-2">
                            {([['todos', 'Todos'], ['categoria', 'Por categoría'], ['seleccion', 'Elegir']] as [Alcance, string][]).map(([val, label]) => (
                                <button
                                    key={val}
                                    onClick={() => setAlcance(val)}
                                    className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                                        alcance === val ? 'bg-violet-50 border-violet-300 text-violet-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Selector de categoría */}
                        {alcance === 'categoria' && (
                            <select
                                value={categoriaElegida}
                                onChange={e => setCategoriaElegida(e.target.value)}
                                className="w-full mt-2 border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="">Elegí una categoría</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        )}

                        {/* Selección manual */}
                        {alcance === 'seleccion' && (
                            <div className="mt-2 border border-stone-200 rounded-xl max-h-40 overflow-y-auto">
                                {productos.map(p => (
                                    <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-none">
                                        <input
                                            type="checkbox"
                                            checked={seleccionados.has(p.id)}
                                            onChange={() => toggleSeleccion(p.id)}
                                            className="accent-violet-600"
                                        />
                                        <span className="text-sm text-stone-700 flex-1">{p.nombre}</span>
                                        <span className="text-xs text-stone-400">${p.precio_venta.toLocaleString()}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Zona 2: Ajuste */}
                    <div>
                        <label className="text-sm font-medium text-stone-700 block mb-2">¿Cuánto ajustar?</label>
                        <div className="flex gap-2">
                            <select
                                value={tipoAjuste}
                                onChange={e => setTipoAjuste(e.target.value as TipoAjuste)}
                                className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="porcentaje">Porcentaje (%)</option>
                                <option value="monto">Monto fijo ($)</option>
                            </select>
                            <input
                                type="number"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                placeholder={tipoAjuste === 'porcentaje' ? 'Ej: 10 (o -5 para bajar)' : 'Ej: 500'}
                                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <p className="text-xs text-stone-400 mt-1">
                            {tipoAjuste === 'porcentaje' ? 'Usá números negativos para bajar precios (ej: -10)' : 'Se suma este monto a cada precio'}
                        </p>
                    </div>

                    {/* Zona 3: Redondeo */}
                    <div>
                        <label className="text-sm font-medium text-stone-700 block mb-2">Redondeo</label>
                        <div className="grid grid-cols-4 gap-2">
                            {([['ninguno', 'Sin redondeo'], ['entero', 'Al entero'], ['decena', 'A la decena'], ['centena', 'A la centena']] as [TipoRedondeo, string][]).map(([val, label]) => (
                                <button
                                    key={val}
                                    onClick={() => setRedondeo(val)}
                                    className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                                        redondeo === val ? 'bg-violet-50 border-violet-300 text-violet-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vista previa */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-stone-700">Vista previa</label>
                            <span className="text-xs text-stone-400">{previa.length} productos afectados</span>
                        </div>
                        {previa.length === 0 ? (
                            <p className="text-sm text-stone-400 text-center py-4 border border-stone-200 rounded-xl">
                                No hay productos seleccionados
                            </p>
                        ) : (
                            <div className="border border-stone-200 rounded-xl max-h-52 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-stone-600">Producto</th>
                                            <th className="px-3 py-2 text-right font-medium text-stone-600">Antes</th>
                                            <th className="px-3 py-2 text-right font-medium text-stone-600">Después</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previa.slice(0, 100).map(p => (
                                            <tr key={p.id} className="border-t border-stone-100">
                                                <td className="px-3 py-2 text-stone-700 truncate max-w-[200px]">{p.nombre}</td>
                                                <td className="px-3 py-2 text-right text-stone-400">${p.precioViejo.toLocaleString()}</td>
                                                <td className="px-3 py-2 text-right font-bold text-violet-700">${p.precioNuevo.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                            <AlertCircle size={16} className="shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t border-stone-200 shrink-0">
                    <button
                        onClick={onCerrar}
                        className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAplicar}
                        disabled={aplicando || previa.length === 0 || valorNum === 0}
                        className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold"
                    >
                        {aplicando ? 'Aplicando...' : `Aplicar a ${previa.length} productos`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalAjustePrecios;