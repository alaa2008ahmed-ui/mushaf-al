import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import './QuranReader.css'; 
import { JUZ_MAP, toArabic, THEMES, TAFSEERS } from '../components/QuranReader/constants';
import SearchModal from '../components/QuranReader/SearchModal';
import ThemesModal from '../components/QuranReader/ThemesModal';
import SettingsModal from '../components/QuranReader/SettingsModal';
import ToolbarColorPickerModal from '../components/QuranReader/ToolbarColorPickerModal';
import { QuranDownloadModal, TafsirDownloadModal } from '../components/QuranReader/DownloadModals';
import SurahJuzModal from '../components/QuranReader/SurahJuzModal';
import { KeepAwake } from '@capacitor-community/keep-awake';
import BookmarksModal from '../components/QuranReader/BookmarksModal';
import MushafPage from '../components/QuranReader/MushafPage';
import Toast from '../components/QuranReader/Toast';
import TafseerModal from '../components/QuranReader/TafseerModal';

declare var window: any;

const SajdahCardModal: FC<{
    info: { show: boolean, surah: string, ayah: number, juz: number, page: number },
    onClose: () => void
}> = ({ info, onClose }) => {
    if (!info.show) return null;

    return (
        <div className="fixed inset-0 z-[250] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="modal-skinned w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] bg-white dark:bg-gray-800" onClick={e => e.stopPropagation()}>
                <div className="p-4 theme-header-bg rounded-t-2xl text-center">
                    <h3 className="font-bold text-lg">أحكام سجود التلاوة</h3>
                    <p className="text-xs opacity-80 mt-1">
                        عند آية سجدة: سورة {info.surah} - آية {toArabic(info.ayah)}
                    </p>
                </div>
                <div className="p-5 overflow-y-auto text-right leading-relaxed space-y-4 text-sm">
                    <div>
                        <p><b>1. تعريف سجود التلاوة</b></p>
                        <p className="mt-1">هو سجود يؤديه القارئ أو المستمع عند قراءة آية من آيات السجود في القرآن الكريم، تعظيماً لله تعالى وإظهاراً للعبودية. وقد ثبت في صحيح مسلم عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ:</p>
                        <blockquote className="mt-2 p-2 border-r-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-sm italic">"إذَا قَرَأَ ابنُ آدَمَ السَّجْدَةَ فَسَجَدَ، اعْتَزَلَ الشَّيْطَانُ يَبْكِي، يقولُ: يا وَيْلَهُ، أُمِرَ ابنُ آدَمَ بالسُّجُودِ فَسَجَدَ فَلَهُ الجَنَّةُ، وأُمِرْتُ بالسُّجُودِ فأبَيْتُ فَلِيَ النَّارُ".</blockquote>
                    </div>

                    <div>
                        <p><b>2. عدد آيات السجدة ومواضعها</b></p>
                        <p className="mt-1 mb-2">اتفق جمهور العلماء على وجود آيات السجود في القرآن، وأشهر الآراء أنها 15 سجدة، وهي موزعة كالآتي:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <div className="text-right">الأعراف: <b>{toArabic(206)}</b></div>
                            <div className="text-right">النمل: <b>{toArabic(25)}</b></div>
                            <div className="text-right">الرعد: <b>{toArabic(15)}</b></div>
                            <div className="text-right">السجدة: <b>{toArabic(15)}</b></div>
                            <div className="text-right">النحل: <b>{toArabic(49)}</b></div>
                            <div className="text-right">ص: <b>{toArabic(24)}</b></div>
                            <div className="text-right">الإسراء: <b>{toArabic(107)}</b></div>
                            <div className="text-right">فصلت: <b>{toArabic(37)}</b></div>
                            <div className="text-right">مريم: <b>{toArabic(58)}</b></div>
                            <div className="text-right">النجم: <b>{toArabic(62)}</b></div>
                            <div className="text-right">الحج (سجدتان): <b>{toArabic(18)} و {toArabic(77)}</b></div>
                            <div className="text-right">الانشقاق: <b>{toArabic(21)}</b></div>
                            <div className="text-right">الفرقان: <b>{toArabic(60)}</b></div>
                            <div className="text-right">العلق: <b>{toArabic(19)}</b></div>
                        </div>
                    </div>

                    <div>
                        <p><b>3. حكم سجود التلاوة</b></p>
                        <p className="mt-1 mb-2">اختلف الفقهاء في حكمها على قولين مشهورين:</p>
                        <ul className="list-disc pr-5 space-y-2">
                            <li><b>جمهور العلماء (الشافعية والمالكية والحنابلة):</b> أنها سُنّة مؤكدة وليست واجبة؛ واستدلوا بأن عمر بن الخطاب رضي الله عنه قرأ السجدة يوم الجمعة على المنبر فنزل وسجد، ثم قرأها في الجمعة التالية فلم يسجد وقال: "إن الله لم يفرض علينا السجود إلا أن نشاء".</li>
                            <li><b>الحنفية:</b> ذهبوا إلى أنها واجبة على القارئ والمستمع.</li>
                        </ul>
                    </div>

                    <div>
                        <p><b>4. شروط وكيفية سجود التلاوة</b></p>
                        <div className="space-y-3 mt-1">
                            <p><b>الشروط:</b><br/>يشترط لها عند جمهور الفقهاء ما يشترط للصلاة (الطهارة، استقبال القبلة، ستر العورة)، بينما ذهب بعض العلماء (مثل ابن تيمية والشوكاني) إلى أنه يجوز السجود دون طهارة (مثل سجود الشكر) لأنها ليست صلاة كاملة، لكن الأفضل والأحوط هو التطهر.</p>
                            <div>
                                <p><b>الكيفية:</b></p>
                                <ul className="list-disc pr-5 space-y-2 mt-1">
                                    <li><b>التكبير:</b> يُكبر الساجد عند الهويّ للسجود (وعند الرفع منه إذا كان داخل الصلاة).</li>
                                    <li><b>السجود:</b> سجدة واحدة كسجدة الصلاة.</li>
                                    <li>
                                        <b>الدعاء:</b> يُشرع فيها ما يقال في سجود الصلاة "سبحان ربي الأعلى"، ويُستحب الدعاء المأثور:
                                        <blockquote className="mt-2 p-2 border-r-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-sm italic">"سَجَدَ وَجْهِي لِلَّذِي خَلَقَهُ، وَشَقَّ سَمْعَهُ وَبَصَرَهُ، بِحَوْلِهِ وَقُوَّتِهِ".</blockquote>
                                        <blockquote className="mt-2 p-2 border-r-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-sm italic">"اللَّهُمَّ اكْتُبْ لِي بِهَا عِنْدَكَ أَجْرًا، وَضَعْ عَنِّي بِهَا وِزْرًا، وَاجْعَلْهَا لِي عِنْدَكَ ذُخْرًا، وَتَقَبَّلْهَا مِنِّي كَمَا تَقَبَّلْتَهَا مِنْ عَبْدِكَ دَاوُدَ".</blockquote>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p><b>5. ملاحظات هامة</b></p>
                        <ul className="list-disc pr-5 space-y-2 mt-1">
                            <li><b>داخل الصلاة:</b> إذا قرأ الإمام آية سجدة، يسجد ويسجد المأمومون معه.</li>
                            <li><b>للمستمع:</b> يشرع السجود للمستمع الذي يقصد سماع القرآن، أما "السامع" (من مرّ صدفة أو سمعها في مكان عام دون قصد) فلا يجب عليه السجود عند كثير من الفقهاء.</li>
                            <li><b>العجز عن السجود:</b> من لم يستطع السجود لسبب ما (كأن يكون في وسيلة مواصلات)، يمكنه الإيماء برأسه أو الاكتفاء بالذكر.</li>
                        </ul>
                    </div>
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
                    <button onClick={onClose} className="w-full theme-accent-btn py-2.5 rounded-xl font-bold transition">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};


