import { useState } from 'react';
import { Plus, MoreHorizontal, KeyRound, Ban, CheckCircle2, Pencil, Users } from 'lucide-react';
import { useEmpleados, type EmpleadoUI } from '../../hooks/useEmpleados';
import { useAuth } from '../../context/AuthContext';
import { Tarjeta, Etiqueta, Boton, EstadoVacio, ModalBase, Campo } from '../ui/ComponentesBase';
import ModalEmpleado from './ModalEmpleado';

const PanelEmpleados = () => {
    const { sucursales } = useAuth();
    const { empleados, cargando, desactivar, reactivar, restablecerPassword } = useEmpleados();

    const [modalEmpleado, setModalEmpleado] = useState<EmpleadoUI | null | undefined>(undefined);
    const [modalPassword, setModalPassword] = useState<EmpleadoUI | null>(null);
    const [confirmarBaja, setConfirmarBaja] = useState<EmpleadoUI | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');

    const handleDesactivar = async () => {
        if (!confirmarBaja) return;
        setProcesando(true);
        setError('');
        try {
            await desactivar(confirmarBaja.id);
            setConfirmarBaja(null);
        } catch (err: any) {
            setError(err.message ?? 'No se pudo desactivar');
        } finally {
            setProcesando(false);
        }
    };

    if (cargando) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Boton variante="primario" icono={<Plus size={16} />} onClick={() => setModalEmpleado(null)} className="w-full">
                Nuevo empleado
            </Boton>

            {empleados.length === 0 ? (
                <EstadoVacio
                    icono={<Users size={28} />}
                    titulo="Sin empleados todavía"
                    descripcion="Creá encargados o empleados y asignales una sucursal."
                />
            ) : (
                <div className="space-y-2">
                    {empleados.map(emp => (
                        <Tarjeta key={emp.id}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-stone-800 truncate">{emp.nombre_usuario}</p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        <Etiqueta tono={emp.rol === 'encargado' ? 'acento' : 'neutral'}>
                                            {emp.rol === 'encargado' ? 'Encargado' : 'Empleado'}
                                        </Etiqueta>
                                        {sucursales.length > 1 && <Etiqueta>{emp.sucursal_nombre}</Etiqueta>}
                                        <Etiqueta tono={emp.activo ? 'exito' : 'alerta'}>
                                            {emp.activo ? 'Activo' : 'Inactivo'}
                                        </Etiqueta>
                                    </div>
                                </div>
                                <MenuAccionesEmpleado
                                    empleado={emp}
                                    onEditar={() => setModalEmpleado(emp)}
                                    onRestablecerPassword={() => { setModalPassword(emp); setError(''); }}
                                    onDesactivar={() => { setConfirmarBaja(emp); setError(''); }}
                                    onReactivar={() => reactivar(emp.id)}
                                />
                            </div>
                        </Tarjeta>
                    ))}
                </div>
            )}

            {modalEmpleado !== undefined && (
                <ModalEmpleado empleado={modalEmpleado} onCerrar={() => setModalEmpleado(undefined)} />
            )}

            {modalPassword && (
                <ModalRestablecerPassword
                    empleado={modalPassword}
                    onRestablecer={restablecerPassword}
                    onCerrar={() => setModalPassword(null)}
                />
            )}

            {confirmarBaja && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-red-50 rounded-xl shrink-0">
                                <Ban size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800">Desactivar empleado</h3>
                                <p className="text-sm text-stone-500 mt-1">
                                    <strong className="text-stone-700">{confirmarBaja.nombre_usuario}</strong> va a perder acceso a la app de inmediato. Podés reactivarlo cuando quieras.
                                </p>
                            </div>
                        </div>

                        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setConfirmarBaja(null); setError(''); }}
                                className="flex-1 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDesactivar}
                                disabled={procesando}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                            >
                                {procesando ? 'Desactivando...' : 'Desactivar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Menú de acciones secundarias de un empleado ---
interface MenuAccionesProps {
    empleado: EmpleadoUI;
    onEditar: () => void;
    onRestablecerPassword: () => void;
    onDesactivar: () => void;
    onReactivar: () => void;
}

const MenuAccionesEmpleado = ({ empleado, onEditar, onRestablecerPassword, onDesactivar, onReactivar }: MenuAccionesProps) => {
    const [abierto, setAbierto] = useState(false);
    const item = 'w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 text-left transition-colors';

    return (
        <>
            {abierto && <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />}

            <div className="relative shrink-0">
                <button
                    onClick={() => setAbierto(a => !a)}
                    className={`py-1.5 px-2 border rounded-lg text-xs transition-colors ${
                        abierto ? 'border-violet-200 bg-violet-50 text-violet-600' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                    title="Más acciones"
                >
                    <MoreHorizontal size={14} />
                </button>

                {abierto && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                        <button className={item} onClick={() => { onEditar(); setAbierto(false); }}>
                            <Pencil size={12} className="text-stone-400" /> Editar
                        </button>

                        <button className={item} onClick={() => { onRestablecerPassword(); setAbierto(false); }}>
                            <KeyRound size={12} className="text-stone-400" /> Restablecer contraseña
                        </button>

                        <div className="h-px bg-stone-100 my-1" />

                        {empleado.activo ? (
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left transition-colors"
                                onClick={() => { onDesactivar(); setAbierto(false); }}
                            >
                                <Ban size={12} /> Desactivar
                            </button>
                        ) : (
                            <button className={item} onClick={() => { onReactivar(); setAbierto(false); }}>
                                <CheckCircle2 size={12} className="text-green-500" /> Reactivar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

// --- Modal chico: restablecer contraseña de un empleado existente ---
interface ModalRestablecerPasswordProps {
    empleado: EmpleadoUI;
    onRestablecer: (id: string, password: string) => Promise<void>;
    onCerrar: () => void;
}

const ModalRestablecerPassword = ({ empleado, onRestablecer, onCerrar }: ModalRestablecerPasswordProps) => {
    const [password, setPassword] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [listo, setListo] = useState(false);

    const handleGuardar = async () => {
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
        setGuardando(true);
        setError('');
        try {
            await onRestablecer(empleado.id, password);
            setListo(true);
            setTimeout(onCerrar, 900);
        } catch (err: any) {
            setError(err.message ?? 'No se pudo restablecer la contraseña');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <ModalBase isOpen onClose={onCerrar} titulo={`Restablecer contraseña de ${empleado.nombre_usuario}`} ancho="sm">
            <div className="space-y-3">
                <Campo
                    etiqueta="Contraseña nueva"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    ayuda="Se la tenés que pasar vos al empleado — no se le manda ningún mail."
                    autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Boton variante="primario" onClick={handleGuardar} disabled={guardando} className="w-full">
                    {listo ? 'Listo' : guardando ? 'Guardando...' : 'Restablecer'}
                </Boton>
            </div>
        </ModalBase>
    );
};

export default PanelEmpleados;
