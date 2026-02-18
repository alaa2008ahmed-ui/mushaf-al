
import React, { useState, useEffect, useRef } from 'react';
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

// --- Main App Component ---
function App() {
  const [page, setPage] = useState('home');
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  // Use a ref to hold the current page value to avoid stale closures in the event listener
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    const onBackKeyDown = (e) => {
      e.preventDefault();

      // The 'isThemeSelectorOpen' state is directly available here because we include it in the dependency array.
      if (isThemeSelectorOpen) {
        setIsThemeSelectorOpen(false);
        return;
      }

      if (pageRef.current !== 'home') {
        setPage('home');
      } else {
        // We are on the home page, show exit confirmation
        // Use navigator.notification for native dialogs in Cordova
        // FIX: Cast navigator to `any` to access Cordova-specific `notification` property.
        if ((navigator as any).notification && typeof (navigator as any).notification.confirm === 'function') {
          (navigator as any).notification.confirm(
            'يتم الخروج من مصحف احمد وليلى', // message
            (buttonIndex) => {
              // The first button is 'نعم' (index 1)
              if (buttonIndex === 1) {
                // FIX: Cast navigator to `any` to access Cordova-specific `app` property.
                if ((navigator as any).app && typeof (navigator as any).app.exitApp === 'function') {
                  (navigator as any).app.exitApp();
                }
              }
            },
            'تأكيد الخروج', // title
            ['نعم', 'لا'] // buttonLabels, Yes is at index 1, No is at index 2
          );
        } else {
          // Fallback for environments where navigator.notification is not available
          if (window.confirm('يتم الخروج من مصحف احمد وليلى')) {
            // This is a browser-based fallback and might not exit the app
            // but it's better than nothing. navigator.app.exitApp() is preferred.
            // FIX: Cast navigator to `any` to access Cordova-specific `app` property.
            if ((navigator as any).app && typeof (navigator as any).app.exitApp === 'function') {
              (navigator as any).app.exitApp();
            }
          }
        }
      }
    };

    const onDeviceReady = () => {
      document.addEventListener('backbutton', onBackKeyDown, false);
    };

    // Cordova's 'deviceready' event is crucial.
    document.addEventListener('deviceready', onDeviceReady, false);

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      document.removeEventListener('deviceready', onDeviceReady, false);
      document.removeEventListener('backbutton', onBackKeyDown, false);
    };
  }, [isThemeSelectorOpen]); // Rerun effect if isThemeSelectorOpen changes.


  const handleNavigate = (pageId) => {
    if (pageId === 'quran') {
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
      case 'quran':
        return (
            <iframe 
                src="QuranV.html" 
                title="القرآن الكريم" 
                style={{ width: '100%', height: '100dvh', border: 'none' }}
            />
        );
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