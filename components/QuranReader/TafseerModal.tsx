import React from 'react';

interface TafseerModalProps {
    isOpen: boolean;
    isLoading: boolean;
    title: string;
    text: string;
    onClose: () => void;
}

const TafseerModal: React.FC<TafseerModalProps> = ({ isOpen, isLoading, title, text, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[180] bg-gray-900/90 flex justify-center items-center px-4 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="modal-skinned w-full max-w-md rounded-2xl flex flex-col max-h-[60vh] shadow-2xl bg-white dark:bg-gray-800" onClick={e => e.stopPropagation()}>
                <div className="p-4 rounded-t-2xl flex justify-between items-center shadow-md theme-header-bg">
                    <h3 className="font-bold text-lg">{title}</h3>
                    <button onClick={onClose} className="text-2xl hover:opacity-80 transition">&times;</button>
                </div>
                <div className="p-5 overflow-y-auto text-center">
                    {isLoading ? (
                        <div>
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
                            <p className="mt-3 text-gray-500">جاري تحميل التفسير...</p>
                        </div>
                    ) : (
                        <p className="text-lg leading-relaxed font-serif" style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
                    )}
                </div>
                <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-2xl">
                    <button onClick={onClose} className="w-full py-2 rounded-xl font-bold transition theme-btn-bg">إغلاق</button>
                </div>
            </div>
        </div>
    );
};

export default TafseerModal;