const QuranReader: FC<{ onBack: () => void }> = ({ onBack }) => {
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
    const [sajdahCardInfo, setSajdahCardInfo] = useState({ show: false, surah: '', ayah: 0, juz: 0, page: 0, wasAutoscrolling: false, wasPlaying: false });

    const [autoScrollState, setAutoScrollState] = useState({ isActive: false, isPaused: false, elapsedTime: 0 });
    const [hideUIOnScroll, setHideUIOnScroll] = useState(() => localStorage.getItem('hide_ui_on_scroll') === 'true');
    const [showSajdahCard, setShowSajdahCard] = useState(() => {
        const saved = localStorage.getItem('show_sajdah_card');
        return saved !== null ? saved === 'true' : true;
    });

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [playingAyah, setPlayingAyah] = useState<{s: number; a: number} | null>(null);
    
    const [tafseerInfo, setTafseerInfo] = useState({ isOpen: false, s: 0, a: 0, text: '', surahName: '' });
    const [isTafseerLoading, setIsTafseerLoading] = useState(false);
    const tafseerCache = useRef<any>({});
    
    const [isPageInputActive, setIsPageInputActive] = useState(false);
    const [pageInput, setPageInput] = useState('');

    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('quran_settings');
        return saved ? JSON.parse(saved) : {
            fontSize: 1.7, fontFamily: "var(--font-noto)", textColor: '#1f2937', bgColor: '#ffffff',
            reader: 'Alafasy_128kbps', theme: 'light', scrollMinutes: 20, tafseer: 'ar.muyassar'
        };
    });

    const [currentTheme, setCurrentTheme] = useState(() => {
        const themeId = localStorage.getItem('current_theme_id') || 'default';
        return THEMES[themeId as keyof typeof THEMES] || THEMES['default'];
    });

    // Keep screen awake logic
    useEffect(() => {
        const enableKeepAwake = async () => {
            try {
                await KeepAwake.keepAwake();
            } catch (e) {
                console.warn('Capacitor KeepAwake failed:', e);
            }

            if ('wakeLock' in navigator) {
                try {
                    const wakeLock = await (navigator as any).wakeLock.request('screen');
                    // Store wakeLock to release it later if needed
                    // For simplicity, we'll rely on the return cleanup for now
                } catch (err) {
                    console.warn('Web Wake Lock request failed:', err);
                }
            }
        };

        const disableKeepAwake = async () => {
            try {
                await KeepAwake.allowSleep();
            } catch (e) {
                console.warn('Capacitor allowSleep failed:', e);
            }
            // Web Wake Lock is automatically released when the tab is closed or navigated away
            // or when the component unmounts if the wakeLock object is properly managed.
        };

        enableKeepAwake();

        // Re-request wake lock when page becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                enableKeepAwake();
            } else {
                disableKeepAwake();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            disableKeepAwake();
        };
    }, []);

    const [toolbarColors, setToolbarColors] = useState(() => JSON.parse(localStorage.getItem('toolbar_colors') || '{}'));
    const [isTransparentMode, setIsTransparentMode] = useState(() => localStorage.getItem('transparent_mode') === 'true');

    const mushafContentRef = useRef<HTMLDivElement>(null);
    const floatingMenuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const scrollIntervalRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<number | null>(null);
    const scrollAccumulatorRef = useRef(0);
    const autoScrollPausedRef = useRef(false);
    const currentAyahRef = useRef(currentAyah);
    const lastScrollUpdateTime = useRef(0);
    const pageInputRef = useRef<HTMLInputElement>(null);
    
    const audioCacheRef = useRef<Record<string, HTMLAudioElement>>({});
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    const sajdahInfoRef = useRef(sajdahInfo);
    useEffect(() => { sajdahInfoRef.current = sajdahInfo; }, [sajdahInfo]);
    const sajdahCardInfoRef = useRef(sajdahCardInfo);
    useEffect(() => { sajdahCardInfoRef.current = sajdahCardInfo; }, [sajdahCardInfo]);
    const autoScrollStateRef = useRef(autoScrollState);
    useEffect(() => { autoScrollStateRef.current = autoScrollState; }, [autoScrollState]);
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    const isAudioLoadingRef = useRef(isAudioLoading);
    useEffect(() => { isAudioLoadingRef.current = isAudioLoading; }, [isAudioLoading]);

    useEffect(() => { currentAyahRef.current = currentAyah; }, [currentAyah]);

    useEffect(() => {
        if (isPlaying || isAudioLoading) {
            const ayahToPlay = highlightedAyahId 
                ? { s: parseInt(highlightedAyahId.split('-')[1]), a: parseInt(highlightedAyahId.split('-')[2]) } 
                : currentAyah;
            playAudio(ayahToPlay.s, ayahToPlay.a);
        }
    }, [settings.reader]);
    
    useEffect(() => {
        if (isPageInputActive && pageInputRef.current) {
            pageInputRef.current.focus();
        }
    }, [isPageInputActive]);

    const showToast = useCallback((message: string) => setToast({ show: true, message }), []);
    
    const stopAudio = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.onended = null;
        }
        setIsPlaying(false);
        setIsAudioLoading(false);
        setPlayingAyah(null);
    }, []);
    const showSajdahNotification = useCallback((surah, ayah) => {
        setSajdahInfo({ show: true, surah, ayah });
        const timeout = autoScrollStateRef.current.isActive ? 2000 : 4000;
        setTimeout(() => setSajdahInfo(prev => ({...prev, show: false})), timeout);
    }, []);

    const handleSajdahVisible = useCallback((surahName: string, sNum: number, ayahNum: number) => {
        if (sajdahInfoRef.current.show || sajdahCardInfoRef.current.show) return;

        showSajdahNotification(surahName, ayahNum);

        if (showSajdahCard) {
            if (!quranData) return;
            const juz = JUZ_MAP.slice().reverse().find(j => (sNum > j.s) || (sNum === j.s && ayahNum >= j.a))?.j || 1;
            const page = quranData.surahs[sNum - 1]?.ayahs.find((ay:any) => ay.numberInSurah === ayahNum)?.page || 1;

            const wasAutoscrolling = autoScrollStateRef.current.isActive && !autoScrollStateRef.current.isPaused;
            const wasPlaying = isPlayingRef.current || isAudioLoadingRef.current;

            if (wasAutoscrolling) {
                autoScrollPausedRef.current = true;
                setAutoScrollState(p => ({...p, isPaused: true }));
            }
            if (wasPlaying) {
                stopAudio();
            }

            setSajdahCardInfo({
                show: true,
                surah: surahName,
                ayah: ayahNum,
                juz,
                page,
                wasAutoscrolling,
                wasPlaying
            });
        }
    }, [quranData, showSajdahNotification, stopAudio, showSajdahCard]);

    const handleCloseSajdahCard = () => {
        if (sajdahCardInfo.wasAutoscrolling) {
            autoScrollPausedRef.current = false;
            setAutoScrollState(p => ({...p, isPaused: false }));
        }
        setSajdahCardInfo({ show: false, surah: '', ayah: 0, juz: 0, page: 0, wasAutoscrolling: false, wasPlaying: false });
    };

    const playNextAyah = useCallback(() => {
        if (!quranData || !playingAyah) return stopAudio();
        const { s, a } = playingAyah;
        const surah = quranData.surahs[s - 1];
        if (!surah) return stopAudio();
    
        if (a < surah.ayahs.length) {
            const nextAyah = { s, a: a + 1 };
            playAudio(nextAyah.s, nextAyah.a);
        } else {
            stopAudio();
            showToast('انتهت السورة');
        }
    }, [quranData, playingAyah, stopAudio, showToast]);

    const playNextAyahRef = useRef(playNextAyah);
    useEffect(() => { playNextAyahRef.current = playNextAyah; }, [playNextAyah]);

    const manageAudioCache = useCallback((currentS: number, currentA: number) => {
        const keys = Object.keys(audioCacheRef.current);
        if (keys.length <= 20) return;
        for (const key of keys) {
            const [s, a] = key.split(':').map(Number);
            if (Math.abs(currentA - a) > 10 || currentS !== s) {
                delete audioCacheRef.current[key];
            }
        }
    }, []);

    const preloadAudioQueue = useCallback(async (s: number, startAyah: number) => {
        if (!quranData) return;
        const surah = quranData.surahs[s - 1];
        if (!surah) return;

        for (let i = 0; i < 10; i++) {
            const ayahNum = startAyah + i;
            if (ayahNum > surah.ayahs.length) break;
            const cacheKey = `${s}:${ayahNum}`;
            if (!audioCacheRef.current[cacheKey]) {
                const surahStr = String(s).padStart(3, '0');
                const ayahStr = String(ayahNum).padStart(3, '0');
                const audioUrl = `https://everyayah.com/data/${settings.reader}/${surahStr}${ayahStr}.mp3`;
                
                try {
                    if ('caches' in window) {
                        const cache = await caches.open('quran-audio-cache');
                        const cachedResponse = await cache.match(audioUrl);
                        if (!cachedResponse) {
                            const audio = new Audio(audioUrl);
                            audio.preload = 'auto';
                            audioCacheRef.current[cacheKey] = audio;
                        }
                    } else {
                         const audio = new Audio(audioUrl);
                         audio.preload = 'auto';
                         audioCacheRef.current[cacheKey] = audio;
                    }
                } catch (e) { console.warn("Preloading failed", e); }
            }
        }
    }, [settings.reader, quranData]);

    const playAudio = useCallback(async (s: number, a: number) => {
        stopAudio();
        setIsAudioLoading(true);
        setPlayingAyah({ s, a });
        setCurrentAyah({ s, a });
        setHighlightedAyahId(`ayah-${s}-${a}`);
        document.getElementById(`ayah-${s}-${a}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
        const cacheKey = `${s}:${a}`;
        let audio: HTMLAudioElement;
    
        if (audioCacheRef.current[cacheKey]) {
            audio = audioCacheRef.current[cacheKey];
            audio.currentTime = 0;
        } else {
            const surahStr = String(s).padStart(3, '0');
            const ayahStr = String(a).padStart(3, '0');
            const audioUrl = `https://everyayah.com/data/${settings.reader}/${surahStr}${ayahStr}.mp3`;
            let audioSrc = audioUrl;

            try {
                if ('caches' in window) {
                    const cache = await caches.open('quran-audio-cache');
                    const cachedResponse = await cache.match(audioUrl);
                    if (cachedResponse) {
                        const blob = await cachedResponse.blob();
                        audioSrc = URL.createObjectURL(blob);
                        showToast(`تشغيل من المحفوظات`);
                    }
                }
            } catch (e) { console.warn("Cache API check failed", e); }
    
            audio = new Audio(audioSrc);
            audio.preload = 'auto';
            audioCacheRef.current[cacheKey] = audio;
        }
    
        currentAudioRef.current = audio;
    
        audio.onplaying = () => { setIsPlaying(true); setIsAudioLoading(false); };
        audio.onpause = () => setIsPlaying(false);
        audio.onwaiting = () => setIsAudioLoading(true);
        audio.onended = () => playNextAyahRef.current();
        audio.onerror = () => {
            showToast('خطأ في تحميل المقطع الصوتي.');
            stopAudio();
            delete audioCacheRef.current[cacheKey];
        };
    
        try {
            await audio.play();
            preloadAudioQueue(s, a + 1);
            manageAudioCache(s, a);
        } catch (error) {
            showToast('فشل تشغيل الصوت.');
            stopAudio();
            delete audioCacheRef.current[cacheKey];
        }
    }, [settings.reader, stopAudio, preloadAudioQueue, manageAudioCache, showToast]);

    const closeModal = useCallback((modalName: string) => setActiveModals(p => ({ ...p, [modalName]: false })), []);
    const openModal = useCallback((modalName: string) => { stopAudio(); setActiveModals(p => ({...p, [modalName]: true})); }, [stopAudio]);
    
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
                    if (data.code === 200) tafseerCache.current[cacheKey] = data.data.ayahs;
                    else throw new Error('Failed to fetch tafseer data');
                }
                const ayahTafseer = tafseerCache.current[cacheKey]?.[tafseerInfo.a - 1];
                setTafseerInfo(prev => ({ ...prev, text: ayahTafseer?.text || "التفسير غير متوفر لهذه الآية." }));
            } catch (e) {
                setTafseerInfo(prev => ({...prev, text: 'خطأ في تحميل التفسير. يرجى التحقق من اتصالك بالإنترنت.'}));
            } finally { setIsTafseerLoading(false); }
        };
        fetchTafseer();
    }, [tafseerInfo.isOpen, tafseerInfo.s, tafseerInfo.a, settings.tafseer]);

    const toggleAudio = useCallback(() => {
        if (isPlaying || isAudioLoading) {
            stopAudio();
        } else {
            const ayahToPlay = highlightedAyahId 
                ? { s: parseInt(highlightedAyahId.split('-')[1]), a: parseInt(highlightedAyahId.split('-')[2]) } 
                : currentAyah;
            if (ayahToPlay) {
                playAudio(ayahToPlay.s, ayahToPlay.a);
            } else {
                showToast('الرجاء اختيار آية للبدء');
            }
        }
    }, [isPlaying, isAudioLoading, highlightedAyahId, currentAyah, playAudio, stopAudio, showToast]);

    useEffect(() => {
        const handleThemeChange = () => {
            const themeId = localStorage.getItem('current_theme_id') || 'default';
            const newTheme = THEMES[themeId as keyof typeof THEMES] || THEMES['default'];
            setCurrentTheme(newTheme);
            
            const savedSettings = localStorage.getItem('quran_settings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            } else {
                setSettings(prev => ({ ...prev, bgColor: newTheme.bg, textColor: newTheme.text, fontFamily: newTheme.font }));
            }
            
            setToolbarColors(JSON.parse(localStorage.getItem('toolbar_colors') || '{}'));
            setIsTransparentMode(localStorage.getItem('transparent_mode') === 'true');
        };
        const handleSettingsChange = () => {
            const saved = localStorage.getItem('quran_settings');
            if (saved) setSettings(JSON.parse(saved));
            setToolbarColors(JSON.parse(localStorage.getItem('toolbar_colors') || '{}'));
            setHideUIOnScroll(localStorage.getItem('hide_ui_on_scroll') === 'true');
            const savedSajdah = localStorage.getItem('show_sajdah_card');
            setShowSajdahCard(savedSajdah !== null ? savedSajdah === 'true' : true);
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
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [currentTheme]);

    useEffect(() => {
        (async () => {
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
        })();
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
            setBookmarks(JSON.parse(localStorage.getItem('quran_bookmarks_list') || '[]'));
        }
    }, [activeModals['bookmarks-modal']]);

    useEffect(() => {
        const contentEl = mushafContentRef.current;
        if (!contentEl) return;
    
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = contentEl;
            if (scrollTop < clientHeight) {
                setVisiblePages(prev => {
                    // FIX: Guard against applying Math.min on an empty array, which results in Infinity. This prevents potential arithmetic errors and invalid state.
                    if (prev.length === 0) return prev;
                    const firstPage = Math.min(...prev);
                    return firstPage > 1 ? [...new Set([firstPage - 1, ...prev])] : prev;
                });
            }
            if (scrollHeight - scrollTop <= clientHeight + 200) {
                setVisiblePages(prev => {
                    // FIX: Guard against applying Math.max on an empty array, which results in -Infinity. This prevents potential arithmetic errors and invalid state.
                    if (prev.length === 0) return prev;
                    const lastPage = Math.max(...prev);
                    return lastPage < 604 ? [...new Set([...prev, lastPage + 1])] : prev;
                });
            }
    
            if (autoScrollState.isActive) return;
    
            const now = Date.now();
            if (now - lastScrollUpdateTime.current < 100) return;
            lastScrollUpdateTime.current = now;
    
            const topOffset = 80;
            const x = window.innerWidth / 2;
            const y = contentEl.getBoundingClientRect().top + topOffset;
            
            const el = document.elementFromPoint(x, y);
            if (!el) return;
            
            const ayahBlock = el.closest('.ayah-text-block');
            if (ayahBlock && ayahBlock.id) {
                const parts = ayahBlock.id.split('-');
                if (parts.length === 3) {
                    const s = parseInt(parts[1], 10);
                    const a = parseInt(parts[2], 10);
    
                    if (s !== currentAyahRef.current.s || a !== currentAyahRef.current.a) {
                        setCurrentAyah({ s, a });

                        if (ayahBlock.getAttribute('data-sajdah') === 'true') {
                            const surahName = (ayahBlock as HTMLElement).dataset.surah || '';
                            const sNum = parseInt((ayahBlock as HTMLElement).dataset.snum || '0', 10);
                            const ayahNum = parseInt((ayahBlock as HTMLElement).dataset.ayah || '0', 10);
                            if(surahName && sNum && ayahNum){
                                handleSajdahVisible(surahName, sNum, ayahNum);
                            }
                        }
                    }
                }
            }
        };
    
        contentEl.addEventListener('scroll', handleScroll, { passive: true });
    
        return () => {
            contentEl.removeEventListener('scroll', handleScroll);
        };
    }, [visiblePages, autoScrollState.isActive, handleSajdahVisible]);

    const getPageData = useCallback((pageNum) => quranData ? quranData.surahs.flatMap((s:any) => s.ayahs.filter((a:any) => a.page === pageNum).map((a:any) => ({ ...a, sNum: s.number, sName: s.name }))) : [], [quranData]);
    
    const handleAyahClick = useCallback((s, a) => {
        setHighlightedAyahId(`ayah-${s}-${a}`);
        setCurrentAyah({ s, a });
        localStorage.setItem('last_pos', JSON.stringify({ s, a }));
    }, []);
    
    const jumpToAyah = useCallback((s, a, instant = false) => {
        stopAudio();
        if (!quranData) return;
        const surah = quranData.surahs.find((su:any) => su.number === s);
        const ayah = surah?.ayahs.find((ay:any) => ay.numberInSurah === a);
        if (!ayah) return;
        const p = Number(ayah.page);
        setVisiblePages([p]);
        setTimeout(() => {
            const el = document.getElementById(`ayah-${s}-${a}`);
            if (el) {
                el.scrollIntoView({ block: 'center', behavior: instant ? 'auto' : 'smooth' });
                handleAyahClick(s, a);
            }
        }, 50);
        setActiveModals({});
    }, [quranData, handleAyahClick, stopAudio]);

    const jumpToPage = useCallback((pageNum: number, instant: boolean = true) => {
        if (!quranData || isNaN(pageNum) || pageNum < 1 || pageNum > 604) return;
        
        let firstAyahInfo: { s: number, a: number } | null = null;
        const pageData = getPageData(pageNum);
        if (pageData && pageData.length > 0) {
            firstAyahInfo = { s: pageData[0].sNum, a: pageData[0].numberInSurah };
        }
    
        if (firstAyahInfo) {
            jumpToAyah(firstAyahInfo.s, firstAyahInfo.a, instant);
        } else {
            showToast(`لا توجد بيانات لصفحة ${toArabic(pageNum)}`);
        }
    }, [quranData, jumpToAyah, getPageData, showToast]);

    const saveBookmark = () => { if (!currentAyah) { showToast('اختر آية أولاً'); return; } const stored = JSON.parse(localStorage.getItem('quran_bookmarks_list') || '[]'); const date = new Date(); const newBookmark = { id: Date.now(), s: currentAyah.s, a: currentAyah.a, date: date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }), time: date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }; const newBookmarks = [newBookmark, ...stored]; localStorage.setItem('quran_bookmarks_list', JSON.stringify(newBookmarks)); setBookmarks(newBookmarks); showToast('تم حفظ الإشارة المرجعية'); };
    const deleteBookmark = (id:number) => { const newBookmarks = bookmarks.filter((b:any) => b.id !== id); localStorage.setItem('quran_bookmarks_list', JSON.stringify(newBookmarks)); setBookmarks(newBookmarks); };

    const PAGES_PER_JUZ = 20;
    const PAGE_HEIGHT_FALLBACK = 1300;

    const updateHeadersDuringAutoScroll = () => {
        const content = mushafContentRef.current;
        if (!content) return;
        const el = document.elementFromPoint(window.innerWidth / 2, content.getBoundingClientRect().top + 80); 
        if (!el) return;
        const ayahBlock = el.closest('.ayah-text-block');
        if (ayahBlock && ayahBlock.id) {
            const parts = ayahBlock.id.split('-'); 
            if (parts.length === 3) {
                const s = parseInt(parts[1]); const a = parseInt(parts[2]);
                if (s !== currentAyahRef.current.s || a !== currentAyahRef.current.a) {
                    setCurrentAyah({ s, a });
                    currentAyahRef.current = { s, a };
                    if (ayahBlock.getAttribute('data-sajdah') === 'true') {
                        const surahName = (ayahBlock as HTMLElement).dataset.surah || '';
                        const sNum = parseInt((ayahBlock as HTMLElement).dataset.snum || '0', 10);
                        const ayahNum = parseInt((ayahBlock as HTMLElement).dataset.ayah || '0', 10);
                        if(surahName && sNum && ayahNum){
                            handleSajdahVisible(surahName, sNum, ayahNum);
                        }
                    }
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
        if (showTimer) setTimeout(() => setAutoScrollState(p => ({...p, elapsedTime: 0})), 3000);
        else setAutoScrollState(p => ({...p, elapsedTime: 0}));
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
        let totalHeight = 0; let count = 0;
        pages.forEach((page: any) => { const h = page.offsetHeight; if (h) { totalHeight += h; count++; } });
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
        if (autoScrollState.isActive) stopAutoScroll();
        else { startAutoScroll(); showToast('تم تفعيل التمرير التلقائي'); }
    };
    const pauseResumeAutoScroll = () => {
      if (autoScrollState.isActive) {
        const newPausedState = !autoScrollState.isPaused;
        autoScrollPausedRef.current = newPausedState;
        setAutoScrollState(p => ({...p, isPaused: newPausedState }));
      }
    };

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
        setPageInput(value);
    
        if (value) {
            const pageNum = parseInt(value, 10);
            if (pageNum >= 1 && pageNum <= 604) {
                jumpToPage(pageNum, true);
            }
        }
    };

    const handlePageInputBlur = () => {
        setIsPageInputActive(false);
        setPageInput(''); 
    };

    const handlePageButtonClick = () => {
        setIsPageInputActive(true);
    };

    const getToolbarStyle = (type: string, defaultBg: string, defaultText: string, defaultBorder: string) => {
        const config = toolbarColors[type];
        if (isTransparentMode && (type === 'top-toolbar' || type === 'bottom-toolbar')) return { backgroundColor: 'transparent', color: config?.text || defaultText, borderColor: 'transparent', boxShadow: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none', position: 'fixed' as 'fixed', left: 0, right: 0, zIndex: 50, ...(type === 'top-toolbar' ? { top: 0 } : { bottom: 0 }) };
        if (config) return { backgroundColor: config.bg, color: config.text, borderColor: config.border, fontFamily: config.font || 'inherit' };
        return { backgroundColor: defaultBg, color: defaultText, borderColor: defaultBorder };
    };

    const handleToastClose = useCallback(() => {
        setToast(prev => ({ ...prev, show: false }));
    }, []);

    if (isLoading) { return <div id="loader" className="fixed inset-0 bg-[#1f2937] text-white z-[9999] flex flex-col items-center justify-center"><div className="text-2xl font-bold mb-4">جاري تحميل المصحف...</div><div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden"><div id="progress-bar" className="h-full bg-green-500 transition-all duration-300" style={{width: `${loadingProgress}%`}}></div></div><div id="loader-status" className="mt-2 text-sm text-gray-400">{loadingStatus}</div></div> }
    
    const surahName = quranData?.surahs[currentAyah.s - 1]?.name.replace('سورة', '').trim() || '';
    const juz = JUZ_MAP.slice().reverse().find(j => (currentAyah.s > j.s) || (currentAyah.s === j.s && currentAyah.a >= j.a))?.j || 1;
    const page = quranData?.surahs[currentAyah.s - 1]?.ayahs.find((ay:any) => ay.numberInSurah === currentAyah.a)?.page || 1;
    const tafseerName = TAFSEERS.find(t => t.id === settings.tafseer)?.name || 'التفسير';

    return (
        <div
            className="quran-reader-container"
            style={{
                fontSize: `${settings.fontSize}rem`,
                fontFamily: settings.fontFamily,
                backgroundColor: settings.bgColor,
                color: settings.textColor,
            }}
        >
            {/* Top Toolbar */}
            <div
                className={`top-toolbar fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-3 border-b shadow-sm transition-all duration-300 ${hideUIOnScroll ? '-translate-y-full' : 'translate-y-0'}`}
                style={getToolbarStyle('top-toolbar', currentTheme.headerBg, currentTheme.headerText, currentTheme.headerBorder)}
            >
                <button onClick={onBack} className="toolbar-btn">
                    <i className="fa-solid fa-arrow-right text-lg"></i>
                </button>
                <div className="flex flex-col items-center flex-grow mx-2">
                    <span className="text-sm font-bold">{surahName}</span>
                    <span className="text-xs opacity-80">الجزء {toArabic(juz)} - صفحة {toArabic(page)}</span>
                </div>
                <button onClick={() => openModal('search-modal')} className="toolbar-btn">
                    <i className="fa-solid fa-search text-lg"></i>
                </button>
            </div>

            {/* Mushaf Content */}
            <div
                ref={mushafContentRef}
                className="mushaf-content overflow-y-auto hide-scrollbar pt-[80px] pb-[80px]"
            >
                {visiblePages.map(pageNum => (
                    <MushafPage
                        key={pageNum}
                        pageNum={pageNum}
                        pageData={getPageData(pageNum)}
                        highlightedAyahId={highlightedAyahId}
                        onAyahClick={handleAyahClick}
                        onVerseClick={handleVerseClick}
                        settings={settings}
                        currentTheme={currentTheme}
                        showSajdahNotification={handleSajdahVisible}
                    />
                ))}
            </div>

            {/* Floating Action Button */}
            <button
                ref={menuButtonRef}
                onClick={() => setIsFloatingMenuOpen(p => !p)}
                className="fixed bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: currentTheme.accent, color: currentTheme.accentText, borderColor: currentTheme.accent, boxShadow: `0 4px 10px ${currentTheme.accent}80` }}
            >
                <i className={`fa-solid ${isFloatingMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>

            {/* Floating Menu */}
            <div
                ref={floatingMenuRef}
                className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 transition-all duration-300 ${isFloatingMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
                style={{ transformOrigin: 'bottom center', borderColor: currentTheme.border, border: '1px solid' }}
            >
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => openModal('surah-juz-modal')} className="floating-menu-btn">
                        <i className="fa-solid fa-book-quran text-lg"></i>
                        <span>السور والأجزاء</span>
                    </button>
                    <button onClick={() => openModal('bookmarks-modal')} className="floating-menu-btn">
                        <i className="fa-solid fa-bookmark text-lg"></i>
                        <span>العلامات</span>
                    </button>
                    <button onClick={() => openModal('settings-modal')} className="floating-menu-btn">
                        <i className="fa-solid fa-cog text-lg"></i>
                        <span>الإعدادات</span>
                    </button>
                    <button onClick={() => openModal('themes-modal')} className="floating-menu-btn">
                        <i className="fa-solid fa-palette text-lg"></i>
                        <span>السمات</span>
                    </button>
                    <button onClick={() => openModal('download-quran-modal')} className="floating-menu-btn">
                        <i className="fa-solid fa-download text-lg"></i>
                        <span>تحميل القرآن</span>
                    </button>
                    <button onClick={() => openModal('download-tafsir-modal')} className="floating-menu-btn">
                        <i className="fa-solid fa-cloud-download-alt text-lg"></i>
                        <span>تحميل التفسير</span>
                    </button>
                    <button onClick={() => openModal('toolbar-color-picker-modal')} className="floating-menu-btn">
                        <i className="fa-solid fa-fill-drip text-lg"></i>
                        <span>ألوان الشريط</span>
                    </button>
                    <button onClick={toggleAudio} className="floating-menu-btn">
                        <i className={`fa-solid ${isPlaying || isAudioLoading ? 'fa-pause' : 'fa-play'} text-lg`}></i>
                        <span>{isPlaying ? 'إيقاف الصوت' : 'تشغيل الصوت'}</span>
                    </button>
                    <button onClick={toggleAutoScroll} className="floating-menu-btn">
                        <i className={`fa-solid ${autoScrollState.isActive ? 'fa-pause-circle' : 'fa-play-circle'} text-lg`}></i>
                        <span>{autoScrollState.isActive ? 'إيقاف التمرير' : 'تمرير تلقائي'}</span>
                    </button>
                </div>
            </div>

            {/* Bottom Toolbar */}
            <div
                className={`bottom-toolbar fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between p-3 border-t shadow-sm transition-all duration-300 ${hideUIOnScroll ? 'translate-y-full' : 'translate-y-0'}`}
                style={getToolbarStyle('bottom-toolbar', currentTheme.headerBg, currentTheme.headerText, currentTheme.headerBorder)}
            >
                <button onClick={() => jumpToPage(page - 1)} className="toolbar-btn">
                    <i className="fa-solid fa-arrow-right text-lg"></i>
                </button>
                <div className="flex items-center gap-2">
                    {isPageInputActive ? (
                        <input
                            ref={pageInputRef}
                            type="number"
                            value={pageInput}
                            onChange={handlePageInputChange}
                            onBlur={handlePageInputBlur}
                            className="w-16 text-center bg-transparent border-b-2 border-current focus:outline-none"
                            style={{ color: currentTheme.headerText }}
                            placeholder={toArabic(page)}
                        />
                    ) : (
                        <button onClick={handlePageButtonClick} className="toolbar-btn">
                            <span className="text-sm">صفحة {toArabic(page)}</span>
                        </button>
                    )}
                </div>
                <button onClick={() => jumpToPage(page + 1)} className="toolbar-btn">
                    <i className="fa-solid fa-arrow-left text-lg"></i>
                </button>
            </div>

            {/* Modals */}
            <SearchModal
                isOpen={activeModals['search-modal']}
                onClose={() => closeModal('search-modal')}
                onSelectAyah={jumpToAyah}
                quranData={quranData}
                currentTheme={currentTheme}
            />
            <ThemesModal
                isOpen={activeModals['themes-modal']}
                onClose={() => closeModal('themes-modal')}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
            />
            <SettingsModal
                isOpen={activeModals['settings-modal']}
                onClose={() => closeModal('settings-modal')}
                settings={settings}
                setSettings={setSettings}
                currentTheme={currentTheme}
            />
            <ToolbarColorPickerModal
                isOpen={activeModals['toolbar-color-picker-modal']}
                onClose={() => closeModal('toolbar-color-picker-modal')}
                toolbarColors={toolbarColors}
                setToolbarColors={setToolbarColors}
                isTransparentMode={isTransparentMode}
                setIsTransparentMode={setIsTransparentMode}
                currentTheme={currentTheme}
            />
            <QuranDownloadModal
                isOpen={activeModals['download-quran-modal']}
                onClose={() => closeModal('download-quran-modal')}
                quranData={quranData}
                showToast={showToast}
            />
            <TafsirDownloadModal
                isOpen={activeModals['download-tafsir-modal']}
                onClose={() => closeModal('download-tafsir-modal')}
                tafseers={TAFSEERS}
                showToast={showToast}
            />
            <SurahJuzModal
                isOpen={activeModals['surah-juz-modal']}
                onClose={() => closeModal('surah-juz-modal')}
                quranData={quranData}
                onSelectAyah={jumpToAyah}
            />
            <BookmarksModal
                isOpen={activeModals['bookmarks-modal']}
                onClose={() => closeModal('bookmarks-modal')}
                bookmarks={bookmarks}
                onDeleteBookmark={deleteBookmark}
                onSelectAyah={jumpToAyah}
            />
            <Toast
                show={toast.show}
                message={toast.message}
                onClose={handleToastClose}
            />
            <SajdahCardModal
                info={sajdahCardInfo}
                onClose={handleCloseSajdahCard}
            />
            <TafseerModal
                isOpen={tafseerInfo.isOpen}
                onClose={() => setTafseerInfo(prev => ({ ...prev, isOpen: false }))}
                tafseerText={tafseerInfo.text}
                surahName={tafseerInfo.surahName}
                ayahNum={tafseerInfo.a}
                isLoading={isTafseerLoading}
                tafseerName={tafseerName}
            />
        </div>
    );
};

export default QuranReader;
