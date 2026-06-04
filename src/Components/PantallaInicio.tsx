import { useState } from 'react';
import { Coffee } from 'lucide-react';
import FormLogin from './Auth/FormLogin.tsx';
import FormRegistro from './Auth/FormRegistro';

const PantallaInicio = () => {
    const [esRegistro, setEsRegistro] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <div className="inline-flex p-4 bg-blue-600 rounded-3xl shadow-xl mb-4">
                        <Coffee className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight italic">VALLIS</h1>
                    <p className="text-slate-500 mt-2">
                        {esRegistro ? 'Crea tu cuenta de administrador' : 'Gestión inteligente para tu local'}
                    </p>
                </header>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    {esRegistro ? <FormRegistro /> : <FormLogin />}

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setEsRegistro(!esRegistro)}
                            className="text-blue-600 font-semibold text-sm hover:underline"
                        >
                            {esRegistro ? '¿Ya tenés local? Ingresá acá' : '¿Querés Vallis para tu local? Registrate'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PantallaInicio;