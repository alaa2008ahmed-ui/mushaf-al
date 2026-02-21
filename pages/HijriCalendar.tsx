import React, { useState, useEffect } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { gregorianMonths, hijriMonths } from '../data/calendarData';

const ARABIC_TO_ENGLISH_NUMERALS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

// --- Helper Functions ---
// FIX: Correctly convert digits to numbers for array indexing.
function toArabicNumerals(num) {
    if (num === null || num === undefined) return '';
    return String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function toEnglishNumerals(str) {
    if (str === null || str === undefined) return '';
    let result = str.toString();
    for (const [arabic, english] of Object.entries(ARABIC_TO_ENGLISH_NUMERALS)) {
        result = result.split(arabic).join(english);
    }
    return result;
}

function gregorianToHijri(year, month, day) {
    const parsedYear = parseInt(toEnglishNumerals(year), 10);
    const parsedMonth = parseInt(month, 10);
    const parsedDay = parseInt(toEnglishNumerals(day), 10);
    if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedDay) || parsedYear < 622) return 'تاريخ غير صالح';
    try {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        date.setHours(12, 0, 0, 0);
        return new Intl.DateTimeFormat('ar-SA-islamic', {
            day: 'numeric', month: 'long', year: 'numeric', calendar: 'islamic-umalqura', timeZone: 'Asia/Riyadh'
        }).format(date).replace(/هـ/, '').trim() + ' هـ';
    } catch (e) { return 'خطأ في التحويل'; }
}

function hijriToGregorian(hy, hm, hd) {
    const targetHy = parseInt(toEnglishNumerals(hy), 10);
    const targetHm = parseInt(hm, 10);
    const targetHd = parseInt(toEnglishNumerals(hd), 10);
    if (isNaN(targetHy) || isNaN(targetHm) || isNaN(targetHd) || targetHy < 1) return 'تاريخ هجري غير صالح';
    
    try {
         const estimatedGy = Math.floor(targetHy * 0.97 + 620);
         const searchStartDate = new Date(estimatedGy, 0, 1);
         searchStartDate.setHours(12, 0, 0, 0);
         
         const testFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', calendar: 'islamic-umalqura', timeZone: 'UTC' });
         
         for (let i = 0; i < 2000; i++) { 
            const tempDate = new Date(searchStartDate);
            tempDate.setDate(tempDate.getDate() + i);
            tempDate.setHours(12, 0, 0, 0);
            
            try {
                const parts = testFormatter.formatToParts(tempDate).filter(p => p.type !== 'literal');
                const hYear = parseInt(parts.find(p => p.type === 'year')?.value, 10);
                const hMonth = parseInt(parts.find(p => p.type === 'month')?.value, 10);
                const hDay = parseInt(parts.find(p => p.type === 'day')?.value, 10);

                if (hYear === targetHy && hMonth === targetHm && hDay === targetHd) {
                    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(tempDate).replace(/,/g, '').trim() + ' م';
                }
            } catch(e) { continue; }
         }
        return 'لم يتم العثور على التاريخ المقابل';
    } catch (e) { return 'خطأ في التحويل'; }
}


