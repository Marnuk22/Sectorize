import { Lock, Sparkles } from 'lucide-react';
import type { Plan } from '../../config/planes';

interface Props {
    titulo: string;
    descripcion: string;
    planRequerido: Plan;
    onUpgrade?: () => void;
}

const NOMBRE_PLAN: Record<Plan, string> = {
    gratis: 'Gratis',
    basico: 'Básico',
    premium: 'Premium',
};

const FeatureBloqueada = ({ titulo, descripcion, planRequerido, onUpgrade }: Props) => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-dashed border-slate-200">
            <div className="p-3 bg-slate-100 rounded-2xl mb-4">
                <Lock size={24} className="text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">{titulo}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">{descripcion}</p>
            <div className="flex items-center gap-1.5 mt-3 px-3 py-1 bg-amber-50 rounded-full">
                <Sparkles size={14} className="text-amber-500" />
                <span className="text-xs font-medium text-amber-700">
                    Disponible en plan {NOMBRE_PLAN[planRequerido]}
                </span>
            </div>
            {onUpgrade && (
                <button
                    onClick={onUpgrade}
                    className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
                >
                    Mejorar mi plan
                </button>
            )}
        </div>
    );
};

export default FeatureBloqueada;