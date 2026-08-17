import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Store, Settings, HelpCircle, LogOut, Printer, Globe, Sparkles, Plus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ModalBase, Campo, Boton } from '../ui/ComponentesBase';

export type PanelUsuario = 'local' | 'config' | 'impresoras' | 'catalogo' | 'subscripcion' | 'empleados' | 'ayuda';

interface Props {
    onAbrirPanel: (panel: PanelUsuario) => void;
}

const MenuUsuario = ({ onAbrirPanel }: Props) => {
    const { local, perfil, sucursales, cambiarSucursal, refrescar, signOut } = useAuth();
    const [abierto, setAbierto] = useState(false);
    const [modalSucursal, setModalSucursal] = useState(false);
    const [nombreSucursal, setNombreSucursal] = useState('');
    const [creando, setCreando] = useState(false);
    const [errorSucursal, setErrorSucursal] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const iniciales = (local?.nombre ?? 'V').charAt(0).toUpperCase();

    const opciones = [
        { id: 'local' as const, label: 'Datos del local', icono: Store },
        { id: 'config' as const, label: 'Configuración', icono: Settings },
        { id: 'impresoras' as const, label: 'Impresoras', icono: Printer },
        { id: 'catalogo' as const, label: 'Catálogo Publico', icono: Globe },
        { id: 'subscripcion' as const, label: 'Mi suscripción', icono: Sparkles },
        { id: 'ayuda' as const, label: 'Ayuda y soporte', icono: HelpCircle },
    ];

    const abrirPanel = (panel: PanelUsuario) => {
        setAbierto(false);
        onAbrirPanel(panel);
    };

    const agregarSucursal = async () => {
        if (!nombreSucursal.trim()) return;
        setCreando(true);
        setErrorSucursal('');
        try {
            const { error } = await supabase.rpc('agregar_sucursal', { p_nombre: nombreSucursal.trim() });
            if (error) throw error;
            await refrescar();
            setModalSucursal(false);
            setNombreSucursal('');
        } catch (err: any) {
            setErrorSucursal(err.message ?? 'No se pudo crear la sucursal');
        } finally {
            setCreando(false);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setAbierto(!abierto)}
                className="flex items-center gap-2 hover:bg-stone-50 rounded-xl p-1 sm:pr-2 transition-colors"
            >
                <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                    {iniciales}
                </div>
                <span className="hidden sm:block text-xl font-bold tracking-tight text-stone-800 truncate max-w-[160px]">
                    {local?.nombre ?? 'Vallis'}
                </span>
                <ChevronDown size={18} className={`hidden sm:block text-stone-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
            </button>

            {abierto && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header del menú */}
                    <div className="p-4 border-b border-stone-100 bg-stone-50">
                        <p className="font-bold text-stone-800 truncate">{local?.nombre}</p>
                        <p className="text-xs text-stone-400 truncate">{perfil?.nombre_usuario}</p>
                        <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                            Fase de prueba
                        </span>
                    </div>

                    {/* Selector de sucursal — solo aparece si el negocio tiene más de una */}
                    {perfil?.rol === 'dueño' && (
                        <div className="py-1 border-b border-stone-100">
                            {sucursales.length > 1 && (
                                <>
                                    <p className="px-4 pt-1 pb-1.5 text-xs font-medium text-stone-400">Sucursal activa</p>
                                    {sucursales.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => { cambiarSucursal(s.id); setAbierto(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                                                s.id === local?.id ? 'text-violet-700 font-medium bg-violet-50' : 'text-stone-700 hover:bg-stone-50'
                                            }`}
                                        >
                                            {s.nombre}
                                        </button>
                                    ))}
                                </>
                            )}
                            <button
                                onClick={() => { setAbierto(false); setModalSucursal(true); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-violet-600 hover:bg-violet-50 transition-colors"
                            >
                                <Plus size={16} />
                                Agregar sucursal
                            </button>
                            <button
                                onClick={() => abrirPanel('empleados')}
                                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                            >
                                <Users size={16} className="text-stone-400" />
                                Empleados
                            </button>
                        </div>
                    )}

                    {/* Opciones */}
                    <div className="py-1">
                        {opciones.map(op => {
                            const Icono = op.icono;
                            return (
                                <button
                                    key={op.id}
                                    onClick={() => abrirPanel(op.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
                                >
                                    <Icono size={18} className="text-stone-400" />
                                    <span className="text-sm text-stone-700 flex-1">{op.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Cerrar sesión */}
                    <div className="border-t border-stone-100 py-1">
                        <button
                            onClick={() => { setAbierto(false); signOut(); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left group"
                        >
                            <LogOut size={18} className="text-stone-400 group-hover:text-red-500" />
                            <span className="text-sm text-stone-700 group-hover:text-red-600">Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            )}

            <ModalBase isOpen={modalSucursal} onClose={() => setModalSucursal(false)} titulo="Agregar sucursal" ancho="sm">
                <div className="space-y-3">
                    <Campo
                        etiqueta="Nombre de la sucursal"
                        value={nombreSucursal}
                        onChange={(e) => setNombreSucursal(e.target.value)}
                        placeholder="Ej: Sucursal Centro"
                        ayuda="Arranca con el catálogo vacío — vas a poder compartir productos entre sucursales en un paso posterior."
                        autoFocus
                    />
                    {errorSucursal && <p className="text-xs text-red-500">{errorSucursal}</p>}
                    <Boton
                        variante="primario"
                        onClick={agregarSucursal}
                        disabled={creando || !nombreSucursal.trim()}
                        className="w-full"
                    >
                        {creando ? 'Creando...' : 'Crear sucursal'}
                    </Boton>
                </div>
            </ModalBase>
        </div>
    );
};

export default MenuUsuario;