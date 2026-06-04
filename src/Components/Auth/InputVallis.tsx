import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: LucideIcon;
    rightElement?: ReactNode;
    error?: string;
}

const InputVallis = ({ label, icon: Icon, rightElement, error, className, ...props }: Props) => {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-600">{label}</label>
            <div className="relative flex items-center">
                {Icon && (
                    <div className="absolute left-3 text-slate-400 pointer-events-none">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    {...props}
                    className={`w-full px-4 py-3 ${Icon ? 'pl-10' : ''} ${rightElement ? 'pr-12' : ''} 
                        bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 
                        placeholder:text-slate-300 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 focus:border-transparent transition-all
                        ${error ? 'border-red-400 focus:ring-red-400' : ''}
                        ${className ?? ''}`}
                />
                {rightElement && (
                    <div className="absolute right-2">{rightElement}</div>
                )}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
};

export default InputVallis;