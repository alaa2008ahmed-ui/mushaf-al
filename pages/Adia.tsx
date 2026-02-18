
import React from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
// FIX: The component was trying to import 'STATIC_DUAA', which is not exported from adiaData. The correct export is 'ALL_DUAA'.
import { ALL_DUAA } from '../data/adiaData';


function Adia({ onBack }) {
    const { theme } = useTheme();

    return (
        <div className="h-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-2xl font-kufi">أدعية مستجابة</h1>
                    <p className="app-top-bar__subtitle">مجموعة من الأدعية المختارة من القرآن والسنة</p>
                </div>
            </header>

            <main className="w-full flex-1 flex flex-col items-center overflow-hidden p-4 pb-24">
                <div className="w-full max-w-lg flex-1 overflow-y-auto hide-scrollbar pb-6 space-y-3">
                    {ALL_DUAA.map((duaa) => (
                        <div key={duaa.id} className="p-4 rounded-xl themed-card transition-all" style={{ fontFamily: theme.font }}>
                            <p className="text-xl leading-relaxed text-center font-amiri">
                                {duaa.text}
                            </p>
                            <p className="text-xs sm:text-sm mt-2 text-center themed-text-muted opacity-80">
                                المصدر: {duaa.source}
                            </p>
                        </div>
                    ))}
                </div>
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default Adia;
