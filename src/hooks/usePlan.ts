import { useAuth } from '../context/AuthContext';
import { puedeUsar, PLANES, type Plan, type Feature } from '../config/planes';

export const usePlan = () => {
    const { local } = useAuth();
    const plan = (local?.plan ?? 'gratis') as Plan;

    return {
        plan,
        planInfo: PLANES[plan],
        puede: (feature: Feature) => puedeUsar(plan, feature),
    };
};