
import React from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from './ThemeContext';
import { presetThemes } from './themes';

function ThemesModal({ onClose }) {
    const { applyTheme } = useTheme();

    const handleThemeClick = (themeKey) => {
        applyTheme(themeKey);
        onClose();
    };

    const modalContent = (
        <div className="theme-modal-backdrop" onClick={onClose}>
            <div className="theme-modal-content font-cairo" onClick={(e) => e.stopPropagation()}>
                <div className="theme-modal-header">
                    <h3 className="font-bold text-lg text-gray-800">اختر ثيم</h3>
                    <button onClick={onClose} className="text-gray-500 text-2xl font-bold">×</button>
                </div>
                <div className="theme-modal-body">
                    <div className="w-full grid grid-cols-2 gap-2">
                        {Object.entries(presetThemes).map(([key, theme]) => (
                            <button
                                key={key}
                                onClick={() => handleThemeClick(key)}
                                className="p-3 rounded-lg border-2 font-bold text-xs shadow-sm flex items-center justify-center text-center"
                                style={{
                                    backgroundColor: theme.bgColor || '#fff',
                                    color: theme.textColor || '#000',
                                    borderColor: theme.palette[1]
                                }}
                            >
                                {theme.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.getElementById('theme-modal-root'));
}

export default ThemesModal;
