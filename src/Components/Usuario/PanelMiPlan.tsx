import { Check, Sparkles } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { PLANES, type Plan } from '../../config/planes';

const PanelMiPlan = () => {
    const { plan: planActual } = usePlan();
    const ordenPlanes: Plan[] = ['gratis', 'basico', 'premium'];

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-500">
                Tu plan actual es <span className="font-bold text-gray-800">{PLANES[planActual].nombre}</span>.
                Mejorá para desbloquear más funciones.
            </p>

            {ordenPlanes.map(planId => {
                const plan = PLANES[planId];
                const esActual = planId === planActual;
                const esSuperior = ordenPlanes.indexOf(planId) > ordenPlanes.indexOf(planActual);

                return (
                    <div
                        key={planId}
                        className={`rounded-2xl border-2 p-5 transition-all ${
                            esActual ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-800">{plan.nombre}</h3>
                                    {esActual && (
                                        <span className="text-xs font-medium px-2 py-0.5 bg-blue-600 text-white rounded-full">
                                            Actual
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">{plan.descripcion}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-gray-800">
                                    ${plan.precio.toLocaleString()}
                                </p>
                                {plan.precio > 0 && <p className="text-xs text-gray-400">/mes</p>}
                            </div>
                        </div>

                        <ul className="space-y-2 mb-4">
                            {plan.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                    <Check size={15} className="text-green-500 shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {esSuperior && (
                            <button
                                onClick={() => alert('Integración de pagos próximamente')}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Sparkles size={16} />
                                Mejorar a {plan.nombre}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PanelMiPlan;