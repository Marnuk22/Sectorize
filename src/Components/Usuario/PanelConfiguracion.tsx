import { useState } from 'react';
import { Check, Banknote, CreditCard, ArrowLeftRight, Wallet, Plus, X, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MODULOS, type ModuloId } from '../../config/modulos';
import ModalCambiarPassword from './ModalCambiarPassword';

interface Props {
    onCerrar: () => void;
}

const METODOS_BASE = [
    { id: 'efectivo',      label: 'Efectivo',      icono: Banknote },
    { id: 'tarjeta',       label: 'Tarjeta',       icono: CreditCard },
    { id: 'transferencia', label: 'Transferencia', icono: ArrowLeftRight },
];

const MONEDAS = [
    { id: 'ARS', label: 'Peso argentino ($)' },
    { id: 'USD', label: 'Dólar (US$)' },
    { id: 'EUR', label: 'Euro (€)' },
    { id: 'CLP', label: 'Peso chileno ($)' },
    { id: 'MXN', label: 'Peso mexicano ($)' },
];

const IDIOMAS = [
    { id: 'es', label: 'Español' },
    { id: 'en', label: 'English' },
    { id: 'pt', label: 'Português' },
];

const MODULOS_OPCIONALES = (Object.values(MODULOS) as (typeof MODULOS)[ModuloId][]).filter(m => !m.esNucleo);

