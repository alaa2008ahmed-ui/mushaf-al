import React, { useState, useMemo } from 'react';
import { Invoice, Item, Employee, Branch, User, POCustomer } from '../types';
import Header from './Header';
import InvoiceList from './InvoiceList';
import CustomSelect from './ui/CustomSelect';
import { downloadBlob } from '../downloadUtils';
import { captureAndExport, printOrDownloadPdf } from '../captureUtils';

import CustomDatePicker from './ui/CustomDatePicker';

interface AccountStatementProps {
    invoices: Invoice[];
    items: Item[];
    branches: Branch[];
    selectedBranchId: string;
    currentUserName?: string;
    users?: User[];
    poCustomers?: POCustomer[];
}

const AccountStatement: React.FC<AccountStatementProps> = ({
    invoices,
    items,
    branches,
    selectedBranchId,
    currentUserName,
    users = [],
    poCustomers = []
}) => {
    const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedItemFilter, setSelectedItemFilter] = useState<string>('all');
    const [salesType, setSalesType] = useState<'all' | 'cash' | 'credit' | 'total'>('all');
    const [statementBranchId, setStatementBranchId] = useState<string>(selectedBranchId || 'all');
    const [statementUserId, setStatementUserId] = useState<string>('all');

    const branchOptions = [{ id: 'all', name: 'All Branches' }, ...branches];
    const itemFilterOptions = [{ id: 'all', name: 'All Items' }, ...items.map(i => ({ id: i.name, name: i.name }))];
    const userOptions = useMemo(() => {
        const _users = users.filter((u) => u.username.toLowerCase() !== 'alaa');
        return [{ id: 'all', name: 'All Users' }, ..._users.map(u => ({ id: u.username, name: u.username }))];
    }, [users]);
    const salesTypeOptions = [
        { id: 'all', name: 'All (Cash & Credit)' },
        { id: 'cash', name: 'Cash Only' },
        { id: 'credit', name: 'Credit Only' },
        { id: 'total', name: 'Total (Summary Only)' }
    ];

    const formatDateDDMMYYYY = (dateString: string) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const fromDateRef = React.useRef<HTMLInputElement>(null);
    const toDateRef = React.useRef<HTMLInputElement>(null);
    const handlePrint = () => {
        captureAndExport('printable-area-statement', (canvas) => {
            const branchName = statementBranchId === 'all' ? 'All_Branches' : (branches.find(b => b.id === statementBranchId)?.name || 'Main_Branch');
            const filename = `account-statement-${branchName.replace(/\s+/g, '_')}-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`;
            printOrDownloadPdf(canvas, filename, 'p');
        });
    };

    const handleExportPdf = () => {
        captureAndExport('printable-area-statement', async (canvas) => {
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

            const branchName = statementBranchId === 'all' ? 'All_Branches' : (branches.find(b => b.id === statementBranchId)?.name || 'Main_Branch');
            const filename = `account-statement-${branchName.replace(/\s+/g, '_')}-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
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
        const sheet = workbook.addWorksheet('Account Statement', { views: [{ rightToLeft: false }] });
        
        const branchName = statementBranchId === 'all' ? 'All Branches' : (branches.find(b => b.id === statementBranchId)?.name || 'Main Branch');
        const dateRange = `From: ${formatDateDDMMYYYY(fromDate)} To: ${formatDateDDMMYYYY(toDate)}`;
        
        const mainFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF276749' } };
        const subFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F855A' } };
        const summaryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } };
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3182CE' } };
        const whiteFont = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        
        sheet.mergeCells('A1:G2');
        const headerCell = sheet.getCell('A1');
        headerCell.value = 'Account Statement\nSweet Water Company LTD';
        headerCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
        headerCell.fill = mainFill;
        headerCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        
        sheet.mergeCells('A3:G3');
        const infoCell = sheet.getCell('A3');
        infoCell.value = `Branch: ${branchName} | ${dateRange}`;
        infoCell.font = { size: 10, color: { argb: 'FFFFFFFF' }, bold: true };
        infoCell.fill = subFill;
        infoCell.alignment = { vertical: 'middle', horizontal: 'left' };
        
        sheet.addRow([]);
        let currentRow = 5;
        
        // Summary Header
        sheet.mergeCells(currentRow, 1, currentRow, 3);
        const summTitle = sheet.getCell(currentRow, 1);
        summTitle.value = 'Statement Summary';
        summTitle.font = { bold: true };
        summTitle.fill = summaryFill;
        currentRow++;
        
        const summHeaders = sheet.getRow(currentRow);
        summHeaders.getCell(1).value = 'Cash Total';
        summHeaders.getCell(2).value = 'Credit Total';
        summHeaders.getCell(3).value = 'Grand Total';
        summHeaders.getCell(4).value = 'Total Quantity';
        [1, 2, 3, 4].forEach(c => { summHeaders.getCell(c).font = { bold: true }; summHeaders.getCell(c).fill = summaryFill; });
        currentRow++;
        
        const summData = sheet.getRow(currentRow);
        summData.getCell(1).value = cashTotal;
        summData.getCell(2).value = creditTotal;
        summData.getCell(3).value = grandTotal;
        summData.getCell(4).value = totalQuantity;
        [1, 2, 3, 4].forEach(c => { summData.getCell(c).numFmt = '#,##0.00'; });
        [1, 2, 3, 4].forEach(c => { summData.getCell(c).fill = summaryFill; });
        currentRow += 2;

        // Invoices Table
        const tableHeaders = ['Invoice No.', 'Date/Time', 'User', 'Branch', 'Item', 'Qty', 'Total'];
        const headRow = sheet.getRow(currentRow);
        tableHeaders.forEach((h, i) => {
            const cell = headRow.getCell(i + 1);
            cell.value = h;
            cell.font = whiteFont;
            cell.fill = headerFill;
        });
        currentRow++;

        filteredInvoices.forEach(inv => {
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = inv.invoiceNumber;
            row.getCell(2).value = new Date(inv.date).toLocaleString('en-GB');
            row.getCell(3).value = inv.createdBy || '-';
            row.getCell(4).value = branches.find(b => b.id === inv.branchId)?.name || 'Main';
            row.getCell(5).value = inv.itemName;
            row.getCell(6).value = inv.quantity;
            row.getCell(7).value = inv.total;
            row.getCell(6).numFmt = '#,##0.00';
            row.getCell(7).numFmt = '#,##0.00';
            currentRow++;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Account_Statement_${branchName}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFromContainerClick = () => {
        if (fromDateRef.current) {
            try {
                if ('showPicker' in fromDateRef.current) {
                    (fromDateRef.current as any).showPicker();
                } else {
                    fromDateRef.current.click();
                }
            } catch (err) {
                fromDateRef.current.click();
            }
        }
    };

    const handleToContainerClick = () => {
        if (toDateRef.current) {
            try {
                if ('showPicker' in toDateRef.current) {
                    (toDateRef.current as any).showPicker();
                } else {
                    toDateRef.current.click();
                }
            } catch (err) {
                toDateRef.current.click();
            }
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            // Filter by date range
            const invDateStr = new Date(inv.date).toISOString().split('T')[0];
            if (invDateStr < fromDate || invDateStr > toDate) return false;

            // Filter by item
            if (selectedItemFilter !== 'all' && inv.itemName !== selectedItemFilter) return false;

            // Filter by sales type
            if (salesType !== 'all' && salesType !== 'total' && inv.type !== salesType) return false;

            // Filter by branch
            if (statementBranchId !== 'all') {
                if (inv.branchId !== statementBranchId) return false;
            }

            // Filter by user
            if (statementUserId !== 'all') {
                if (inv.createdBy !== statementUserId) return false;
            }

            return true;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [invoices, fromDate, toDate, selectedItemFilter, salesType, statementBranchId, statementUserId]);

    const totalQuantity = filteredInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
    const grandTotal = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const cashTotal = filteredInvoices.filter(inv => inv.type === 'cash').reduce((sum, inv) => sum + inv.total, 0);
    const creditTotal = filteredInvoices.filter(inv => inv.type === 'credit').reduce((sum, inv) => sum + inv.total, 0);

    return (
            <div id="printable-area-statement" className="min-h-screen print:min-w-fit print:overflow-visible">
                <div className="print-only w-full">
                    <Header 
                        employeeName={currentUserName}
                        branches={branches} 
                        selectedBranchId={selectedBranchId}
                        readOnly={true}
                        reportTitle="Account Statement"
                    />
                    <div className="mt-8 px-6 border-b pb-6">
                        <h2 className="text-3xl font-black text-gray-900 mb-4">Account Statement</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">User</span>
                                <span className="text-lg font-bold text-gray-800">{statementUserId === 'all' ? 'All Users' : statementUserId}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">From Date</span>
                                <span className="text-lg font-bold text-gray-800">{fromDate}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">To Date</span>
                                <span className="text-lg font-bold text-gray-800">{toDate}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Branch</span>
                                <span className="text-lg font-bold text-gray-800">{branches.find(b => b.id === statementBranchId)?.name || 'All Branches'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            <div className="px-2 pt-2 pb-8 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-md mb-2 flex flex-col items-center justify-between gap-1 no-print relative z-10 sticky top-0 md:top-[160px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] py-1.5 px-4 bg-white z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between w-full no-print gap-2 md:gap-4">
                        <div className="flex flex-col w-full md:flex-1 text-center md:text-left">
                            <h2 className="text-base sm:text-lg font-black text-emerald-600 leading-tight">Account Statement</h2>
                            <p className="text-[10px] sm:text-xs font-semibold text-emerald-400 leading-tight">Branch: {branches.find(b => b.id === statementBranchId)?.name || 'All'}</p>
                        </div>
                        <div className="hidden md:block md:flex-1"></div>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 w-full md:flex-1 no-print">
                            <div id="statement-actions" className="flex items-center gap-1.5 flex-wrap w-full md:w-auto justify-center md:justify-end">
                                <button
                                    onClick={handlePrint}
                                    disabled={filteredInvoices.length === 0}
                                    className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-[40px] min-w-[70px]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-2 6H9v4h4v-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="hidden xs:inline">Print</span>
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    disabled={filteredInvoices.length === 0}
                                    className="flex items-center justify-center gap-1.5 bg-green-700 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed h-[40px] min-w-[70px]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM5 5v2h2V5H5zm4 0v2h2V5H9zm4 0v2h2V5h-2zM5 9v2h2V9H5zm4 0v2h2V9H9zm4 0v2h2V9h-2zM5 13v2h2v-2H5zm4 0v2h2v-2H9zm4 0v2h2v-2h-2z" />
                                    </svg>
                                    <span className="hidden xs:inline">Excel</span>
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    disabled={filteredInvoices.length === 0}
                                    className="flex items-center justify-center gap-1.5 bg-red-600 text-white font-semibold py-1.5 px-3 text-sm rounded-md transition-colors hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-[40px] min-w-[70px]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm8 3a1 1 0 00-1-1H9a1 1 0 100 2h2a1 1 0 001-1zm-4 4a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
                                    </svg>
                                    <span className="hidden xs:inline">PDF</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 print-only">Account Statement</h2>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-6 mb-6 no-print">
                    <div className="col-span-1">
                        <CustomDatePicker 
                            label="From Date"
                            value={fromDate}
                            onChange={setFromDate}
                            direction="down"
                        />
                    </div>
                    <div className="col-span-1">
                        <CustomDatePicker 
                            label="To Date"
                            value={toDate}
                            onChange={setToDate}
                            direction="down"
                            align="right"
                        />
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1">
                        <CustomSelect 
                            label="Sales Type"
                            options={salesTypeOptions}
                            value={salesType}
                            onChange={(val) => setSalesType(val as any)}
                            themeColor="#2563eb"
                            direction="up"
                            className="w-full"
                        />
                    </div>

                    <div className="col-span-1 sm:col-span-1">
                        <CustomSelect 
                            label="Branch"
                            options={branchOptions}
                            value={statementBranchId}
                            onChange={setStatementBranchId}
                            themeColor="#2563eb"
                            direction="up"
                            className="w-full"
                        />
                    </div>
                    
                    <div className="col-span-1 sm:col-span-1">
                        <CustomSelect 
                            label="User"
                            options={userOptions}
                            value={statementUserId}
                            onChange={setStatementUserId}
                            themeColor="#2563eb"
                            direction="up"
                            className="w-full"
                        />
                    </div>

                    <div className="col-span-1 sm:col-span-1">
                        <CustomSelect 
                            label="Item"
                            options={itemFilterOptions}
                            value={selectedItemFilter}
                            onChange={setSelectedItemFilter}
                            themeColor="#2563eb"
                            direction="up"
                            className="w-full"
                        />
                    </div>
                </div>

            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Statement Results</h3>
                    <div className="text-right border-t-2 border-blue-100 pt-4">
                        <p className="text-lg text-gray-600 mb-1">Total Quantity: <span className="text-2xl font-black text-blue-700 ml-2">{totalQuantity.toFixed(2)}</span></p>
                        {(salesType === 'all' || salesType === 'total') && (
                            <div className="flex flex-col gap-1 mb-2">
                                <p className="text-base text-gray-600">Cash Sales: <span className="text-xl font-bold text-blue-600 ml-2">{cashTotal.toFixed(2)}</span></p>
                                <p className="text-base text-gray-600">Credit Sales: <span className="text-xl font-bold text-sky-600 ml-2">{creditTotal.toFixed(2)}</span></p>
                            </div>
                        )}
                        <p className="text-xl text-gray-700">Grand Total: <span className="text-4xl font-black text-green-700 ml-2">{grandTotal.toFixed(2)}</span></p>
                    </div>
                </div>

                {salesType !== 'total' && (
                    filteredInvoices.length > 0 ? (
                        <InvoiceList 
                            title="Filtered Invoices" 
                            invoices={filteredInvoices} 
                            theme={salesType === 'credit' ? 'credit' : 'cash'} 
                            branches={branches}
                            poCustomers={poCustomers}
                        />
                    ) : (
                        <p className="text-gray-500 text-center py-8">No invoices found for the selected criteria.</p>
                    )
                )}
            </div>
            </div>
        </div>
    );
};

export default AccountStatement;
