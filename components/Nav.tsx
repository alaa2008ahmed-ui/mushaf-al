
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    LayoutDashboard, 
    CalendarDays, 
    CalendarRange, 
    Calendar1, 
    Search,
    ShoppingCart,
    Truck,
    Clock,
    Users,
    FileText,
    Settings,
    LogOut,
    Menu,
    ClipboardList,
    CheckSquare
} from 'lucide-react';

interface NavProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    allowedPages: string[];
    onLogout: () => void;
    isMobile?: boolean;
    pendingOrdersCount?: number;
}

const itemIcons: Record<string, React.ReactNode> = {
    'Dashboard': <LayoutDashboard size={22} />,
    'Daily Sales': <CalendarDays size={22} />,
    'Monthly Sales': <CalendarRange size={22} />,
    'Annual Sales': <Calendar1 size={22} />,
    'Invoices Tracking': <Search size={22} />,
    'PO': <ShoppingCart size={22} />,
    'Driver Work Log': <Truck size={22} />,
    'Drivers Timesheet': <Clock size={22} />,
    'Customers': <Users size={22} />,
    'Account Statement': <FileText size={22} />,
    'Orders': <ClipboardList size={22} />,
    'Order Approvals': <CheckSquare size={22} />,
    'Settings': <Settings size={22} />
};

