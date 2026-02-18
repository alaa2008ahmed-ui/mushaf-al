
import React from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';

const STATIC_DUAA = [
    { text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", source: "القرآن الكريم: سورة البقرة، آية 201" },
    { text: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ", source: "القرآن الكريم: سورة البقرة، آية 127" },
    { text: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ", source: "القرآن الكريم: سورة آل عمران، آية 147" },
    { text: "رَبَّنَا آمَنَّا بِمَا أَنزَلْتَ وَاتَّبَعْنَا الرَّسُولَ فَاكْتُبْنَا مَعَ الشَّاهِدِينَ", source: "القرآن الكريم: سورة آل عمران، آية 53" },
    { text: "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ", source: "القرآن الكريم: سورة الحشر، آية 10" },
    { text: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنكَ رَحْمَةً", source: "القرآن الكريم: سورة آل عمران، آية 8" },
    { text: "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ", source: "القرآن الكريم: سورة إبراهيم، آية 41" },
    { text: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ", source: "القرآن الكريم: سورة إبراهيم، آية 40" },
    { text: "اللهم ارحم أمي وأبي واغفر لهما وأدخلهما الجنة بغير حساب", source: "دعاء مشروع بالرحمة للوالدين" },
    { text: "اللهم اجعل قبرهما روضة من رياض الجنة ولا تجعله حفرة من حفر النار", source: "دعاء مشروع للوالدين" },
    { text: "اللهم اغفر لحيّنا وميّتنا وشاهدنا وغائبنا وصغيرنا وكبيرنا وذكرنا وأنثانا", source: "من جوامع الدعاء في السنة" },
    { text: "اللهم إنا نسألك الهدى والتقى والعفاف والغنى", source: "من السنة النبوية" },
    { text: "اللهم يا مقلب القلوب ثبت قلوبنا على دينك", source: "من السنة النبوية" },
    { text: "اللهم آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار", source: "القرآن الكريم: البقرة 201، وثبتت في السنة" },
    { text: "اللهم إني أسألك من الخير كله عاجله وآجله ما علمت منه وما لم أعلم", source: "من السنة النبوية" },
    { text: "اللهم إني أعوذ بك من الشر كله عاجله وآجله ما علمت منه وما لم أعلم", source: "من السنة النبوية" },
    { text: "اللهم إني أسألك الجنة وما قرب إليها من قول أو عمل", source: "من السنة النبوية" },
    { text: "اللهم إني أعوذ بك من النار وما قرب إليها من قول أو عمل", source: "من السنة النبوية" },
];

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
                    {STATIC_DUAA.map((duaa, index) => (
                        <div key={index} className="p-4 rounded-xl themed-card transition-all" style={{ fontFamily: theme.font }}>
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

            {/* FIX: Add missing onThemesClick prop */}
            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default Adia;