import React from 'react';
import { JUZ_MAP, toArabic } from './constants';

interface SurahJuzModalProps {
    type: 'surah' | 'juz';
    quranData: any;
    onSelect: (surahOrJuz: number, ayah?: number) => void;
    onClose: () => void;
}

const SurahJuzModal: React.FC<SurahJuzModalProps> = ({ type, quranData, onSelect, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/90 flex justify-center pt-10 px-4 animate-fadeIn" onClick={onClose}>
            <div className="modal-skinned bg-white dark:bg-gray-800 w-full max-w-4xl rounded-t-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 theme-header-bg rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-bold text-lg">{type === 'surah' ? 'اختر السورة' : 'اختر الجزء'}</h3>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {type === 'surah' ? (
                        quranData?.surahs.map((s: any) => (
                            <button 
                                key={s.number} 
                                onClick={() => onSelect(s.number, 1)} 
                                className="p-3 rounded-lg transition text-right font-bold border-2 flex justify-between items-center group theme-btn-bg"
                            >
                                <span>
                                    <span className="text-emerald-600 dark:text-emerald-400">{toArabic(s.number)}.</span> 
                                    <span> {s.name.replace('سورة', '').trim()}</span>
                                </span>
                                <span className="text-xs font-normal opacity-80">
                                    {s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} - {toArabic(s.ayahs.length)} آية
                                </span>
                            </button>
                        ))
                    ) : (
                        JUZ_MAP.map((j: any) => (
                            <button 
                                key={j.j} 
                                onClick={() => onSelect(j.j)} 
                                className="p-3 rounded-lg transition font-bold border-2 flex flex-col items-center justify-center text-center theme-btn-bg"
                            >
                                <span className="text-lg mb-1 text-emerald-600 dark:text-emerald-400">الجزء {toArabic(j.j)}</span>
                                <span className="text-xs font-normal opacity-80">
                                    {quranData?.surahs[j.s-1]?.name.replace('سورة','').trim()} آية {toArabic(j.a)}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SurahJuzModal;
