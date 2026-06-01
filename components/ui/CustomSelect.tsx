import React, { useState, useRef, useEffect } from 'react';

interface Option {
    id: string;
    name: string;
    code?: string;
}

interface CustomSelectProps {
    label?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    readOnly?: boolean;
    themeColor?: string;
    direction?: 'up' | 'down';
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select option',
    className = '',
    disabled = false,
    readOnly = false,
    themeColor = '#16a34a',
    direction = 'down'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isInteractionDisabled = disabled || readOnly;

    const selectedOption = options.find(opt => (opt.id || (opt as any).value) === value);

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

    return (
        <div className={`flex flex-col gap-1 ${className}`} ref={dropdownRef}>
            {label && <label className="block text-xs sm:text-sm font-medium text-gray-700">{label}</label>}
            
            <div className="relative">
                <button
                    type="button"
                    disabled={isInteractionDisabled}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between border border-gray-300 rounded-md p-1.5 sm:p-2 bg-gray-50 transition-all focus:ring-2 focus:ring-opacity-50 text-left text-sm sm:text-base ${isInteractionDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'} ${readOnly ? 'bg-gray-100' : ''}`}
                    style={{'--tw-ring-color': themeColor} as React.CSSProperties}
                >
                    <span className={`truncate flex items-center gap-1 ${value ? 'text-gray-900' : 'text-gray-500'}`}>
                        {selectedOption ? (
                            <>
                                {(selectedOption as any).code && <span className="text-[10px] sm:text-xs font-mono text-gray-500 mr-1.5 border border-gray-200 bg-gray-100 px-1 rounded">{(selectedOption as any).code}</span>}
                                {selectedOption.name || (selectedOption as any).label}
                            </>
                        ) : placeholder}
                    </span>
                    <svg 
                        className={`w-5 h-5 transition-transform text-gray-500 ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                {isOpen && (
                    <div 
                        className={`absolute left-0 w-full bg-white rounded-md shadow-2xl z-[110] py-1 border border-gray-200 max-h-60 overflow-y-auto ${
                            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
                        }`}
                    >
                        {options.length > 0 ? (
                            options.map((option, index) => (
                                <button
                                    key={option.id || (option as any).value || `opt-${index}`}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id || (option as any).value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 ${value === (option.id || (option as any).value) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-800'}`}
                                >
                                    {(option as any).code && <span className="text-[10px] sm:text-xs font-mono text-gray-400 border border-gray-200 bg-white px-1 rounded">{(option as any).code}</span>}
                                    <span className="truncate">{option.name || (option as any).label}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-gray-500 italic">No options available</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;
