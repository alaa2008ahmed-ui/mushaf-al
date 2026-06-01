
import React, { useState, useEffect } from 'react';
import { Branch, Order } from '../types';
import { Truck, ClipboardList, X } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';
import { dualStorage, COLLECTIONS } from '../DualStorageService';

interface HeaderProps {
    employeeName?: string;
    currentUser?: any;
    date?: Date;
    branches?: Branch[];
    selectedBranchId?: string;
    onSelectBranch?: (id: string) => void;
    readOnly?: boolean;
    pendingCount?: number;
    lastSyncTime?: number;
    onRefresh?: () => void;
    reportTitle?: string;
    approvedOrders?: Order[];
    currentPage?: string;
    onCreateInvoice?: (group: Order[]) => void;
    deliveredGroupProps?: Order[] | null;
    onCloseDeliveredGroup?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    employeeName, 
    currentUser,
    date = new Date(),
    branches = [],
    selectedBranchId,
    onSelectBranch,
    readOnly = false,
    pendingCount = 0,
    lastSyncTime = 0,
    onRefresh,
    reportTitle = "Daily Sales Report",
    approvedOrders = [],
    currentPage = "Daily Sales",
    onCreateInvoice,
    deliveredGroupProps,
    onCloseDeliveredGroup
}) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showApprovedOrdersModal, setShowApprovedOrdersModal] = useState(false);
    const [confirmDeliverySerial, setConfirmDeliverySerial] = useState<string | null>(null);
    const [deliveringSerials, setDeliveringSerials] = useState<Set<string>>(new Set());
    const [localDeliveredGroupDetails, setLocalDeliveredGroupDetails] = useState<Order[] | null>(null);

    const deliveredGroupDetails = deliveredGroupProps !== undefined ? deliveredGroupProps : localDeliveredGroupDetails;
    const setDeliveredGroupDetails = (group: Order[] | null) => {
        if (onCloseDeliveredGroup && group === null) {
            onCloseDeliveredGroup();
        }
        setLocalDeliveredGroupDetails(group);
    };

    // Prevent body scroll when approved orders modal is open
    useEffect(() => {
        if (showApprovedOrdersModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showApprovedOrdersModal]);

    const handleDeliver = async (group: Order[]) => {
        const firstOrder = group[0];
        if (!firstOrder) return;
        const groupKey = `${firstOrder.createdBy || 'unknown'}_${firstOrder.serial}`;
        try {
            // 1. Mark as currently delivering to show "Delivered" state transition
            setDeliveringSerials(prev => {
                const next = new Set(prev);
                next.add(groupKey);
                return next;
            });
            setConfirmDeliverySerial(null);

            // 2. Wait 1000ms so the user can info-gaze "Delivered" in English
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 3. Save to storage
            const promises = group.map(order => 
                dualStorage.save(COLLECTIONS.RECORDS, order.id, {
                    type: 'order',
                    data: { ...order, status: 'delivered' }
                })
            );
            await Promise.all(promises);

            // 4. Remove from delivering set
            setDeliveringSerials(prev => {
                const next = new Set(prev);
                next.delete(groupKey);
                return next;
            });

            // 5. Open delivery details modal if user has permission
            const hasPopupPermission = currentUser?.role === 'admin' || 
                                       currentUser?.username?.toLowerCase() === 'alaa' || 
                                       currentUser?.permissions?.showDeliveryConfirmationPopup !== false;
            
            if (hasPopupPermission) {
                setDeliveredGroupDetails(group);
            }
        } catch (error: any) {
            console.error('Failed to update order status:', error);
            // Restore state if failed
            setDeliveringSerials(prev => {
                const next = new Set(prev);
                next.delete(groupKey);
                return next;
            });
        }
    };

    const getSyncText = () => {
        if (isRefreshing) return 'Syncing...';
        if (pendingCount > 0) return `${pendingCount} Pending`;
        
        if (lastSyncTime === 0) return 'Not synced';
        
        const diff = Date.now() - lastSyncTime;
        const mins = Math.floor(diff / 60000);
        
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    };

    const handleRefreshClick = async () => {
        if (onRefresh && !isRefreshing) {
            setIsRefreshing(true);
            await onRefresh();
            setTimeout(() => setIsRefreshing(false), 2000);
        }
    };
    // Format date as DD / MM / YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day} / ${month} / ${year}`;

    const selectedBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'Main Branch';

    return (
        <header className="shadow-lg font-sans">
            {/* Top Info Bar */}
            <div className="bg-blue-950 text-blue-100 text-xs py-1 px-4 sm:px-8 flex justify-between items-center relative z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-mono font-semibold tracking-wide">{formattedDate}</span>
                    </div>

                    {/* Sync Status Button */}
                    <button 
                        onClick={handleRefreshClick}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${pendingCount > 0 ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30' : 'hover:bg-blue-900/40 text-blue-300'}`}
                        title={pendingCount > 0 ? `${pendingCount} items waiting to sync` : 'Sync now'}
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden xs:inline">{getSyncText()}</span>
                    </button>
                </div>
                {employeeName && (
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline opacity-75">Welcome,</span>
                        <span className="font-bold text-white">{employeeName}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Main Header Area */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white p-4 sm:px-8 py-3 sm:py-5 relative z-50">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    
                    {/* Brand Section */}
                    <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                        <div className="bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-inner flex-shrink-0 flex items-center justify-center border border-white/30 backdrop-blur-sm">
                            <span className="text-white font-black text-xl sm:text-2xl tracking-tighter drop-shadow-md">SWC</span>
                        </div>
                        <div className="flex-grow">
                            <h1 className="text-base sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-sm flex items-center gap-2 whitespace-nowrap">
                                Sweet Water Company LTD <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-white flex-shrink-0" />
                            </h1>
                            {currentPage !== 'Orders' ? (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-sm sm:text-lg font-medium text-blue-100 tracking-wide opacity-90">{reportTitle}</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-blue-100 font-semibold tracking-wide">
                                    <div className="flex items-center gap-1.5">
                                        <span>Phone:</span>
                                        <a href="tel:0558479888" className="font-mono text-white hover:underline transition-color">0558479888</a>
                                        <span className="text-white/40">/</span>
                                        <a href="tel:0138479888" className="font-mono text-white hover:underline transition-color">0138479888</a>
                                    </div>
                                    <span className="hidden sm:inline text-white/30">|</span>
                                    <div className="flex items-center gap-1.5">
                                        <span>Email:</span>
                                        <a href="mailto:adba@swc.com.sa" className="font-mono text-white hover:underline transition-color">adba@swc.com.sa</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Branch Selection Section */}
                    <div className="w-full md:w-auto flex flex-col items-start md:items-end">
                        <label className="text-white/80 text-[10px] uppercase font-bold tracking-widest mb-1.5 ml-1 md:mr-1">
                            Current Branch
                        </label>
                        
                        <div className="flex items-center gap-2 w-full justify-end">
                            {/* Floating/Action Icon on the left side of Branch selector with extreme high-impact visual design */}
                            {(currentPage === 'Daily Sales' && (selectedBranchId === 'b3' || selectedBranchName.toLowerCase().includes('main') || selectedBranchName.includes('الرئيسي') || selectedBranchName.includes('الرئيسية'))) && (
                                <div className="relative flex items-center mr-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowApprovedOrdersModal(true)}
                                        className="relative bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-white p-3 sm:p-3.5 rounded-xl shadow-lg border-2 border-white transition-all transform hover:scale-110 flex items-center justify-center flex-shrink-0 animate-bounce-subtle"
                                        title="Approved Orders"
                                    >
                                        <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                        
                                        {/* High-impact active badge with multiple layered animations (pulsing glow, custom ring, shadow, bold numbering) */}
                                        {(() => {
                                            const uniqueCount = new Set(approvedOrders.map(o => `${o.createdBy || 'unknown'}_${o.serial}`)).size;
                                            if (uniqueCount === 0) return null;
                                            return (
                                                <span className="absolute -top-2 -right-2 flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center">
                                                    {/* Ripple ring effect */}
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90"></span>
                                                    <span className="relative inline-flex rounded-full h-6 w-6 sm:h-7 sm:w-7 bg-red-600 border-2 border-white items-center justify-center text-[10px] sm:text-[11px] font-black leading-none text-white shadow-lg animate-pulse">
                                                        {uniqueCount}
                                                    </span>
                                                </span>
                                            );
                                        })()}
                                    </button>
                                </div>
                            )}

                            {readOnly ? (
                                <div className="bg-blue-900/40 border border-white/50 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 w-full md:min-w-[200px] justify-between md:justify-end backdrop-blur-sm">
                                    <span className="font-bold text-base sm:text-lg text-white drop-shadow-sm">{selectedBranchName}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="w-full md:min-w-[240px]">
                                    <CustomSelect 
                                        options={branches}
                                        value={selectedBranchId || ''}
                                        onChange={onSelectBranch || (() => {})}
                                        placeholder="Select Branch"
                                        themeColor="#ffffff"
                                        className="custom-header-branch-select"
                                    />
                                    <style>{`
                                        .custom-header-branch-select button {
                                            background-color: #004a99 !important;
                                            color: #ffffff !important;
                                            border: 2px solid #ffffff !important;
                                            border-radius: 12px !important;
                                            padding: 0.75rem 1rem !important;
                                            font-weight: 800 !important;
                                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                                        }
                                        .custom-header-branch-select button span {
                                            color: #ffffff !important;
                                            font-size: 1.125rem;
                                        }
                                        .custom-header-branch-select button svg {
                                            color: #ffffff !important;
                                            width: 1.5rem;
                                            height: 1.5rem;
                                        }
                                        /* Dropdown styling */
                                        .custom-header-branch-select .relative > div:last-child {
                                            background-color: #ffffff !important;
                                            border: 2px solid #004a99 !important;
                                            border-radius: 12px !important;
                                            margin-top: 0.5rem !important;
                                            padding: 0.4rem !important;
                                            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                                            z-index: 1000 !important;
                                        }
                                        .custom-header-branch-select .relative > div:last-child button {
                                            background-color: transparent !important;
                                            border: none !important;
                                            color: #004a99 !important;
                                            font-weight: 700 !important;
                                            font-size: 1.1rem !important;
                                            padding: 0.75rem 1rem !important;
                                            margin-bottom: 0.2rem;
                                            border-radius: 8px !important;
                                            transition: all 0.2s ease;
                                            text-shadow: none !important;
                                            text-align: left !important;
                                        }
                                        .custom-header-branch-select .relative > div:last-child button span {
                                            color: #004a99 !important;
                                            font-size: 1.1rem !important;
                                        }
                                        .custom-header-branch-select .relative > div:last-child button:hover {
                                            background-color: #f0f7ff !important;
                                            color: #003a7a !important;
                                            transform: translateX(5px);
                                        }
                                        .custom-header-branch-select .relative > div:last-child button:hover span {
                                            color: #003a7a !important;
                                        }
                                        .custom-header-branch-select .relative > div:last-child button:last-child {
                                            margin-bottom: 0;
                                        }
                                        /* Active item in dropdown */
                                        .custom-header-branch-select .relative > div:last-child button[style*="font-weight: 600"],
                                        .custom-header-branch-select .relative > div:last-child button.bg-blue-50 {
                                            background-color: #e6f0ff !important;
                                            color: #004a99 !important;
                                        }
                                        .custom-header-branch-select .relative > div:last-child button.bg-blue-50 span {
                                            color: #004a99 !important;
                                        }
                                    `}</style>
                                </div>
                            )}

                            {/* Approved Orders action button has been relocated to the brand logo section on the left side */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Approved Orders Modal Dialog */}
            {showApprovedOrdersModal && (() => {
                const groups = new Map<string, Order[]>();
                approvedOrders.forEach(o => {
                    const groupKey = `${o.createdBy || 'unknown'}_${o.serial}`;
                    if (!groups.has(groupKey)) {
                        groups.set(groupKey, []);
                    }
                    groups.get(groupKey)!.push(o);
                });
                const sortedGroups = Array.from(groups.values()).sort((a, b) => new Date(b[0].time).getTime() - new Date(a[0].time).getTime());

                return (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-gray-800 border border-gray-200">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center bg-blue-900 text-white p-4">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5" />
                                    <h2 className="text-base sm:text-lg font-bold tracking-tight">Approved Orders</h2>
                                </div>
                                <button 
                                    onClick={() => setShowApprovedOrdersModal(false)} 
                                    className="text-white/85 hover:text-white transition-colors p-1"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-4 sm:p-6 overflow-y-auto flex-grow bg-gray-50">
                                {sortedGroups.length > 0 ? (
                                    <div className="space-y-4">
                                        {sortedGroups.map((group) => {
                                            const mainOrder = group[0];
                                            const groupKey = `${mainOrder.createdBy || 'unknown'}_${mainOrder.serial}`;
                                            return (
                                                <div key={groupKey} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                                    <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">
                                                                Serial: {mainOrder.serial}
                                                            </span>
                                                            <span className="bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                                                By: {mainOrder.createdBy || 'unknown'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                {new Date(mainOrder.time).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                            </span>
                                                            
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowApprovedOrdersModal(false);
                                                                    if (onCreateInvoice) {
                                                                        onCreateInvoice(group);
                                                                    }
                                                                }}
                                                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1"
                                                            >
                                                                Create Invoice
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Details Table */}
                                                    <div className="space-y-2">
                                                        {group.map((order, idx) => {
                                                            const qtyVal = order.quantity || 0;
                                                            const priceVal = order.price !== undefined ? order.price : 0;
                                                            const totalBeforeTax = qtyVal * priceVal;
                                                            const totalWithTax = totalBeforeTax * 1.15;
                                                            return (
                                                                <div key={idx} className="flex justify-between items-center text-sm py-2 px-3 bg-white hover:bg-gray-50/50 rounded-lg border border-gray-150 shadow-sm transition-all">
                                                                    <div className="flex flex-col text-left">
                                                                        <span className="font-semibold text-gray-800">{order.customerName}</span>
                                                                        <span className="text-sm text-gray-500 font-semibold">{order.item}</span>
                                                                    </div>
                                                                    <div className="text-right flex flex-col items-end gap-1">
                                                                        <div className="flex gap-1.5 items-center">
                                                                            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-xs border border-blue-100">
                                                                                Qty: {qtyVal}
                                                                            </span>
                                                                            {order.price !== undefined && (
                                                                                <span className="bg-slate-50 text-slate-700 font-semibold px-2 py-0.5 rounded text-xs border border-slate-200">
                                                                                    Price: {priceVal.toFixed(2)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-gray-600 flex gap-2.5 font-semibold">
                                                                            <span>Ex. Tax: <span className="font-bold text-gray-800 font-mono">{totalBeforeTax.toFixed(2)}</span></span>
                                                                            <span className="text-blue-600 font-extrabold">Total with Tax: <span className="font-mono">{totalWithTax.toFixed(2)}</span></span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                        <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                        <p className="text-gray-500 text-sm font-medium">No approved orders found.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
                                <button 
                                    onClick={() => setShowApprovedOrdersModal(false)} 
                                    className="bg-blue-900 hover:bg-blue-950 text-white font-medium py-2 px-6 rounded-lg transition-colors text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {deliveredGroupDetails && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4 text-slate-800" dir="ltr">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-green-200">
                        {/* Modal Header with Green Accent for Success */}
                        <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold tracking-tight">Order Executed & On Its Way</h3>
                                    <p className="text-xs text-green-100 font-medium font-mono">The order is out for delivery to the customer.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setDeliveredGroupDetails(null)}
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4 text-left">
                            {/* Summary Metadata Card */}
                            <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex flex-col gap-2 text-sm text-gray-700">
                                <div className="flex justify-between items-center border-b border-green-100/50 pb-2">
                                    <span className="font-semibold text-gray-500">Serial Number:</span>
                                    <span className="bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded text-xs select-all font-mono">
                                        #{deliveredGroupDetails[0]?.serial}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="font-semibold text-gray-500">Delivered By:</span>
                                    <span className="font-bold text-gray-800 bg-gray-150 px-2 py-0.5 rounded text-xs">
                                        {deliveredGroupDetails[0]?.createdBy || 'alaa'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="font-semibold text-gray-500">Delivery Time:</span>
                                    <span className="font-bold text-gray-800 font-mono text-xs">
                                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                </div>
                            </div>

                            {/* Delivered Items List */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Delivered Items Details:</h4>
                                <div className="space-y-2.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                    {deliveredGroupDetails.map((order, idx) => {
                                        const qtyVal = order.quantity || 0;
                                        const priceVal = order.price !== undefined ? order.price : 0;
                                        const totalBeforeTax = qtyVal * priceVal;
                                        const totalWithTax = totalBeforeTax * 1.15;

                                        return (
                                            <div key={idx} className="bg-gray-50/70 border border-gray-100 rounded-lg p-3 hover:border-gray-250 transition-all text-left">
                                                <div className="mb-2">
                                                    <div className="font-bold text-gray-850 text-sm leading-tight text-left">{order.customerName}</div>
                                                    <div className="text-xs text-gray-500 font-semibold mt-0.5 text-left">{order.item}</div>
                                                </div>

                                                <div className="flex justify-between items-center border-t border-dashed border-gray-200/60 pt-2 mt-1">
                                                    <div className="flex gap-1.5 items-center">
                                                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[11px] border border-blue-100 select-none">
                                                            Qty: {qtyVal}
                                                        </span>
                                                        {order.price !== undefined && (
                                                            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px] border border-slate-200 select-none">
                                                                Price: {priceVal.toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right font-mono">
                                                        <span className="text-xs text-gray-500 font-sans font-medium">Total (with Tax): </span>
                                                        <span className="text-xs font-extrabold text-blue-600">{totalWithTax.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 border-t border-gray-150 p-4 flex justify-center">
                            <button 
                                onClick={() => setDeliveredGroupDetails(null)}
                                className="w-full sm:w-auto min-w-[120px] bg-green-700 hover:bg-green-800 active:scale-95 text-white font-bold py-2 px-6 rounded-lg transition-all text-sm shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
