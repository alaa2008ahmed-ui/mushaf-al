import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ExitNotification = ({ onConfirm, onCancel }) => {
    const { theme } = useTheme();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 font-cairo">
            <div 
                className="themed-card rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl border-t-4"
                style={{ borderColor: theme.palette[0] }}
            >
                <h2 className="text-2xl font-bold mb-3 font-kufi">تأكيد الخروج</h2>
                <p className="themed-text-muted mb-6">هل أنت متأكد أنك تريد إغلاق التطبيق؟</p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={onCancel} 
                        className="px-8 py-3 rounded-xl font-bold themed-card-alt transition-transform transform active:scale-95"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="px-8 py-3 rounded-xl font-bold text-white transition-transform transform active:scale-95 shadow-lg"
                        style={{ backgroundColor: theme.palette[1] }}
                    >
                        خروج
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExitNotification;
