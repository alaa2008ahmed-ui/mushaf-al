
import React, { useState } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';

// --- Data ---
const hesnDoors = [
    { id: 'waking-up', title: 'أذكار الاستيقاظ من النوم', description: 'ما يُقال عند الاستيقاظ.', items: [{ type: 'hadith', text: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا، وَإِلَيْهِ النُّشُورُ.', source: 'البخاري' }] },
    { id: 'dress', title: 'دعاء لبس الثوب', description: 'ما يُقال عند ارتداء الثوب.', items: [{ type: 'duaa', text: 'الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا (الثَّوْبَ) وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ.', source: 'أصحاب السنن' }] },
    { id: 'bathroom', title: 'دخول الخلاء والخروج منه', description: 'أذكار دخول الخلاء والخروج.', items: [{ type: 'duaa', title: 'عند الدخول', text: '(بِسْمِ اللَّهِ) اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ.', source: 'متفق عليه' }, { type: 'duaa', title: 'بعد الخروج', text: 'غُفْرَانَكَ.', source: 'أصحاب السنن' }] },
    { id: 'wudu', title: 'الذكر بعد الوضوء', description: 'ما يُقال بعد إتمام الوضوء.', items: [{ type: 'duaa', text: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.', source: 'مسلم' }] },
    { id: 'home', title: 'دخول وخروج المنزل', description: 'ما يُقال عند دخول البيت ومغادرته.', items: [{ type: 'duaa', title: 'عند الخروج', text: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.', source: 'أبو داود' }] },
    { id: 'masjid', title: 'الذهاب للمسجد ودخوله والخروج', description: 'أذكار المسجد.', items: [{ type: 'duaa', title: 'عند دخول المسجد', text: '...اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ.', source: 'مسلم' }] },
    { id: 'adhan', title: 'أذكار الأذان', description: 'ما يُقال عند سماع الأذان وبعده.', items: [{ type: 'duaa', title: 'بعد الأذان', text: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ...', source: 'البخاري' }] },
    { id: 'istiftah', title: 'دعاء الاستفتاح في الصلاة', description: 'ما يُقال في بداية الصلاة.', items: [{ type: 'duaa', text: 'اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ كَمَا بَاعَدْتَ بَيْنَ الْمَشْرِقِ وَالْمَغْرِبِ...', source: 'متفق عليه' }] },
    { id: 'morning-evening', title: 'أذكار الصباح والمساء', description: 'أذكار تُقال في الصباح والمساء.', items: [{ type: 'ayah', title: 'آية الكرسي', text: 'اللّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ...', source: 'البقرة: 255' }, { type: 'duaa', title: 'سيد الاستغفار', text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ...', source: 'البخاري' }] },
    { id: 'sleep', title: 'أذكار النوم', description: 'أذكار تُقال عند النوم.', items: [{ type: 'duaa', text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ...', source: 'متفق عليه' }] },
    { id: 'quran', title: 'فضل قراءة القرآن', description: 'فضل تلاوة القرآن الكريم.', items: [{ type: 'hadith', text: '«اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ»', source: 'مسلم' }] },
    { id: 'food', title: 'أذكار الطعام والشراب', description: 'ما يُقال قبل وبعد الأكل.', items: [{ type: 'duaa', title: 'قبل الأكل', text: 'بِسْمِ اللَّهِ، فَإِنْ نَسِيَ فِي أَوَّلِهِ فَلْيَقُلْ: بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ.', source: 'أبو داود' }, { type: 'duaa', title: 'بعد الأكل', text: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ، مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', source: 'أصحاب السنن' }] },
    { id: 'travel', title: 'دعاء السفر', description: 'ما يقوله المسافر.', items: [{ type: 'duaa', text: 'اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، {سُبْحانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ * وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ}', source: 'مسلم' }] },
    { id: 'sick', title: 'دعاء زيارة المريض', description: 'ما يُقال عند زيارة المريض.', items: [{ type: 'duaa', text: 'لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ.', source: 'البخاري' }] },
    { id: 'rain', title: 'دعاء نزول المطر', description: 'ما يُقال عند رؤية المطر.', items: [{ type: 'duaa', text: 'اللَّهُمَّ صَيِّبًا نَافِعًا.', source: 'البخاري' }] },
    { id: 'istikhara', title: 'دعاء صلاة الاستخارة', description: 'دعاء لمن يريد أن يستخير الله.', items: [{ type: 'duaa', text: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ...', source: 'البخاري' }] },
    { id: 'grief', title: 'دعاء الهم والحزن', description: 'ما يُقال عند الشعور بالهم.', items: [{ type: 'duaa', text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ...', source: 'البخاري' }] },
    { id: 'anguish', title: 'دعاء الكرب', description: 'ما يُقال عند الكرب الشديد.', items: [{ type: 'duaa', text: 'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ...', source: 'متفق عليه' }] },
    { id: 'anger', title: 'دعاء الغضب', description: 'ما يُقال لتهدئة الغضب.', items: [{ type: 'duaa', text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ.', source: 'متفق عليه' }] },
    { id: 'graves', title: 'دعاء زيارة القبور', description: 'ما يُقال عند زيارة المقابر.', items: [{ type: 'duaa', text: 'السَّلَامُ عَلَيْكُمْ أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ، وَإِنَّا إِنْ شَاءَ اللَّهُ بِكُمْ لَاحِقُونَ...', source: 'مسلم' }] },
    { id: 'merit_dhikr', title: 'فضل الذكر', description: 'فضل ذكر الله عز وجل.', items: [{ type: 'hadith', text: '«مَثَلُ الَّذِي يَذْكُرُ رَبَّهُ وَالَّذِي لَا يَذْكُرُ رَبَّهُ، مَثَلُ الْحَيِّ وَالْمَيِّتِ»', source: 'البخاري' }] },
    { id: 'merit_tasbeeh', title: 'فضل التسبيح والتحميد', description: 'فضل بعض الأذكار.', items: [{ type: 'hadith', text: '«كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ»', source: 'متفق عليه' }] },
    { id: 'merit_duaa', title: 'فضل الدعاء', description: 'فضل سؤال الله وطلبه.', items: [{ type: 'hadith', text: '«الدُّعَاءُ هُوَ العِبَادَةُ»', source: 'الترمذي' }] },
    { id: 'merit_istighfar', title: 'فضل الاستغفار', description: 'فضل طلب المغفرة من الله.', items: [{ type: 'hadith', text: '«وَاللَّهِ إِنِّي لَأَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ فِي الْيَوْمِ أَكْثَرَ مِنْ سَبْعِينَ مَرَّةً»', source: 'البخاري' }] },
    { id: 'merit_salah_nabi', title: 'فضل الصلاة على النبي', description: 'فضل الصلاة على النبي محمد ﷺ.', items: [{ type: 'hadith', text: '«مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا»', source: 'مسلم' }] },
];


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