const PanelConfiguracion = ({ onCerrar }: Props) => {
    const { local, perfil, actualizarLocal } = useAuth();
    const [cambiandoModulo, setCambiandoModulo] = useState<ModuloId | null>(null);
    const [errorModulo, setErrorModulo] = useState('');

    const metodosActuales = local?.metodos_pago ?? ['efectivo'];
    const idsBase = METODOS_BASE.map(m => m.id);

    const [metodos, setMetodos] = useState<string[]>(metodosActuales);
    // Los custom son los que están en metodos_pago pero no son base
    const [nuevoMetodo, setNuevoMetodo] = useState('');
    const [moneda, setMoneda] = useState(local?.moneda ?? 'ARS');
    const [idioma, setIdioma] = useState(local?.idioma ?? 'es');
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [error, setError] = useState('');
    const [modalPassword, setModalPassword] = useState(false);

    const metodosCustom = metodos.filter(m => !idsBase.includes(m));

    const toggleMetodo = (id: string) => {
        setMetodos(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const agregarCustom = () => {
        const nombre = nuevoMetodo.trim().toLowerCase();
        if (!nombre) return;
        if (metodos.includes(nombre) || idsBase.includes(nombre)) {
            setError('Ese método ya existe');
            return;
        }
        setMetodos(prev => [...prev, nombre]);
        setNuevoMetodo('');
        setError('');
    };

    const eliminarCustom = (id: string) => {
        setMetodos(prev => prev.filter(m => m !== id));
    };

    // Los módulos se guardan al toque (no junto con "Guardar configuración")
    // — es un on/off, no tiene sentido dejarlo a medio confirmar.
    const toggleModulo = async (id: ModuloId) => {
        const activos = local?.modulos ?? [];
        const nuevos = activos.includes(id) ? activos.filter(m => m !== id) : [...activos, id];
        setCambiandoModulo(id);
        setErrorModulo('');
        try {
            await actualizarLocal({ modulos: nuevos });
        } catch (err: any) {
            setErrorModulo(err.message ?? 'No se pudo actualizar el módulo');
        } finally {
            setCambiandoModulo(null);
        }
    };

    const handleGuardar = async () => {
        if (metodos.length === 0) {
            setError('Tenés que habilitar al menos un método de pago');
            return;
        }
        setGuardando(true);
        setError('');
        try {
            await actualizarLocal({ metodos_pago: metodos, moneda, idioma });
            setGuardado(true);
            setTimeout(() => { setGuardado(false); onCerrar(); }, 800);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Métodos de pago base */}
            <div>
                <label className="text-xs font-medium text-stone-500 uppercase">Métodos de pago</label>
                <p className="text-xs text-stone-400 mb-3">Los que aparecen al cobrar una venta.</p>
                <div className="space-y-2">
                    {METODOS_BASE.map(m => {
                        const Icono = m.icono;
                        const activo = metodos.includes(m.id);
                        return (
                            <button
                                key={m.id}
                                onClick={() => toggleMetodo(m.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                    activo ? 'border-violet-500 bg-violet-50' : 'border-stone-200 hover:bg-stone-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icono size={18} className={activo ? 'text-violet-600' : 'text-stone-400'} />
                                    <span className={`text-sm ${activo ? 'text-violet-700 font-medium' : 'text-stone-600'}`}>
                                        {m.label}
                                    </span>
                                </div>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${activo ? 'bg-violet-600' : 'border border-stone-300'}`}>
                                    {activo && <Check size={13} className="text-white" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Métodos personalizados */}
            <div>
                <label className="text-xs font-medium text-stone-500 uppercase">Métodos personalizados</label>
                <p className="text-xs text-stone-400 mb-3">Agregá los tuyos: Mercado Pago, QR, etc.</p>

                {metodosCustom.length > 0 && (
                    <div className="space-y-2 mb-3">
                        {metodosCustom.map(m => (
                            <div key={m} className="flex items-center justify-between p-3 rounded-xl border border-violet-500 bg-violet-50">
                                <div className="flex items-center gap-2">
                                    <Wallet size={18} className="text-violet-600" />
                                    <span className="text-sm text-violet-700 font-medium capitalize">{m}</span>
                                </div>
                                <button
                                    onClick={() => eliminarCustom(m)}
                                    className="p-1 hover:bg-violet-100 rounded-lg text-violet-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Ej: Mercado Pago"
                        value={nuevoMetodo}
                        onChange={e => setNuevoMetodo(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarCustom(); } }}
                    />
                    <button
                        onClick={agregarCustom}
                        className="px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center gap-1 text-sm font-medium transition-colors"
                    >
                        <Plus size={16} /> Agregar
                    </button>
                </div>
            </div>

            {/* Moneda */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-500 uppercase">Moneda</label>
                <select
                    className="border rounded-xl px-3 py-2 text-sm bg-white"
                    value={moneda}
                    onChange={e => setMoneda(e.target.value)}
                >
                    {MONEDAS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
            </div>

            {/* Idioma */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-500 uppercase">Idioma</label>
                <select
                    className="border rounded-xl px-3 py-2 text-sm bg-white"
                    value={idioma}
                    onChange={e => setIdioma(e.target.value)}
                >
                    {IDIOMAS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
                <p className="text-xs text-stone-400">El cambio de idioma se aplicará próximamente en toda la app.</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
                {guardado ? <><Check size={16} /> Guardado</> : guardando ? 'Guardando...' : 'Guardar configuración'}
            </button>

            {/* Módulos — dueño-only, afecta a todo el negocio */}
            {perfil?.rol === 'dueño' && (
                <div className="pt-4 border-t border-stone-100">
                    <label className="text-xs font-medium text-stone-500 uppercase">Módulos</label>
                    <p className="text-xs text-stone-400 mb-3">Secciones opcionales que podés activar o apagar cuando quieras.</p>
                    <div className="space-y-2">
                        {MODULOS_OPCIONALES.map(m => {
                            const Icono = m.icono;
                            const activo = (local?.modulos ?? []).includes(m.id);
                            const cambiando = cambiandoModulo === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => toggleModulo(m.id)}
                                    disabled={cambiando}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all disabled:opacity-60 ${
                                        activo ? 'border-violet-500 bg-violet-50' : 'border-stone-200 hover:bg-stone-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-left">
                                        <Icono size={18} className={activo ? 'text-violet-600' : 'text-stone-400'} />
                                        <div>
                                            <p className={`text-sm ${activo ? 'text-violet-700 font-medium' : 'text-stone-600'}`}>{m.nombre}</p>
                                            <p className="text-xs text-stone-400">{m.descripcion}</p>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${activo ? 'bg-violet-600' : 'border border-stone-300'}`}>
                                        {activo && <Check size={13} className="text-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {errorModulo && <p className="text-xs text-red-500 mt-2">{errorModulo}</p>}
                </div>
            )}

            {/* Seguridad */}
            <div className="pt-4 border-t border-stone-100">
                <label className="text-xs font-medium text-stone-500 uppercase">Seguridad</label>
                <button
                    onClick={() => setModalPassword(true)}
                    className="w-full flex items-center gap-2.5 p-3 mt-2 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-left"
                >
                    <Lock size={18} className="text-stone-400" />
                    <span className="text-sm text-stone-700">Cambiar contraseña</span>
                </button>
            </div>

            <ModalCambiarPassword isOpen={modalPassword} onClose={() => setModalPassword(false)} />
        </div>
    );
};

export default PanelConfiguracion;