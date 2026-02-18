
import React, { useState, useEffect, useRef } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { prayerNamesAr } from '../data/prayerTimesData';

// Helper Functions
const toArDigits = (num) => {
    if (num === null || num === undefined) return '';
    return num.toString().replace(/[0-9]/g, w => '٠١٢٣٤٥٦٧٨٩'[+w]);
};

const applyOffset = (timeStr, offsetMins) => {
    if (!timeStr || timeStr.includes('--')) return null;
    let [h, m] = timeStr.split(':');
    let date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    date.setMinutes(date.getMinutes() + (offsetMins || 0));
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

const formatTime12 = (time, large = false) => {
    if (!time) return "--:--";
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ap = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    const sizeClass = large ? 'text-lg' : 'text-base';
    return `<span class="${sizeClass} font-bold">${toArDigits(h)}:${toArDigits(m.toString().padStart(2, '0'))}</span> <span class="text-xs font-semibold">${ap}</span>`;
};

// Main Component
function PrayerTimes({ onBack }) {
    const { theme } = useTheme();
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('prayerTimes_config_v1');
            return saved ? JSON.parse(saved) : {
                iqamaOffsets: { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 },
                prayerOffsets: { Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
                location: { cityGov: "الدمام", fullCountry: "المملكة العربية السعودية", lat: 26.4207, lng: 50.0888 }
            };
        } catch (e) { /* return default */ }
        return {
            iqamaOffsets: { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 },
            prayerOffsets: { Fajr: 0, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
            location: { cityGov: "الدمام", fullCountry: "المملكة العربية السعودية", lat: 26.4207, lng: 50.0888 }
        };
    });

    const [times, setTimes] = useState({});
    const [dates, setDates] = useState({ hijri: "", gregorian: "" });
    const [nextPrayer, setNextPrayer] = useState(null);
    const [countdown, setCountdown] = useState("00:00:00");
    const [searchInput, setSearchInput] = useState("");
    const intervalRef = useRef(null);
    const prayerKeys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    const updateTimesAndDates = (data) => {
        setTimes(data.timings);
        const hj = data.date.hijri;
        setDates({
            hijri: `${hj.day} ${hj.month.ar} ${toArDigits(hj.year)} هـ`,
            gregorian: new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
        });
    };

    const fetchTimes = async (lat, lng, shouldUpdateLocation = false, locationData = {}) => {
        try {
            const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=4`);
            const data = await res.json();
            if (data.data) {
                localStorage.setItem('prayerTimes_cache_v1', JSON.stringify(data.data));
                updateTimesAndDates(data.data);
                if(shouldUpdateLocation) {
                    setConfig(prev => ({ ...prev, location: {...prev.location, ...locationData} }));
                }
            }
        } catch(e) { console.error("Failed to fetch prayer times:", e); }
    };

    useEffect(() => {
        const cached = localStorage.getItem('prayerTimes_cache_v1');
        if (cached) updateTimesAndDates(JSON.parse(cached));
        fetchTimes(config.location.lat, config.location.lng);
    }, []);
    
    useEffect(() => {
        localStorage.setItem('prayerTimes_config_v1', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        if (!Object.keys(times).length) return;
        
        const findNext = () => {
            const now = new Date();
            let found = null;
            for (const key of prayerKeys) {
                const adjustedTime = applyOffset(times[key], config.prayerOffsets[key]);
                if (!adjustedTime) continue;
                const [h, m] = adjustedTime.split(':');
                const pDate = new Date();
                pDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                if (pDate > now) {
                    found = { key, date: pDate, name: prayerNamesAr[key] };
                    break;
                }
            }
            if (!found) { // Next day's Fajr
                const adjustedTime = applyOffset(times['Fajr'], config.prayerOffsets['Fajr']);
                if(adjustedTime) {
                    const [h, m] = adjustedTime.split(':');
                    const pDate = new Date();
                    pDate.setDate(pDate.getDate() + 1);
                    pDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                    found = { key: 'Fajr', date: pDate, name: prayerNamesAr['Fajr'] };
                }
            }
            setNextPrayer(found);
        };

        findNext();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(findNext, 60000); // Check for next prayer every minute

        return () => clearInterval(intervalRef.current);
    }, [times, config]);

    useEffect(() => {
        if (!nextPrayer) return;
        const countdownInterval = setInterval(() => {
            const diff = nextPrayer.date.getTime() - new Date().getTime();
            if (diff <= 0) {
                setCountdown("00:00:00");
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${toArDigits(h.toString().padStart(2, '0'))}:${toArDigits(m.toString().padStart(2, '0'))}:${toArDigits(s.toString().padStart(2, '0'))}`);
        }, 1000);

        return () => clearInterval(countdownInterval);
    }, [nextPrayer]);

    return (
        <div className="h-screen w-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-xl sm:text-2xl font-black">{config.location.cityGov}, {config.location.fullCountry}</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto hide-scrollbar p-4 pb-24">
                <div className="max-w-lg mx-auto space-y-4">
                     {nextPrayer && (
                        <div className="rounded-2xl p-4 text-white text-center" style={{ background: `linear-gradient(135deg, ${theme.palette[0]}, ${theme.palette[1]})` }}>
                            <p className="text-sm font-bold opacity-80">المتبقي على أذان {nextPrayer.name}</p>
                            <p className="text-5xl font-black font-mono my-2 tracking-tighter">{countdown}</p>
                            <p className="text-sm opacity-80" dangerouslySetInnerHTML={{ __html: `موعد الأذان: ${formatTime12(applyOffset(times[nextPrayer.key], config.prayerOffsets[nextPrayer.key]))}` }}></p>
                        </div>
                    )}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="themed-card rounded-xl p-3 text-center">
                            <p className="text-xs font-bold themed-text-muted">التاريخ الهجري</p>
                            <p className="font-bold" style={{color: theme.palette[0]}}>{dates.hijri}</p>
                        </div>
                        <div className="themed-card rounded-xl p-3 text-center">
                            <p className="text-xs font-bold themed-text-muted">التاريخ الميلادي</p>
                            <p className="font-bold" style={{color: theme.palette[1]}}>{dates.gregorian}</p>
                        </div>
                    </div>
                     <div className="space-y-3">
                        {prayerKeys.map(key => (
                             <div key={key} className={`p-3 rounded-xl themed-card flex items-center justify-between transition-all ${nextPrayer?.key === key ? 'border-2' : ''}`} style={{borderColor: nextPrayer?.key === key ? theme.palette[0] : 'transparent'}}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center themed-bg-alt">
                                        <i className={`fa-regular ${key === 'Sunrise' ? 'fa-sun' : key === 'Fajr' ? 'fa-moon' : 'fa-clock'} text-xl`} style={{color: theme.palette[0]}}></i>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base">{prayerNamesAr[key]}</h3>
                                        {key !== 'Sunrise' && <p className="text-xs themed-text-muted">إقامة بعد {toArDigits(config.iqamaOffsets[key] || 0)} د</p>}
                                    </div>
                                </div>
                                <div className="text-right font-mono" dangerouslySetInnerHTML={{__html: formatTime12(applyOffset(times[key], config.prayerOffsets[key]), true)}}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default PrayerTimes;