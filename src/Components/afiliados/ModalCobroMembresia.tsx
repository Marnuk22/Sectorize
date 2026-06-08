import { useState } from 'react';
import { X, Check, Calendar, AlertTriangle } from 'lucide-react';
import { useAfiliados } from '../../context/AfiliadosContext';
import { useVentas } from '../../context/VentasContext';
import { useAuth } from '../../context/AuthContext';
import { labelMetodo } from '../../config/metodosPago';
import type { SocioConEstado, MetodoPago } from '../../types';

interface Props {
    socio: SocioConEstado;
    onCerrar: () => void;
}

const ModalCobroMembresia = ({ socio, onCerrar }: Props) => {
    const { membresias, asignarMembresia } = useAfiliados();
    const { arqueoActivo } = useVentas();
    const { local } = useAuth();

    const metodosHabilitados = (local?.metodos_pago && local.metodos_pago.length > 0
        ? local.metodos_pago
        : ['efectivo']) as MetodoPago[];

    const membresiasActivas = membresias.filter(m => m.activo);

    const [membresiaId, setMembresiaId] = useState(membresiasActivas[0]?.id ?? '');
    const [metodoPago, setMetodoPago] = useState<MetodoPago>(metodosHabilitados[0]);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');

    const membresiaSeleccionada = membresias.find(m => m.id === membresiaId);

    const esRenovacion = socio.suscripcionActiva && socio.diasRestantes !== null && socio.diasRestantes >= 0;

    const handleConfirmar = async () => {
        if (!membresiaId) { setError('Elegí una membresía'); return; }
        if (!arqueoActivo) { setError('No hay caja abierta'); return; }

        setProcesando(true);
        setError('');
        try {
            await asignarMembresia(socio.id, membresiaId, metodoPago);
            onCerrar();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg">
                            {esRenovacion ? 'Renovar membresía' : 'Asignar membresía'}
                        </h2>
                        <p className="text-sm text-gray-400">{socio.nombre} {socio.apellido}</p>
                    </div>
                    <button onClick={onCerrar} className="p-2 hover:bg-gray-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Aviso de renovación */}
                    {esRenovacion && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-sm">
                            <Calendar size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-blue-700 text-xs">
                                Le quedan {socio.diasRestantes} días. La nueva membresía se sumará a partir de su vencimiento actual.
                            </p>
                        </div>
                    )}

                    {/* Sin membresías creadas */}
                    {membresiasActivas.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">
                            No hay membresías disponibles. Creá una primero desde el botón "Membresías".
                        </div>
                    ) : (
                        <>
                            {/* Elegir membresía */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Membresía</label>
                                <select
                                    className="border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={membresiaId}
                                    onChange={e => setMembresiaId(e.target.value)}
                                >
                                    {membresiasActivas.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nombre} — ${m.precio.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Resumen */}
                            {membresiaSeleccionada && (
                                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Precio</span>
                                        <span className="font-bold text-gray-800">${membresiaSeleccionada.precio.toLocaleString()}</span>
                                    </div>
                                    {membresiaSeleccionada.tipo === 'por_tiempo' && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Duración</span>
                                            <span className="text-gray-700">{membresiaSeleccionada.duracion_dias} días</span>
                                        </div>
                                    )}
                                    {membresiaSeleccionada.tipo === 'por_asistencias' && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Clases</span>
                                            <span className="text-gray-700">{membresiaSeleccionada.cantidad_asistencias}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Método de pago */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Método de pago</label>
                                <select
                                    className="border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={metodoPago}
                                    onChange={e => setMetodoPago(e.target.value as MetodoPago)}
                                >
                                    {metodosHabilitados.map(m => (
                                        <option key={m} value={m}>{labelMetodo(m)}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Aviso sin caja */}
                            {!arqueoActivo && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                    <p className="text-xs text-amber-700">
                                        Para cobrar necesitás abrir la caja desde Ventas → Arqueo.
                                    </p>
                                </div>
                            )}

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <button
                                onClick={handleConfirmar}
                                disabled={procesando || !arqueoActivo}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Check size={16} />
                                {procesando ? 'Procesando...' : `Cobrar y ${esRenovacion ? 'renovar' : 'asignar'}`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalCobroMembresia;