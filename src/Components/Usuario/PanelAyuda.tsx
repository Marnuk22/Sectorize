import { Mail, MessageCircle, BookOpen, ExternalLink } from 'lucide-react';

const PanelAyuda = () => {
    const recursos = [
        {
            icono: MessageCircle,
            titulo: 'WhatsApp de soporte',
            descripcion: 'Respuesta en horario comercial',
            accion: 'Escribir',
            href: 'https://wa.me/542983605061',
        },
        {
            icono: Mail,
            titulo: 'Email',
            descripcion: 'soporte@vallis.app',
            accion: 'Enviar',
            href: 'mailto:soporte@vallis.app',
        },
        {
            icono: BookOpen,
            titulo: 'Guías y tutoriales',
            descripcion: 'Aprendé a sacarle el jugo a Vallis',
            accion: 'Ver',
            href: '#',
        },
    ];

    return (
        <div className="space-y-4">
            <p className="text-sm text-stone-500">
                ¿Necesitás ayuda? Estamos para darte una mano.
            </p>

            {recursos.map((r, i) => {
                const Icono = r.icono;
                return (
                    <a
                        key={i}
                        href={r.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-2xl border border-stone-100 hover:border-violet-200 hover:bg-violet-50 transition-all group"
                    >
                        <div className="p-2.5 bg-stone-100 rounded-xl group-hover:bg-violet-100 transition-colors">
                            <Icono size={20} className="text-stone-600 group-hover:text-violet-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-stone-800 text-sm">{r.titulo}</p>
                            <p className="text-xs text-stone-400">{r.descripcion}</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-violet-600">
                            {r.accion} <ExternalLink size={12} />
                        </span>
                    </a>
                );
            })}

            <div className="pt-4 text-center">
                <p className="text-xs text-stone-300">Vallis · versión 1.0</p>
            </div>
        </div>
    );
};

export default PanelAyuda;