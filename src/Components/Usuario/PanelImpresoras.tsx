import { useState, useEffect } from 'react';
import { Printer, Plus, Trash2, RefreshCw, Check, X, AlertCircle, Download, Info } from 'lucide-react';
import { useImpresoras, type Impresora } from '../../context/ImpresorasContext';
import { listarImpresoras } from '../../logic/qz';
import { Tarjeta, Boton } from '../ui/ComponentesBase';

const PanelImpresoras = () => {
    const { impresoras, agregarImpresora, editarImpresora, borrarImpresora } = useImpresoras();

    const [detectadas, setDetectadas] = useState<string[]>([]);
    const [detectando, setDetectando] = useState(false);
    const [errorQZ, setErrorQZ] = useState('');
    const [agregando, setAgregando] = useState(false);

    // Formulario de nueva impresora
    const [nombre, setNombre] = useState('');
    const [nombreSistema, setNombreSistema] = useState('');
    const [impComandas, setImpComandas] = useState(true);
    const [impTickets, setImpTickets] = useState(true);
    const [impEtiquetas, setImpEtiquetas] = useState(false);
    const [dpi, setDpi] = useState<203 | 300>(203);
    const [anchoMm, setAnchoMm] = useState('50');
    const [altoMm, setAltoMm] = useState('30');

    const detectar = async () => {
        setDetectando(true);
        setErrorQZ('');
        try {
            const lista = await listarImpresoras();
            setDetectadas(lista);
        } catch (err: any) {
            setErrorQZ('No se pudo conectar con QZ Tray. Verificá que esté instalado y abierto.');
        } finally {
            setDetectando(false);
        }
    };

    useEffect(() => {
        detectar();
    }, []);

    const resetForm = () => {
        setNombre('');
        setNombreSistema('');
        setImpComandas(true);
        setImpTickets(true);
        setImpEtiquetas(false);
        setDpi(203);
        setAnchoMm('50');
        setAltoMm('30');
        setAgregando(false);
    };

    const handleAgregar = async () => {
        if (!nombre.trim() || !nombreSistema) return;
        await agregarImpresora({
            nombre: nombre.trim(),
            nombre_sistema: nombreSistema,
            imprime_comandas: impComandas,
            imprime_tickets: impTickets,
            imprime_etiquetas: impEtiquetas,
            dpi: impEtiquetas ? dpi : null,
            ancho_mm: impEtiquetas ? parseFloat(anchoMm) || null : null,
            alto_mm: impEtiquetas ? parseFloat(altoMm) || null : null,
        });
        resetForm();
    };

    return (
        <div className="space-y-4">
            {/* Estado de QZ Tray */}
            {errorQZ ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <div className="flex-1">
                        <p className="text-xs text-amber-700">{errorQZ}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <a
                                href="https://qz.io/download/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
                            >
                                <Download size={12} /> Descargar QZ Tray
                            </a>
                            <button onClick={detectar} className="text-xs font-bold text-amber-700 underline">
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-500">
                        {detectando ? 'Buscando impresoras...' : `${detectadas.length} impresora(s) detectada(s)`}
                    </p>
                    <button
                        onClick={detectar}
                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                    >
                        <RefreshCw size={12} className={detectando ? 'animate-spin' : ''} /> Actualizar
                    </button>
                </div>
            )}

            {/* Lista de impresoras configuradas */}
            <div className="space-y-2">
                {impresoras.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                        <Printer size={28} className="mb-2" />
                        <p className="text-sm">No hay impresoras configuradas</p>
                    </div>
                ) : (
                    impresoras.map(imp => (
                        <ImpresoraItem
                            key={imp.id}
                            impresora={imp}
                            onToggleComandas={() => editarImpresora(imp.id, { imprime_comandas: !imp.imprime_comandas })}
                            onToggleTickets={() => editarImpresora(imp.id, { imprime_tickets: !imp.imprime_tickets })}
                            onToggleEtiquetas={() => editarImpresora(imp.id, { imprime_etiquetas: !imp.imprime_etiquetas })}
                            onCambiarConfigEtiqueta={cambios => editarImpresora(imp.id, cambios)}
                            onBorrar={() => borrarImpresora(imp.id)}
                        />
                    ))
                )}
            </div>

            {/* Formulario de nueva impresora */}
            {agregando ? (
                <div className="border border-stone-200 rounded-xl p-3 space-y-3 bg-stone-50">
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1">Nombre</label>
                        <input
                            autoFocus
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej: Cocina, Caja"
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1">Impresora física</label>
                        <select
                            value={nombreSistema}
                            onChange={e => setNombreSistema(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Elegí una impresora...</option>
                            {detectadas.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-stone-400 mt-1">
                            ¿No aparece? Verificá que QZ Tray esté abierto y dale Actualizar.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                            <input type="checkbox" checked={impComandas} onChange={e => setImpComandas(e.target.checked)} />
                            Comandas
                        </label>
                        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                            <input type="checkbox" checked={impTickets} onChange={e => setImpTickets(e.target.checked)} />
                            Tickets
                        </label>
                        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                            <input type="checkbox" checked={impEtiquetas} onChange={e => setImpEtiquetas(e.target.checked)} />
                            Etiquetas
                        </label>
                    </div>

                    {/* Solo Zebra (ZPL nativo) por ahora — ver comentario en comanda.ts */}
                    {impEtiquetas && (
                        <div className="grid grid-cols-3 gap-2 p-2 bg-white border border-stone-200 rounded-lg">
                            <div>
                                <label className="block text-[11px] text-stone-500 mb-1">DPI</label>
                                <select
                                    value={dpi}
                                    onChange={e => setDpi(Number(e.target.value) as 203 | 300)}
                                    className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-xs bg-white"
                                >
                                    <option value={203}>203</option>
                                    <option value={300}>300</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] text-stone-500 mb-1">Ancho (mm)</label>
                                <input
                                    type="number" step="any" min="1"
                                    value={anchoMm}
                                    onChange={e => setAnchoMm(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-stone-500 mb-1">Alto (mm)</label>
                                <input
                                    type="number" step="any" min="1"
                                    value={altoMm}
                                    onChange={e => setAltoMm(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-stone-200 rounded-lg text-xs"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Boton
                            variante="primario"
                            onClick={handleAgregar}
                            disabled={!nombre.trim() || !nombreSistema}
                            icono={<Check size={14} />}
                            className="flex-1"
                        >
                            Guardar
                        </Boton>
                        <Boton variante="secundario" onClick={resetForm} icono={<X size={16} />} />
                    </div>
                </div>
            ) : (
                <Boton variante="acento" onClick={() => setAgregando(true)} icono={<Plus size={16} />} className="w-full">
                    Agregar impresora
                </Boton>
            )}

            {/* Ayuda: QZ Tray (siempre visible) */}
            <div className="flex items-start gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <Info className="text-stone-400 shrink-0 mt-0.5" size={14} />
                <p className="text-[11px] text-stone-500">
                    Para imprimir necesitás tener QZ Tray instalado y abierto en esta computadora.{' '}
                    <a
                        href="https://qz.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-violet-600 hover:underline"
                    >
                        Descargar QZ Tray
                    </a>
                </p>
            </div>
        </div>
    );
};

// Un ítem de impresora configurada
interface CambiosConfigEtiqueta {
    dpi?: number | null;
    ancho_mm?: number | null;
    alto_mm?: number | null;
}

interface ImpresoraItemProps {
    impresora: Impresora;
    onToggleComandas: () => void;
    onToggleTickets: () => void;
    onToggleEtiquetas: () => void;
    onCambiarConfigEtiqueta: (cambios: CambiosConfigEtiqueta) => void;
    onBorrar: () => void;
}

const ImpresoraItem = ({ impresora, onToggleComandas, onToggleTickets, onToggleEtiquetas, onCambiarConfigEtiqueta, onBorrar }: ImpresoraItemProps) => {
    // Estado local para los inputs numéricos (se guardan al perder foco, no
    // en cada tecla, para no disparar un UPDATE por cada dígito tipeado).
    const [anchoLocal, setAnchoLocal] = useState(String(impresora.ancho_mm ?? ''));
    const [altoLocal, setAltoLocal] = useState(String(impresora.alto_mm ?? ''));

    return (
        <Tarjeta padding="sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center shrink-0">
                        <Printer size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-stone-800 text-sm truncate">{impresora.nombre}</p>
                        <p className="text-xs text-stone-400 truncate">{impresora.nombre_sistema}</p>
                    </div>
                </div>
                <button onClick={onBorrar} className="text-stone-300 hover:text-red-500 p-1 shrink-0">
                    <Trash2 size={14} />
                </button>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onToggleComandas}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        impresora.imprime_comandas ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-stone-50 text-stone-400 border border-stone-200'
                    }`}
                >
                    {impresora.imprime_comandas ? '✓ ' : ''}Comandas
                </button>
                <button
                    onClick={onToggleTickets}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        impresora.imprime_tickets ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-stone-50 text-stone-400 border border-stone-200'
                    }`}
                >
                    {impresora.imprime_tickets ? '✓ ' : ''}Tickets
                </button>
                <button
                    onClick={onToggleEtiquetas}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        impresora.imprime_etiquetas ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-stone-50 text-stone-400 border border-stone-200'
                    }`}
                >
                    {impresora.imprime_etiquetas ? '✓ ' : ''}Etiquetas
                </button>
            </div>

            {/* Solo Zebra (ZPL nativo) — ver comentario en comanda.ts */}
            {impresora.imprime_etiquetas && (
                <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-stone-50 rounded-lg">
                    <div>
                        <label className="block text-[10px] text-stone-500 mb-1">DPI</label>
                        <select
                            value={impresora.dpi ?? 203}
                            onChange={e => onCambiarConfigEtiqueta({ dpi: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-stone-200 rounded text-xs bg-white"
                        >
                            <option value={203}>203</option>
                            <option value={300}>300</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] text-stone-500 mb-1">Ancho mm</label>
                        <input
                            type="number" step="any" min="1"
                            value={anchoLocal}
                            onChange={e => setAnchoLocal(e.target.value)}
                            onBlur={() => onCambiarConfigEtiqueta({ ancho_mm: parseFloat(anchoLocal) || null })}
                            className="w-full px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-stone-500 mb-1">Alto mm</label>
                        <input
                            type="number" step="any" min="1"
                            value={altoLocal}
                            onChange={e => setAltoLocal(e.target.value)}
                            onBlur={() => onCambiarConfigEtiqueta({ alto_mm: parseFloat(altoLocal) || null })}
                            className="w-full px-2 py-1 border border-stone-200 rounded text-xs"
                        />
                    </div>
                </div>
            )}
        </Tarjeta>
    );
};

export default PanelImpresoras;