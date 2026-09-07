import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useVentas } from '../../context/VentasContext';
import { ModalBase, Campo } from '../ui/ComponentesBase';
import type { MotivoRetiro } from '../../types';

const LABELS_MOTIVO: Record<MotivoRetiro, string> = {
    proveedor: 'Pago a proveedor',
    banco: 'Depósito bancario',
    gasto: 'Gasto',
    otro: 'Otro',
};

interface Props {
    tipo: 'retiro' | 'deposito';
    abierto: boolean;
    onCerrar: () => void;
    // Efectivo esperado en caja ahora mismo (montoInicial + ventas efectivo +
    // depósitos − retiros) — solo se usa para el tope de un retiro. La base
    // también lo valida (trigger `validar_retiro_caja`, a prueba de dos
    // retiros simultáneos); esto es feedback inmediato en la UI.
    disponible: number;
}

const ModalMovimientoCaja = ({ tipo, abierto, onCerrar, disponible }: Props) => {
    const { retirarEfectivo, ingresarEfectivo } = useVentas();
    const [monto, setMonto] = useState('');
    const [motivoCategoria, setMotivoCategoria] = useState<MotivoRetiro>('gasto');
    const [nota, setNota] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const cerrarYLimpiar = () => {
        setMonto('');
        setMotivoCategoria('gasto');
        setNota('');
        setError('');
        onCerrar();
    };

    const handleConfirmar = async () => {
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresá un monto válido'); return; }
        if (tipo === 'retiro' && montoNum > disponible) {
            setError(`No hay suficiente efectivo en caja (disponible: $${disponible.toLocaleString()})`);
            return;
        }

        setCargando(true);
        setError('');
        try {
            if (tipo === 'retiro') {
                await retirarEfectivo(montoNum, motivoCategoria, nota);
            } else {
                await ingresarEfectivo(montoNum, nota);
            }
            cerrarYLimpiar();
        } catch (err: any) {
            setError(err.message ?? 'No se pudo registrar el movimiento');
        } finally {
            setCargando(false);
        }
    };

    return (
        <ModalBase
            isOpen={abierto}
            onClose={cerrarYLimpiar}
            titulo={tipo === 'retiro' ? 'Retirar efectivo' : 'Depositar efectivo'}
        >
            <div className="space-y-3">
                <Campo
                    etiqueta="Monto ($)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    autoFocus
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    placeholder="0.00"
                    ayuda={tipo === 'retiro' ? `Disponible en caja: $${disponible.toLocaleString()}` : undefined}
                />

                {tipo === 'retiro' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-stone-500">Motivo</label>
                        <select
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            value={motivoCategoria}
                            onChange={e => setMotivoCategoria(e.target.value as MotivoRetiro)}
                        >
                            {(Object.keys(LABELS_MOTIVO) as MotivoRetiro[]).map(m => (
                                <option key={m} value={m}>{LABELS_MOTIVO[m]}</option>
                            ))}
                        </select>
                    </div>
                )}

                <Campo
                    etiqueta="Nota (opcional)"
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    placeholder={tipo === 'retiro' ? 'Ej: reparto de verdura' : 'Ej: vuelto que trajo el dueño'}
                />

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={cerrarYLimpiar}
                        className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmar}
                        disabled={cargando}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-1.5 ${
                            tipo === 'retiro' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {tipo === 'retiro' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                        {cargando ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export default ModalMovimientoCaja;
