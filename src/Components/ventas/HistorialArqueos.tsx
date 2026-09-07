import { useVentas } from '../../context/VentasContext';
import { Tarjeta } from '../ui/ComponentesBase';
import { clasificarDiferencia, type EstadoDiferencia } from '../../logic/arqueoServices';

// Mismo criterio de color que el arqueo en curso (ContenedorArqueo). "Sobro"
// usa ámbar vía override de clase, no es uno de los 4 tonos de ComponentesBase.
const ESTILOS: Record<EstadoDiferencia, { tarjeta: string; texto: string; label: (n: number) => string }> = {
    cuadro: { tarjeta: '', texto: 'text-green-700', label: () => 'Cuadró' },
    falto:  { tarjeta: '!bg-red-50 !border-red-200', texto: 'text-red-700', label: n => `Faltó $${Math.abs(n).toLocaleString()}` },
    sobro:  { tarjeta: '!bg-amber-50 !border-amber-200', texto: 'text-amber-700', label: n => `Sobró $${Math.abs(n).toLocaleString()}` },
};

const HistorialArqueos = () => {
    const { ArqueosHistorial } = useVentas();
    const cerrados = ArqueosHistorial.filter(a => a.estado === 'cerrado');

    if (cerrados.length === 0) {
        return <p className="text-center text-stone-400 text-sm py-6">Todavía no hay cierres de caja registrados.</p>;
    }

    return (
        <div className="space-y-2">
            {cerrados.map(a => {
                // Arqueos cerrados antes de que este cálculo existiera pueden
                // no tener monto_final_esperado — se muestran sin color en vez
                // de asumir una diferencia falsa.
                const diferencia = a.montoFinalEsperado !== null ? (a.montoFinalReal ?? 0) - a.montoFinalEsperado : null;
                const estado = diferencia !== null ? clasificarDiferencia(diferencia) : null;
                const estilo = estado ? ESTILOS[estado] : null;

                return (
                    <Tarjeta key={a.id} tono="neutral" padding="sm" className={estilo?.tarjeta ?? ''}>
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-bold text-stone-700">
                                    {a.fechaApertura.toLocaleDateString('es-AR')}
                                </p>
                                <p className="text-xs text-stone-400">
                                    {a.fechaApertura.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    {a.fechaCierre && ` – ${a.fechaCierre.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-black ${estilo?.texto ?? 'text-stone-400'}`}>
                                    {estilo && diferencia !== null ? estilo.label(diferencia) : 'Sin datos'}
                                </p>
                                <p className="text-xs text-stone-400">
                                    Contado ${a.montoFinalReal?.toLocaleString() ?? '—'}
                                </p>
                            </div>
                        </div>
                    </Tarjeta>
                );
            })}
        </div>
    );
};

export default HistorialArqueos;
