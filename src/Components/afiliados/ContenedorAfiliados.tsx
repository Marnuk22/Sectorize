import { useState } from 'react';
import { Search, UserPlus, CreditCard, Users } from 'lucide-react';
import { useAfiliados } from '../../context/AfiliadosContext';
import PanelLateral from '../Usuario/PanelLateral';
import PanelMembresias from './PanelMembresias';
import type { SocioConEstado } from '../../types';
import ModalSocio from './ModalSocio';
import ModalCobroMembresia from './ModalCobroMembresia';

const ESTADO_CONFIG = {
    al_dia:        { label: 'Al día',        color: 'bg-green-50 text-green-700 border-green-200' },
    por_vencer:    { label: 'Por vencer',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
    vencido:       { label: 'Vencido',       color: 'bg-red-50 text-red-700 border-red-200' },
    sin_membresia: { label: 'Sin membresía', color: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const ContenedorAfiliados = () => {
    const { socios, cargando } = useAfiliados();
    const [busqueda, setBusqueda] = useState('');
    const [panelMembresias, setPanelMembresias] = useState(false);
    const [modalSocio, setModalSocio] = useState<boolean>(false);
    const [socioCobro, setSocioCobro] = useState<SocioConEstado | null>(null);

    const sociosFiltrados = socios.filter(s => {
        const nombreCompleto = `${s.nombre} ${s.apellido ?? ''}`.toLowerCase();
        return nombreCompleto.includes(busqueda.toLowerCase());
    });

    // Contadores para el resumen
    const resumen = {
        total: socios.length,
        alDia: socios.filter(s => s.estadoMembresia === 'al_dia').length,
        porVencer: socios.filter(s => s.estadoMembresia === 'por_vencer').length,
        vencidos: socios.filter(s => s.estadoMembresia === 'vencido').length,
    };

    if (cargando) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Topbar */}
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800 w-full sm:flex-1 sm:w-auto">Afiliados</h2>
                <div className="relative flex-1 sm:flex-none">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className="w-full sm:w-48 pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Buscar socio..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setPanelMembresias(true)}
                    className="flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                >
                    <CreditCard size={16} /> Membresías
                </button>
                <button
                    onClick={() => setModalSocio(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap"
                >
                    <UserPlus size={16} /> Nuevo socio
                </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white border rounded-xl p-3">
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-xl font-black text-gray-800">{resumen.total}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="text-xs text-green-600">Al día</p>
                    <p className="text-xl font-black text-green-700">{resumen.alDia}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs text-amber-600">Por vencer</p>
                    <p className="text-xl font-black text-amber-700">{resumen.porVencer}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-xs text-red-600">Vencidos</p>
                    <p className="text-xl font-black text-red-700">{resumen.vencidos}</p>
                </div>
            </div>

            {/* Lista de socios */}
            {sociosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Users size={40} className="mb-3" />
                    <p className="text-sm">{busqueda ? 'No se encontraron socios' : 'Todavía no tenés socios. Agregá el primero.'}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sociosFiltrados.map(socio => (
                        <SocioCard key={socio.id} socio={socio} onClick={() => setSocioCobro(socio)} />
                    ))}
                </div>
            )}

            {/* Panel de membresías */}
            <PanelLateral
                titulo="Membresías"
                abierto={panelMembresias}
                onCerrar={() => setPanelMembresias(false)}
            >
                <PanelMembresias />
            </PanelLateral>
            {/* Modal de alta/edición de socio */}
            {modalSocio && (
                <ModalSocio onCerrar={() => setModalSocio(false)} />
            )}
             {/* Modal de cobro de membresía */}
            {socioCobro && (
                <ModalCobroMembresia socio={socioCobro} onCerrar={() => setSocioCobro(null)} />
            )}
        </div>
    );
};

// Tarjeta de un socio
const SocioCard = ({ socio, onClick }: { socio: SocioConEstado; onClick: () => void }) => {
    const config = ESTADO_CONFIG[socio.estadoMembresia];
    const iniciales = `${socio.nombre.charAt(0)}${socio.apellido?.charAt(0) ?? ''}`.toUpperCase();

    return (
        <div 
            onClick={onClick}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border hover:border-gray-200 transition-colors">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                {iniciales}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">
                    {socio.nombre} {socio.apellido}
                </p>
                <p className="text-xs text-gray-400">
                    {socio.membresia ? socio.membresia.nombre : 'Sin membresía asignada'}
                    {socio.diasRestantes !== null && socio.diasRestantes >= 0 && ` · ${socio.diasRestantes} días`}
                </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${config.color}`}>
                {config.label}
            </span>
        </div>
    );
};

export default ContenedorAfiliados;