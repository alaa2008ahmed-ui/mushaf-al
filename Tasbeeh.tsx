
import React, { useState, useEffect } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';

// --- Data & Constants ---
const LOCAL_STORAGE_KEY = 'ahmed_laila_tasbeeh_phrases';
const DEFAULT_PHRASES = [
    { id: 1, text: "سبحان الله" }, { id: 2, text: "الحمد لله" },
    { id: 3, text: "الله أكبر" }, { id: 4, text: "لا حول ولا قوة إلا بالله" },
    { id: 5, text: "أستغفر الله العظيم" }, { id: 6, text: "لا إله إلا أنت سبحانك إني كنت من الظالمين" },
    { id: 7, text: "سبحان الله وبحمده، سبحان ربي العظيم" }, { id: 8, text: "اللهم صل وسلم على نبينا محمد" }
];

// --- Helper Functions ---
const toArabicNumerals = (num) => {
    if (num === null || num === undefined) return '';
    return String(num).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
};
const toEnglishNumerals = (str) => {
    if (str === null || str === undefined) return '';
    const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
    return str.toString().replace(/[٠-٩]/g, m => map[m]);
};

const playSound = (freq = 880, dur = 0.05) => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + dur);
    } catch (e) { console.warn("Could not play sound", e); }
};

const vibrate = (pattern: number | number[] = 50) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
};

