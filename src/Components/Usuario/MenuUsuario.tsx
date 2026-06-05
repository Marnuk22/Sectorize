import { useState, useRef, useEffect } from 'react';
import { ChevronDown, CreditCard, Store, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';

export type PanelUsuario = 'plan' | 'local' | 'config' | 'ayuda';

interface Props {
    onAbrirPanel: (panel: PanelUsuario) => void;
}

const MenuUsuario = ({ onAbrirPanel }: Props) => {
    const { local, perfil, signOut } = useAuth();
    const { planInfo } = usePlan();
    const [abierto, setAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer click fuera
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
        { id: 'plan' as const, label: 'Mi plan', icono: CreditCard, extra: planInfo.nombre },
        { id: 'local' as const, label: 'Datos del local', icono: Store },
        { id: 'config' as const, label: 'Configuración', icono: Settings },
        { id: 'ayuda' as const, label: 'Ayuda y soporte', icono: HelpCircle },
    ];

    const abrirPanel = (panel: PanelUsuario) => {
        setAbierto(false);
        onAbrirPanel(panel);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setAbierto(!abierto)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-xl p-1 pr-2 transition-colors"
            >
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {iniciales}
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-800 truncate max-w-[160px]">
                    {local?.nombre ?? 'Vallis'}
                </span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
            </button>

            {abierto && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header del menú */}
                    <div className="p-4 border-b bg-gray-50">
                        <p className="font-bold text-gray-800 truncate">{local?.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{perfil?.nombre_usuario}</p>
                        <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            Plan {planInfo.nombre}
                        </span>
                    </div>

                    {/* Opciones */}
                    <div className="py-1">
                        {opciones.map(op => {
                            const Icono = op.icono;
                            return (
                                <button
                                    key={op.id}
                                    onClick={() => abrirPanel(op.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <Icono size={18} className="text-gray-400" />
                                    <span className="text-sm text-gray-700 flex-1">{op.label}</span>
                                    {op.extra && (
                                        <span className="text-xs text-gray-400">{op.extra}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Cerrar sesión */}
                    <div className="border-t py-1">
                        <button
                            onClick={() => { setAbierto(false); signOut(); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left group"
                        >
                            <LogOut size={18} className="text-gray-400 group-hover:text-red-500" />
                            <span className="text-sm text-gray-700 group-hover:text-red-600">Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuUsuario;