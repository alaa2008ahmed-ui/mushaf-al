
import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ExitConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { theme } = useTheme();

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[1000] flex items-center justify-center p-4 fade-in" onClick={onClose}>
            <div className="themed-card rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-4 themed-text">تأكيد الخروج</h3>
                <p className="themed-text-muted text-center mb-6">هل تريد الخروج من مصحف احمد وليلى</p>
                <div className="flex justify-center gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 rounded-lg font-bold transition active:scale-95"
                        style={{
                            backgroundColor: theme.palette[1] ? theme.palette[1] + '20' : '#e5e7eb',
                            color: theme.textColor,
                            border: `1px solid ${theme.palette[1] || '#d1d5db'}`
                        }}
                    >
                        لا
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="px-6 py-2 rounded-lg font-bold transition active:scale-95 shadow-md"
                        style={{
                            backgroundColor: theme.palette[0] || '#ef4444',
                            color: '#ffffff', // Assuming primary colors are dark enough for white text
                            boxShadow: `0 4px 10px -2px ${theme.palette[0]}50`
                        }}
                    >
                        نعم
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExitConfirmModal;
