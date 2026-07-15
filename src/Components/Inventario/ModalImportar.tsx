import { useState } from 'react';
import { X, Upload, FileText, AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { leerArchivo, detectarMapeo, convertirProductos, CAMPOS_IMPORTABLES, type ArchivoLeido, type ProductoImportar } from '../../logic/importarArchivo';
import { useMenu } from '../../context/MenuContext';


interface Props {
    onCerrar: () => void;
}

type Paso = 'subir' | 'mapear' | 'confirmar';

const ModalImportar = ({ onCerrar }: Props) => {
    const { agregarProducto, productos: productosExistentes  } = useMenu();
    const [paso, setPaso] = useState<Paso>('subir');
    const [archivo, setArchivo] = useState<ArchivoLeido | null>(null);
    const [nombreArchivo, setNombreArchivo] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [mapeo, setMapeo] = useState<Record<string, string>>({});
    const [productos, setProductos] = useState<ProductoImportar[]>([]);
    const [importando, setImportando] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [resultado, setResultado] = useState<{ ok: number; fallidos: number } | null>(null);
    

    const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCargando(true);
        setError('');
        try {
            const res = await leerArchivo(file);
            if (res.columnas.length === 0 || res.filas.length === 0) {
                setError('El archivo está vacío o no tiene datos válidos.');
                setCargando(false);
                return;
            }
            setArchivo(res);
            setNombreArchivo(file.name);
            setMapeo(detectarMapeo(res.columnas));
            setPaso('mapear');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const irAConfirmar = () => {
        const faltantes = CAMPOS_IMPORTABLES.filter(c => c.obligatorio && !mapeo[c.id]);
        if (faltantes.length > 0) {
            setError(`Falta asignar: ${faltantes.map(c => c.label).join(', ')}`);
            return;
        }
        setError('');
        if (archivo) {
            setProductos(convertirProductos(
                archivo,
                mapeo,
                productosExistentes.map(p => ({ nombre: p.nombre, codigo_barras: p.codigo_barras }))
            ));
        }
        setPaso('confirmar');
    };

    const validos = productos.filter(p => p.valido);
    const invalidos = productos.filter(p => !p.valido);

    const handleImportar = async () => {
        setImportando(true);
        setProgreso(0);
        let ok = 0;
        let fallidos = 0;

        for (let i = 0; i < validos.length; i++) {
            const p = validos[i];
            try {
                await agregarProducto({
                    nombre: p.nombre,
                    descripcion: p.descripcion,
                    categoria: p.categoria,
                    precio_venta: p.precio_venta,
                    precio_costo: p.precio_costo,
                    stock_actual: p.stock_actual,
                    stock_minimo: 0,
                    codigo_barras: p.codigo_barras,
                    activo: true,
                    tipo_venta: p.tipo_venta,
                    unidad_medida: p.unidad_medida,
                    favorito: false,
                    publicado: false,
                    imagen_url: null
                });
                ok++;
            } catch (err) {
                console.error(`Error importando "${p.nombre}":`, err);
                fallidos++;
            }
            setProgreso(Math.round(((i + 1) / validos.length) * 100));
        }

        setResultado({ ok, fallidos });
        setImportando(false);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-200 shrink-0">
                    <div>
                        <h2 className="font-bold text-stone-800 text-lg">Importar productos</h2>
                        <p className="text-xs text-stone-400 mt-0.5">Desde Excel, CSV o TXT</p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-stone-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                {/* Indicador de pasos */}
                {!resultado && (
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100 shrink-0">
                        {(['subir', 'mapear', 'confirmar'] as Paso[]).map((p, i) => {
                            const activo = paso === p;
                            const completado = (['subir', 'mapear', 'confirmar'] as Paso[]).indexOf(paso) > i;
                            return (
                                <div key={p} className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        activo ? 'bg-violet-600 text-white' : completado ? 'bg-violet-100 text-violet-700' : 'bg-stone-100 text-stone-400'
                                    }`}>
                                        {i + 1}
                                    </div>
                                    <span className={`text-xs font-medium ${activo ? 'text-violet-700' : 'text-stone-400'}`}>
                                        {p === 'subir' ? 'Subir' : p === 'mapear' ? 'Mapear' : 'Confirmar'}
                                    </span>
                                    {i < 2 && <div className="w-8 h-px bg-stone-200" />}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* Resultado final */}
                    {resultado ? (
                        <div className="text-center py-6 space-y-3">
                            <div className="inline-flex p-4 bg-green-100 rounded-full">
                                <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-lg">Importación completada</h3>
                                <p className="text-sm text-stone-500 mt-1">
                                    Se importaron <strong className="text-green-600">{resultado.ok}</strong> productos correctamente
                                    {resultado.fallidos > 0 && <>, <strong className="text-red-500">{resultado.fallidos}</strong> fallaron</>}.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* PASO 1 — Subir archivo */}
                            {paso === 'subir' && (
                                <div className="space-y-4">
                                    <label className="block">
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv,.txt"
                                            onChange={handleArchivo}
                                            className="hidden"
                                            disabled={cargando}
                                        />
                                        <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center hover:border-violet-300 hover:bg-violet-50/30 transition-colors cursor-pointer">
                                            <div className="inline-flex p-3 bg-violet-100 rounded-full mb-3">
                                                <Upload size={24} className="text-violet-600" />
                                            </div>
                                            <p className="font-medium text-stone-700">
                                                {cargando ? 'Leyendo archivo...' : 'Hacé click para elegir un archivo'}
                                            </p>
                                            <p className="text-xs text-stone-400 mt-1">Excel (.xlsx), CSV o TXT</p>
                                        </div>
                                    </label>

                                    <div className="flex items-start gap-2 p-3 bg-stone-50 rounded-xl">
                                        <FileText size={16} className="text-stone-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-stone-500">
                                            El archivo debe tener una fila de encabezados (nombres de columna) y una fila por producto.
                                            En el siguiente paso vas a poder indicar qué columna corresponde a cada dato.
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                                            <AlertCircle size={16} className="shrink-0" />
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 2 — Mapear columnas */}
                            {paso === 'mapear' && archivo && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm">
                                        <FileText size={16} className="shrink-0" />
                                        <span>
                                            <strong>{nombreArchivo}</strong> — {archivo.filas.length} filas, {archivo.columnas.length} columnas
                                        </span>
                                    </div>

                                    <p className="text-sm text-stone-500">
                                        Indicá qué columna de tu archivo corresponde a cada dato. Detectamos algunas automáticamente.
                                    </p>

                                    <div className="space-y-2">
                                        {CAMPOS_IMPORTABLES.map(campo => (
                                            <div key={campo.id} className="flex items-center gap-3">
                                                <div className="w-40 shrink-0">
                                                    <span className="text-sm font-medium text-stone-700">{campo.label}</span>
                                                    {campo.obligatorio && <span className="text-red-500 ml-1">*</span>}
                                                </div>
                                                <select
                                                    value={mapeo[campo.id] ?? ''}
                                                    onChange={e => setMapeo(m => {
                                                        const nuevo = { ...m };
                                                        if (e.target.value) nuevo[campo.id] = e.target.value;
                                                        else delete nuevo[campo.id];
                                                        return nuevo;
                                                    })}
                                                    className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                >
                                                    <option value="">— Sin asignar —</option>
                                                    {archivo.columnas.map(col => (
                                                        <option key={col} value={col}>{col}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-xs text-stone-400">
                                        <span className="text-red-500">*</span> Campos obligatorios
                                    </p>

                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                                            <AlertCircle size={16} className="shrink-0" />
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 3 — Confirmar */}
                            {paso === 'confirmar' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                            <p className="text-2xl font-black text-green-700">{validos.length}</p>
                                            <p className="text-xs text-green-600">productos listos para importar</p>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${invalidos.length > 0 ? 'bg-red-50 border-red-100' : 'bg-stone-50 border-stone-100'}`}>
                                            <p className={`text-2xl font-black ${invalidos.length > 0 ? 'text-red-600' : 'text-stone-400'}`}>{invalidos.length}</p>
                                            <p className={`text-xs ${invalidos.length > 0 ? 'text-red-500' : 'text-stone-400'}`}>con errores (se omiten)</p>
                                        </div>
                                    </div>

                                    {/* Tabla de vista previa */}
                                    <div className="border border-stone-200 rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-stone-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium text-stone-600">Fila</th>
                                                        <th className="px-3 py-2 text-left font-medium text-stone-600">Nombre</th>
                                                        <th className="px-3 py-2 text-left font-medium text-stone-600">Precio</th>
                                                        <th className="px-3 py-2 text-left font-medium text-stone-600">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {productos.slice(0, 50).map((p, i) => (
                                                        <tr key={i} className="border-t border-stone-100">
                                                            <td className="px-3 py-2 text-stone-400">{p.fila}</td>
                                                            <td className="px-3 py-2 text-stone-700">{p.nombre || <span className="text-stone-300">(vacío)</span>}</td>
                                                            <td className="px-3 py-2 text-stone-600">${p.precio_venta.toLocaleString()}</td>
                                                            <td className="px-3 py-2">
                                                                {p.valido ? (
                                                                    <span className="text-green-600">✓ Ok</span>
                                                                ) : (
                                                                    <span className="text-red-500" title={p.errores.join(', ')}>✕ {p.errores.join(', ')}</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {productos.length > 50 && (
                                            <p className="text-xs text-stone-400 text-center py-2 bg-stone-50">
                                                Mostrando 50 de {productos.length} filas
                                            </p>
                                        )}
                                    </div>

                                    {/* Barra de progreso durante la importación */}
                                    {importando && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-stone-500">
                                                <span>Importando...</span>
                                                <span>{progreso}%</span>
                                            </div>
                                            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-violet-600 transition-all" style={{ width: `${progreso}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {resultado ? (
                    <div className="p-5 border-t border-stone-200 shrink-0">
                        <button
                            onClick={onCerrar}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold"
                        >
                            Listo
                        </button>
                    </div>
                ) : paso === 'mapear' ? (
                    <div className="flex gap-3 p-5 border-t border-stone-200 shrink-0">
                        <button
                            onClick={() => { setPaso('subir'); setArchivo(null); setError(''); }}
                            className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                        >
                            Volver
                        </button>
                        <button
                            onClick={irAConfirmar}
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1"
                        >
                            Continuar <ArrowRight size={16} />
                        </button>
                    </div>
                ) : paso === 'confirmar' ? (
                    <div className="flex gap-3 p-5 border-t border-stone-200 shrink-0">
                        <button
                            onClick={() => setPaso('mapear')}
                            disabled={importando}
                            className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                        >
                            Volver
                        </button>
                        <button
                            onClick={handleImportar}
                            disabled={importando || validos.length === 0}
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1"
                        >
                            {importando ? (
                                <><Loader2 size={16} className="animate-spin" /> Importando...</>
                            ) : (
                                <>Importar {validos.length} productos</>
                            )}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ModalImportar;