
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

// --- Main App Component ---
function App() {
  const [history, setHistory] = useState(['home']);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

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
      const appNavigator = window.navigator as any;
      if (appNavigator.notification && typeof appNavigator.notification.confirm === 'function') {
        appNavigator.notification.confirm(
          'هل تريد الخروج من مصحف احمد وليلى؟',
          (buttonIndex) => {
            if (buttonIndex === 1) {
              if (appNavigator.app && typeof appNavigator.app.exitApp === 'function') {
                appNavigator.app.exitApp();
              }
            }
          },
          'تأكيد الخروج',
          ['نعم', 'لا']
        );
      } else {
        if (window.confirm('هل تريد الخروج من مصحف احمد وليلى؟')) {
          if (appNavigator.app && typeof appNavigator.app.exitApp === 'function') {
            appNavigator.app.exitApp();
          }
        }
      }
    }
  }, [navigateBack]);

  // Effect for one-time device-ready setup (e.g., screen wake lock)
  useEffect(() => {
    const onDeviceReady = () => {
        console.log("Cordova deviceready event fired. Initializing native features...");
        
        const win = window as any;
        if (win.plugins && win.plugins.insomnia) {
            win.plugins.insomnia.keepAwake(
                () => console.log("Insomnia: Screen will stay on."),
                () => console.warn("Insomnia: Failed to keep screen on.")
            );
        } else {
            console.log("Insomnia plugin not found. Screen may turn off.");
        }
    };
    document.addEventListener('deviceready', onDeviceReady, false);

    // Cleanup: This runs when the app is fully closed/terminated.
    return () => {
        document.removeEventListener('deviceready', onDeviceReady, false);
        const win = window as any;
        if (win.plugins && win.plugins.insomnia && win.plugins.insomnia.allowSleepAgain) {
            win.plugins.insomnia.allowSleepAgain(() => console.log("Insomnia: Allowed screen to sleep."), () => {});
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
    </>
  );
}

export default App;
