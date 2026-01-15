import React, { Fragment, ReactNode, MouseEventHandler, forwardRef, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X, Search, ArrowRight, Command } from 'lucide-react';

// --- Card ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  noHover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ children, className = '', noHover = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={`
      bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden 
      ${!noHover ? 'hover:shadow-lg hover:shadow-indigo-900/5 hover:-translate-y-1 transition-all duration-300 ease-out' : ''} 
      ${className}
    `} 
    {...props}
  >
    {children}
  </div>
));
Card.displayName = 'Card';

// --- Badge ---
export const Badge = ({ type, text }: { type: 'success' | 'warning' | 'danger' | 'neutral'; text: string }) => {
  const colors = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
    neutral: 'bg-slate-50 text-slate-600 border border-slate-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold shadow-sm ${colors[type]}`}>
      {text}
    </span>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
}

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 border border-transparent',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 border border-transparent',
    ghost: 'bg-transparent text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent'
  };

  return (
    <button
      className={`
        px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 
        active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variants[variant]} ${className}
      `}
      {...props}
    />
  );
};

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Toast Notification System ---
export type ToastType = 'success' | 'error';
export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export const ToastContainer = ({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 bg-white pl-3 pr-4 py-3 rounded-xl shadow-xl border border-slate-100 animate-slide-in-right min-w-[300px]"
        >
          {toast.type === 'success' ? (
            <CheckCircle className="text-emerald-500" size={20} />
          ) : (
            <AlertCircle className="text-rose-500" size={20} />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">{toast.type === 'success' ? 'Success' : 'Error'}</p>
            <p className="text-xs text-slate-500">{toast.message}</p>
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

// --- Empty State ---
interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  }
}

export const EmptyState = ({ title, description, icon: Icon, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
      <Icon size={32} className="text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">{description}</p>
    {action && (
      <Button onClick={action.onClick} className="flex items-center gap-2">
        {action.label} <ArrowRight size={14} />
      </Button>
    )}
  </div>
);

// --- Command Palette (Spotlight) ---
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: { id: string; label: string; icon: React.ElementType; perform: () => void }[];
}

export const CommandPalette = ({ isOpen, onClose, actions }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  
  // Trap focus or handle filtering
  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] px-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[60vh]">
        <div className="flex items-center px-4 border-b border-slate-100">
          <Search className="text-slate-400" size={20} />
          <input 
            autoFocus
            className="w-full px-4 py-4 text-lg bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
            placeholder="Type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">ESC</div>
        </div>
        <div className="overflow-y-auto p-2">
          {filtered.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">No results found.</div>}
          {filtered.map((action, idx) => (
            <button
              key={action.id}
              onClick={() => { action.perform(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-left group transition-colors focus:bg-indigo-50 focus:outline-none"
            >
              <div className="p-2 bg-slate-100 rounded-md text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <action.icon size={18} />
              </div>
              <span className="font-medium text-slate-700 group-hover:text-indigo-900">{action.label}</span>
              {idx === 0 && query.length > 0 && <span className="ml-auto text-xs text-slate-400 font-bold">↵ Enter</span>}
            </button>
          ))}
        </div>
        <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center uppercase font-bold tracking-wider">
          PropLedger Command
        </div>
      </div>
    </div>
  );
};


// --- Form Input Helper ---
export const FormInput = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div className="mb-4 group">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 transition-colors group-focus-within:text-indigo-600">{label}</label>
    <input 
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-sm"
      {...props}
    />
  </div>
);

// --- Form Select Helper ---
export const FormSelect = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, options: {label: string, value: string}[] }) => (
  <div className="mb-4 group">
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 transition-colors group-focus-within:text-indigo-600">{label}</label>
    <select 
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-sm appearance-none"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);
