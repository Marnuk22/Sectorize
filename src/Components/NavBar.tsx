import { useModulos } from '../hooks/useModulos';
import { useAuth } from '../context/AuthContext';
import { MODULOS } from '../config/modulos';

export type SeccionPDV = 'sectores' | 'inventario' | 'ventas' | 'mostrador' | 'socios';

interface NavBarProps {
    seccionActiva: SeccionPDV;
    setSeccionActiva: (seccion: SeccionPDV) => void;
}

// Mapeo: cada módulo apunta a su sección en el PDV
const SECCION_POR_MODULO: Record<string, SeccionPDV> = {
    salon: 'sectores',
    mostrador: 'mostrador',
    suscripciones: 'socios',
    inventario: 'inventario',
    ventas: 'ventas',
};

const NavBar = ({ seccionActiva, setSeccionActiva }: NavBarProps) => {
    const { local } = useAuth();
    const { modulos } = useModulos();

    // Orden de aparición de las secciones
    const ordenSecciones: string[] = ['salon', 'mostrador', 'suscripciones', 'inventario', 'ventas'];

    // Filtrar solo los módulos que el local tiene, en orden
    const seccionesVisibles = ordenSecciones
        .filter(m => modulos.includes(m as any))
        .map(m => ({
            modulo: m,
            seccion: SECCION_POR_MODULO[m],
            config: MODULOS[m as keyof typeof MODULOS],
        }));

    // Iniciales del local para el ícono
    const iniciales = (local?.nombre ?? 'Vallis')
        .split(' ')
        .slice(0, 2)
        .map(p => p[0])
        .join('')
        .toUpperCase();

    return (
        <nav className="bg-white shadow-md px-6 py-4 flex justify-start items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {iniciales.charAt(0)}
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-800 truncate max-w-[160px]">
                    {local?.nombre ?? 'Vallis'}
                </span>
            </div>

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
    );
};

export default NavBar;