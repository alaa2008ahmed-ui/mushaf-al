
import React, { createContext, useState, useContext, useEffect } from 'react';
import { presetThemes, Theme } from './themes';

interface ThemeContextType {
    theme: Theme;
    applyTheme: (themeKey: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(presetThemes.original);

    const applyTheme = (themeKey: string) => {
        const newTheme = presetThemes[themeKey] || presetThemes.original;
        setTheme(newTheme);
    };

    useEffect(() => {
        const root = document.documentElement;
        
        // Body background
        document.body.style.backgroundColor = theme.bgColor || '#0D1B2A';
        document.body.style.color = theme.textColor;
        document.body.style.fontFamily = theme.font;
        document.body.style.backgroundImage = theme.isOriginal ? `
            radial-gradient(circle at 15% 25%, rgba(20, 184, 166, 0.1), transparent 30%),
            radial-gradient(circle at 85% 75%, rgba(124, 58, 237, 0.1), transparent 30%)
        ` : 'none';
        
        // Set CSS variables
        root.style.setProperty('--color-primary', theme.palette[0]);
        root.style.setProperty('--color-secondary', theme.palette[1]);
        root.style.setProperty('--top-bar-bg', theme.isOriginal ? 'transparent' : theme.barBg || theme.palette[0] );

        // Determine if dark or light theme to set card styles
        const isDark = !theme.bgColor || ['#000000', '#4c1d95', '#7c2d12', '#1e40af', '#1e1b4b', '#1c1917', '#0b0f19', '#3e2723', '#450a0a', '#064e3b', '#0f766e', '#155e75', '#581c87'].includes(theme.bgColor);

        root.style.setProperty('--card-bg', isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.6)');
        root.style.setProperty('--card-border', isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)');
        root.style.setProperty('--card-bg-hover', isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)');
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--text-color-muted', isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)');

    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, applyTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
