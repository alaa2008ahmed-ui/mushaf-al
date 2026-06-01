import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface CustomTimePickerProps {
    label?: string;
    value: string; // "HH:mm" format
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    themeColor?: string;
    className?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
    label,
    value,
    onChange,
    onKeyDown,
    themeColor = '#3b82f6',
    className = '',
    inputRef
}) => {
    // value is "HH:mm"
    const [hDisp, setHDisp] = useState('');
    const [mDisp, setMDisp] = useState('');
    const [ampm, setAmpm] = useState('AM');

    const minuteInputRef = useRef<HTMLInputElement>(null);
    const ampmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (value && value.includes(':')) {
            const [hr, mn] = value.split(':');
            const hn = parseInt(hr);
            const a = hn >= 12 ? 'PM' : 'AM';
            const hd = hn % 12 || 12;
            setHDisp(hd.toString().padStart(2, '0'));
            setMDisp(mn);
            setAmpm(a);
        } else if (!value) {
            setHDisp('');
            setMDisp('');
        }
    }, [value]);

    const updateTime = (h: string, m: string, a: string) => {
        if (!h || !m) return;
        let h24 = parseInt(h);
        if (a === 'PM' && h24 < 12) h24 += 12;
        if (a === 'AM' && h24 === 12) h24 = 0;
        const formattedH = h24.toString().padStart(2, '0');
        const formattedM = m.padStart(2, '0');
        onChange(`${formattedH}:${formattedM}`);
    };

    const handleHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(-2);
        const n = parseInt(val);
        if (n > 12) val = '12';
        setHDisp(val);
        if (val && mDisp) updateTime(val, mDisp, ampm);

        // Auto-advance to minutes if two digits are typed
        if (val.length === 2 && minuteInputRef.current) {
            minuteInputRef.current.focus();
            minuteInputRef.current.select();
        }
    };

    const handleMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 2) val = val.slice(-2);
        const n = parseInt(val);
        if (n > 59) val = '59';
        setMDisp(val);
        if (val && hDisp) updateTime(hDisp, val, ampm);

        // Auto-advance to AM/PM if two digits are typed
        if (val.length === 2 && ampmRef.current) {
            ampmRef.current.focus();
        }
    };

    const toggleAMPM = () => {
        const next = ampm === 'AM' ? 'PM' : 'AM';
        setAmpm(next);
        if (hDisp && mDisp) updateTime(hDisp, mDisp, next);
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-0.5">
                    {label}
                </label>
            )}

            <div className="flex items-center gap-1">
                <div className="relative flex-1 flex items-center bg-[#f8fafc] border border-gray-300 rounded-xl px-2 h-10 focus-within:ring-2 focus-within:ring-opacity-20 transition-all"
                     style={{ focusWithin: { ringColor: themeColor } as any }}>
                    <input 
                        ref={inputRef}
                        type="text"
                        value={hDisp}
                        onChange={handleHChange}
                        onKeyDown={onKeyDown}
                        onBlur={() => hDisp && setHDisp(prev => (parseInt(prev) || 12).toString().padStart(2, '0'))}
                        className="w-7 text-center bg-transparent border-none outline-none font-bold text-gray-700 text-sm p-0"
                        placeholder="HH"
                    />
                    <span className="text-gray-400 font-bold px-0.5">:</span>
                    <input 
                        ref={minuteInputRef}
                        type="text"
                        value={mDisp}
                        onChange={handleMChange}
                        onKeyDown={onKeyDown}
                        onBlur={() => mDisp && setMDisp(prev => (parseInt(prev) || 0).toString().padStart(2, '0'))}
                        className="w-7 text-center bg-transparent border-none outline-none font-bold text-gray-700 text-sm p-0"
                        placeholder="mm"
                    />
                    <Clock size={14} className="text-gray-400 ml-auto" />
                </div>
                
                <button
                    ref={ampmRef}
                    type="button"
                    onClick={toggleAMPM}
                    onKeyDown={onKeyDown}
                    className={`h-10 px-3 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center min-w-[50px] border ${
                        ampm === 'AM' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                >
                    {ampm}
                </button>
            </div>
        </div>
    );
};

export default CustomTimePicker;
