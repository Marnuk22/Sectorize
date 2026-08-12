import { useState, useEffect } from 'react';
import { Globe, Check, X, Copy, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { generarSlug, slugValido } from '../../logic/slug';
import { Tarjeta, Boton } from '../ui/ComponentesBase';

type EstadoSlug = 'vacio' | 'invalido' | 'chequeando' | 'libre' | 'ocupado' | 'propio';

const PanelCatalogo = () => {
    const { local, actualizarLocal } = useAuth();

    const [activo, setActivo] = useState(local?.catalogo_activo ?? false);
    const [slug, setSlug] = useState(local?.slug ?? '');
    const [whatsapp, setWhatsapp] = useState(local?.whatsapp ?? '');
    const [estadoSlug, setEstadoSlug] = useState<EstadoSlug>('vacio');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [copiado, setCopiado] = useState(false);

    // Si no hay slug, proponer uno a partir del nombre del local
    useEffect(() => {
        if (!local?.slug && local?.nombre && !slug) {
            setSlug(generarSlug(local.nombre));
        }
    }, [local]);

    // Chequear disponibilidad con un respiro entre teclas
    useEffect(() => {
        if (!slug) { setEstadoSlug('vacio'); return; }
        if (slug === local?.slug) { setEstadoSlug('propio'); return; }
        if (!slugValido(slug)) { setEstadoSlug('invalido'); return; }

        setEstadoSlug('chequeando');
        let vigente = true;

        const timer = setTimeout(async () => {
            const { data, error } = await supabase.rpc('slug_disponible', { p_slug: slug });
            if (!vigente) return;
            if (error) { setEstadoSlug('invalido'); return; }
            setEstadoSlug(data ? 'libre' : 'ocupado');
        }, 500);

        return () => { vigente = false; clearTimeout(timer); };
    }, [slug, local?.slug]);

    const url = `https://vallis.com.ar/c/${slug}`;
    const puedeGuardar = !activo || (slug !== '' && (estadoSlug === 'libre' || estadoSlug === 'propio'));

    const handleGuardar = async () => {
        setGuardando(true);
        setError('');
        try {
            await actualizarLocal({
                catalogo_activo: activo,
                slug: slug || null,
                whatsapp: whatsapp.replace(/\D/g, '') || null,
            });
        } catch (err: any) {
            setError(err?.code === '23505'
                ? 'Ese link ya está en uso, probá con otro.'
                : 'No se pudo guardar. Intentá de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    const copiarLink = async () => {
        await navigator.clipboard.writeText(url);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    return (
        <div className="space-y-5">
            {/* Activar */}
            <Tarjeta className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-medium text-stone-800 text-sm">Catálogo público</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                        Compartí un link con tus productos. Cualquiera puede verlo, sin cuenta.
                    </p>
                </div>
                <button
                    onClick={() => setActivo(a => !a)}
                    className={`w-11 h-6 rounded-full shrink-0 transition-colors relative ${activo ? 'bg-green-500' : 'bg-stone-300'}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${activo ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
            </Tarjeta>

            {activo && (
                <>
                    {/* Link */}
                    <div>
                        <label className="text-sm font-medium text-stone-700 block mb-1.5">Tu link</label>
                        <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                            <span className="pl-3 pr-1 text-sm text-stone-400 shrink-0 select-none">vallis.com.ar/c/</span>
                            <input
                                value={slug}
                                onChange={e => setSlug(generarSlug(e.target.value))}
                                placeholder="mi-comercio"
                                className="flex-1 py-2.5 pr-3 text-sm outline-none min-w-0"
                            />
                            <div className="pr-3 shrink-0">
                                {estadoSlug === 'chequeando' && <Loader2 size={15} className="text-stone-400 animate-spin" />}
                                {(estadoSlug === 'libre' || estadoSlug === 'propio') && <Check size={15} className="text-green-600" />}
                                {(estadoSlug === 'ocupado' || estadoSlug === 'invalido') && <X size={15} className="text-red-500" />}
                            </div>
                        </div>

                        <p className={`text-xs mt-1.5 ${
                            estadoSlug === 'ocupado' || estadoSlug === 'invalido' ? 'text-red-500' :
                            estadoSlug === 'libre' ? 'text-green-600' : 'text-stone-400'
                        }`}>
                            {estadoSlug === 'ocupado' && 'Ese link ya está en uso, probá con otro.'}
                            {estadoSlug === 'invalido' && 'Solo minúsculas, números y guiones (mínimo 3 caracteres).'}
                            {estadoSlug === 'libre' && '¡Disponible!'}
                            {estadoSlug === 'propio' && 'Este es tu link actual.'}
                            {estadoSlug === 'vacio' && 'Elegí cómo se va a ver tu link.'}
                        </p>
                    </div>

                    {/* WhatsApp */}
                    <div>
                        <label className="text-sm font-medium text-stone-700 block mb-1.5">WhatsApp de contacto</label>
                        <input
                            value={whatsapp}
                            onChange={e => setWhatsapp(e.target.value)}
                            placeholder="2494123456"
                            inputMode="numeric"
                            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <p className="text-xs text-stone-400 mt-1.5">
                            Con característica, sin el 0 ni el 15. Es el número al que te escriben desde el catálogo.
                        </p>
                    </div>

                    {/* Compartir */}
                    {local?.slug && local?.catalogo_activo && (
                        <div className="flex gap-2">
                            <button
                                onClick={copiarLink}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                            >
                                {copiado ? <><Check size={14} className="text-green-600" /> ¡Copiado!</> : <><Copy size={14} /> Copiar link</>}
                            </button>
                            <a
                                href={`https://vallis.com.ar/c/${local.slug}`}
                                target="_blank"
                                rel="noopener"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50"
                            >
                                <ExternalLink size={14} /> Ver catálogo
                            </a>
                        </div>
                    )}

                    <div className="flex items-start gap-2 p-3 bg-sky-50 rounded-xl">
                        <Globe size={15} className="text-sky-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-sky-800">
                            En el catálogo solo aparecen los productos que marques con <strong>Publicar</strong> desde el inventario.
                        </p>
                    </div>
                </>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                    <AlertCircle size={15} className="shrink-0" /> {error}
                </div>
            )}

            <Boton
                variante="primario"
                onClick={handleGuardar}
                disabled={guardando || !puedeGuardar}
                className="w-full"
            >
                {guardando ? 'Guardando...' : 'Guardar'}
            </Boton>
        </div>
    );
};

export default PanelCatalogo;