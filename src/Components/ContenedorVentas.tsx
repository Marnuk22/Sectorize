import { useVentas } from '../context/VentasContext';

const ContenedorVentas  = () => {
    const { historialVentas } = useVentas();
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {historialVentas.length}  ventas registradas{/* <- Solo para mostrar que tenemos los datos cargados */}
            {historialVentas.map((venta, index) => (
                <div key={index} className="p-4 border-b">
                    <h3 className="text-lg font-semibold">Venta #{venta.id}</h3>
                    <p>Fecha: {venta.fecha.toLocaleString()}</p>
                    <p>Total: ${venta.total.toFixed(2)}</p>
                    <p>Método de pago: {venta.metodoPago?.nombre}</p>
                </div>
            ))}
        </div>
    );
};

export default ContenedorVentas;