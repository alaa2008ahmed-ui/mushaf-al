
import React, { useState } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';

// --- Data ---
const baseAthkar = [
    { id: 'istighfar', text: "أَسْتَغْفِرُ اللهَ، أَسْتَغْفِرُ اللهَ، أَسْتَغْفِرُ اللهَ.", count: 1, note: "البداية" },
    { id: 'salam', text: "اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ.", count: 1, note: "مرة واحدة" },
    { id: 'tahleel_1', text: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ.", count: 1, note: "مرة واحدة" },
    { id: 'tahleel_2', text: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ، لَا إِلَهَ إِلَّا اللهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ.", count: 1, note: "مرة واحدة" },
    { id: 'tasbeeh_combo', text: `<div class="flex flex-col gap-2 items-center text-center"><span style="color: var(--color-primary)" class="font-bold">سُبْحَانَ اللهِ (33)</span><span class="w-full h-px bg-gray-100"></span><span style="color: var(--color-secondary)" class="font-bold">الْحَمْدُ للهِ (33)</span><span class="w-full h-px bg-gray-100"></span><span style="color: var(--color-primary)" class="font-bold">اللهُ أَكْبَرُ (33)</span></div>`, count: 99, note: "مجموع التسبيحات" },
    { id: 'khatima', text: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.", count: 1, note: "تمام المائة" },
    { id: 'kursi', title: "آية الكرسي", text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ mَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ", count: 1, note: "مرة واحدة", isQuran: true },
    { id: 'ikhlas', title: "سورة الإخلاص", text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ<br>قُلْ هُوَ اللَّهُ أَحَدٌ (١) اللَّهُ الصَّمَدُ (٢) لَمْ يَلِدْ وَلَمْ يُولَدْ (٣) وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ (٤)", count: 1, note: "مرة واحدة", isQuran: true },
    { id: 'falaq', title: "سورة الفلق", text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ<br>قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ (١) مِن شَرِّ مَا خَلَقَ (٢) وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ (٣) وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ (٤) وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ (٥)", count: 1, note: "مرة واحدة", isQuran: true },
    { id: 'naas', title: "سورة الناس", text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ<br>قُلْ أَعُوذُ بِرَبِّ النَّاسِ (١) مَلِكِ النَّاسِ (٢) إِلَٰهِ النَّاسِ (٣) مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ (٤) الَّذِي يُوَسْوِس فِي صُدُورِ النَّاسِ (٥) مِنَ الْجِنَّةِ وَالنَّاسِ (٦)", count: 1, note: "مرة واحدة", isQuran: true }
];
const specialZikr = { id: 'special_10', text: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.", count: 10, note: "10 مرات" };

const prayerOptions = [
    { id: 'fajr', title: 'صلاة الفجر', icon: 'fa-cloud-sun', color: 'primary' },
    { id: 'dhuhr', title: 'صلاة الظهر', icon: 'fa-sun', color: 'secondary' },
    { id: 'asr', title: 'صلاة العصر', icon: 'fa-cloud-sun-rain', color: 'primary' },
    { id: 'maghrib', title: 'صلاة المغرب', icon: 'fa-moon', color: 'secondary' },
    { id: 'isha', title: 'صلاة العشاء', icon: 'fa-star-and-crescent', color: 'primary' }
];

function AthkarAlSalah({ onBack }) {
    const { theme } = useTheme();
    const [currentPrayer, setCurrentPrayer] = useState(null);
    const [athkarList, setAthkarList] = useState([]);

    const openPrayer = (prayerId, titleText) => {
        let currentAthkarData = JSON.parse(JSON.stringify(baseAthkar));
        if (prayerId === 'fajr' || prayerId === 'maghrib') {
            const index = currentAthkarData.findIndex(z => z.id === 'tasbeeh_combo');
            if (index !== -1) currentAthkarData.splice(index, 0, specialZikr);
            currentAthkarData.forEach(z => {
                if (['ikhlas', 'falaq', 'naas'].includes(z.id)) {
                    z.count = 3;
                    z.note = "3 مرات";
                }
            });
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

    const isDark = !theme.bgColor || ['#000000', '#4c1d95', '#7c2d12', '#1e40af', '#1e1b4b', '#1c1917', '#0b0f19', '#3e2723', '#450a0a', '#064e3b', '#0f766e', '#155e75', '#581c87'].includes(theme.bgColor);

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
                        <h1 className="app-top-bar__title text-xl sm:text-2xl flex items-center gap-2 justify-center">
                            {currentPrayer ? currentPrayer.title : <><i className="fa-solid fa-mosque"></i> أذكار الصلوات</>}
                        </h1>
                    </div>
                    <p className="app-top-bar__subtitle">
                        {currentPrayer ? `أذكار ما بعد صلاة ${currentPrayer.title.split(' ')[2]}` : "تصفّح أذكار ما بعد الصلاة مع عدّاد تفاعلي وتنقل سهل بين الصلوات الخمس"}
                    </p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto hide-scrollbar relative max-w-md mx-auto w-full p-4 pb-24">
                {!currentPrayer ? (
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
                ) : (
                    <div id="athkarDetails" className="fade-in space-y-4">
                        {athkarList.map(zikr => {
                            const isFinished = zikr.currentCount === 0;
                            const textClass = zikr.isQuran ? 'font-amiri text-2xl text-center' : 'text-lg leading-loose font-medium';
                            
                            return (
                                <div key={zikr.id} className={`themed-card p-5 rounded-2xl shadow-sm border relative overflow-hidden group mb-4 transition-all duration-300 ${isFinished ? 'opacity-50' : ''}`} onClick={() => handleDecrement(zikr.id)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold shadow-sm" style={{backgroundColor: theme.palette[1]+'30', color: theme.palette[1]}}>{zikr.note}</span>
                                        <div className={`count-badge w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md transform transition-transform ${isFinished ? (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500') : 'bg-gradient-to-br from-primary to-green-600 text-white'}`}>
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

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default AthkarAlSalah;
