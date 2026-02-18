
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
  const [page, setPage] = useState('home');
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  // Refs to hold current state, preventing stale closures in event listeners.
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const isThemeSelectorOpenRef = useRef(isThemeSelectorOpen);
  useEffect(() => {
    isThemeSelectorOpenRef.current = isThemeSelectorOpen;
  }, [isThemeSelectorOpen]);

  // Memoized handler for the back button press for stability.
  const handleBackButton = useCallback((event: Event) => {
    // This is the most critical part: prevent the default OS action (like exiting the app).
    event.preventDefault();

    if (isThemeSelectorOpenRef.current) {
      // If the theme selector is open, the back button should close it first.
      setIsThemeSelectorOpen(false);
      return;
    }

    if (pageRef.current !== 'home') {
      // If we are on any page other than home, go back to the home screen.
      setPage('home');
    } else {
      // If we are on the home page, show an exit confirmation dialog.
      const appNavigator = window.navigator as any;
      if (appNavigator.notification && typeof appNavigator.notification.confirm === 'function') {
        appNavigator.notification.confirm(
          'هل تريد الخروج من تطبيق احمد وليلى؟', // message
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
        if (window.confirm('هل تريد الخروج من تطبيق احمد وليلى؟')) {
          if (appNavigator.app && typeof appNavigator.app.exitApp === 'function') {
            appNavigator.app.exitApp();
          }
        }
      }
    }
  }, []); // This callback is memoized and doesn't need dependencies due to using refs.

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
    };
  }, [handleBackButton]); // Dependency ensures the correct handler is always attached.


  const handleNavigate = (pageId) => {
    if (pageId === 'quran') { // إضافة حالة التنقل إلى المصحف
        setPage('quran');
    } else if (pageId === 'salah-adhkar') {
        setPage('salah-adhkar');
    } else if (pageId === 'calendar') {
        setPage('calendar');
    } else if (pageId === 'listen') {
        setPage('listen');
    } else if (pageId === 'tasbeeh') {
        setPage('tasbeeh');
    } else if (pageId === 'hajj-umrah') {
        setPage('hajj-umrah');
    } else if (pageId === 'hisn-muslim') {
        setPage('hisn-muslim');
    } else if (pageId === 'prayer-times') {
        setPage('prayer-times');
    } else if (pageId === 'qibla') {
        setPage('qibla');
    } else if (pageId === 'sabah-masaa') {
        setPage('sabah-masaa');
    } else if (pageId === 'adia') {
        setPage('adia');
    } else {
        alert(`التنقل إلى قسم "${pageId}" قيد الإنشاء.`);
    }
  };
  
  const toggleThemeSelector = () => setIsThemeSelectorOpen(prev => !prev);
  const closeThemeSelector = () => setIsThemeSelectorOpen(false);

  const renderPage = () => {
    switch(page) {
      case 'quran': // إضافة حالة عرض مكون المصحف
        return <QuranReader onBack={() => setPage('home')} />;
      case 'salah-adhkar':
        return <AthkarAlSalah onBack={() => setPage('home')} />;
      case 'calendar':
        return <HijriCalendar onBack={() => setPage('home')} />;
      case 'listen':
        return <ListenQuran onBack={() => setPage('home')} />;
      case 'tasbeeh':
        return <Tasbeeh onBack={() => setPage('home')} />;
      case 'hajj-umrah':
        return <HajjUmrah onBack={() => setPage('home')} />;
      case 'hisn-muslim':
        return <HisnAlmuslim onBack={() => setPage('home')} />;
      case 'prayer-times':
        return <PrayerTimes onBack={() => setPage('home')} />;
      case 'qibla':
        return <Qibla onBack={() => setPage('home')} />;
      case 'sabah-masaa':
        return <AdkarSabahMasaa onBack={() => setPage('home')} />;
      case 'adia':
        return <Adia onBack={() => setPage('home')} />;
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
