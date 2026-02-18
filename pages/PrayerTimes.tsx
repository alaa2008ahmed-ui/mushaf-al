
import React, { useState, useEffect, useRef } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { prayerNamesAr } from '../data/prayerTimesData';

// --- Default Tones Configuration ---
const defaultTones = [
    { name: "الأذان الافتراضي 1", path: "assets/audio/adhan1.mp3" },
    { name: "الأذان الافتراضي 2", path: "assets/audio/adhan2.mp3" },
];

// Helper Functions
const toArDigits = (num) => {
    if (num === null || num === undefined) return '';
    const id = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, w => id[+w]);
};

const applyOffset = (timeStr, offsetMins) => {
    if (!timeStr || timeStr.includes('--')) return "--:--";
    let [h, m] = timeStr.split(':');
    let date = new Date();
    date.setHours(parseInt(h), parseInt(m), 0);
    date.setMinutes(date.getMinutes() + (offsetMins || 0));
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

const formatTime12 = (time) => {
    if(!time || time.includes('--')) return "--:-- --";
    let [h, m] = time.split(':');
    h = parseInt(h);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `<span class="text-xl font-black">${h}:${m.toString().padStart(2, '0')}</span> <span class="time-period">${ap}</span>`;
};

const formatTime12_EN = (time) => {
    if (!time || time.includes('--')) return "--:-- --";
    let [h, m] = time.split(':');
    h = parseInt(h);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ap}`;
}

const formatTime12_clean = (time) => {
    if (!time || time.includes('--')) return "--:-- --";
    let [h, m] = time.split(':');
    h = parseInt(h);
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ap}`;
}

