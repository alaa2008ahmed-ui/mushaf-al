import React, { useState, useEffect, useRef, useMemo } from 'react';
import { POCustomer, Invoice, User, Customer, Item } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Printer, FileText, FileSpreadsheet, Save, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface POProps {
    poCustomers: POCustomer[];
    customers: Customer[];
    items: Item[];
    invoices: Invoice[];
    onAddPOCustomer: (initialData?: Partial<POCustomer>) => void;
    onUpdatePOCustomer: (id: string, customer: POCustomer) => void;
    onDeletePOCustomer: (id: string) => void;
    onAddCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
    currentUser: User | null;
    onSwitchPage: (page: string) => void;
    onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PO: React.FC<POProps> = ({ poCustomers, customers, items, invoices, onAddPOCustomer, onUpdatePOCustomer, onDeletePOCustomer, onAddCustomer, currentUser, onSwitchPage, onNotification }) => {
    const [modalCustomer, setModalCustomer] = useState<POCustomer | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [globalSearchTerm, setGlobalSearchTerm] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<{ [id: string]: string }>({});
    const [showSearch, setShowSearch] = useState<{ [id: string]: boolean }>({});
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    
    // Local state for unsaved edits
    const [editStates, setEditStates] = useState<{ [id: string]: POCustomer }>({});
    const [editingRowIds, setEditingRowIds] = useState<Set<string>>(new Set());
    const [isAdding, setIsAdding] = useState(false);

    // Refs for auto-focus management
    const inputRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    // Auto-advance logic
    const focusNext = (id: string, nextField: string) => {
        setTimeout(() => {
            const el = inputRefs.current[`${id}-${nextField}`];
            if (el) {
                el.focus();
                // If it's a select, focusing is the best we can do. 
                // Browsers don't support opening native selects programmatically.
            }
        }, 50);
    };

    // Auto-focus the new PO's Type field when added
    useEffect(() => {
        const newUnsaved = poCustomers.find(c => c.isUnsaved);
        if (newUnsaved) {
            // Focus the first field - detect if mobile or desktop
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            focusNext(newUnsaved.id, isMobile ? 'mobile-type' : 'type');
        }
    }, [poCustomers.length]);

    // Auto-deletion on unmount for incomplete/unsaved cards
    const poRef = useRef(poCustomers);
    const delRef = useRef(onDeletePOCustomer);
    
    useEffect(() => {
        poRef.current = poCustomers;
        delRef.current = onDeletePOCustomer;
    }, [poCustomers, onDeletePOCustomer]);

    useEffect(() => {
        return () => {
            // Find records that were never saved and delete them from DB
            poRef.current.forEach(customer => {
                if (customer.isUnsaved) {
                    delRef.current(customer.id);
                }
            });
        };
    }, []);

    const handleAddClick = async () => {
        if (isAdding) return;
        setIsAdding(true);
        console.log('PO: Add Customer clicked');
        try {
            await onAddPOCustomer();
        } finally {
            // Re-enable after a short delay to prevent double clicks regardless of sync speed
            setTimeout(() => setIsAdding(false), 1000);
        }
    };

    const getCustomerToDisplay = (id: string) => {
        return editStates[id] || poCustomers.find(c => c.id === id);
    };

    const processedCustomers = poCustomers.map(customer => {
        const currentData = getCustomerToDisplay(customer.id) || customer;
        
        // App.tsx passes poCustomersWithBalances, so these should be present
        // but we double check or fallback to internal calculation if needed
        const remQty = (customer as any).remainingQuantity ?? (customer.quantity || 0);
        const remTotal = (customer as any).remainingTotal ?? (customer.total || 0);
        
        // A PO is archived if its limits (qty or total) are exhausted
        const isArchived = ((customer.quantity || 0) > 0 && remQty <= 0) || ((customer.total || 0) > 0 && remTotal <= 0);
        
        const customerInvoices = invoices.filter(inv => inv.poCustomerId === customer.id);
        const hasInvoices = customerInvoices.length > 0;

        return {
            ...currentData,
            remainingQty: remQty,
            remainingTotal: remTotal,
            isArchived,
            hasInvoices
        };
    });

    const activeCustomers = processedCustomers.filter(c => !c.isArchived);
    const archivedCustomers = processedCustomers.filter(c => c.isArchived);
    
    const displayCustomers = useMemo(() => {
        const search = globalSearchTerm.toLowerCase();
        
        if (!showArchived) {
            if (!search) return activeCustomers;
            return activeCustomers.filter(c => 
                (c.customerName || '').toLowerCase().includes(search) || 
                (c.poNumber || '').toLowerCase().includes(search)
            );
        }

        let withDates = archivedCustomers.map(customer => {
            let poDate: Date = new Date();
            const idNum = Number(customer.id);
            if (!isNaN(idNum) && idNum > 1000000000000) {
                poDate = new Date(idNum);
            } else {
                const customerInvoices = invoices.filter(inv => inv.poCustomerId === customer.id);
                if (customerInvoices.length > 0) {
                    poDate = new Date(Math.max(...customerInvoices.map(inv => inv.date.getTime())));
                }
            }
            return {
                ...customer,
                poDate,
                monthStr: `${poDate.getFullYear()}-${String(poDate.getMonth() + 1).padStart(2, '0')}`
            };
        });

        if (search) {
            withDates = withDates.filter(c => 
                (c.customerName || '').toLowerCase().includes(search) || 
                (c.poNumber || '').toLowerCase().includes(search)
            );
        }

        const cash = withDates.filter(c => c.type === 'cash');
        const credit = withDates.filter(c => c.type === 'credit');

        const buildList = (list: any[], title: string) => {
             if (list.length === 0) return [];
             
             list.sort((a, b) => {
                 if (a.monthStr !== b.monthStr) return b.monthStr.localeCompare(a.monthStr);
                 if (a.customerName !== b.customerName) return (a.customerName || '').localeCompare(b.customerName || '');
                 return b.poDate.getTime() - a.poDate.getTime();
             });

             const finalItems: any[] = [];
             let currentMonth = '';
             list.forEach(c => {
                 if (c.monthStr !== currentMonth) {
                     currentMonth = c.monthStr;
                     const monthName = new Date(currentMonth + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' });
                     finalItems.push({
                         isHeader: true,
                         isMainHeader: finalItems.length === 0,
                         mainTitle: finalItems.length === 0 ? title : undefined,
                         id: `header-${title}-${currentMonth}`,
                         label: monthName
                     });
                 }
                 finalItems.push(c);
             });
             return finalItems;
        };

        const cashGroups = buildList(cash, 'Cash PO Archive');
        const creditGroups = buildList(credit, 'Credit PO Archive');

        return [...cashGroups, ...creditGroups];
    }, [showArchived, archivedCustomers, invoices, activeCustomers, globalSearchTerm]);

    const handleLocalUpdate = (id: string, field: keyof POCustomer, value: any) => {
        const baseCustomer = poCustomers.find(c => c.id === id);
        if (!baseCustomer) return;

        setEditStates(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || baseCustomer),
                [field]: value
            }
        }));
    };

    const handleSaveCustomer = (id: string) => {
        const customer = getCustomerToDisplay(id);
        if (!customer) return;

        // Validation - English messages as requested, collected into a list
        const errors = [];
        if (!customer.type) errors.push('- Type (Cash or Credit)');
        if (!customer.customerName?.trim()) errors.push('- Customer');
        if (customer.type === 'credit' && !customer.poNumber?.trim()) errors.push('- PO Number (Required for Credit)');
        if (!customer.itemName?.trim()) errors.push('- Item');
        
        const qty = Number(customer.quantity) || 0;
        const totalAmount = Number(customer.total) || 0;
        if (qty <= 0 && totalAmount <= 0) {
            errors.push('- Quantity or Total Amount (Must be greater than 0)');
        }

        // Check against usage to prevent negative balance
        const customerInvoices = invoices.filter(inv => inv.poCustomerId === id);
        const usedQty = customerInvoices.reduce((sum, inv) => sum + (Number(inv.quantity) || 0), 0);
        const usedTotal = customerInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        if (customer.quantity !== null && qty < usedQty) {
            errors.push(`- New Quantity (${qty}) is less than used quantity (${usedQty}). Balance cannot be negative.`);
        }
        if (customer.total !== null && totalAmount < usedTotal) {
            errors.push(`- New Total (${totalAmount.toFixed(2)}) is less than already invoiced amount (${usedTotal.toFixed(2)}). Balance cannot be negative.`);
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        // AUTOMATIC SAVING OF CASH CUSTOMER
        if (customer.type === 'cash' && customer.customerName) {
            const exists = customers.some(c => 
                c.name.trim().toLowerCase() === customer.customerName.trim().toLowerCase() && 
                (c.type === 'cash' || !c.type)
            );
            if (!exists) {
                // Generate a customer number for the cash customer index
                const cashCount = customers.filter(c => c.type === 'cash').length;
                const nextNum = (cashCount + 1).toString().padStart(3, '0');
                
                onAddCustomer({
                    name: customer.customerName.trim(),
                    customerNumber: customer.customerNumber || `CSH-${nextNum}`,
                    type: 'cash'
                });
            }
        }

        // Clear the isUnsaved flag on successful save
        onUpdatePOCustomer(id, { ...customer, isUnsaved: false });
        
        // Remove from edit states after successful save trigger
        setEditStates(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });

        // Exit edit mode
        setEditingRowIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const toggleEditMode = (id: string) => {
        setEditingRowIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                // Also clear local edits if canceling?
                // The current design keeps them in editStates until saved.
                // For simplicity, we just toggle UI enabled/disabled.
            } else {
                next.add(id);
                // Focus the first field - detect if mobile or desktop
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                focusNext(id, isMobile ? 'mobile-type' : 'type');
            }
            return next;
        });
    };

    const handleSelectCustomer = (poCustomerId: string, selectedCustomer: Customer) => {
        handleLocalUpdate(poCustomerId, 'customerName', selectedCustomer.name);
        handleLocalUpdate(poCustomerId, 'customerNumber', selectedCustomer.customerNumber);
        
        setSearchTerm(prev => ({ ...prev, [poCustomerId]: selectedCustomer.name }));
        setShowSearch(prev => ({ ...prev, [poCustomerId]: false }));

        // Advance to Item
        focusNext(poCustomerId, 'itemName');
    };

    const handleRenewPO = async (customer: POCustomer) => {
        await onAddPOCustomer({
            customerNumber: customer.customerNumber,
            customerName: customer.customerName,
            type: customer.type,
            itemName: customer.itemName,
            alertThreshold: customer.alertThreshold
        });
        setShowArchived(false); // switch back to active tab
    };

    const handleMenuClick = (type: string, customer: POCustomer) => {
        setModalCustomer(customer);
    };

    const handlePrintModal = () => {
        if (!modalCustomer) return;

        const totalQty = modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalAmount = modalInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const remQty = (modalCustomer as any).remainingQuantity ?? (modalCustomer.quantity - totalQty);
        const remTotal = (modalCustomer as any).remainingTotal ?? (modalCustomer.total - totalAmount);

        const showQtyCol = modalCustomer.quantity > 0;
        const showAmountCol = modalCustomer.total > 0;

        const html = `
            <html>
                <head>
                    <title>${modalCustomer.customerName} - ${modalCustomer.poNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                        h1 { font-size: 18px; text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; font-size: 11px; }
                        th { background-color: #f8f9fa; font-weight: bold; }
                        .total-row { font-weight: bold; background-color: #f1f5f9; }
                        .po-row { font-weight: bold; background-color: #eff6ff; color: #1e40af; }
                        .balance-row { font-weight: bold; background-color: #ecfdf5; color: #065f46; }
                        .negative { color: #dc2626; }
                        .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #666; }
                        @media print {
                            body { padding: 0; }
                            @page { margin: 1cm; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${modalCustomer.customerName}</h1>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%">Date</th>
                                <th style="width: 15%">PO NO.</th>
                                <th style="width: 15%">Item</th>
                                <th style="width: 15%">Invoice No.</th>
                                ${showQtyCol ? '<th style="width: 15%">Quantity</th>' : ''}
                                ${showAmountCol ? '<th style="width: 15%">Total</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${modalInvoices.map(inv => `
                                <tr>
                                    <td>${new Date(inv.date).toLocaleDateString('en-GB')} ${new Date(inv.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>${modalCustomer.poNumber || 'N/A'}</td>
                                    <td>${modalCustomer.itemName}</td>
                                    <td>${inv.invoiceNumber}</td>
                                    ${showQtyCol ? `<td>${inv.quantity}</td>` : ''}
                                    ${showAmountCol ? `<td>${inv.total.toFixed(2)}</td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="4" style="text-align: right;">Total Invoiced:</td>
                                ${showQtyCol ? `<td>${totalQty}</td>` : ''}
                                ${showAmountCol ? `<td>${totalAmount.toFixed(2)}</td>` : ''}
                            </tr>
                            <tr class="po-row">
                                <td colspan="4" style="text-align: right;">Initial PO Amount:</td>
                                ${showQtyCol ? `<td>${modalCustomer.quantity}</td>` : ''}
                                ${showAmountCol ? `<td>${modalCustomer.total.toFixed(2)}</td>` : ''}
                            </tr>
                            <tr class="balance-row">
                                <td colspan="4" style="text-align: right;">Remaining Balance:</td>
                                ${showQtyCol ? `<td class="${remQty <= 0 ? 'negative' : ''}">${remQty}</td>` : ''}
                                ${showAmountCol ? `<td class="${remTotal <= 0 ? 'negative' : ''}">${remTotal.toFixed(2)}</td>` : ''}
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer">
                        Generated on ${new Date().toLocaleString('en-GB')}
                    </div>
                </body>
            </html>
        `;

        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();

            // Wait for content to load then print
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                
                // Remove iframe after printing dialog closes
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 500);
            }, 500);
        }
    };

    const closeModal = () => {
        setModalCustomer(null);
    };

    const modalInvoices = modalCustomer 
        ? invoices.filter(inv => inv.poCustomerId === modalCustomer.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];

    const handleExportPdfModal = () => {
        if (!modalCustomer || modalInvoices.length === 0) return;
        const doc = new jsPDF('landscape');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text(`${modalCustomer.customerName}`, 14, 20);

        const showQtyCol = modalCustomer.quantity > 0;
        const showAmountCol = modalCustomer.total > 0;

        const tableBody = modalInvoices.map(inv => {
            const row = [
                `${new Date(inv.date).toLocaleDateString('en-GB')} ${new Date(inv.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                modalCustomer.poNumber || 'N/A',
                modalCustomer.itemName,
                inv.invoiceNumber
            ];
            if (showQtyCol) row.push(inv.quantity.toString());
            if (showAmountCol) row.push(inv.total.toFixed(2));
            return row;
        });

        const totalQty = modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalAmount = modalInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const remQty = (modalCustomer as any).remainingQuantity ?? (modalCustomer.quantity - totalQty);
        const remTotal = (modalCustomer as any).remainingTotal ?? (modalCustomer.total - totalAmount);

        const footerRowInvoiced = ['Total Invoiced:', '', '', ''];
        if (showQtyCol) footerRowInvoiced.push(totalQty.toString());
        if (showAmountCol) footerRowInvoiced.push(totalAmount.toFixed(2));
        tableBody.push(footerRowInvoiced);

        const footerRowPO = ['Initial PO Amount:', '', '', ''];
        if (showQtyCol) footerRowPO.push(modalCustomer.quantity.toString());
        if (showAmountCol) footerRowPO.push(modalCustomer.total.toFixed(2));
        tableBody.push(footerRowPO);

        const footerRowBalance = ['Remaining Balance:', '', '', ''];
        if (showQtyCol) footerRowBalance.push(remQty.toString());
        if (showAmountCol) footerRowBalance.push(remTotal.toFixed(2));
        tableBody.push(footerRowBalance);

        const head = ['Date', 'PO NO.', 'Item', 'Invoice No.'];
        if (showQtyCol) head.push('Quantity');
        if (showAmountCol) head.push('Total');

        autoTable(doc, {
            startY: 30,
            head: [head],
            body: tableBody,
            headStyles: { fillColor: [41, 128, 185] },
            didParseCell: function(data) {
                if (data.row.index >= tableBody.length - 3) {
                    data.cell.styles.fontStyle = 'bold';
                    if (data.row.index === tableBody.length - 1) {
                        data.cell.styles.textColor = [0, 128, 0];
                        if (remTotal <= 0 || remQty <= 0) {
                            data.cell.styles.textColor = [255, 0, 0];
                        }
                    } else if (data.row.index === tableBody.length - 2) {
                        data.cell.styles.textColor = [0, 0, 255];
                    }
                }
            }
        });

        doc.save(`PO-${modalCustomer.poNumber}-Invoices.pdf`);
    };

    const handleExportExcelModal = async () => {
        if (!modalCustomer || modalInvoices.length === 0) return;
        const ExcelJS = (window as any).ExcelJS;
        if (!ExcelJS) {
            alert('ExcelJS not loaded. Please try again.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('PO Invoices', { views: [{ rightToLeft: false }] });
        
        const showQtyCol = modalCustomer.quantity > 0;
        const showAmountCol = modalCustomer.total > 0;

        const columns = [
            { header: 'Date', key: 'date', width: 25 },
            { header: 'PO NO.', key: 'poNumber', width: 15 },
            { header: 'Item', key: 'itemName', width: 15 },
            { header: 'Invoice No.', key: 'invoiceNumber', width: 15 }
        ];
        if (showQtyCol) columns.push({ header: 'Quantity', key: 'quantity', width: 15 });
        if (showAmountCol) columns.push({ header: 'Total', key: 'total', width: 15 });

        sheet.columns = columns;

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { horizontal: 'center' };

        modalInvoices.forEach(inv => {
            const rowData: any = {
                date: `${new Date(inv.date).toLocaleDateString('en-GB')} ${new Date(inv.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                poNumber: modalCustomer.poNumber || 'N/A',
                itemName: modalCustomer.itemName,
                invoiceNumber: inv.invoiceNumber
            };
            if (showQtyCol) rowData.quantity = inv.quantity;
            if (showAmountCol) rowData.total = inv.total;
            
            const row = sheet.addRow(rowData);
            if (showQtyCol) row.getCell('quantity').numFmt = '#,##0.00';
            if (showAmountCol) row.getCell('total').numFmt = '#,##0.00';
        });

        const totalQty = modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalAmount = modalInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const remQty = (modalCustomer as any).remainingQuantity ?? (modalCustomer.quantity - totalQty);
        const remTotal = (modalCustomer as any).remainingTotal ?? (modalCustomer.total - totalAmount);

        const invoicedRowData: any = { date: 'Total Invoiced:', poNumber: '', itemName: '', invoiceNumber: '' };
        if (showQtyCol) invoicedRowData.quantity = totalQty;
        if (showAmountCol) invoicedRowData.total = totalAmount;
        const invoicedRow = sheet.addRow(invoicedRowData);
        invoicedRow.font = { bold: true };
        invoicedRow.getCell('date').alignment = { horizontal: 'right' };
        if (showQtyCol) invoicedRow.getCell('quantity').numFmt = '#,##0.00';
        if (showAmountCol) invoicedRow.getCell('total').numFmt = '#,##0.00';

        const poRowData: any = { date: 'Initial PO Amount:', poNumber: '', itemName: '', invoiceNumber: '' };
        if (showQtyCol) poRowData.quantity = modalCustomer.quantity;
        if (showAmountCol) poRowData.total = modalCustomer.total;
        const poRow = sheet.addRow(poRowData);
        poRow.font = { bold: true, color: { argb: 'FF0000FF' } };
        poRow.getCell('date').alignment = { horizontal: 'right' };
        if (showQtyCol) poRow.getCell('quantity').numFmt = '#,##0.00';
        if (showAmountCol) poRow.getCell('total').numFmt = '#,##0.00';

        const balanceRowData: any = { date: 'Remaining Balance:', poNumber: '', itemName: '', invoiceNumber: '' };
        if (showQtyCol) balanceRowData.quantity = remQty;
        if (showAmountCol) balanceRowData.total = remTotal;
        const balanceRow = sheet.addRow(balanceRowData);
        balanceRow.font = { bold: true, color: { argb: remTotal <= 0 ? 'FFFF0000' : 'FF008000' } };
        balanceRow.getCell('date').alignment = { horizontal: 'right' };
        if (showQtyCol) balanceRow.getCell('quantity').numFmt = '#,##0.00';
        if (showAmountCol) balanceRow.getCell('total').numFmt = '#,##0.00';

        workbook.xlsx.writeBuffer().then(async (buffer: ArrayBuffer) => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PO-${modalCustomer.poNumber}-Invoices.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        });
    };

    return (
        <div className="px-2 pt-2 pb-8 sm:px-6 lg:px-8">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #po-modal, #po-modal * {
                        visibility: visible;
                    }
                    #po-modal {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="bg-white rounded-lg shadow-md mb-2 flex flex-col items-center justify-between gap-1 no-print relative z-10 sticky top-0 md:top-[160px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] py-1.5 px-4 bg-white z-20">
                    <div className="flex flex-col md:flex-row items-center justify-between w-full no-print gap-2 md:gap-4">
                        <div className="flex flex-col w-full md:flex-1 text-center md:text-left">
                            <h2 className="text-base sm:text-lg font-black text-rose-600 leading-tight">
                                {showArchived ? 'Archive Data' : 'Active PO Data'}
                            </h2>
                            <p className="text-[10px] sm:text-xs font-semibold text-rose-400 leading-tight">Purchase Orders Management</p>
                        </div>
                        <div className="hidden md:block md:flex-1"></div>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 w-full md:flex-1 no-print">
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={globalSearchTerm}
                                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                                    placeholder="Search by name or PO..."
                                    className="h-[34px] pl-8 pr-3 border border-gray-300 rounded-lg text-xs font-bold w-[160px] focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none placeholder-gray-400"
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowArchived(!showArchived)}
                                className={`h-[34px] px-3 border rounded-lg text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 min-w-[80px] ${showArchived ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {showArchived ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        Archive
                                    </>
                                )}
                            </button>
                            {(!showArchived && currentUser?.permissions.canCreatePO) && (
                                <button 
                                    type="button"
                                    onClick={handleAddClick}
                                    disabled={isAdding}
                                    className={`h-[34px] px-3 bg-green-600 text-white font-black rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs transition-all flex items-center justify-center gap-1.5 min-w-[70px] ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isAdding ? (
                                        '...'
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                            Add
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`hidden md:block overflow-visible no-print relative ${Object.values(showSearch).some(v => v) ? 'z-[1001]' : 'z-10'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="w-[180px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-x border-gray-200">
                                    Type
                                </th>
                                <th scope="col" className="w-[300px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-x border-gray-200">
                                    Customer Name
                                </th>
                                <th scope="col" className="w-[240px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-x border-gray-200">
                                    Item
                                </th>
                                <th scope="col" className="w-[210px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-x border-gray-200">
                                    PO
                                </th>
                                <th scope="col" className="w-[180px] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-x border-gray-200">
                                    Quantity
                                </th>
                                <th scope="col" className="w-[180px] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-x border-gray-200">
                                    Total
                                </th>
                                <th scope="col" className="w-[220px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-x border-gray-200">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {displayCustomers.map((customer) => {
                                if ((customer as any).isHeader) {
                                    return (
                                        <React.Fragment key={(customer as any).id}>
                                            {(customer as any).isMainHeader && (
                                                <tr>
                                                    <td colSpan={7} className="bg-slate-700 border-x border-slate-700 text-white font-black p-3 text-center text-base uppercase tracking-wider">
                                                        {(customer as any).mainTitle}
                                                    </td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td colSpan={7} className="bg-indigo-50 border-x border-indigo-100 text-indigo-900 font-bold p-2 text-center text-sm uppercase">
                                                    {(customer as any).label}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                }

                                const hasInvoices = customer.hasInvoices;
                                const remainingQty = customer.remainingQty;
                                const remainingTotal = customer.remainingTotal;

                                 return (
                                 <tr key={customer.id} className={customer.isArchived ? 'bg-gray-50' : ''}>
                                    <td className="p-0 border-x border-gray-200">
                                        <select
                                            ref={(el) => { inputRefs.current[`${customer.id}-type`] = el; }}
                                            value={customer.type || ''}
                                            disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                            onChange={(e) => {
                                                handleLocalUpdate(customer.id, 'type', e.target.value);
                                                if (e.target.value) focusNext(customer.id, 'customerName');
                                            }}
                                            className="w-full h-full min-h-[60px] border-none focus:ring-0 focus:outline-none text-xs font-bold py-2 px-3 bg-transparent cursor-pointer disabled:bg-gray-50 disabled:cursor-default"
                                        >
                                            <option value="">-- Type --</option>
                                            <option value="cash">Cash</option>
                                            <option value="credit">Credit</option>
                                        </select>
                                    </td>
                                    <td className="p-0 border-x border-gray-200 relative group/search">
                                        <div className="flex items-center h-full">
                                                <input 
                                                    ref={(el) => { inputRefs.current[`${customer.id}-customerName`] = el; }}
                                                    type="text" 
                                                    value={searchTerm[customer.id] !== undefined ? searchTerm[customer.id] : (customer.customerName || '')} 
                                                    disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSearchTerm(prev => ({ ...prev, [customer.id]: val }));
                                                        setShowSearch(prev => ({ ...prev, [customer.id]: true }));
                                                        handleLocalUpdate(customer.id, 'customerName', val);
                                                    }}
                                                    onFocus={() => currentUser?.permissions.canEditPO && (editingRowIds.has(customer.id) || customer.isUnsaved) && setShowSearch(prev => ({ ...prev, [customer.id]: true }))}
                                                    onBlur={() => {
                                                        // Delay hiding to allow click on result
                                                        setTimeout(() => setShowSearch(prev => ({ ...prev, [customer.id]: false })), 200);
                                                    }}
                                                    className="w-full h-full min-h-[60px] border-none focus:ring-0 focus:outline-none text-sm font-black py-2 px-3 text-amber-600 bg-transparent disabled:text-gray-400"
                                                    placeholder="Search name..."
                                                />
                                            </div>
                                            {showSearch[customer.id] && (
                                                <div className="absolute z-[9999] w-full top-full mt-0 bg-white border border-gray-200 rounded-md shadow-2xl max-h-96 overflow-y-auto left-0">
                                                    {customers
                                                        .filter(c => {
                                                            const search = (searchTerm[customer.id] || '').toLowerCase();
                                                            const matchesSearch = c.name.toLowerCase().includes(search) || 
                                                                                 c.customerNumber.toLowerCase().includes(search);
                                                            
                                                            // Filter based on PO type
                                                            const customerType = c.type || 'credit';
                                                            const matchesType = !customer.type || customerType === customer.type;
                                                            
                                                            return matchesSearch && matchesType;
                                                        })
                                                        .slice(0, 100)
                                                        .map(c => (
                                                            <div 
                                                                key={c.id} 
                                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleSelectCustomer(customer.id, c);
                                                                }}
                                                            >
                                                                <div className="font-bold text-gray-800">{c.name}</div>
                                                                <div className="text-xs text-gray-500">{c.customerNumber}</div>
                                                            </div>
                                                        ))
                                                    }
                                                    {customers.filter(c => {
                                                        const search = (searchTerm[customer.id] || '').toLowerCase();
                                                        return c.name.toLowerCase().includes(search) || 
                                                               c.customerNumber.toLowerCase().includes(search);
                                                    }).length === 0 && (
                                                        <div className="px-4 py-3 text-center text-gray-400 text-sm">
                                                            No customers found
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                    </td>
                                    <td className="p-0 whitespace-nowrap border-x border-gray-200">
                                        <select
                                            ref={(el) => { inputRefs.current[`${customer.id}-itemName`] = el; }}
                                            value={customer.itemName || ''}
                                            disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                            onChange={(e) => {
                                                handleLocalUpdate(customer.id, 'itemName', e.target.value);
                                                if (e.target.value) {
                                                    if (customer.type === 'credit') {
                                                        focusNext(customer.id, 'poNumber');
                                                    } else {
                                                        focusNext(customer.id, 'quantity');
                                                    }
                                                }
                                            }}
                                            className="w-full h-full min-h-[60px] border-none focus:ring-0 focus:outline-none text-sm font-bold py-2 px-3 bg-transparent text-purple-700 cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-default"
                                        >
                                            <option value="">Select Item</option>
                                            {items.map(item => (
                                                <option key={item.id} value={item.name}>{item.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-0 whitespace-nowrap border-x border-gray-200">
                                        <div className="flex items-center h-full">
                                            {customer.type !== 'cash' ? (
                                                <input 
                                                    ref={(el) => { inputRefs.current[`${customer.id}-poNumber`] = el; }}
                                                    type="text" 
                                                    value={customer.poNumber || ''} 
                                                    disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                    onChange={(e) => handleLocalUpdate(customer.id, 'poNumber', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') focusNext(customer.id, 'quantity');
                                                    }}
                                                    className="w-full h-full min-h-[60px] border-none focus:ring-0 focus:outline-none text-sm font-black py-2 px-3 text-blue-700 bg-transparent disabled:text-gray-400"
                                                />
                                            ) : (
                                                <div className="w-full h-full min-h-[60px] flex items-center justify-center text-gray-400 italic text-xs bg-gray-100">N/A (Cash)</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-0 whitespace-nowrap border-x border-gray-200">
                                        <div className="flex flex-col h-full min-h-[60px] relative z-10 w-full overflow-hidden">
                                            <div className="flex items-center border-b border-gray-100 flex-1 hover:bg-gray-50 group">
                                                <span className="text-[9px] text-gray-500 font-bold uppercase w-[45px] px-2">Initial:</span>
                                                <input 
                                                    ref={(el) => { inputRefs.current[`${customer.id}-quantity`] = el; }}
                                                    type="number" 
                                                    value={customer.quantity ?? ''} 
                                                    disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                    onChange={(e) => handleLocalUpdate(customer.id, 'quantity', e.target.value === '' ? null : Number(e.target.value))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') focusNext(customer.id, 'alertThreshold');
                                                    }}
                                                    className={`flex-1 min-w-0 border-none focus:ring-0 focus:outline-none px-2 py-1.5 text-sm font-black ${hasInvoices || !currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved) ? 'text-gray-400' : 'text-emerald-700'} bg-transparent`}
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                />
                                            </div>
                                            <div className="flex items-center border-b border-gray-100 flex-1 hover:bg-gray-50 group">
                                                <span className="text-[9px] text-orange-500 font-bold uppercase w-[45px] px-2" title="Alert low quantity limit">Alert:</span>
                                                <input 
                                                    ref={(el) => { inputRefs.current[`${customer.id}-alertThreshold`] = el; }}
                                                    type="number" 
                                                    value={customer.alertThreshold ?? 0} 
                                                    disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                    onChange={(e) => handleLocalUpdate(customer.id, 'alertThreshold', Number(e.target.value))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') focusNext(customer.id, 'total');
                                                    }}
                                                    className={`flex-1 min-w-0 border-none focus:ring-0 focus:outline-none px-2 py-1.5 text-sm font-black ${!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved) ? 'text-gray-400' : 'text-orange-900'} bg-transparent`}
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                />
                                            </div>
                                            {customer.quantity > 0 && (
                                                <div className="flex items-center bg-gray-50 flex-1">
                                                    <span className="text-[9px] text-gray-600 font-bold uppercase w-[45px] px-2">Balance:</span>
                                                    <span className={`text-[13px] font-black px-2 ${remainingQty <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                        {remainingQty}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-0 whitespace-nowrap border-x border-gray-200">
                                        <div className="flex flex-col h-full min-h-[60px] relative z-10 w-full overflow-hidden">
                                            <div className="flex items-center border-b border-gray-100 flex-1 hover:bg-gray-50 group">
                                                <span className="text-[9px] text-gray-500 font-bold uppercase w-[45px] px-2">Initial:</span>
                                                <input 
                                                    ref={(el) => { inputRefs.current[`${customer.id}-total`] = el; }}
                                                    type="number" 
                                                    value={customer.total ?? ''} 
                                                    disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                    onChange={(e) => handleLocalUpdate(customer.id, 'total', e.target.value === '' ? null : Number(e.target.value))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') focusNext(customer.id, 'saveButton');
                                                    }}
                                                    className={`flex-1 min-w-0 border-none focus:ring-0 focus:outline-none px-2 py-1.5 text-sm font-black ${!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved) ? 'text-gray-400' : 'text-blue-700'} bg-transparent`}
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                />
                                            </div>
                                            {customer.total > 0 && (
                                                <div className="flex items-center bg-blue-50 flex-1">
                                                    <span className="text-[9px] text-gray-600 font-bold uppercase w-[45px] px-2">Balance:</span>
                                                    <span className={`text-[13px] font-black px-2 ${remainingTotal <= 0 ? 'text-red-600' : 'text-blue-700'}`}>
                                                        {remainingTotal.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium border-x border-gray-200">
                                            <div className="flex flex-col items-center gap-2">
                                            {customer.isArchived && currentUser?.permissions.canEditPO && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRenewPO(customer)}
                                                    className="w-full px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 font-bold text-xs transition-colors"
                                                >
                                                    Renew PO
                                                </button>
                                            )}
                                            <div className="flex items-center justify-center gap-4">
                                                {currentUser?.permissions.canEditPO && !editingRowIds.has(customer.id) && !customer.isUnsaved && !customer.isArchived && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => toggleEditMode(customer.id)}
                                                        className="flex items-center gap-1 text-amber-600 hover:text-amber-900 focus:outline-none font-bold text-xs underline decoration-amber-200 hover:decoration-amber-600 underline-offset-4 rounded p-1"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {(editStates[customer.id] || customer.isUnsaved) && (
                                                    <button 
                                                        ref={(el) => { inputRefs.current[`${customer.id}-saveButton`] = el; }}
                                                        type="button"
                                                        onClick={() => handleSaveCustomer(customer.id)}
                                                        className="flex items-center gap-1 text-green-600 hover:text-green-900 focus:outline-none font-bold text-xs underline decoration-green-200 hover:decoration-green-600 underline-offset-4 focus:ring-2 focus:ring-green-500 rounded p-1"
                                                    >
                                                        <Save className="w-3 h-3" />
                                                        Save
                                                    </button>
                                                )}
                                                {editingRowIds.has(customer.id) && !customer.isUnsaved && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => toggleEditMode(customer.id)}
                                                        className="flex items-center gap-1 text-gray-500 hover:text-gray-800 focus:outline-none font-bold text-xs underline decoration-gray-200 hover:decoration-gray-600 underline-offset-4 rounded p-1"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                <button 
                                                    type="button"
                                                    className="text-blue-600 hover:text-blue-900 focus:outline-none font-bold text-xs underline decoration-blue-200 hover:decoration-blue-600 underline-offset-4"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMenuClick('History', customer);
                                                    }}
                                                >
                                                    History
                                                </button>
                                                {currentUser?.permissions.canDeletePO && (!hasInvoices || customer.isArchived || currentUser?.permissions.canForceDeletePO) && (
                                                    confirmDeleteId === customer.id ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[10px] text-red-600 font-bold mb-1">Confirm delete?</span>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    type="button"
                                                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold"
                                                                    onClick={(e) => { e.stopPropagation(); onDeletePOCustomer(customer.id); setConfirmDeleteId(null); }}
                                                                >
                                                                    Yes
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-bold"
                                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                                                >
                                                                    No
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            type="button"
                                                            className="text-red-600 hover:text-red-900 focus:outline-none font-bold text-xs underline decoration-red-200 hover:decoration-red-600 underline-offset-4"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteId(customer.id);
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {displayCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        {showArchived ? 'No archived customers.' : 'No active customers.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile view for PO Data */}
                <div className={`md:hidden space-y-4 no-print overflow-visible text-right relative ${Object.values(showSearch).some(v => v) ? 'z-[1001]' : 'z-10'}`} dir="rtl">
                    {displayCustomers.map((customer) => {
                        if ((customer as any).isHeader) {
                            return (
                                <React.Fragment key={(customer as any).id}>
                                    {(customer as any).isMainHeader && (
                                        <div className="bg-slate-700 text-white font-black p-3 text-center text-lg uppercase tracking-wider rounded-lg shadow-sm">
                                            {(customer as any).mainTitle}
                                        </div>
                                    )}
                                    <div className="bg-indigo-50 text-indigo-900 font-bold p-2 text-center text-sm uppercase rounded shadow-sm border border-indigo-100">
                                        {(customer as any).label}
                                    </div>
                                </React.Fragment>
                            );
                        }

                        const hasInvoices = customer.hasInvoices;
                        const remainingQty = customer.remainingQty;
                        const remainingTotal = customer.remainingTotal;

                        return (
                            <div key={customer.id} className={`p-4 border rounded-lg shadow-sm ${customer.isArchived ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100'}`}>
                                <div className="flex justify-between items-start gap-4 mb-4 relative z-[100] group/search">
                                    <div className="flex flex-col w-24 flex-shrink-0">
                                        <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Type</span>
                                        <select
                                            ref={(el) => { inputRefs.current[`${customer.id}-mobile-type`] = el; }}
                                            value={customer.type || ''}
                                            disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                            onChange={(e) => {
                                                handleLocalUpdate(customer.id, 'type', e.target.value);
                                                if (e.target.value) focusNext(customer.id, 'mobile-customerName');
                                            }}
                                            className="w-full font-bold text-gray-800 border-none p-2 focus:ring-0 text-sm bg-transparent disabled:opacity-50"
                                        >
                                            <option value="">Type</option>
                                            <option value="cash">Cash</option>
                                            <option value="credit">Credit</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1 relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider">Customer</span>
                                        </div>
                                        <input 
                                            ref={(el) => { inputRefs.current[`${customer.id}-mobile-customerName`] = el; }}
                                            type="text" 
                                            value={searchTerm[customer.id] !== undefined ? searchTerm[customer.id] : (customer.customerName || '')} 
                                            disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSearchTerm(prev => ({ ...prev, [customer.id]: val }));
                                                setShowSearch(prev => ({ ...prev, [customer.id]: true }));
                                                handleLocalUpdate(customer.id, 'customerName', val);
                                            }}
                                            onFocus={() => currentUser?.permissions.canEditPO && (editingRowIds.has(customer.id) || customer.isUnsaved) && setShowSearch(prev => ({ ...prev, [customer.id]: true }))}
                                            onBlur={() => {
                                                setTimeout(() => setShowSearch(prev => ({ ...prev, [customer.id]: false })), 200);
                                            }}
                                            className="font-black text-gray-800 border-none p-2 focus:ring-0 text-lg w-full text-right bg-transparent disabled:text-gray-400"
                                            placeholder="Search Name..."
                                        />
                                        {showSearch[customer.id] && (
                                            <div className="absolute z-[9999] left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-md shadow-2xl max-h-96 overflow-y-auto">
                                                {customers
                                                    .filter(c => {
                                                        const search = (searchTerm[customer.id] || '').toLowerCase();
                                                        const matchesSearch = c.name.toLowerCase().includes(search) || 
                                                                             c.customerNumber.toLowerCase().includes(search);
                                                        
                                                        // Filter based on PO type for mobile too
                                                        const customerType = c.type || 'credit';
                                                        const matchesType = !customer.type || customerType === customer.type;
                                                        
                                                        return matchesSearch && matchesType;
                                                    })
                                                    .slice(0, 100)
                                                    .map(c => (
                                                        <div 
                                                            key={c.id} 
                                                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleSelectCustomer(customer.id, c);
                                                                // focusNext is handled inside handleSelectCustomer but it uses non-mobile keys
                                                                // We need to handle mobile jump here or unify keys
                                                                focusNext(customer.id, 'mobile-itemName');
                                                            }}
                                                        >
                                                            <div className="font-bold text-gray-800">{c.name}</div>
                                                            <div className="text-xs text-gray-500">{c.customerNumber}</div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                        <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">PO Number</span>
                                        {customer.type !== 'cash' ? (
                                            <input 
                                                ref={(el) => { inputRefs.current[`${customer.id}-mobile-poNumber`] = el; }}
                                                type="text" 
                                                value={customer.poNumber || ''} 
                                                disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                onChange={(e) => handleLocalUpdate(customer.id, 'poNumber', e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') focusNext(customer.id, 'mobile-quantity');
                                                }}
                                                className="font-bold text-blue-700 border-none p-2 focus:ring-0 text-base w-32 sm:w-40 text-center bg-transparent disabled:text-gray-400"
                                                placeholder="PO#"
                                            />
                                        ) : (
                                            <div className="w-32 sm:w-40 h-10 flex items-center justify-center text-gray-400 italic text-sm">N/A</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 block">Item</span>
                                    <select
                                        ref={(el) => { inputRefs.current[`${customer.id}-mobile-itemName`] = el; }}
                                        value={customer.itemName || ''}
                                        disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                        onChange={(e) => {
                                            handleLocalUpdate(customer.id, 'itemName', e.target.value);
                                            if (e.target.value) {
                                                if (customer.type === 'credit') focusNext(customer.id, 'mobile-poNumber');
                                                else focusNext(customer.id, 'mobile-quantity');
                                            }
                                        }}
                                        className="w-full font-bold text-gray-800 border-none p-2 focus:ring-0 text-base bg-transparent disabled:opacity-50"
                                    >
                                        <option value="">Select Item</option>
                                        {items.map(item => (
                                            <option key={item.id} value={item.name}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-100">
                                    <div className="flex flex-col bg-gray-50 p-3 rounded-lg border border-gray-200 gap-2">
                                        <div>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Quantity Initial</span>
                                            <input 
                                                ref={(el) => { inputRefs.current[`${customer.id}-mobile-quantity`] = el; }}
                                                type="number" 
                                                value={customer.quantity ?? ''} 
                                                disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                onChange={(e) => handleLocalUpdate(customer.id, 'quantity', e.target.value === '' ? null : Number(e.target.value))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') focusNext(customer.id, 'mobile-alertThreshold');
                                                }}
                                                className={`w-full bg-transparent border-none p-2 font-black text-lg sm:text-xl text-center focus:ring-0 ${hasInvoices || !currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved) ? 'text-gray-400' : 'text-gray-900'}`}
                                                onClick={(e) => { e.stopPropagation(); }}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-orange-500 font-bold uppercase mb-1 block">Alert Limit</span>
                                            <input 
                                                ref={(el) => { inputRefs.current[`${customer.id}-mobile-alertThreshold`] = el; }}
                                                type="number" 
                                                value={customer.alertThreshold ?? 0} 
                                                disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                                onChange={(e) => handleLocalUpdate(customer.id, 'alertThreshold', Number(e.target.value))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') focusNext(customer.id, 'mobile-total');
                                                }}
                                                className="w-full bg-transparent text-orange-900 border-none p-2 font-black text-lg sm:text-xl text-center focus:ring-0 disabled:opacity-50"
                                                onClick={(e) => { e.stopPropagation(); }}
                                            />
                                        </div>
                                        {customer.quantity > 0 && (
                                            <div className="mt-1 pt-2 border-t border-gray-200">
                                                <span className="text-[9px] text-gray-400 uppercase block">Balance</span>
                                                <span className={`text-base font-black ${remainingQty <= 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                                                    {remainingQty}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-2">Total Initial</span>
                                        <input 
                                            ref={(el) => { inputRefs.current[`${customer.id}-mobile-total`] = el; }}
                                            type="number" 
                                            value={customer.total ?? ''} 
                                            disabled={!currentUser?.permissions.canEditPO || (!editingRowIds.has(customer.id) && !customer.isUnsaved)}
                                            onChange={(e) => handleLocalUpdate(customer.id, 'total', e.target.value === '' ? null : Number(e.target.value))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') focusNext(customer.id, 'mobile-saveButton');
                                            }}
                                            className="w-full bg-transparent border-none p-2 font-black text-lg sm:text-xl text-center focus:ring-0 text-gray-900 disabled:text-gray-400"
                                            onClick={(e) => { e.stopPropagation(); }}
                                        />
                                        {customer.total > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                                <span className="text-[9px] text-gray-400 uppercase block">Balance</span>
                                                <span className={`text-base font-black ${remainingTotal <= 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                                                    {remainingTotal.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                 <div className="flex justify-between items-center pt-2 gap-2">
                                     <div className="text-xs italic text-gray-400 text-left">
                                        {hasInvoices ? 'Locked (Has Invoices)' : 'Modifiable'}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {currentUser?.permissions.canEditPO && !editingRowIds.has(customer.id) && !customer.isUnsaved && !customer.isArchived && (
                                            <button 
                                                type="button"
                                                onClick={() => toggleEditMode(customer.id)}
                                                className="text-amber-600 text-sm font-bold px-3 py-1.5 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors border border-amber-100"
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {(editStates[customer.id] || customer.isUnsaved) && (
                                            <button 
                                                ref={(el) => { inputRefs.current[`${customer.id}-mobile-saveButton`] = el; }}
                                                type="button"
                                                onClick={() => handleSaveCustomer(customer.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm transition-colors shadow-sm focus:ring-2 focus:ring-green-500"
                                            >
                                                <Save className="w-4 h-4" />
                                                Save
                                            </button>
                                        )}
                                        {editingRowIds.has(customer.id) && !customer.isUnsaved && (
                                            <button 
                                                type="button"
                                                onClick={() => toggleEditMode(customer.id)}
                                                className="text-gray-500 text-sm font-bold px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button 
                                            type="button"
                                            className="text-blue-600 hover:text-blue-900 focus:outline-none font-bold text-xs underline decoration-blue-200 hover:decoration-blue-600 underline-offset-4"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMenuClick('History', customer);
                                            }}
                                        >
                                            History
                                        </button>
                                        {customer.isArchived && (
                                            <button 
                                                type="button"
                                                onClick={() => handleRenewPO(customer)}
                                                className="text-green-600 text-sm font-bold px-3 py-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-100"
                                            >
                                                Renew
                                            </button>
                                        )}
                                        {(!hasInvoices || customer.isArchived || currentUser?.permissions.canForceDeletePO) && (
                                            confirmDeleteId === customer.id ? (
                                                <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-lg border border-red-100">
                                                    <span className="text-xs font-bold text-red-600 px-1">Confirm?</span>
                                                    <button 
                                                        type="button"
                                                        className="px-3 py-1 bg-red-600 text-white rounded text-sm font-bold shadow-sm"
                                                        onClick={(e) => { e.stopPropagation(); onDeletePOCustomer(customer.id); setConfirmDeleteId(null); }}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        className="px-3 py-1 bg-white text-gray-700 rounded text-sm font-bold shadow-sm border border-gray-200"
                                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    type="button"
                                                    className="text-red-500 text-sm font-bold px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-50 active:bg-red-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDeleteId(customer.id);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {displayCustomers.length === 0 && (
                        <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            {showArchived ? 'No archived customers.' : 'No active customers.'}
                        </div>
                    )}
                </div>

            {/* Modal for Invoice History */}
            {modalCustomer && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-black bg-opacity-50">
                    <div className="relative w-full max-w-4xl mx-auto my-6 mt-24 p-4" id="po-modal">
                        <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg outline-none focus:outline-none">
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 border-b border-solid rounded-t border-blueGray-200">
                                <h3 className="text-2xl font-semibold text-gray-800">
                                    {modalCustomer.customerName} - {modalCustomer.poNumber}
                                </h3>
                                <div className="flex items-center space-x-2 no-print">
                                    <button
                                        className="p-2 text-green-600 bg-transparent border border-green-600 rounded hover:bg-green-50 focus:outline-none"
                                        onClick={handleExportExcelModal}
                                        title="Export to Excel"
                                    >
                                        <FileSpreadsheet className="w-5 h-5" />
                                    </button>
                                    <button
                                        className="p-2 text-red-600 bg-transparent border border-red-600 rounded hover:bg-red-50 focus:outline-none"
                                        onClick={handleExportPdfModal}
                                        title="Export to PDF"
                                    >
                                        <FileText className="w-5 h-5" />
                                    </button>
                                    <button
                                        className="p-2 text-blue-600 bg-transparent border border-blue-600 rounded hover:bg-blue-50 focus:outline-none"
                                        onClick={handlePrintModal}
                                        title="Print"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                    <button
                                        className="p-1 ml-auto text-black bg-transparent border-0 opacity-50 float-right text-3xl leading-none font-semibold outline-none focus:outline-none hover:opacity-100"
                                        onClick={closeModal}
                                    >
                                        <span className="text-black h-6 w-6 text-2xl block outline-none focus:outline-none">
                                            ×
                                        </span>
                                    </button>
                                </div>
                            </div>
                            {/* Body */}                            <div className="relative p-6 flex-auto max-h-[60vh] overflow-y-auto">
                                {modalInvoices.length > 0 ? (
                                    <>
                                        <div className="hidden sm:block overflow-x-auto font-sans">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">PO NO.</th>
                                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invoice No.</th>
                                                        {modalCustomer.quantity > 0 && <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quantity</th>}
                                                        {modalCustomer.total > 0 && <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {modalInvoices.map((inv, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                                                {new Date(inv.date).toLocaleDateString('en-GB')} {new Date(inv.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-blue-600 italic">
                                                                {modalCustomer.poNumber || 'N/A'}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-purple-700 font-semibold">
                                                                {modalCustomer.itemName}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{inv.invoiceNumber}</td>
                                                            {modalCustomer.quantity > 0 && <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-bold">{inv.quantity}</td>}
                                                            {modalCustomer.total > 0 && <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-bold">{inv.total.toFixed(2)}</td>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-2 whitespace-nowrap text-[10px] font-bold text-gray-500 text-right uppercase italic">Total Invoiced:</td>
                                                        {modalCustomer.quantity > 0 && <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900 border-x border-gray-200">{modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0)}</td>}
                                                        {modalCustomer.total > 0 && <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900 border-x border-gray-200">{modalInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}</td>}
                                                    </tr>
                                                    <tr className="bg-blue-50">
                                                        <td colSpan={4} className="px-4 py-2 whitespace-nowrap text-[10px] font-bold text-blue-600 text-right uppercase italic">Initial PO Amount:</td>
                                                        {modalCustomer.quantity > 0 && <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-blue-800 border-x border-gray-200">{modalCustomer.quantity}</td>}
                                                        {modalCustomer.total > 0 && <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-blue-800 border-x border-gray-200">{modalCustomer.total.toFixed(2)}</td>}
                                                    </tr>
                                                    <tr className="bg-emerald-50">
                                                        <td colSpan={4} className="px-4 py-4 whitespace-nowrap text-[10px] font-black text-emerald-600 text-right uppercase italic">Remaining Balance:</td>
                                                        {modalCustomer.quantity > 0 && (
                                                            <td className={`px-4 py-4 whitespace-nowrap text-lg font-black border-x border-gray-200 ${((modalCustomer as any).remainingQuantity ?? (modalCustomer.quantity - modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0))) <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                                {(modalCustomer as any).remainingQuantity ?? (modalCustomer.quantity - modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0))}
                                                            </td>
                                                        )}
                                                        {modalCustomer.total > 0 && (
                                                            <td className={`px-4 py-4 whitespace-nowrap text-lg font-black border-x border-gray-200 ${((modalCustomer as any).remainingTotal ?? (modalCustomer.total - modalInvoices.reduce((sum, inv) => sum + inv.total, 0))) <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                                {((modalCustomer as any).remainingTotal ?? (modalCustomer.total - modalInvoices.reduce((sum, inv) => sum + inv.total, 0))).toFixed(2)}
                                                            </td>
                                                        )}
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        {/* Mobile view for Invoice History */}
                                        <div className="sm:hidden space-y-3">
                                            {modalInvoices.map((inv, index) => (
                                                <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] text-gray-500 font-semibold mb-1">
                                                            {new Date(inv.date).toLocaleDateString('en-GB')} {new Date(inv.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                            INV: #{inv.invoiceNumber}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 border-dashed">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-gray-400 uppercase font-bold">PO No.</span>
                                                            <span className="text-xs font-bold text-blue-700 italic">{modalCustomer.poNumber || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] text-gray-400 uppercase font-bold">Item</span>
                                                            <span className="text-xs font-bold text-purple-700">{modalCustomer.itemName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        {modalCustomer.quantity > 0 && (
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Qty</span>
                                                                <span className="text-sm font-black text-gray-900">{inv.quantity}</span>
                                                            </div>
                                                        )}
                                                        {modalCustomer.total > 0 && (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[9px] text-gray-400 uppercase font-bold">Amount</span>
                                                                <span className="text-sm font-black text-emerald-700">{inv.total.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="mt-4 space-y-2">
                                                <div className="p-3 bg-gray-200 text-gray-800 rounded-lg shadow-sm">
                                                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider mb-1">
                                                        <span>{modalCustomer.quantity > 0 ? 'Total Invoiced Qty' : ''}</span>
                                                        <span>{modalCustomer.total > 0 ? 'Total Invoiced Amt' : ''}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-black">
                                                        <span>{modalCustomer.quantity > 0 ? modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0) : ''}</span>
                                                        <span>{modalCustomer.total > 0 ? modalInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2) : ''}</span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-blue-100 text-blue-800 rounded-lg shadow-sm border border-blue-200">
                                                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider mb-1">
                                                        <span>{modalCustomer.quantity > 0 ? 'Initial PO Qty' : ''}</span>
                                                        <span>{modalCustomer.total > 0 ? 'Initial PO Total' : ''}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-black">
                                                        <span>{modalCustomer.quantity > 0 ? modalCustomer.quantity : ''}</span>
                                                        <span>{modalCustomer.total > 0 ? modalCustomer.total.toFixed(2) : ''}</span>
                                                    </div>
                                                </div>
                                                <div className={`p-3 rounded-lg shadow-md border ${((modalCustomer as any).remainingTotal ?? (modalCustomer.total - modalInvoices.reduce((sum, inv) => sum + inv.total, 0))) <= 0 ? 'bg-red-600 text-white border-red-700' : 'bg-emerald-600 text-white border-emerald-700'}`}>
                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">
                                                        <span>{modalCustomer.quantity > 0 ? 'Rem. Qty' : ''}</span>
                                                        <span>{modalCustomer.total > 0 ? 'Rem. Balance' : ''}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-lg font-black">
                                                        <span>{modalCustomer.quantity > 0 ? ((modalCustomer as any).remainingQuantity ?? (modalCustomer.quantity - modalInvoices.reduce((sum, inv) => sum + inv.quantity, 0))) : ''}</span>
                                                        <span>{modalCustomer.total > 0 ? ((modalCustomer as any).remainingTotal ?? (modalCustomer.total - modalInvoices.reduce((sum, inv) => sum + inv.total, 0))).toFixed(2) : ''}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (

                                    <div className="text-center text-gray-500 py-4">
                                        No invoices recorded for this customer yet.
                                    </div>
                                )}
                            </div>
                            {/* Footer */}
                            <div className="flex items-center justify-end p-6 border-t border-solid rounded-b border-blueGray-200 no-print">
                                <button
                                    className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 relative hover:bg-red-50 rounded"
                                    type="button"
                                    onClick={closeModal}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {validationErrors.length > 0 && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl border-2 border-red-500 w-full max-w-sm overflow-hidden"
                            dir="ltr"
                        >
                            <div className="bg-red-500 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white">
                                    <AlertCircle className="w-5 h-5" />
                                    <h3 className="font-black text-sm uppercase tracking-wider">Incomplete Data</h3>
                                </div>
                                <button 
                                    onClick={() => setValidationErrors([])}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-6">
                                <p className="text-gray-600 text-sm font-bold mb-4 text-center">
                                    Please complete the following fields to save the PO:
                                </p>
                                <ul className="space-y-3">
                                    {validationErrors.map((err, idx) => (
                                        <motion.li 
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-center gap-3 text-red-700 bg-red-50 p-3 rounded-xl border border-red-100 shadow-sm"
                                        >
                                            <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                                            <span className="text-sm font-black text-left w-full">
                                                {err.startsWith('- ') ? err.substring(2) : err}
                                            </span>
                                        </motion.li>
                                    ))}
                                </ul>
                                
                                <button
                                    onClick={() => setValidationErrors([])}
                                    className="w-full mt-6 py-3 bg-red-500 text-white font-black rounded-xl shadow-lg hover:bg-red-600 active:scale-[0.98] transition-all text-sm uppercase tracking-widest"
                                >
                                    OK
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PO;
