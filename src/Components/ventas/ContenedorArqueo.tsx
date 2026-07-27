import { useState } from 'react';
import { useVentas } from '../../context/VentasContext';
import { Lock, Unlock, TrendingUp, ShoppingBag } from 'lucide-react';
import { labelMetodo, iconoMetodo } from '../../config/metodosPago';
import { useImpresoras } from '../../context/ImpresorasContext';
import { useAuth } from '../../context/AuthContext';
import { imprimirArqueo } from '../../logic/impresion';
import { Tarjeta, SeccionDatos, FilaDato } from '../ui/ComponentesBase';

const ContenedorArqueo = () => {
    const { arqueoActivo, historialVentas, abrirArqueo, cerrarArqueo } = useVentas();
    const [montoInicial, setMontoInicial] = useState('');
    const [montoReal, setMontoReal] = useState('');
    const [confirmandoCierre, setConfirmandoCierre] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const { impresorasDeTickets } = useImpresoras();
    const { local } = useAuth();

    const totalVentas = historialVentas.reduce((acc, v) => acc + v.total, 0);
    const cantidadVentas = historialVentas.length;

    const ventasPorMetodo = historialVentas.reduce((acc, v) => {
        acc[v.metodoPago] = (acc[v.metodoPago] ?? 0) + v.total;
        return acc;
    }, {} as Record<string, number>);

    const montoEsperado = arqueoActivo ? arqueoActivo.montoInicial + totalVentas : 0;
    const diferencia = parseFloat(montoReal || '0') - montoEsperado;

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
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <button
                    onClick={handleAbrirArqueo}
                    disabled={cargando}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                    <Unlock size={18} />
                    {cargando ? 'Abriendo...' : 'Abrir caja'}
                </button>
            </Tarjeta>
        </div>
    );

    // Con arqueo abierto
    return (
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
                <button
                    onClick={() => setConfirmandoCierre(true)}
                    className="w-full border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                    <Lock size={18} />
                    Cerrar caja
                </button>
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
                        <div className={`p-3 rounded-xl text-center ${diferencia >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            <p className="text-xs text-stone-500 mb-1">Diferencia</p>
                            <p className={`text-xl font-black ${diferencia >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString()}
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
                            disabled={cargando}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                        >
                            {cargando ? 'Cerrando...' : 'Confirmar cierre'}
                        </button>
                    </div>
                </Tarjeta>
            )}
        </div>
    );
};

export default ContenedorArqueo;