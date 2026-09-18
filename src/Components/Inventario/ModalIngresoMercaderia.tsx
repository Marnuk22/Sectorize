import { useState, useMemo } from 'react';
import { X, Search, Trash2, PackagePlus, Loader2, CheckCircle2, ArrowRight, Camera } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import type { Producto } from '../../types';
import ModalEscanerCamara from './ModalEscanerCamara';

interface FilaExistente {
    id: string; // = producto.id
    tipo: 'existente';
    producto: Producto;
    cantidad: string;
    costo: string;
}
interface FilaNueva {
    id: string; // id local
    tipo: 'nuevo';
    nombre: string;
    precio: string;
    cantidad: string;
    costo: string;
}
type Fila = FilaExistente | FilaNueva;

// Campos editables desde la fila — se usa en vez de Partial<FilaExistente &
// FilaNueva> porque esa intersección colapsa `tipo` a `never` (los dos
// literales no pueden coexistir), lo que rompe el spread.
type CamposEditables = { nombre?: string; precio?: string; cantidad?: string; costo?: string };

const idLocal = () => Math.random().toString(36).slice(2);
const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
const inputClase = 'w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500';

interface Props {
    onCerrar: () => void;
}

const ModalIngresoMercaderia = ({ onCerrar }: Props) => {
    const { productos, agregarProducto, registrarMovimientoStock } = useMenu();
    const [busqueda, setBusqueda] = useState('');
    const [modalEscaner, setModalEscaner] = useState(false);
    const [filas, setFilas] = useState<Fila[]>([]);
    const [guardando, setGuardando] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [resultado, setResultado] = useState<{ ok: number; fallidos: number } | null>(null);

    const idsAgregados = useMemo(
        () => new Set(filas.filter((f): f is FilaExistente => f.tipo === 'existente').map(f => f.producto.id)),
        [filas]
    );

    const coincidencias = useMemo(() => {
        if (!busqueda.trim()) return [];
        const q = busqueda.toLowerCase();
        return productos
            .filter(p => !idsAgregados.has(p.id))
            .filter(p => p.nombre.toLowerCase().includes(q) || p.codigo_barras?.toLowerCase().includes(q))
            .slice(0, 8);
    }, [busqueda, productos, idsAgregados]);

    const agregarExistente = (producto: Producto) => {
        setFilas(prev => [...prev, { id: producto.id, tipo: 'existente', producto, cantidad: '', costo: '' }]);
        setBusqueda('');
    };

    const agregarNuevo = () => {
        setFilas(prev => [...prev, { id: idLocal(), tipo: 'nuevo', nombre: busqueda.trim(), precio: '', cantidad: '', costo: '' }]);
        setBusqueda('');
    };

    const actualizarFila = (id: string, cambios: CamposEditables) => {
        setFilas(prev => prev.map(f => f.id === id ? { ...f, ...cambios } as Fila : f));
    };

    const borrarFila = (id: string) => setFilas(prev => prev.filter(f => f.id !== id));

    // Cantidad > 0 es obligatoria en toda fila (acá se SUMA, nunca se
    // reemplaza — un producto nuevo sin cantidad no tiene sentido en esta
    // pantalla). Para filas nuevas, nombre y precio también son obligatorios
    // (mismo criterio que ModalCargaAudio).
    const filaInvalida = (f: Fila) => {
        const cant = parseFloat(f.cantidad);
        if (isNaN(cant) || cant <= 0) return true;
        if (f.tipo === 'nuevo') {
            if (!f.nombre.trim() || isNaN(parseFloat(f.precio))) return true;
        }
        return false;
    };
    const hayCamposFaltantes = filas.some(filaInvalida);

    // Secuencial (no Promise.all) y con progreso — mismo patrón que
    // ModalImportar/ModalCargaAudio, para reportar cuántos fallaron sin
    // perder los que sí se cargaron.
    const handleConfirmar = async () => {
        setGuardando(true);
        setProgreso(0);
        let ok = 0, fallidos = 0;

        for (let i = 0; i < filas.length; i++) {
            const f = filas[i];
            try {
                const cantidad = parseFloat(f.cantidad);
                const costo = f.costo.trim() ? parseFloat(f.costo) : null;

                if (f.tipo === 'nuevo') {
                    // Se crea con stock 0 y la RPC de abajo lo sube al
                    // ingresado — así el primer movimiento del kardex queda
                    // registrado en vez de contarse dos veces.
                    const creado = await agregarProducto({
                        nombre: f.nombre.trim(),
                        descripcion: null,
                        categoria: null,
                        precio_venta: parseFloat(f.precio),
                        precio_costo: costo,
                        stock_actual: 0,
                        stock_minimo: 0,
                        codigo_barras: null,
                        activo: true,
                        tipo_venta: 'unidad',
                        unidad_medida: 'unidad',
                        favorito: false,
                        publicado: false,
                        imagen_url: null,
                        tiendanube_producto_id: null,
                        tiendanube_variant_id: null,
                    });
                    await registrarMovimientoStock(creado.id, cantidad, 'ingreso', costo);
                } else {
                    await registrarMovimientoStock(f.producto.id, cantidad, 'ingreso', costo);
                }
                ok++;
            } catch (err) {
                console.error('Error registrando ingreso:', err);
                fallidos++;
            }
            setProgreso(Math.round(((i + 1) / filas.length) * 100));
        }

        setResultado({ ok, fallidos });
        setGuardando(false);
    };

    return (
        <>
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-200 shrink-0">
                    <div>
                        <h2 className="font-bold text-stone-800 text-lg">Ingreso de mercadería</h2>
                        <p className="text-xs text-stone-400 mt-0.5">Recepción por lote — la cantidad se SUMA al stock actual.</p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {guardando && !resultado && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <Loader2 size={32} className="text-violet-600 animate-spin" />
                            <p className="text-sm text-stone-500">Registrando ingreso... {progreso}%</p>
                            <div className="w-full max-w-xs h-2 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-600 transition-all" style={{ width: `${progreso}%` }} />
                            </div>
                        </div>
                    )}

                    {resultado && (
                        <div className="text-center py-6 space-y-3">
                            <div className="inline-flex p-4 bg-green-100 rounded-full">
                                <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-lg">Ingreso registrado</h3>
                                <p className="text-sm text-stone-500 mt-1">
                                    Se actualizó el stock de <strong className="text-green-600">{resultado.ok}</strong> producto{resultado.ok === 1 ? '' : 's'}
                                    {resultado.fallidos > 0 && <>, <strong className="text-red-500">{resultado.fallidos}</strong> fallaron</>}.
                                </p>
                            </div>
                        </div>
                    )}

                    {!guardando && !resultado && (
                        <>
                            {/* Buscador */}
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    className="w-full pl-9 pr-9 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="Buscar producto por nombre o código de barras..."
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                />
                                <button
                                    onClick={() => setModalEscaner(true)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-violet-600"
                                    title="Escanear con la cámara"
                                >
                                    <Camera size={15} />
                                </button>
                                {busqueda.trim() && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                                        {coincidencias.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => agregarExistente(p)}
                                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-stone-50"
                                            >
                                                <span className="text-stone-700">{p.nombre}</span>
                                                <span className="text-xs text-stone-400">Stock: {fmt(p.stock_actual)}</span>
                                            </button>
                                        ))}
                                        <button
                                            onClick={agregarNuevo}
                                            className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-left text-violet-600 hover:bg-violet-50 border-t border-stone-100"
                                        >
                                            <PackagePlus size={14} /> Crear producto nuevo: "{busqueda.trim()}"
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Filas agregadas */}
                            {filas.length === 0 ? (
                                <p className="text-center text-stone-400 text-sm py-10">
                                    Buscá un producto arriba para agregarlo al ingreso.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {filas.map(f => (
                                        <FilaIngresoRow
                                            key={f.id}
                                            fila={f}
                                            onCambio={cambios => actualizarFila(f.id, cambios)}
                                            onBorrar={() => borrarFila(f.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!guardando && !resultado && (
                    <div className="p-5 border-t border-stone-200 shrink-0">
                        <button
                            onClick={handleConfirmar}
                            disabled={filas.length === 0 || hayCamposFaltantes}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <PackagePlus size={16} />
                            Confirmar ingreso de {filas.length} producto{filas.length === 1 ? '' : 's'}
                        </button>
                    </div>
                )}
                {resultado && (
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

        <ModalEscanerCamara
            abierto={modalEscaner}
            onCerrar={() => setModalEscaner(false)}
            onDetectar={codigo => { setBusqueda(codigo); setModalEscaner(false); }}
        />
        </>
    );
};

// --- Fila editable de un producto en el lote de ingreso ---
interface FilaIngresoRowProps {
    fila: Fila;
    onCambio: (cambios: CamposEditables) => void;
    onBorrar: () => void;
}

const FilaIngresoRow = ({ fila, onCambio, onBorrar }: FilaIngresoRowProps) => {
    const cantidadNum = parseFloat(fila.cantidad);
    const cantidadValida = !isNaN(cantidadNum) && cantidadNum > 0;
    const stockAntes = fila.tipo === 'existente' ? fila.producto.stock_actual : 0;
    const stockDespues = cantidadValida ? stockAntes + cantidadNum : stockAntes;

    return (
        <div className="border border-stone-200 rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {fila.tipo === 'existente' ? (
                        <p className="text-sm font-medium text-stone-800 truncate">{fila.producto.nombre}</p>
                    ) : (
                        <input
                            className={`${inputClase} font-medium ${!fila.nombre.trim() ? 'border-red-400' : ''}`}
                            value={fila.nombre}
                            onChange={e => onCambio({ nombre: e.target.value })}
                            placeholder="Nombre del producto nuevo"
                        />
                    )}
                </div>
                <button onClick={onBorrar} className="p-1 text-stone-400 hover:text-red-500 shrink-0" title="Quitar">
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {fila.tipo === 'nuevo' && (
                    <div>
                        <label className="text-[10px] font-medium text-stone-400 uppercase">Precio venta</label>
                        <input
                            type="number" step="any"
                            className={`${inputClase} ${isNaN(parseFloat(fila.precio)) ? 'border-red-400' : ''}`}
                            value={fila.precio}
                            onChange={e => onCambio({ precio: e.target.value })}
                            placeholder="$"
                        />
                    </div>
                )}
                <div>
                    <label className="text-[10px] font-medium text-stone-400 uppercase">Cantidad ingresada</label>
                    <input
                        type="number" step="any"
                        className={`${inputClase} ${!cantidadValida ? 'border-red-400' : ''}`}
                        value={fila.cantidad}
                        onChange={e => onCambio({ cantidad: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-medium text-stone-400 uppercase">Costo unitario (opcional)</label>
                    <input
                        type="number" step="any"
                        className={inputClase}
                        value={fila.costo}
                        onChange={e => onCambio({ costo: e.target.value })}
                        placeholder="$"
                    />
                </div>
                {/* Antes → después, explícito para que nunca parezca un reemplazo */}
                <div className="flex items-end">
                    <div className="flex items-center gap-1.5 text-sm bg-stone-50 rounded-lg px-2 py-1.5 w-full justify-center">
                        <span className="text-stone-500">{fmt(stockAntes)}</span>
                        <ArrowRight size={12} className="text-stone-400 shrink-0" />
                        <span className="font-bold text-green-700">{fmt(stockDespues)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalIngresoMercaderia;
