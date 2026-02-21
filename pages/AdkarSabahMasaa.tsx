import React, { useState, useEffect } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { BASE_ADHKAR_MORNING, BASE_ADHKAR_EVENING } from '../data/adkarSabahMasaaData';

// FIX: Correctly convert digits to numbers for array indexing.
const toArabicNumerals = (num) => String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);

const ADHKAR_STATUS_KEY = 'sabah_masaa_status_v1';

function AdkarSabahMasaa({ onBack }) {
    const { theme } = useTheme();
    const [adhkarTab, setAdhkarTab] = useState('morning');
    const [adhkarCounts, setAdhkarCounts] = useState({});
    const [zoomedDhikr, setZoomedDhikr] = useState(null);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const stored = localStorage.getItem(ADHKAR_STATUS_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.date === today && data.counts) {
                    setAdhkarCounts(data.counts);
                    return; // Found today's data, no need to initialize
                }
            }
        } catch (e) {
            console.error("Failed to load adhkar status", e);
            // If parsing fails, remove the corrupted item
            localStorage.removeItem(ADHKAR_STATUS_KEY);
        }

        // If no valid data for today, initialize
        const initialCounts = {
            morning: Object.fromEntries(BASE_ADHKAR_MORNING.map((dhikr, i) => [i, dhikr.count])),
            evening: Object.fromEntries(BASE_ADHKAR_EVENING.map((dhikr, i) => [i, dhikr.count]))
        };
        setAdhkarCounts(initialCounts);
    }, []);

    const handleDecrement = (index) => {
        if (zoomedDhikr) return; // Prevent decrementing when zoomed
        const currentTabCounts = adhkarCounts[adhkarTab];
        if (!currentTabCounts || currentTabCounts[index] === 0) {
            return;
        }

        const newCounts = {
            ...adhkarCounts,
            [adhkarTab]: {
                ...adhkarCounts[adhkarTab],
                [index]: currentTabCounts[index] - 1
            }
        };

        setAdhkarCounts(newCounts);

        // Save to localStorage
        const today = new Date().toISOString().split('T')[0];
        try {
            localStorage.setItem(ADHKAR_STATUS_KEY, JSON.stringify({ date: today, counts: newCounts }));
        } catch (e) {
            console.error("Failed to save adhkar status", e);
        }
    };
    
    const currentAdhkar = adhkarTab === 'morning' ? BASE_ADHKAR_MORNING : BASE_ADHKAR_EVENING;

    const openZoomModal = (dhikr) => {
        setZoomedDhikr(dhikr);
    };

    const closeZoomModal = () => {
        setZoomedDhikr(null);
    };

    return (
        <div className="h-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-2xl font-kufi">أذكار الصباح والمساء</h1>
                    <p className="app-top-bar__subtitle">تابع أذكـارك اليومية مع عداد تفاعلي وواجهة سهلة</p>
                </div>
            </header>

            <main className="w-full flex-1 flex flex-col items-center overflow-hidden p-4 pb-24">
                <div className="w-full max-w-lg flex p-1 rounded-xl themed-bg-alt mb-4 text-sm shadow-inner">
                    <button onClick={() => setAdhkarTab('morning')} className={`flex-1 py-2 sm:py-3 px-1 text-center rounded-lg font-bold transition-all ${adhkarTab === 'morning' ? `shadow-md text-white` : 'themed-text-muted'}`} style={{backgroundColor: adhkarTab === 'morning' ? theme.palette[0] : ''}}>أذكار الصباح</button>
                    <button onClick={() => setAdhkarTab('evening')} className={`flex-1 py-2 sm:py-3 px-1 text-center rounded-lg font-bold transition-all ${adhkarTab === 'evening' ? `shadow-md text-white` : 'themed-text-muted'}`} style={{backgroundColor: adhkarTab === 'evening' ? theme.palette[0] : ''}}>أذكار المساء</button>
                </div>
                <div className="w-full max-w-lg flex-1 overflow-y-auto hide-scrollbar pb-6 space-y-3">
                    {currentAdhkar.map((dhikr, index) => {
                        const currentCount = adhkarCounts[adhkarTab]?.[index] ?? dhikr.count;
                        const isFinished = currentCount === 0;

                        return (
                             <div 
                                key={index} 
                                className={`themed-card p-5 rounded-2xl border relative overflow-hidden group transition-all duration-300 ${isFinished ? 'opacity-60' : 'cursor-pointer'}`} 
                                onClick={() => !isFinished && handleDecrement(index)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold shadow-sm" style={{backgroundColor: theme.palette[1]+'30', color: theme.palette[1]}}>{dhikr.count > 1 ? `يُقرأ ${toArabicNumerals(dhikr.count)} مرات` : 'يُقرأ مرة واحدة'}</span>
                                    <div className={`count-badge w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md transform transition-transform`} style={isFinished ? {backgroundColor: 'var(--badge-finished-bg)', color: 'var(--badge-finished-text)'} : {backgroundImage: `linear-gradient(to bottom right, ${theme.palette[0]}, ${theme.palette[1]})`, color: theme.textColor}}>
                                        {isFinished ? <i className="fa-solid fa-check"></i> : toArabicNumerals(currentCount)}
                                    </div>
                                </div>

                                <p className="text-lg leading-relaxed text-center font-amiri select-none">
                                    {dhikr.text}
                                </p>
                                
                                {dhikr.source && <p className="text-xs mt-2 text-center themed-text-muted opacity-80 font-cairo">{dhikr.source}</p>}
                                <div className="flex justify-center mt-3">
                                    <button onClick={(e) => { e.stopPropagation(); openZoomModal(dhikr); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                        <i className="fa-solid fa-magnifying-glass-plus text-lg"></i>
                                    </button>
                                </div>
                                
                                {!isFinished && <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition pointer-events-none" style={{backgroundColor: theme.palette[0]+'15'}}></div>}
                                {!isFinished && <p className="text-xs text-center themed-text-muted mt-4 opacity-0 group-hover:opacity-100 transition-opacity">اضغط للتسبيح</p>}
                            </div>
                        );
                    })}
                </div>
            </main>
            
            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />

            {zoomedDhikr && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4">
                    <div className="themed-card p-6 rounded-2xl w-full max-w-2xl text-center relative">
                        <p className="text-4xl md:text-5xl leading-relaxed font-amiri">
                            {zoomedDhikr.text}
                        </p>
                        {zoomedDhikr.source && <p className="text-lg mt-4 themed-text-muted opacity-80">{zoomedDhikr.source}</p>}
                        <button onClick={closeZoomModal} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <i className="fa-solid fa-times text-2xl"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdkarSabahMasaa;