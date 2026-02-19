
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MainMenu from './pages/MainMenu';
import AthkarAlSalah from './pages/AthkarAlSalah';
import HijriCalendar from './pages/HijriCalendar';
import ListenQuran from './pages/ListenQuran';
import Tasbeeh from './pages/Tasbeeh';
import HajjUmrah from './pages/HajjUmrah';
import HisnAlmuslim from './pages/HisnAlmuslim';
import PrayerTimes from './pages/PrayerTimes';
import Qibla from './pages/Qibla';
import ThemeSelector from './components/ThemesModal';
import AdkarSabahMasaa from './pages/AdkarSabahMasaa';
import Adia from './pages/Adia';
import QuranReader from './pages/QuranReader'; // استيراد المكون الجديد
import ExitConfirmModal from './components/ExitConfirmModal';

// --- Main App Component ---
function App() {
  const [history, setHistory] = useState(['home']);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const page = history[history.length - 1];

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const isThemeSelectorOpenRef = useRef(isThemeSelectorOpen);
  useEffect(() => {
    isThemeSelectorOpenRef.current = isThemeSelectorOpen;
  }, [isThemeSelectorOpen]);

  const navigateBack = useCallback(() => {
    setHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleBackButton = useCallback((event: Event) => {
    event.preventDefault();

    if (isThemeSelectorOpenRef.current) {
      setIsThemeSelectorOpen(false);
      return;
    }

    if (historyRef.current.length > 1) {
      navigateBack();
    } else {
      setShowExitConfirm(true);
    }
  }, [navigateBack]);

    const handleConfirmExit = () => {
        const appNavigator = window.navigator as any;
        if (appNavigator.app && typeof appNavigator.app.exitApp === 'function') {
            appNavigator.app.exitApp();
        }
    };

  // Effect for wake lock management
  useEffect(() => {
    let wakeLock: any = null;
    let isNativeWakeLockActive = false;

    // --- Web Wake Lock API ---
    const requestWebWakeLock = async () => {
      // Don't try if the native lock is active or tab is not visible
      if (isNativeWakeLockActive || document.visibilityState !== 'visible') {
        return;
      }
      
      if ('wakeLock' in navigator) {
        try {
          // Request a new wake lock.
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Web Wake Lock is active.');

          wakeLock.addEventListener('release', () => {
            // The lock was released by the browser (e.g., tab hidden).
            // It will be re-acquired automatically by the visibilitychange handler.
            console.log('Web Wake Lock was released.');
          });

        } catch (err: any) {
          // This can fail if the Permissions Policy is not set.
          // It's not a critical error for the app's functionality, just a missing enhancement.
          // So, we log a warning instead of an error.
          console.warn(`Could not acquire screen wake lock: ${err.message}`);
        }
      } else {
        console.log('Web Wake Lock API is not supported in this environment.');
      }
    };

    // --- Cordova Insomnia Plugin ---
    const setupNativeWakeLock = () => {
        const win = window as any;
        if (win.plugins && win.plugins.insomnia) {
            win.plugins.insomnia.keepAwake(
                () => {
                    console.log("Insomnia (native) wake lock enabled.");
                    isNativeWakeLockActive = true;
                },
                () => {
                    console.warn("Insomnia (native) wake lock failed. Falling back to Web API.");
                    requestWebWakeLock();
                }
            );
        } else {
            // If the plugin is not found in a Cordova environment, it's an issue, but we can still fall back.
            console.log("Insomnia plugin not found. Using Web Wake Lock API.");
            requestWebWakeLock();
        }
    };
    
    // Determine the environment and set up the appropriate wake lock mechanism.
    // FIX: Cast `window` to `any` to access the `cordova` property, which is not part of the standard Window type but is injected in a Cordova environment.
    if ((window as any).cordova && (window as any).cordova.platformId !== 'browser') {
        document.addEventListener('deviceready', setupNativeWakeLock, false);
    } else {
        // Standard web environment. Use the Web Wake Lock API.
        requestWebWakeLock(); // Initial request
        document.addEventListener('visibilitychange', requestWebWakeLock); // Re-request when tab becomes visible
    }
    
    // --- Cleanup ---
    return () => {
        // FIX: Cast `window` to `any` to access the `cordova` property for environment-specific cleanup.
        if ((window as any).cordova && (window as any).cordova.platformId !== 'browser') {
            document.removeEventListener('deviceready', setupNativeWakeLock, false);
            const win = window as any;
            if (win.plugins && win.plugins.insomnia && win.plugins.insomnia.allowSleepAgain) {
                win.plugins.insomnia.allowSleepAgain(() => console.log("Insomnia: Allowed screen to sleep."), () => {});
            }
        } else {
            document.removeEventListener('visibilitychange', requestWebWakeLock);
            if (wakeLock !== null) {
                wakeLock.release();
                wakeLock = null;
            }
        }
    };
  }, []); // Empty dependency array ensures this runs only once on mount.


  // Effect for managing the back button listener specifically
  useEffect(() => {
    const addBackButtonListener = () => {
        document.addEventListener('backbutton', handleBackButton, false);
        console.log("Back button handler attached.");
    };

    // We must wait for deviceready before adding the backbutton listener.
    document.addEventListener('deviceready', addBackButtonListener, false);

    return () => {
        document.removeEventListener('deviceready', addBackButtonListener, false);
        document.removeEventListener('backbutton', handleBackButton, false);
        console.log("Cleaned up backbutton listener.");
    };
  }, [handleBackButton]); // Dependency on the memoized handler.


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

  const renderPage = () => {
    switch(page) {
      case 'quran': // إضافة حالة عرض مكون المصحف
        return <QuranReader onBack={navigateBack} />;
      case 'salah-adhkar':
        return <AthkarAlSalah onBack={navigateBack} />;
      case 'calendar':
        return <HijriCalendar onBack={navigateBack} />;
      case 'listen':
        return <ListenQuran onBack={navigateBack} />;
      case 'tasbeeh':
        return <Tasbeeh onBack={navigateBack} />;
      case 'hajj-umrah':
        return <HajjUmrah onBack={navigateBack} />;
      case 'hisn-muslim':
        return <HisnAlmuslim onBack={navigateBack} />;
      case 'prayer-times':
        return <PrayerTimes onBack={navigateBack} />;
      case 'qibla':
        return <Qibla onBack={navigateBack} />;
      case 'sabah-masaa':
        return <AdkarSabahMasaa onBack={navigateBack} />;
      case 'adia':
        return <Adia onBack={navigateBack} />;
      case 'home':
      default:
        return <MainMenu onNavigate={handleNavigate} onOpenThemes={toggleThemeSelector} />;
    }
  };

  return (
    <>
      {renderPage()}
      {isThemeSelectorOpen && <ThemeSelector onClose={closeThemeSelector} />}
      <ExitConfirmModal 
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleConfirmExit}
      />
    </>
  );
}

export default App;