import React, { useEffect, useRef } from 'react';
import { SAJDAH_LOCATIONS, toArabic } from './constants';

interface MushafPageProps {
    pageNum: number;
    pageData: any[];
    highlightedAyahId: string | null;
    onAyahClick: (surah: number, ayah: number) => void;
    onSajdahVisible: (surah: string, ayah: number) => void;
    settings?: {
        fontSize: number;
        fontFamily: string;
        textColor: string;
        theme: string;
    };
}

const MushafPage: React.FC<MushafPageProps> = React.memo(({ pageNum, pageData, highlightedAyahId, onAyahClick, onSajdahVisible, settings }) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const pageRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target as HTMLElement;
                    if (el.dataset.surah && el.dataset.ayah) {
                        onSajdahVisible(el.dataset.surah, Number(el.dataset.ayah));
                        observer.unobserve(el); // To show only once per appearance
                    }
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
    
    const pageStyle = {
        fontSize: settings ? `${settings.fontSize}rem` : '1.7rem',
        fontFamily: settings?.fontFamily || 'var(--font-amiri)',
        color: settings?.theme === 'dark' ? '#fff' : (settings?.textColor || '#000')
    };

    const headerStyle = {
        fontSize: settings ? `${settings.fontSize * 0.94}rem` : '1.6rem',
        fontFamily: settings?.fontFamily || 'var(--font-amiri)'
    };

    return (
        <div className="mushaf-page" data-page={pageNum} ref={pageRef} style={{ backgroundColor: 'transparent' }}>
            <div className="page-content" style={pageStyle}>
                {pageData.map(ayah => {
                    const isSajdah = SAJDAH_LOCATIONS.some(sl => sl.s === ayah.sNum && sl.a === ayah.numberInSurah);
                    const showHeader = currentSurah !== ayah.sNum && ayah.numberInSurah === 1;
                    if (showHeader) currentSurah = ayah.sNum;
                    
                    const text = (ayah.numberInSurah === 1 && ayah.sNum !== 1 && ayah.sNum !== 9) 
                        ? ayah.text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', '').trim() 
                        : ayah.text;
                    
                    const id = `ayah-${ayah.sNum}-${ayah.numberInSurah}`;

                    return (
                        <React.Fragment key={id}>
                            {showHeader && ( 
                                <> 
                                    <div className="surah-header">
                                        <span className="surah-name" style={headerStyle}>{ayah.sName.replace('سورة', '').trim()}</span>
                                    </div> 
                                    {ayah.sNum !== 1 && ayah.sNum !== 9 && (
                                        <div className="bismillah" style={headerStyle}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                                    )} 
                                </> 
                            )}
                            <span 
                                id={id} 
                                className={`ayah-text-block ${highlightedAyahId === id ? 'highlighted' : ''} ${isSajdah ? 'ayah-sajdah' : ''}`} 
                                onClick={() => onAyahClick(ayah.sNum, ayah.numberInSurah)} 
                                data-sajdah={isSajdah} 
                                data-surah={ayah.sName.replace('سورة','').trim()} 
                                data-ayah={ayah.numberInSurah}
                            >
                                {text}
                                <span className="verse-container">
                                    <span className="verse-bracket">﴿</span>
                                    <span className="verse-num-inner">{toArabic(ayah.numberInSurah)}</span>
                                    <span className="verse-bracket">﴾</span>
                                </span>
                            </span>
                        </React.Fragment>
                    );
                })}
            </div>
            <div className="page-footer">
                <span className="page-number-bracket">﴿</span>
                <span className="page-number-text">{toArabic(pageNum)}</span>
                <span className="page-number-bracket">﴾</span>
            </div>
        </div>
    );
});

export default MushafPage;
