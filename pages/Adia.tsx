
import React, { useState, useEffect } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { ALL_DUAA, DUAA_CATEGORIES } from '../data/adiaData';

const ADIA_READ_STATUS_KEY = 'adia_read_status_v1';

function Adia({ onBack }) {
    const { theme } = useTheme();
    const [currentCategory, setCurrentCategory] = useState(null);
    const [readStatus, setReadStatus] = useState({});

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const stored = localStorage.getItem(ADIA_READ_STATUS_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.date === today && data.readDuaas) {
                    setReadStatus(data.readDuaas);
                } else {
                    // New day, reset the storage
                    localStorage.removeItem(ADIA_READ_STATUS_KEY);
                }
            }
        } catch (e) {
            console.error("Failed to load read status from localStorage", e);
            localStorage.removeItem(ADIA_READ_STATUS_KEY);
        }
    }, []);

    const openCategory = (category) => {
        setCurrentCategory(category);
    };

    const markAsRead = (duaaId) => {
        const newReadStatus = { ...readStatus, [duaaId]: true };
        setReadStatus(newReadStatus);

        const today = new Date().toISOString().split('T')[0];
        const dataToStore = {
            date: today,
            readDuaas: newReadStatus
        };
        try {
            localStorage.setItem(ADIA_READ_STATUS_KEY, JSON.stringify(dataToStore));
        } catch (e) {
            console.error("Failed to save read status to localStorage", e);
        }
    };
    
    const duaaList = currentCategory 
        ? ALL_DUAA.slice(currentCategory.start, currentCategory.end + 1)
        : [];

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <div className="relative flex items-center justify-center">
                        {currentCategory && (
                            <button onClick={() => setCurrentCategory(null)} className="absolute right-0 top-1/2 -translate-y-1/2 transform inline-flex items-center gap-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1 rounded-full transition shadow-md">
                                <i className="fa-solid fa-arrow-right text-base"></i>
                                <span>العودة</span>
                            </button>
                        )}
                        <h1 className="app-top-bar__title text-xl sm:text-2xl flex items-center gap-2 justify-center">
                            {currentCategory ? currentCategory.title : <><i className="fa-solid fa-hands-praying"></i> أدعية مستجابة</>}
                        </h1>
                    </div>
                    <p className="app-top-bar__subtitle">
                        {currentCategory ? currentCategory.description : `مجموعة تضم ${ALL_DUAA.length} دعاءً مختاراً مع تصنيفات واضحة`}
                    </p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto hide-scrollbar relative max-w-md mx-auto w-full p-4 pb-24 flex flex-col">
                {!currentCategory ? (
                    <>
                        <div id="categoriesMenu" className="space-y-4 fade-in">
                            {DUAA_CATEGORIES.map(cat => (
                                 <div key={cat.id} onClick={() => openCategory(cat)} 
                                      className={`themed-card p-4 rounded-xl shadow-sm border-r-4 flex items-center justify-between cursor-pointer active:scale-95 transition`}
                                      style={{ borderRightColor: cat.color === 'primary' ? theme.palette[0] : theme.palette[1] }}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center`} style={{backgroundColor: cat.color === 'primary' ? theme.palette[0]+'20' : theme.palette[1]+'20', color: cat.color === 'primary' ? theme.palette[0] : theme.palette[1]}}>
                                            <i className={`fa-solid ${cat.icon} text-xl`}></i>
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-lg">{cat.title}</h2>
                                            <p className="text-xs themed-text-muted">{cat.description}</p>
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-angle-left themed-text-muted"></i>
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto pt-6">
                            <div 
                                className="themed-card p-4 rounded-xl text-center border-t-4"
                                style={{ borderColor: theme.palette[0] }}
                            >
                                <h3 className="font-bold text-sm mb-2" style={{ color: theme.palette[1] }}>
                                    <i className="fa-solid fa-gem text-xs ml-2"></i> فضل الدعاء وأهميته
                                </h3>
                                <p className="text-sm leading-relaxed font-amiri themed-text-muted" dir="rtl">
                                    قال الله تعالى: ﴿وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ﴾. وعن النعمان بن بشير رضي الله عنه أن النبي ﷺ قال: "الدُّعَاءُ هُوَ الْعِبَادَةُ". فالدعاء من أعظم العبادات التي يتقرب بها العبد إلى ربه، وهو سلاح المؤمن الذي يلجأ به إلى الله في كل أحواله.
                                </p>
                                <p className="text-left text-[10px] themed-text-muted mt-2 opacity-70">
                                    - غافر: 60 / رواه الترمذي
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div id="duaaDetails" className="fade-in space-y-4">
                        {duaaList.map(duaa => {
                            const isFinished = !!readStatus[duaa.id];
                            return (
                                <div key={duaa.id} className={`themed-card p-5 rounded-2xl border relative overflow-hidden group mb-4 transition-all duration-300 ${isFinished ? 'opacity-60' : ''}`} onClick={() => !isFinished && markAsRead(duaa.id)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold shadow-sm" style={{backgroundColor: theme.palette[1]+'30', color: theme.palette[1]}}>دعاء</span>
                                        <div className={`count-badge w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md transform transition-transform`} style={isFinished ? {backgroundColor: 'var(--badge-finished-bg)', color: 'var(--badge-finished-text)'} : {backgroundImage: `linear-gradient(to bottom right, ${theme.palette[0]}, ${theme.palette[1]})`, color: theme.textColor}}>
                                            {isFinished ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-hand-holding-heart"></i>}
                                        </div>
                                    </div>
                                    <p className="text-xl leading-relaxed text-center font-amiri select-none">{duaa.text}</p>
                                    <p className="text-xs mt-2 text-center themed-text-muted opacity-80">{duaa.source}</p>
                                    {!isFinished && <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition pointer-events-none" style={{backgroundColor: theme.palette[0]+'15'}}></div>}
                                    {!isFinished && <p className="text-xs text-center themed-text-muted mt-4 opacity-0 group-hover:opacity-100 transition-opacity">اضغط عند القراءة</p>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default Adia;
