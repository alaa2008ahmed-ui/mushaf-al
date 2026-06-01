
import React, { useState, useMemo } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { Order } from '../types';

interface TotalSummaryProps {
    totalCash: number;
    totalCredit: number;
    totalDaySales: number;
    branchName?: string;
    isMainBranch?: boolean;
    approvedOrders?: Order[];
}

const TotalSummary: React.FC<TotalSummaryProps> = ({ totalCash, totalCredit, totalDaySales, branchName, isMainBranch, approvedOrders }) => {
    const [showOrders, setShowOrders] = useState(false);

    // Group approved orders by serial
    const groupedOrders = useMemo(() => {
        if (!approvedOrders) return [];
        const groups = new Map<number, Order[]>();
        approvedOrders.forEach(o => {
            if (!groups.has(o.serial)) {
                groups.set(o.serial, []);
            }
            groups.get(o.serial)!.push(o);
        });
        return Array.from(groups.values()).sort((a, b) => new Date(b[0].time).getTime() - new Date(a[0].time).getTime());
    }, [approvedOrders]);

    return (
        <div className="bg-white rounded-lg shadow-md border-2 border-gray-400 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 relative">
            <div className="flex justify-center items-center sm:text-center px-2 sm:px-0 bg-gray-50 rounded-md border border-gray-100 relative">
                <div className="flex flex-col sm:flex-col items-center justify-center w-full">
                    <h3 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Selected Branch</h3>
                    <div className="flex items-center justify-center sm:justify-start gap-2 max-w-full">
                        <p className="text-sm sm:text-lg font-black text-blue-900 sm:mt-1 truncate">{branchName || 'Main Branch'}</p>
                        {isMainBranch && (
                            <button 
                                onClick={() => setShowOrders(true)} 
                                className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                                title="Approved Orders"
                            >
                                <ClipboardList size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:text-center px-2 sm:px-0">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Cash</h3>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 sm:mt-1">{totalCash.toFixed(2)}</p>
            </div>
            <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:text-center px-2 sm:px-0 sm:border-l sm:border-r border-gray-200 py-1 sm:py-0">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Credit</h3>
                <p className="text-lg sm:text-2xl font-bold text-sky-600 sm:mt-1">{totalCredit.toFixed(2)}</p>
            </div>
            <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:text-center px-2 sm:px-0">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Day Sales</h3>
                <p className="text-lg sm:text-2xl font-bold text-gray-800 sm:mt-1">{totalDaySales.toFixed(2)}</p>
            </div>

            {showOrders && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-800">Approved Orders</h2>
                            <button onClick={() => setShowOrders(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            {groupedOrders.length > 0 ? (
                                <div className="space-y-4">
                                    {groupedOrders.map(group => {
                                        const mainOrder = group[0];
                                        return (
                                            <div key={mainOrder.serial} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="font-bold text-sm text-gray-600">Serial: {mainOrder.serial}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(mainOrder.time).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 font-semibold text-xs border-b border-gray-200 pb-2 mb-2 text-gray-600">
                                                    <div>Customer</div>
                                                    <div>Item</div>
                                                    <div>Quantity</div>
                                                </div>
                                                {group.map((o, idx) => (
                                                    <div key={idx} className="grid grid-cols-[1fr_2fr_1fr] gap-4 text-sm py-1 border-b border-gray-100 last:border-0">
                                                        <div className="truncate pr-2">{o.customerName}</div>
                                                        <div className="truncate pr-2">{o.item}</div>
                                                        <div>{o.quantity}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No approved orders found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TotalSummary;
