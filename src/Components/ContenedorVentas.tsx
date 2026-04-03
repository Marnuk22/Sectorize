import { useVentas } from '../context/VentasContext';

const ContenedorVentas  = () => {
    const { historialVentas } = useVentas();
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {historialVentas.length}  ventas registradas{/* <- Solo para mostrar que tenemos los datos cargados */}
        </div>
    );
};

export default ContenedorVentas;