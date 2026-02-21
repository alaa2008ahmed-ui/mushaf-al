
import React, { useState, useCallback } from 'react';
import ThemeSelector from './components/ThemesModal';
import ExitNotification from './components/ExitNotification';
import AppRouter from './router/AppRouter';
import { useWakeLock } from './hooks/useWakeLock';
import { useBackButton } from './hooks/useBackButton';
import { App as CapacitorApp } from '@capacitor/app';

// --- Main App Component ---
function App() {
  const [history, setHistory] = useState(['home']);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const page = history[history.length - 1];

  const navigateBack = useCallback(() => {
    setHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  useWakeLock();
  useBackButton({
    history,
    isThemeSelectorOpen,
    navigateBack,
    setIsThemeSelectorOpen,
    setShowExitConfirm
  });

    const handleConfirmExit = () => {
        CapacitorApp.exitApp();
    };


  const handleNavigate = (pageId: string) => {
    const validPages = [
        'quran', 'salah-adhkar', 'calendar', 'listen', 'tasbeeh', 
        'hajj-umrah', 'hisn-muslim', 'prayer-times', 'qibla', 
        'sabah-masaa', 'adia'
    ];

    if (validPages.includes(pageId)) {
        if (history[history.length - 1] !== pageId) {
            setHistory(prev => [...prev, pageId]);
        }
    } else {
        alert(`التنقل إلى قسم "${pageId}" قيد الإنشاء.`);
    }
  };
  
  const toggleThemeSelector = () => setIsThemeSelectorOpen(prev => !prev);
  const closeThemeSelector = () => setIsThemeSelectorOpen(false);

  return (
    <>
      <AppRouter 
        page={page} 
        onBack={navigateBack} 
        onNavigate={handleNavigate} 
        onOpenThemes={toggleThemeSelector}
      />

      {isThemeSelectorOpen && (
        <ThemeSelector 
          onClose={closeThemeSelector} 
        />
      )}

      {showExitConfirm && (
          <ExitNotification
              onConfirm={handleConfirmExit}
              onCancel={() => setShowExitConfirm(false)}
          />
      )}
    </>
  );
}

export default App;