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
        setAgregando(false);
    };

    const handleAgregar = async () => {
        if (!nombre.trim() || !nombreSistema) return;
        await agregarImpresora({
            nombre: nombre.trim(),
            nombre_sistema: nombreSistema,
            imprime_comandas: impComandas,
            imprime_tickets: impTickets,
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
                    </div>
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
const ImpresoraItem = ({ impresora, onToggleComandas, onToggleTickets, onBorrar }: {
    impresora: Impresora;
    onToggleComandas: () => void;
    onToggleTickets: () => void;
    onBorrar: () => void;
}) => (
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
        </div>
    </Tarjeta>
);

export default PanelImpresoras;