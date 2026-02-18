
import React, { useState } from 'react';
import MainMenu from './pages/MainMenu';
import QuranReader from './pages/QuranReader';
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