import React, { useEffect } from 'react';
import { LucideIcon, AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', className = '', icon: Icon, isLoading, ...props 
}) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-md hover:shadow-lg",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    outline: "bg-transparent border-2 border-brand-600 text-brand-600 hover:bg-brand-50"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props} disabled={isLoading || props.disabled}>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: LucideIcon }> = ({ label, className, icon: Icon, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <input 
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none ${className}`}
        {...props}
      />
    </div>
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea 
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none ${className}`}
      rows={4}
      {...props}
    />
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {title && <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-800">{title}</div>}
    <div className="p-6">{children}</div>
  </div>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    submitted: "bg-yellow-100 text-yellow-800",
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${styles[status.toLowerCase()] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 border border-gray-100">
        <div className="flex items-start gap-3 mb-4">
          {isDestructive && (
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          )}
          <div>
            <h3 className={`text-lg font-bold ${isDestructive ? 'text-red-900' : 'text-gray-900'}`}>
              {title}
            </h3>
            <p className="text-gray-600 text-sm mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onCancel} className="text-sm px-4">
            {cancelText}
          </Button>
          <Button 
            variant={isDestructive ? 'danger' : 'primary'} 
            onClick={onConfirm}
            className="text-sm px-4"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Toast Notification Components

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps & { onClose: () => void }> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };
  
  const Icons = {
    success: CheckCircle,
    error: AlertTriangle,
    info: Info
  };

  const Icon = Icons[type];

  return (
    <div className={`${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-in slide-in-from-bottom-5 fade-in duration-300`}>
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastProps[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-2">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  );
};
