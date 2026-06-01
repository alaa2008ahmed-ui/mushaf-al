import React, { useState, useMemo } from 'react';
import { InvoiceLog, Branch } from '../types';
import { downloadBlob } from '../downloadUtils';
import { captureAndExport, printOrDownloadPdf } from '../captureUtils';
import Header from './Header';

interface InvoiceTrackingProps {
    logs: InvoiceLog[];
    branches: Branch[];
    currentUserName?: string;
    selectedBranchId?: string;
    pendingCount?: number;
    lastSyncTime?: number;
    onRefresh?: () => Promise<void>;
}

const parseDate = (val: any) => {
    if (!val) return null;
    if (val.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const InvoiceTracking: React.FC<InvoiceTrackingProps> = ({ 
    logs, 
    branches,
    currentUserName,
    selectedBranchId: appSelectedBranchId,
    pendingCount,
    lastSyncTime,
    onRefresh
}) => {
    // Defaults to today
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');

    const filteredLogs = useMemo(() => {
        let filtered = logs;

        // Filter by Date
        const start = startDate ? new Date(startDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        filtered = filtered.filter(log => {
            const lDate = parseDate(log.date);
            if (!lDate) return false;
            if (start && lDate < start) return false;
            if (end && lDate > end) return false;
            return true;
        });

        // Filter by Branch
        if (selectedBranch !== 'all') {
            filtered = filtered.filter(log => log.branchId === selectedBranch);
        }

        // Sort descending by date
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs, startDate, endDate, selectedBranch]);

    const getBranchName = (id?: string) => {
        if (!id) return 'Main';
        return branches.find(b => b.id === id)?.name || 'Unknown';
    };

    const safeFormatTime = (val: any) => {
        const d = parseDate(val);
        if (!d) return typeof val === 'string' ? val : 'Invalid Date';
        return d.toLocaleString('en-GB');
    };

    const safeFormatDate = (val: any) => {
        const d = parseDate(val);
        if (!d) return typeof val === 'string' ? val : 'Invalid Date';
        return d.toLocaleDateString('en-GB'); // Shows DD/MM/YYYY
    };

    const areDatesDifferent = (date1: any, date2: any) => {
        const d1 = parseDate(date1);
        const d2 = parseDate(date2);
        if (!d1 && !d2) return false;
        if (!d1 || !d2) return true;
        return d1.getTime() !== d2.getTime();
    };
    const handlePrint = () => {
        captureAndExport('printable-area-tracking', (canvas) => {
            const filename = `invoice-tracking-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`;
            printOrDownloadPdf(canvas, filename, 'p');
        });
    };

    const handleExportPdf = () => {
        captureAndExport('printable-area-tracking', async (canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = (window as any).jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = canvas.width / canvas.height;
            let width = pdfWidth;
            let height = width / ratio;
            
            if (height > pdfHeight) { 
                height = pdfHeight; 
                width = height * ratio; 
            }
            const xOffset = (pdfWidth - width) / 2;
            pdf.addImage(imgData, 'PNG', xOffset, 0, width, height);

            const filename = `invoice-tracking-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
            const blob = pdf.output('blob');

            await downloadBlob(blob, filename, {
                description: 'PDF File',
                accept: { 'application/pdf': ['.pdf'] },
            });
        });
    };

    const handleExportExcel = async () => {
        const ExcelJS = window.ExcelJS;
        if (!ExcelJS) { console.error("ExcelJS library is not loaded."); return; }
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Invoice Tracking');

        sheet.columns = [
            { header: 'Action Date', key: 'actionDate', width: 25 },
            { header: 'Original Date', key: 'origDate', width: 25 },
            { header: 'Invoice No.', key: 'invNo', width: 15 },
            { header: 'Action', key: 'action', width: 15 },
            { header: 'User', key: 'user', width: 20 },
            { header: 'Branch', key: 'branch', width: 20 },
            { header: 'Details', key: 'details', width: 50 }
        ];

        filteredLogs.forEach(log => {
            let details = '';
            if (log.action === 'DELETE') {
                details = `Deleted Item: ${log.previousValues.itemName} (Qty: ${log.previousValues.quantity}), Total: ${log.previousValues.total}`;
            } else {
                const diffs = [];
                if (log.previousValues.itemName !== log.newValues?.itemName) diffs.push(`Item: ${log.previousValues.itemName} -> ${log.newValues?.itemName}`);
                if (Number(log.previousValues.quantity) !== Number(log.newValues?.quantity)) diffs.push(`Qty: ${log.previousValues.quantity} -> ${log.newValues?.quantity}`);
                if (Number(log.previousValues.total) !== Number(log.newValues?.total)) diffs.push(`Total: ${log.previousValues.total} -> ${log.newValues?.total}`);
                if (areDatesDifferent(log.previousValues.date, log.newValues?.date)) diffs.push(`Date: ${safeFormatDate(log.previousValues.date)} -> ${safeFormatDate(log.newValues?.date)}`);
                if (log.previousValues.type !== log.newValues?.type) diffs.push(`Type: ${log.previousValues.type} -> ${log.newValues?.type}`);
                details = diffs.join(' | ');
            }
            
            sheet.addRow({
                actionDate: safeFormatTime(log.date),
                origDate: safeFormatDate(log.previousValues.date),
                invNo: log.invoiceNumber,
                action: log.action === 'DELETE' ? 'DELETED' : 'EDITED',
                user: log.user,
                branch: getBranchName(log.branchId),
                details
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await downloadBlob(blob, `invoice-tracking-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`, {
            description: 'Excel File',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
        });
    };

    return (
        <div className="px-2 pt-2 pb-8 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-md mb-2 flex flex-col items-center justify-between gap-1 no-print relative z-10 sticky top-0 md:top-[160px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] py-1.5 px-4 bg-white z-20">
                <div className="flex flex-col md:flex-row items-center justify-between w-full no-print gap-2 md:gap-4">
                    <div className="flex flex-col w-full md:flex-1 text-center md:text-left">
                        <h2 className="text-base sm:text-lg font-black text-fuchsia-600 leading-tight">Invoices Tracking</h2>
                        <p className="text-[10px] sm:text-xs font-semibold text-fuchsia-400 leading-tight">System Audit Log</p>
                    </div>
                    <div className="hidden md:block md:flex-1"></div>
                    <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 w-full md:flex-1 no-print">
                        <div id="tracking-actions" className="flex items-center gap-1.5 flex-wrap w-full md:w-auto justify-center md:justify-end">
                            <button
                                onClick={handlePrint}
                                className="flex items-center justify-center gap-1.5 bg-fuchsia-600 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-fuchsia-700 h-[40px] min-w-[70px]"
                                title="Print"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span className="hidden xs:inline">Print</span>
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center justify-center gap-1.5 bg-green-700 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-green-800 h-[40px] min-w-[70px]"
                                title="Export to Excel"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                   <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden xs:inline">Excel</span>
                            </button>
                            <button
                                onClick={handleExportPdf}
                                className="flex items-center justify-center gap-1.5 bg-red-600 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-red-700 h-[40px] min-w-[70px]"
                                title="Export to PDF"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden xs:inline">PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">From Date</label>
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">To Date</label>
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Branch</label>
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div id="printable-area-tracking" className="overflow-x-auto border border-gray-200 rounded-lg bg-white print:overflow-visible print:min-w-fit print:border-none print:shadow-none">
                <div className="print-only mb-6 w-full">
                    <Header 
                        employeeName={currentUserName}
                        branches={branches}
                        selectedBranchId={appSelectedBranchId}
                        readOnly={true}
                        date={new Date()}
                        pendingCount={pendingCount}
                        lastSyncTime={lastSyncTime}
                        onRefresh={onRefresh}
                        reportTitle="Invoices Tracking Report"
                    />
                    <div className="mt-8 px-6 border-b pb-6">
                        <h2 className="text-3xl font-black text-gray-900 mb-4">Invoices Tracking Report</h2>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">From Date</span>
                                <span className="text-lg font-bold text-gray-800">{startDate}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">To Date</span>
                                <span className="text-lg font-bold text-gray-800">{endDate}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Branch</span>
                                <span className="text-lg font-bold text-gray-800">
                                    {selectedBranch === 'all' ? 'All Branches' : branches.find(b => b.id === selectedBranch)?.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50 print:bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Inv No.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Branch</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">No tracking records found.</td>
                            </tr>
                        ) : (
                            filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                        <div className="font-semibold text-gray-800" title="Action Time">
                                            <span className="text-xs text-gray-400 block mb-1">Action Time:</span>
                                            {safeFormatTime(log.date)}
                                        </div>
                                        <div className="mt-2 text-gray-600" title="Original Invoice Time">
                                            <span className="text-xs text-gray-400 block mb-1">Original Invoice Time:</span>
                                            {safeFormatTime(log.previousValues.date)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                        <span className="bg-gray-200 px-2 py-1 rounded text-xs">{log.invoiceNumber}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                                        {log.action === 'DELETE' ? (
                                            <span className="text-red-600 bg-red-100 px-2 py-1 rounded-full text-xs">DELETED</span>
                                        ) : (
                                            <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded-full text-xs">EDITED</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-800">{log.user}</td>
                                    <td className="px-4 py-3 text-sm text-gray-800">{getBranchName(log.branchId)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {log.action === 'DELETE' ? (
                                            <div className="text-gray-600 text-xs">
                                                <strong>Item:</strong> {log.previousValues.itemName} (Qty: {log.previousValues.quantity}) <br/>
                                                <strong>Total:</strong> {log.previousValues.total} <br/>
                                                <strong>Date:</strong> {safeFormatDate(log.previousValues.date)}
                                            </div>
                                        ) : (
                                            <div className="text-gray-600 text-xs space-y-1">
                                                {/* Diffs */}
                                                {(log.previousValues.itemCode !== log.newValues?.itemCode || log.previousValues.itemName !== log.newValues?.itemName) && (
                                                   <div><strong>Item:</strong> <span className="line-through text-red-500">{log.previousValues.itemName}</span> &rarr; <span className="text-green-600 font-semibold">{log.newValues?.itemName}</span></div>
                                                )}
                                                {Number(log.previousValues.quantity) !== Number(log.newValues?.quantity) && (
                                                   <div><strong>Qty:</strong> <span className="line-through text-red-500">{log.previousValues.quantity}</span> &rarr; <span className="text-green-600 font-semibold">{log.newValues?.quantity}</span></div>
                                                )}
                                                {Number(log.previousValues.total) !== Number(log.newValues?.total) && (
                                                   <div><strong>Total:</strong> <span className="line-through text-red-500">{log.previousValues.total}</span> &rarr; <span className="text-green-600 font-semibold">{log.newValues?.total}</span></div>
                                                )}
                                                {areDatesDifferent(log.previousValues.date, log.newValues?.date) && (
                                                   <div><strong>Date:</strong> <span className="line-through text-red-500">{safeFormatDate(log.previousValues.date)}</span> &rarr; <span className="text-green-600 font-semibold">{safeFormatDate(log.newValues?.date)}</span></div>
                                                )}
                                                {log.previousValues.type !== log.newValues?.type && (
                                                   <div><strong>Type:</strong> <span className="line-through text-red-500">{log.previousValues.type}</span> &rarr; <span className="text-green-600 font-semibold">{log.newValues?.type}</span></div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            </div>
        </div>
    );
};

export default InvoiceTracking;
