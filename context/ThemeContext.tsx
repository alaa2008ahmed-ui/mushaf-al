import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import { presetThemes, Theme } from './themes';

// State to be saved to localStorage
interface ThemeSettings {
    themeKey: string;
    customBg?: {
        url: string;
        isVideo: boolean;
    };
}

interface ThemeContextType {
    theme: Theme;
    // FIX: Add themeKey to the context type to expose it to consumers.
    themeKey: string;
    applyPresetTheme: (themeKey: string) => void;
    setCustomBackground: (dataUrl: string, isVideo: boolean) => void;
    resetBackground: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_SETTINGS_KEY = 'theme_settings_v1';

function hexToRgb(hex: string | null) {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<ThemeSettings>(() => {
        try {
            const saved = localStorage.getItem(THEME_SETTINGS_KEY);
            return saved ? JSON.parse(saved) : { themeKey: 'daylight' };
        } catch (e) {
            return { themeKey: 'daylight' };
        }
    });

    const theme = useMemo(() => presetThemes[settings.themeKey] || presetThemes.daylight, [settings.themeKey]);

    const saveSettings = (newSettings: ThemeSettings) => {
        setSettings(newSettings);
        try {
            localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(newSettings));
        } catch (e) {
            console.warn('Failed to save theme settings:', e);
        }
    };
    
    const applyPresetTheme = (key: string) => {
        saveSettings({ ...settings, themeKey: key });
    };

    const setCustomBackground = (url: string, isVideo: boolean) => {
        saveSettings({ ...settings, customBg: { url, isVideo } });
    };

    const resetBackground = () => {
        const { customBg, ...newSettings } = settings;
        saveSettings(newSettings);
    };

    useEffect(() => {
        const root = document.documentElement;
        const videoBg = document.getElementById('video-background') as HTMLVideoElement;

        // Handle Background
        if (settings.customBg) {
            if (settings.customBg.isVideo && videoBg) {
                videoBg.style.display = 'block';
                if (videoBg.src !== settings.customBg.url) {
                    videoBg.src = settings.customBg.url;
                }
                videoBg.play().catch(e => console.warn("Video autoplay failed:", e));
                document.body.style.backgroundImage = 'none';
                document.body.style.backgroundColor = 'black'; // Fallback
            } else {
                if (videoBg) videoBg.style.display = 'none';
                document.body.style.backgroundImage = `url(${settings.customBg.url})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundColor = '';
            }
        } else {
            // Handle theme background
            if (videoBg) videoBg.style.display = 'none';
            document.body.style.backgroundColor = theme.bgColor || '#0D1B2A';
            document.body.style.backgroundImage = theme.isOriginal ? `
                radial-gradient(circle at 15% 25%, rgba(20, 184, 166, 0.1), transparent 30%),
                radial-gradient(circle at 85% 75%, rgba(124, 58, 237, 0.1), transparent 30%)
            ` : 'none';
        }

        // Apply common theme properties
        document.body.style.color = theme.textColor;
        document.body.style.fontFamily = theme.font;
        
        root.style.setProperty('--color-primary', theme.palette[0]);
        root.style.setProperty('--color-secondary', theme.palette[1]);
        
        const isDark = !theme.bgColor || ['#191D3A', '#0c0a09', '#000000', '#4c1d95', '#7c2d12', '#1e40af', '#1e1b4b', '#1c1917', '#0b0f19', '#3e2723', '#450a0a', '#064e3b', '#0f766e', '#155e75', '#581c87'].includes(theme.bgColor);

        // Apply shared colors/styles
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--text-color-muted', isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)');

        // Bar and Card styles (glassmorphism if custom bg)
        if (settings.customBg) {
            root.style.setProperty('--top-bar-rgb', isDark ? '26, 35, 50' : '255, 255, 255');
            root.style.setProperty('--bottom-bar-bg', isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)');
            root.style.setProperty('--bottom-bar-border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)');
            root.style.setProperty('--card-bg', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)');
            root.style.setProperty('--card-border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)');
        } else {
            const topBarRgb = hexToRgb(theme.isOriginal ? '#1a2233' : (theme.barBg || theme.palette[0]));
            root.style.setProperty('--top-bar-rgb', topBarRgb || '26, 35, 50');
            root.style.setProperty('--bottom-bar-bg', theme.barBg || (isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)'));
            const barBorderColor = theme.barBorder ? theme.barBorder.split(' ')[2] : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)');
            root.style.setProperty('--bottom-bar-border', barBorderColor);
            root.style.setProperty('--card-bg', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)');
            root.style.setProperty('--card-border', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)');
        }

        root.style.setProperty('--card-bg-hover', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)');
        root.style.setProperty('--card-shadow', isDark
            ? '0 8px 16px -4px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.15)'
            : '0 8px 16px -4px rgba(30,41,59,0.08), 0 4px 6px -2px rgba(30,41,59,0.04)');
            
        root.style.setProperty('--badge-finished-bg', isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(34, 197, 94, 0.1)');
        root.style.setProperty('--badge-finished-text', isDark ? '#4ade80' : '#16a34a');


    }, [settings, theme]);

    const contextValue = useMemo(() => ({
        theme,
        // FIX: Provide themeKey in the context value.
        themeKey: settings.themeKey,
        applyPresetTheme,
        setCustomBackground,
        resetBackground
    }), [theme, settings]);

    return (
        <ThemeContext.Provider value={contextValue}>
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