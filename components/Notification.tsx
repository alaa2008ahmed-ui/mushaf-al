
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Edit3, Trash2, AlertCircle, Info, XCircle } from 'lucide-react';

interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'add' | 'update' | 'delete' | 'warning';
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3500); // Shortened duration to 3.5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const getTypeConfig = () => {
        switch (type) {
            case 'add':
            case 'success':
                return {
                    bg: 'bg-emerald-500',
                    border: 'border-emerald-600',
                    icon: <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" />,
                    shadow: 'shadow-emerald-500/20'
                };
            case 'update':
                return {
                    bg: 'bg-blue-500',
                    border: 'border-blue-600',
                    icon: <Edit3 className="w-5 h-5 mr-3 flex-shrink-0" />,
                    shadow: 'shadow-blue-500/20'
                };
            case 'delete':
                return {
                    bg: 'bg-rose-500',
                    border: 'border-rose-600',
                    icon: <Trash2 className="w-5 h-5 mr-3 flex-shrink-0" />,
                    shadow: 'shadow-rose-500/20'
                };
            case 'error':
                return {
                    bg: 'bg-red-600',
                    border: 'border-red-700',
                    icon: <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
                    shadow: 'shadow-red-600/20'
                };
            case 'warning':
                return {
                    bg: 'bg-amber-500',
                    border: 'border-amber-600',
                    icon: <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
                    shadow: 'shadow-amber-500/20'
                };
            case 'info':
            default:
                return {
                    bg: 'bg-indigo-500',
                    border: 'border-indigo-600',
                    icon: <Info className="w-5 h-5 mr-3 flex-shrink-0" />,
                    shadow: 'shadow-indigo-500/20'
                };
        }
    };

    const config = getTypeConfig();

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`fixed top-5 right-5 p-4 rounded-xl shadow-lg border text-white flex items-center z-50 max-w-[90vw] sm:max-w-md ${config.bg} ${config.border} ${config.shadow}`}
            >
                {config.icon}
                <span className="whitespace-pre-wrap font-medium text-sm tracking-wide">{message}</span>
                <button 
                    onClick={onClose} 
                    className="ml-5 text-white/80 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default Notification;
