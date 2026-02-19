import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toArabic } from './constants';

interface SearchModalProps {
    quranData: any;
    onSelect: (surah: number, ayah: number) => void;
    onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ quranData, onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchStats, setSearchStats] = useState('');
    const [searchJobId, setSearchJobId] = useState(0);
    const searchTimeoutRef = useRef<any>(null);

    const normalizeArabic = (text: string) => {
        return text.replace(/[\u064B-\u065F\u0670]/g, "")
                   .replace(/\u0640/g, "")
                   .replace(/[أإآٱ]/g, "ا")
                   .replace(/ة/g, "ه")
                   .replace(/ى/g, "ي");
    };

    const handleSearchInput = (q: string) => {
        setQuery(q);
        if (q.trim() !== '') {
            setSearchStats('جاري الكتابة...');
        } else {
            setSearchStats('');
            setResults([]);
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => performSearch(q), 500);
    };

    const performSearch = (q: string) => {
        if (!quranData) return;
        
        const newJobId = searchJobId + 1;
        setSearchJobId(newJobId);
        
        q = q.trim();
        if (q === '') {
            setResults([]);
            setSearchStats('');
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setSearchStats('...');
        
        // Use setTimeout to allow UI update before heavy processing
        setTimeout(() => {
            executeSearchOptimized(q, newJobId);
        }, 10);
    };

    const executeSearchOptimized = (q: string, jobId: number) => {
        const normQ = normalizeArabic(q);
        const highlightPattern = normQ.split('').map(c => (c==='ا'?'[أإآٱا]':(c==='ه'?'[هة]':(c==='ي'?'[يى]':c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))))).join('[\\u064B-\\u065F\\u0670]*');
        const regex = new RegExp(highlightPattern, 'gi');
        
        const foundResults: any[] = [];
        let sIdx = 0;
        let aIdx = 0;

        const processChunk = () => {
            if (jobId !== searchJobId && searchJobId > jobId) return; // Cancelled by newer search
            
            const start = performance.now();
            while (sIdx < quranData.surahs.length) {
                const surah = quranData.surahs[sIdx];
                while (aIdx < surah.ayahs.length) {
                    const ayah = surah.ayahs[aIdx];
                    if (normalizeArabic(ayah.text).includes(normQ)) {
                        foundResults.push({ 
                            text: ayah.text, 
                            surah: surah.number, 
                            surahName: surah.name, 
                            ayah: ayah.numberInSurah, 
                            page: ayah.page,
                            highlightRegex: regex
                        });
                        if (foundResults.length >= 50) {
                            setResults(foundResults);
                            setSearchStats(`النتائج: أكثر من ${toArabic(foundResults.length)}`);
                            setIsSearching(false);
                            return;
                        }
                    }
                    aIdx++;
                    if (performance.now() - start > 10) {
                        setTimeout(processChunk, 0);
                        return;
                    }
                }
                aIdx = 0;
                sIdx++;
            }
            
            setResults(foundResults);
            setSearchStats(`النتائج: ${toArabic(foundResults.length)}`);
            setIsSearching(false);
        };

        processChunk();
    };

    const highlightText = (text: string, regex: RegExp) => {
        const parts = text.split(regex);
        const matches = text.match(regex) || [];
        return (
            <>
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        {part}
                        {matches[i] && <span className="highlighted-search-term">{matches[i]}</span>}
                    </React.Fragment>
                ))}
            </>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] bg-gray-900/90 flex justify-center items-center px-4 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="modal-skinned bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 rounded-t-2xl flex justify-between items-center shadow-md theme-header-bg">
                    <h3 className="font-bold text-lg">البحث في المصحف</h3>
                    <button onClick={onClose} className="text-2xl hover:opacity-80 transition">&times;</button>
                </div>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            placeholder="اكتب كلمة للبحث..." 
                            className="w-full p-3 pl-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold placeholder-gray-500 dark:placeholder-gray-300"
                            autoFocus
                        />
                        <button onClick={() => performSearch(query)} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-emerald-500 text-white p-1.5 rounded-lg hover:bg-emerald-600 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        </button>
                    </div>
                    <div className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400 font-bold">{searchStats}</div>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900 relative">
                    {isSearching && (
                        <div className="text-center mt-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                            <p className="mt-2 text-gray-500 font-bold">جاري البحث...</p>
                        </div>
                    )}
                    
                    {!isSearching && results.length === 0 && query.trim() !== '' && (
                        <div className="text-center text-gray-400 mt-10">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            <p>لا توجد نتائج لبحثك</p>
                        </div>
                    )}

                    {!isSearching && results.length === 0 && query.trim() === '' && (
                        <div className="text-center text-gray-400 mt-10">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            <p>ابدأ البحث عن أي كلمة أو آية</p>
                        </div>
                    )}

                    {results.map((r, idx) => (
                        <div key={idx} className="search-context-block search-main-ayah" onClick={() => { onSelect(r.surah, r.ayah); onClose(); }}>
                            <div className="search-context-label">{r.surahName} - آية {toArabic(r.ayah)} - صفحة {toArabic(r.page)}</div>
                            <div className="search-context-ayah">
                                {highlightText(r.text, r.highlightRegex)}
                            </div>
                        </div>
                    ))}
                    
                    {!isSearching && results.length >= 50 && (
                        <div className="text-center text-sm text-gray-500 py-2">تم عرض أول {toArabic(results.length)} نتيجة فقط</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
