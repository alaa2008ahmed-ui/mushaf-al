import React from 'react';
import { THEMES } from './constants';

interface ThemesModalProps {
    onClose: () => void;
    showToast: (msg: string) => void;
}

const ThemesModal: React.FC<ThemesModalProps> = ({ onClose, showToast }) => {
    const currentThemeId = localStorage.getItem('current_theme_id') || 'default';
    const activeTheme = THEMES[currentThemeId as keyof typeof THEMES] || THEMES['default'];

    const applyTheme = (themeId: string) => {
        const theme = THEMES[themeId as keyof typeof THEMES];
        if (!theme) return;

        localStorage.setItem('current_theme_id', themeId);
        
        // Handle Transparency
        // FIX: Removed check for `theme.isGlass` as the property does not exist on the theme objects.
        
        // Generate Theme Colors
        let themeColors = {};
        if (themeId === 'default') {
             const green = "#10b981"; const greenBorder = "#059669";
             const purple = "#7e22ce"; const purpleBorder = "#6b21a8";
             const purpleText = "#6d28d9";
             const white = "#ffffff"; const grayBorder = "#e5e7eb";
             
             themeColors = {
                'top-toolbar': { bg: white, border: grayBorder },
                'bottom-toolbar': { bg: white, border: grayBorder },
                'surah': { bg: white, text: green, border: green, font: theme.font },
                'juz': { bg: white, text: purpleText, border: purpleText, font: theme.font },
                'page': { bg: white, text: purpleText, border: purpleText, font: theme.font },
                'audio': { bg: white, text: green, border: green },
                'btn-settings': { bg: purple, text: white, border: purpleBorder },
                'btn-home': { bg: green, text: white, border: greenBorder },
                'btn-bookmark': { bg: green, text: white, border: greenBorder },
                'btn-bookmarks-list': { bg: green, text: white, border: greenBorder },
                'btn-themes': { bg: green, text: white, border: greenBorder },
                'btn-autoscroll': { bg: purple, text: white, border: purpleBorder },
                'btn-menu': { bg: purple, text: white, border: purpleBorder },
                'btn-search': { bg: purple, text: white, border: purpleBorder }
             };
        } else {
             themeColors = { 
                 'top-toolbar': { bg: theme.barBg, border: theme.barBorder }, 
                 'bottom-toolbar': { bg: theme.barBg, border: theme.barBorder }, 
                 'surah': { bg: theme.barBg, text: theme.barText, border: theme.barBorder, font: theme.font }, 
                 'juz': { bg: theme.barBg, text: theme.barText, border: theme.barBorder, font: theme.font }, 
                 'page': { bg: theme.barBg, text: theme.barText, border: theme.barBorder, font: theme.font }, 
                 'audio': { bg: theme.barBg, text: theme.barText, border: theme.barBorder }, 
                 'btn-settings': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg }, 
                 'btn-home': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg }, 
                 'btn-bookmark': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg }, 
                 'btn-bookmarks-list': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg }, 
                 'btn-themes': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg }, 
                 'btn-autoscroll': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg }, 
                 'btn-menu': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg }, 
                 'btn-search': { bg: theme.btnBg, text: theme.btnText, border: theme.btnBg } 
            };
        }

        localStorage.setItem('toolbar_colors', JSON.stringify(themeColors));
        localStorage.setItem('transparent_mode', 'false');

        // Update quran_settings to match the theme's colors and font
        const savedSettings = JSON.parse(localStorage.getItem('quran_settings') || '{}');
        const updatedSettings = {
            ...savedSettings,
            bgColor: theme.bg,
            textColor: theme.text,
            fontFamily: theme.font
        };
        localStorage.setItem('quran_settings', JSON.stringify(updatedSettings));

        // Dispatch a custom event to notify the main component to reload theme
        window.dispatchEvent(new Event('theme-change'));
        
        showToast(`تم تطبيق ثيم: ${theme.name}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[190] bg-gray-900/90 flex justify-center items-center px-4 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="modal-skinned w-full max-w-md rounded-2xl flex flex-col max-h-[85vh] shadow-2xl bg-white dark:bg-gray-800" onClick={e => e.stopPropagation()}>
                <div className="p-4 rounded-t-2xl flex justify-between items-center shadow-md theme-header-bg">
                    <h3 className="font-bold text-lg">اختر الثيم</h3>
                    <button onClick={onClose} className="text-2xl hover:opacity-80 transition">&times;</button>
                </div>
                <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3" style={{ '--theme-card-border-color': activeTheme.accent, '--theme-card-shadow-color': `${activeTheme.accent}4D` } as React.CSSProperties}>
                    {Object.entries(THEMES).map(([key, t]: [string, any]) => (
                        <button 
                            key={key} 
                            onClick={() => applyTheme(key)} 
                            className={`theme-card text-center ${currentThemeId === key ? 'selected' : ''}`}
                            style={{ backgroundColor: activeTheme.cardBg, color: activeTheme.cardText }}
                        >
                            <div className="font-bold mb-2 text-sm">{t.name}</div>
                            <div className="w-full h-20 rounded-lg p-2 shadow-inner flex flex-col justify-between" style={{ backgroundColor: t.bg }}>
                                <div className="w-full h-5 rounded-sm" style={{ backgroundColor: t.barBg, opacity: t.isGlass ? 0.7 : 1 }}></div>
                                <p className="text-xs truncate" style={{ color: t.text, fontFamily: t.font }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.btnBg }}></div>
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.accent }}></div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ThemesModal;