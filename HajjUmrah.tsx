
import React, { useState, useEffect, FC } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';


// FIX: Add explicit type for DuaaSection props to resolve key prop error
interface DuaaSectionProps {
    title: string;
    items: string[];
    isOpen: boolean;
    onToggle: () => void;
}

const DuaaSection: FC<DuaaSectionProps> = ({ title, items, isOpen, onToggle }) => (
    <div>
        <h4 onClick={onToggle} className="font-bold themed-text mb-1 cursor-pointer flex justify-between items-center">
            <span>{title}</span>
            <span className={`transform transition-transform themed-text-muted ${isOpen ? '' : 'rotate-[-90deg]'}`}>▼</span>
        </h4>
        {isOpen && (
             <ul className="list-disc pr-4 space-y-1.5 mt-2 themed-text">
                {items.map((item, index) => <li key={index} dangerouslySetInnerHTML={{ __html: item }}></li>)}
            </ul>
        )}
    </div>
);

function HajjUmrah({ onBack }) {
    const { theme } = useTheme();
    const [screen, setScreen] = useState('home');
    const [hajjType, setHajjType] = useState('tamattu');
    const [openDuaas, setOpenDuaas] = useState({});

    const toggleDuaa = (id) => {
        setOpenDuaas(prev => ({ ...prev, [id]: !prev[id] }));
    };
    
    // Auto-open first section in duaa screen
    useEffect(() => {
        if(screen === 'duaa') {
            setOpenDuaas({ 1: true });
        }
    }, [screen]);

    const renderScreen = () => {
        switch (screen) {
            case 'umrah': return <UmrahScreen theme={theme} />;
            case 'hajj': return <HajjScreen hajjType={hajjType} setHajjType={setHajjType} theme={theme} />;
            case 'duaa': return <DuaaScreen openDuaas={openDuaas} toggleDuaa={toggleDuaa} theme={theme} />;
            default: return <HomeScreen setScreen={setScreen} theme={theme} />;
        }
    };

    const handleBack = () => {
        if (screen !== 'home') {
            setScreen('home');
        } else {
            onBack();
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner gap-2">
                    <div className="relative flex items-center justify-center">
                         {screen !== 'home' && (
                            <button onClick={() => setScreen('home')} className="hidden sm:inline-flex absolute right-0 top-1/2 -translate-y-1/2 transform items-center gap-2 text-xs md:text-sm font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1 rounded-full transition shadow-md">
                                <span className="text-lg leading-none">◀</span>
                                <span>العودة</span>
                            </button>
                        )}
                        <h1 className="app-top-bar__title text-2xl md:text-3xl tracking-wide">الحج والعمرة</h1>
                    </div>
                    <p className="app-top-bar__subtitle">دليل مبسّط لمناسك الحج والعمرة مع خطوات وأذكار واضحة</p>
                </div>
            </header>

            <main className="w-full max-w-4xl mx-auto px-4 pt-4 flex-grow pb-24">
                {renderScreen()}
            </main>

            <BottomBar onHomeClick={handleBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

const HomeScreen = ({ setScreen, theme }) => (
     <section id="home-screen" className="space-y-4">
        <div className="themed-card rounded-2xl p-4 mb-3">
            <p className="text-xl md:text-2xl mb-1 text-center font-amiri" style={{color: theme.palette[1]}}>
                ﴿ وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلَّهِ ﴾
            </p>
            <p className="text-xs md:text-sm text-center themed-text-muted">البقرة: 196</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setScreen('umrah')} className="themed-card rounded-2xl px-4 py-5 text-right flex flex-col gap-2">
                <h2 className="text-lg md:text-xl font-bold mb-1">أداء العمرة</h2>
                <p className="text-sm themed-text-muted">خطوات عملية من الإحرام حتى الحلق أو التقصير مع الأركان والأدعية.</p>
            </button>
            <button onClick={() => setScreen('hajj')} className="themed-card rounded-2xl px-4 py-5 text-right flex flex-col gap-2">
                <h2 className="text-lg md:text-xl font-bold mb-1">أداء الحج</h2>
                <p className="text-sm themed-text-muted">تعرّف على أنواع الحج (التمتع، الإفراد، القران)، مع مخطط الأيام.</p>
            </button>
        </div>
        <div className="mt-5 themed-card rounded-2xl p-3 cursor-pointer" onClick={() => setScreen('duaa')}>
            <h3 className="font-bold mb-1">بعض الأدعية والأذكار</h3>
            <p className="leading-relaxed text-[0.8rem] mb-2 themed-text-muted">مجموعة منتقاة من الأدعية والأذكار التي يناسب قولها في الطواف والسعي والوقوف بعرفة.</p>
        </div>
    </section>
);

const UmrahScreen = ({ theme }) => (
     <section id="umrah-screen" className="space-y-4">
        <div className="themed-card rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-1">أداء العمرة</h2>
            <p className="text-sm themed-text-muted">العمرة زيارة لبيت الله الحرام على وجهٍ مخصوص مع الإحرام والطواف والسعي والحلق أو التقصير.</p>
        </div>
         <h3 className="text-sm md:text-base font-bold themed-text mt-3 mb-1">📌 خطوات أداء العمرة</h3>
        <div className="space-y-3 text-sm">
            {[
                { icon: '🧼', title: '1. الاستعداد للعمرة', points: ['الاغتسال والتنظف والتطيّب (قبل الإحرام).', 'قص الأظافر وتهذيب الشارب ونتف الإبط وحلق العانة.', 'يلبس الرجل إزارًا ورداءً أبيضين، والمرأة تلبس ما شاءت.'] },
                { icon: '🕊️', title: '2. الإحرام من الميقات', text: `عند الميقات ينوي بقلبه العمرة ويُسن التلفظ: <br/><span class="font-semibold" style="color: ${theme.palette[0]}">«لبيك اللهم عمرة»</span>.<br/> ثم يبدأ بالتلبية.` },
                { icon: '🕋', title: '4. طواف العمرة', points: ['يطوف سبعة أشواط مبتدئًا ومختتمًا بالحجر الأسود.', 'يُستحب الدعاء، وخاصة: <span class="font-semibold">«رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...»</span>'] },
                { icon: '⛰️', title: '6. السعي بين الصفا والمروة', text: `يتوجّه إلى الصفا، ويقرأ: <br/><span class="font-semibold font-amiri" style="color: ${theme.palette[0]}">﴿ إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ ﴾</span>.<br/> يسعى سبعة أشواط.` },
                { icon: '✂️', title: '7. الحلق أو التقصير', text: `يحلق الرجل رأسه أو يقصر، والحلق أفضل. والمرأة تقصر قدر أنملة. بذلك تنتهي العمرة.` }
            ].map((step, index) => (
                <div key={step.title} className={`themed-card rounded-2xl p-3 flex gap-3`}>
                    <div className="text-2xl">{step.icon}</div>
                    <div>
                        <h4 className="font-bold mb-0.5">{step.title}</h4>
                        {step.points ? (
                             <ul className="list-disc pr-4 text-xs themed-text-muted space-y-0.5">
                                {step.points.map((p, i) => <li key={i} dangerouslySetInnerHTML={{ __html: p }}></li>)}
                            </ul>
                        ) : (
                             <p className="text-xs themed-text-muted" dangerouslySetInnerHTML={{ __html: step.text }}></p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </section>
);

const HajjScreen = ({ hajjType, setHajjType, theme }) => (
     <section id="hajj-screen" className="space-y-4">
        <div className="themed-card rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-1">أداء الحج</h2>
            <p className="text-sm themed-text-muted">أنواع الحج: <span className="font-semibold">التمتع، الإفراد، القران</span>.</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 mb-1 text-xs">
            <button onClick={() => setHajjType('tamattu')} className={`px-3 py-1 rounded-full font-semibold shadow-md ${hajjType === 'tamattu' ? 'text-white' : 'themed-card'}`} style={{backgroundColor: hajjType === 'tamattu' ? theme.palette[1] : ''}}>🕋 حج التمتع</button>
            <button onClick={() => setHajjType('ifrad')} className={`px-3 py-1 rounded-full font-semibold shadow-md ${hajjType === 'ifrad' ? 'text-white' : 'themed-card'}`} style={{backgroundColor: hajjType === 'ifrad' ? theme.palette[1] : ''}}>🕋 حج الإفراد</button>
            <button onClick={() => setHajjType('qiran')} className={`px-3 py-1 rounded-full font-semibold shadow-md ${hajjType === 'qiran' ? 'text-white' : 'themed-card'}`} style={{backgroundColor: hajjType === 'qiran' ? theme.palette[1] : ''}}>🕋 حج القِران</button>
        </div>
        {hajjType === 'tamattu' && <div className="themed-card rounded-2xl p-3 text-xs themed-text-muted"><b>حج التمتع:</b> أن يعتمر في أشهر الحج ثم يتحلل، ثم يُحرم بالحج من مكة في اليوم الثامن. وهو الأيسر.</div>}
        {hajjType === 'ifrad' && <div className="themed-card rounded-2xl p-3 text-xs themed-text-muted"><b>حج الإفراد:</b> أن يُحرم بالحج وحده دون عمرة، فيقول عند الإحرام: «لبيك اللهم حجا».</div>}
        {hajjType === 'qiran' && <div className="themed-card rounded-2xl p-3 text-xs themed-text-muted"><b>حج القِران:</b> أن يجمع بين العمرة والحج في إحرام واحد، فيقول: «لبيك اللهم حجا وعمرة».</div>}
    </section>
);

const DuaaScreen = ({ openDuaas, toggleDuaa, theme }) => {
    const allDuaas = [
        { id: 1, title: '1: أذكار التوحيد والتكبير', items: ['«لا إله إلا الله وحده لا شريك له...»', '«الله أكبر، الله أكبر، لا إله إلا الله...»', '«سبحان الله، والحمد لله، ولا إله إلا الله...»'] },
        { id: 2, title: '2: أدعية في الطواف والسعي', items: ['«رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...»', '«اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ...»', '«اللَّهُمَّ إنِّي أَسْأَلُكَ رِضَاكَ وَالْجَنَّةَ...»'] },
        { id: 3, title: '3: أدعية يوم عرفة', items: ['«لا إله إلا الله وحده لا شريك له...» (أفضل الدعاء)', '«اللَّهُمَّ اجْعَلْنِي مِنْ عُتَقَاءِ هَذَا الْيَوْمِ...»', '«اللَّهُمَّ إنَّكَ عَفُوٌّ تُحِبُّ العَفْوَ فَاعْفُ عَنِّي»'] },
        { id: 4, title: '4: أدعية الاستغفار والتوبة', items: ['«أستغفرُ اللهَ العظيمَ الذي لا إلهَ إلا هو...»', '«سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ»'] },
        { id: 5, title: '5: أدعية للأهل والوالدين', items: ['«رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا»', '«رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ...»'] },
    ];
    return (
        <section id="duaa-screen" className="space-y-4">
             <div className="themed-card rounded-2xl p-4 leading-relaxed text-xs md:text-sm space-y-3">
                {allDuaas.map(section => (
                    <DuaaSection 
                        key={section.id}
                        title={section.title} 
                        items={section.items} 
                        isOpen={!!openDuaas[section.id]}
                        onToggle={() => toggleDuaa(section.id)}
                    />
                ))}
            </div>
        </section>
    );
};

export default HajjUmrah;
