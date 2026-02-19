
import React from 'react';

interface ExitConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[1000] flex items-center justify-center p-4 fade-in" onClick={onClose}>
            <div className="themed-card bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-4 themed-text">تأكيد الخروج</h3>
                <p className="themed-text-muted text-center mb-6">هل ترغب في الخروج من مصحف أحمد وليلى؟</p>
                <div className="flex justify-center gap-3">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition">
                        لا
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition">
                        نعم
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExitConfirmModal;
