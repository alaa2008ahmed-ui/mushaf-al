
import React, { useState, useEffect, useRef, useCallback, FC, useMemo } from 'react';
import './QuranReader.css'; 

// --- DATA CONSTANTS ---
const JUZ_MAP = [{j:1,s:1,a:1},{j:2,s:2,a:142},{j:3,s:2,a:253},{j:4,s:3,a:93},{j:5,s:4,a:24},{j:6,s:4,a:148},{j:7,s:5,a:82},{j:8,s:6,a:111},{j:9,s:7,a:88},{j:10,s:8,a:41},{j:11,s:9,a:93},{j:12,s:11,a:6},{j:13,s:12,a:53},{j:14,s:15,a:1},{j:15,s:17,a:1},{j:16,s:18,a:75},{j:17,s:21,a:1},{j:18,s:23,a:1},{j:19,s:25,a:21},{j:20,s:27,a:56},{j:21,s:29,a:46},{j:22,s:33,a:31},{j:23,s:36,a:28},{j:24,s:39,a:32},{j:25,s:41,a:47},{j:26,s:46,a:1},{j:27,s:51,a:31},{j:28,s:58,a:1},{j:29,s:67,a:1},{j:30,s:78,a:1}];
const SAJDAH_LOCATIONS = [{s:7, a:206}, {s:13, a:15}, {s:16, a:50}, {s:17, a:109}, {s:19, a:58}, {s:22, a:18}, {s:22, a:77}, {s:25, a:60}, {s:27, a:26}, {s:32, a:15}, {s:38, a:24}, {s:41, a:38}, {s:53, a:62}, {s:84, a:21}, {s:96, a:19}];
const THEMES = {
    default: { name: "الافتراضي", bg: "#f3f4f6", text: "#000000", font: "var(--font-amiri)", barBg: "#ffffff", barText: "#10b981", barBorder: "#e5e7eb", btnBg: "#10b981", btnText: "#ffffff", accent: "#10b981", accentText: "#ffffff", modalBg: "#ffffff", modalText: "#000000", headerBg: "#10b981", headerText: "#ffffff", cardBg: "#ffffff", cardText: "#000000", cardBorder: "#10b981", sajdah: "#d97706" },
    cream: { name: "ورق قديم", bg: "#fefbf1", text: "#3d3328", font: "var(--font-amiri-quran)", barBg: "#ede6d3", barText: "#5c4d3c", barBorder: "#d4c5a9", btnBg: "#8c7b65", btnText: "#fffbf0", accent: "#8c7b65", accentText: "#fffbf0", modalBg: "#fffbf0", modalText: "#3d3328", headerBg: "#8c7b65", headerText: "#fffbf0", cardBg: "#ede6d3", cardText: "#3d3328", cardBorder: "#c2b092", sajdah: "#b45309" },
    deep_black: { name: "أسود كامل", bg: "#000000", text: "#ffffff", font: "var(--font-amiri)", barBg: "#000000", barText: "#ffffff", barBorder: "#333333", btnBg: "#000000", btnText: "#ffffff", accent: "#ffffff", accentText: "#000000", modalBg: "#000000", modalText: "#ffffff", headerBg: "#000000", headerText: "#ffffff", cardBg: "#111111", cardText: "#ffffff", cardBorder: "#333333", sajdah: "#fbbf24" },
    golden_age: { name: "عصر ذهبي", bg: "#2c241b", text: "#eecfa1", font: "var(--font-gulzar)", barBg: "#463a2f", barText: "#eecfa1", barBorder: "#8a6d3b", btnBg: "#8a6d3b", btnText: "#2c241b", accent: "#eecfa1", accentText: "#2c241b", modalBg: "#463a2f", modalText: "#eecfa1", headerBg: "#2c241b", headerText: "#eecfa1", cardBg: "#3e3228", cardText: "#ffffff", cardBorder: "#8a6d3b", sajdah: "#f59e0b", tafseerText: "#ffffff" },
    andalusia: { name: "أندلس", bg: "#fff7ed", text: "#7c2d12", font: "var(--font-aref)", barBg: "#ffedd5", barText: "#9a3412", barBorder: "#fdba74", btnBg: "#15803d", btnText: "#ffffff", accent: "#15803d", accentText: "#ffffff", modalBg: "#fff7ed", modalText: "#7c2d12", headerBg: "#9a3412", headerText: "#ffedd5", cardBg: "#ffffff", cardText: "#7c2d12", cardBorder: "#fdba74", sajdah: "#b45309" },
    mecca: { name: "كعبة", bg: "#101010", text: "#fbbf24", font: "var(--font-amiri-quran)", barBg: "#000000", barText: "#fbbf24", barBorder: "#b45309", btnBg: "#b45309", btnText: "#ffffff", accent: "#fbbf24", accentText: "#000000", modalBg: "#101010", modalText: "#fbbf24", headerBg: "#000000", headerText: "#fbbf24", cardBg: "#18181b", cardText: "#fbbf24", cardBorder: "#b45309", sajdah: "#f59e0b", tafseerText: "#ffffff" },
    medina: { name: "قبة", bg: "#ffffff", text: "#064e3b", font: "var(--font-amiri)", barBg: "#ecfdf5", barText: "#065f46", barBorder: "#6ee7b7", btnBg: "#059669", btnText: "#ffffff", accent: "#059669", accentText: "#ffffff", modalBg: "#ffffff", modalText: "#064e3b", headerBg: "#059669", headerText: "#ffffff", cardBg: "#ecfdf5", cardText: "#064e3b", cardBorder: "#34d399", sajdah: "#d97706" },
    midnight: { name: "تهجد", bg: "#0f172a", text: "#e2e8f0", font: "var(--font-amiri)", barBg: "#1e293b", barText: "#38bdf8", barBorder: "#334155", btnBg: "#334155", btnText: "#38bdf8", accent: "#38bdf8", accentText: "#0f172a", modalBg: "#1e293b", modalText: "#e2e8f0", headerBg: "#0f172a", headerText: "#38bdf8", cardBg: "#334155", cardText: "#ffffff", cardBorder: "#475569", sajdah: "#ef4444", tafseerText: "#ffffff" },
};
const READERS = [ 
    { id: 'Alafasy_128kbps', name: 'مشاري العفاسي' }, 
    { id: 'Minshawy_Murattal_128kbps', name: 'محمد صديق المنشاوي (مرتل)' }, 
    // ... add all other readers here
];
const TAFSEERS = [{ id: 'ar.muyassar', name: 'التفسير الميسر' }, { id: 'ar.baghawi', name: 'تفسير البغوي' }];


