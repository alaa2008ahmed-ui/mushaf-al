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

    const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', hijriFormatOptions).format(currentDate);
    const gregorianDate = new Intl.DateTimeFormat('ar-SA', gregorianFormatOptions).format(currentDate);
    const time = currentDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const displayString = `${hijriDate}  |  ${gregorianDate}  |  ${time}`;

    return (
        <div 
            className="fixed bottom-16 left-0 right-0 z-10 bg-black font-mono text-lg overflow-hidden whitespace-nowrap py-2 shadow-lg"
            style={{ color: theme.palette[0], textShadow: `0 0 5px ${theme.palette[0]}, 0 0 10px ${theme.palette[0]}, 0 0 15px ${theme.palette[0]}` }}
            dir="rtl"
        >
            <div className="animate-marquee-ltr flex">
                <span className="mx-12 flex-shrink-0">{displayString}</span>
                <span className="mx-12 flex-shrink-0">{displayString}</span>
            </div>
        </div>
    );
};

export default DateTimeMarquee;
