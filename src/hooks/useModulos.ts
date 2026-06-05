import { useAuth } from '../context/AuthContext';
import { MODULOS, type ModuloId } from '../config/modulos';

export const useModulos = () => {
    const { local } = useAuth();
    const modulosActivos = (local?.modulos ?? []) as ModuloId[];

    return {
        modulos: modulosActivos,
        tiene: (modulo: ModuloId) => modulosActivos.includes(modulo),
        // Devuelve la config completa de los módulos activos que NO son núcleo
        modulosVisibles: modulosActivos
            .filter(id => MODULOS[id] && !MODULOS[id].esNucleo)
            .map(id => MODULOS[id]),
    };
};