// --- UTILITY FUNCTIONS ---
const toArabic = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

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

    const mushafContentRef = useRef<HTMLDivElement>(null);
    const floatingMenuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const scrollIntervalRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<number | null>(null);
    
    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const showSajdahNotification = useCallback((surah, ayah) => {
        setSajdahInfo({ show: true, surah, ayah });
        setTimeout(() => setSajdahInfo({ show: false }), 4000);
    }, []);

    const closeModal = useCallback((modalName: string) => {
        setActiveModals(p => ({ ...p, [modalName]: false }));
    }, []);

    const openModal = useCallback((modalName: string) => {
        setActiveModals(p => ({...p, [modalName]: true}));
    }, []);

    useEffect(() => {
        // Data loading logic...
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

    // Dynamic Page Loading on Scroll
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
    const handleAyahClick = useCallback((s, a) => { setHighlightedAyahId(`ayah-${s}-${a}`); setCurrentAyah({ s, a }); localStorage.setItem('last_pos', JSON.stringify({ s, a })); }, []);
    const jumpToAyah = useCallback((s, a, instant = false) => { if (!quranData) return; const surah = quranData.surahs.find(su => su.number === s); const ayah = surah?.ayahs.find(ay => ay.numberInSurah === a); if (!ayah) return; const p = ayah.page; setVisiblePages([p, p + 1, p + 2, p - 1, p - 2].filter(n => n > 0 && n <= 604).sort((a,b) => a-b)); setTimeout(() => { const el = document.getElementById(`ayah-${s}-${a}`); if (el) { el.scrollIntoView({ block: 'center', behavior: instant ? 'auto' : 'smooth' }); handleAyahClick(s, a); } else { handleAyahClick(s, a); } }, 100); setActiveModals({}); }, [quranData, handleAyahClick]);
    const saveBookmark = () => { if (!currentAyah) { showToast('اختر آية أولاً'); return; } const storedBookmarks = JSON.parse(localStorage.getItem('quran_bookmarks_list') || '[]'); const date = new Date(); const newBookmark = { id: Date.now(), s: currentAyah.s, a: currentAyah.a, date: date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }), time: date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }; const newBookmarks = [newBookmark, ...storedBookmarks]; localStorage.setItem('quran_bookmarks_list', JSON.stringify(newBookmarks)); setBookmarks(newBookmarks); showToast('تم حفظ الإشارة المرجعية'); };
    const deleteBookmark = (id) => { const newBookmarks = bookmarks.filter(b => b.id !== id); localStorage.setItem('quran_bookmarks_list', JSON.stringify(newBookmarks)); setBookmarks(newBookmarks); };

    // --- Auto-scroll Logic ---
    const stopAutoScroll = (showTimer = true) => {
        if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        scrollIntervalRef.current = null;
        timerIntervalRef.current = null;
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
        
        scrollIntervalRef.current = window.setInterval(() => {
            setAutoScrollState(prev => {
                if (prev.isActive && !prev.isPaused && mushafContentRef.current) {
                    mushafContentRef.current.scrollTop += 1;
                }
                return prev;
            });
        }, 50);

        timerIntervalRef.current = window.setInterval(() => {
             setAutoScrollState(prev => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }));
        }, 1000);
    };

    const toggleAutoScroll = () => autoScrollState.isActive ? stopAutoScroll() : startAutoScroll();
    const pauseResumeAutoScroll = () => {
      if (autoScrollState.isActive) {
        setAutoScrollState(p => ({...p, isPaused: !p.isPaused }));
      }
    };
     // --- End Auto-scroll Logic ---

     if (isLoading) { /* ... loading component ... */ return <div id="loader" className="fixed inset-0 bg-[#1f2937] text-white z-[9999] flex flex-col items-center justify-center"><div className="text-2xl font-bold mb-4">جاري تحميل المصحف...</div><div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden"><div id="progress-bar" className="h-full bg-green-500 transition-all duration-300" style={{width: `${loadingProgress}%`}}></div></div><div id="loader-status" className="mt-2 text-sm text-gray-400">{loadingStatus}</div></div> }
    
    const surahName = quranData?.surahs[currentAyah.s - 1]?.name.replace('سورة', '').trim() || '';
    const juz = JUZ_MAP.slice().reverse().find(j => (currentAyah.s > j.s) || (currentAyah.s === j.s && currentAyah.a >= j.a))?.j || 1;
    const page = quranData?.surahs[currentAyah.s - 1]?.ayahs.find(ay => ay.numberInSurah === currentAyah.a)?.page || 1;

    return (
        <div className={`quran-reader-container ${autoScrollState.isActive && !autoScrollState.isPaused ? 'fullscreen-active' : ''}`} id="app-container">
            <header id="header" className="header-default flex-none z-50 flex items-center px-4 justify-between border-b shadow-xl w-full gap-2">
                <button id="surah-name-header" onClick={() => openModal('surah-modal')} className="top-bar-text-button"><span>{surahName} - آية {toArabic(currentAyah.a)}</span></button>
                <button id="juz-number-header" onClick={() => openModal('juz-modal')} className="top-bar-text-button">الجزء {toArabic(juz)}</button>
                <button id="header-page" className="top-bar-text-button cursor-default">ص {toArabic(page)}</button>
                <button id="btn-play" className="top-bar-text-button"><span id="play-icon-svg"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></button>
            </header>

            <ReadingTimer isVisible={autoScrollState.isPaused || (!autoScrollState.isActive && autoScrollState.elapsedTime > 0)} elapsedTime={autoScrollState.elapsedTime} />

            <div id="mushaf-content" ref={mushafContentRef} onClick={pauseResumeAutoScroll} className="flex-grow overflow-y-auto w-full relative touch-pan-y">
                <div id="pages-container" className="full-mushaf-container">
                   {[...new Set(visiblePages)].sort((a,b) => a-b).map(pageNum => (
                        <MushafPage key={pageNum} pageNum={pageNum} pageData={getPageData(pageNum)} highlightedAyahId={highlightedAyahId} onAyahClick={handleAyahClick} onSajdahVisible={showSajdahNotification} />
                   ))}
                </div>
            </div>
            
            <SajdahNotification isVisible={sajdahInfo.show} surah={sajdahInfo.surah} ayah={sajdahInfo.ayah} />
            
            <div id="floating-menu" className={isFloatingMenuOpen ? 'open' : ''} ref={floatingMenuRef}>
                 <button onClick={() => { openModal('bookmarks-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-green w-full justify-between mb-2"><span>قائمة الإشارات</span><i className="fa-solid fa-list"></i></button>
                 <button onClick={() => { openModal('search-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-purple w-full justify-between mb-2"><span>البحث</span><i className="fa-solid fa-search"></i></button>
                 <button onClick={() => { openModal('themes-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-green w-full justify-between mb-2"><span>الثيمات</span><i className="fa-solid fa-palette"></i></button>
                 <button onClick={() => { openModal('settings-modal'); setIsFloatingMenuOpen(false); }} className="bottom-bar-button btn-purple w-full justify-between"><span>الإعدادات</span><i className="fa-solid fa-cog"></i></button>
            </div>


            <footer id="bottom-bar" className="footer-default flex-none border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 flex justify-around items-center px-1 py-2 w-full">
                <button ref={menuButtonRef} id="btn-menu" onClick={() => setIsFloatingMenuOpen(p => !p)} className="bottom-bar-button btn-purple flex-1 mx-1 h-10"><i className="fa-solid fa-bars"></i><span className="hidden sm:inline">القائمة</span></button>
                <button id="btn-bookmark" onClick={saveBookmark} className="bottom-bar-button btn-green flex-1 mx-1 h-10"><i className="fa-solid fa-bookmark"></i><span className="hidden sm:inline">حفظ</span></button>
                <button id="btn-autoscroll" onClick={toggleAutoScroll} className={`bottom-bar-button btn-purple flex-1 mx-1 h-10 ${autoScrollState.isActive ? 'btn-autoscroll-active' : ''}`}>
                    {autoScrollState.isActive ? <i className="fa-solid fa-pause"></i> : <i className="fa-solid fa-arrow-down"></i>}
                    <span className="hidden sm:inline">{autoScrollState.isActive ? "إيقاف" : "تمرير"}</span>
                </button>
                <button id="btn-home" onClick={onBack} className="bottom-bar-button btn-green flex-1 mx-1 h-10"><i className="fa-solid fa-home"></i><span className="hidden sm:inline">الرئيسية</span></button>
            </footer>
            
            {/* --- Modals --- */}
            {activeModals['surah-modal'] && <SurahJuzModal type="surah" quranData={quranData} onSelect={(s, a) => jumpToAyah(s, a)} onClose={() => closeModal('surah-modal')} />}
            {activeModals['juz-modal'] && <SurahJuzModal type="juz" quranData={quranData} onSelect={(j) => jumpToAyah(JUZ_MAP[j-1].s, JUZ_MAP[j-1].a)} onClose={() => closeModal('juz-modal')} />}
            {activeModals['bookmarks-modal'] && <BookmarksModal bookmarks={bookmarks} quranData={quranData} onSelect={(s,a) => jumpToAyah(s,a)} onDelete={deleteBookmark} onClose={() => closeModal('bookmarks-modal')} />}
            {activeModals['search-modal'] && <SearchModal quranData={quranData} onSelect={(s,a) => jumpToAyah(s,a)} onClose={() => closeModal('search-modal')} />}
            {activeModals['themes-modal'] && <ThemesModal onClose={() => closeModal('themes-modal')} />}
            {activeModals['settings-modal'] && <SettingsModal onClose={() => closeModal('settings-modal')} onOpenModal={openModal} />}
            {activeModals['toolbar-color-picker-modal'] && <ToolbarColorPickerModal onClose={() => closeModal('toolbar-color-picker-modal')} onOpenModal={openModal} />}
            {activeModals['quran-download-modal'] && <QuranDownloadModal onClose={() => closeModal('quran-download-modal')} quranData={quranData} />}
            {activeModals['tafsir-download-modal'] && <TafsirDownloadModal onClose={() => closeModal('tafsir-download-modal')} quranData={quranData} />}

            {toast.show && <Toast message={toast.message} />}
        </div>
    );
};

const ReadingTimer: FC<{isVisible: boolean, elapsedTime: number}> = ({isVisible, elapsedTime}) => {
    const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const seconds = (elapsedTime % 60).toString().padStart(2, '0');
    return (
        <div className={`reading-timer ${isVisible ? 'show' : ''}`}>
            {toArabic(`${minutes}:${seconds}`)}
        </div>
    );
};

const SajdahNotification: FC<{isVisible: boolean, surah: string, ayah: number}> = ({isVisible, surah, ayah}) => (
    <div className={`sajdah-notification ${isVisible ? 'show' : ''}`}>
        <div className="p-2 rounded-full"><i className="fa-solid fa-mosque"></i></div>
        <div>
            <div className="font-bold text-sm">سجدة تلاوة</div>
            <div className="text-xs mt-0.5">سورة {surah} - آية {toArabic(ayah)}</div>
        </div>
    </div>
);

// ... Other Components (Toast, MushafPage, etc.)
const Toast: FC<{ message: string }> = ({ message }) => (<div id="message-toast" className="show opacity-100 transition-opacity pointer-events-auto"><div><div className="font-bold text-sm">تنبيه</div><div id="toast-message" className="text-xs mt-0.5">{message}</div></div></div>);
const MushafPage: FC<{pageNum: number, pageData: any[], highlightedAyahId: string, onAyahClick: (s,a)=>void, onSajdahVisible: (s, a)=>void}> = React.memo(({ pageNum, pageData, highlightedAyahId, onAyahClick, onSajdahVisible }) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const pageRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target as HTMLElement;
                    onSajdahVisible(el.dataset.surah, Number(el.dataset.ayah));
                    observer.unobserve(el); // To show only once per appearance
                }
            });
        }, { root: null, rootMargin: '0px 0px -80% 0px' });

        observerRef.current = observer;

        const sajdahAyahs = pageRef.current?.querySelectorAll('.ayah-sajdah');
        sajdahAyahs?.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [pageData, onSajdahVisible]);


    if (!pageData || !pageData.length) return <div className="mushaf-page" style={{height: '1000px'}}></div>; // Placeholder for height calculation
    let currentSurah = -1;

    return (
        <div className="mushaf-page" data-page={pageNum} ref={pageRef}>
            <div className="page-content">
                {pageData.map(ayah => {
                    const isSajdah = SAJDAH_LOCATIONS.some(sl => sl.s === ayah.sNum && sl.a === ayah.numberInSurah);
                    const showHeader = currentSurah !== ayah.sNum && ayah.numberInSurah === 1;
                    if (showHeader) currentSurah = ayah.sNum;
                    const text = (ayah.numberInSurah === 1 && ayah.sNum !== 1 && ayah.sNum !== 9) ? ayah.text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', '').trim() : ayah.text;
                    const id = `ayah-${ayah.sNum}-${ayah.numberInSurah}`;

                    return (
                        <React.Fragment key={id}>
                            {showHeader && ( <> <div className="surah-header"><span className="surah-name">{ayah.sName.replace('سورة', '').trim()}</span></div> {ayah.sNum !== 1 && ayah.sNum !== 9 && <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>} </> )}
                            <span id={id} className={`ayah-text-block ${highlightedAyahId === id ? 'highlighted' : ''} ${isSajdah ? 'ayah-sajdah' : ''}`} onClick={() => onAyahClick(ayah.sNum, ayah.numberInSurah)} data-sajdah={isSajdah} data-surah={ayah.sName.replace('سورة','').trim()} data-ayah={ayah.numberInSurah}>
                                {text}
                                <span className="verse-container"><span className="verse-bracket">﴿</span><span className="verse-num-inner">{toArabic(ayah.numberInSurah)}</span><span className="verse-bracket">﴾</span></span>
                            </span>
                        </React.Fragment>
                    );
                })}
            </div>
            <div className="page-footer"><span className="page-number-bracket">﴿</span><span className="page-number-text">{toArabic(pageNum)}</span><span className="page-number-bracket">﴾</span></div>
        </div>
    );
});

const SurahJuzModal: FC<any> = ({ type, quranData, onSelect, onClose }) => { return <div className="fixed inset-0 z-[100] bg-gray-900/90 flex justify-center pt-10 px-4 animate-fadeIn" onClick={onClose}><div className="modal-skinned bg-white dark:bg-gray-800 w-full max-w-4xl rounded-t-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}><div className="p-4 theme-header-bg rounded-t-2xl flex justify-between items-center"><h3 className="font-bold text-lg">{type === 'surah' ? 'اختر السورة' : 'اختر الجزء'}</h3><button onClick={onClose} className="text-2xl">&times;</button></div><div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{type === 'surah' ? (quranData.surahs.map(s => (<button key={s.number} onClick={() => onSelect(s.number, 1)} className="p-3 rounded-lg transition text-right font-bold border-2 flex justify-between items-center group"><span>{toArabic(s.number)}. {s.name.replace('سورة', '').trim()}</span><span className="text-xs font-normal">{s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} - {toArabic(s.ayahs.length)} آية</span></button>))) : (JUZ_MAP.map(j => (<button key={j.j} onClick={() => onSelect(j.j)} className="p-3 rounded-lg transition font-bold border-2 flex flex-col items-center justify-center text-center"><span className="text-lg mb-1">الجزء {toArabic(j.j)}</span><span className="text-xs font-normal">{quranData.surahs[j.s-1].name.replace('سورة','').trim()} آية {toArabic(j.a)}</span></button>)))}</div></div></div>; };
const BookmarksModal: FC<any> = ({ bookmarks, quranData, onSelect, onDelete, onClose }) => { return <div className="fixed inset-0 z-[100] bg-gray-900/90 flex justify-center pt-10 px-4 animate-fadeIn" onClick={onClose}><div className="modal-skinned bg-white dark:bg-gray-800 w-full max-w-2xl rounded-t-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}><div className="p-4 theme-header-bg rounded-t-2xl flex justify-between items-center"><h3 className="font-bold text-lg">الإشارات المرجعية</h3><button onClick={onClose} className="text-2xl">&times;</button></div><div className="overflow-y-auto p-4 space-y-2">{bookmarks.length === 0 ? (<div className="text-center p-4 font-bold">لا توجد إشارات مرجعية محفوظة</div>) : (bookmarks.map(b => { const surahName = quranData.surahs[b.s - 1]?.name.replace('سورة','').trim() || ''; return (<div key={b.id} className="flex items-center justify-between p-3 rounded-lg border mb-2 transition"><div className="flex-grow cursor-pointer" onClick={() => onSelect(b.s, b.a)}><div className="font-bold text-lg">{surahName} - آية {toArabic(b.a)}</div><div className="text-xs mt-1 font-bold opacity-70">{b.date} | {b.time}</div></div><button onClick={() => onDelete(b.id)} className="text-red-500 hover:text-red-700 p-2 text-xl"><i className="fa-solid fa-trash-alt"></i></button></div>);}))}</div></div></div>; };
const SearchModal: FC<any> = ({ quranData, onSelect, onClose }) => { return <div/>; /* Placeholder */ };
const ThemesModal: FC<any> = ({ onClose }) => { return <div/>; /* Placeholder */ };
const SettingsModal: FC<any> = ({ onClose, onOpenModal }) => { return <div/>; /* Placeholder */ };
const ToolbarColorPickerModal: FC<any> = ({ onClose, onOpenModal }) => { return <div/>; };
const QuranDownloadModal: FC<any> = ({ onClose, quranData }) => { return <div/>; };
const TafsirDownloadModal: FC<any> = ({ onClose, quranData }) => { return <div/>; };


export default QuranReader;
