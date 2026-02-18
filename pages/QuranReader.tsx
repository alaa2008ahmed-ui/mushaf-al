
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { pageData } from '../data/pageData';

const toArabicNumerals = (num) => String(num).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

const QuranReader = ({ onBack }) => {
    const { theme } = useTheme();
    const [currentPage, setCurrentPage] = useState(1);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [bookmarkedPage, setBookmarkedPage] = useState(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Load last read page and bookmark
    useEffect(() => {
        const lastPage = localStorage.getItem('quran_last_page');
        const savedBookmark = localStorage.getItem('quran_bookmark');
        const initialPage = savedBookmark ? parseInt(savedBookmark, 10) : (lastPage ? parseInt(lastPage, 10) : 1);
        
        setCurrentPage(initialPage);
        if (savedBookmark) {
            setBookmarkedPage(parseInt(savedBookmark, 10));
        }

        const container = containerRef.current;
        if (container) {
             setTimeout(() => {
                const targetPage = container.querySelector(`[data-page-id="${initialPage}"]`);
                if (targetPage) {
                    targetPage.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }, 100);
        }
    }, []);

    // Lazy load images
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const pageDiv = entry.target as HTMLDivElement;
                        const pageNum = pageDiv.dataset.pageId;
                        const img = pageDiv.querySelector('img');
                        if (img && !img.src) {
                            img.src = `https://verses.quran.com/images/hafs/v1/page/${pageNum}.png`;
                        }
                        observer.unobserve(pageDiv);
                    }
                });
            },
            { rootMargin: '200px' }
        );

        pageRefs.current.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, []);

    // Update current page on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.getAttribute('data-page-id') || '1', 10);
                        setCurrentPage(pageNum);
                        localStorage.setItem('quran_last_page', String(pageNum));
                    }
                });
            },
            { threshold: 0.5 }
        );

        const currentRefs = pageRefs.current;
        currentRefs.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => {
            currentRefs.forEach(ref => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, []);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const page = parseInt(e.target.value, 10);
        setCurrentPage(page);
        const targetPage = containerRef.current?.querySelector(`[data-page-id="${page}"]`);
        if (targetPage) {
            targetPage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };
    
    const toggleBookmark = () => {
        if (bookmarkedPage === currentPage) {
            setBookmarkedPage(null);
            localStorage.removeItem('quran_bookmark');
        } else {
            setBookmarkedPage(currentPage);
            localStorage.setItem('quran_bookmark', String(currentPage));
        }
    };

    const HeaderInfo = () => {
        const data = pageData[currentPage - 1];
        if (!data) return null;
        return (
            <>
                <span>{`الجزء ${toArabicNumerals(data.juz)}`}</span>
                <span className="opacity-50 mx-2">|</span>
                <span>{data.surah}</span>
            </>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-black">
            <header 
                className={`app-top-bar transition-transform duration-300 ${!controlsVisible ? '-translate-y-full' : ''}`}
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
            >
                <div className="w-full max-w-4xl mx-auto flex justify-between items-center text-white font-bold px-4 h-14">
                    <button onClick={onBack} className="text-xl"><i className="fa-solid fa-arrow-right"></i></button>
                    <div className="text-sm"><HeaderInfo /></div>
                    <div className="text-xl">{toArabicNumerals(currentPage)}</div>
                </div>
            </header>

            <main ref={containerRef} className="flex-1 overflow-y-auto w-full snap-y snap-mandatory">
                {Array.from({ length: 604 }, (_, i) => i + 1).map(pageNum => (
                    <div
                        key={pageNum}
                        // FIX: Changed ref callback to use block body to ensure a void return type.
                        ref={el => { pageRefs.current[pageNum - 1] = el; }}
                        data-page-id={pageNum}
                        className="w-full h-full flex-shrink-0 snap-start flex items-center justify-center bg-gray-900"
                        onClick={() => setControlsVisible(v => !v)}
                    >
                        <img
                            alt={`Page ${pageNum} of the Quran`}
                            className="max-w-full max-h-full object-contain"
                            style={{aspectRatio: '0.69'}} // Approximate ratio for Quran pages
                        />
                    </div>
                ))}
            </main>

            <footer className={`fixed bottom-0 left-0 right-0 z-20 p-2 transition-transform duration-300 ${!controlsVisible ? 'translate-y-full' : ''}`}>
                <div 
                    className="w-full max-w-2xl mx-auto p-2 rounded-2xl flex items-center gap-2"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
                >
                    <button onClick={toggleBookmark} className="p-3 text-2xl" style={{color: bookmarkedPage === currentPage ? theme.palette[1] : 'white'}}>
                        <i className={`fa-solid ${bookmarkedPage === currentPage ? 'fa-bookmark' : 'fa-bookmark-o'}`}></i>
                    </button>
                    <input
                        type="range"
                        min="1"
                        max="604"
                        value={currentPage}
                        onChange={handleSliderChange}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, ${theme.palette[0]} 0%, ${theme.palette[0]} ${((currentPage-1)/603)*100}%, #555 ${((currentPage-1)/603)*100}%, #555 100%)` }}

                    />
                </div>
            </footer>
        </div>
    );
};

export default QuranReader;
