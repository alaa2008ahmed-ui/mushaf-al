import React, { useState, useEffect } from 'react';
import { READERS, TAFSEERS } from './constants';

interface SettingsModalProps {
    onClose: () => void;
    onOpenModal: (modalName: string) => void;
    showToast: (msg: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onOpenModal, showToast }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Match animation duration
    };

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
    
    const [hideUIOnScroll, setHideUIOnScroll] = useState(() => localStorage.getItem('hide_ui_on_scroll') === 'true');
    const [showSajdahCard, setShowSajdahCard] = useState(() => {
        const saved = localStorage.getItem('show_sajdah_card');
        return saved !== null ? saved === 'true' : true;
    });



    const updateSetting = (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('quran_settings', JSON.stringify(newSettings));
        // Dispatch event for live updates
        window.dispatchEvent(new Event('settings-change'));
    };

    const handleHideUIToggle = (checked: boolean) => {
        setHideUIOnScroll(checked);
        localStorage.setItem('hide_ui_on_scroll', String(checked));
        window.dispatchEvent(new Event('settings-change'));
        showToast(checked ? 'سيتم إخفاء الأزرار أثناء التمرير' : 'سيتم إبقاء الأزرار أثناء التمرير');
    };

    const handleSajdahCardToggle = (checked: boolean) => {
        setShowSajdahCard(checked);
        localStorage.setItem('show_sajdah_card', String(checked));
        window.dispatchEvent(new Event('settings-change'));
        showToast(checked ? 'تم تفعيل بطاقة السجدة الكبرى' : 'تم إيقاف بطاقة السجدة الكبرى');
    };




    const getReaderName = (id: string) => READERS.find(r => r.id === id)?.name || id;
    const getTafseerName = (id: string) => TAFSEERS.find(t => t.id === id)?.name || id;
    const getFontName = (val: string) => {
        const fontMap: Record<string, string> = {
            "var(--font-amiri-quran)": "حفص", "var(--font-amiri)": "نسخ", "var(--font-scheherazade)": "مجود",
            "var(--font-lateef)": "تراثي", "var(--font-harmattan)": "ورش", "var(--font-aref)": "رقعة",
            "var(--font-gulzar)": "نستعليق", "var(--font-kufi)": "كوفي", "var(--font-kufam)": "كوفي حديث",
            "var(--font-noto)": "نسخ حديث", "var(--font-cairo)": "القاهرة", "var(--font-messiri)": "المسيري",
            "var(--font-rakkas)": "رقاص", "var(--font-lalezar)": "لالزار", "var(--font-katibeh)": "قطيبة",
            "var(--font-tajawal)": "تجوّل", "var(--font-changa)": "شنقة", "var(--font-mirza)": "ميرزا",
            "var(--font-qalam)": "قلم", "var(--font-thuluth)": "ثلوث", "var(--font-digital)": "رقمي"
        };
        return fontMap[val] || "افتراضي";
    };

    return (
        <div className={`fixed inset-0 bg-gray-900 bg-opacity-75 z-[150] flex items-center justify-center p-4 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`} onClick={handleClose}>
            <div className={`modal-skinned w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-white dark:bg-gray-800 text-gray-800 dark:text-white ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`} onClick={e => e.stopPropagation()}>
                <div className="p-3 flex justify-between items-center h-12 flex-none theme-header-bg">
                    <h2 className="text-lg font-bold">إعدادات العرض</h2>
                    <button onClick={handleClose} className="hover:opacity-80 rounded-full bg-white/20 w-8 h-8 flex items-center justify-center">✕</button>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto text-center">
                    <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                        <div id="settings-preview" className="rounded-lg border p-2 transition-all duration-300 shadow-sm text-center" dir="rtl" style={{ backgroundColor: settings.bgColor, borderColor: settings.barBorder }}>
                            <p className="leading-loose text-center" style={{ fontSize: `${settings.fontSize}rem`, fontFamily: settings.fontFamily, color: settings.textColor }}>﴿إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ﴾</p>
                        </div>
                    </div>
                    
                    <div className="border-b pb-2 border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex items-center justify-between mt-3">
                            <label className="text-sm font-bold opacity-80">حجم الخط</label>
                            <span className="text-xs px-2 rounded bg-gray-100 dark:bg-gray-700">{settings.fontSize}</span>
                        </div>
                        <input type="range" min="0.5" max="4.5" step="0.1" value={settings.fontSize} onChange={(e) => updateSetting('fontSize', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-b pb-2 border-gray-200 dark:border-gray-700">
                        <div>
                            <label className="text-xs font-bold block mb-1 opacity-80">لون النص</label>
                            <div className="h-8 w-full rounded border border-gray-300 relative overflow-hidden">
                                <input type="color" value={settings.textColor} onChange={(e) => updateSetting('textColor', e.target.value)} className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 opacity-80">لون الخلفية</label>
                            <div className="h-8 w-full rounded border border-gray-300 relative overflow-hidden">
                                <input type="color" value={settings.bgColor} onChange={(e) => updateSetting('bgColor', e.target.value)} className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0" />
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                        <label className="text-xs font-bold block opacity-80">نوع الخط</label>
                        <div className="mt-1">
                            <div className="custom-select-wrapper mt-0.5">
                                <div className="custom-select-display text-xs h-7">{getFontName(settings.fontFamily)}</div>
                                <select value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value)} className="custom-select-design">
                                    <option value="var(--font-amiri-quran)">حفص</option>
                                    <option value="var(--font-amiri)">نسخ</option>
                                    <option value="var(--font-scheherazade)">مجود</option>
                                    <option value="var(--font-lateef)">تراثي</option>
                                    <option value="var(--font-harmattan)">ورش</option>
                                    <option value="var(--font-aref)">رقعة</option>
                                    <option value="var(--font-gulzar)">نستعليق</option>
                                    <option value="var(--font-kufi)">كوفي</option>
                                    <option value="var(--font-kufam)">كوفي حديث</option>
                                    <option value="var(--font-noto)">نسخ حديث</option>
                                    <option value="var(--font-cairo)">القاهرة</option>
                                    <option value="var(--font-messiri)">المسيري</option>
                                    <option value="var(--font-rakkas)">رقاص</option>
                                    <option value="var(--font-lalezar)">لالزار</option>
                                    <option value="var(--font-katibeh)">قطيبة</option>
                                    <option value="var(--font-tajawal)">تجوّل</option>
                                    <option value="var(--font-changa)">شنقة</option>
                                    <option value="var(--font-mirza)">ميرزا</option>
                                    <option value="var(--font-qalam)">قلم</option>
                                    <option value="var(--font-thuluth)">ثلوث</option>
                                    <option value="var(--font-digital)">رقمي</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                        <label className="text-xs font-bold block opacity-80">القارئ</label>
                        <div className="custom-select-wrapper">
                            <div className="custom-select-display text-xs h-7">{getReaderName(settings.reader)}</div>
                            <select value={settings.reader} onChange={(e) => updateSetting('reader', e.target.value)} className="custom-select-design">
                                {READERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                        <label className="text-xs font-bold block opacity-80">التفسير</label>
                        <div className="custom-select-wrapper">
                            <div className="custom-select-display text-xs h-7">{getTafseerName(settings.tafseer)}</div>
                            <select value={settings.tafseer} onChange={(e) => updateSetting('tafseer', e.target.value)} className="custom-select-design">
                                {TAFSEERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="border-b pb-2 border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold opacity-80">سرعة التمرير (وقت الجزء)</label>
                        </div>
                        <div className="custom-select-wrapper mt-1">
                             <div className="custom-select-display text-xs h-7">{settings.scrollMinutes} دقيقة</div>
                             <select value={settings.scrollMinutes} onChange={(e) => updateSetting('scrollMinutes', parseInt(e.target.value))} className="custom-select-design">
                                {Array.from({length: 56}, (_, i) => i + 5).map(i => <option key={i} value={i}>{i} دقيقة</option>)}
                             </select>
                        </div>
                        <div className="pt-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold opacity-80">إخفاء الأزرار أثناء التمرير</label>
                                <div className="relative inline-block w-10 align-middle select-none">
                                    <input type="checkbox" id="hide-ui-scroll" checked={hideUIOnScroll} onChange={(e) => handleHideUIToggle(e.target.checked)} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-2 appearance-none cursor-pointer"/>
                                    <label htmlFor="hide-ui-scroll" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${hideUIOnScroll ? 'bg-emerald-500' : 'bg-gray-300'}`}></label>
                                </div>
                            </div>
                        </div>
                        <div className="pt-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold opacity-80">إظهار بطاقة السجدة</label>
                                <div className="relative inline-block w-10 align-middle select-none">
                                    <input type="checkbox" id="show-sajdah-card" checked={showSajdahCard} onChange={(e) => handleSajdahCardToggle(e.target.checked)} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-2 appearance-none cursor-pointer"/>
                                    <label htmlFor="show-sajdah-card" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${showSajdahCard ? 'bg-emerald-500' : 'bg-gray-300'}`}></label>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                        <div className="custom-select-wrapper">
                            <button onClick={() => onOpenModal('toolbar-color-picker-modal')} className="custom-select-display text-xs h-8 w-full text-right px-2 flex items-center justify-between">
                                <span>تخصيص الواجهة</span>
                                <i className="fa-solid fa-chevron-left text-gray-500 text-xs"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                        <div className="custom-select-wrapper">
                            <button onClick={() => { onClose(); onOpenModal('quran-download-modal'); }} className="custom-select-display text-xs h-8 w-full text-right px-2 flex items-center justify-between">
                                <span>تحميل القرآن الكريم</span>
                                <i className="fa-solid fa-chevron-left text-gray-500 text-xs"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                        <div className="custom-select-wrapper">
                            <button onClick={() => { onClose(); onOpenModal('tafsir-download-modal'); }} className="custom-select-display text-xs h-8 w-full text-right px-2 flex items-center justify-between">
                                <span>تحميل التفسير</span>
                                <i className="fa-solid fa-chevron-left text-gray-500 text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 text-center flex-none">
                    <button onClick={handleClose} className="theme-accent-btn bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-8 rounded-lg shadow text-sm w-full">حفظ وإغلاق</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;