import { useState } from 'react';
import { useModulos } from '../hooks/useModulos';
import { MODULOS } from '../config/modulos';
import MenuUsuario, { type PanelUsuario } from './Usuario/MenuUsuario';
import PanelLateral from './Usuario/PanelLateral';
import PanelMiPlan from './Usuario/PanelMiPlan';
import PanelDatosLocal from './Usuario/PanelDatosLocal';
import PanelConfiguracion from './Usuario/PanelConfiguracion';
import PanelAyuda from './Usuario/PanelAyuda';

export type SeccionPDV = 'sectores' | 'inventario' | 'ventas' | 'mostrador' | 'socios';

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
};

const TITULOS_PANEL: Record<PanelUsuario, string> = {
    plan:   'Mi plan',
    local:  'Datos del local',
    config: 'Configuración',
    ayuda:  'Ayuda y soporte',
};

const NavBar = ({ seccionActiva, setSeccionActiva }: NavBarProps) => {
    const { modulos } = useModulos();
    const [panelAbierto, setPanelAbierto] = useState<PanelUsuario | null>(null);

    const ordenSecciones: string[] = ['salon', 'mostrador', 'suscripciones', 'inventario', 'ventas'];

    const seccionesVisibles = ordenSecciones
        .filter(m => modulos.includes(m as any))
        .map(m => ({
            modulo: m,
            seccion: SECCION_POR_MODULO[m],
            config: MODULOS[m as keyof typeof MODULOS],
        }));

    const renderPanel = () => {
        switch (panelAbierto) {
            case 'plan':   return <PanelMiPlan />;
            case 'local':  return <PanelDatosLocal onCerrar={() => setPanelAbierto(null)} />;
            case 'config': return <PanelConfiguracion onCerrar={() => setPanelAbierto(null)} />;
            case 'ayuda':  return <PanelAyuda />;
            default:       return null;
        }
    };

    return (
        <>
            <nav className="bg-white shadow-md px-6 py-4 flex justify-start items-center gap-6">
                <MenuUsuario onAbrirPanel={setPanelAbierto} />

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    {seccionesVisibles.map(({ modulo, seccion, config }) => {
                        const Icono = config?.icono;
                        return (
                            <button
                                key={modulo}
                                onClick={() => setSeccionActiva(seccion)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                                    seccionActiva === seccion
                                        ? 'bg-white shadow-sm text-red-500'
                                        : 'text-gray-500 hover:text-gray-700'
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