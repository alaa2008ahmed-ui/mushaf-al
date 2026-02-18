
import React, { useState } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { hesnDoors } from '../data/hisnAlmuslimData';

function HisnAlmuslim({ onBack }) {
    const { theme } = useTheme();
    const [currentDoorId, setCurrentDoorId] = useState(null);

    const DoorsScreen = () => (
        <div className="p-4 space-y-3">
            {hesnDoors.map((door) => (
                <button key={door.id} onClick={() => setCurrentDoorId(door.id)} className={`w-full text-right rounded-2xl themed-card px-3 py-3 focus:outline-none`}>
                    <h2 className="text-lg font-bold mb-1">{door.title}</h2>
                    <p className="text-xs themed-text-muted mb-1">{door.description}</p>
                    <p className="text-xs themed-text-muted mt-1">عدد الأذكار: {door.items.length}</p>
                </button>
            ))}
        </div>
    );

    const DoorDetailScreen = () => {
        const door = hesnDoors.find(d => d.id === currentDoorId);
        if (!door) return <p>الباب غير موجود.</p>;

        return (
            <div>
                 <div className="p-4 themed-bg-alt">
                    <div className="flex items-center justify-between mb-2">
                         <button onClick={() => setCurrentDoorId(null)} className="px-3 py-1 rounded-full text-white text-xs font-bold shadow" style={{backgroundColor: theme.palette[1]}}>
                            ◀ الأبواب
                        </button>
                        <h2 className="text-xl font-extrabold text-center flex-1 mx-2" style={{color: theme.palette[0]}}>{door.title}</h2>
                    </div>
                     <p className="text-xs themed-text-muted mb-0 text-center">{door.description}</p>
                </div>
                <div className="space-y-3 p-4">
                    {door.items.map((item, index) => {
                         let typeClass = 'bg-gray-200 text-gray-700';
                         if (item.type === 'ayah') typeClass = 'bg-green-100 text-green-800';
                         else if (item.type === 'hadith') typeClass = 'bg-blue-100 text-blue-800';

                        return (
                             <div key={index} className={`rounded-2xl themed-card px-3 py-3`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${typeClass}`}>{item.type}</span>
                                    {item.title && <span className="text-xs themed-text-muted font-bold">{item.title}</span>}
                                </div>
                                <p className="text-lg font-amiri themed-text mb-2 whitespace-pre-wrap">{item.text}</p>
                                {item.source && <p className="text-xs themed-text-muted mt-1 text-left">المصدر: {item.source}</p>}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };


    return (
        <div className="h-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-2xl">حصن المسلم</h1>
                    <p className="app-top-bar__subtitle">استعرض أبواب وأذكار حصن المسلم بسهولة.</p>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto pb-24">
                {currentDoorId ? <DoorDetailScreen /> : <DoorsScreen />}
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default HisnAlmuslim;
