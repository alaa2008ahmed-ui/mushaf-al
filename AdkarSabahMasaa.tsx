
import React, { useState } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';

const BASE_ADHKAR_MORNING = [
    { text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 1, source: "من أذكار الصباح المأثورة" },
    { text: "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.", count: 1, source: "من أذكار الصباح المأثورة" },
    { text: "اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.", count: 1, source: "من أذكار الصباح المأثورة" },
    { text: "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.", count: 1, source: "من أذكار الصباح المأثورة" },
    { text: "أعوذ بكلمات الله التامات من شر ما خلق.", count: 3, source: "من أذكار الصباح المأثورة" },
    { text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً.", count: 3, source: "من أذكار الصباح المأثورة" },
    { text: "سبحان الله وبحمده عدد خلقه ورضا نفسه وزنة عرشه ومداد كلماته.", count: 3, source: "من أذكار الصباح المأثورة" },
    { text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.", count: 3, source: "من أذكار الصباح المأثورة" },
    { text: "اللهم إني أصبحت أشهدك وأشهد حملة عرشك وملائكتك وجميع خلقك أنك أنت الله لا إله إلا أنت وحدك لا شريك لك وأن محمداً عبدك ورسولك.", count: 4, source: "من أذكار الصباح المأثورة" },
    { text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", count: 7, source: "من أذكار الصباح المأثورة" },
    { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد يحيي ويميت وهو على كل شيء قدير.", count: 10, source: "من أذكار الصباح المأثورة" },
    { text: "سبحان الله وبحمده.", count: 100, source: "من أذكار الصباح المأثورة" },
    { text: "أستغفر الله وأتوب إليه.", count: 100, source: "من أذكار الصباح المأثورة" },
    { text: "اللهم صل وسلم على نبينا محمد.", count: 10, source: "من أذكار الصباح المأثورة" },
    { text: "آية الكرسي: (اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ...)", count: 1, source: "من أذكار الصباح (آية الكرسي)" },
    { text: "سورة الإخلاص، وسورة الفلق، وسورة الناس.", count: 3, source: "من أذكار الصباح (المعوذات)" }
];

const BASE_ADHKAR_EVENING = [
    { text: "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 1, source: "من أذكار المساء المأثورة" },
    { text: "اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.", count: 1, source: "من أذكار المساء المأثورة" },
    { text: "اللهم ما أمسى بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.", count: 1, source: "من أذكار المساء المأثورة" },
    { text: "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.", count: 1, source: "من أذكار المساء المأثورة" },
    { text: "أعوذ بكلمات الله التامات من شر ما خلق.", count: 3, source: "من أذكار المساء المأثورة" },
    { text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً.", count: 3, source: "من أذكار المساء المأثورة" },
    { text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.", count: 3, source: "من أذكار المساء المأثورة" },
    { text: "اللهم إني أمسيت أشهدك وأشهد حملة عرشك وملائكتك وجميع خلقك أنك أنت الله لا إله إلا أنت وحدك لا شريك له وأن محمداً عبدك ورسولك.", count: 4, source: "من أذكار المساء المأثورة" },
    { text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", count: 7, source: "من أذكار المساء المأثورة" },
    { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد يحيي ويميت وهو على كل شيء قدير.", count: 10, source: "من أذكار المساء المأثورة" },
    { text: "سبحان الله وبحمده.", count: 100, source: "من أذكار المساء المأثورة" },
    { text: "أستغفر الله وأتوب إليه.", count: 100, source: "من أذكار المساء المأثورة" },
    { text: "اللهم صل وسلم على نبينا محمد.", count: 10, source: "من أذكار المساء المأثورة" },
    { text: "آية الكرسي: (اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ...)", count: 1, source: "من أذكار المساء (آية الكرسي)" },
    { text: "سورة الإخلاص، وسورة الفلق، وسورة الناس.", count: 3, source: "من أذكار المساء (المعوذات)" }
];

const toArabicNumerals = (num) => String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

function AdkarSabahMasaa({ onBack }) {
    const { theme } = useTheme();
    const [adhkarTab, setAdhkarTab] = useState('morning');
    
    const currentAdhkar = adhkarTab === 'morning' ? BASE_ADHKAR_MORNING : BASE_ADHKAR_EVENING;

    return (
        <div className="h-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-2xl font-kufi">أذكار الصباح والمساء</h1>
                    <p className="app-top-bar__subtitle">تابع أذكـارك اليومية مع عداد دقيق وتصنيفات واضحة لكل وقت</p>
                </div>
            </header>

            <main className="w-full flex-1 flex flex-col items-center overflow-hidden p-4 pb-24">
                <div className="w-full max-w-lg flex p-1 rounded-xl themed-bg-alt mb-4 text-sm shadow-inner">
                    <button onClick={() => setAdhkarTab('morning')} className={`flex-1 py-2 sm:py-3 px-1 text-center rounded-lg font-bold transition-all ${adhkarTab === 'morning' ? `shadow-md text-white` : 'themed-text-muted'}`} style={{backgroundColor: adhkarTab === 'morning' ? theme.palette[0] : ''}}>أذكار الصباح</button>
                    <button onClick={() => setAdhkarTab('evening')} className={`flex-1 py-2 sm:py-3 px-1 text-center rounded-lg font-bold transition-all ${adhkarTab === 'evening' ? `shadow-md text-white` : 'themed-text-muted'}`} style={{backgroundColor: adhkarTab === 'evening' ? theme.palette[0] : ''}}>أذكار المساء</button>
                </div>
                <div className="w-full max-w-lg flex-1 overflow-y-auto hide-scrollbar pb-6 space-y-3">
                    {currentAdhkar.map((dhikr, index) => (
                        <div key={index} className="p-3 rounded-xl themed-card transition duration-300 shadow-sm" style={{fontFamily: theme.font}}>
                            <p className="text-lg leading-relaxed text-center font-amiri">
                                {dhikr.text}
                                {dhikr.count > 1 ? ` (${toArabicNumerals(dhikr.count)} مرات)` : ''}
                            </p>
                            {dhikr.source && <p className="text-xs mt-1 themed-text-muted text-center opacity-80 font-cairo">{dhikr.source}</p>}
                        </div>
                    ))}
                </div>
            </main>
            
            {/* FIX: Add missing onThemesClick prop */}
            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default AdkarSabahMasaa;