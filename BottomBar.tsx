
import React from 'react';
import { useTheme } from './ThemeContext';

function BottomBar({ onHomeClick, onThemesClick, showHome = true, showThemes = true }) {
    const { theme } = useTheme();

    const homeButtonClass = `bar-button primary ${!showThemes ? 'w-full max-w-xs mx-auto' : ''}`;
    const themesButtonClass = `bar-button secondary ${!showHome ? 'w-full max-w-xs mx-auto' : ''}`;

    return (
        <nav className="app-bottom-bar" style={{ backgroundColor: theme.barBg, borderTop: theme.barBorder }}>
            <div className="app-bottom-bar__inner">
                {showHome && (
                    <button 
                        onClick={onHomeClick} 
                        className={homeButtonClass}
                        style={{ background: theme.palette[0], color: theme.textColor, fontFamily: theme.font }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        <span>الرئيسية</span>
                    </button>
                )}
                {showThemes && (
                    <button 
                        onClick={onThemesClick} 
                        className={themesButtonClass}
                        style={{ background: theme.palette[1], color: theme.textColor, fontFamily: theme.font }}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path></svg>
                        <span>الثيمات</span>
                    </button>
                )}
            </div>
        </nav>
    );
}

export default BottomBar;
