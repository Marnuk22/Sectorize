import { useState } from 'react';
import { ModalBase, Campo, Boton } from '../ui/ComponentesBase';
import { useAuth } from '../../context/AuthContext';
import { useEmpleados, type EmpleadoUI, type RolEmpleado } from '../../hooks/useEmpleados';

interface Props {
    empleado?: EmpleadoUI | null;
    onCerrar: () => void;
}

const ModalEmpleado = ({ empleado, onCerrar }: Props) => {
    const { sucursales } = useAuth();
    const { crear, editar } = useEmpleados();
    const esEdicion = !!empleado;

    const [nombreUsuario, setNombreUsuario] = useState(empleado?.nombre_usuario ?? '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rol, setRol] = useState<RolEmpleado>(empleado?.rol ?? 'empleado');
    const [localId, setLocalId] = useState(empleado?.local_id ?? sucursales[0]?.id ?? '');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const handleGuardar = async () => {
        setError('');
        if (!nombreUsuario.trim()) { setError('Ingresá un nombre'); return; }
        if (!localId) { setError('Elegí una sucursal'); return; }
        if (!esEdicion) {
            if (!email.trim()) { setError('Ingresá un mail'); return; }
            if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
        }

        setGuardando(true);
        try {
            if (esEdicion) {
                await editar(empleado.id, { nombre_usuario: nombreUsuario.trim(), rol, local_id: localId });
            } else {
                await crear({ nombre_usuario: nombreUsuario.trim(), email: email.trim(), password, rol, local_id: localId });
            }
            onCerrar();
        } catch (err: any) {
            setError(err.message ?? 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <ModalBase isOpen onClose={onCerrar} titulo={esEdicion ? 'Editar empleado' : 'Nuevo empleado'} ancho="sm">
            <div className="space-y-3">
                <Campo
                    etiqueta="Nombre"
                    value={nombreUsuario}
                    onChange={e => setNombreUsuario(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    autoFocus
                />

                {!esEdicion && (
                    <>
                        <Campo
                            etiqueta="Mail"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="empleado@ejemplo.com"
                        />
                        <Campo
                            etiqueta="Contraseña temporal"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            ayuda="El empleado va a poder entrar con este mail y esta contraseña de una."
                        />
                    </>
                )}

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-stone-500">Rol</label>
                    <div className="flex gap-2">
                        <Boton type="button" activo={rol === 'empleado'} onClick={() => setRol('empleado')} className="flex-1">
                            Empleado
                        </Boton>
                        <Boton type="button" activo={rol === 'encargado'} onClick={() => setRol('encargado')} className="flex-1">
                            Encargado
                        </Boton>
                    </div>
                </div>

                {sucursales.length > 1 && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-stone-500">Sucursal</label>
                        <select
                            value={localId}
                            onChange={e => setLocalId(e.target.value)}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                <Boton variante="primario" onClick={handleGuardar} disabled={guardando} className="w-full">
                    {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear empleado'}
                </Boton>
            </div>
        </ModalBase>
    );
};

export default ModalEmpleado;
