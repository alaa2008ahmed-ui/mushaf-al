
import React, { useState } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { baseAthkar, specialZikr, prayerOptions, fajrDhikr, fajrMaghribDhikr } from '../data/athkarAlSalahData';

function AthkarAlSalah({ onBack }) {
    const { theme } = useTheme();
    const [currentPrayer, setCurrentPrayer] = useState(null);
    const [athkarList, setAthkarList] = useState([]);

    const openPrayer = (prayerId, titleText) => {
        let currentAthkarData = JSON.parse(JSON.stringify(baseAthkar));

        // Handle common Fajr/Maghrib changes
        if (prayerId === 'fajr' || prayerId === 'maghrib') {
            // Change Mu'awwidhat count to 3
            currentAthkarData.forEach(z => {
                if (['ikhlas', 'falaq', 'naas'].includes(z.id)) {
                    z.count = 3;
                    z.note = "3 مرات";
                }
            });
            
            // Add 10x Tahleel before tasbeeh
            const tasbeehIndex = currentAthkarData.findIndex(z => z.id === 'tasbeeh');
            if (tasbeehIndex !== -1) {
                currentAthkarData.splice(tasbeehIndex, 0, specialZikr);
            }
        }
        
        // Find index to insert prayer-specific athkar
        const afterEveryPrayerIndex = currentAthkarData.findIndex(z => z.id === 'after_every_prayer');

        if (afterEveryPrayerIndex !== -1) {
            if (prayerId === 'fajr') {
                // Insert for Fajr prayer. Splicing in reverse order of appearance to maintain order.
                currentAthkarData.splice(afterEveryPrayerIndex + 1, 0, fajrMaghribDhikr);
                currentAthkarData.splice(afterEveryPrayerIndex + 1, 0, fajrDhikr);
            } else if (prayerId === 'maghrib') {
                // Insert for Maghrib prayer
                currentAthkarData.splice(afterEveryPrayerIndex + 1, 0, fajrMaghribDhikr);
            }
        }

        const listWithCounts = currentAthkarData.map(z => ({ ...z, currentCount: z.count }));
        setAthkarList(listWithCounts);
        setCurrentPrayer({ id: prayerId, title: titleText });
    };

    const handleDecrement = (zikrId) => {
        setAthkarList(prevList =>
            prevList.map(zikr =>
                zikr.id === zikrId && zikr.currentCount > 0
                    ? { ...zikr, currentCount: zikr.currentCount - 1 }
                    : zikr
            )
        );
    };

    const handleHomeClick = () => {
        if (currentPrayer) {
            setCurrentPrayer(null);
        } else {
            onBack();
        }
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <div className="relative flex items-center justify-center">
                        {currentPrayer && (
                            <button onClick={() => setCurrentPrayer(null)} className="absolute right-0 top-1/2 -translate-y-1/2 transform inline-flex items-center gap-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1 rounded-full transition shadow-md">
                                <i className="fa-solid fa-arrow-right text-base"></i>
                                <span>العودة</span>
                            </button>
                        )}
                        <h1 className="app-top-bar__title text-xl sm:text-2xl font-kufi flex items-center gap-2 justify-center">
                            {currentPrayer ? currentPrayer.title : <><i className="fa-solid fa-mosque"></i> أذكار الصلوات</>}
                        </h1>
                    </div>
                    <p className="app-top-bar__subtitle">
                        {currentPrayer ? `أذكار ما بعد صلاة ${currentPrayer.title.split(' ')[2]}` : "تصفّح أذكار ما بعد الصلاة مع عدّاد تفاعلي وتنقل سهل بين الصلوات الخمس"}
                    </p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto hide-scrollbar relative max-w-md mx-auto w-full p-4 pb-24 flex flex-col">
                {!currentPrayer ? (
                    <>
                        <div id="prayersMenu" className="space-y-4 fade-in">
                            {prayerOptions.map(prayer => (
                                 <div key={prayer.id} onClick={() => openPrayer(prayer.id, `أذكار ${prayer.title}`)} 
                                      className={`themed-card p-4 rounded-xl shadow-sm border-r-4 flex items-center justify-between cursor-pointer active:scale-95 transition`}
                                      style={{ borderRightColor: prayer.color === 'primary' ? theme.palette[0] : theme.palette[1] }}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center`} style={{backgroundColor: prayer.color === 'primary' ? theme.palette[0]+'20' : theme.palette[1]+'20', color: prayer.color === 'primary' ? theme.palette[0] : theme.palette[1]}}>
                                            <i className={`fa-solid ${prayer.icon} text-xl`}></i>
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-lg">{prayer.title}</h2>
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
                                    <i className="fa-solid fa-gem text-xs ml-2"></i> فضل الذكر دبر الصلوات
                                </h3>
                                <p className="text-sm leading-relaxed font-amiri themed-text-muted" dir="rtl">
                                    عن أبي هريرة رضي الله عنه، أن رسول الله ﷺ قال: "مَنْ سَبَّحَ اللَّهَ فِي دُبُرِ كُلِّ صَلَاةٍ ثَلَاثًا وَثَلَاثِينَ، وَحَمِدَ اللَّهَ ثَلَاثًا وَثَلَاثِينَ، وَكَبَّرَ اللَّهَ ثَلَاثًا وَثَلَاثِينَ، فَتِلْكَ تِسْعَةٌ وَتِسْعُونَ، وَقَالَ تَمَامَ الْمِائَةِ: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، غُفِرَتْ خَطَايَاهُ وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ".
                                </p>
                                <p className="text-left text-[10px] themed-text-muted mt-2 opacity-70">
                                    - رواه مسلم
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div id="athkarDetails" className="fade-in space-y-4">
                        {athkarList.map(zikr => {
                            const isFinished = zikr.currentCount === 0;
                            const textClass = zikr.isQuran ? 'font-amiri text-2xl text-center leading-relaxed' : 'text-lg leading-loose font-medium';
                            
                            return (
                                <div key={zikr.id} className={`themed-card p-5 rounded-2xl border relative overflow-hidden group mb-4 transition-all duration-300 ${isFinished ? 'opacity-60' : ''}`} onClick={() => handleDecrement(zikr.id)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold shadow-sm" style={{backgroundColor: theme.palette[1]+'30', color: theme.palette[1]}}>{zikr.note}</span>
                                        <div className={`count-badge w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md transform transition-transform`} style={isFinished ? {backgroundColor: 'var(--badge-finished-bg)', color: 'var(--badge-finished-text)'} : {backgroundImage: `linear-gradient(to bottom right, ${theme.palette[0]}, ${theme.palette[1]})`, color: theme.textColor}}>
                                            {isFinished ? <i className="fa-solid fa-check"></i> : zikr.currentCount}
                                        </div>
                                    </div>
                                    {zikr.title && <h3 className="text-center font-bold mb-2 text-sm" style={{color: theme.palette[1]}}>{zikr.title}</h3>}
                                    <div className={`${textClass} select-none`} dangerouslySetInnerHTML={{ __html: zikr.text }}></div>
                                    {!isFinished && <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition pointer-events-none" style={{backgroundColor: theme.palette[0]+'15'}}></div>}
                                    {!isFinished && <p className="text-xs text-center themed-text-muted mt-4 opacity-0 group-hover:opacity-100 transition-opacity">اضغط للتسبيح</p>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <BottomBar onHomeClick={handleHomeClick} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default AthkarAlSalah;
