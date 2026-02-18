
import React, { useState, useEffect, useRef } from 'react';
import BottomBar from './BottomBar';
import { useTheme } from './ThemeContext';

const prayerNamesAr = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

// Helper Functions
const toArDigits = (num) => {
    if (num === null || num === undefined) return '';
    return num.toString().replace(/[0-9]/g, w => '٠١٢٣٤٥٦٧٨٩'[+w]);
};

const applyOffset = (timeStr, offsetMins) => {
    if (!timeStr) return "--:--";
    let [h, m] = timeStr.split(':');
    let date = new Date();
    date.setHours(parseInt(h), parseInt(m), 0);
    date.setMinutes(date.getMinutes() + (offsetMins || 0));
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

const formatTime12 = (time) => {
    if(!time) return "--:-- --";
    let [h, m] = time.split(':');
    h = parseInt(h);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `<span class="text-xl font-black">${h}:${m.toString().padStart(2, '0')}</span> <span class="time-period">${ap}</span>`;
};

const formatTime12_EN = (time) => {
    if (!time) return "--:-- --";
    let [h, m] = time.split(':');
    h = parseInt(h);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ap}`;
}

const formatTime12_clean = (time) => {
    if (!time) return "--:-- --";
    let [h, m] = time.split(':');
    h = parseInt(h);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ap}`;
}

