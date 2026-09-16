import { useState } from 'react';
import { useVentas } from '../../context/VentasContext';
import { useConexion } from '../../context/ConexionContext';
import { Lock, Unlock, TrendingUp, ShoppingBag, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';
import { labelMetodo, iconoMetodo } from '../../config/metodosPago';
import { useImpresoras } from '../../context/ImpresorasContext';
import { useAuth } from '../../context/AuthContext';
import { imprimirArqueo } from '../../logic/impresion';
import { clasificarDiferencia, type EstadoDiferencia } from '../../logic/arqueoServices';
import { Tarjeta, SeccionDatos, FilaDato, Etiqueta } from '../ui/ComponentesBase';
import ModalMovimientoCaja from './ModalMovimientoCaja';
import HistorialArqueos from './HistorialArqueos';

// Estilos por estado de diferencia — mismo criterio en el arqueo en curso y
// en HistorialArqueos. "Sobro" usa ámbar vía override (no es uno de los 4
// tonos de ComponentesBase), mismo patrón que ya usa ModalCargaAudio para
// "Confianza baja".
const ESTILOS_DIFERENCIA: Record<EstadoDiferencia, { fondo: string; texto: string; label: (n: number) => string }> = {
    cuadro: { fondo: 'bg-green-100', texto: 'text-green-700', label: () => 'Cuadró' },
    falto:  { fondo: 'bg-red-100', texto: 'text-red-700', label: n => `Faltó $${Math.abs(n).toLocaleString()}` },
    sobro:  { fondo: 'bg-amber-100', texto: 'text-amber-700', label: n => `Sobró $${Math.abs(n).toLocaleString()}` },
};

const LABELS_MOTIVO_RETIRO: Record<string, string> = {
    proveedor: 'Pago a proveedor',
    banco: 'Depósito bancario',
    gasto: 'Gasto',
    otro: 'Otro',
};

const ContenedorArqueo = () => {
    const { arqueoActivo, historialVentas, movimientosCaja, abrirArqueo, cerrarArqueo } = useVentas();
    const { online } = useConexion();
    const [montoInicial, setMontoInicial] = useState('');
    const [montoReal, setMontoReal] = useState('');
    const [confirmandoCierre, setConfirmandoCierre] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [modalMovimiento, setModalMovimiento] = useState<'retiro' | 'deposito' | null>(null);
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const { impresorasDeTickets } = useImpresoras();
    const { local } = useAuth();

    // Solo retiros/depósitos se muestran acá — apertura y venta_efectivo ya
    // se ven reflejados en "Monto inicial"/"Total vendido" más abajo.
    const movimientosDelDia = movimientosCaja.filter(m => m.tipo === 'retiro' || m.tipo === 'deposito');

    // "Total vendido" es una métrica de NEGOCIO (todos los métodos de pago);
    // el esperado de caja es una métrica de EFECTIVO — no son lo mismo, ver
    // el gotcha en CLAUDE.md ("solo el efectivo vive en la caja").
    const totalVentas = historialVentas.reduce((acc, v) => acc + v.total, 0);
    const cantidadVentas = historialVentas.length;

    const ventasPorMetodo = historialVentas.reduce((acc, v) => {
        acc[v.metodoPago] = (acc[v.metodoPago] ?? 0) + v.total;
        return acc;
    }, {} as Record<string, number>);

    const totalVentasEfectivo = historialVentas
        .filter(v => v.metodoPago === 'efectivo')
        .reduce((acc, v) => acc + v.total, 0);
    const totalDepositos = movimientosCaja
        .filter(m => m.tipo === 'deposito')
        .reduce((acc, m) => acc + m.monto, 0);
    const totalRetiros = movimientosCaja
        .filter(m => m.tipo === 'retiro')
        .reduce((acc, m) => acc + m.monto, 0);

    const montoEsperado = arqueoActivo
        ? arqueoActivo.montoInicial + totalVentasEfectivo + totalDepositos - totalRetiros
        : 0;
    const diferencia = parseFloat(montoReal || '0') - montoEsperado;
    const estiloDiferencia = ESTILOS_DIFERENCIA[clasificarDiferencia(diferencia)];

    const handleAbrirArqueo = async () => {
        const monto = parseFloat(montoInicial);
        if (isNaN(monto) || monto < 0) { setError('Ingresá un monto válido'); return; }
        setCargando(true);
        setError('');
        try {
            await abrirArqueo(monto);
            setMontoInicial('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const handleCerrarArqueo = async () => {
        if (!arqueoActivo) return;
        const monto = parseFloat(montoReal);
        if (isNaN(monto) || monto < 0) { setError('Ingresá un monto válido'); return; }
        setCargando(true);
        setError('');
        try {
            // Imprimir el reporte de cierre ANTES de cerrar (capturando los datos actuales)
            imprimirArqueo({
                local: local?.nombre ?? 'Vallis',
                fechaApertura: arqueoActivo.fechaApertura,
                fechaCierre: new Date(),
                montoInicial: arqueoActivo.montoInicial,
                totalVentas: totalVentas,
                cantidadVentas: cantidadVentas,
                porMetodo: Object.fromEntries(
                    Object.entries(ventasPorMetodo).map(([m, v]) => [labelMetodo(m), v])
                ),
                montoEsperado: montoEsperado,
                montoReal: monto,
                diferencia: monto - montoEsperado,
                impresoras: impresorasDeTickets().map(i => i.nombre_sistema),
            });

            await cerrarArqueo(monto);
            setMontoReal('');
            setConfirmandoCierre(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    // Sin arqueo abierto
    if (!arqueoActivo) return (
        <div className="space-y-4">
            <div className="text-center py-8">
                <div className="inline-flex p-4 bg-stone-100 rounded-full mb-3">
                    <Lock size={28} className="text-stone-400" />
                </div>
                <h3 className="font-bold text-stone-700 text-lg">Caja cerrada</h3>
                <p className="text-stone-400 text-sm mt-1">Abrí la caja para comenzar a registrar ventas</p>
            </div>

            <Tarjeta padding="lg" className="space-y-4">
                <label className="text-sm font-medium text-stone-600">Monto inicial en caja ($)</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="0.00"
                    value={montoInicial}
                    onChange={e => setMontoInicial(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAbrirArqueo()}
                />
                {!online && <p className="text-sm text-amber-600 text-center">Sin conexión — no se puede abrir la caja.</p>}
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <button
                    onClick={handleAbrirArqueo}
                    disabled={cargando || !online}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                    <Unlock size={18} />
                    {cargando ? 'Abriendo...' : 'Abrir caja'}
                </button>
            </Tarjeta>

            <BotonHistorial mostrar={mostrarHistorial} onToggle={() => setMostrarHistorial(v => !v)} />
        </div>
    );

    // Con arqueo abierto
    return (
        <>
        <div className="space-y-4">
            {/* Header arqueo activo */}
            <FilaDato
                tono="exito"
                icono={<span className="p-2 bg-green-100 rounded-xl inline-flex">
                        <Unlock size={18} className="text-green-700" />
                    </span>}
                etiqueta={<span className="text-green-800">Caja abierta</span>}
                subetiqueta={`Desde ${arqueoActivo.fechaApertura.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                valor={<span className="text-sm text-green-700">Inicial: ${arqueoActivo.montoInicial.toLocaleString()}</span>}
            />
            {/* Retiro / depósito de efectivo — bloqueado offline, mismo
                criterio que abrir/cerrar caja (ver VentasContext). */}
            <div className="space-y-1">
                {!online && <p className="text-sm text-amber-600 text-center">Sin conexión — no se puede retirar ni depositar efectivo.</p>}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setModalMovimiento('retiro')}
                        disabled={!online}
                        className="flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:hover:bg-transparent font-bold py-2.5 rounded-xl text-sm transition-colors"
                    >
                        <ArrowUpCircle size={16} /> Retirar efectivo
                    </button>
                    <button
                        onClick={() => setModalMovimiento('deposito')}
                        disabled={!online}
                        className="flex items-center justify-center gap-2 border-2 border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-60 disabled:hover:bg-transparent font-bold py-2.5 rounded-xl text-sm transition-colors"
                    >
                        <ArrowDownCircle size={16} /> Depositar efectivo
                    </button>
                </div>
            </div>

            {/* Movimientos del día (retiros/depósitos) */}
            {movimientosDelDia.length > 0 && (
                <Tarjeta className="space-y-2.5">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Movimientos de caja</p>
                    {movimientosDelDia.map(m => (
                        <div key={m.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                {m.tipo === 'retiro'
                                    ? <ArrowUpCircle size={15} className="text-red-500 shrink-0" />
                                    : <ArrowDownCircle size={15} className="text-green-600 shrink-0" />}
                                <div className="min-w-0">
                                    <p className="text-sm text-stone-700 truncate">
                                        {m.tipo === 'retiro' ? LABELS_MOTIVO_RETIRO[m.motivoCategoria ?? 'otro'] : (m.nota || 'Depósito')}
                                    </p>
                                    <p className="text-xs text-stone-400">
                                        {m.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        {m.tipo === 'retiro' && m.nota && ` · ${m.nota}`}
                                    </p>
                                </div>
                            </div>
                            <Etiqueta tono={m.tipo === 'retiro' ? 'alerta' : 'exito'} className="shrink-0">
                                {m.tipo === 'retiro' ? '−' : '+'}${m.monto.toLocaleString()}
                            </Etiqueta>
                        </div>
                    ))}
                </Tarjeta>
            )}

            {/* Resumen de ventas */}
            <div className="grid grid-cols-2 gap-3">
                <SeccionDatos
                    etiqueta="Total vendido"
                    icono={<TrendingUp size={14} className="text-violet-500" />}
                    valor={`$${totalVentas.toLocaleString()}`}
                />
                <SeccionDatos
                    etiqueta="Ventas"
                    icono={<ShoppingBag size={14} className="text-violet-500" />}
                    valor={cantidadVentas}
                />
            </div>
            {/* Ventas por método de pago */}
            {Object.keys(ventasPorMetodo).length > 0 && (
                <Tarjeta className="space-y-2.5">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Por método de pago</p>
                    {(Object.entries(ventasPorMetodo) as [string, number][]).map(([metodo, total]) => {
                        const Icono = iconoMetodo(metodo);
                        return (
                            <div key={metodo} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icono size={15} className="text-stone-400" />
                                    <span className="text-sm text-stone-600">{labelMetodo(metodo)}</span>
                                </div>
                                <span className="font-bold text-stone-800">${total.toLocaleString()}</span>
                            </div>
                        );
                    })}
                </Tarjeta>
            )}

            {/* Monto esperado */}
            <FilaDato
                tono="acento"
                destacado
                etiqueta={<span className="text-violet-700">Monto esperado en caja</span>}
                valor={<span className="text-violet-800">${montoEsperado.toLocaleString()}</span>}
            />

            {/* Cierre de caja */}
            {!confirmandoCierre ? (
                <div className="space-y-1">
                    {!online && <p className="text-sm text-amber-600 text-center">Sin conexión — no se puede cerrar la caja.</p>}
                    <button
                        onClick={() => setConfirmandoCierre(true)}
                        disabled={!online}
                        className="w-full border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:hover:bg-transparent font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <Lock size={18} />
                        Cerrar caja
                    </button>
                </div>
            ) : (
                <Tarjeta padding="lg" tono="neutral" className="space-y-3">
                    <p className="font-bold text-stone-700">¿Cuánto hay físicamente en caja?</p>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border border-stone-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="0.00"
                        value={montoReal}
                        onChange={e => setMontoReal(e.target.value)}
                        autoFocus
                    />

                    {/* Diferencia en tiempo real */}
                    {montoReal && (
                        <div className={`p-3 rounded-xl text-center ${estiloDiferencia.fondo}`}>
                            <p className="text-xs text-stone-500 mb-1">Diferencia</p>
                            <p className={`text-xl font-black ${estiloDiferencia.texto}`}>
                                {estiloDiferencia.label(diferencia)}
                            </p>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            onClick={() => { setConfirmandoCierre(false); setMontoReal(''); setError(''); }}
                            className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCerrarArqueo}
                            disabled={cargando || !online}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                        >
                            {cargando ? 'Cerrando...' : 'Confirmar cierre'}
                        </button>
                    </div>
                </Tarjeta>
            )}

            <BotonHistorial mostrar={mostrarHistorial} onToggle={() => setMostrarHistorial(v => !v)} />
        </div>

        <ModalMovimientoCaja
            tipo={modalMovimiento ?? 'retiro'}
            abierto={modalMovimiento !== null}
            onCerrar={() => setModalMovimiento(null)}
            disponible={montoEsperado}
        />
        </>
    );
};

// --- Historial de arqueos, colapsado por defecto para no saturar la
// pantalla de caja (que ya tiene bastante contenido propio). ---
interface BotonHistorialProps {
    mostrar: boolean;
    onToggle: () => void;
}

const BotonHistorial = ({ mostrar, onToggle }: BotonHistorialProps) => (
    <div className="pt-2">
        <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 font-medium"
        >
            <History size={15} />
            {mostrar ? 'Ocultar historial de arqueos' : 'Ver historial de arqueos'}
        </button>
        {mostrar && (
            <div className="mt-3">
                <HistorialArqueos />
            </div>
        )}
    </div>
);

export default ContenedorArqueo;