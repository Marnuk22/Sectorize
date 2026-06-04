import type { SeccionPDV as seccionPdv } from './NavBar.tsx';
import ContenedorSectores from './ContenedorSectores.tsx';
import ContenedorVentas from './ContenedorVentas.tsx';
import ContenedorInventario from './Inventario/ContenedorInventario.tsx';

interface BoardProps {
    seccionActiva: seccionPdv;
}

const Board = ({ seccionActiva }: BoardProps) => {
    const renderContenido = () => {
        switch (seccionActiva) {
            case 'sectores':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorSectores />
                    </div>
                );
            case 'inventario':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorInventario />
                    </div>
                );
            case 'ventas':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorVentas />
                    </div>
                );
        }
    };

    return (
        <div className="p-4">
            {renderContenido()}
        </div>
    );
};

export default Board;