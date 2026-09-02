import { useState } from 'react';
import { X, Loader2, AlertCircle, AlertTriangle, Trash2, Plus, ArrowLeft, Mic, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMenu } from '../../context/MenuContext';
import { supabase } from '../../lib/supabase';
import { Tarjeta, Etiqueta } from '../ui/ComponentesBase';
import GrabadorAudio from './GrabadorAudio';

// Formas efímeras de esta pantalla (lo que devuelve extraer-inventario, más
// un id local para la tabla editable) — no son una entidad de la base ni un
// tipo UI persistente, por eso viven acá y no en types/index.ts.
type Confianza = 'alta' | 'baja';
type TipoVenta = 'unidad' | 'granel';

interface ProductoExtraido {
    nombre: string;
    precio: number | null;
    tipo: TipoVenta;
    cantidad: number | null;
    categoria: string;
    confianza: Confianza;
}

interface ProductoRevision extends ProductoExtraido {
    id: string;
}

interface Props {
    onCerrar: () => void;
}

type Paso = 'grabar' | 'procesando' | 'revisar' | 'guardando';

const idLocal = () => Math.random().toString(36).slice(2);

const inputClase = 'w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500';

const ModalCargaAudio = ({ onCerrar }: Props) => {
    const { local } = useAuth();
    const { categorias, agregarProducto, agregarCategoria } = useMenu();
    const [paso, setPaso] = useState<Paso>('grabar');
    const [audio, setAudio] = useState<Blob | null>(null);
    const [transcripcion, setTranscripcion] = useState('');
    const [productos, setProductos] = useState<ProductoRevision[]>([]);
    const [error, setError] = useState('');
    const [progreso, setProgreso] = useState(0);
    const [resultado, setResultado] = useState<{ ok: number; fallidos: number } | null>(null);

    const handleProcesar = async () => {
        if (!audio) return;
        setPaso('procesando');
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa');

            const form = new FormData();
            form.append('audio', audio, 'grabacion.webm');
            form.append('categorias', categorias.map(c => c.nombre).join(','));

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extraer-inventario`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                    body: form,
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'No se pudo procesar el audio');

            setTranscripcion(data.transcripcion ?? '');
            const extraidos: ProductoExtraido[] = data.productos ?? [];
            const conId: ProductoRevision[] = extraidos.map((p) => ({ ...p, id: idLocal() }));
            // Confianza "baja" primero, para que el usuario las revise antes que nada.
            conId.sort((a, b) => (a.confianza === b.confianza ? 0 : a.confianza === 'baja' ? -1 : 1));
            setProductos(conId);
            setPaso('revisar');
        } catch (err: any) {
            setError(err.message ?? 'Ocurrió un error procesando el audio');
            setPaso('grabar');
        }
    };

    const actualizarFila = (id: string, cambios: Partial<ProductoRevision>) => {
        setProductos(prev => prev.map(p => (p.id === id ? { ...p, ...cambios } : p)));
    };

    const borrarFila = (id: string) => {
        setProductos(prev => prev.filter(p => p.id !== id));
    };

    const agregarFila = () => {
        setProductos(prev => [
            ...prev,
            { id: idLocal(), nombre: '', precio: null, tipo: 'unidad', cantidad: null, categoria: categorias[0]?.nombre ?? '', confianza: 'alta' },
        ]);
    };

    // El nombre es obligatorio para poder identificar el producto, y el
    // precio porque precio_venta no es nullable en la base (un producto sin
    // precio se podría vender gratis por error) — cantidad sí puede faltar,
    // el producto arranca con stock 0 y se carga después.
    const hayCamposObligatoriosFaltantes = productos.some(p => !p.nombre.trim() || p.precio === null);

    // Fase 3: inserción real al inventario. Reusa agregarProducto() de
    // useMenu(), que ya sabe resolver catálogo compartido vs. directo según
    // el negocio (ver MenuContext.tsx) — no hace falta lógica nueva para eso
    // acá. Va secuencial (no Promise.all) y con progreso, mismo patrón que
    // ModalImportar.tsx, para poder reportar cuántos fallaron sin perder los
    // que sí funcionaron.
    const confirmarProductos = async (productosAConfirmar: ProductoRevision[]) => {
        setPaso('guardando');
        setProgreso(0);

        // Categorías nuevas que el usuario escribió a mano (no estaban en
        // useMenu().categorias) — se crean antes para que el producto quede
        // filtrable en el sidebar de Inventario, no solo con el texto suelto.
        const nombresExistentes = new Set(categorias.map(c => c.nombre));
        const categoriasNuevas = [...new Set(
            productosAConfirmar
                .map(p => p.categoria.trim())
                .filter(nombre => nombre && !nombresExistentes.has(nombre))
        )];
        for (const nombre of categoriasNuevas) {
            try { await agregarCategoria(nombre); } catch (err) { console.error('No se pudo crear la categoría', nombre, err); }
        }

        let ok = 0;
        let fallidos = 0;
        for (let i = 0; i < productosAConfirmar.length; i++) {
            const p = productosAConfirmar[i];
            try {
                await agregarProducto({
                    nombre: p.nombre.trim(),
                    descripcion: null,
                    categoria: p.categoria.trim() || null,
                    precio_venta: p.precio ?? 0,
                    precio_costo: null,
                    stock_actual: p.cantidad ?? 0,
                    stock_minimo: 0,
                    codigo_barras: null,
                    activo: true,
                    tipo_venta: p.tipo,
                    unidad_medida: p.tipo === 'granel' ? 'kg' : 'unidad',
                    favorito: false,
                    publicado: false,
                    imagen_url: null,
                });
                ok++;
            } catch (err) {
                console.error(`Error cargando "${p.nombre}":`, err);
                fallidos++;
            }
            setProgreso(Math.round(((i + 1) / productosAConfirmar.length) * 100));
        }

        setResultado({ ok, fallidos });
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-200 shrink-0">
                    <div>
                        <h2 className="font-bold text-stone-800 text-lg">Cargar inventario por audio</h2>
                        <p className="text-xs text-stone-400 mt-0.5">
                            Se va a cargar en: <strong className="text-stone-600">{local?.nombre}</strong>
                        </p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-5">
                    {paso === 'grabar' && (
                        <div className="space-y-4">
                            <p className="text-sm text-stone-500">
                                Grabá o subí un audio contando los productos, precios y cantidades — por ejemplo:
                                "Milanesa de carne, doce mil el kilo, tengo veinte kilos".
                            </p>
                            <GrabadorAudio onCambio={setAudio} />
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                                    <AlertCircle size={16} className="shrink-0" /> {error}
                                </div>
                            )}
                        </div>
                    )}

                    {paso === 'procesando' && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <Loader2 size={32} className="text-violet-600 animate-spin" />
                            <p className="text-sm text-stone-500">Transcribiendo y extrayendo productos... puede tardar unos segundos.</p>
                        </div>
                    )}

                    {paso === 'guardando' && !resultado && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <Loader2 size={32} className="text-violet-600 animate-spin" />
                            <p className="text-sm text-stone-500">Cargando productos al inventario... {progreso}%</p>
                            <div className="w-full max-w-xs h-2 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-600 transition-all" style={{ width: `${progreso}%` }} />
                            </div>
                        </div>
                    )}

                    {paso === 'guardando' && resultado && (
                        <div className="text-center py-6 space-y-3">
                            <div className="inline-flex p-4 bg-green-100 rounded-full">
                                <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-lg">Carga completada</h3>
                                <p className="text-sm text-stone-500 mt-1">
                                    Se cargaron <strong className="text-green-600">{resultado.ok}</strong> productos al inventario
                                    {resultado.fallidos > 0 && <>, <strong className="text-red-500">{resultado.fallidos}</strong> fallaron</>}.
                                </p>
                            </div>
                        </div>
                    )}

                    {paso === 'revisar' && (
                        <div className="space-y-4">
                            {transcripcion && (
                                <Tarjeta tono="neutral" padding="sm">
                                    <p className="text-xs font-bold text-stone-400 uppercase mb-1">Lo que se entendió</p>
                                    <p className="text-sm text-stone-600">{transcripcion}</p>
                                </Tarjeta>
                            )}

                            <div className="border border-stone-200 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-stone-50">
                                            <tr>
                                                <th className="px-2 py-2 text-left font-medium text-stone-600">Nombre</th>
                                                <th className="px-2 py-2 text-left font-medium text-stone-600">Precio</th>
                                                <th className="px-2 py-2 text-left font-medium text-stone-600">Tipo</th>
                                                <th className="px-2 py-2 text-left font-medium text-stone-600">Cantidad</th>
                                                <th className="px-2 py-2 text-left font-medium text-stone-600">Categoría</th>
                                                <th className="px-2 py-2 text-left font-medium text-stone-600">Confianza</th>
                                                <th className="px-2 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productos.map(p => (
                                                <FilaProducto
                                                    key={p.id}
                                                    producto={p}
                                                    categorias={categorias.map(c => c.nombre)}
                                                    onCambio={cambios => actualizarFila(p.id, cambios)}
                                                    onBorrar={() => borrarFila(p.id)}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {productos.length === 0 && (
                                    <p className="text-center text-stone-400 text-sm py-6">
                                        No quedan productos — agregá uno o volvé a grabar.
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={agregarFila}
                                className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium"
                            >
                                <Plus size={15} /> Agregar fila
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {paso === 'grabar' && (
                    <div className="p-5 border-t border-stone-200 shrink-0">
                        <button
                            onClick={handleProcesar}
                            disabled={!audio}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <Mic size={16} /> Procesar audio
                        </button>
                    </div>
                )}
                {paso === 'revisar' && (
                    <div className="flex gap-3 p-5 border-t border-stone-200 shrink-0">
                        <button
                            onClick={() => { setPaso('grabar'); setAudio(null); }}
                            className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-1.5"
                        >
                            <ArrowLeft size={15} /> Volver a grabar
                        </button>
                        <button
                            onClick={() => confirmarProductos(productos)}
                            disabled={hayCamposObligatoriosFaltantes || productos.length === 0}
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold"
                        >
                            Confirmar {productos.length} producto{productos.length === 1 ? '' : 's'}
                        </button>
                    </div>
                )}
                {paso === 'guardando' && resultado && (
                    <div className="p-5 border-t border-stone-200 shrink-0">
                        <button
                            onClick={onCerrar}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold"
                        >
                            Listo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Fila editable de la tabla de revisión ---
interface FilaProductoProps {
    producto: ProductoRevision;
    categorias: string[];
    onCambio: (cambios: Partial<ProductoRevision>) => void;
    onBorrar: () => void;
}

const FilaProducto = ({ producto, categorias, onCambio, onBorrar }: FilaProductoProps) => {
    const nombreVacio = !producto.nombre.trim();
    const faltaPrecio = producto.precio === null;
    const faltaCantidad = producto.cantidad === null;
    const esBaja = producto.confianza === 'baja';

    return (
        <tr className={esBaja ? '!bg-amber-50' : ''}>
            <td className="px-2 py-1.5 border-t border-stone-100">
                <input
                    className={`${inputClase} ${nombreVacio ? 'border-red-400 focus:ring-red-400' : ''}`}
                    value={producto.nombre}
                    onChange={e => onCambio({ nombre: e.target.value })}
                    placeholder="Nombre"
                />
            </td>
            <td className="px-2 py-1.5 border-t border-stone-100">
                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        step="any"
                        className={`${inputClase} ${faltaPrecio ? 'border-red-400 focus:ring-red-400' : ''}`}
                        value={producto.precio ?? ''}
                        onChange={e => onCambio({ precio: e.target.value === '' ? null : Number(e.target.value) })}
                        placeholder="$"
                    />
                    {faltaPrecio && (
                        <span title="Falta el precio (obligatorio)"><AlertTriangle size={12} className="text-red-500 shrink-0" /></span>
                    )}
                </div>
            </td>
            <td className="px-2 py-1.5 border-t border-stone-100">
                <select
                    className={inputClase}
                    value={producto.tipo}
                    onChange={e => onCambio({ tipo: e.target.value as TipoVenta })}
                >
                    <option value="unidad">Unidad</option>
                    <option value="granel">Granel</option>
                </select>
            </td>
            <td className="px-2 py-1.5 border-t border-stone-100">
                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        step="any"
                        className={inputClase}
                        value={producto.cantidad ?? ''}
                        onChange={e => onCambio({ cantidad: e.target.value === '' ? null : Number(e.target.value) })}
                        placeholder="Cant."
                    />
                    {faltaCantidad && (
                        <span title="Falta la cantidad"><AlertTriangle size={12} className="text-amber-500 shrink-0" /></span>
                    )}
                </div>
            </td>
            <td className="px-2 py-1.5 border-t border-stone-100">
                {/* input + datalist: deja elegir una categoría existente O escribir una nueva */}
                <input
                    list={`categorias-${producto.id}`}
                    className={inputClase}
                    value={producto.categoria}
                    onChange={e => onCambio({ categoria: e.target.value })}
                    placeholder="Categoría"
                />
                <datalist id={`categorias-${producto.id}`}>
                    {categorias.map(c => <option key={c} value={c} />)}
                </datalist>
            </td>
            <td className="px-2 py-1.5 border-t border-stone-100">
                <Etiqueta tono={esBaja ? 'neutral' : 'exito'} className={esBaja ? '!bg-amber-100 !text-amber-700' : ''}>
                    {esBaja ? 'Baja' : 'Alta'}
                </Etiqueta>
            </td>
            <td className="px-2 py-1.5 border-t border-stone-100">
                <button onClick={onBorrar} className="p-1 text-stone-400 hover:text-red-500" title="Borrar fila">
                    <Trash2 size={14} />
                </button>
            </td>
        </tr>
    );
};

export default ModalCargaAudio;