const playNotificationSound = (source) => {
    if (!source) return;
    try {
        const audio = new Audio(source);
        audio.play().catch(e => console.error("Audio play failed:", e));
    } catch (e) {
        console.error("Failed to play notification sound:", e);
    }
};


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

    const [times, setTimes] = useState<Record<string, string>>({});
    const [dates, setDates] = useState({ hijri: "-- -- --", gregorian: "-- -- --" });
    const [nextPrayer, setNextPrayer] = useState(null);
    const [countdown, setCountdown] = useState("00:00:00");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEditingKey, setCurrentEditingKey] = useState(null);
    const [tempOffset, setTempOffset] = useState(0);
    const [tempIqama, setTempIqama] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const countdownRef = useRef(null);
    const searchIconRef = useRef(null);

    const updateAllData = (prayerData, locationData) => {
        setTimes(prayerData.timings);
        const hj = prayerData.date.hijri;
        setDates({
            hijri: `${hj.day} ${hj.month.ar} ${toArDigits(hj.year)} هـ`,
            gregorian: new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
        });
        setConfig(prev => ({...prev, location: locationData}));
    };

    const fetchTimesForLocation = async (locationData) => {
        const { lat, lng } = locationData;
        try {
            const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=4`);
            const data = await res.json();
            if (data.data) {
                localStorage.setItem('grandPrayersCache', JSON.stringify(data.data));
                updateAllData(data.data, locationData);
            }
        } catch(e) { console.error("Failed to fetch prayer times:", e); }
    };

    const fetchByIP = async () => {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            const newLoc = {
                cityGov: `${data.city} - ${data.region}`,
                fullCountry: data.country_name,
                combinedCode: data.country_calling_code,
                lat: data.latitude, lng: data.longitude
            };
            await fetchTimesForLocation(newLoc);
        } catch(e) {
            await fetchTimesForLocation(config.location); 
        }
    };
    
    const refreshLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    let newLoc = {
                        lat: latitude, lng: longitude,
                        cityGov: 'موقعي الحالي', fullCountry: '', combinedCode: ''
                    };
                     try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`);
                        const data = await res.json();
                        const addr = data.address;
                        const city = addr.village || addr.town || addr.city || "موقعي";
                        newLoc = {
                            ...newLoc,
                            cityGov: `${city} - ${addr.state || ""}`,
                            fullCountry: addr.country,
                            combinedCode: "+966"
                        };
                    } catch(e) {}
                    await fetchTimesForLocation(newLoc);
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
        if (searchIconRef.current) searchIconRef.current.className = 'fa-solid fa-spinner fa-spin';
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
                    combinedCode: "+966",
                    lat: data[0].lat, lng: data[0].lon
                };
                await fetchTimesForLocation(newLocation);
            }
        } catch(e) { console.error(e); } 
        finally { if (searchIconRef.current) searchIconRef.current.className = 'fa-solid fa-magnifying-glass'; }
    }

    useEffect(() => {
        if ("Notification" in window) Notification.requestPermission();
        const cached = localStorage.getItem('grandPrayersCache');
        if (cached) {
            try {
                const prayerData = JSON.parse(cached);
                updateAllData(prayerData, config.location);
            } catch(e) {
                 localStorage.removeItem('grandPrayersCache');
            }
        }
        refreshLocation();
    }, []);

    useEffect(() => {
        localStorage.setItem('prayerFinal_v33', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        const findNext = () => {
            if (!Object.keys(times).length) return null;

            const now = new Date();
            const keys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            let found = null;

            for (const key of keys) {
                const adjustedTime = applyOffset(times[key], config.prayerOffsets[key]);
                if (adjustedTime && !adjustedTime.includes('--')) {
                    const [h, m] = adjustedTime.split(':');
                    const pDate = new Date();
                    pDate.setHours(parseInt(h), parseInt(m), 0, 0);
                    if (pDate > now) {
                        found = { key, date: pDate, name: prayerNamesAr[key] };
                        break;
                    }
                }
            }

            if (!found && times.Fajr) {
                const fajrTime = applyOffset(times.Fajr, config.prayerOffsets.Fajr);
                if (fajrTime && !fajrTime.includes('--')) {
                    const [h, m] = fajrTime.split(':');
                    const pDate = new Date();
                    pDate.setDate(pDate.getDate() + 1);
                    pDate.setHours(parseInt(h), parseInt(m), 0, 0);
                    found = { key: 'Fajr', date: pDate, name: prayerNamesAr['Fajr'] };
                }
            }
            return found;
        };

        if (!Object.keys(times).length) return;
        
        if (!nextPrayer || new Date() >= nextPrayer.date) {
            setNextPrayer(findNext());
            return;
        }

        if (countdownRef.current) clearInterval(countdownRef.current);
        
        countdownRef.current = setInterval(() => {
            if (!nextPrayer || !nextPrayer.date) return;
            const diff = nextPrayer.date.getTime() - new Date().getTime();
            
            if (diff > 0) {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setCountdown("00:00:00");
                if (!config.mutedPrayers[nextPrayer.key]) {
                    playNotificationSound(config.tones[nextPrayer.key]?.data);
                }
                setNextPrayer(findNext());
            }
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

    const handleToneSelection = (e) => {
        const value = e.target.value;
        if (value === 'custom') {
            document.getElementById('sound-file-input').click();
        } else if (value === 'none') {
            setConfig(prev => {
                const newTones = { ...prev.tones };
                delete newTones[currentEditingKey];
                return { ...prev, tones: newTones };
            });
        } else {
            const selectedTone = defaultTones.find(t => t.path === value);
            if (selectedTone) {
                playNotificationSound(selectedTone.path); // Play preview
                setConfig(prev => ({
                    ...prev,
                    tones: { ...prev.tones, [currentEditingKey]: { name: selectedTone.name, data: selectedTone.path }}
                }));
            }
        }
    };
    
    const handleToneUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const audioDataUrl = event.target.result as string;
                playNotificationSound(audioDataUrl); // Play preview
                setConfig(prev => ({
                    ...prev,
                    tones: { ...prev.tones, [currentEditingKey]: { name: file.name, data: audioDataUrl }}
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

    const renderToneSelector = () => {
        if (!currentEditingKey) return null;
        
        const currentTone = config.tones[currentEditingKey];
        let selectValue = 'none';
        if (currentTone) {
            if (currentTone.data.startsWith('data:audio')) {
                selectValue = 'custom';
            } else {
                selectValue = currentTone.data;
            }
        }

        return (
            <div>
                <label className="block text-[10px] font-black themed-text-muted mb-2 uppercase tracking-widest">نغمة التنبيه</label>
                <div className="relative">
                    <select value={selectValue} onChange={handleToneSelection} className="w-full appearance-none themed-bg-alt border themed-card-border rounded-xl py-3 px-4 text-xs font-bold themed-text">
                        <option value="none">بدون تنبيه</option>
                        {defaultTones.map(tone => <option key={tone.path} value={tone.path}>{tone.name}</option>)}
                        <option value="custom">نغمة مخصصة...</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3">
                         <i className="fa-solid fa-chevron-down text-xs" style={{color: theme.palette[1]}}></i>
                    </div>
                </div>
                <input type="file" id="sound-file-input" accept="audio/*" className="hidden" onChange={handleToneUpload}/>
                {selectValue === 'custom' && currentTone && <p className="text-center text-[10px] themed-text-muted mt-1 truncate">الملف الحالي: {currentTone.name}</p>}
            </div>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col">
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <div className="flex items-center justify-center gap-2">
                        <i onClick={refreshLocation} className="text-xl cursor-pointer active:rotate-180 duration-700 fa-solid fa-location-crosshairs"></i>
                        <h1 className="app-top-bar__title text-xl sm:text-2xl font-black truncate">{config.location.cityGov}</h1>
                    </div>
                     <div className="flex items-center justify-center gap-2" dir="rtl">
                        <p className="text-xs font-bold">{config.location.fullCountry}</p>
                        <span className="text-xs font-black text-white bg-black/20 px-2 py-0.5 rounded-md border border-white/20" dir="ltr">{config.location.combinedCode}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto hide-scrollbar p-4 pb-24">
                <div className="max-w-md mx-auto">
                    <div className="themed-card rounded-2xl p-2.5 flex items-center justify-between shadow-sm mb-5">
                        <div className="flex-1 text-center border-l themed-text-muted/20">
                            <p className="text-[9px] themed-text-muted font-bold uppercase mb-0.5">التاريخ الهجري</p>
                            <p className="text-xs font-bold" style={{color: theme.palette[1]}}>{dates.hijri}</p>
                        </div>
                        <div className="flex-1 text-center">
                            <p className="text-[9px] themed-text-muted font-bold uppercase mb-0.5">التاريخ الميلادي</p>
                            <p className="text-xs font-bold" style={{color: theme.palette[0]}}>{dates.gregorian}</p>
                        </div>
                    </div>

                     <div className="flex items-center justify-center gap-3 mb-5 px-1">
                        <button onClick={manualSearch} className="themed-card text-sm font-black px-3 py-1.5 rounded-lg shadow-sm active:scale-95">بحث</button>
                        <div className="flex-1 relative themed-card rounded-xl overflow-hidden shadow-sm">
                            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && manualSearch()} placeholder="عن مدينة أو محافظة..." 
                                className="w-full bg-transparent py-2.5 px-4 pr-10 text-xs outline-none transition-all themed-text"/>
                            <button onClick={manualSearch} className="absolute right-3 top-2.5" style={{color: theme.palette[1]}}>
                                <i ref={searchIconRef} className="fa-solid fa-magnifying-glass"></i>
                            </button>
                        </div>
                    </div>
                    
                     {nextPrayer && times[nextPrayer.key] && (
                        <div className="rounded-2xl p-3 text-white mb-5 relative overflow-hidden" style={{background: `linear-gradient(135deg, ${theme.palette[1]}, ${theme.palette[0]})`}}>
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
                                <div key={key} className="prayer-card rounded-2xl px-4 flex items-center justify-between mb-3 themed-card" style={{borderColor: nextPrayer?.key === key ? theme.palette[0] : 'var(--card-border)', borderWidth: nextPrayer?.key === key ? '2px' : '1px'}}>
                                    <div className="flex items-center gap-3">
                                        {key !== 'Sunrise' ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div onClick={() => togglePrayerSound(key)} className={`toggle-dot ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} style={{borderColor: 'var(--text-color)'}}></div>
                                                <button onClick={() => openSettings(key)} className="settings-btn shadow-sm"><i className="fa-solid fa-sliders"></i></button>
                                            </div>
                                        ) : <div className="w-12"></div>}
                                        <div className="w-10 h-10 rounded-2xl themed-bg-alt flex items-center justify-center border" style={{color: idx % 2 === 0 ? theme.palette[0] : theme.palette[1], borderColor: 'var(--card-border)'}}>
                                             <i className={`fa-regular ${key === 'Sunrise' ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-sm leading-none mb-1.5 themed-text">{prayerNamesAr[key]}</h3>
                                            {key !== 'Sunrise' && iqamaTime && !iqamaTime.includes('--') && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full border" style={{color: theme.palette[1], backgroundColor: theme.palette[1] + '1A', borderColor: theme.palette[1] + '33'}}>إقامة {formatTime12_clean(iqamaTime)}</span>
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

             {isModalOpen && currentEditingKey && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 scale-in">
                    <div className="themed-card rounded-[2.5rem] w-full max-w-xs p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 pb-2 border-b themed-text-muted/20">
                            <h3 className="font-black text-sm themed-text">إعدادات صلاة {prayerNamesAr[currentEditingKey]}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="themed-text-muted hover:text-red-500"><i className="fa-solid fa-circle-xmark text-2xl"></i></button>
                        </div>
                        <div className="space-y-6">
                             <div>
                                <label className="block text-[10px] font-black themed-text-muted mb-3 uppercase tracking-widest text-center">تعديل وقت الأذان (بالدقائق)</label>
                                <div className="flex items-center justify-between themed-bg-alt p-2 rounded-2xl border themed-card-border shadow-inner">
                                    <button onClick={() => setTempOffset(p => p - 1)} className="control-btn text-red-500 shadow-sm"><i className="fa-solid fa-minus"></i></button>
                                    <div className="text-center">
                                        <div className="text-lg font-black themed-text en-digits">{formatTime12_EN(applyOffset(times[currentEditingKey], tempOffset))}</div>
                                        <div className="text-[10px] font-bold mt-0.5 en-digits" style={{color: theme.palette[1]}}>{tempOffset > 0 ? "+" : ""}{tempOffset} min</div>
                                    </div>
                                    <button onClick={() => setTempOffset(p => p + 1)} className="control-btn shadow-sm" style={{color: theme.palette[0]}}><i className="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black themed-text-muted mb-3 uppercase tracking-widest text-center">تنبيه الإقامة (بالدقائق)</label>
                                <div className="flex items-center justify-between themed-bg-alt p-2 rounded-2xl border themed-card-border shadow-inner">
                                    <button onClick={() => setTempIqama(p => Math.max(0, p - 1))} className="control-btn text-red-500 shadow-sm"><i className="fa-solid fa-minus"></i></button>
                                    <div className="text-center">
                                        <div className="text-lg font-black themed-text en-digits">{tempIqama}</div>
                                        <div className="text-[10px] font-bold mt-0.5 uppercase tracking-tighter" style={{color: theme.palette[1]}}>min</div>
                                    </div>
                                    <button onClick={() => setTempIqama(p => p + 1)} className="control-btn shadow-sm" style={{color: theme.palette[0]}}><i className="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                            {renderToneSelector()}
                        </div>
                        <button onClick={saveUserConfig} className="w-full mt-8 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all" style={{backgroundColor: theme.palette[0]}}>حفظ التغييرات</button>
                    </div>
                </div>
            )}
            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default PrayerTimes;
