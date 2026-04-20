import type { SeccionPDV as seccionPdv } from './NavBar.tsx';
import ContenedorSectores from './ContenedorSectores.tsx';
import { useMenu } from '../context/MenuContext.tsx';
import ContenedorVentas from './ContenedorVentas.tsx';


interface BoardProps {
    seccionActiva: seccionPdv;
}

const Board = ({ seccionActiva }: BoardProps) => {
    const { productos } = useMenu();

    const renderContenido = () => {
        switch (seccionActiva) {
            case 'sectores':
                return(
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorSectores/>    
                    </div>
                );
            case 'inventario':
                return(
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-3xl font-bold text-gray-800">Plano de Inventario</h2>
                        <p className="text-gray-500 mt-2">Aquí podrás gestionar Los productos que vendas y que uses para producir.</p>
                    {/* <Componenteinventario /> <- Próximamente */}
                    </div>
                );
            case 'ventas':
                return(
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContenedorVentas/>
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
