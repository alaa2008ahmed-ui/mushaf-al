import React, { useState, useRef } from 'react';
import { Driver, Vehicle, DriverWorkLog as IDriverWorkLog, Customer } from '../types';
import CustomDatePicker from './ui/CustomDatePicker';
import CustomSearchSelect from './ui/CustomSearchSelect';

import CustomTimePicker from './ui/CustomTimePicker';

interface Props {
    drivers: Driver[];
    vehicles: Vehicle[];
    customers: Customer[];
    logs: IDriverWorkLog[];
    onSave: (log: Omit<IDriverWorkLog, 'id' | 'logId' | 'createdAt'>) => void;
    onUpdate?: (log: IDriverWorkLog) => void;
    onDelete?: (id: string) => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function DriverWorkLog({ drivers, vehicles, customers, logs, onSave, onUpdate, onDelete, canEdit = true, canDelete = true }: Props) {
    const [driverId, setDriverId] = useState('');
    const [vehicleId, setVehicleId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('credit');
    const [customerName, setCustomerName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [dutyStatus, setDutyStatus] = useState<'on_duty' | 'off_duty' | 'normal'>('on_duty');
    const [reportDriverId, setReportDriverId] = useState<string>('all');
    const [reportFromDate, setReportFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportToDate, setReportToDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Edit state
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // Navigation and Focus Refs
    const driverRef = useRef<HTMLSelectElement>(null);
    const vehicleRef = useRef<HTMLSelectElement>(null);
    const startTimeRef = useRef<HTMLInputElement>(null);
    const endTimeRef = useRef<HTMLInputElement>(null);
    const paymentRef = useRef<HTMLSelectElement>(null);
    const accountRef = useRef<HTMLInputElement>(null);
    const customerRef = useRef<HTMLInputElement>(null);
    const invoiceRef = useRef<HTMLInputElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef?.current?.focus();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!driverId || !vehicleId || !startTime || !endTime || !date || !invoiceNumber || !customerName || (paymentType === 'credit' && !accountNumber)) {
            setFormError('Please fill in all required fields.');
            return;
        }
        
        if (startTime === endTime) {
            setFormError('Start time and end time cannot be identical.');
            return;
        }
        
        const driver = drivers.find(d => d.driverId === Number(driverId));
        const vehicle = vehicles.find(v => v.vehicleId === Number(vehicleId));
        if (!driver || !vehicle) return;

        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        let duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (duration < 0) {
            duration += 24; // Cross-midnight handling
        }

        const logData = {
            driverId: driver.driverId,
            driverName: driver.driverName,
            vehicleId: vehicle.vehicleId,
            vehicleNumber: vehicle.vehicleNumber,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            workDurationHours: parseFloat(duration.toFixed(2)),
            date: date,
            paymentType: paymentType,
            customerName: customerName,
            accountNumber: accountNumber,
            invoiceNumber: invoiceNumber,
            dutyStatus: dutyStatus
        };

        if (editingLogId && onUpdate) {
            const existingLog = logs.find(l => l.id === editingLogId);
            if (existingLog) {
                onUpdate({
                    ...existingLog,
                    ...logData
                });
            }
            setEditingLogId(null);
        } else {
            onSave(logData);
        }

        // Reset fields
        setStartTime('');
        setEndTime('');
        setCustomerName('');
        setAccountNumber('');
        setInvoiceNumber('');
        setDutyStatus('on_duty');
        setFormError(null);
    };

    const handleEditClick = (log: IDriverWorkLog) => {
        setDriverId(log.driverId.toString());
        setVehicleId(log.vehicleId.toString());
        setStartTime(new Date(log.startTime).toTimeString().substring(0, 5));
        setEndTime(new Date(log.endTime).toTimeString().substring(0, 5));
        setDate(log.date);
        setPaymentType(log.paymentType || 'credit');
        setCustomerName(log.customerName || '');
        setAccountNumber(log.accountNumber || '');
        setInvoiceNumber(log.invoiceNumber || '');
        setDutyStatus(log.dutyStatus || 'on_duty');
        setEditingLogId(log.id);
        setDeletingLogId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingLogId(null);
        setStartTime('');
        setEndTime('');
        setCustomerName('');
        setAccountNumber('');
        setInvoiceNumber('');
        setDutyStatus('on_duty');
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    };

    const exportToExcel = async () => {
        const ExcelJS = (window as any).ExcelJS;
        if (!ExcelJS) { console.error("ExcelJS library is not loaded."); return; }
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Driver Work Report', { views: [{ rightToLeft: false }] });
        const reportDate = new Date(date).toLocaleDateString('en-GB');
        
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
        const dataFillAlt = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } };
        const dataFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        const fontBold = { bold: true };
        const borderStyle = { 
            top: { style: 'thin' }, 
            left: { style: 'thin' }, 
            bottom: { style: 'thin' }, 
            right: { style: 'thin' } 
        };

        let currentRow = 2;
        sheet.getCell(`A${currentRow}`).value = 'Driver Work Report';
        sheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
        sheet.getCell(`C${currentRow}`).value = `Date: ${reportDate}`;
        sheet.getCell(`C${currentRow}`).font = { bold: true };
        currentRow += 2;

        if (reportDriverId === 'all') {
            // Summary Export
            const headers = ['Driver Name', 'Logs', 'Total Hours', 'Overtime'];
            headers.forEach((header, idx) => {
                const cell = sheet.getCell(currentRow, idx + 1);
                cell.value = header;
                cell.fill = headerFill;
                cell.font = fontBold;
                cell.border = borderStyle as any;
                cell.alignment = { horizontal: 'center' };
            });
            sheet.getRow(currentRow).height = 20;
            currentRow++;

            drivers.forEach((driver, idx) => {
                const driverLogs = logs.filter(l => l.driverId === driver.driverId && l.date >= reportFromDate && l.date <= reportToDate);
                const logsCount = driverLogs.length;
                if (logsCount === 0) return;

                const rawHours = driverLogs.reduce((sum, l) => sum + l.workDurationHours, 0);
                // In date range view, overtime computation might be tricky as there could be multiple days.
                // We'll calculate total required hours = 8 * (number of non-Fridays).
                const datesInLogs = Array.from(new Set(driverLogs.map(l => l.date)));
                const requiredHours = datesInLogs.reduce((acc, d) => acc + (new Date(d).getDay() === 5 ? 0 : 8), 0);
                
                const extraHours = rawHours - requiredHours;
                const extraDisplay = extraHours > 0 ? extraHours.toFixed(2) : '';

                const rowData = [driver.driverName, logsCount, rawHours.toFixed(2), extraDisplay];
                rowData.forEach((val, cIdx) => {
                    const cell = sheet.getCell(currentRow, cIdx + 1);
                    cell.value = val;
                    cell.border = borderStyle as any;
                    cell.fill = idx % 2 === 0 ? dataFill : dataFillAlt;
                    cell.alignment = { horizontal: cIdx === 0 ? 'left' : 'center' };
                    if (cIdx === 3 && extraDisplay) cell.font = { color: { argb: 'FFFF0000' }, bold: true };
                });
                currentRow++;
            });
            sheet.getColumn(1).width = 25;
            sheet.getColumn(2).width = 15;
            sheet.getColumn(3).width = 15;
            sheet.getColumn(4).width = 15;
        } else {
            // Specific Driver Detail Export
            const driver = drivers.find(d => d.driverId === Number(reportDriverId));
            if (driver) {
                sheet.getCell(`A${currentRow}`).value = `Driver: ${driver.driverName}`;
                sheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF4F46E5' } };
                currentRow += 2;

                const headers = ['Start Time', 'End Time', 'Vehicle', 'Invoice #', 'Customer', 'Type', 'Duration'];
                headers.forEach((header, idx) => {
                    const cell = sheet.getCell(currentRow, idx + 1);
                    cell.value = header;
                    cell.fill = headerFill;
                    cell.font = fontBold;
                    cell.border = borderStyle as any;
                    cell.alignment = { horizontal: 'center' };
                });
                sheet.getRow(currentRow).height = 20;
                currentRow++;

                const driverLogs = logs.filter(l => l.driverId === Number(reportDriverId) && l.date >= reportFromDate && l.date <= reportToDate);
                // Sort by date then startTime
                driverLogs.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

                driverLogs.forEach((log) => {
                    const rowData = [
                        `${log.date} ${formatTime(log.startTime)}`, 
                        `${log.date} ${formatTime(log.endTime)}`, 
                        log.vehicleNumber, 
                        log.invoiceNumber || '—',
                        log.customerName || '—', 
                        (log.paymentType || '').toUpperCase(), 
                        log.workDurationHours.toFixed(2)
                    ];
                    
                    rowData.forEach((val, cIdx) => {
                        const cell = sheet.getCell(currentRow, cIdx + 1);
                        cell.value = val;
                        cell.border = borderStyle as any;
                        cell.alignment = { horizontal: 'center' };
                        if (cIdx === 5) {
                            if (log.paymentType === 'cash') cell.font = { color: { argb: 'FF15803D' }, bold: true };
                            else cell.font = { color: { argb: 'FF1D4ED8' }, bold: true };
                        }
                    });
                    currentRow++;
                });

                // Footer
                const totalDuration = driverLogs.reduce((sum, l) => sum + l.workDurationHours, 0);
                sheet.mergeCells(`A${currentRow}:F${currentRow}`);
                let footerCell = sheet.getCell(`A${currentRow}`);
                footerCell.value = 'Total Hours:';
                footerCell.alignment = { horizontal: 'right' };
                footerCell.font = { bold: true, color: { argb: 'FF6B7280' } };
                footerCell.border = borderStyle as any;
                
                let valCell = sheet.getCell(currentRow, 7);
                valCell.value = totalDuration.toFixed(2);
                valCell.font = { bold: true, color: { argb: 'FF3730A3' } };
                valCell.alignment = { horizontal: 'center' };
                valCell.border = borderStyle as any;
                valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
                currentRow++;

                const isFriday = new Date(date).getDay() === 5;
                const deduction = isFriday ? 0 : 8;
                const extra = totalDuration - deduction;

                if (extra > 0) {
                    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
                    footerCell = sheet.getCell(`A${currentRow}`);
                    footerCell.value = `Overtime (Total - ${deduction}):`;
                    footerCell.alignment = { horizontal: 'right' };
                    footerCell.font = { bold: true, color: { argb: 'FFDC2626' } };
                    footerCell.border = borderStyle as any;
                    
                    valCell = sheet.getCell(currentRow, 7);
                    valCell.value = extra.toFixed(2);
                    valCell.font = { bold: true, color: { argb: 'FFB91C1C' } };
                    valCell.alignment = { horizontal: 'center' };
                    valCell.border = borderStyle as any;
                    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                }

                sheet.getColumn(1).width = 15;
                sheet.getColumn(2).width = 15;
                sheet.getColumn(3).width = 15;
                sheet.getColumn(4).width = 15;
                sheet.getColumn(5).width = 25;
                sheet.getColumn(6).width = 15;
                sheet.getColumn(7).width = 15;
                sheet.getColumn(8).width = 15;
            }
        }

        workbook.xlsx.writeBuffer().then(async (buffer: ArrayBuffer) => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const safeDate = date.replace(/\//g, '-');
            const filename = `Driver_Work_Report_${safeDate}.xlsx`;
            
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

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 border-b pb-2">Driver Logs</h1>

            {/* Compact Input Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100">
                {formError && (
                    <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600">{formError}</span>
                        <button onClick={() => setFormError(null)} className="text-red-400 hover:text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                )}
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 rounded-t-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Record New Entry</h3>
                </div>
                <div className="p-4">
                    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
                        <div className="w-40" style={{ zIndex: 10 }}>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date</label>
                            <CustomDatePicker 
                                value={date} 
                                onChange={setDate} 
                                themeColor="#ea580c" 
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Driver</label>
                            <select 
                                ref={driverRef}
                                required 
                                value={driverId} 
                                onChange={e => {
                                    setDriverId(e.target.value);
                                    if (e.target.value) vehicleRef.current?.focus();
                                }} 
                                onKeyDown={(e) => handleKeyDown(e, vehicleRef)}
                                className="w-full h-9 text-sm px-3 rounded bg-[#f8fafc] border border-gray-300 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            >
                                <option value="">Select driver...</option>
                                {drivers.map(d => <option key={d.id} value={d.driverId}>{d.driverName}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vehicle</label>
                            <select 
                                ref={vehicleRef}
                                required 
                                value={vehicleId} 
                                onChange={e => {
                                    setVehicleId(e.target.value);
                                    if (e.target.value) startTimeRef.current?.focus();
                                }} 
                                onKeyDown={(e) => handleKeyDown(e, startTimeRef)}
                                className="w-full h-9 text-sm px-3 rounded bg-[#f8fafc] border border-gray-300 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            >
                                <option value="">Select vehicle...</option>
                                {vehicles.map(v => <option key={v.id} value={v.vehicleId}>{v.vehicleNumber}</option>)}
                            </select>
                        </div>
                        <div className="w-40">
                            <CustomTimePicker 
                                inputRef={startTimeRef}
                                label="Start"
                                value={startTime} 
                                onChange={(val) => {
                                    setStartTime(val);
                                    if (val) {
                                        // Auto status logic: 6 AM to 2 PM is ON, otherwise OUT
                                        const [h, m] = val.split(':').map(Number);
                                        const totMin = h * 60 + (m || 0);
                                        if (totMin >= 6 * 60 && totMin < 14 * 60) {
                                            setDutyStatus('on_duty');
                                        } else {
                                            setDutyStatus('off_duty');
                                        }
                                    }
                                }} 
                                onKeyDown={(e) => handleKeyDown(e, endTimeRef)}
                                themeColor="#3b82f6" 
                            />
                        </div>
                        <div className="w-40">
                            <CustomTimePicker 
                                inputRef={endTimeRef}
                                label="End"
                                value={endTime} 
                                onChange={(val) => {
                                    setEndTime(val);
                                }} 
                                onKeyDown={(e) => handleKeyDown(e, paymentRef)}
                                themeColor="#3b82f6" 
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payment</label>
                            <select 
                                ref={paymentRef}
                                required 
                                value={paymentType} 
                                onChange={e => {
                                    const val = e.target.value as 'cash' | 'credit';
                                    setPaymentType(val);
                                    if (val === 'cash') {
                                        setCustomerName('');
                                        setAccountNumber('');
                                        customerRef.current?.focus();
                                    } else {
                                        accountRef.current?.focus();
                                    }
                                }} 
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (paymentType === 'credit') accountRef.current?.focus();
                                        else customerRef.current?.focus();
                                    }
                                }}
                                className="w-full h-9 text-sm px-3 rounded bg-[#f8fafc] border border-gray-300 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            >
                                <option value="credit">Credit</option>
                                <option value="cash">Cash</option>
                            </select>
                        </div>
                        
                        {paymentType !== 'cash' && (
                            <div className="w-48">
                                <CustomSearchSelect
                                    inputRef={accountRef}
                                    label="Account No."
                                    placeholder="Account number..."
                                    value={accountNumber}
                                    onChange={val => {
                                        setAccountNumber(val);
                                        if (paymentType === 'credit') {
                                            const customer = customers.find(c => c.customerNumber === val);
                                            if (customer) setCustomerName(customer.name);
                                        }
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, customerRef)}
                                    options={customers.map(c => ({
                                        value: c.customerNumber,
                                        label: c.customerNumber,
                                        detail: c.name
                                    }))}
                                    themeColor="#4f46e5"
                                    iconType="hash"
                                />
                            </div>
                        )}

                        <div className="flex-1 min-w-[200px]">
                            {paymentType === 'cash' ? (
                                <>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Customer / Note</label>
                                    <input 
                                        ref={customerRef}
                                        type="text"
                                        placeholder="Optional manual note..."
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, invoiceRef)}
                                        className="w-full h-9 text-sm px-3 rounded bg-[#f8fafc] border border-gray-300 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                    />
                                </>
                            ) : (
                                <CustomSearchSelect
                                    inputRef={customerRef}
                                    label="Customer Name"
                                    placeholder="Search customers..."
                                    value={customerName}
                                    onChange={val => {
                                        setCustomerName(val);
                                        if (paymentType === 'credit') {
                                            const customer = customers.find(c => c.name === val);
                                            if (customer) setAccountNumber(customer.customerNumber);
                                        }
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, invoiceRef)}
                                    options={customers.map(c => ({
                                        value: c.name,
                                        label: c.name,
                                        detail: c.customerNumber
                                    }))}
                                    themeColor="#4f46e5"
                                    iconType="user"
                                />
                            )}
                        </div>
                        
                        <div className="w-32">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duty Status</label>
                            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 h-10">
                                <button
                                    type="button"
                                    onClick={() => setDutyStatus('on_duty')}
                                    className={`flex-1 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${
                                        dutyStatus === 'on_duty' 
                                        ? 'bg-green-600 text-white shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    ON
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDutyStatus('off_duty')}
                                    className={`flex-1 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${
                                        dutyStatus === 'off_duty' 
                                        ? 'bg-red-500 text-white shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    OUT
                                </button>
                            </div>
                        </div>

                        <div className="w-32">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Invoice #</label>
                            <input 
                                ref={invoiceRef}
                                type="text"
                                placeholder="Invoice..."
                                value={invoiceNumber}
                                onChange={e => setInvoiceNumber(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, submitRef)}
                                className="w-full h-9 text-sm px-3 rounded bg-[#f8fafc] border border-gray-300 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button 
                                ref={submitRef}
                                type="submit" 
                                className={`h-9 px-6 ${editingLogId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'} text-white text-sm font-bold rounded shadow-sm transition-all whitespace-nowrap`}
                            >
                                {editingLogId ? 'Update Log' : 'Save Log'}
                            </button>
                            {editingLogId && (
                                <button type="button" onClick={handleCancelEdit} className="h-9 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold rounded shadow-sm transition-all whitespace-nowrap">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Enhanced Report Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-[#b4c6e7] to-[#d9e2f3] border-b border-gray-300 flex flex-col items-center gap-4">
                    <h2 className="text-xl font-black text-amber-600 text-center w-full">
                        Driver Work Report
                    </h2>
                    
                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                        <div className="flex items-center bg-white p-1 rounded-lg shadow-inner">
                            <span className="text-xs font-bold text-gray-500 pl-3 pr-2">From:</span>
                            <input 
                                type="date"
                                value={reportFromDate}
                                onChange={e => setReportFromDate(e.target.value)}
                                className="text-sm font-bold py-1 px-2 border-none focus:ring-0 bg-transparent text-gray-700 outline-none"
                            />
                        </div>
                        <div className="flex items-center bg-white p-1 rounded-lg shadow-inner">
                            <span className="text-xs font-bold text-gray-500 pl-3 pr-2">To:</span>
                            <input 
                                type="date"
                                value={reportToDate}
                                onChange={e => setReportToDate(e.target.value)}
                                className="text-sm font-bold py-1 px-2 border-none focus:ring-0 bg-transparent text-gray-700 outline-none"
                            />
                        </div>
                        <div className="flex items-center bg-white p-1 rounded-lg shadow-inner">
                            <span className="text-xs font-bold text-gray-500 pl-3 pr-1">Filter:</span>
                            <select 
                                value={reportDriverId} 
                                onChange={e => setReportDriverId(e.target.value)}
                                className="text-sm font-bold py-1.5 px-2 border-none focus:ring-0 cursor-pointer bg-transparent"
                            >
                                <option value="all">All</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.driverId}>{d.driverName}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium text-sm transition-colors shadow-sm ml-auto">
                            Export Excel
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto p-4">
                    {reportDriverId === 'all' ? (
                        /* Summary Table (All Drivers) */
                        <table className="min-w-full border-separate border-spacing-0 border border-gray-300 rounded-lg overflow-hidden">
                            <thead className="bg-[#b4c6e7]">
                                <tr>
                                    <th className="px-4 py-3 text-right text-xs font-black text-gray-900 border border-gray-300 uppercase tracking-widest">Driver Name</th>
                                    <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase tracking-widest">Logs</th>
                                    <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase tracking-widest">Total Hours</th>
                                    <th className="px-4 py-3 text-center text-xs font-black text-red-600 border border-gray-300 uppercase tracking-widest">Overtime</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {drivers.map((driver, idx) => {
                                    const driverLogs = logs.filter(l => l.driverId === driver.driverId && l.date >= reportFromDate && l.date <= reportToDate);
                                    const logsCount = driverLogs.length;
                                    if (logsCount === 0) return null;

                                    const rawHours = driverLogs.reduce((sum, l) => sum + l.workDurationHours, 0);
                                    
                                    const datesInLogs = Array.from(new Set(driverLogs.map(l => l.date)));
                                    const requiredHours = datesInLogs.reduce((acc, d) => acc + (new Date(d).getDay() === 5 ? 0 : 8), 0);
                                    
                                    const extraHours = rawHours - requiredHours;
                                    const extraDisplay = extraHours > 0 ? extraHours.toFixed(2) : '';

                                    return (
                                        <tr key={driver.driverId} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f0f4fa]'}>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900 border border-gray-300">{driver.driverName}</td>
                                            <td className="px-4 py-3 text-center text-sm font-medium text-gray-600 border border-gray-300">{logsCount}</td>
                                            <td className="px-4 py-3 text-center text-sm font-medium text-gray-600 border border-gray-300">{rawHours.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center text-sm font-black text-red-600 border border-gray-300 bg-red-50/30">{extraDisplay}</td>
                                        </tr>
                                    );
                                })}
                                {!drivers.some(driver => logs.some(l => l.driverId === driver.driverId && l.date >= reportFromDate && l.date <= reportToDate)) && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10 text-center text-gray-400 italic text-sm">No recorded data for this date range.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* Detailed View (Specific Driver) */
                        <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest text-right">Driver Profile</h4>
                                    <p className="text-lg font-black text-indigo-900">{drivers.find(d => d.driverId === Number(reportDriverId))?.driverName}</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Calculation</h4>
                                    <p className="text-xs font-medium text-gray-600">Total work hours (Time difference)</p>
                                </div>
                            </div>

                            <table className="min-w-full border-separate border-spacing-0 border border-gray-300 rounded-lg overflow-hidden">
                                <thead className="bg-[#b4c6e7]">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Start Time</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">End Time</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Vehicle</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Invoice #</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Customer</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Type</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Duration</th>
                                        <th className="px-4 py-3 text-center text-xs font-black text-gray-900 border border-gray-300 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {logs.filter(l => l.driverId === Number(reportDriverId) && l.date >= reportFromDate && l.date <= reportToDate).sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).map((log, idx) => (
                                        <tr key={idx} className={`hover:bg-opacity-80 transition-colors ${
                                            log.dutyStatus === 'on_duty' ? 'bg-green-50' : 
                                            log.dutyStatus === 'off_duty' ? 'bg-red-50' : 
                                            'bg-white'
                                        } ${editingLogId === log.id ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>
                                            <td className="px-4 py-3 text-center text-[10px] font-black border border-gray-300">
                                                {log.dutyStatus === 'on_duty' ? (
                                                    <span className="text-green-600 uppercase">On</span>
                                                ) : log.dutyStatus === 'off_duty' ? (
                                                    <span className="text-red-600 uppercase">Out</span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm font-medium border border-gray-300 text-gray-600">{log.date}</td>
                                            <td className="px-4 py-3 text-center text-sm font-medium border border-gray-300 text-gray-600">{formatTime(log.startTime)}</td>
                                            <td className="px-4 py-3 text-center text-sm font-medium border border-gray-300 text-gray-600">{formatTime(log.endTime)}</td>
                                            <td className="px-4 py-3 text-center text-sm font-bold border border-gray-300 text-gray-800">{log.vehicleNumber}</td>
                                            <td className="px-4 py-3 text-center text-sm border border-gray-300 text-gray-600 italic font-medium">{log.invoiceNumber || '—'}</td>
                                            <td className="px-4 py-3 text-center text-sm border border-gray-300 text-gray-700 font-medium">{log.customerName || '—'}</td>
                                            <td className="px-4 py-3 text-center text-sm border border-gray-300">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.paymentType === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {log.paymentType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm font-black border border-gray-300 text-gray-900">{log.workDurationHours.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center text-sm border border-gray-300">
                                                {deletingLogId === log.id ? (
                                                    <div className="flex justify-center gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                if (onDelete) onDelete(log.id);
                                                                setDeletingLogId(null);
                                                            }}
                                                            className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button 
                                                            onClick={() => setDeletingLogId(null)}
                                                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center gap-2 opacity-100 transition-opacity">
                                                        {canEdit && (
                                                            <button 
                                                                onClick={() => handleEditClick(log)}
                                                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                                                title="Edit"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button 
                                                                onClick={() => setDeletingLogId(log.id)}
                                                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                                title="Delete"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Calculated Footer Row */}
                                    {(() => {
                                        const filtered = logs.filter(l => l.driverId === Number(reportDriverId) && l.date >= reportFromDate && l.date <= reportToDate);
                                        const totalLogs = filtered.length;
                                        const totalDuration = filtered.reduce((s, l) => s + l.workDurationHours, 0);
                                        const colSpanCount = 10;

                                        if (totalLogs === 0) return (
                                            <tr>
                                                <td colSpan={colSpanCount} className="px-4 py-10 text-center text-gray-400 italic text-sm">No data for this date range.</td>
                                            </tr>
                                        );

                                        const datesInLogs = Array.from(new Set(filtered.map(l => l.date)));
                                        const requiredHours = datesInLogs.reduce((acc, d) => acc + (new Date(d).getDay() === 5 ? 0 : 8), 0);
                                        const extra = totalDuration - requiredHours;

                                        return (
                                            <>
                                                <tr className="bg-[#f8fafc] font-black shadow-sm">
                                                    <td colSpan={colSpanCount - 2} className="px-4 py-3 text-right border border-gray-300 uppercase tracking-widest text-xs text-gray-500">Total Hours:</td>
                                                    <td className="px-4 py-3 text-center border border-gray-300 text-indigo-800 bg-indigo-50">{totalDuration.toFixed(2)}</td>
                                                    <td className="border border-gray-300"></td>
                                                </tr>
                                                {extra > 0 && (
                                                    <tr className="bg-red-50 font-black">
                                                        <td colSpan={colSpanCount - 2} className="px-4 py-3 text-right border border-gray-300 uppercase tracking-widest text-xs text-red-600">Overtime (Total - {requiredHours}):</td>
                                                        <td className="px-4 py-3 text-center border border-gray-300 text-red-700 bg-red-100/50">{extra.toFixed(2)}</td>
                                                        <td className="border border-gray-300"></td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
