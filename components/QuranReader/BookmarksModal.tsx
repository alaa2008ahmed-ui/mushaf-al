import React from 'react';
import { toArabic } from './constants';

interface BookmarksModalProps {
    bookmarks: any[];
    quranData: any;
    onSelect: (surah: number, ayah: number) => void;
    onDelete: (id: number) => void;
    onClose: () => void;
}

const BookmarksModal: React.FC<BookmarksModalProps> = ({ bookmarks, quranData, onSelect, onDelete, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/90 flex justify-center pt-10 px-4 animate-fadeIn" onClick={onClose}>
            <div className="modal-skinned bg-white dark:bg-gray-800 w-full max-w-2xl rounded-t-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 theme-header-bg rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-bold text-lg">الإشارات المرجعية</h3>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-2">
                    {bookmarks.length === 0 ? (
                        <div className="text-center p-4 font-bold">لا توجد إشارات مرجعية محفوظة</div>
                    ) : (
                        bookmarks.map(b => {
                            const surahName = quranData?.surahs[b.s - 1]?.name.replace('سورة','').trim() || '';
                            return (
                                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border mb-2 transition theme-card-bg">
                                    <div className="flex-grow cursor-pointer" onClick={() => { onSelect(b.s, b.a); onClose(); }}>
                                        <div className="font-bold text-lg" style={{ fontFamily: 'var(--font-amiri-quran)' }}>
                                            {surahName} - آية {toArabic(b.a)}
                                        </div>
                                        <div className="text-xs mt-1 font-bold opacity-70">{b.date} | {b.time}</div>
                                    </div>
                                    <button onClick={() => onDelete(b.id)} className="text-red-500 hover:text-red-700 p-2 text-xl">
                                        <i className="fa-solid fa-trash-alt"></i>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookmarksModal;
