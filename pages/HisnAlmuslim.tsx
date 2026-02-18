import React, { useState } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { hesnDoors } from '../data/hisnAlmuslimData';

function HisnAlmuslim({ onBack }) {
    const { theme } = useTheme();
    const [currentDoorId, setCurrentDoorId] = useState(null);

    const door = hesnDoors.find(d => d.id === currentDoorId);

    const DoorsScreen = () => (
        <div className="space-y-4 fade-in">
            {hesnDoors.map((door, index) => {
                const colorType = index % 2 === 0 ? 'primary' : 'secondary';
                return (
                    <div key={door.id} onClick={() => setCurrentDoorId(door.id)} 
                          className={`themed-card p-4 rounded-xl shadow-sm border-r-4 flex items-center justify-between cursor-pointer active:scale-95 transition`}
                          style={{ borderRightColor: colorType === 'primary' ? theme.palette[0] : theme.palette[1] }}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center`} style={{backgroundColor: colorType === 'primary' ? theme.palette[0]+'20' : theme.palette[1]+'20', color: colorType === 'primary' ? theme.palette[0] : theme.palette[1]}}>
                                <i className={`fa-solid ${door.icon} text-xl`}></i>
                            </div>
                            <div>
                                <h2 className="font-bold text-base">{door.title}</h2>
                                <p className="text-xs themed-text-muted">{door.description}</p>
                            </div>
                        </div>
                        <i className="fa-solid fa-angle-left themed-text-muted"></i>
                    </div>
                )
            })}
        </div>
    );

    const DoorDetailScreen = () => {
        if (!door) return null;
        return (
            <div className="space-y-4 fade-in">
                {door.items.map((item, index) => {
                    let itemTypeLabel = 'ذكر';
                    if (item.type === 'ayah') itemTypeLabel = 'آية';
                    else if (item.type === 'hadith') itemTypeLabel = 'حديث';
                    else if (item.type === 'duaa') itemTypeLabel = 'دعاء';

                    return (
                        <div key={index} className="themed-card p-5 rounded-2xl border relative overflow-hidden group mb-4 transition-all duration-300">
                            <div className="flex justify-between items-start mb-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold shadow-sm" style={{backgroundColor: theme.palette[1]+'30', color: theme.palette[1]}}>{itemTypeLabel}</span>
                                {item.title && <span className="text-xs themed-text-muted font-bold">{item.title}</span>}
                            </div>
                            <p className="text-xl leading-relaxed text-center font-amiri select-none">{item.text}</p>
                            {item.source && <p className="text-xs mt-2 text-center themed-text-muted opacity-80">المصدر: {item.source}</p>}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <div className="relative flex items-center justify-center">
                        {currentDoorId && (
                            <button onClick={() => setCurrentDoorId(null)} className="absolute right-0 top-1/2 -translate-y-1/2 transform inline-flex items-center gap-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1 rounded-full transition shadow-md">
                                <i className="fa-solid fa-arrow-right text-base"></i>
                                <span>العودة</span>
                            </button>
                        )}
                        <h1 className="app-top-bar__title text-xl sm:text-2xl flex items-center gap-2 justify-center">
                             <i className="fa-solid fa-shield-heart"></i> {door ? door.title : 'حصن المسلم'}
                        </h1>
                    </div>
                    <p className="app-top-bar__subtitle">
                        {door ? door.description : 'استعرض أبواب وأذكار حصن المسلم بسهولة.'}
                    </p>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto hide-scrollbar relative max-w-md mx-auto w-full p-4 pb-24">
                {currentDoorId ? <DoorDetailScreen /> : <DoorsScreen />}
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default HisnAlmuslim;
