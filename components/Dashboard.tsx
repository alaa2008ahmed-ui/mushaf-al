
import React, { useMemo, useState } from 'react';
import { Invoice, Branch } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Clock, TrendingUp, Receipt, HardDrive } from 'lucide-react';

interface DashboardProps {
    invoices: Invoice[];
    branches: Branch[];
}

const Dashboard: React.FC<DashboardProps> = ({ invoices, branches }) => {
    const [showItemStatsModal, setShowItemStatsModal] = useState<{ branchName: string; invoices: Invoice[] } | null>(null);
    const [selectedDayDetails, setSelectedDayDetails] = useState<{
        branchId: string;
        branchName: string;
        date: Date;
        cashTotal: number;
        creditTotal: number;
        cashCount: number;
        creditCount: number;
        total: number;
        quantity: number;
    } | null>(null);

    const {
        last3Days,
        todayDateStr,
        overallTodayStats,
        peakHoursData,
        statsByBranch,
        getLocalDateStr
    } = useMemo(() => {
        const dates = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            dates.push(d);
        }

        const localGetLocalDateStr = (date: Date) => {
            const d = date instanceof Date ? date : new Date(date);
            const yr = d.getFullYear();
            const mo = d.getMonth() + 1;
            const dy = d.getDate();
            return `${yr}-${mo < 10 ? '0' + mo : mo}-${dy < 10 ? '0' + dy : dy}`;
        };

        const todayStr = localGetLocalDateStr(dates[0]);
        const targetDatesSet = new Set(dates.map(d => localGetLocalDateStr(d)));

        const branchMap = new Map<string, {
            branchId: string;
            branchName: string;
            lifetimeCount: number;
            lifetimeTotal: number;
            dailyStatsMap: Map<string, {
                total: number;
                cashTotal: number;
                creditTotal: number;
                cashCount: number;
                creditCount: number;
                quantity: number;
                count: number;
            }>
        }>();

        branches.forEach(branch => {
            branchMap.set(branch.id, {
                branchId: branch.id,
                branchName: branch.name,
                lifetimeCount: 0,
                lifetimeTotal: 0,
                dailyStatsMap: new Map(dates.map(d => [localGetLocalDateStr(d), {
                    total: 0,
                    cashTotal: 0,
                    creditTotal: 0,
                    cashCount: 0,
                    creditCount: 0,
                    quantity: 0,
                    count: 0,
                }]))
            });
        });

        // Also handle branchId = "unassigned" in case any invoice belongs to an unknown/deleted branch
        branchMap.set('unassigned', {
            branchId: 'unassigned',
            branchName: 'Unassigned Branches',
            lifetimeCount: 0,
            lifetimeTotal: 0,
            dailyStatsMap: new Map(dates.map(d => [localGetLocalDateStr(d), {
                total: 0,
                cashTotal: 0,
                creditTotal: 0,
                cashCount: 0,
                creditCount: 0,
                quantity: 0,
                count: 0,
            }]))
        });

        const peakHoursArray = Array.from({ length: 24 }, (_, i) => {
            const hourObj: any = {
                hour: i,
                hourLabel: `${i}:00`,
            };
            branches.forEach(b => {
                hourObj[b.name] = 0;
            });
            return hourObj;
        });

        let today_total = 0;
        let today_cashTotal = 0;
        let today_creditTotal = 0;
        let today_quantity = 0;
        let today_cashCount = 0;
        let today_creditCount = 0;
        let today_totalCount = 0;

        // A single linear scan over all invoices (O(N))
        const invoicesLength = invoices.length;
        for (let i = 0; i < invoicesLength; i++) {
            const inv = invoices[i];
            const d = inv.date instanceof Date ? inv.date : new Date(inv.date);
            const yr = d.getFullYear();
            const mo = d.getMonth() + 1;
            const dy = d.getDate();
            const dateStr = `${yr}-${mo < 10 ? '0' + mo : mo}-${dy < 10 ? '0' + dy : dy}`;

            const bId = inv.branchId || 'unassigned';
            const bData = branchMap.get(bId) || branchMap.get('unassigned');
            if (bData) {
                bData.lifetimeCount++;
                bData.lifetimeTotal += inv.total;

                if (targetDatesSet.has(dateStr)) {
                    const dStats = bData.dailyStatsMap.get(dateStr);
                    if (dStats) {
                        dStats.total += inv.total;
                        dStats.quantity += inv.quantity;
                        dStats.count++;
                        if (inv.type === 'cash') {
                            dStats.cashTotal += inv.total;
                            dStats.cashCount++;
                        } else if (inv.type === 'credit') {
                            dStats.creditTotal += inv.total;
                            dStats.creditCount++;
                        }
                    }
                }
            }

            if (dateStr === todayStr) {
                today_total += inv.total;
                today_quantity += inv.quantity;
                today_totalCount++;
                if (inv.type === 'cash') {
                    today_cashTotal += inv.total;
                    today_cashCount++;
                } else if (inv.type === 'credit') {
                    today_creditTotal += inv.total;
                    today_creditCount++;
                }
            }

            const hr = d.getHours();
            if (hr >= 0 && hr < 24) {
                const branchObj = branches.find(b => b.id === inv.branchId);
                if (branchObj) {
                    const peakObj = peakHoursArray[hr];
                    peakObj[branchObj.name] = (peakObj[branchObj.name] || 0) + 1;
                }
            }
        }

        // Format branches stats array
        const resultStatsByBranch: any[] = [];
        branches.forEach(branch => {
            const bData = branchMap.get(branch.id);
            if (bData) {
                resultStatsByBranch.push({
                    branchId: branch.id,
                    branchName: branch.name,
                    lifetimeCount: bData.lifetimeCount,
                    lifetimeTotal: bData.lifetimeTotal,
                    dailyStats: dates.map(d_obj => {
                        const dStr = localGetLocalDateStr(d_obj);
                        const dStats = bData.dailyStatsMap.get(dStr)!;
                        return {
                            date: d_obj,
                            dateStr: dStr,
                            total: dStats.total,
                            cashTotal: dStats.cashTotal,
                            creditTotal: dStats.creditTotal,
                            cashCount: dStats.cashCount,
                            creditCount: dStats.creditCount,
                            quantity: dStats.quantity,
                            count: dStats.count,
                            isToday: dStr === todayStr
                        };
                    })
                });
            }
        });

        // Append unassigned if they exist
        const unassignedData = branchMap.get('unassigned');
        if (unassignedData && unassignedData.lifetimeCount > 0) {
            resultStatsByBranch.push({
                branchId: 'unassigned',
                branchName: 'Unassigned Branches',
                lifetimeCount: unassignedData.lifetimeCount,
                lifetimeTotal: unassignedData.lifetimeTotal,
                dailyStats: dates.map(d_obj => {
                    const dStr = localGetLocalDateStr(d_obj);
                    const dStats = unassignedData.dailyStatsMap.get(dStr)!;
                    return {
                        date: d_obj,
                        dateStr: dStr,
                        total: dStats.total,
                        cashTotal: dStats.cashTotal,
                        creditTotal: dStats.creditTotal,
                        cashCount: dStats.cashCount,
                        creditCount: dStats.creditCount,
                        quantity: dStats.quantity,
                        count: dStats.count,
                        isToday: dStr === todayStr
                    };
                })
            });
        }

        return {
            last3Days: dates,
            todayDateStr: todayStr,
            overallTodayStats: {
                total: today_total,
                cashTotal: today_cashTotal,
                creditTotal: today_creditTotal,
                quantity: today_quantity,
                cashCount: today_cashCount,
                creditCount: today_creditCount,
                totalCount: today_totalCount
            },
            peakHoursData: peakHoursArray,
            statsByBranch: resultStatsByBranch,
            getLocalDateStr: localGetLocalDateStr
        };
    }, [invoices, branches]);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    const calculateItemStats = (invoices: Invoice[]) => {
        const stats: { [key: string]: { name: string; quantity: number; total: number } } = {};
        
        invoices.forEach(inv => {
            if (!stats[inv.itemName]) {
                stats[inv.itemName] = { name: inv.itemName, quantity: 0, total: 0 };
            }
            stats[inv.itemName].quantity += inv.quantity;
            stats[inv.itemName].total += inv.total;
        });

        return Object.values(stats).sort((a, b) => b.total - a.total);
    };

    return (
        <div className="w-full space-y-3 pb-6">
            <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-black text-indigo-600">Sales Dashboard</h2>
                <div className="flex items-center gap-1">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-bold text-green-600">Live</span>
                </div>
            </div>

            {/* Overall Totals Card */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl shadow-2xl p-5 sm:p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-200" />
                            <h3 className="text-sm sm:text-base font-black opacity-90 uppercase tracking-widest">Total branch sales</h3>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-[13px] sm:text-xs font-black bg-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/10 uppercase">
                                <HardDrive className="w-3 h-3" /> {overallTodayStats.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Items
                            </span>
                            <span className="text-[13px] font-black bg-green-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-green-400/20 uppercase text-green-100">
                                <Receipt className="w-3 h-3" /> {overallTodayStats.totalCount} Invoices
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="flex items-end gap-3">
                            <p className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none drop-shadow-lg tracking-tighter">
                                {overallTodayStats.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xl sm:text-2xl font-black opacity-60 mb-1 lg:mb-3 uppercase">SAR</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:gap-6 min-w-[280px]">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl py-1.5 px-4 border border-white/5 hover:bg-white/15 transition-all">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] uppercase font-black text-blue-100/70 tracking-widest">Cash</p>
                                    <span className="text-[13px] font-black bg-blue-400/30 px-2 py-0.5 rounded-lg border border-blue-400/20 text-blue-50">{overallTodayStats.cashCount}</span>
                                </div>
                                <p className="text-xl sm:text-2xl font-black">{overallTodayStats.cashTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] opacity-60">SAR</span></p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl py-1.5 px-4 border border-white/5 hover:bg-white/15 transition-all">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] uppercase font-black text-sky-100/70 tracking-widest">Credit</p>
                                    <span className="text-[13px] font-black bg-sky-400/30 px-2 py-0.5 rounded-lg border border-sky-400/20 text-sky-50">{overallTodayStats.creditCount}</span>
                                </div>
                                <p className="text-xl sm:text-2xl font-black text-sky-200">{overallTodayStats.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] opacity-60">SAR</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {statsByBranch.map(branch => (
                    <div key={branch.branchId} className={`bg-white rounded-2xl shadow-lg border overflow-hidden flex flex-col ${branch.branchId === 'unassigned' ? 'border-red-200' : 'border-slate-200'}`}>
                        <div className={`p-3 px-5 flex justify-between items-center text-white ${branch.branchId === 'unassigned' ? 'bg-red-600' : 'bg-blue-600'}`}>
                            <h3 className="font-black text-base sm:text-lg">{branch.branchName}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase">{branch.lifetimeCount} Total</span>
                                <button className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors ${branch.branchId === 'unassigned' ? 'bg-red-500/50 hover:bg-red-500 text-red-50' : 'bg-blue-500/50 hover:bg-blue-500 text-blue-50'}`}>Details</button>
                            </div>
                        </div>
                        
                        <div className="p-4 sm:p-5 space-y-4 flex-grow">
                            {branch.branchId === 'unassigned' && (
                                <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-2">
                                    <p className="text-[10px] text-red-600 font-bold leading-tight">These invoices are missing a branch assignment or belong to a deleted branch. They will appear in the Main Branch lists by default.</p>
                                </div>
                            )}

                            {/* Today Highlight */}
                            <div className={`rounded-xl p-4 flex flex-col gap-3 border ${branch.branchId === 'unassigned' ? 'bg-red-50/30 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`text-[10px] sm:text-xs uppercase font-black mb-0.5 ${branch.branchId === 'unassigned' ? 'text-red-500' : 'text-blue-600'}`}>Today Sales</p>
                                        <p className={`text-2xl sm:text-3xl font-black leading-tight ${branch.branchId === 'unassigned' ? 'text-red-900' : 'text-blue-900'}`}>
                                            {branch.dailyStats[0].total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                                            <span className="text-xs sm:text-sm font-normal opacity-70 ml-1">SAR</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] sm:text-xs uppercase font-black mb-0.5 ${branch.branchId === 'unassigned' ? 'text-red-400' : 'text-blue-400'}`}>Count</p>
                                        <p className={`text-xl sm:text-2xl font-black leading-tight ${branch.branchId === 'unassigned' ? 'text-red-800' : 'text-blue-800'}`}>{branch.dailyStats[0].count}</p>
                                    </div>
                                </div>
                                
                                <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${branch.branchId === 'unassigned' ? 'border-red-200/50' : 'border-blue-200/50'}`}>
                                    <div className="bg-white/50 rounded-lg p-3 border border-blue-100/50">
                                        <p className="text-[9px] uppercase font-black text-blue-500 mb-0.5">Cash</p>
                                        <p className="text-xl font-black text-blue-800 leading-tight">{branch.dailyStats[0].cashTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="bg-white/50 rounded-lg p-3 border border-blue-100/50 text-right">
                                        <p className="text-[9px] uppercase font-black text-sky-500 mb-0.5">Credit</p>
                                        <p className="text-xl font-black text-sky-800 leading-tight">{branch.dailyStats[0].creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
 
                                <div 
                                    className={`pt-3 border-t flex justify-between items-center cursor-pointer hover:bg-blue-100/50 rounded-lg p-1 px-2 -mx-2 transition-colors group ${branch.branchId === 'unassigned' ? 'border-red-200/50' : 'border-blue-200/50'}`}
                                    onClick={() => {
                                        const todayInvoices = invoices.filter(inv => {
                                            const matchesBranch = branch.branchId === 'unassigned' 
                                                ? (!inv.branchId || !branches.find(b => b.id === inv.branchId))
                                                : inv.branchId === branch.branchId;
                                            return matchesBranch && getLocalDateStr(inv.date) === todayDateStr;
                                        });
                                        setShowItemStatsModal({
                                            branchName: branch.branchName,
                                            invoices: todayInvoices
                                        });
                                    }}
                                >
                                    <p className="text-[10px] sm:text-xs uppercase font-black text-blue-500 group-hover:text-blue-700">Total Quantity</p>
                                    <p className="text-lg sm:text-xl font-black text-blue-700 leading-none group-hover:scale-110 transition-transform">{branch.dailyStats[0].quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
 
                            {/* Previous Days */}
                            <div className="grid grid-cols-2 gap-3">
                                {branch.dailyStats.slice(1).map(day => (
                                    <motion.div 
                                        key={day.dateStr} 
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedDayDetails({
                                            branchId: branch.branchId,
                                            branchName: branch.branchName,
                                            date: day.date,
                                            cashTotal: day.cashTotal,
                                            creditTotal: day.creditTotal,
                                            cashCount: day.cashCount,
                                            creditCount: day.creditCount,
                                            total: day.total,
                                            quantity: day.quantity
                                        })}
                                        className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 cursor-pointer hover:bg-indigo-100/50 hover:shadow-lg transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full -mr-4 -mt-4"></div>
                                        <p className="text-[10px] font-black text-indigo-400 mb-1.5 truncate group-hover:text-indigo-600 uppercase tracking-tighter">{formatDate(day.date)}</p>
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-xl sm:text-2xl font-black text-indigo-900 leading-none tracking-tighter">
                                                {day.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[10px] font-black text-indigo-300">SAR</p>
                                        </div>
                                        <p className="text-[9px] font-bold text-indigo-400/70 mt-1 uppercase tracking-tighter">{day.count} Invoices</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                {statsByBranch.length === 0 && (
                    <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-400 font-bold">No branches registered currently</p>
                    </div>
                )}
            </div>

            {/* Peak Sales Hours Chart */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-2xl">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 leading-tight">Sales Density & Peak Hours</h3>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">Frequency per hour across all branches</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        {branches.map((b, i) => (
                            <div key={b.id} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? '#3b82f6' : i === 1 ? '#0ea5e9' : '#6366f1' }}></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">{b.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="h-[300px] sm:h-[400px] w-full p-6 text-[10px] font-black">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={peakHoursData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                {branches.map((b, i) => (
                                    <linearGradient key={b.id} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={i === 0 ? '#3b82f6' : i === 1 ? '#0ea5e9' : '#6366f1'} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={i === 0 ? '#3b82f6' : i === 1 ? '#0ea5e9' : '#6366f1'} stopOpacity={0}/>
                                    </linearGradient>
                                ))}
                            </defs>
                            <XAxis 
                                dataKey="hourLabel" 
                                stroke="#94a3b8" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                fill="#94a3b8"
                            />
                            <YAxis 
                                stroke="#94a3b8" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                fill="#94a3b8"
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: 'none', 
                                    borderRadius: '16px', 
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ padding: '2px 0' }}
                            />
                            {branches.map((b, i) => (
                                <Area 
                                    key={b.id}
                                    type="monotone" 
                                    dataKey={b.name} 
                                    stroke={i === 0 ? '#3b82f6' : i === 1 ? '#0ea5e9' : '#6366f1'} 
                                    fillOpacity={1} 
                                    fill={`url(#color${i})`} 
                                    strokeWidth={3}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="bg-slate-50 p-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 mb-0.5">Peak Activity</p>
                        <p className="text-xs font-black text-slate-700">
                            {(() => {
                                const totals = peakHoursData.map(d => ({ 
                                    hour: d.hourLabel, 
                                    total: Object.entries(d).reduce((sum, [k, v]) => k !== 'hour' && k !== 'hourLabel' ? sum + (v as number) : sum, 0) 
                                }));
                                return totals.sort((a, b) => b.total - a.total)[0]?.hour || 'N/A';
                            })()}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 mb-0.5">Lowest Sales Period</p>
                        <p className="text-xs font-black text-blue-500">
                             {(() => {
                                const totals = peakHoursData.map(d => ({ 
                                    hour: d.hourLabel, 
                                    total: Object.entries(d).reduce((sum, [k, v]) => k !== 'hour' && k !== 'hourLabel' ? sum + (v as number) : sum, 0) 
                                }));
                                // Filter out 0 total unless they are all 0
                                let filtered = totals.filter(t => t.total > 0);
                                if (filtered.length === 0) filtered = totals;
                                return filtered.sort((a, b) => a.total - b.total)[0]?.hour || 'N/A';
                            })()}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 mb-0.5">Average Hourly Frequency</p>
                        <p className="text-xs font-black text-slate-700">
                            {(invoices.length / 24).toFixed(1)} <span className="opacity-50">Inv/hr</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 mb-0.5">Highest Peak Volume</p>
                        <p className="text-xs font-black text-blue-600">
                            {Math.max(...peakHoursData.map(d => Object.entries(d).reduce((sum, [k, v]) => k !== 'hour' && k !== 'hourLabel' ? sum + (v as number) : sum, 0)))} <span className="opacity-50">Transactions</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Details Modal/Popover */}
            <AnimatePresence>
                {selectedDayDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDayDetails(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="bg-slate-800 p-5 px-6 flex justify-between items-center text-white">
                                <div>
                                    <h4 className="font-black text-lg leading-tight">{selectedDayDetails.branchName}</h4>
                                    <p className="text-[10px] uppercase font-black text-slate-400">{formatDate(selectedDayDetails.date)}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedDayDetails(null)}
                                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-5">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Sales</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-slate-900">{selectedDayDetails.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span className="text-sm font-bold text-slate-400 uppercase">SAR</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] uppercase font-black text-blue-500">Cash</p>
                                            <span className="text-[13px] font-bold text-blue-400 bg-blue-100/50 px-2 py-0.5 rounded-md">{selectedDayDetails.cashCount}</span>
                                        </div>
                                        <p className="text-xl font-black text-blue-900">{selectedDayDetails.cashTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] uppercase font-black text-sky-500">Credit</p>
                                            <span className="text-[13px] font-bold text-sky-400 bg-sky-100/50 px-2 py-0.5 rounded-md">{selectedDayDetails.creditCount}</span>
                                        </div>
                                        <p className="text-xl font-black text-sky-900">{selectedDayDetails.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                <div 
                                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors group"
                                    onClick={() => {
                                        const dayDateStr = getLocalDateStr(selectedDayDetails.date);
                                        const dayInvoices = invoices.filter(inv => 
                                            inv.branchId === selectedDayDetails.branchId && 
                                            getLocalDateStr(inv.date) === dayDateStr
                                        );
                                        setShowItemStatsModal({
                                            branchName: selectedDayDetails.branchName,
                                            invoices: dayInvoices
                                        });
                                    }}
                                >
                                    <p className="text-xs uppercase font-black text-slate-500 group-hover:text-blue-500">Total Quantity</p>
                                    <p className="text-xl font-black text-slate-800 group-hover:scale-110 transition-transform">{selectedDayDetails.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedDayDetails(null)}
                                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors uppercase tracking-widest"
                            >
                                Close
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            {/* Item Stats Modal */}
            <AnimatePresence>
                {showItemStatsModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowItemStatsModal(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]"
                        >
                            <div className="bg-blue-600 p-5 px-6 flex justify-between items-center text-white shrink-0">
                                <div>
                                    <h4 className="font-black text-lg leading-tight">{showItemStatsModal.branchName}</h4>
                                    <p className="text-[10px] uppercase font-black text-blue-200">
                                        {showItemStatsModal.invoices.length > 0 && getLocalDateStr(showItemStatsModal.invoices[0].date) === todayDateStr 
                                            ? "Today's Item Average Selling Prices" 
                                            : `Sales Stats for ${showItemStatsModal.invoices.length > 0 ? formatDate(new Date(showItemStatsModal.invoices[0].date)) : 'Selected Date'}`}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShowItemStatsModal(null)}
                                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-2 sm:p-4">
                                <div className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 sticky top-0 bg-white z-10">
                                        <div className="col-span-1 flex justify-center items-center">#</div>
                                        <div className="col-span-5">Item Name</div>
                                        <div className="col-span-2 text-right">Qty</div>
                                        <div className="col-span-4 text-right">Avg Price</div>
                                    </div>
                                    
                                    {calculateItemStats(showItemStatsModal.invoices).map((item, idx) => (
                                        <motion.div 
                                            key={item.name}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="grid grid-cols-12 gap-2 px-3 py-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                                        >
                                            <div className="col-span-1 flex justify-center items-center">
                                                <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-[10px] font-black group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">{idx + 1}</span>
                                            </div>
                                            <div className="col-span-5 flex items-center">
                                                <span className="text-xs sm:text-sm font-black text-slate-700 truncate">{item.name}</span>
                                            </div>
                                            <div className="col-span-2 flex flex-col justify-center items-end">
                                                <span className="text-[10px] font-black text-slate-500 leading-none mb-0.5">{item.quantity.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase leading-none">Units</span>
                                            </div>
                                            <div className="col-span-4 flex flex-col justify-center items-end">
                                                <span className="text-sm sm:text-base font-black text-blue-600 leading-none mb-0.5 tracking-tight">{(item.total / item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="text-[9px] font-bold text-blue-300 uppercase leading-none">SAR / Unit</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                    
                                    {showItemStatsModal.invoices.length === 0 && (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <HardDrive className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="font-black text-slate-400">No sales items recorded today</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t shrink-0">
                                <button 
                                    onClick={() => setShowItemStatsModal(null)}
                                    className="w-full py-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-black text-xs transition-colors uppercase tracking-widest shadow-sm shadow-slate-200/50"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
