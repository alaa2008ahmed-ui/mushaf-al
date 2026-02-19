
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

  // Refs to hold current state, preventing stale closures in event listeners.
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

  // Memoized handler for the back button press for stability.
  const handleBackButton = useCallback((event: Event) => {
    // This is the most critical part: prevent the default OS action (like exiting the app).
    event.preventDefault();

    if (isThemeSelectorOpenRef.current) {
      // If the theme selector is open, the back button should close it first.
      setIsThemeSelectorOpen(false);
      return;
    }

    if (historyRef.current.length > 1) {
      // If we are on any page other than home, go back one step in history.
      navigateBack();
    } else {
      // If we are on the home page, show an exit confirmation dialog.
      const appNavigator = window.navigator as any;
      if (appNavigator.notification && typeof appNavigator.notification.confirm === 'function') {
        appNavigator.notification.confirm(
          'هل تريد الخروج من مصحف احمد وليلى؟', // message
          (buttonIndex) => {
            // In Cordova, buttonIndex is 1-based. 'نعم' is the first button.
            if (buttonIndex === 1) {
              if (appNavigator.app && typeof appNavigator.app.exitApp === 'function') {
                appNavigator.app.exitApp();
              }
            }
          },
          'تأكيد الخروج', // title
          ['نعم', 'لا'] // buttonLabels
        );
      } else {
        // Fallback for browsers or environments without the dialog plugin.
        if (window.confirm('هل تريد الخروج من مصحف احمد وليلى؟')) {
          if (appNavigator.app && typeof appNavigator.app.exitApp === 'function') {
            appNavigator.app.exitApp();
          }
        }
      }
    }
  }, [navigateBack]);

  // Effect to set up device-specific features and event listeners ONCE.
  useEffect(() => {
    const onDeviceReady = () => {
      console.log("Cordova deviceready event fired. Initializing native features...");
      
      // 1. Keep the screen on as long as the app is running (Insomnia plugin).
      const win = window as any;
      if (win.plugins && win.plugins.insomnia) {
        win.plugins.insomnia.keepAwake(
          () => console.log("Insomnia: Screen will stay on."),
          () => console.warn("Insomnia: Failed to keep screen on.")
        );
      } else {
        console.log("Insomnia plugin not found. Screen may turn off.");
      }

      // 2. Add the robust back button listener for exit confirmation.
      // This listener will be managed by React's lifecycle.
      document.addEventListener('backbutton', handleBackButton, false);
      console.log("Back button handler attached.");
    };

    // This is the entry point for all Cordova-related initializations.
    document.addEventListener('deviceready', onDeviceReady, false);

    // Cleanup function to remove listeners when the component unmounts.
    // This is important for a clean app lifecycle in a single-page application.
    return () => {
      document.removeEventListener('deviceready', onDeviceReady, false);
      document.removeEventListener('backbutton', handleBackButton, false);
      console.log("Cleaned up deviceready and backbutton listeners.");
      const win = window as any;
      if (win.plugins && win.plugins.insomnia && win.plugins.insomnia.allowSleepAgain) {
        win.plugins.insomnia.allowSleepAgain();
      }
    };
  }, [handleBackButton]); // Dependency ensures the correct handler is always attached.


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