// --- Main Component ---
function Tasbeeh({ onBack }) {
    const { theme } = useTheme();
    const [phrases, setPhrases] = useState(DEFAULT_PHRASES);
    const [count, setCount] = useState(0);
    const [target, setTarget] = useState(33);
    const [activePhrase, setActivePhrase] = useState(DEFAULT_PHRASES[0].text);
    const [isCountingStopped, setIsCountingStopped] = useState(false);
    const [modals, setModals] = useState({ target: false, phrase: false, add: false, delete: false });
    const [message, setMessage] = useState({ text: '', type: '', visible: false });

    useEffect(() => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const userChanges = JSON.parse(stored);
                let currentPhrases = [...DEFAULT_PHRASES];
                userChanges.forEach(change => {
                    if (change.deleted) {
                        currentPhrases = currentPhrases.filter(p => p.text !== change.text);
                    } else if (!currentPhrases.some(p => p.text === change.text)) {
                        currentPhrases.push({ id: Date.now() + Math.random(), text: change.text });
                    }
                });
                setPhrases(currentPhrases);
                if (!currentPhrases.some(p => p.text === activePhrase)) {
                    setActivePhrase(currentPhrases.length > 0 ? currentPhrases[0].text : '');
                }
            } else {
                 setPhrases(DEFAULT_PHRASES);
                 setActivePhrase(DEFAULT_PHRASES[0].text);
            }
        } catch (e) {
            setPhrases(DEFAULT_PHRASES);
        }
    }, []);

    const showMessage = (text, type = 'green') => {
        setMessage({ text, type, visible: true });
        setTimeout(() => setMessage({ text: '', type: '', visible: false }), 2000);
    };

    const handleIncrement = () => {
        if (isCountingStopped) {
            handleReset();
            return;
        }
        playSound();
        const newCount = count + 1;
        if (target > 0 && newCount >= target) {
            setCount(target);
            setIsCountingStopped(true);
            vibrate([100, 50, 100]);
            playSound(660, 0.2);
            showMessage('تم الوصول للهدف!');
        } else {
            setCount(newCount);
        }
    };
    
    const handleReset = () => {
        setCount(0);
        setIsCountingStopped(false);
    };

    const handleSetTarget = (newTargetValue) => {
        const num = parseInt(toEnglishNumerals(newTargetValue), 10);
        setTarget(isNaN(num) || num < 0 ? 0 : num);
        handleReset();
        setModals(prev => ({ ...prev, target: false }));
    };
    
    const handleSelectPhrase = (phrase) => {
        setActivePhrase(phrase);
        handleReset();
        setModals(prev => ({ ...prev, phrase: false }));
    };

    const handleAddPhrase = (newPhraseText) => {
        const trimmed = newPhraseText.trim();
        if (!trimmed) { showMessage('لا يمكن إضافة ذكر فارغ.', 'red'); return; }
        if (phrases.some(p => p.text === trimmed)) { showMessage('هذا الذكر موجود بالفعل.', 'red'); return; }
        
        const newPhrases = [...phrases, { id: Date.now(), text: trimmed }];
        setPhrases(newPhrases);
        saveChanges(newPhrases);
        handleSelectPhrase(trimmed);
        setModals(prev => ({ ...prev, add: false }));
        showMessage('تم إضافة الذكر بنجاح.');
    };
    
    const handleDeletePhrase = (phraseText) => {
        const newPhrases = phrases.filter(p => p.text !== phraseText);
        setPhrases(newPhrases);
        saveChanges(newPhrases);

        if (activePhrase === phraseText) {
            const nextPhrase = newPhrases.length > 0 ? newPhrases[0].text : DEFAULT_PHRASES[0].text;
            handleSelectPhrase(nextPhrase);
        }
        showMessage('تم حذف الذكر بنجاح.');
    };
    
    const saveChanges = (currentPhrases) => {
        try {
            const deletedDefaults = DEFAULT_PHRASES.filter(dp => !currentPhrases.some(cp => cp.text === dp.text)).map(p => ({ text: p.text, deleted: true }));
            const addedUserPhrases = currentPhrases.filter(cp => !DEFAULT_PHRASES.some(dp => dp.text === cp.text));
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...deletedDefaults, ...addedUserPhrases]));
        } catch (e) { console.error("Failed to save tasbeeh phrases", e); }
    };
    
    const CounterButton = () => {
        const isCompleted = isCountingStopped && target > 0;
        return (
            <button onClick={handleIncrement} className={`w-60 h-60 rounded-full flex flex-col items-center justify-center transition-all duration-150 ease-out cursor-pointer select-none relative z-10 active:scale-95 shadow-lg`}>
                <span className="text-8xl font-mono font-extrabold" style={{ fontFamily: 'Amiri', textShadow: '0 2px 4px rgba(0,0,0,0.1)', color: theme.textColor }}>
                    {toArabicNumerals(count)}
                </span>
                <span className="text-lg font-bold mt-2" style={{color: theme.textColor, opacity: 0.8}}>
                    {isCompleted ? 'اضغط للتصفير' : 'اضغط للعد'}
                </span>
            </button>
        );
    };

    return (
        <div className="h-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-2xl">السبحة الإلكترونية</h1>
                    <p className="app-top-bar__subtitle">اختر الأذكار بسهولة مع تجربة غنية بالاهتزاز والصوت</p>
                </div>
            </header>
            
            <main className="p-4 flex-grow relative flex flex-col items-center overflow-y-auto pb-24">
                 <div className="w-full max-w-lg mt-2 space-y-3 mb-2">
                    <div className="rounded-xl themed-card p-2">
                        <button onClick={() => setModals(p => ({...p, phrase: true}))} className="w-full py-3 px-4 rounded-xl flex justify-between items-center text-lg font-bold transition themed-bg-alt hover:opacity-80">
                            <span className="text-sm flex-shrink-0 ml-2" style={{color: theme.palette[1]}}>الذكر الحالي:</span>
                            <span className="flex-grow text-xl font-extrabold text-center font-amiri truncate">{activePhrase}</span>
                            <svg className="h-5 w-5 mr-2 flex-shrink-0" style={{color: theme.palette[1]}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                 </div>

                 <div className="flex-grow flex flex-col items-center justify-center w-full max-w-lg space-y-4 py-2">
                    <div className="text-center px-6 py-3 rounded-2xl themed-card w-full max-w-xs">
                        <span className="block text-sm font-bold mb-1" style={{color: theme.palette[1]}}>{isCountingStopped && target > 0 ? 'تم الوصول للهدف! 🎉' : 'الهدف:'}</span>
                        <span className="text-3xl font-extrabold font-amiri" style={{color: theme.palette[0]}}>{toArabicNumerals(target > 0 ? target : 'مفتوح')}</span>
                    </div>
                    <CounterButton />
                </div>
                
                <div className="w-full max-w-lg px-4 mt-auto mb-2">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleReset} className="py-3 px-4 font-bold rounded-full text-white" style={{backgroundColor: theme.palette[0]}}>تصفير</button>
                        <button onClick={() => setModals(p => ({...p, target: true}))} className="py-3 px-4 font-bold rounded-full themed-card">تعديل</button>
                    </div>
                </div>
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

// --- Modals are not included as they were not changed ---
const ModalWrapper = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
        <div className="p-6 rounded-2xl w-full max-w-xs space-y-4 themed-card" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);


export default Tasbeeh;
