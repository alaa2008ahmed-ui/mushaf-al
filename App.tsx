
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

  // Use refs to hold the current state values to avoid stale closures in the event listener
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const isThemeSelectorOpenRef = useRef(isThemeSelectorOpen);
  useEffect(() => {
    isThemeSelectorOpenRef.current = isThemeSelectorOpen;
  }, [isThemeSelectorOpen]);


  // This effect sets up device listeners and screen wake lock.
  useEffect(() => {
    const onBackKeyDown = (e: Event) => {
      e.preventDefault();

      if (isThemeSelectorOpenRef.current) {
        setIsThemeSelectorOpen(false);
        return;
      }

      if (pageRef.current !== 'home') {
        setPage('home');
      } else {
        if ((navigator as any).notification && typeof (navigator as any).notification.confirm === 'function') {
          (navigator as any).notification.confirm(
            'هل تريد الخروج من تطبيق احمد وليلى',
            (buttonIndex) => {
              if (buttonIndex === 1) {
                if ((navigator as any).app && typeof (navigator as any).app.exitApp === 'function') {
                  (navigator as any).app.exitApp();
                }
              }
            },
            'تأكيد الخروج',
            ['نعم', 'لا']
          );
        } else {
          if (window.confirm('هل تريد الخروج من تطبيق احمد وليلى')) {
            if ((navigator as any).app && typeof (navigator as any).app.exitApp === 'function') {
              (navigator as any).app.exitApp();
            }
          }
        }
      }
    };

    // --- Screen Wake Lock Logic ---
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      if (document.visibilityState !== 'visible') return;
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock is active.');
          wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock was released.');
          });
        } catch (err) {
          console.error(`WakeLock request failed: ${(err as Error).name}, ${(err as Error).message}`);
          wakeLock = null;
        }
      } else {
        console.warn('Screen Wake Lock API is not supported.');
      }
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            requestWakeLock();
        }
    };
    // --- End Wake Lock Logic ---

    const onDeviceReady = () => {
      document.addEventListener('backbutton', onBackKeyDown, false);
      
      if ((window as any).plugins && (window as any).plugins.insomnia) {
        (window as any).plugins.insomnia.keepAwake(
          () => console.log('Insomnia plugin is keeping the screen on.'),
          () => {
            console.warn('Insomnia plugin failed, falling back to Screen Wake Lock API.');
            requestWakeLock();
            document.addEventListener('visibilitychange', handleVisibilityChange);
          }
        );
      } else {
        console.log('Insomnia plugin not found, using Screen Wake Lock API.');
        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    };

    document.addEventListener('deviceready', onDeviceReady, false);

    // FIX: Add type assertion to 'any' for 'window.cordova' to resolve TypeScript error. The 'cordova' property is added by the Cordova framework at runtime and is not part of the standard 'window' type definition.
    if (!(window as any).cordova || (window as any).cordova.platformId === 'browser') {
        console.log('Browser environment detected, using Screen Wake Lock API.');
        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    return () => {
      document.removeEventListener('deviceready', onDeviceReady, false);
      document.removeEventListener('backbutton', onBackKeyDown, false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
      }
      
      if ((window as any).plugins && (window as any).plugins.insomnia) {
        (window as any).plugins.insomnia.allowSleepAgain(() => {}, () => {});
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount.


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