// --- Component ---
function HijriCalendar({ onBack }) {
    const { theme } = useTheme();
    
    const [activeTab, setActiveTab] = useState('hijriToGregorian');
    const [result, setResult] = useState('');
    const [message, setMessage] = useState('أدخل التاريخ الهجري للتحويل');
    
    const [currentDates, setCurrentDates] = useState({
        gregorian: { dayOfWeek: '', day: 1, month: '', year: 2024, monthId: 1 },
        hijri: { day: 1, month: '', year: 1445, monthId: 1 }
    });

    const [inputs, setInputs] = useState({
        gDay: 1, gMonth: 1, gYear: '2024',
        hDay: 1, hMonth: 1, hYear: '1445'
    });

    const [historicalEvent, setHistoricalEvent] = useState(null);

    const historicalEvents = [
        {
            title: "غزوة بدر الكبرى",
            hijriYear: "2 هـ",
            gregorianYear: "624 م",
            description: "أول معركة فاصلة في تاريخ الإسلام بين المسلمين بقيادة النبي ﷺ وقريش، انتهت بنصر مؤزر للمسلمين."
        },
        {
            title: "فتح مكة",
            hijriYear: "8 هـ",
            gregorianYear: "630 م",
            description: "دخول النبي ﷺ مكة فاتحاً دون قتال، وتحطيم الأصنام حول الكعبة، وإعلان العفو العام عن أهلها."
        },
        {
            title: "معركة القادسية",
            hijriYear: "15 هـ",
            gregorianYear: "636 م",
            description: "معركة كبرى بين المسلمين بقيادة سعد بن أبي وقاص والفرس، فتحت الطريق لانتشار الإسلام في بلاد فارس."
        },
        {
            title: "فتح الأندلس",
            hijriYear: "92 هـ",
            gregorianYear: "711 م",
            description: "بدء الفتح الإسلامي لشبه الجزيرة الأيبيرية بقيادة طارق بن زياد وموسى بن نصير، وبداية حضارة إسلامية دامت قروناً."
        },
        {
            title: "معركة حطين",
            hijriYear: "583 هـ",
            gregorianYear: "1187 م",
            description: "انتصار حاسم للمسلمين بقيادة صلاح الدين الأيوبي على الصليبيين، مما مهد الطريق لاستعادة بيت المقدس."
        },
        {
            title: "فتح القسطنطينية",
            hijriYear: "857 هـ",
            gregorianYear: "1453 م",
            description: "فتح المدينة العريقة على يد السلطان العثماني محمد الفاتح، وتحقيق بشارة النبي ﷺ."
        },
        {
            title: "معركة عين جالوت",
            hijriYear: "658 هـ",
            gregorianYear: "1260 م",
            description: "انتصار المسلمين بقيادة سيف الدين قطز والظاهر بيبرس على المغول، وحماية العالم الإسلامي من خطرهم."
        }
    ];

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * historicalEvents.length);
        setHistoricalEvent(historicalEvents[randomIndex]);
        
        const date = new Date();
        const locale = 'ar-SA';
        const gDayOfWeek = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
        const gDay = date.getDate();
        const gMonthId = date.getMonth() + 1;
        const gMonth = gregorianMonths.find(m => m.id === gMonthId)?.name || '';
        const gYear = date.getFullYear();

        let hDay = 1, hMonthId = 1, hYear = 1446;
        try {
             const hijriParts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date).filter(p => p.type !== 'literal');
             hYear = parseInt(hijriParts.find(p => p.type === 'year')?.value, 10);
             hMonthId = parseInt(hijriParts.find(p => p.type === 'month')?.value, 10);
             hDay = parseInt(hijriParts.find(p => p.type === 'day')?.value, 10);
        } catch (e) { console.warn("Could not get Hijri date automatically.", e); }
        
        const hMonthName = hijriMonths.find(m => m.id === hMonthId)?.name || '';
        
        const newDates = {
            gregorian: { dayOfWeek: gDayOfWeek, day: gDay, month: gMonth, year: gYear, monthId: gMonthId },
            hijri: { day: hDay, month: hMonthName, year: hYear, monthId: hMonthId }
        };

        setCurrentDates(newDates);
        setInputs({
            gDay: newDates.gregorian.day, gMonth: newDates.gregorian.monthId, gYear: String(newDates.gregorian.year),
            hDay: newDates.hijri.day, hMonth: newDates.hijri.monthId, hYear: String(newDates.hijri.year)
        });

    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setResult('');
        setMessage(tab === 'gregorianToHijri' ? 'أدخل التاريخ الميلادي للتحويل' : 'أدخل التاريخ الهجري للتحويل');
    };

    const handleInputChange = (key, value) => {
        setInputs(prev => ({ ...prev, [key]: value.replace(/[^0-9٠-٩]/g, '') }));
    };

    const handleSelectChange = (key, value) => {
        setInputs(prev => ({ ...prev, [key]: parseInt(value, 10) }));
    };

    const handleConversion = () => {
        let convResult = '', convMsg = '';
        if (activeTab === 'gregorianToHijri') {
            convResult = gregorianToHijri(inputs.gYear, inputs.gMonth, inputs.gDay);
            convMsg = 'النتيجة (تقويم أم القرى):';
        } else {
            convResult = hijriToGregorian(inputs.hYear, inputs.hMonth, inputs.hDay);
            convMsg = 'النتيجة (الموافق ميلادي):';
        }
        if (convResult.includes('خطأ') || convResult.includes('صالح') || convResult.includes('العثور')) {
            convMsg = '⚠️ تنبيه:';
        }
        setResult(convResult);
        setMessage(convMsg);
    };
    
    const renderSelect = (value, options, key) => {
        return (
            <div className="relative flex-1">
                <select 
                    value={value} 
                    onChange={(e) => handleSelectChange(key, e.target.value)}
                    className="w-full appearance-none px-2 py-3 rounded-xl text-center font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 themed-card"
                >
                   {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
        );
    };

    const renderYearInput = (value, key, placeholder) => {
        return (
             <div className="relative flex-1">
                <input 
                    type="text" 
                    value={toArabicNumerals(value)} 
                    onInput={(e) => handleInputChange(key, (e.target as HTMLInputElement).value)} 
                    inputMode="numeric" 
                    placeholder={toArabicNumerals(placeholder)} 
                    className="w-full px-3 py-3 rounded-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 themed-card" 
                    maxLength={4}
                />
            </div>
        );
    };
    
    const gDays = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: toArabicNumerals(i + 1) }));
    const hDays = Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: toArabicNumerals(i + 1) }));
    const gMonthsOpts = gregorianMonths.map(m => ({ value: m.id, label: m.name }));
    const hMonthsOpts = hijriMonths.map(m => ({ value: m.id, label: m.name }));

    return (
        <div className={`h-screen flex flex-col`}>
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-xl sm:text-2xl font-kufi">التقويم الهجري الذكي</h1>
                    <p className="app-top-bar__subtitle">حوّل بين التاريخين الهجري والميلادي بسرعة مع عرض يومي دقيق</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-2 flex flex-col items-center pb-24">
                 <div className={`w-full max-w-lg p-3 sm:p-4 rounded-2xl themed-card text-center mb-4 shrink-0`}>
                    <p className={`text-xs themed-text-muted mb-1`}>تاريخ اليوم:</p>
                    <p className={`text-base sm:text-lg font-extrabold mb-1`} style={{color: theme.palette[0]}}>
                        {currentDates.gregorian.dayOfWeek}، {toArabicNumerals(currentDates.gregorian.day)} {currentDates.gregorian.month} {toArabicNumerals(currentDates.gregorian.year)}
                    </p>
                    <div className="border-t themed-text-muted/30 my-2"></div>
                    <p className={`text-xl sm:text-2xl font-extrabold`} style={{color: theme.palette[1]}}>
                        {toArabicNumerals(currentDates.hijri.day)} {currentDates.hijri.month} {toArabicNumerals(currentDates.hijri.year)} هـ
                    </p>
                </div>
                
                <div className={`w-full max-w-lg flex p-1 rounded-xl themed-bg-alt mb-4 text-sm shrink-0`}>
                    <button onClick={() => handleTabChange('hijriToGregorian')} className={`flex-1 py-2 sm:py-3 px-1 text-center rounded-lg font-bold transition-all ${activeTab === 'hijriToGregorian' ? `shadow-md text-white` : `themed-text-muted`}`} style={activeTab === 'hijriToGregorian' ? {backgroundColor: theme.palette[1]} : {}}>هجري إلى ميلادي</button>
                    <button onClick={() => handleTabChange('gregorianToHijri')} className={`flex-1 py-2 sm:py-3 px-1 text-center rounded-lg font-bold transition-all ${activeTab === 'gregorianToHijri' ? `shadow-md text-white` : `themed-text-muted`}`} style={activeTab === 'gregorianToHijri' ? {backgroundColor: theme.palette[1]} : {}}>ميلادي إلى هجري</button>
                </div>

                <div className="w-full max-w-lg flex flex-col justify-start">
                    <div className="space-y-3 sm:space-y-4">
                        {activeTab === 'gregorianToHijri' ? (
                            <div className="flex gap-2 input-section">
                                {renderSelect(inputs.gDay, gDays, 'gDay')}
                                {renderSelect(inputs.gMonth, gMonthsOpts, 'gMonth')}
                                {renderYearInput(inputs.gYear, 'gYear', currentDates.gregorian.year)}
                            </div>
                        ) : (
                            <div className="flex gap-2 input-section">
                                {renderSelect(inputs.hDay, hDays, 'hDay')}
                                {renderSelect(inputs.hMonth, hMonthsOpts, 'hMonth')}
                                {renderYearInput(inputs.hYear, 'hYear', currentDates.hijri.year)}
                            </div>
                        )}
                        <div className="pt-1">
                            <button onClick={handleConversion} className="w-full rounded-full font-extrabold cursor-pointer transform active:translate-y-1 active:shadow-none focus:outline-none overflow-hidden py-3 px-4 text-lg" style={{ background: `linear-gradient(to top, ${theme.palette[0]} 0%, ${theme.palette[1]} 100%)`, color: '#FFF', boxShadow: `0 4px 0 0 ${theme.palette[0]}CC, 0 8px 15px rgba(0,0,0,0.3)`, borderBottom: `4px solid ${theme.palette[0]}CC` }}>
                                {activeTab === 'gregorianToHijri' ? "تحويل إلى هجري" : "تحويل إلى ميلادي"}
                            </button>
                        </div>
                        <div className={`w-full p-4 sm:p-6 rounded-xl text-center font-extrabold themed-card min-h-[90px] flex flex-col justify-center mb-6`}>
                            <p className={`text-xs themed-text-muted mb-1`}>{message}</p>
                            <p className={`text-2xl sm:text-3xl leading-tight`} style={{color: theme.palette[0]}}>{result || '---'}</p>
                        </div>

                        {historicalEvent && (
                            <div className="themed-card p-5 rounded-2xl border-r-4 shadow-lg fade-in mb-4" style={{ borderRightColor: theme.palette[1] }}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.palette[1] + '20', color: theme.palette[1] }}>
                                        <i className="fa-solid fa-clock-rotate-left text-lg"></i>
                                    </div>
                                    <h3 className="font-bold text-lg" style={{ color: theme.palette[1] }}>حدث تاريخي عظيم</h3>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-extrabold" style={{ color: theme.palette[0] }}>{historicalEvent.title}</h4>
                                    <div className="flex gap-4 text-sm font-bold themed-text-muted">
                                        <span><i className="fa-solid fa-calendar-check ml-1"></i> {historicalEvent.hijriYear}</span>
                                        <span><i className="fa-solid fa-calendar-day ml-1"></i> {historicalEvent.gregorianYear}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed font-amiri themed-text-muted pt-2 border-t border-black/5 dark:border-white/5">
                                        {historicalEvent.description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default HijriCalendar;