// Main Component
function PrayerTimes({ onBack }) {
    const { theme } = useTheme();
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('prayerFinal_v33');
            return saved ? JSON.parse(saved) : {
                iqamaOffsets: { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 },
                prayerOffsets: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
                tones: {},
                mutedPrayers: { Sunrise: true },
                location: { cityGov: "الدمام - الشرقية", fullCountry: "المملكة العربية السعودية", combinedCode: "+966013", lat: 26.4207, lng: 50.0888 }
            };
        } catch (e) {
            return {
                iqamaOffsets: { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 },
                prayerOffsets: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
                tones: {},
                mutedPrayers: { Sunrise: true },
                location: { cityGov: "الدمام - الشرقية", fullCountry: "المملكة العربية السعودية", combinedCode: "+966013", lat: 26.4207, lng: 50.0888 }
            };
        }
    });

    const [times, setTimes] = useState({});
    const [hijriDate, setHijriDate] = useState("-- -- --");
    const [gregorianDate, setGregorianDate] = useState("-- -- --");
    const [nextPrayer, setNextPrayer] = useState(null);
    const [countdown, setCountdown] = useState("00:00:00");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEditingKey, setCurrentEditingKey] = useState(null);
    const [tempOffset, setTempOffset] = useState(0);
    const [tempIqama, setTempIqama] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const countdownRef = useRef(null);

    const fetchTimes = async (lat, lng) => {
        try {
            const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=4`);
            const data = await res.json();
            if (data.data) {
                localStorage.setItem('grandPrayersCache', JSON.stringify(data.data));
                updateUI(data.data, config.location);
            }
        } catch(e) { console.error("Failed to fetch prayer times:", e); }
    };
    
    const updateUI = (data, loc) => {
        setTimes(data.timings);
        const hj = data.date.hijri;
        setHijriDate(`${hj.day} ${hj.month.ar} ${toArDigits(hj.year)} هـ`);
        setGregorianDate(new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }));
    };

    const fetchByIP = async () => {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            const newLocation = {
                cityGov: `${data.city} - ${data.region}`,
                fullCountry: data.country_name,
                combinedCode: data.country_calling_code,
                lat: data.latitude,
                lng: data.longitude
            };
            setConfig(prev => ({ ...prev, location: newLocation }));
            fetchTimes(data.latitude, data.longitude);
        } catch(e) {
            fetchTimes(config.location.lat, config.location.lng); // Fallback to saved location
        }
    };
    
    const refreshLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                     try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`);
                        const data = await res.json();
                        const addr = data.address;
                        const city = addr.village || addr.town || addr.city || "موقعي";
                        const newLocation = {
                            cityGov: `${city} - ${addr.state || ""}`,
                            fullCountry: addr.country,
                            combinedCode: addr.country_code ? `+${addr.country_code.toUpperCase()}` : "",
                            lat: latitude,
                            lng: longitude
                        };
                         setConfig(prev => ({ ...prev, location: newLocation }));
                    } catch(e) {
                         setConfig(prev => ({ ...prev, location: {...prev.location, lat: latitude, lng: longitude, cityGov: "موقع حالي"} }));
                    }
                    fetchTimes(latitude, longitude);
                },
                () => fetchByIP(),
                { enableHighAccuracy: true, timeout: 6000 }
            );
        } else {
            fetchByIP();
        }
    };
    
    const manualSearch = async () => {
        if(!searchInput) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&addressdetails=1&accept-language=ar&limit=1`);
            const data = await res.json();
            if(data && data.length > 0) {
                const addr = data[0].address;
                const name = addr.city || addr.town || addr.village || searchInput;
                const province = addr.state || "";
                const newLocation = {
                    cityGov: `${name} - ${province}`,
                    fullCountry: addr.country,
                    combinedCode: addr.country_code ? `+${addr.country_code.toUpperCase()}` : "",
                    lat: data[0].lat,
                    lng: data[0].lon
                };
                setConfig(prev => ({ ...prev, location: newLocation }));
                fetchTimes(data[0].lat, data[0].lon);
            }
        } catch(e) { console.error(e); }
    }


    useEffect(() => {
        const cached = localStorage.getItem('grandPrayersCache');
        if (cached) {
            updateUI(JSON.parse(cached), config.location);
        }
        refreshLocation();
    }, []);

    useEffect(() => {
        localStorage.setItem('prayerFinal_v33', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        if (!Object.keys(times).length) return;

        const findNext = () => {
            const now = new Date();
            const keys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            let found = null;
            for (let key of keys) {
                const adjustedTime = applyOffset(times[key], config.prayerOffsets[key]);
                const [h, m] = (adjustedTime || "00:00").split(':');
                const pDate = new Date(); pDate.setHours(parseInt(h), parseInt(m), 0);
                if (pDate > now) {
                    found = { key, date: pDate, name: prayerNamesAr[key] };
                    break;
                }
            }
            if (!found) { // Next day's Fajr
                const adjustedTime = applyOffset(times['Fajr'], config.prayerOffsets['Fajr']);
                const [h, m] = (adjustedTime || "00:00").split(':');
                const pDate = new Date(); pDate.setDate(pDate.getDate() + 1); pDate.setHours(parseInt(h), parseInt(m), 0);
                found = { key: 'Fajr', date: pDate, name: prayerNamesAr['Fajr'] };
            }
            setNextPrayer(found);
        };
        
        findNext();

        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            if (!nextPrayer) return findNext();
            const diff = nextPrayer.date.getTime() - new Date().getTime();
            if (diff <= 0) return findNext();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(countdownRef.current);

    }, [times, nextPrayer, config]);
    
    const openSettings = (key) => {
        setCurrentEditingKey(key);
        setTempOffset(config.prayerOffsets[key] || 0);
        setTempIqama(config.iqamaOffsets[key] || 0);
        setIsModalOpen(true);
    };

    const saveUserConfig = () => {
        setConfig(prev => ({
            ...prev,
            prayerOffsets: { ...prev.prayerOffsets, [currentEditingKey]: tempOffset },
            iqamaOffsets: { ...prev.iqamaOffsets, [currentEditingKey]: tempIqama }
        }));
        setIsModalOpen(false);
    };

    const handleToneUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setConfig(prev => ({
                    ...prev,
                    tones: { ...prev.tones, [currentEditingKey]: { name: file.name, data: event.target.result }}
                }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const togglePrayerSound = (key) => {
        setConfig(prev => ({
            ...prev,
            mutedPrayers: {...prev.mutedPrayers, [key]: !prev.mutedPrayers[key] }
        }));
    }

    return (
        <div className="h-screen w-screen flex flex-col">
            <header className="app-top-bar" style={{background: 'var(--top-bar-bg, linear-gradient(to left, #4c1d95, #6d28d9, #10b981))'}}>
                <div className="app-top-bar__inner">
                    <div className="flex items-center justify-center gap-2">
                        <i onClick={refreshLocation} className="fa-solid fa-location-crosshairs text-xl cursor-pointer active:rotate-180 duration-700"></i>
                        <h1 className="app-top-bar__title text-xl sm:text-2xl font-black truncate">{config.location.cityGov}</h1>
                    </div>
                     <div className="flex items-center justify-center gap-2" dir="rtl">
                        <p className="text-xs font-bold" id="official-country-name">{config.location.fullCountry}</p>
                        <span className="text-xs font-black text-white bg-black/20 px-2 py-0.5 rounded-md border border-white/20" dir="ltr">{config.location.combinedCode}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto hide-scrollbar p-4 pb-24">
                <div className="max-w-md mx-auto">
                    <div className="bg-white gold-border rounded-2xl p-2.5 flex items-center justify-between shadow-sm mb-5">
                        <div className="flex-1 text-center border-l border-orange-100">
                            <p className="text-[9px] text-orange-900/70 font-bold uppercase mb-0.5">التاريخ الهجري</p>
                            <p className="text-xs font-bold text-royal-gold">{hijriDate}</p>
                        </div>
                        <div className="flex-1 text-center">
                            <p className="text-[9px] text-orange-900/70 font-bold uppercase mb-0.5">التاريخ الميلادي</p>
                            <p className="text-xs font-bold text-brand-teal">{gregorianDate}</p>
                        </div>
                    </div>

                     <div className="flex items-center justify-center gap-3 mb-5 px-1">
                        <span onClick={manualSearch} className="cursor-pointer text-sm font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm active:scale-95">بحث</span>
                        <div className="flex-1 relative gold-border rounded-xl overflow-hidden bg-white shadow-sm">
                            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && manualSearch()} placeholder="عن مدينة أو محافظة..." 
                                className="w-full bg-transparent py-2.5 px-4 pr-10 text-xs outline-none transition-all placeholder-orange-300"/>
                            <button onClick={manualSearch} className="absolute right-3 top-2.5 text-royal-gold">
                                <i className="fa-solid fa-magnifying-glass"></i>
                            </button>
                        </div>
                    </div>
                    
                     {nextPrayer && (
                        <div className="countdown-banner" style={{background: `linear-gradient(135deg, ${theme.palette[1]}, ${theme.palette[0]})`}}>
                            <div className="flex justify-between items-center relative z-10">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold opacity-90">المتبقي على صلاة <span className="underline decoration-white/40">{nextPrayer.name}</span></p>
                                    <p className="text-3xl font-black font-mono tracking-tighter">{countdown}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] font-bold opacity-80 uppercase">موعد الأذان</p>
                                    <p className="text-base font-black" dangerouslySetInnerHTML={{ __html: formatTime12(applyOffset(times[nextPrayer.key], config.prayerOffsets[nextPrayer.key])) }}></p>
                                </div>
                            </div>
                            <div className="absolute -left-6 -bottom-6 w-16 h-16 bg-white opacity-10 rounded-full blur-2xl"></div>
                        </div>
                    )}

                    <div className="space-y-3 mt-5">
                        {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((key, idx) => {
                             const displayTimeStr = applyOffset(times[key], config.prayerOffsets[key]);
                             const iqamaTime = applyOffset(displayTimeStr, config.iqamaOffsets[key]);
                             const isMuted = config.mutedPrayers[key];

                            return (
                                <div key={key} className={`prayer-card rounded-2xl px-4 flex items-center justify-between mb-3 themed-card ${nextPrayer?.key === key ? 'bg-active' : ''}`} style={{borderColor: nextPrayer?.key === key ? theme.palette[0] : 'var(--card-border)', borderWidth: nextPrayer?.key === key ? '2px' : '1px'}}>
                                    <div className="flex items-center gap-3">
                                        {key !== 'Sunrise' && (
                                            <div className="flex flex-col items-center gap-2">
                                                <div onClick={() => togglePrayerSound(key)} className={`toggle-dot ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} style={{borderColor: theme.textColor}}></div>
                                                <button onClick={() => openSettings(key)} className="settings-btn shadow-sm"><i className="fa-solid fa-sliders"></i></button>
                                            </div>
                                        )}
                                        <div className={`w-10 h-10 rounded-2xl themed-bg-alt flex items-center justify-center border`} style={{color: theme.palette[0], borderColor: 'var(--card-border)'}}>
                                             <i className={`fa-regular ${key === 'Sunrise' ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-sm leading-none mb-1.5">{prayerNamesAr[key]}</h3>
                                            {key !== 'Sunrise' && (
                                                <span className="text-[9px] font-black text-accent-orange bg-amber-50/50 px-2 py-0.5 rounded-full border border-amber-100">إقامة {formatTime12_clean(iqamaTime)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-left flex flex-col items-end">
                                        <span className="themed-text" dangerouslySetInnerHTML={{ __html: formatTime12(displayTimeStr) }}></span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </main>

             {isModalOpen && (
                 <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xs p-6 shadow-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                            <h3 className="font-black text-sm text-slate-800">إعدادات صلاة {prayerNamesAr[currentEditingKey]}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-circle-xmark text-2xl"></i></button>
                        </div>
                        <div className="space-y-6">
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest text-center">تعديل وقت الأذان (بالدقائق)</label>
                                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                                    <button onClick={() => setTempOffset(p => p - 1)} className="control-btn text-red-500 shadow-sm"><i className="fa-solid fa-minus"></i></button>
                                    <div className="text-center">
                                        <div className="text-lg font-black text-slate-800 en-digits">{formatTime12_EN(applyOffset(times[currentEditingKey], tempOffset))}</div>
                                        <div className="text-[10px] font-bold text-brand-purple mt-0.5 en-digits">{tempOffset > 0 ? "+" : ""}{tempOffset} min</div>
                                    </div>
                                    <button onClick={() => setTempOffset(p => p + 1)} className="control-btn text-brand-teal shadow-sm"><i className="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest text-center">تنبيه الإقامة (بالدقائق)</label>
                                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                                    <button onClick={() => setTempIqama(p => Math.max(0, p - 1))} className="control-btn text-red-500 shadow-sm"><i className="fa-solid fa-minus"></i></button>
                                    <div className="text-center">
                                        <div className="text-lg font-black text-slate-800 en-digits">{tempIqama}</div>
                                        <div className="text-[10px] font-bold text-accent-orange mt-0.5 uppercase tracking-tighter">min</div>
                                    </div>
                                    <button onClick={() => setTempIqama(p => p + 1)} className="control-btn text-brand-teal shadow-sm"><i className="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">نغمة التنبيه</label>
                                <input type="file" id="sound-file-input" accept="audio/*" className="hidden" onChange={handleToneUpload}/>
                                <button onClick={() => document.getElementById('sound-file-input').click()} className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 flex items-center justify-between hover:bg-slate-200 transition-all shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[140px]">{config.tones[currentEditingKey]?.name || 'اختر ملفاً...'}</span>
                                    <i className="fa-solid fa-music text-brand-teal text-sm"></i>
                                </button>
                            </div>
                        </div>
                        <button onClick={saveUserConfig} className="w-full mt-8 bg-brand-purple text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">حفظ التغييرات</button>
                    </div>
                </div>
            )}

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default PrayerTimes;
