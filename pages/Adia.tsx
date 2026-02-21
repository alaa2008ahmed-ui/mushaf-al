
import React, { useState } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
// FIX: The component was trying to import 'STATIC_DUAA', which is not exported from adiaData. The correct export is 'ALL_DUAA'.
import { ALL_DUAA } from '../data/adiaData';


function Adia({ onBack }) {
    const { theme } = useTheme();
    const [zoomedDuaa, setZoomedDuaa] = useState(null);

    const openZoomModal = (duaa) => {
        setZoomedDuaa(duaa);
    };

    const closeZoomModal = () => {
        setZoomedDuaa(null);
    };

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
                            <div className="flex justify-center mt-3">
                                <button onClick={() => openZoomModal(duaa)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <i className="fa-solid fa-magnifying-glass-plus text-lg"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />

            {zoomedDuaa && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4">
                    <div className="themed-card p-6 rounded-2xl w-full max-w-2xl text-center relative">
                        <p className="text-4xl md:text-5xl leading-relaxed font-amiri">
                            {zoomedDuaa.text}
                        </p>
                        <p className="text-lg mt-4 themed-text-muted opacity-80">
                            المصدر: {zoomedDuaa.source}
                        </p>
                        <button onClick={closeZoomModal} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <i className="fa-solid fa-times text-2xl"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Adia;
