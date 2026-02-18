
import React, { useState, useEffect } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';
import WhatsAppButton from './WhatsAppButton';

// --- Icon Components ---
const QuranIcon = ({ className = 'w-16 h-16', color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);
const SalahAdhkarIcon = ({ className = 'w-8 h-8', color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 20a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4Z"/>
    <path d="M2 15V8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v7"/><path d="M12 4v2"/><path d="M12 11v-1"/><path d="M12 7.5v-1"/>
  </svg>
);
const ListenIcon = ({ className = 'w-8 h-8', color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 10v4a7 7 0 0 0 7 7h0a7 7 0 0 0 7-7v-4"/><path d="M21 10a9 9 0 0 0-18 0"/>
    <path d="M12 14a2 2 0 0 0-2-2v0a2 2 0 0 0 2-2v0a2 2 0 0 0 2 2v0a2 2 0 0 0-2 2Z"/>
  </svg>
);
const TasbeehIcon = ({ className = 'w-8 h-8', color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0"/><path d="M12 6V4"/><path d="m10 2 4 4"/><circle cx="12" cy="12" r="10" />
  </svg>
);
const CalendarIcon = ({ className = 'w-8 h-8', color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);
const QiblaIcon = ({ className = 'w-8 h-8', color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4.34 15.66 12 20l7.66-4.34"/><path d="m18.27 7.5-3.05-3.05a2 2 0 0 0-2.83 0L9.34 7.54"/>
        <path d="m15.73 10-2.5-2.5"/><path d="M21 12a9 9 0 1 1-9-9"/>
    </svg>
);
const HajjIcon = ({ className = 'w-8 h-8', color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2.5 21.5 9 12 15.5 2.5 9Z"/><path d="m2.5 9 v 6l9.5 6.5 9.5-6.5V9"/><path d="m12 15.5 9.5-6.5"/>
  </svg>
);
const HisnMuslimIcon = ({ className = 'w-8 h-8', color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const PrayerTimesIcon = ({ className = 'w-8 h-8', color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 8v4l2 1" /><path d="M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />
    </svg>
);
const AdiaIcon = ({ className = 'w-8 h-8', color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 17.5c2.5-3 5-3 5-5.5a3.5 3.5 0 0 0-7 0c0 2.5 2.5 2.5 5 5.5z"/><path d="M9.5 17.5c-2.5-3-5-3-5-5.5a3.5 3.5 0 0 1 7 0c0 2.5-2.5 2.5-5 5.5z"/>
    </svg>
);
const SabahMasaaIcon = ({ className = 'w-8 h-8', color }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
);


// --- Data ---
const verses = [
  { text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", surah: "سورة الشرح", number: "٥" },
  { text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", surah: "سورة الرعد", number: "٢٨" },
  { text: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ", surah: "سورة هود", number: "٨٨" },
];
const navItems = [
  { id: 'quran', title: "القرآن الكريم", icon: QuranIcon, isFeatured: true },
  { id: 'sabah-masaa', title: "أذكار الصباح والمساء", icon: SabahMasaaIcon },
  { id: 'adia', title: "أدعية", icon: AdiaIcon },
  { id: 'tasbeeh', title: "التسبيح", icon: TasbeehIcon },
  { id: 'salah-adhkar', title: "أذكار الصلاة", icon: SalahAdhkarIcon },
  { id: 'prayer-times', title: "مواقيت الصلاة", icon: PrayerTimesIcon },
  { id: 'qibla', title: "القبلة", icon: QiblaIcon },
  { id: 'hajj-umrah', title: "الحج والعمرة", icon: HajjIcon },
  { id: 'hisn-muslim', title: "حصن المسلم", icon: HisnMuslimIcon },
  { id: 'listen', title: "الاستماع للقرآن", icon: ListenIcon },
  { id: 'calendar', title: "التقويم", icon: CalendarIcon },
];

const featuredItem = navItems.find(item => item.isFeatured);
const regularItems = navItems.filter(item => !item.isFeatured);

function MainMenu({ onNavigate, onOpenThemes }) {
  const [currentVerse, setCurrentVerse] = useState(verses[0]);
  const { theme } = useTheme();

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * verses.length);
    setCurrentVerse(verses[randomIndex]);
  }, []);

  return (
    <>
      <div className="h-screen w-full flex flex-col overflow-y-auto pb-24">
        <header className="pt-8 pb-6 px-4 z-10">
          <div className="max-w-xl mx-auto text-center">
              <p className="font-amiri text-2xl mb-2 tracking-wide" style={{ color: theme.palette[2] || theme.palette[1] }}>
                  {`"${currentVerse.text}"`}
              </p>
              <p className="text-xs mb-4" style={{ color: theme.textColor, opacity: 0.7 }}>
                  ({currentVerse.surah}: {currentVerse.number})
              </p>
              <h1 className="font-kufi text-5xl md:text-6xl font-bold" style={{ color: theme.textColor }}>
                  مصحف احمد وليلى
              </h1>
          </div>
        </header>
        
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-xl space-y-4">
              {featuredItem && (
                  <div onClick={() => onNavigate(featuredItem.id)} className="themed-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer">
                      <div>
                          <featuredItem.icon className="w-12 h-12" color={theme.palette[1]}/>
                      </div>
                      <div>
                          <h2 className="font-bold text-xl">{featuredItem.title}</h2>
                          <p className="text-sm opacity-60">تصفح وقراءة السور والأجزاء</p>
                      </div>
                  </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {regularItems.map(item => (
                      <div key={item.id} onClick={() => onNavigate(item.id)} className="themed-card rounded-2xl p-4 flex flex-col items-center justify-center text-center aspect-square cursor-pointer">
                          <div className="mb-2">
                             <item.icon className="w-10 h-10" color={theme.palette[1]} />
                          </div>
                          <h3 className="font-bold text-sm">{item.title}</h3>
                      </div>
                  ))}
              </div>
          </div>
        </main>

        <div className="w-full max-w-xl mx-auto px-4 mt-auto mb-4">
            <div className="p-4 rounded-2xl border" style={{ borderColor: theme.palette[1] ? (theme.palette[1] + '80') : 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.1)'}}>
                <p className="text-center text-lg font-bold font-amiri" style={{color: theme.textColor, opacity: 0.9}}>
                    اللهم ارحمهما واغفر لهما ونور قبرهما وادخلهما فسيح جناتك
                </p>
            </div>
        </div>
        
        <BottomBar onHomeClick={() => {}} onThemesClick={onOpenThemes} showHome={false} showThemes={true} />
      </div>
      <WhatsAppButton />
    </>
  );
}

export default MainMenu;
