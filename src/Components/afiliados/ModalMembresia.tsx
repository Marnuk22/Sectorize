    import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAfiliados } from '../../context/AfiliadosContext';
import type { Membresia, TipoMembresia } from '../../types';

interface Props {
    membresia?: Membresia | null;
    onCerrar: () => void;
}

const TIPOS: { id: TipoMembresia; label: string; descripcion: string }[] = [
    { id: 'por_tiempo',      label: 'Por tiempo',      descripcion: 'Vence a los X días (mensual, trimestral...)' },
    { id: 'por_asistencias', label: 'Por asistencias', descripcion: 'Se agota tras X visitas (pack de clases)' },
    { id: 'clase_suelta',    label: 'Clase suelta',    descripcion: 'Un solo uso' },
];

const ModalMembresia = ({ membresia, onCerrar }: Props) => {
    const { agregarMembresia, editarMembresia } = useAfiliados();
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState(0);
    const [tipo, setTipo] = useState<TipoMembresia>('por_tiempo');
    const [duracionDias, setDuracionDias] = useState(30);
    const [cantidadAsistencias, setCantidadAsistencias] = useState(10);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (membresia) {
            setNombre(membresia.nombre);
            setPrecio(membresia.precio);
            setTipo(membresia.tipo);
            setDuracionDias(membresia.duracion_dias);
            setCantidadAsistencias(membresia.cantidad_asistencias ?? 10);
        }
    }, [membresia]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
        if (precio < 0) { setError('El precio no puede ser negativo'); return; }

        setCargando(true);
        setError('');
        try {
            const datos = {
                nombre: nombre.trim(),
                precio,
                tipo,
                duracion_dias: tipo === 'clase_suelta' ? 1 : duracionDias,
                cantidad_asistencias: tipo === 'por_asistencias' ? cantidadAsistencias : null,
            };

            if (membresia) {
                await editarMembresia(membresia.id, datos);
            } else {
                await agregarMembresia(datos);
            }
            onCerrar();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-bold text-gray-800 text-lg">
                        {membresia ? 'Editar membresía' : 'Nueva membresía'}
                    </h2>
                    <button onClick={onCerrar} className="p-2 hover:bg-gray-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Nombre *</label>
                        <input
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej: Mensual Full"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Precio ($)</label>
                        <input
                            type="number"
                            min="0"
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={precio}
                            onChange={e => setPrecio(parseFloat(e.target.value) || 0)}
                        />
                    </div>

                    {/* Tipo de membresía */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-gray-500">Mecánica</label>
                        {TIPOS.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTipo(t.id)}
                                className={`text-left p-3 rounded-xl border transition-all ${
                                    tipo === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <p className={`text-sm font-medium ${tipo === t.id ? 'text-blue-700' : 'text-gray-700'}`}>{t.label}</p>
                                <p className="text-xs text-gray-400">{t.descripcion}</p>
                            </button>
                        ))}
                    </div>

                    {/* Campo condicional según tipo */}
                    {tipo === 'por_tiempo' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Duración (días)</label>
                            <input
                                type="number"
                                min="1"
                                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={duracionDias}
                                onChange={e => setDuracionDias(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-gray-400">Ej: 30 para mensual, 90 para trimestral</p>
                        </div>
                    )}

                    {tipo === 'por_asistencias' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Cantidad de clases</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={cantidadAsistencias}
                                    onChange={e => setCantidadAsistencias(parseInt(e.target.value) || 1)}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Vigencia (días)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={duracionDias}
                                    onChange={e => setDuracionDias(parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCerrar}
                            className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={cargando}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                        >
                            {cargando ? 'Guardando...' : membresia ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalMembresia;