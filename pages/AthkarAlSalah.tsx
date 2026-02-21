
import React, { useState } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { baseAthkar, specialZikr, prayerOptions, fajrDhikr, fajrMaghribDhikr } from '../data/athkarAlSalahData';

function AthkarAlSalah({ onBack }) {
    const { theme } = useTheme();
    const [currentPrayer, setCurrentPrayer] = useState(null);
    const [athkarList, setAthkarList] = useState([]);
    const [zoomedZikr, setZoomedZikr] = useState(null);

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
                        <h1 className="app-top-bar__title text-xl sm:text-2xl font-kufi flex items-center gap-2 justify-center">
                            {currentPrayer ? currentPrayer.title : <>أذكار الصلوات</>}
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
                                className="themed-card p-4 rounded-xl border-t-4"
                                style={{ borderColor: theme.palette[0] }}
                            >
                                <h3 className="font-bold text-sm mb-3 text-center" style={{ color: theme.palette[1] }}>
                                    <i className="fa-solid fa-mosque text-xs ml-2"></i> سنن الصلوات (الرواتب)
                                </h3>
                                <div className="space-y-2 text-sm font-amiri themed-text-muted" dir="rtl">
                                    <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                                        <span>صلاة الفجر:</span>
                                        <span className="font-bold">2 ركعة قبلية</span>
                                    </div>
                                    <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                                        <span>صلاة الظهر:</span>
                                        <span className="font-bold">4 قبلية و 2 بعدية</span>
                                    </div>
                                    <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                                        <span>صلاة العصر:</span>
                                        <span className="opacity-60 italic">ليس لها سنة راتبة</span>
                                    </div>
                                    <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                                        <span>صلاة المغرب:</span>
                                        <span className="font-bold">2 ركعة بعدية</span>
                                    </div>
                                    <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                                        <span>صلاة العشاء:</span>
                                        <span className="font-bold">2 ركعة بعدية</span>
                                    </div>
                                    <div className="pt-2 text-center font-bold" style={{ color: theme.palette[0] }}>
                                        المجموع: 12 ركعة في اليوم
                                    </div>
                                </div>
                                <div className="flex justify-center mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                                    <button 
                                        onClick={() => setZoomedZikr({
                                            title: "سنن الصلوات (الرواتب)",
                                            text: `
                                                <div class="space-y-4 text-2xl">
                                                    <div class="flex justify-between border-b border-black/10 pb-2"><span>الفجر:</span> <b>2 ركعة قبلية</b></div>
                                                    <div class="flex justify-between border-b border-black/10 pb-2"><span>الظهر:</span> <b>4 قبلية و 2 بعدية</b></div>
                                                    <div class="flex justify-between border-b border-black/10 pb-2"><span>العصر:</span> <i class="opacity-60">ليس لها سنة راتبة</i></div>
                                                    <div class="flex justify-between border-b border-black/10 pb-2"><span>المغرب:</span> <b>2 ركعة بعدية</b></div>
                                                    <div class="flex justify-between border-b border-black/10 pb-2"><span>العشاء:</span> <b>2 ركعة بعدية</b></div>
                                                </div>
                                            `,
                                            note: "الرواتب المؤكدة"
                                        })} 
                                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <i className="fa-solid fa-magnifying-glass-plus text-lg themed-text-muted"></i>
                                    </button>
                                </div>
                            </div>

                            <div 
                                className="themed-card p-4 rounded-xl border-t-4 mt-4"
                                style={{ borderColor: theme.palette[1] }}
                            >
                                <h3 className="font-bold text-sm mb-3 text-center" style={{ color: theme.palette[0] }}>
                                    <i className="fa-solid fa-scroll text-xs ml-2"></i> أحاديث في فضل السنن
                                </h3>
                                <div className="space-y-4 text-sm font-amiri themed-text-muted" dir="rtl">
                                    <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border-r-2" style={{ borderRightColor: theme.palette[0] }}>
                                        <p className="leading-relaxed">
                                            عن أم حبيبة رضي الله عنها قالت: سمعت رسول الله ﷺ يقول: <span className="text-primary font-bold">"مَنْ صَلَّى فِي يَوْمٍ وَلَيْلَةٍ ثِنْتَيْ عَشْرَةَ رَكْعَةً بُنِيَ لَهُ بَيْتٌ فِي الْجَنَّةِ"</span>.
                                        </p>
                                        <p className="text-left text-[10px] mt-1 opacity-70">- رواه مسلم</p>
                                    </div>
                                    
                                    <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border-r-2" style={{ borderRightColor: theme.palette[1] }}>
                                        <p className="leading-relaxed">
                                            عن عائشة رضي الله عنها عن النبي ﷺ قال: <span className="text-secondary font-bold">"رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا"</span>.
                                        </p>
                                        <p className="text-left text-[10px] mt-1 opacity-70">- رواه مسلم</p>
                                    </div>

                                    <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border-r-2" style={{ borderRightColor: theme.palette[0] }}>
                                        <p className="leading-relaxed">
                                            عن ابن عمر رضي الله عنهما أن النبي ﷺ قال: <span className="text-primary font-bold">"رَحِمَ اللَّهُ امْرَأً صَلَّى قَبْلَ الْعَصْرِ أَرْبَعًا"</span>.
                                        </p>
                                        <p className="text-left text-[10px] mt-1 opacity-70">- رواه الترمذي وأبو داود</p>
                                    </div>

                                    <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg border-r-2" style={{ borderRightColor: theme.palette[1] }}>
                                        <p className="leading-relaxed">
                                            عن أم حبيبة رضي الله عنها قالت: قال رسول الله ﷺ: <span className="text-secondary font-bold">"مَنْ حَافَظَ عَلَى أَرْبَعِ رَكَعَاتٍ قَبْلَ الظُّهْرِ وَأَرْبَعٍ بَعْدَهَا حَرَّمَهُ اللَّهُ عَلَى النَّارِ"</span>.
                                        </p>
                                        <p className="text-left text-[10px] mt-1 opacity-70">- رواه الترمذي وأبو داود</p>
                                    </div>
                                </div>
                                <div className="flex justify-center mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                                    <button 
                                        onClick={() => setZoomedZikr({
                                            title: "أحاديث في فضل السنن",
                                            text: `
                                                <div class="space-y-6 text-xl text-right" dir="rtl">
                                                    <p>"مَنْ صَلَّى فِي يَوْمٍ وَلَيْلَةٍ ثِنْتَيْ عَشْرَةَ رَكْعَةً بُنِيَ لَهُ بَيْتٌ فِي الْجَنَّةِ"</p>
                                                    <p>"رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا"</p>
                                                    <p>"رَحِمَ اللَّهُ امْرَأً صَلَّى قَبْلَ الْعَصْرِ أَرْبَعًا"</p>
                                                    <p>"مَنْ حَافَظَ عَلَى أَرْبَعِ رَكَعَاتٍ قَبْلَ الظُّهْرِ وَأَرْبَعٍ بَعْدَهَا حَرَّمَهُ اللَّهُ عَلَى النَّارِ"</p>
                                                </div>
                                            `,
                                            note: "أحاديث صحيحة"
                                        })} 
                                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <i className="fa-solid fa-magnifying-glass-plus text-lg themed-text-muted"></i>
                                    </button>
                                </div>
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
                                    
                                    <div className="flex justify-center mt-4">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoomedZikr(zikr);
                                            }} 
                                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <i className="fa-solid fa-magnifying-glass-plus text-lg themed-text-muted"></i>
                                        </button>
                                    </div>

                                    {!isFinished && <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition pointer-events-none" style={{backgroundColor: theme.palette[0]+'15'}}></div>}
                                    {!isFinished && <p className="text-xs text-center themed-text-muted mt-4 opacity-0 group-hover:opacity-100 transition-opacity">اضغط للتسبيح</p>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <BottomBar onHomeClick={handleHomeClick} onThemesClick={() => {}} showThemes={false} />

            {zoomedZikr && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setZoomedZikr(null)}>
                    <div className="themed-card p-8 rounded-3xl w-full max-w-2xl text-center relative scale-in shadow-2xl border-2" style={{ borderColor: theme.palette[0] }} onClick={e => e.stopPropagation()}>
                        {zoomedZikr.title && <h3 className="text-xl font-bold mb-4" style={{ color: theme.palette[1] }}>{zoomedZikr.title}</h3>}
                        <div 
                            className="text-3xl md:text-4xl leading-relaxed font-amiri"
                            dangerouslySetInnerHTML={{ __html: zoomedZikr.text }}
                        ></div>
                        <p className="text-lg mt-6 font-bold" style={{ color: theme.palette[0] }}>
                            التكرار المطلوب: {zoomedZikr.note}
                        </p>
                        <button 
                            onClick={() => setZoomedZikr(null)} 
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AthkarAlSalah;
