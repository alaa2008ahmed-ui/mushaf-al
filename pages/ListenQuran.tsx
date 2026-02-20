import React, { useState, useEffect, useRef } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { RECITERS, SURAH_LIST } from '../data/listenQuranData';

const STORAGE_KEY = 'listen_quran_state_v7';

// FIX: Correctly convert digits to numbers for array indexing.
const toArabicNumerals = (numStr) => String(numStr).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return toArabicNumerals('00:00');
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return toArabicNumerals(`${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
}

function ListenQuran({ onBack }) {
    const { theme } = useTheme();
    const [reciterId, setReciterId] = useState(RECITERS[0].id);
    const [surahNumber, setSurahNumber] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isContinuousPlay, setIsContinuousPlay] = useState(true);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const autoPlayNextRef = useRef(false);

    useEffect(() => {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const { savedReciterId, savedSurahNumber, savedContinuousPlay } = JSON.parse(savedState);
                if (RECITERS.some(r => r.id === savedReciterId)) setReciterId(savedReciterId);
                if (SURAH_LIST.some(s => s.number === savedSurahNumber)) setSurahNumber(savedSurahNumber);
                if (typeof savedContinuousPlay === 'boolean') setIsContinuousPlay(savedContinuousPlay);
            }
        } catch (e) {
            console.error("Failed to load state from localStorage", e);
        }
    }, []);

    const handleNextSurah = () => setSurahNumber(s => s === 114 ? 1 : s + 1);
    const handlePrevSurah = () => setSurahNumber(s => s === 1 ? 114 : s - 1);

    useEffect(() => {
        audioRef.current = new Audio();
        const audio = audioRef.current;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
             if (isContinuousPlay) {
                autoPlayNextRef.current = true;
                handleNextSurah();
             } else {
                setIsPlaying(false);
                setCurrentTime(0);
             }
        };
        const handleWaiting = () => setIsLoading(true);
        const handlePlaying = () => setIsLoading(false);
        const handleError = () => {
            setError('خطأ في تحميل المقطع الصوتي. قد يكون غير متوفر حاليًا.');
            setIsLoading(false);
            setIsPlaying(false);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);

        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
        };
    }, [isContinuousPlay]); // Re-attach ended listener if continuous play setting changes

    useEffect(() => {
        if (!reciterId || !surahNumber) return;

        const audio = audioRef.current;
        if (!audio) return;
        
        const wasPlaying = !audio.paused;
        audio.pause();
        
        setIsLoading(true);
        setError('');

        const surahFormatted = String(surahNumber).padStart(3, '0');
        const audioUrl = `${reciterId}/${surahFormatted}.mp3`;

        audio.src = audioUrl;
        audio.load();

        if (wasPlaying || autoPlayNextRef.current) {
           audio.play().catch(err => {
               console.error("Failed to autoplay:", err);
               setError('فشل التشغيل التلقائي.');
               setIsLoading(false);
           });
           if (autoPlayNextRef.current) {
               autoPlayNextRef.current = false;
           }
        } else {
            setIsLoading(false);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            savedReciterId: reciterId, 
            savedSurahNumber: surahNumber,
            savedContinuousPlay: isContinuousPlay,
        }));

    }, [reciterId, surahNumber]);
    
     useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
             savedReciterId: reciterId, 
             savedSurahNumber: surahNumber,
             savedContinuousPlay: isContinuousPlay 
        }));
    }, [isContinuousPlay]);
    
    const handlePlayPause = async () => {
        const audio = audioRef.current;
        if (!audio || !audio.src) return;
        setError('');
        if (isPlaying) {
            audio.pause();
        } else {
            try {
                await audio.play();
            } catch (err) {
                setError("لم يتمكن المتصفح من تشغيل الصوت تلقائيًا.");
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (audio) {
            audio.currentTime = Number(e.target.value);
            setCurrentTime(audio.currentTime);
        }
    };
    
    const reciterName = RECITERS.find(r => r.id === reciterId)?.name || 'غير معروف';
    const surahName = SURAH_LIST.find(s => s.number === surahNumber)?.name || 'غير معروفة';

    return (
        <div className="h-screen flex flex-col font-cairo overflow-hidden" style={{ backgroundColor: theme.bg, color: theme.textColor }}>
            <header className="app-top-bar">
                <div className="app-top-bar__inner">
                    <h1 className="app-top-bar__title text-2xl font-kufi">الاستماع للقرآن</h1>
                    <p className="app-top-bar__subtitle">تلاوات عطرة من أشهر القراء</p>
                </div>
            </header>

            <main className="w-full max-w-md mx-auto flex-1 flex flex-col p-4 z-10">

                <div className="space-y-3 flex-shrink-0 py-4">
                    <select id="reciter-select" value={reciterId} onChange={(e) => setReciterId(e.target.value)} className="w-full p-3 text-center rounded-xl border font-bold appearance-none themed-card">
                        {RECITERS.map(r => <option key={r.id} value={r.id} className="bg-slate-800">{r.name}</option>)}
                    </select>
                    <select id="surah-select" value={surahNumber} onChange={(e) => setSurahNumber(Number(e.target.value))} className="w-full p-3 text-center rounded-xl border font-bold appearance-none themed-card">
                        {SURAH_LIST.map(s => <option key={s.number} value={s.number} className="bg-slate-800">{s.number} - {s.name}</option>)}
                    </select>
                </div>



                <div className="themed-card rounded-3xl p-6 space-y-5 flex-shrink-0">
                    <div className="w-full space-y-1.5">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, ${theme.palette[0]} ${duration > 0 ? (currentTime / duration) * 100 : 0}%, ${theme.cardBorder} ${duration > 0 ? (currentTime / duration) * 100 : 0}%)` }}
                        />
                        <div className="flex justify-between text-xs font-mono" style={{ color: theme.textColor, opacity: 0.7 }}>
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button onClick={handlePrevSurah} className="w-24 text-center hover:opacity-80 transition-opacity font-bold" style={{ color: theme.textColor }}>
                            السابق
                        </button>
                        <button onClick={handlePlayPause} disabled={isLoading && !isPlaying} className="bg-white text-slate-900 rounded-full w-20 h-20 flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-70" style={{ backgroundColor: theme.palette[0], color: theme.btnText }}>
                            {isLoading && !isPlaying ? <i className="fa-solid fa-spinner fa-spin fa-2x"></i> : <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} fa-2x pl-1`}></i>}
                        </button>
                        <button onClick={handleNextSurah} className="w-24 text-center hover:opacity-80 transition-opacity font-bold" style={{ color: theme.textColor }}>
                            التالى
                        </button>
                    </div>

                </div>

                <div className="pt-6 pb-2 flex-shrink-0">
                     <div className="themed-card rounded-xl p-3 flex items-center justify-between">
                        <label htmlFor="continuous-play-toggle" className="font-bold text-sm flex items-center gap-2" style={{ color: theme.textColor }}>
                            <i className="fa-solid fa-repeat" style={{ color: theme.palette[0] }}></i>
                            <span>تشغيل متواصل</span>
                        </label>
                        <button
                            id="continuous-play-toggle"
                            onClick={() => setIsContinuousPlay(prev => !prev)}
                            className={`relative w-12 h-7 rounded-full transition-colors`}
                            style={{ backgroundColor: isContinuousPlay ? theme.palette[0] : theme.cardBorder }}
                            aria-checked={isContinuousPlay}
                            role="switch"
                        >
                            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ease-in-out ${isContinuousPlay ? 'left-6' : 'left-1'}`}></span>
                        </button>
                    </div>
                    <p className="text-xs text-center mt-2" style={{ color: theme.textColor, opacity: 0.6 }}>ملاحظة: لا تعمل هذه الصفحة إلا إذا كنت متصلاً بالإنترنت، ويفضل الواي فاي.</p>
                </div>
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default ListenQuran;