
import React, { useState, useEffect } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import WhatsAppButton from '../components/WhatsAppButton';
import { verses, navItems } from '../data/mainMenuData';

const NavButton = ({ label, onClick, className, color }) => (
    <div className={`h-full ${className}`}>
        <button 
            onClick={onClick} 
            className="btn-3d-effect w-full rounded-2xl py-3 px-1 font-bold text-white relative text-sm h-full" 
            style={{ background: color }}
        >
            {label}
        </button>
    </div>
);

function MainMenu({ onNavigate, onOpenThemes }) {
  const [currentVerse, setCurrentVerse] = useState(verses[0]);
  const { theme } = useTheme();

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * verses.length);
    setCurrentVerse(verses[randomIndex]);
  }, []);

  return (
    <>
      <div className="h-screen w-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-24 fade-in">
          <div className="main-layout px-4" style={{ fontFamily: theme.font }}>
              <div className="text-center pt-12">
                  <p className="font-bold leading-tight mb-0.5" style={{ color: theme.textColor, fontSize: '1.1rem', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                      {currentVerse.text}
                  </p>
                  <p className="text-[10px] opacity-70 text-left pl-6" style={{ color: theme.textColor }}>
                      {`(${currentVerse.surah}: ${currentVerse.number})`}
                  </p>
              </div>

              <div className="text-center mt-8">
                  <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.textColor, textShadow: '0 2px 5px rgba(0,0,0,0.4)' }}>
                      مُصْحَفُ أَحْمَدَ وَلَيْلَى
                  </h1>
                  <div className="h-7"></div>
                  <p className="text-[14px] font-semibold" style={{ color: theme.textColor, opacity: 0.9 }}>
                      نرجوا الدعاء لهم بالرحمة والمغفرة
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto flex-1 content-center mt-6">
                  <NavButton label="📖 القرآن الكريم" onClick={() => onNavigate('quran')} className="col-span-2 h-14" color={theme.palette[0]} />
                  <NavButton label="🎧 الاستماع للقرآن" onClick={() => onNavigate('listen')} className="col-span-2 h-12" color={theme.palette[0]} />
                  <NavButton label="🕌 أذكار الصلاة" onClick={() => onNavigate('salah-adhkar')} className="col-span-2 h-12" color={theme.palette[0]} />
                  <NavButton label="🤲 الأدعية" onClick={() => onNavigate('adia')} className="h-11" color={theme.palette[1]} />
                  <NavButton label="☀️ الأذكار" onClick={() => onNavigate('sabah-masaa')} className="h-11" color={theme.palette[1]} />
                  <NavButton label="📿 السبحة" onClick={() => onNavigate('tasbeeh')} className="h-11" color={theme.palette[1]} />
                  <NavButton label="🛡️ حصن المسلم" onClick={() => onNavigate('hisn-muslim')} className="h-11" color={theme.palette[1]} />
                  <NavButton label="📅 التقويم" onClick={() => onNavigate('calendar')} className="h-11" color={theme.palette[1]} />
                  <NavButton label="🕋 الحج والعمرة" onClick={() => onNavigate('hajj-umrah')} className="h-11" color={theme.palette[1]} />
                  <NavButton label="⏱️ مواقيت الصلاة" onClick={() => onNavigate('prayer-times')} className="h-11" color={theme.palette[1]} />
                  <NavButton label="🧭 القبلة" onClick={() => onNavigate('qibla')} className="h-11" color={theme.palette[1]} />
              </div>

              <div className="themed-card p-2.5 rounded-2xl text-center w-full max-w-sm mx-auto mt-8 mb-10">
                  <p className="text-[14px] font-bold" style={{ color: theme.textColor }}>
                      اللهم ارحمهما واغفر لهما واجعل مثواهما الجنة
                  </p>
              </div>
          </div>
        </div>
      </div>
      <BottomBar onHomeClick={() => {}} onThemesClick={onOpenThemes} showHome={false} showThemes={true} />
      <WhatsAppButton />
    </>
  );
}

export default MainMenu;
