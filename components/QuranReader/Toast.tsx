import React, { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    show: boolean;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, show, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            // Small delay to ensure render happens before class addition for transition
            requestAnimationFrame(() => setIsVisible(true));
            
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 400);
            return () => clearTimeout(timer);
        }
    }, [show, onClose, message]);

    if (!shouldRender) return null;

    return (
        <div id="message-toast" className={isVisible ? 'show' : ''}>
            <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-700">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <div>
                <div className="font-bold text-sm">تنبيه</div>
                <div id="toast-message" className="text-xs mt-0.5">{message}</div>
            </div>
        </div>
    );
};

export default Toast;
