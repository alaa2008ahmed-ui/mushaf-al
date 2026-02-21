import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const DateTimeMarquee: React.FC = () => {
    const { theme } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());


    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    const hijriFormatOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };

    const gregorianFormatOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };

    // Arabic formats
    const hijriDateAr = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', hijriFormatOptions).format(currentDate);
    const gregorianDateAr = new Intl.DateTimeFormat('ar-SA', gregorianFormatOptions).format(currentDate);
    const timeAr = currentDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const displayStringAr = `${hijriDateAr}  |  ${gregorianDateAr}  |  ${timeAr}`;
;

    return (
        <>
            <style>
                {`
                    @keyframes marquee-rtl-custom {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    @keyframes marquee-ltr-custom {
                        0% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                    }
                    .animate-marquee-rtl-custom {
                        animation: marquee-rtl-custom 40s linear infinite;
                    }
                    .animate-marquee-ltr-custom {
                        animation: marquee-ltr-custom 40s linear infinite;
                    }
                    .luminous-bar {
                        box-shadow: 0 0 15px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.05);
                    }
                `}
            </style>
            <div 
                className="fixed bottom-16 left-0 right-0 z-10 bg-black/90 backdrop-blur-xl font-mono text-lg overflow-hidden whitespace-nowrap py-2.5 border-y border-white/10 luminous-bar"
                style={{ 
                    color: theme.palette[0], 
                    textShadow: `0 0 10px ${theme.palette[0]}, 0 0 20px ${theme.palette[0]}, 0 0 30px ${theme.palette[0]}` 
                }}
            >
                <div 
                    className={`flex w-fit transition-opacity duration-1000 animate-marquee-rtl-custom`}
                    dir={'rtl'}
                >
                    <span className="px-6 flex-shrink-0">{displayStringAr}</span>
                    <span className="px-6 flex-shrink-0">{displayStringAr}</span>
                    <span className="px-6 flex-shrink-0">{displayStringAr}</span>
                    <span className="px-6 flex-shrink-0">{displayStringAr}</span>
                </div>
            </div>
        </>
    );
};

export default DateTimeMarquee;
