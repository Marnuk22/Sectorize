import type { Mesa } from "../../types";


interface Props {
    mesa: Mesa;
    onConfirm: (metodoId: string) => void;
    onCancel: () => void;
}

const ModalCheckout = ({ mesa, onConfirm, onCancel }: Props) => {
    // Aquí podrías traer tus métodos de pago desde el contexto
    const metodosEjemplo = [
        { id: '1', nombre: 'Efectivo', color: 'bg-green-600' },
        { id: '2', nombre: 'Tarjeta', color: 'bg-blue-600' },
        { id: '3', nombre: 'Transferencia', color: 'bg-purple-600' }
    ];

    const total = mesa.pedidos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Cierre de Mesa {mesa.id}</h2>
                
                {/* Preview de pedidos */}
                <div className="max-h-40 overflow-y-auto mb-4 border-b pb-2">
                    {mesa.pedidos.map(p => (
                        <div key={p.id} className="flex justify-between text-sm py-1">
                            <span>{p.cantidad}x {p.nombre}</span>
                            <span>${p.precio * p.cantidad}</span>
                        </div>
                    ))}
                </div>

                <div className="text-2xl font-black text-right mb-6">
                    Total: ${total}
                </div>

                <p className="text-sm text-gray-500 mb-3">Seleccione método de pago:</p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {metodosEjemplo.map(m => (
                        <button
                            key={m.id}
                            onClick={() => onConfirm(m.id)}
                            className={`${m.color} text-white p-3 rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95`}
                        >
                            {m.nombre}
                        </button>
                    ))}
                </div>

                <button onClick={onCancel} className="w-full text-gray-400 py-2 hover:text-gray-600">
                    Volver atrás
                </button>
            </div>
        </div>
    );
};
export default ModalCheckout;