import React, { useState, useRef, useEffect } from 'react';

interface CustomMonthPickerProps {
    label?: string;
    value: string; // Format: YYYY-MM
    onChange: (value: string) => void;
    themeColor?: string;
    direction?: 'up' | 'down';
    align?: 'left' | 'right';
}

const CustomMonthPicker: React.FC<CustomMonthPickerProps> = ({
    label,
    value,
    onChange,
    themeColor = '#2563eb',
    direction = 'down',
    align = 'left'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentYear, setCurrentYear] = useState(() => {
        return value ? parseInt(value.split('-')[0]) : new Date().getFullYear();
    });
    
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync view year with value when opened
    useEffect(() => {
        if (isOpen && value) {
            setCurrentYear(parseInt(value.split('-')[0]));
        }
    }, [isOpen, value]);

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

    const formatMonthDisplay = (monthStr: string) => {
        if (!monthStr) return '';
        const parts = monthStr.split('-');
        if (parts.length === 2) {
            return `${parts[1]}/${parts[0]}`;
        }
        return monthStr;
    };

    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const renderMonths = () => {
        return monthNamesShort.map((month, index) => {
            const monthStr = `${currentYear}-${String(index + 1).padStart(2, '0')}`;
            const isSelected = value === monthStr;
            const isCurrentMonth = new Date().getFullYear() === currentYear && new Date().getMonth() === index;

            return (
                <button
                    key={month}
                    type="button"
                    onClick={() => {
                        onChange(monthStr);
                        setIsOpen(false);
                    }}
                    className={`py-2 px-1 rounded-md text-sm font-medium transition-colors text-center
                        ${isSelected ? 'text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}
                        ${isCurrentMonth && !isSelected ? 'border border-blue-500 font-bold' : ''}
                    `}
                    style={isSelected ? { backgroundColor: themeColor } : {}}
                >
                    {month}
                </button>
            );
        });
    };

    return (
        <div className="flex flex-col gap-1 w-[140px] sm:w-[160px]" ref={dropdownRef}>
            {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
            
            <div className="relative w-full">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between border border-gray-300 rounded-md p-1.5 bg-white transition-all focus:ring-2 focus:ring-opacity-50 text-left cursor-pointer hover:border-gray-400"
                    style={{'--tw-ring-color': themeColor} as React.CSSProperties}
                >
                    <span className="text-gray-900 text-sm font-semibold tracking-wide">
                        {formatMonthDisplay(value) || "Select Month"}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                </button>

                {isOpen && (
                    <div 
                        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} sm:left-0 sm:right-auto w-[240px] bg-white rounded-lg shadow-2xl z-[110] p-3 border border-gray-200 ${
                            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
                        } transform origin-top-left transition-all`}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <button type="button" onClick={() => setCurrentYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <span className="font-bold text-gray-800 text-base">
                                {currentYear}
                            </span>
                            <button type="button" onClick={() => setCurrentYear(y => y + 1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {renderMonths()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomMonthPicker;
