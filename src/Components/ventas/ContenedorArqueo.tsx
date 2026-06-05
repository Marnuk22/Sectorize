import { useState } from 'react';
import { useVentas } from '../../context/VentasContext';
import { Lock, Unlock, TrendingUp, ShoppingBag } from 'lucide-react';
import { labelMetodo, iconoMetodo } from '../../config/metodosPago';

const ContenedorArqueo = () => {
    const { arqueoActivo, historialVentas, abrirArqueo, cerrarArqueo } = useVentas();
    const [montoInicial, setMontoInicial] = useState('');
    const [montoReal, setMontoReal] = useState('');
    const [confirmandoCierre, setConfirmandoCierre] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    // Calcular totales del arqueo activo
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
        const monto = parseFloat(montoReal);
        if (isNaN(monto) || monto < 0) { setError('Ingresá un monto válido'); return; }
        setCargando(true);
        setError('');
        try {
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
                <div className="inline-flex p-4 bg-gray-100 rounded-full mb-3">
                    <Lock size={28} className="text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-700 text-lg">Caja cerrada</h3>
                <p className="text-gray-400 text-sm mt-1">Abrí la caja para comenzar a registrar ventas</p>
            </div>

            <div className="bg-white border rounded-2xl p-5 space-y-3">
                <label className="text-sm font-medium text-gray-600">Monto inicial en caja ($)</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    value={montoInicial}
                    onChange={e => setMontoInicial(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAbrirArqueo()}
                />
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <button
                    onClick={handleAbrirArqueo}
                    disabled={cargando}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                    <Unlock size={18} />
                    {cargando ? 'Abriendo...' : 'Abrir caja'}
                </button>
            </div>
        </div>
    );

    // Con arqueo abierto
    return (
        <div className="space-y-4">
            {/* Header arqueo activo */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-xl">
                        <Unlock size={20} className="text-green-700" />
                    </div>
                    <div>
                        <p className="font-bold text-green-800">Caja abierta</p>
                        <p className="text-xs text-green-600">
                            Desde {arqueoActivo.fechaApertura.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <p className="text-sm text-green-700 font-medium">
                    Inicial: ${arqueoActivo.montoInicial.toLocaleString()}
                </p>
            </div>

            {/* Resumen de ventas */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className="text-blue-500" />
                        <p className="text-xs text-gray-400">Total vendido</p>
                    </div>
                    <p className="text-2xl font-black text-gray-800">${totalVentas.toLocaleString()}</p>
                </div>
                <div className="bg-white border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag size={16} className="text-purple-500" />
                        <p className="text-xs text-gray-400">Ventas</p>
                    </div>
                    <p className="text-2xl font-black text-gray-800">{cantidadVentas}</p>
                </div>
            </div>

            {/* Ventas por método de pago */}
            {Object.keys(ventasPorMetodo).length > 0 && (
                <div className="bg-white border rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-3">Por método de pago</p>
                    {(Object.entries(ventasPorMetodo) as [string, number][]).map(([metodo, total]) => {
                        const Icono = iconoMetodo(metodo);
                        return (
                            <div key={metodo} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icono size={15} className="text-gray-400" />
                                    <span className="text-sm text-gray-600">{labelMetodo(metodo)}</span>
                                </div>
                                <span className="font-bold text-gray-800">${total.toLocaleString()}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Monto esperado */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center">
                <p className="text-sm font-medium text-blue-700">Monto esperado en caja</p>
                <p className="text-xl font-black text-blue-800">${montoEsperado.toLocaleString()}</p>
            </div>

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
                <div className="bg-white border-2 border-red-200 rounded-2xl p-5 space-y-3">
                    <p className="font-bold text-gray-700">¿Cuánto hay físicamente en caja?</p>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="0.00"
                        value={montoReal}
                        onChange={e => setMontoReal(e.target.value)}
                        autoFocus
                    />

                    {/* Diferencia en tiempo real */}
                    {montoReal && (
                        <div className={`p-3 rounded-xl text-center ${diferencia >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="text-xs text-gray-500 mb-1">Diferencia</p>
                            <p className={`text-xl font-black ${diferencia >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString()}
                            </p>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            onClick={() => { setConfirmandoCierre(false); setMontoReal(''); setError(''); }}
                            className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
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
                </div>
            )}
        </div>
    );
};

export default ContenedorArqueo;