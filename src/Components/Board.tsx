import type { SeccionPDV as seccionPdv } from './NavBar.tsx';
import ContenedorSectores from './ContenedorSectores.tsx';
import ContenedorVentas from './ContenedorVentas.tsx';
import ContenedorInventario from './Inventario/ContenedorInventario.tsx';
import ContenedorMostrador from './mostrador/ContenedorMostrador.tsx';
import ContenedorAfiliados from './afiliados/ContenedorAfiliados.tsx';

interface BoardProps {
    seccionActiva: seccionPdv;
}

const Board = ({ seccionActiva }: BoardProps) => {
    const renderContenido = () => {
        switch (seccionActiva) {
            case 'sectores':
                return (
                    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorSectores />
                    </div>
                );
            case 'inventario':
                return (
                    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorInventario />
                    </div>
                );
            case 'ventas':
                return (
                    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorVentas />
                    </div>
                );
            case 'mostrador':
                return (
                    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorMostrador />
                    </div>
                );
            case 'socios':
                return (
                    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorAfiliados />
                    </div>
                );
        }
    };

    return (
        <div className="h-full">
            {renderContenido()}
        </div>
    );
};

export default Board;