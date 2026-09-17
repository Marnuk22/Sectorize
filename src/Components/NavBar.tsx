import { useState } from 'react';
import { useModulos } from '../hooks/useModulos';
import { MODULOS } from '../config/modulos';
import MenuUsuario, { type PanelUsuario } from './Usuario/MenuUsuario';
import PanelLateral from './Usuario/PanelLateral';
import PanelDatosLocal from './Usuario/PanelDatosLocal';
import PanelConfiguracion from './Usuario/PanelConfiguracion';
import PanelAyuda from './Usuario/PanelAyuda';
import PanelImpresoras from './Usuario/PanelImpresoras';
import PanelCatalogo from './Usuario/PanelCatalogo';
import PanelMiPlan from './Usuario/PanelMiPlan';
import PanelEmpleados from './Usuario/PanelEmpleados';

export type SeccionPDV = 'sectores' | 'inventario' | 'ventas' | 'mostrador' | 'socios' | 'informe';

interface NavBarProps {
    seccionActiva: SeccionPDV;
    setSeccionActiva: (seccion: SeccionPDV) => void;
}

const SECCION_POR_MODULO: Record<string, SeccionPDV> = {
    salon: 'sectores',
    mostrador: 'mostrador',
    suscripciones: 'socios',
    inventario: 'inventario',
    ventas: 'ventas',
    informe: 'informe',
};

const TITULOS_PANEL: Record<PanelUsuario, string> = {
    local:      'Datos del local',
    config:     'Configuración',
    impresoras: 'Impresoras',
    catalogo:   'Catálogo público',
    subscripcion: 'Mi suscripción',
    empleados:  'Empleados',
    ayuda:      'Ayuda y soporte',
};

const NavBar = ({ seccionActiva, setSeccionActiva }: NavBarProps) => {
    const { modulos } = useModulos();
    // Si volvimos del callback de OAuth de Tiendanube (?tiendanube=...), hay
    // que abrir "Mi plan" directo, porque ese panel es el que lee y muestra
    // el resultado — si no, la página carga sin ningún panel abierto y el
    // aviso de éxito/error nunca se ve.
    const [panelAbierto, setPanelAbierto] = useState<PanelUsuario | null>(
        () => new URLSearchParams(window.location.search).get('tiendanube') ? 'subscripcion' : null
    );

    const ordenSecciones: string[] = ['salon', 'mostrador', 'suscripciones', 'inventario', 'ventas', 'informe'];

    const seccionesVisibles = ordenSecciones
        .filter(m => modulos.includes(m as any))
        .map(m => ({
            modulo: m,
            seccion: SECCION_POR_MODULO[m],
            config: MODULOS[m as keyof typeof MODULOS],
        }));

    const renderPanel = () => {
        switch (panelAbierto) {
            case 'local':      return <PanelDatosLocal onCerrar={() => setPanelAbierto(null)} />;
            case 'config':     return <PanelConfiguracion onCerrar={() => setPanelAbierto(null)} />;
            case 'impresoras': return <PanelImpresoras />;
            case 'catalogo':   return <PanelCatalogo />;
            case 'subscripcion': return <PanelMiPlan />;
            case 'empleados':  return <PanelEmpleados />;
            case 'ayuda':      return <PanelAyuda />;
            default:           return null;
        }
    };

    return (
        <>
            <nav className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-5">
                <div className="flex items-center pr-3 sm:pr-5 border-r border-stone-200 shrink-0">
                    <MenuUsuario onAbrirPanel={setPanelAbierto} />
                </div>

                <div className="flex-1 min-w-0 flex gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {seccionesVisibles.map(({ modulo, seccion, config }) => {
                        const Icono = config?.icono;
                        const activa = seccionActiva === seccion;
                        return (
                            <button
                                key={modulo}
                                onClick={() => setSeccionActiva(seccion)}
                                aria-current={activa ? 'page' : undefined}
                                className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                                    activa
                                        ? 'bg-white text-violet-700 shadow-sm'
                                        : 'text-stone-500 hover:text-stone-700'
                                }`}
                            >
                                {Icono && <Icono size={16} />}
                                {config?.nombre}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <PanelLateral
                titulo={panelAbierto ? TITULOS_PANEL[panelAbierto] : ''}
                abierto={panelAbierto !== null}
                onCerrar={() => setPanelAbierto(null)}
            >
                {renderPanel()}
            </PanelLateral>
        </>
    );
};

export default NavBar;