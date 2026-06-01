import React, { useState, useEffect, useMemo } from 'react';
import { Driver, DriverWorkLog } from '../types';
import { dualStorage, COLLECTIONS } from '../DualStorageService';
import { captureAndExport, printOrDownloadPdf } from '../captureUtils';

interface Props {
    drivers: Driver[];
    workLogs: DriverWorkLog[];
    canEdit?: boolean;
    selectedBranchId?: string;
}

interface DriverGridData {
    bonus: number;
    jobTitle: string;
    otTrips: number;
    rate: number;
    days: Record<number, number | null>; // day index 1..31 to hours
}

interface MonthlyGrid {
    id: string;
    month: string; // YYYY-MM
    driversData: Record<number, DriverGridData>;
}

export default function DriverReport({ drivers, workLogs, canEdit = true, selectedBranchId }: Props) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [gridData, setGridData] = useState<MonthlyGrid | null>(null);
    const [dutyStatusFilter, setDutyStatusFilter] = useState<'all' | 'on_duty' | 'off_duty'>('all');
    const [hideEmptyDrivers, setHideEmptyDrivers] = useState(false);
    const [showAllBranches, setShowAllBranches] = useState(false);

    const currentYear = parseInt(selectedMonth.split('-')[0]);
    const currentMonth = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const filteredWorkLogs = useMemo(() => {
        if (showAllBranches) return workLogs;
        return workLogs.filter(log => log.branchId === selectedBranchId);
    }, [workLogs, showAllBranches, selectedBranchId]);

    // Load data when month changes
    useEffect(() => {
        const loadMonthData = () => {
            const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
            const loaded = records.find(r => r.type === 'driver_monthly_grid' && r.data.month === selectedMonth);
            if (loaded) {
                let hasChanges = false;
                const data = { ...loaded.data };
                if (data.driversData) {
                    for (const dId of Object.keys(data.driversData)) {
                        if (data.driversData[dId].jobTitle === 'سائق') {
                            data.driversData[dId].jobTitle = 'Driver';
                            hasChanges = true;
                        }
                    }
                }
                setGridData(data);
                if (hasChanges) {
                    dualStorage.save(COLLECTIONS.RECORDS, data.id, {
                        type: 'driver_monthly_grid',
                        data: data
                    });
                }
            } else {
                setGridData({
                    id: `grid-${selectedMonth}`,
                    month: selectedMonth,
                    driversData: {}
                });
            }
        };
        loadMonthData();
    }, [selectedMonth]);


    const getCalculatedLogHours = (driverId: number, day: number) => {
        const dateStr = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
        const logs = filteredWorkLogs.filter(log => {
            const isMatch = log.driverId === driverId && log.date === dateStr;
            if (!isMatch) return false;
            
            if (dutyStatusFilter === 'all') return true;
            return (log.dutyStatus || 'normal') === dutyStatusFilter;
        });

        if (logs.length === 0) return null;
        
        const total = logs.reduce((sum, log) => sum + log.workDurationHours, 0);
        // User requested removing 8-hour deduction
        const extra = total; 
        
        return extra > 0 ? parseFloat(extra.toFixed(2)) : null;
    };

    const getCalculatedTripCount = (driverId: number) => {
        const logs = filteredWorkLogs.filter(log => {
            const isMatch = log.driverId === driverId && log.date.startsWith(selectedMonth);
            if (!isMatch) return false;
            
            if (dutyStatusFilter === 'all') return true;
            return (log.dutyStatus || 'normal') === dutyStatusFilter;
        });
        return logs.length;
    };

    const getCellValue = (driverId: number, _dData: DriverGridData, day: number) => {
        // Strictly fetch from work logs to ignore manual overrides (like the "4")
        return getCalculatedLogHours(driverId, day);
    };

    const calculateTotalHours = (driverId: number, driverData?: DriverGridData) => {
        if (!driverData) return 0;
        return daysArray.reduce((sum, day) => sum + (getCellValue(driverId, driverData, day) || 0), 0);
    };

    const filteredDrivers = useMemo(() => {
        return drivers.filter(driver => {
            if (!hideEmptyDrivers) return true;
            const dData = gridData?.driversData[driver.driverId] || { bonus: 0, jobTitle: 'Driver', otTrips: 0, rate: 0, days: {} };
            const totalHours = calculateTotalHours(driver.driverId, dData as any);
            return totalHours > 0;
        });
    }, [drivers, gridData, hideEmptyDrivers, dutyStatusFilter, filteredWorkLogs, selectedMonth, daysArray]);

    const exportToExcel = async () => {
        if (!gridData) return;
        const ExcelJS = (window as any).ExcelJS;
        if (!ExcelJS) { console.error("ExcelJS library is not loaded."); return; }
        
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`Drivers Timesheet ${selectedMonth}`, { views: [{ rightToLeft: false }] });
        
        const headerTitleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
        const fontBold = { bold: true };
        const borderStyle = { 
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' } 
        };

        const currentDutyStatus = dutyStatusFilter;
        const dutyLabel = currentDutyStatus === 'all' ? 'All' : (currentDutyStatus === 'off_duty' ? 'Out Duty' : 'On Duty');

        let currentRow = 2;
        sheet.getCell(`A${currentRow}`).value = `Drivers Timesheet - ${selectedMonth} (${dutyLabel})`;
        sheet.getCell(`A${currentRow}`).font = { bold: true, size: 16, color: { argb: 'FFEA580C' } };
        currentRow += 2;

        const headers = ['No', 'Name', 'Job Title', 'Bonuses', 'O.T Trips', 'Total'];
        daysArray.forEach(day => headers.push(day.toString()));
        headers.push('Rate');

        headers.forEach((header, idx) => {
            const cell = sheet.getCell(currentRow, idx + 1);
            cell.value = header;
            cell.fill = headerTitleFill;
            cell.font = fontBold;
            cell.border = borderStyle as any;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (header === 'Total') {
                cell.font = { bold: true, color: { argb: 'FFDC2626' }};
            }
            if (parseInt(header) >= 1 && parseInt(header) <= 31) {
                cell.font = { bold: true, color: { argb: 'FF800080' }};
            }
            if (header === 'Rate') {
                cell.font = { bold: true, color: { argb: 'FF800080' }};
            }
        });
        sheet.getRow(currentRow).height = 25;
        currentRow++;

        drivers.forEach((driver, idx) => {
            const dData = gridData.driversData[driver.driverId] || { bonus: '', jobTitle: 'Driver', otTrips: '', rate: '', days: {} };
            const total = calculateTotalHours(driver.driverId, dData);
            const totalTripsCount = getCalculatedTripCount(driver.driverId);
            
            const cellValues = [
                idx + 1,
                driver.driverName,
                dData.jobTitle || 'Driver',
                dData.bonus,
                totalTripsCount,
                total
            ];
            
            daysArray.forEach(day => {
                const isFriday = new Date(currentYear, currentMonth - 1, day).getDay() === 5;
                const cellVal = getCellValue(driver.driverId, dData, day);
                cellValues.push({ value: cellVal === null ? '' : cellVal, isFriday });
            });
            cellValues.push(dData.rate);

            cellValues.forEach((valData, cIdx) => {
                const cell = sheet.getCell(currentRow, cIdx + 1);
                cell.border = borderStyle as any;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                
                if (cIdx === 1) cell.alignment = { horizontal: 'right', vertical: 'middle' };

                if (typeof valData === 'object' && valData !== null && 'value' in valData) {
                    cell.value = valData.value;
                    if (valData.isFriday) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
                    } else if (idx % 2 !== 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9F0FA' } };
                    }
                } else {
                    cell.value = valData as any;
                    if (idx % 2 !== 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9F0FA' } };
                    }
                }
                
                if (headers[cIdx] === 'Total') {
                    cell.font = { bold: true, color: { argb: 'FFDC2626' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // keep total white bg
                }
                if (headers[cIdx] === 'Bonuses') {
                    cell.font = { bold: true, color: { argb: 'FFDC2626' } };
                }
                if (cIdx === 1) cell.font = { bold: true };
            });
            sheet.getRow(currentRow).height = 20;
            currentRow++;
        });

        sheet.getColumn(1).width = 5;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 15;
        sheet.getColumn(4).width = 10;
        sheet.getColumn(5).width = 10;
        sheet.getColumn(6).width = 10;
        for(let i = 0; i < daysArray.length; i++) {
            sheet.getColumn(7 + i).width = 5;
        }
        sheet.getColumn(7 + daysArray.length).width = 10;

        workbook.xlsx.writeBuffer().then(async (buffer: ArrayBuffer) => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const filename = `Driver_Timesheet_${selectedMonth}.xlsx`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    };

    const handlePrint = () => {
        captureAndExport('printable-area-driver', (canvas) => {
            const filename = `Driver_Report_${selectedMonth}_${dutyStatusFilter}`;
            printOrDownloadPdf(canvas, filename, 'l');
        });
    };

    if (!gridData) return null;

    return (
        <div className="w-full mx-auto space-y-4 px-2 sm:px-6 lg:px-8 pb-8 pt-2 print:pt-0 print:m-0 print:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center print:hidden border-b pb-4 gap-4">
                <h1 className="text-3xl font-black tracking-tight text-orange-600">
                    Driver Report - {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h1>
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <input 
                            type="month" 
                            lang="en"
                            title="Select Month"
                            value={selectedMonth} 
                            onChange={e => setSelectedMonth(e.target.value)} 
                            className="h-10 px-4 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm" 
                        />
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        {(['all', 'on_duty', 'off_duty'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setDutyStatusFilter(status)}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                                    dutyStatusFilter === status 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {status === 'all' ? 'All' : (status === 'off_duty' ? 'Out Duty' : status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setShowAllBranches(!showAllBranches)}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all shadow-sm ${
                            showAllBranches 
                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        All Branches
                    </button>
                    <button 
                        onClick={() => setHideEmptyDrivers(!hideEmptyDrivers)}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all shadow-sm ${
                            hideEmptyDrivers 
                            ? 'bg-orange-600 text-white hover:bg-orange-700' 
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {hideEmptyDrivers ? 'Show Empty Drivers' : 'Hide Empty Drivers'}
                    </button>
                    <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium text-sm transition-colors shadow-sm">
                        Export Excel
                    </button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md font-medium text-sm transition-colors shadow-sm">
                        Print
                    </button>
                </div>
            </div>

            <div id="printable-area-driver" className="overflow-x-auto bg-white border border-gray-200 mt-4 shadow-sm rounded-lg print:border-none print:shadow-none print:mt-0 print:overflow-visible print:min-w-fit">
                <div className="print-only mb-4 text-left">
                    <div className="bg-blue-600 text-white px-2 py-3 mb-1 flex items-center">
                        <h1 className="text-3xl font-black tracking-wide mr-3 font-sans">Sweet Water Company LTD</h1>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8.586a1 1 0 00-.293-.707l-4.243-4.243A1 1 0 0015.05 3H14m0 16h-2m-4 0h-2m4 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m10 0h-2m4 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m-6-10v5m6 0v5" />
                        </svg>
                    </div>
                    <div className="bg-gray-100 px-2 py-2">
                        <h2 className="text-2xl font-bold text-orange-600">
                            Driver Report - {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h2>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-300 table-fixed text-center print:w-full print:text-xs">
                    <thead className="bg-[#b4c6e7] print:bg-gray-200">
                        <tr>
                            <th className="px-1 py-2 text-xs font-bold text-gray-900 border border-gray-400 w-10">No</th>
                            <th className="px-2 py-2 text-xs font-bold text-gray-900 border border-gray-400 w-32">Name</th>
                            <th className="px-2 py-2 text-xs font-bold text-gray-900 border border-gray-400 w-24">Job Title</th>
                            <th className="px-2 py-2 text-xs font-bold text-gray-900 border border-gray-400 w-20">Bonuses</th>
                            <th className="px-1 py-2 text-xs font-bold text-gray-900 border border-gray-400 w-20">O.T Trips</th>
                            <th className="px-2 py-2 text-xs font-bold text-red-600 border border-gray-400 w-16">Total</th>
                            {daysArray.map(day => (
                                <th key={day} className="px-1 py-2 text-xs font-bold text-[#800080] border border-gray-400 w-10">
                                    {day}
                                </th>
                            ))}
                            <th className="px-2 py-2 text-xs font-bold text-[#800080] border border-gray-400 w-16">Rate</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDrivers.map((driver, idx) => {
                            const dData = gridData.driversData[driver.driverId] || { bonus: '', jobTitle: 'Driver', otTrips: '', rate: '', days: {} };
                            const bgStriped = idx % 2 === 0 ? 'bg-white' : 'bg-[#e9f0fa]';
                            
                            return (
                                <tr key={driver.driverId} className={`hover:bg-yellow-50 transition-colors ${bgStriped}`}>
                                    <td className="px-1 py-1 text-xs font-bold text-gray-900 border border-gray-300">{idx + 1}</td>
                                    <td className="px-2 py-1 text-xs font-bold text-gray-900 border border-gray-300 text-right">{driver.driverName}</td>
                                    <td className="px-1 py-1 border border-gray-300">
                                        <div className="w-full text-center text-xs p-0 m-0">{dData.jobTitle || 'Driver'}</div>
                                    </td>
                                    <td className="px-1 py-1 border border-gray-300">
                                        <div className="w-full text-center text-xs font-bold text-red-600 p-0 m-0">{dData.bonus || ''}</div>
                                    </td>
                                    <td className="px-1 py-1 border border-gray-300 bg-white">
                                        <div className="w-full text-center text-xs font-bold text-indigo-700">
                                            {getCalculatedTripCount(driver.driverId)}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1 text-xs font-bold text-red-600 border border-gray-300 bg-white">
                                        {calculateTotalHours(driver.driverId, dData as any)}
                                    </td>
                                    {daysArray.map(day => {
                                        const isFriday = new Date(currentYear, currentMonth - 1, day).getDay() === 5;
                                        const cellBg = isFriday ? 'bg-[#00b0f0]' : 'bg-transparent';
                                        
                                        const cellVal = getCellValue(driver.driverId, dData as any, day);
                                        const displayVal = cellVal === null ? '' : cellVal;

                                        return (
                                            <td key={day} className={`px-0 py-0 border border-gray-300 ${cellBg}`}>
                                                <div className={`w-full text-center text-xs font-medium p-1 m-0 ${cellBg} ${displayVal !== '' ? 'text-gray-900' : 'text-transparent'}`}>
                                                    {displayVal}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-1 py-1 border border-gray-300">
                                        <div className="w-full text-center text-xs font-medium p-0 m-0">{dData.rate || ''}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <style>{`
                /* Hide number input arrows */
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
                
                @media print {
                    @page {
                        size: landscape;
                        margin: 0.5cm;
                    }
                    body {
                        background: white !important;
                    }
                    .no-print, .print-hidden {
                        display: none !important;
                    }
                    /* Ensure the table fits */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: fixed !important;
                    }
                    th, td {
                        font-size: 7px !important; /* Smaller to fit 31 days */
                        padding: 1px !important;
                        border: 1px solid black !important;
                    }
                    input {
                        border: none !important;
                        background: transparent !important;
                        width: 100% !important;
                        font-size: 7px !important;
                    }
                    .bg-[#00b0f0] {
                        background-color: #00b0f0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .bg-[#e9f0fa] {
                        background-color: #e9f0fa !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .text-red-600 {
                        color: #dc2626 !important;
                    }
                }
            `}</style>
        </div>
    );
}
