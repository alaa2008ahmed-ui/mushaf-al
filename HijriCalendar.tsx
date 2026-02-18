
import React, { useState, useEffect } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';

// --- Data ---
const gregorianMonths = [
    { id: 1, name: 'يناير' }, { id: 2, name: 'فبراير' }, { id: 3, name: 'مارس' },
    { id: 4, name: 'أبريل' }, { id: 5, name: 'مايو' }, { id: 6, name: 'يونيو' },
    { id: 7, name: 'يوليو' }, { id: 8, name: 'أغسطس' }, { id: 9, name: 'سبتمبر' },
    { id: 10, name: 'أكتوبر' }, { id: 11, name: 'نوفمبر' }, { id: 12, name: 'ديسمبر' }
];

const hijriMonths = [
    { id: 1, name: 'محرم' }, { id: 2, name: 'صفر' }, { id: 3, name: 'ربيع الأول' },
    { id: 4, name: 'ربيع الآخر' }, { id: 5, name: 'جمادى الأولى' }, { id: 6, name: 'جمادى الآخرة' },
    { id: 7, name: 'رجب' }, { id: 8, name: 'شعبان' }, { id: 9, name: 'رمضان' },
    { id: 10, name: 'شوال' }, { id: 11, name: 'ذو القعدة' }, { id: 12, name: 'ذو الحجة' }
];

const ARABIC_TO_ENGLISH_NUMERALS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

// --- Helper Functions ---
function toArabicNumerals(num) {
    if (num === null || num === undefined) return '';
    return String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
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
    const isDark = !theme.bgColor || ['#000000', '#4c1d95', '#7c2d12', '#1e40af', '#1e1b4b', '#1c1917', '#0b0f19', '#3e2723', '#450a0a', '#064e3b', '#0f766e', '#155e75', '#581c87'].includes(theme.bgColor);
    
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

    useEffect(() => {
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
        const sanitizedValue = toEnglishNumerals(value).replace(/[^0-9]/g, '');
        setInputs(prev => ({ ...prev, [key]: sanitizedValue }));
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
    
    const gDays = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: toArabicNumerals(i + 1) }));
    const hDays = Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: toArabicNumerals(i + 1) }));
    const gMonthsOpts = gregorianMonths.map(m => ({ value: m.id, label: m.name }));
    const hMonthsOpts = hijriMonths.map(m => ({ value: m.id, label: m.name }));
    
    return (
        <div className={`h-screen flex flex-col`}>
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-xl sm:text-2xl">التقويم الهجري الذكي</h1>
                    <p className="app-top-bar__subtitle">حوّل بين التاريخين الهجري والميلادي بسرعة مع عرض يومي دقيق</p>
                </div>
            </header>

            <main className="flex-1 overflow-hidden px-4 py-2 flex flex-col items-center">
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
                
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default HijriCalendar;
