import React, { useState, useRef, useEffect } from 'react';

interface CustomDatePickerProps {
    label?: string;
    value: string; // format YYYY-MM-DD
    onChange: (date: string) => void;
    direction?: 'up' | 'down';
    themeColor?: string;
    align?: 'left' | 'right';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    label,
    value,
    onChange,
    direction = 'down',
    themeColor = '#3b82f6',
    align = 'left'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Parse initial value or use current date
    const initialDate = value ? new Date(value) : new Date();
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (!isOpen) {
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
            }
        }
    }, [value, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    const handleDayClick = (day: number) => {
        const yyyy = viewYear;
        const mm = String(viewMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    
    const daysArray = [];
    for (let i = 0; i < firstDay; i++) {
        daysArray.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        daysArray.push(i);
    }

    const formatDateDDMMYYYY = (dateString: string) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    return (
        <div className="flex flex-col gap-1 w-full" ref={dropdownRef}>
            {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
            
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between border border-gray-300 rounded-md p-1.5 sm:p-2 bg-white transition-all focus:ring-2 focus:ring-opacity-50 text-left cursor-pointer hover:border-gray-400"
                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                >
                    <span className="text-gray-900 text-sm sm:text-base font-semibold tracking-wide">
                        {value ? formatDateDDMMYYYY(value) : 'Select Date'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                </button>

                {isOpen && (
                    <div 
                        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} sm:left-0 sm:right-auto w-[280px] sm:w-[300px] bg-white rounded-lg shadow-2xl z-[110] p-3 sm:p-4 border border-gray-200 ${
                            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <button 
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <span className="font-bold text-gray-800 text-sm sm:text-base">
                                {MONTHS[viewMonth]} {viewYear}
                            </span>
                            <button 
                                type="button"
                                onClick={handleNextMonth}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {DAYS.map(day => (
                                <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase">
                                    {day.substring(0, 2)}
                                </div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-sm">
                            {daysArray.map((day, idx) => {
                                if (day === null) {
                                    return <div key={`empty-${idx}`} className="h-8 w-8 mx-auto"></div>;
                                }
                                
                                const isSelected = value && 
                                    new Date(value).getFullYear() === viewYear && 
                                    new Date(value).getMonth() === viewMonth && 
                                    new Date(value).getDate() === day;
                                    
                                const isToday = 
                                    new Date().getFullYear() === viewYear && 
                                    new Date().getMonth() === viewMonth && 
                                    new Date().getDate() === day;

                                return (
                                    <button
                                        key={`day-${day}`}
                                        type="button"
                                        onClick={() => handleDayClick(day)}
                                        className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full transition-colors font-medium
                                            ${isSelected 
                                                ? 'text-white shadow-md' 
                                                : isToday
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }
                                        `}
                                        style={isSelected ? { backgroundColor: themeColor } : {}}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomDatePicker;
