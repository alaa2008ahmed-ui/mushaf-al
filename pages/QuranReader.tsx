import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import './QuranReader.css'; 
import { JUZ_MAP, toArabic, THEMES, TAFSEERS } from '../components/QuranReader/constants';
import SearchModal from '../components/QuranReader/SearchModal';
import ThemesModal from '../components/QuranReader/ThemesModal';
import SettingsModal from '../components/QuranReader/SettingsModal';
import ToolbarColorPickerModal from '../components/QuranReader/ToolbarColorPickerModal';
import { QuranDownloadModal, TafsirDownloadModal } from '../components/QuranReader/DownloadModals';
import SurahJuzModal from '../components/QuranReader/SurahJuzModal';
import BookmarksModal from '../components/QuranReader/BookmarksModal';
import MushafPage from '../components/QuranReader/MushafPage';
import Toast from '../components/QuranReader/Toast';
import TafseerModal from '../components/QuranReader/TafseerModal';

// Allow access to Cordova plugins on the window object
declare var window: any;

// --- Main Component ---
interface QuranReaderProps {
    onBack: () => void;
}

const QuranReader: FC<QuranReaderProps> = ({ onBack }) => {
    const [quranData, setQuranData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState('جاري الاتصال...');
    const [loadingProgress, setLoadingProgress] = useState(0);

    const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3]);
    const [currentAyah, setCurrentAyah] = useState<{ s: number; a: number }>({ s: 1, a: 1 });
    const [highlightedAyahId, setHighlightedAyahId] = useState<string | null>(null);

    const [activeModals, setActiveModals] = useState<Record<string, boolean>>({});
    const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);
    
    const [toast, setToast] = useState({ show: false, message: '' });
    const [bookmarks, setBookmarks] = useState([]);

    const [sajdahInfo, setSajdahInfo] = useState<{ show: boolean; surah?: string; ayah?: number }>({ show: false });
    const [autoScrollState, setAutoScrollState] = useState({ isActive: false, isPaused: false, elapsedTime: 0 });
    const [hideUIOnScroll, setHideUIOnScroll] = useState(() => localStorage.getItem('hide_ui_on_scroll') === 'true');

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [playingAyah, setPlayingAyah] = useState<{s: number; a: number} | null>(null);
    
    // Tafseer State
    const [tafseerInfo, setTafseerInfo] = useState({ isOpen: false, s: 0, a: 0, text: '', surahName: '' });
    const [isTafseerLoading, setIsTafseerLoading] = useState(false);
    const tafseerCache = useRef<any>({});


    // Settings & Theme State
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('quran_settings');
        return saved ? JSON.parse(saved) : {
            fontSize: 1.7,
            fontFamily: "var(--font-noto)",
            textColor: '#1f2937',
            bgColor: '#ffffff',
            reader: 'Alafasy_128kbps',
            theme: 'light',
            scrollMinutes: 20,
            tafseer: 'ar.muyassar'
        };
    });

    const [currentTheme, setCurrentTheme] = useState(() => {
        const themeId = localStorage.getItem('current_theme_id') || 'default';
        return THEMES[themeId as keyof typeof THEMES] || THEMES['default'];
    });

    const [toolbarColors, setToolbarColors] = useState(() => {
        return JSON.parse(localStorage.getItem('toolbar_colors') || '{}');
    });
    
    const [isTransparentMode, setIsTransparentMode] = useState(() => localStorage.getItem('transparent_mode') === 'true');

    const mushafContentRef = useRef<HTMLDivElement>(null);
    const floatingMenuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const scrollIntervalRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<number | null>(null);
    const scrollAccumulatorRef = useRef(0);
    const autoScrollPausedRef = useRef(false);
    const currentAyahRef = useRef(currentAyah);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        currentAyahRef.current = currentAyah;
    }, [currentAyah]);
    
    const showToast = useCallback((message: string) => {
        setToast({ show: true, message });
    }, []);

    const showSajdahNotification = useCallback((surah, ayah) => {
        setSajdahInfo({ show: true, surah, ayah });
        setTimeout(() => setSajdahInfo({ show: false }), 4000);
    }, []);

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        setIsPlaying(false);
        setIsAudioLoading(false);
        setPlayingAyah(null);
    }, []);

    const closeModal = useCallback((modalName: string) => {
        setActiveModals(p => ({ ...p, [modalName]: false }));
    }, []);

    const playAudio = useCallback((s: number, a: number) => {
        if (!audioRef.current) return;
        
        setIsAudioLoading(true);
        const surahStr = String(s).padStart(3, '0');
        const ayahStr = String(a).padStart(3, '0');
        const audioUrl = `https://everyayah.com/data/${settings.reader}/${surahStr}${ayahStr}.mp3`;
        
        audioRef.current.src = audioUrl;
        const playPromise = audioRef.current.play();
    
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'AbortError') {
              console.log("Audio playback interrupted. This is an expected behavior.");
              return;
            }
            
            showToast('فشل تشغيل الصوت.');
            console.error("Audio play failed:", error);
            stopAudio();
          });
        }
    }, [settings.reader, showToast, stopAudio]);

    const openModal = useCallback((modalName: string) => {
        stopAudio();
        setActiveModals(p => ({...p, [modalName]: true}));
    }, [stopAudio]);

    const playNextAyah = useCallback(() => {
        if (!quranData || !playingAyah) return stopAudio();
    
        const { s, a } = playingAyah;
        const surah = quranData.surahs[s - 1];
        if (!surah) return stopAudio();
    
        if (a < surah.ayahs.length) {
            const nextAyah = { s, a: a + 1 };
            setPlayingAyah(nextAyah);
            setCurrentAyah(nextAyah);
            setHighlightedAyahId(`ayah-${s}-${a + 1}`);
            
            document.getElementById(`ayah-${s}-${a + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            playAudio(s, a + 1);
        } else {
            stopAudio();
            showToast('انتهت السورة');
        }
    }, [quranData, playingAyah, stopAudio, playAudio]);
    
    const handleVerseClick = useCallback((s: number, a: number, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!quranData) return;
        const surah = quranData.surahs.find((su: any) => su.number === s);
        if (surah) {
            setIsTafseerLoading(true);
            setTafseerInfo({ isOpen: true, s, a, text: '', surahName: surah.name });
        }
    }, [quranData]);
    
    useEffect(() => {
        const fetchTafseer = async () => {
            if (!tafseerInfo.isOpen) return;

            const currentTafseerId = settings.tafseer || 'ar.muyassar';
            const cacheKey = `${tafseerInfo.s}_${currentTafseerId}`;

            try {
                if (!tafseerCache.current[cacheKey]) {
                    const res = await fetch(`https://api.alquran.cloud/v1/surah/${tafseerInfo.s}/${currentTafseerId}`);
                    const data = await res.json();
                    if (data.code === 200) {
                        tafseerCache.current[cacheKey] = data.data.ayahs;
                    } else {
                        throw new Error('Failed to fetch tafseer data');
                    }
                }

                const surahTafseer = tafseerCache.current[cacheKey];
                const ayahTafseer = surahTafseer?.[tafseerInfo.a - 1];
                setTafseerInfo(prev => ({ ...prev, text: ayahTafseer?.text || "التفسير غير متوفر لهذه الآية." }));

            } catch (e) {
                console.error("Tafseer fetch failed:", e);
                setTafseerInfo(prev => ({...prev, text: 'خطأ في تحميل التفسير. يرجى التحقق من اتصالك بالإنترنت.'}));
            } finally {
                setIsTafseerLoading(false);
            }
        };

        fetchTafseer();
    }, [tafseerInfo.isOpen, tafseerInfo.s, tafseerInfo.a, settings.tafseer]);


    useEffect(() => {
        audioRef.current = new Audio();
        const audio = audioRef.current;

        const onPlay = () => { setIsPlaying(true); setIsAudioLoading(false); };
        const onPause = () => setIsPlaying(false);
        const onWaiting = () => setIsAudioLoading(true);
        const onPlaying = () => setIsAudioLoading(false);
        const onEnded = () => {
            setIsPlaying(false);
            playNextAyah();
        };
        const onError = () => {
            const audio = audioRef.current;
            if (!audio) return;

            if (!audio.src || (audio.error && (audio.error.code === 4 || audio.error.code === 20))) { // MEDIA_ERR_ABORTED (4) or empty src
                console.log("Audio playback stopped or aborted, likely intentionally. No error toast will be shown.");
                setIsAudioLoading(false);
                setIsPlaying(false);
                return;
            }
            
            setIsAudioLoading(false);
            setIsPlaying(false);
            showToast('خطأ في تحميل المقطع الصوتي.');
            console.error("Audio error occurred:", audio.error);
        };
        
        audio.addEventListener('play', onPlay);
        audio.addEventListener('playing', onPlaying);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('waiting', onWaiting);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.pause();
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('playing', onPlaying);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('waiting', onWaiting);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
        };
    }, [playNextAyah, showToast]);

    const toggleAudio = useCallback(() => {
        if (isPlaying || isAudioLoading) {
            stopAudio();
        } else {
            if (currentAyah) {
                setPlayingAyah(currentAyah);
                playAudio(currentAyah.s, currentAyah.a);
                const ayahId = `ayah-${currentAyah.s}-${currentAyah.a}`;
                setHighlightedAyahId(ayahId);
                document.getElementById(ayahId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                showToast('الرجاء اختيار آية للبدء');
            }
        }
    }, [isPlaying, isAudioLoading, currentAyah, playAudio, stopAudio]);

    useEffect(() => {
        const handleThemeChange = () => {
            const themeId = localStorage.getItem('current_theme_id') || 'default';
            const newTheme = THEMES[themeId as keyof typeof THEMES] || THEMES['default'];
            setCurrentTheme(newTheme);
            
            const savedSettings = localStorage.getItem('quran_settings');
            let currentSettings = savedSettings ? JSON.parse(savedSettings) : settings;
            
            const updatedSettings = {
                ...currentSettings,
                bgColor: newTheme.bg,
                textColor: newTheme.text,
                fontFamily: newTheme.font,
            };
            
            setSettings(updatedSettings);
            localStorage.setItem('quran_settings', JSON.stringify(updatedSettings));
            setToolbarColors(JSON.parse(localStorage.getItem('toolbar_colors') || '{}'));
            setIsTransparentMode(localStorage.getItem('transparent_mode') === 'true');
        };

        const handleSettingsChange = () => {
            const saved = localStorage.getItem('quran_settings');
            if (saved) setSettings(JSON.parse(saved));
            setToolbarColors(JSON.parse(localStorage.getItem('toolbar_colors') || '{}'));
            setHideUIOnScroll(localStorage.getItem('hide_ui_on_scroll') === 'true');
            setIsTransparentMode(localStorage.getItem('transparent_mode') === 'true');
        };

        window.addEventListener('theme-change', handleThemeChange);
        window.addEventListener('settings-change', handleSettingsChange);

        return () => {
            window.removeEventListener('theme-change', handleThemeChange);
            window.removeEventListener('settings-change', handleSettingsChange);
        };
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-sajdah', currentTheme.sajdah);
        root.style.setProperty('--search-result-bg', currentTheme.cardBg);
        root.style.setProperty('--search-result-border', currentTheme.accent);
        root.style.setProperty('--search-result-text', currentTheme.cardText);
        
        const darkBgs = ['#000000', '#2c241b', '#101010', '#0f172a', '#2e1065'];
        const isDark = currentTheme.bg && darkBgs.includes(currentTheme.bg.toLowerCase());

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [currentTheme]);

    useEffect(() => {
        const loadQuranData = async () => {
             try {
                const local = localStorage.getItem('quran_data');
                if (local) setQuranData(JSON.parse(local));
                else {
                    setLoadingProgress(30); setLoadingStatus('جاري تحميل بيانات القرآن...');
                    const res = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
                    setLoadingProgress(70);
                    const data = await res.json();
                    if (data.code === 200) {
                        setQuranData(data.data);
                        localStorage.setItem('quran_data', JSON.stringify(data.data));
                    }
                }
            } catch (e) { setLoadingStatus('فشل التحميل. يرجى التحقق من اتصالك.'); }
        };
        loadQuranData();
    }, []);
    
    useEffect(() => {
        if(quranData) {
            setLoadingProgress(100);
            setTimeout(() => {
                setIsLoading(false);
                const lastPos = JSON.parse(localStorage.getItem('last_pos') || '{}');
                jumpToAyah(lastPos.s || 1, lastPos.a || 1, true);
            }, 300);
        }
    }, [quranData]);
    
    useEffect(() => {
        if (activeModals['bookmarks-modal']) {
            const storedBookmarks = JSON.parse(localStorage.getItem('quran_bookmarks_list') || '[]');
            setBookmarks(storedBookmarks);
        }
    }, [activeModals['bookmarks-modal']]);

    useEffect(() => {
        const contentEl = mushafContentRef.current;
        if (!contentEl) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = contentEl;
            const atTop = scrollTop < clientHeight;
            const atBottom = scrollHeight - scrollTop <= clientHeight + 200;

            if (atTop) {
                const firstPage = Math.min(...visiblePages);
                if (firstPage > 1) {
                    setVisiblePages(prev => [firstPage - 1, ...prev]);
                }
            }

            if (atBottom) {
                const lastPage = Math.max(...visiblePages);
                if (lastPage < 604) {
                     setVisiblePages(prev => [...prev, lastPage + 1]);
                }
            }
        };

        contentEl.addEventListener('scroll', handleScroll);
        return () => contentEl.removeEventListener('scroll', handleScroll);
    }, [visiblePages]);

    const getPageData = useCallback((pageNum) => quranData ? quranData.surahs.flatMap(s => s.ayahs.filter(a => a.page === pageNum).map(a => ({ ...a, sNum: s.number, sName: s.name }))) : [], [quranData]);
    const handleAyahClick = useCallback((s, a) => {
        setHighlightedAyahId(`ayah-${s}-${a}`);
        setCurrentAyah({ s, a });
        localStorage.setItem('last_pos', JSON.stringify({ s, a }));
    }, []);
    const jumpToAyah = useCallback((s, a, instant = false) => {
        stopAudio();
        if (!quranData) return;
        const surah = quranData.surahs.find(su => su.number === s);
        const ayah = surah?.ayahs.find(ay => ay.numberInSurah === a);
        if (!ayah) return;
        const p = Number(ayah.page);
        setVisiblePages([...new Set([p, p + 1, p + 2, p - 1, p - 2])].filter(n => n > 0 && n <= 604).sort((a,b) => a-b));
        setTimeout(() => {
            const el = document.getElementById(`ayah-${s}-${a}`);
            if (el) {
                el.scrollIntoView({ block: 'center', behavior: instant ? 'auto' : 'smooth' });
                handleAyahClick(s, a);
            } else {
                handleAyahClick(s, a);
            }
        }, 100);
        setActiveModals({});
    }, [quranData, handleAyahClick, stopAudio]);
    const saveBookmark = () => { if (!currentAyah) { showToast('اختر آية أولاً'); return; } const storedBookmarks = JSON.parse(localStorage.getItem('quran_bookmarks_list') || '[]'); const date = new Date(); const newBookmark = { id: Date.now(), s: currentAyah.s, a: currentAyah.a, date: date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }), time: date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }; const newBookmarks = [newBookmark, ...storedBookmarks]; localStorage.setItem('quran_bookmarks_list', JSON.stringify(newBookmarks)); setBookmarks(newBookmarks); showToast('تم حفظ الإشارة المرجعية'); };
    const deleteBookmark = (id) => { const newBookmarks = bookmarks.filter(b => b.id !== id); localStorage.setItem('quran_bookmarks_list', JSON.stringify(newBookmarks)); setBookmarks(newBookmarks); };

    const PAGES_PER_JUZ = 20;
    const PAGE_HEIGHT_FALLBACK = 1300;

    const updateHeadersDuringAutoScroll = () => {
        const content = mushafContentRef.current;
        if (!content) return;
        
        const topOffset = 80; 
        const x = window.innerWidth / 2; 
        const y = content.getBoundingClientRect().top + topOffset; 
        
        const el = document.elementFromPoint(x, y); 
        if (!el) return;
        
        const ayahBlock = el.closest('.ayah-text-block');
        if (ayahBlock && ayahBlock.id) {
            const parts = ayahBlock.id.split('-'); 
            if (parts.length === 3) {
                const s = parseInt(parts[1]); 
                const a = parseInt(parts[2]);
                
                if (s !== currentAyahRef.current.s || a !== currentAyahRef.current.a) {
                    setCurrentAyah({ s, a });
                    currentAyahRef.current = { s, a };
                }
            }
        }
    };

    const stopAutoScroll = (showTimer = true) => {
        if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        scrollIntervalRef.current = null;
        timerIntervalRef.current = null;
        autoScrollPausedRef.current = false;
        setAutoScrollState(prev => ({ ...prev, isActive: false, isPaused: false }));
        if (showTimer) {
          setTimeout(() => setAutoScrollState(p => ({...p, elapsedTime: 0})), 3000);
        } else {
           setAutoScrollState(p => ({...p, elapsedTime: 0}));
        }
    };
    
    const startAutoScroll = () => {
        if (!mushafContentRef.current) return;
        stopAutoScroll(false);
        setAutoScrollState({ isActive: true, isPaused: false, elapsedTime: 0 });
        scrollAccumulatorRef.current = 0;
        autoScrollPausedRef.current = false;

        const minutesPerJuz = parseInt(String(settings.scrollMinutes), 10) || 20;
        const tickRate = 20;
        
        const content = mushafContentRef.current;
        const pages = content.querySelectorAll('.mushaf-page');
        let totalHeight = 0;
        let count = 0;
        pages.forEach((page: any) => {
            const h = page.offsetHeight;
            if (h) { totalHeight += h; count++; }
        });
        const pageHeight = count ? (totalHeight / count) : (content.clientHeight || PAGE_HEIGHT_FALLBACK);
        
        const totalPixels = pageHeight * PAGES_PER_JUZ;
        const totalTimeMs = minutesPerJuz * 60 * 1000;
        
        if (totalPixels <= 0 || totalTimeMs <= 0) return;
        
        scrollIntervalRef.current = window.setInterval(() => {
            if (!mushafContentRef.current || autoScrollPausedRef.current) return;

            const pixelsPerTick = (totalPixels / totalTimeMs) * tickRate;
            scrollAccumulatorRef.current += pixelsPerTick;
            
            if (scrollAccumulatorRef.current >= 1) {
                const pixelsToMove = Math.floor(scrollAccumulatorRef.current);
                mushafContentRef.current.scrollTop += pixelsToMove;
                scrollAccumulatorRef.current -= pixelsToMove;
                
                updateHeadersDuringAutoScroll();
            }
        }, tickRate);

        timerIntervalRef.current = window.setInterval(() => {
             if (!autoScrollPausedRef.current) {
                 setAutoScrollState(prev => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }));
             }
        }, 1000);
    };

    const toggleAutoScroll = () => {
        if (autoScrollState.isActive) {
            stopAutoScroll();
        } else {
            startAutoScroll();
            showToast('تم تفعيل التمرير التلقائي');
        }
    };
    const pauseResumeAutoScroll = () => {
      if (autoScrollState.isActive) {
        const newPausedState = !autoScrollState.isPaused;
        autoScrollPausedRef.current = newPausedState;
        setAutoScrollState(p => ({...p, isPaused: newPausedState }));
      }
    };

     const getToolbarStyle = (type: string, defaultBg: string, defaultText: string, defaultBorder: string) => {
         const config = toolbarColors[type];
         
         if (isTransparentMode && (type === 'top-toolbar' || type === 'bottom-toolbar')) {
             return {
                 backgroundColor: 'transparent',
                 color: config?.text || defaultText,
                 borderColor: 'transparent',
                 boxShadow: 'none',
                 backdropFilter: 'none',
                 WebkitBackdropFilter: 'none',
                 position: 'fixed' as 'fixed',
                 left: 0,
                 right: 0,
                 zIndex: 50,
                 ...(type === 'top-toolbar' ? { top: 0 } : { bottom: 0 })
             };
         }

         if (config) {
             return {
                 backgroundColor: config.bg,
                 color: config.text,
                 borderColor: config.border,
                 fontFamily: config.font || 'inherit'
             };
         }
         return {
             backgroundColor: defaultBg,
             color: defaultText,
             borderColor: defaultBorder
         };
     };

     if (isLoading) { return <div id="loader" className="fixed inset-0 bg-[#1f2937] text-white z-[9999] flex flex-col items-center justify-center"><div className="text-2xl font-bold mb-4">جاري تحميل المصحف...</div><div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden"><div id="progress-bar" className="h-full bg-green-500 transition-all duration-300" style={{width: `${loadingProgress}%`}}></div></div><div id="loader-status" className="mt-2 text-sm text-gray-400">{loadingStatus}</div></div> }
    
    const surahName = quranData?.surahs[currentAyah.s - 1]?.name.replace('سورة', '').trim() || '';
    const juz = JUZ_MAP.slice().reverse().find(j => (currentAyah.s > j.s) || (currentAyah.s === j.s && currentAyah.a >= j.a))?.j || 1;
    const page = quranData?.surahs[currentAyah.s - 1]?.ayahs.find(ay => ay.numberInSurah === currentAyah.a)?.page || 1;
    const tafseerName = TAFSEERS.find(t => t.id === settings.tafseer)?.name || 'التفسير';

    const renderPlayButtonIcon = () => {
        if (isAudioLoading) {
            return <span className="text-emerald-500 font-bold animate-pulse text-xs">جاري..</span>;
        }
        if (isPlaying) {
            return <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>;
        }
        return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>;
    };

    return (
        <div 
            className={`quran-reader-container ${autoScrollState.isActive && !autoScrollState.isPaused && hideUIOnScroll ? 'fullscreen-active' : ''}`} 
            id="app-container"
            style={{
                backgroundColor: settings.bgColor,
                color: settings.textColor,
                fontFamily: settings.fontFamily,
                position: 'relative',
                height: '100dvh',
                overflow: 'hidden'
            } as React.CSSProperties}
        >
            <header 
                id="header" 
                className="header-default flex-none z-50 flex items-center px-4 justify-between border-b shadow-xl w-full gap-2"
                style={getToolbarStyle('top-toolbar', currentTheme.barBg, currentTheme.barText, currentTheme.barBorder)}
            >
                <button id="surah-name-header" onClick={() => openModal('surah-modal')} className="top-bar-text-button" style={getToolbarStyle('surah', currentTheme.barBg, currentTheme.barText, currentTheme.barBorder)}><span>{surahName} - آية {toArabic(currentAyah.a)}</span></button>
                <button id="juz-number-header" onClick={() => openModal('juz-modal')} className="top-bar-text-button" style={getToolbarStyle('juz', currentTheme.barBg, currentTheme.barText, currentTheme.barBorder)}>الجزء {toArabic(juz)}</button>
                <button id="header-page" className="top-bar-text-button cursor-default" style={getToolbarStyle('page', currentTheme.barBg, currentTheme.barText, currentTheme.barBorder)}>ص {toArabic(page)}</button>
                <button id="btn-play" onClick={toggleAudio} className="top-bar-text-button" style={getToolbarStyle('audio', currentTheme.barBg, currentTheme.barText, currentTheme.barBorder)}>
                    <span id="play-icon-svg">{renderPlayButtonIcon()}</span>
                </button>
            </header>

            <ReadingTimer isVisible={autoScrollState.isPaused || (!autoScrollState.isActive && autoScrollState.elapsedTime > 0)} elapsedTime={autoScrollState.elapsedTime} />

            <div 
                id="mushaf-content" 
                ref={mushafContentRef} 
                onClick={pauseResumeAutoScroll} 
                className="flex-grow overflow-y-auto w-full relative touch-pan-y"
                style={isTransparentMode ? { position: 'absolute', top: 0, bottom: 0, height: '100%', zIndex: 0, paddingTop: '80px', paddingBottom: '80px' } : {}}
            >
                <div id="pages-container" className="full-mushaf-container">
                   {[...new Set(visiblePages)].sort((a,b) => a-b).map(pageNum => (
                        <MushafPage key={pageNum} pageNum={pageNum} pageData={getPageData(pageNum)} highlightedAyahId={highlightedAyahId} onAyahClick={handleAyahClick} onVerseClick={handleVerseClick} onSajdahVisible={showSajdahNotification} settings={settings} />
                   ))}
                </div>
            </div>
            
            <SajdahNotification isVisible={sajdahInfo.show} surah={sajdahInfo.surah} ayah={sajdahInfo.ayah} />
            
            <div id="floating-menu" className={isFloatingMenuOpen ? 'open' : ''} ref={floatingMenuRef}>
                 <button onClick={() => { openModal('bookmarks-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-green w-full justify-between mb-2" style={getToolbarStyle('btn-bookmarks-list', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}><span>قائمة الإشارات</span><i className="fa-solid fa-list"></i></button>
                 <button onClick={() => { openModal('search-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-purple w-full justify-between mb-2" style={getToolbarStyle('btn-search', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}><span>البحث</span><i className="fa-solid fa-search"></i></button>
                 <button onClick={() => { openModal('themes-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-green w-full justify-between mb-2" style={getToolbarStyle('btn-themes', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}><span>الثيمات</span><i className="fa-solid fa-palette"></i></button>
                 <button onClick={() => { openModal('settings-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-purple w-full justify-between" style={getToolbarStyle('btn-settings', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}><span>الإعدادات</span><i className="fa-solid fa-cog"></i></button>
            </div>


            <footer 
                id="bottom-bar" 
                className="footer-default flex-none border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 flex justify-around items-center px-1 py-2 w-full"
                style={getToolbarStyle('bottom-toolbar', currentTheme.barBg, currentTheme.barText, currentTheme.barBorder)}
            >
                <button ref={menuButtonRef} id="btn-menu" onClick={() => setIsFloatingMenuOpen(p => !p)} className="bottom-bar-button btn-purple flex-1 mx-1 h-10" style={getToolbarStyle('btn-menu', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}><i className="fa-solid fa-bars"></i><span className="hidden sm:inline">القائمة</span></button>
                <button id="btn-bookmark" onClick={saveBookmark} className="bottom-bar-button btn-green flex-1 mx-1 h-10" style={getToolbarStyle('btn-bookmark', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}><i className="fa-solid fa-bookmark"></i><span className="hidden sm:inline">حفظ</span></button>
                <button id="btn-autoscroll" onClick={toggleAutoScroll} className={`bottom-bar-button btn-purple flex-1 mx-1 h-10 ${autoScrollState.isActive ? 'btn-autoscroll-active' : ''}`} style={getToolbarStyle('btn-autoscroll', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}>
                    {autoScrollState.isActive ? <i className="fa-solid fa-pause"></i> : <i className="fa-solid fa-arrow-down"></i>}
                    <span className="hidden sm:inline">{autoScrollState.isActive ? "إيقاف" : "تمرير"}</span>
                </button>
                <button id="btn-home" onClick={onBack} className="bottom-bar-button btn-green flex-1 mx-1 h-10" style={getToolbarStyle('btn-home', currentTheme.btnBg, currentTheme.btnText, currentTheme.btnBg)}><i className="fa-solid fa-home"></i><span className="hidden sm:inline">الرئيسية</span></button>
            </footer>
            
            {activeModals['surah-modal'] && <SurahJuzModal type="surah" quranData={quranData} onSelect={(s, a) => jumpToAyah(s, a)} onClose={() => closeModal('surah-modal')} />}
            {activeModals['juz-modal'] && <SurahJuzModal type="juz" quranData={quranData} onSelect={(j: number) => jumpToAyah(JUZ_MAP[j - 1].s, JUZ_MAP[j - 1].a)} onClose={() => closeModal('juz-modal')} />}
            {activeModals['bookmarks-modal'] && <BookmarksModal bookmarks={bookmarks} quranData={quranData} onSelect={(s,a) => jumpToAyah(s,a)} onDelete={deleteBookmark} onClose={() => closeModal('bookmarks-modal')} />}
            {activeModals['search-modal'] && <SearchModal quranData={quranData} onSelect={(s,a) => jumpToAyah(s,a)} onClose={() => closeModal('search-modal')} />}
            {activeModals['themes-modal'] && <ThemesModal onClose={() => closeModal('themes-modal')} showToast={showToast} />}
            {activeModals['settings-modal'] && <SettingsModal onClose={() => closeModal('settings-modal')} onOpenModal={openModal} showToast={showToast} />}
            {activeModals['toolbar-color-picker-modal'] && <ToolbarColorPickerModal onClose={() => closeModal('toolbar-color-picker-modal')} onOpenModal={openModal} showToast={showToast} currentTheme={currentTheme} toolbarColors={toolbarColors} />}
            {activeModals['quran-download-modal'] && <QuranDownloadModal onClose={() => closeModal('quran-download-modal')} quranData={quranData} showToast={showToast} />}
            {activeModals['tafsir-download-modal'] && <TafsirDownloadModal onClose={() => closeModal('tafsir-download-modal')} quranData={quranData} showToast={showToast} />}
            
            <TafseerModal
                isOpen={tafseerInfo.isOpen}
                isLoading={isTafseerLoading}
                title={`${tafseerName} - ${tafseerInfo.surahName.replace('سورة','').trim()} - آية ${toArabic(tafseerInfo.a)}`}
                text={tafseerInfo.text}
                onClose={() => setTafseerInfo(p => ({ ...p, isOpen: false }))}
            />

            <Toast message={toast.message} show={toast.show} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
        </div>
    );
};

const ReadingTimer: FC<{isVisible: boolean, elapsedTime: number}> = ({isVisible, elapsedTime}) => {
    const minutes = Math.floor(Number(elapsedTime) / 60).toString().padStart(2, '0');
    const seconds = (Number(elapsedTime) % 60).toString().padStart(2, '0');
    return (
        <div className={`reading-timer ${isVisible ? 'show' : ''}`}>
            {toArabic(`${minutes}:${seconds}`)}
        </div>
    );
};

const SajdahNotification: FC<{isVisible: boolean, surah?: string, ayah?: number}> = ({isVisible, surah, ayah}) => (
    <div className={`sajdah-notification ${isVisible ? 'show' : ''}`}>
        <div className="p-2 rounded-full"><i className="fa-solid fa-mosque"></i></div>
        <div>
            <div className="font-bold text-sm">سجدة تلاوة</div>
            <div className="text-xs mt-0.5">سورة {surah} - آية {toArabic(ayah || '')}</div>
        </div>
    </div>
);

export default QuranReader;
