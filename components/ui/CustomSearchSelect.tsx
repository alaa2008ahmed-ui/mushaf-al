import React, { useState, useRef, useEffect } from 'react';
import { Search, Hash, User, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Option {
    value: string;
    label: string;
    detail?: string;
}

interface CustomSearchSelectProps {
    label?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    themeColor?: string;
    iconType?: 'user' | 'hash' | 'search';
    onKeyDown?: (e: React.KeyboardEvent) => void;
    inputRef?: React.RefObject<HTMLInputElement | null>;
}

const CustomSearchSelect: React.FC<CustomSearchSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Start typing...',
    className = '',
    disabled = false,
    themeColor = '#4f46e5',
    iconType = 'search',
    onKeyDown,
    inputRef: externalInputRef
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const localInputRef = useRef<HTMLInputElement>(null);
    const inputRef = (externalInputRef as React.RefObject<HTMLInputElement>) || localInputRef;

    // Sync search term with value prop when it changes externally
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    const safeSearchTerm = (searchTerm || '').toLowerCase();
    const filteredOptions = options.filter(option =>
        (option.label || '').toLowerCase().includes(safeSearchTerm) ||
        (option.value || '').toLowerCase().includes(safeSearchTerm) ||
        (option.detail && option.detail.toLowerCase().includes(safeSearchTerm))
    );

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

    const handleFocus = () => {
        if (!disabled) setIsOpen(true);
        inputRef.current?.select();
    };

    const handleClick = () => {
        if (!disabled) setIsOpen(true);
        inputRef.current?.select();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (onKeyDown) onKeyDown(e);
        if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
            // If enter pressed while open, select first option
            handleSelectOption(filteredOptions[0]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        onChange(val); // Notify parent of raw input change
        if (!isOpen) setIsOpen(true);
    };

    const handleSelectOption = (option: Option) => {
        onChange(option.value);
        setSearchTerm(option.value);
        setIsOpen(false);
    };

    const getIcon = () => {
        const iconSize = 16;
        switch (iconType) {
            case 'hash': return <Hash size={iconSize} />;
            case 'user': return <User size={iconSize} />;
            default: return <Search size={iconSize} />;
        }
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-0.5">
                    {label}
                </label>
            )}
            
            <div className={`relative ${isOpen ? 'z-[9999]' : ''}`}>
                {/* Input with Icon */}
                <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-colors duration-200" style={{ color: isOpen ? themeColor : undefined }}>
                        {getIcon()}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onKeyDown={handleKeyDown}
                        onClick={handleClick}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`w-full h-10 text-sm pl-10 pr-10 rounded-xl bg-[#f8fafc] border border-gray-200 shadow-sm transition-all duration-200 outline-none font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-medium ${
                            disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:border-gray-300'
                        }`}
                        style={{ 
                            borderColor: isOpen ? themeColor : undefined,
                            boxShadow: isOpen ? `0 0 0 3px ${themeColor}15` : undefined
                        }}
                    />
                    
                    {/* Arrow indicator */}
                    <div 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 transition-all duration-200"
                        style={{ color: isOpen ? themeColor : undefined }}
                    >
                        <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute left-0 bottom-full mb-2 min-w-[280px] w-full bg-white rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[9999] border border-gray-100 max-h-72 flex flex-col"
                        >
                            <div className="overflow-y-auto custom-scrollbar rounded-2xl">
                                {filteredOptions.length > 0 ? (
                                    <div className="py-2">
                                        {filteredOptions.map((option, index) => (
                                            <button
                                                key={`${option.value}-${index}`}
                                                type="button"
                                                onClick={() => handleSelectOption(option)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-all flex items-center gap-3 border-b border-gray-50 last:border-0 group"
                                            >
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="text-sm font-black text-gray-800 group-hover:text-indigo-600 transition-colors whitespace-normal leading-tight">
                                                            {option.label}
                                                        </span>
                                                        {option.value !== option.label && (
                                                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                                                {option.value}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {option.detail && (
                                                        <div className="flex items-start gap-1.5 mt-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 mt-1 flex-shrink-0"></div>
                                                            <span className="text-xs font-bold text-gray-400 whitespace-normal tracking-tight leading-tight">{option.detail}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <Search size={14} />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-6 py-8 text-center bg-gray-50/50">
                                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3">
                                            <Search className="text-gray-200" size={24} />
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                            No matching records
                                        </p>
                                        <button 
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                                        >
                                            Keep Manual Entry
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CustomSearchSelect;

