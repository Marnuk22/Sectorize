import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAfiliados } from '../../context/AfiliadosContext';
import type { Socio } from '../../types';

interface Props {
    socio?: Socio | null;
    onCerrar: () => void;
}

const ModalSocio = ({ socio, onCerrar }: Props) => {
    const { agregarSocio, editarSocio } = useAfiliados();
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        dni: '',
        fecha_nacimiento: '',
        notas: '',
    });
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (socio) {
            setForm({
                nombre: socio.nombre,
                apellido: socio.apellido ?? '',
                telefono: socio.telefono ?? '',
                email: socio.email ?? '',
                dni: socio.dni ?? '',
                fecha_nacimiento: socio.fecha_nacimiento ?? '',
                notas: socio.notas ?? '',
            });
        }
    }, [socio]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }

        setCargando(true);
        setError('');
        try {
            const datos = {
                nombre: form.nombre.trim(),
                apellido: form.apellido.trim() || null,
                telefono: form.telefono.trim() || null,
                email: form.email.trim() || null,
                dni: form.dni.trim() || null,
                fecha_nacimiento: form.fecha_nacimiento || null,
                notas: form.notas.trim() || null,
            };

            if (socio) {
                await editarSocio(socio.id, datos);
            } else {
                await agregarSocio(datos);
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-bold text-gray-800 text-lg">
                        {socio ? 'Editar socio' : 'Nuevo socio'}
                    </h2>
                    <button onClick={onCerrar} className="p-2 hover:bg-gray-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Nombre *</label>
                            <input
                                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.nombre}
                                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                                placeholder="Juan"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Apellido</label>
                            <input
                                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.apellido}
                                onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))}
                                placeholder="Pérez"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Teléfono</label>
                            <input
                                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.telefono}
                                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                                placeholder="11 1234-5678"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">DNI</label>
                            <input
                                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.dni}
                                onChange={e => setForm(p => ({ ...p, dni: e.target.value }))}
                                placeholder="30123456"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Email</label>
                        <input
                            type="email"
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="juan@email.com"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Fecha de nacimiento</label>
                        <input
                            type="date"
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.fecha_nacimiento}
                            onChange={e => setForm(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Notas</label>
                        <textarea
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={2}
                            value={form.notas}
                            onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                            placeholder="Lesiones, objetivos, observaciones..."
                        />
                    </div>

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
                            {cargando ? 'Guardando...' : socio ? 'Guardar' : 'Crear socio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModalSocio;