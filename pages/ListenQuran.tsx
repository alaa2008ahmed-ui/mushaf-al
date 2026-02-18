
import React, { useState, useEffect, useRef } from 'react';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { RECITERS, SURAH_LIST } from '../data/listenQuranData';

const STORAGE_KEY = 'listen_quran_state_v6';

const toArabicNumerals = (numStr) => String(numStr).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

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
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const { savedReciterId, savedSurahNumber } = JSON.parse(savedState);
                if (RECITERS.some(r => r.id === savedReciterId)) setReciterId(savedReciterId);
                if (SURAH_LIST.some(s => s.number === savedSurahNumber)) setSurahNumber(savedSurahNumber);
            }
        } catch (e) {
            console.error("Failed to load state from localStorage", e);
        }
    }, []);

    useEffect(() => {
        audioRef.current = new Audio();
        const audio = audioRef.current;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => handleNextSurah();
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
    }, []);

    useEffect(() => {
        if (!reciterId || !surahNumber) return;

        const audio = audioRef.current;
        if (!audio) return;
        
        const wasPlaying = !audio.paused;
        audio.pause();
        
        setIsLoading(true);
        setError('');

        const surahFormatted = String(surahNumber).padStart(3, '0');
        const audioUrl = `https://server7.mp3quran.net/${reciterId}/${surahFormatted}.mp3`;

        audio.src = audioUrl;
        audio.load();

        if (wasPlaying) {
           audio.play().catch(err => {
               console.error("Failed to autoplay:", err);
               setError('فشل التشغيل التلقائي.');
               setIsLoading(false);
           });
        } else {
            setIsLoading(false);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedReciterId: reciterId, savedSurahNumber: surahNumber }));

    }, [reciterId, surahNumber]);
    
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

    const handleNextSurah = () => setSurahNumber(s => s === 114 ? 1 : s + 1);
    const handlePrevSurah = () => setSurahNumber(s => s === 1 ? 114 : s - 1);

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
        <div className="h-screen flex flex-col">
            <header className="app-top-bar">
                <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-1">
                    <h1 className="app-top-bar__title text-xl md:text-2xl font-extrabold text-center">الاستماع للقرآن</h1>
                    <p className="app-top-bar__subtitle text-xs text-center">استمتع بتلاوات عطرة من أشهر القراء</p>
                </div>
            </header>

            <main className="w-full max-w-xl mx-auto px-4 pt-4 flex-1 overflow-y-auto pb-24 space-y-4">
                <div className="themed-card rounded-2xl p-4 space-y-3">
                     <select id="reciter-select" value={reciterId} onChange={(e) => setReciterId(e.target.value)} className="w-full p-3 rounded-lg themed-bg-alt themed-text border themed-card font-bold">
                        {RECITERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>
                     <select id="surah-select" value={surahNumber} onChange={(e) => setSurahNumber(Number(e.target.value))} className="w-full p-3 rounded-lg themed-bg-alt themed-text border themed-card font-bold">
                        {SURAH_LIST.map(s => <option key={s.number} value={s.number}>{s.number} - {s.name}</option>)}
                     </select>
                </div>
                
                <div className="themed-card rounded-2xl p-5 flex flex-col items-center justify-center space-y-4">
                    <div className="w-28 h-28 rounded-full flex items-center justify-center themed-bg-alt" style={{border: `4px solid ${theme.palette[0]}`}}>
                        <i className="fa-solid fa-quran text-5xl" style={{color: theme.palette[1]}}></i>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-amiri" style={{color: theme.palette[0]}}>{surahName}</h2>
                        <p className="text-sm themed-text-muted font-semibold">{reciterName}</p>
                    </div>

                    <div className="w-full space-y-2">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, ${theme.palette[0]} ${duration > 0 ? (currentTime / duration) * 100 : 0}%, var(--card-border) ${duration > 0 ? (currentTime / duration) * 100 : 0}%)` }}
                        />
                        <div className="flex justify-between text-xs font-mono themed-text-muted font-semibold">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button onClick={handlePrevSurah} className="p-3 rounded-full themed-bg-alt w-16 h-16 flex items-center justify-center shadow-md active:scale-95 transition">
                            <i className="fa-solid fa-forward-step fa-xl transform rotate-180" style={{color: theme.palette[1]}}></i>
                        </button>
                        <button onClick={handlePlayPause} disabled={isLoading && !isPlaying} className="p-3 rounded-full w-20 h-20 flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-50" style={{background: theme.palette[0], color: theme.textColor}}>
                            {isLoading && !isPlaying ? <i className="fa-solid fa-spinner fa-spin fa-2x"></i> : <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} fa-2x`}></i>}
                        </button>
                        <button onClick={handleNextSurah} className="p-3 rounded-full themed-bg-alt w-16 h-16 flex items-center justify-center shadow-md active:scale-95 transition">
                            <i className="fa-solid fa-forward-step fa-xl" style={{color: theme.palette[1]}}></i>
                        </button>
                    </div>

                    <div className="h-5 text-center text-xs font-semibold" style={{color: error ? '#ef4444' : 'var(--text-color-muted)'}}>
                        {isLoading ? 'جاري التحميل...' : error || 'جاهز للتشغيل'}
                    </div>
                </div>
            </main>

            <BottomBar onHomeClick={onBack} onThemesClick={() => {}} showThemes={false} />
        </div>
    );
}

export default ListenQuran;