const Nav: React.FC<NavProps> = ({ currentPage, onNavigate, allowedPages, onLogout, isMobile = false, pendingOrdersCount = 0 }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fabRef = useRef(null);
    
    const navItems = ['Dashboard', 'Daily Sales', 'Monthly Sales', 'Annual Sales', 'Invoices Tracking', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers', 'Orders', 'Order Approvals', 'Account Statement', 'Settings'];
    const filteredItems = navItems.filter(item => {
        return allowedPages.includes(item);
    });

    const handleNavigate = (page: string) => {
        onNavigate(page);
        setIsMenuOpen(false);
    };

    useEffect(() => {
        if (isMobile && isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobile, isMenuOpen]);

    const getItemColors = (item: string, isActive: boolean) => {
        const colors: Record<string, { bg: string, text: string, activeBg: string }> = {
            'Dashboard': { bg: 'bg-gradient-to-r from-indigo-500 to-indigo-600', text: 'text-indigo-600', activeBg: 'bg-indigo-50' },
            'Daily Sales': { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-600', activeBg: 'bg-blue-50' },
            'Monthly Sales': { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-600', activeBg: 'bg-blue-50' },
            'Annual Sales': { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-600', activeBg: 'bg-blue-50' },
            'Account Statement': { bg: 'bg-gradient-to-r from-slate-600 to-slate-700', text: 'text-slate-600', activeBg: 'bg-slate-50' },
            'Invoices Tracking': { bg: 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-600', text: 'text-fuchsia-600', activeBg: 'bg-fuchsia-50' },
            'PO': { bg: 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-600', text: 'text-fuchsia-600', activeBg: 'bg-fuchsia-50' },
            'Driver Work Log': { bg: 'bg-gradient-to-r from-teal-500 to-teal-600', text: 'text-teal-600', activeBg: 'bg-teal-50' },
            'Drivers Timesheet': { bg: 'bg-gradient-to-r from-teal-500 to-teal-600', text: 'text-teal-600', activeBg: 'bg-teal-50' },
            'Customers': { bg: 'bg-gradient-to-r from-teal-500 to-teal-600', text: 'text-teal-600', activeBg: 'bg-teal-50' },
            'Orders': { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'text-orange-600', activeBg: 'bg-orange-50' },
            'Order Approvals': { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'text-orange-600', activeBg: 'bg-orange-50' },
            'Settings': { bg: 'bg-gradient-to-r from-slate-600 to-slate-700', text: 'text-slate-600', activeBg: 'bg-slate-50' },
        };
        const defaultColor = { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-600', activeBg: 'bg-blue-50' };
        const color = colors[item] || defaultColor;

        if (isActive) {
            return `${color.bg} text-white shadow-md border border-transparent scale-[1.02]`;
        }
        return `bg-transparent ${color.text} hover:${color.activeBg} hover:shadow-sm`;
    };

    if (isMobile) {
        return (
            <>
                <AnimatePresence>
                    {!isMenuOpen && (
                        <motion.button
                            ref={fabRef}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            drag
                            dragMomentum={false}
                            dragElastic={0.1}
                            whileDrag={{ scale: 1.1, cursor: 'grabbing', zIndex: 1600 }}
                            onDragEnd={() => {}}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(true);
                            }}
                            className="fixed top-36 right-4 z-[1500] bg-blue-600 text-white rounded-full p-2.5 shadow-2xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform border-2 border-white cursor-grab"
                            aria-label="Open Navigation Menu"
                            style={{ touchAction: 'none' }}
                        >
                            <Menu className="w-6 h-6" />
                        </motion.button>
                    )}

                    {isMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="fixed inset-0 z-[1900] bg-transparent"
                            />
                            
                            <motion.div
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                                className="fixed top-[88px] right-0 z-[2000] w-[220px] bg-white shadow-3xl rounded-l-3xl border-l border-b border-t border-slate-200 flex flex-col p-1.5 overflow-y-auto max-h-[calc(100vh-120px)] touch-pan-y"
                            >
                                <div className="flex flex-col gap-1">
                                    {filteredItems.map((item) => (
                                        <button 
                                            key={item} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNavigate(item);
                                            }}
                                            className={`px-4 py-4 rounded-2xl text-left text-[15px] font-bold transition-all cursor-pointer relative z-[2010] active:scale-95 flex items-center gap-3 ${
                                                getItemColors(item, currentPage === item)
                                            }`}
                                        >
                                            <div className="relative">
                                                {itemIcons[item]}
                                            </div>
                                            <span>{item}</span>
                                            {item === 'Order Approvals' && pendingOrdersCount > 0 && (
                                                <span className="ml-auto bg-red-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                                    {pendingOrdersCount}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onLogout();
                                        }}
                                        className="w-full px-4 py-4 rounded-2xl text-left text-[15px] font-bold text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors flex items-center gap-3 cursor-pointer relative z-[2010] active:scale-95"
                                    >
                                        <LogOut size={22} />
                                        Logout
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </>
        );
    }

    return (
        <nav 
            className="fixed top-0 left-0 bottom-0 z-[200] bg-white shadow-xl transition-all duration-300 ease-in-out flex flex-col overflow-x-hidden border-r border-slate-200"
            style={{ width: isHovered ? '240px' : '64px' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-2 custom-scrollbar">
                 {filteredItems.map(item => {
                    const isActive = currentPage === item;
                    const hasBadge = item === 'Order Approvals' && pendingOrdersCount > 0;
                    return (
                        <button 
                            key={item} 
                            onClick={() => handleNavigate(item)}
                            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 w-[216px] whitespace-nowrap relative ${
                                getItemColors(item, isActive)
                            }`}
                            title={!isHovered ? item : undefined}
                        >
                            <div className="flex-shrink-0 flex items-center justify-center relative">
                                {itemIcons[item]}
                                {hasBadge && !isHovered && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 border border-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] font-black text-white shadow-md animate-pulse">
                                        {pendingOrdersCount}
                                    </div>
                                )}
                            </div>
                            <span className={`text-[15px] font-semibold transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                                {item}
                            </span>
                            {hasBadge && isHovered && (
                                <span className="ml-auto bg-red-500 text-white font-black text-xs px-2 py-0.5 rounded-full shadow-md animate-pulse">
                                    {pendingOrdersCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="p-3 border-t border-slate-100">
                <button 
                    onClick={onLogout}
                    className="flex items-center gap-4 p-3 rounded-xl transition-all duration-200 w-[216px] whitespace-nowrap text-red-600 hover:bg-red-50 hover:shadow-sm"
                    title={!isHovered ? "Logout" : undefined}
                >
                    <div className="flex-shrink-0 flex items-center justify-center">
                        <LogOut size={22} />
                    </div>
                    <span className={`text-[15px] font-semibold transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        Logout
                    </span>
                </button>
            </div>
        </nav>
    );
};

export default Nav;
