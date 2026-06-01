
import React, { useState, useEffect, useRef } from 'react';
import { Item, Invoice, POCustomer, Branch } from '../types';
import CustomSelect from './ui/CustomSelect';
import CustomDatePicker from './ui/CustomDatePicker';

interface InvoiceFormProps {
    title: string;
    theme: 'cash' | 'credit';
    invoiceNumber: number;
    items: Item[];
    poCustomers?: POCustomer[];
    branches?: Branch[];
    branchName?: string;
    onAddInvoice: (invoice: Omit<Invoice, 'id' | 'date' | 'employeeId'>) => void;
    // New props for editing
    onUpdateInvoice?: (invoice: Invoice) => void;
    existingInvoices?: Invoice[];
    allInvoices?: Invoice[];
    editInvoice?: Invoice | null;
    canEdit?: boolean;
    canAdd?: boolean;
    canDelete?: boolean;
    canChangeDate?: boolean;
    onDeleteInvoice?: (id: string) => void;
    checkUniqueNumber?: (num: number, currentId?: string) => boolean;
    manualInvoiceNumber?: boolean;
    prefillData?: {
        customerName: string;
        item: string;
        quantity: number;
        totalWithTax: number;
        orderIds: string[];
    } | null;
    onPrefillCleared?: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
    title, 
    theme, 
    invoiceNumber, 
    items, 
    poCustomers = [],
    branches = [],
    branchName = '',
    onAddInvoice,
    onUpdateInvoice,
    existingInvoices = [],
    allInvoices = [],
    editInvoice = null,
    canEdit = false,
    canAdd = true,
    canDelete = false,
    canChangeDate = false,
    onDeleteInvoice,
    checkUniqueNumber,
    manualInvoiceNumber = false,
    prefillData = null,
    onPrefillCleared
}) => {
    const [isAutoNumber, setIsAutoNumber] = useState(() => {
        if (theme === 'cash') {
            return !manualInvoiceNumber;
        }
        const saved = localStorage.getItem(`isAutoNumber_${theme}`);
        return saved !== null ? JSON.parse(saved) : true;
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (theme === 'cash') {
            setIsAutoNumber(!manualInvoiceNumber);
        }
    }, [manualInvoiceNumber, theme]);

    const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<number>(() => {
        let isAuto = true;
        if (theme === 'cash') {
            isAuto = !manualInvoiceNumber;
        } else {
            const savedAuto = localStorage.getItem(`isAutoNumber_${theme}`);
            isAuto = savedAuto !== null ? JSON.parse(savedAuto) : true;
        }
        return isAuto ? invoiceNumber : NaN as any;
    });

    useEffect(() => {
        if (theme !== 'cash') {
            localStorage.setItem(`isAutoNumber_${theme}`, JSON.stringify(isAutoNumber));
        }
    }, [isAutoNumber, theme]);

    const [itemCodeInput, setItemCodeInput] = useState<string>('');
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [total, setTotal] = useState<string>('');
    const [editDate, setEditDate] = useState<string>('');
    const [selectedPOCustomerId, setSelectedPOCustomerId] = useState<string>('');
    const [loadedOrderIds, setLoadedOrderIds] = useState<string[]>([]);

    useEffect(() => {
        if (prefillData) {
            // Find POCustomer by name
            const foundPOCust = poCustomers.find(pc => 
                pc.customerName.toLowerCase().trim() === prefillData.customerName.toLowerCase().trim() ||
                pc.customerName.toLowerCase().includes(prefillData.customerName.toLowerCase()) ||
                prefillData.customerName.toLowerCase().includes(pc.customerName.toLowerCase())
            );
            if (foundPOCust) {
                setSelectedPOCustomerId(foundPOCust.id);
            } else {
                setSelectedPOCustomerId('');
            }

            // Find Item by name
            const foundItem = items.find(i => 
                i.name.toLowerCase().trim() === prefillData.item.toLowerCase().trim() ||
                i.name.toLowerCase().includes(prefillData.item.toLowerCase()) ||
                prefillData.item.toLowerCase().includes(i.name.toLowerCase())
            );
            if (foundItem) {
                setSelectedItemId(foundItem.id);
            } else {
                setSelectedItemId('');
            }

            setQuantity(prefillData.quantity.toString());
            setTotal(prefillData.totalWithTax.toFixed(2));
            setLoadedOrderIds(prefillData.orderIds);
            
            if (onPrefillCleared) {
                onPrefillCleared();
            }
        }
    }, [prefillData, poCustomers, items, onPrefillCleared]);
    
    // Search & Edit State
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [missingNumbers, setMissingNumbers] = useState<number[]>([]);
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [originalInvoiceData, setOriginalInvoiceData] = useState<Invoice | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const quantityRef = useRef<HTMLInputElement>(null);
    const totalRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const itemCodeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const item = items.find(i => i.id === selectedItemId);
        if (item && item.code) {
            setItemCodeInput(item.code);
        } else if (!selectedItemId || (item && item.id === 'cancel')) {
            setItemCodeInput('');
        }
    }, [selectedItemId, items]);

    useEffect(() => {
        if (!isEditing) {
            setCurrentInvoiceNumber(invoiceNumber);
        }
    }, [invoiceNumber, isEditing]);

    // Handle external edit trigger
    useEffect(() => {
        if (editInvoice) {
            setIsEditing(true);
            setEditingInvoiceId(editInvoice.id);
            setOriginalInvoiceData(editInvoice);
            setCurrentInvoiceNumber(editInvoice.invoiceNumber);
            
            const foundItem = items.find(i => i.name === editInvoice.itemName) || 
                              (editInvoice.itemName === 'Cancel' ? {id: 'cancel', name: 'Cancel'} : null);
            
            if (foundItem) {
                setSelectedItemId(foundItem.id);
            } else {
                setSelectedItemId('');
            }

            setQuantity(editInvoice.quantity.toString());
            setTotal(editInvoice.total.toString());
            
            const d = new Date(editInvoice.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setEditDate(`${yyyy}-${mm}-${dd}`);
            
            // Scroll to form
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (isEditing) {
            // If we were editing and now editInvoice is null (cleared by parent), reset local form fields
            cancelEdit();
        }
    }, [editInvoice, items]);

    const themeClasses = {
        cash: {
            accentText: 'text-blue-600',
            accentBorder: 'border-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            searchBorder: 'focus:border-blue-500 focus:ring-blue-500',
        },
        credit: {
            accentText: 'text-sky-600',
            accentBorder: 'border-sky-600',
            button: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500',
            searchBorder: 'focus:border-sky-500 focus:ring-sky-500',
        },
    };

    const currentTheme = themeClasses[theme];
    
    const handleCheckMissing = () => {
        const numbers = existingInvoices.map(inv => inv.invoiceNumber);
        if (numbers.length === 0) {
            setMissingNumbers([]);
            setShowMissingModal(true);
            return;
        }
        
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const missing = [];
        
        for (let i = min; i < max; i++) {
            if (!numbers.includes(i)) {
                missing.push(i);
            }
        }
        setMissingNumbers(missing);
        setShowMissingModal(true);
    };

    const handleSearchInput = (val: string) => {
        setSearchQuery(val);
        // Search is now available to all users

        const num = parseInt(val, 10);
        if (isNaN(num)) {
            if (val.trim() === '' && isEditing) {
                cancelEdit();
            }
            return;
        }

        // Try to find the invoice in all history
        const source = allInvoices.length > 0 ? allInvoices : existingInvoices;
        const matches = source.filter(inv => inv.invoiceNumber === num);
        
        if (matches.length > 1) {
            const details = matches.map(m => {
                const bName = branches.find(b => b.id === m.branchId)?.name || 'Unknown';
                return `${bName} (${new Date(m.date).toLocaleDateString()})`;
            }).join(', ');
            setFormError(`Multiple invoices found with number ${num}: [${details}]. Please check search tracking for full details.`);
            return;
        }

        if (matches.length === 1) {
            const foundInvoice = matches[0];
            // Enter Edit Mode
            setIsEditing(true);
            setEditingInvoiceId(foundInvoice.id);
            setOriginalInvoiceData(foundInvoice);
            
            // Populate Form
            setCurrentInvoiceNumber(foundInvoice.invoiceNumber);
            
            const foundItem = items.find(i => i.name === foundInvoice.itemName) || 
                              (foundInvoice.itemName === 'Cancel' ? {id: 'cancel', name: 'Cancel'} : null);
            
            if (foundItem) {
                setSelectedItemId(foundItem.id);
            } else {
                setSelectedItemId('');
            }

            setQuantity(foundInvoice.quantity.toString());
            setTotal(foundInvoice.total.toString());
            
            const d = new Date(foundInvoice.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setEditDate(`${yyyy}-${mm}-${dd}`);
            
            setFormError(null);
            
            // If it's a different theme, inform the user
            if (foundInvoice.type !== theme) {
                setFormError(`Note: Found a ${foundInvoice.type} invoice. You are editing it in the ${theme} form.`);
            }
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const num = parseInt(searchQuery, 10);
            if (isNaN(num)) return;

            const source = allInvoices.length > 0 ? allInvoices : existingInvoices;
            const matches = source.filter(inv => inv.invoiceNumber === num);
            
            if (matches.length === 0) {
                setFormError(`Invoice ${num} not found in historical records.`);
                // Reset search
                setSearchQuery('');
                if (isEditing) cancelEdit();
            } else if (matches.length > 1) {
                const details = matches.map(m => {
                    const bName = branches.find(b => b.id === m.branchId)?.name || 'Unknown';
                    return `${bName} (${new Date(m.date).toLocaleDateString()})`;
                }).join(', ');
                setFormError(`Multiple matches for ${num}: [${details}].`);
            }
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditingInvoiceId(null);
        setOriginalInvoiceData(null);
        setSearchQuery('');
        setFormError(null);
        setIsConfirmingDelete(false);
        
        // Reset Form
        setCurrentInvoiceNumber(invoiceNumber);
        setSelectedItemId('');
        setItemCodeInput('');
        setQuantity('');
        setTotal('');
        setSelectedPOCustomerId('');
    };

    const handleDelete = () => {
        console.log(`InvoiceForm: handleDelete triggered. canDelete: ${canDelete}, editingInvoiceId: ${editingInvoiceId}, hasOnDelete: ${!!onDeleteInvoice}`);
        if (!canDelete || !editingInvoiceId || !onDeleteInvoice) {
            console.warn("InvoiceForm: Delete aborted due to missing permissions or ID.");
            return;
        }
        if (!isConfirmingDelete) {
            console.log("InvoiceForm: First click, showing confirmation.");
            setIsConfirmingDelete(true);
            return;
        }
        
        console.log(`InvoiceForm: Deleting invoice ${editingInvoiceId}`);
        onDeleteInvoice(editingInvoiceId);
        cancelEdit();
    };

    const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            totalRef.current?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        setFormError(null);
        setIsSubmitting(true);

        try {
            if (!branchName) {
                setFormError('Please select a branch first.');
                setIsSubmitting(false);
                return;
            }

            if (isNaN(currentInvoiceNumber) || currentInvoiceNumber < 1) {
                setFormError('Please enter a valid invoice number.');
                setIsSubmitting(false);
                return;
            }

            const numQuantity = parseFloat(quantity);
            const numTotal = parseFloat(total);

            if (!selectedItemId || !quantity || isNaN(numQuantity) || numQuantity <= 0) {
                setFormError('Please select an item and enter a valid quantity.');
                setIsSubmitting(false);
                return;
            }

            if (isNaN(numTotal) || numTotal < 0) {
                setFormError('Please enter a valid total amount.');
                setIsSubmitting(false);
                return;
            }
            
            /* Removed mandatory PO selection for credit invoices */
            
            if (selectedPOCustomerId) {
                const poCust = poCustomers.find(pc => pc.id === selectedPOCustomerId) as any;
                if (poCust) {
                    // Determine if we are editing and need to exclude current invoice values
                    let actualRemQty = poCust.remainingQuantity;
                    let actualRemTotal = poCust.remainingTotal;
                    
                    if (isEditing && originalInvoiceData && originalInvoiceData.poCustomerId === selectedPOCustomerId) {
                        actualRemQty += originalInvoiceData.quantity;
                        actualRemTotal += originalInvoiceData.total;
                    }

                    if (poCust.quantity > 0 && numQuantity > actualRemQty) {
                        setFormError(`Insufficient PO Quantity. Remaining: ${actualRemQty}, Requested: ${numQuantity}`);
                        setIsSubmitting(false);
                        return;
                    }
                    if (poCust.total > 0 && numTotal > actualRemTotal) {
                        setFormError(`Insufficient PO Balance. Remaining: ${actualRemTotal.toFixed(2)}, Requested: ${numTotal.toFixed(2)}`);
                        setIsSubmitting(false);
                        return;
                    }
                }
            }

            const selectedItem = items.find(item => item.id === selectedItemId);
            if (!selectedItem) {
                setIsSubmitting(false);
                return;
            }

            if (checkUniqueNumber) {
                const isUnique = checkUniqueNumber(currentInvoiceNumber, editingInvoiceId || undefined);
                if (!isUnique) {
                    setFormError(`Invoice number ${currentInvoiceNumber} is already registered.`);
                    setIsSubmitting(false);
                    return;
                }
            }

            if (isEditing && onUpdateInvoice && originalInvoiceData) {
                // Update logic
                const updatedDate = canChangeDate && editDate ? new Date(editDate) : originalInvoiceData.date;
                if (canChangeDate && editDate) {
                    updatedDate.setHours(new Date(originalInvoiceData.date).getHours());
                    updatedDate.setMinutes(new Date(originalInvoiceData.date).getMinutes());
                }

                const poCust = poCustomers.find(pc => pc.id === selectedPOCustomerId);
                onUpdateInvoice({
                    ...originalInvoiceData,
                    invoiceNumber: currentInvoiceNumber,
                    itemName: selectedItem.name,
                    itemCode: selectedItem.code,
                    quantity: numQuantity,
                    total: numTotal,
                    date: updatedDate,
                    poCustomerId: selectedPOCustomerId,
                    poNumber: poCust?.poNumber || '',
                    poItemName: poCust?.itemName || ''
                });
                cancelEdit();
            } else {
                // Add logic
                const poCust = poCustomers.find(pc => pc.id === selectedPOCustomerId);
                onAddInvoice({
                    invoiceNumber: currentInvoiceNumber,
                    type: theme,
                    itemName: selectedItem.name,
                    itemCode: selectedItem.code,
                    quantity: numQuantity,
                    total: numTotal,
                    status: 'daily',
                    poCustomerId: selectedPOCustomerId || undefined,
                    poNumber: poCust?.poNumber || '',
                    poItemName: poCust?.itemName || '',
                    orderIds: loadedOrderIds.length > 0 ? loadedOrderIds : undefined
                });
                
                // Reset form and focus on the next entry
                setSelectedItemId('');
                setItemCodeInput('');
                setQuantity('');
                setTotal('');
                setSelectedPOCustomerId('');
                setLoadedOrderIds([]);
            }
        } finally {
            // Re-enable after a short delay
            setTimeout(() => {
                setIsSubmitting(false);
            }, 600);
        }
    };

    const handleItemSelect = (itemId: string) => {
        setFormError(null);
        if (itemId === 'cancel') {
            if (isNaN(currentInvoiceNumber) || currentInvoiceNumber < 1) {
                setFormError('Please enter a valid invoice number.');
                return;
            }

            const payload = {
                itemName: 'Cancel',
                itemCode: 'cancel',
                quantity: 0,
                total: 0,
            };

            if (checkUniqueNumber) {
                const isUnique = checkUniqueNumber(currentInvoiceNumber, editingInvoiceId || undefined);
                if (!isUnique) {
                    setFormError(`Invoice number ${currentInvoiceNumber} is already registered.`);
                    return;
                }
            }

            const updatedDate = canChangeDate && editDate ? new Date(editDate) : (originalInvoiceData ? originalInvoiceData.date : new Date());
            if (canChangeDate && editDate && originalInvoiceData) {
                updatedDate.setHours(new Date(originalInvoiceData.date).getHours());
                updatedDate.setMinutes(new Date(originalInvoiceData.date).getMinutes());
            }

            if (isEditing && onUpdateInvoice && originalInvoiceData) {
                 onUpdateInvoice({
                     ...originalInvoiceData,
                     invoiceNumber: currentInvoiceNumber,
                     ...payload,
                     date: updatedDate
                 });
                 cancelEdit();
            } else {
                onAddInvoice({
                    invoiceNumber: currentInvoiceNumber,
                    type: theme,
                    ...payload
                });
                setSelectedItemId('');
                setItemCodeInput('');
                setQuantity('');
                setTotal('');
                setSelectedPOCustomerId('');
            }
        } else {
            setSelectedItemId(itemId);
            setTimeout(() => quantityRef.current?.focus(), 0);
        }
    };

    const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setItemCodeInput(val);
        const matchedItem = items.find(i => i.code === val);
        if (matchedItem) {
            setSelectedItemId(matchedItem.id);
            setTimeout(() => quantityRef.current?.focus(), 50);
        }
    };

    const selectedItemName = items.find(i => i.id === selectedItemId)?.name || 'Select Item';

    const selectedPO = poCustomers.find(pc => pc.id === selectedPOCustomerId);
    const currentQtyInput = parseFloat(quantity) || 0;
    const currentTotalInput = parseFloat(total) || 0;

    let liveRemainingQty: number | null = null;
    let liveRemainingTotal: number | null = null;

    if (selectedPO) {
        let baseQty = (selectedPO as any).remainingQuantity || 0;
        let baseTotal = (selectedPO as any).remainingTotal || 0;

        // If editing the invoice that originally used this PO, we must add back its values to the base
        if (isEditing && originalInvoiceData && originalInvoiceData.poCustomerId === selectedPOCustomerId) {
            baseQty += (originalInvoiceData.quantity || 0);
            baseTotal += (originalInvoiceData.total || 0);
        }

        liveRemainingQty = baseQty - currentQtyInput;
        liveRemainingTotal = baseTotal - currentTotalInput;
    }

    return (
        <div className={`bg-white rounded-lg shadow-lg p-4 sm:p-6 border-t-4 relative ${isEditing ? 'ring-2 ring-yellow-400' : ''}`} style={{borderColor: theme === 'cash' ? '#2563eb' : '#0ea5e9'}}>
             {isEditing && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-bl-lg">
                    Editing Mode
                </div>
            )}
            
            <form onSubmit={handleSubmit}>
                {formError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md font-semibold text-sm">
                        {formError}
                    </div>
                )}
                <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-wrap">
                    <div className="flex items-center gap-2">
                        <h2 className={`text-lg sm:text-xl font-bold ${currentTheme.accentText} whitespace-nowrap`}>{title}</h2>
                        <button 
                            type="button" 
                            onClick={handleCheckMissing} 
                            className={`p-1 rounded-full ${currentTheme.button} text-white flex items-center justify-center transition-transform hover:scale-105`}
                            title="Check Missing Invoices"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:flex-initial">
                            <input 
                                type="number" 
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => handleSearchInput(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search No."
                                className={`w-full sm:w-48 text-sm sm:text-base border border-gray-300 rounded-md py-1.5 px-2 pl-2 focus:outline-none focus:ring-1 ${currentTheme.searchBorder}`}
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Invoice Number Display/Input */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <span className="text-xs font-medium text-gray-600 hidden md:inline">Inv:</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={currentInvoiceNumber || ''}
                                    onChange={(e) => {
                                        setCurrentInvoiceNumber(parseInt(e.target.value, 10))
                                    }}
                                    disabled={(isEditing && !canEdit) || (!isEditing && isAutoNumber)}
                                    placeholder={!isAutoNumber ? "Manual" : ""}
                                    readOnly={!isEditing && isAutoNumber}
                                    className={`w-16 sm:w-32 text-center text-sm sm:text-base border border-gray-300 rounded-md py-1.5 bg-gray-50 font-bold focus:ring-2 focus:ring-opacity-50 ${(isEditing && !canEdit) || (!isEditing && isAutoNumber) ? 'text-gray-500 cursor-not-allowed opacity-80 pointer-events-none' : ''}`}
                                    style={{'--tw-ring-color': theme === 'cash' ? '#2563eb' : '#0ea5e9'} as React.CSSProperties}
                                    min="1"
                                />
                                {isEditing && canChangeDate && (
                                    <div className="ml-2 w-36">
                                        <CustomDatePicker
                                            value={editDate}
                                            onChange={setEditDate}
                                            themeColor={theme === 'cash' ? '#2563eb' : '#0ea5e9'}
                                        />
                                    </div>
                                )}
                                {!isEditing && theme === 'credit' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = !isAutoNumber;
                                            setIsAutoNumber(newVal);
                                            // When switching to auto, ensure we get the latest number
                                            if (newVal) {
                                                setCurrentInvoiceNumber(invoiceNumber);
                                            }
                                        }}
                                        className={`p-1 rounded-md border transition-all ${isAutoNumber ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                                        title={isAutoNumber ? "Automatic (Locked)" : "Manual (Unlocked)"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {isAutoNumber ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                            )}
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 sm:space-y-4">
                    {branchName === 'Main Branch' && (
                        <div className="mb-2 sm:mb-4">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Select PO:</label>
                            <select
                                value={selectedPOCustomerId}
                                onChange={(e) => {
                                    setSelectedPOCustomerId(e.target.value);
                                    if (e.target.value) {
                                        setTimeout(() => itemCodeRef.current?.focus(), 100);
                                    }
                                }}
                                disabled={isEditing && !canEdit}
                                className={`w-full border border-gray-300 rounded-md p-1.5 sm:p-2 text-sm sm:text-base focus:ring-2 focus:ring-opacity-50 ${isEditing && !canEdit ? 'bg-gray-100' : ''}`}
                                style={{'--tw-ring-color': theme === 'cash' ? '#2563eb' : '#0ea5e9'} as React.CSSProperties}
                            >
                                <option value="">-- Choose PO Number --</option>
                                {poCustomers.filter(pc => {
                                    // Filter by type matching the invoice theme
                                    if (pc.type && pc.type !== theme) return false;

                                    const remQty = (pc as any).remainingQuantity || 0;
                                    const remTotal = (pc as any).remainingTotal || 0;
                                    const isExhausted = (pc.quantity > 0 && remQty <= 0) || (pc.total > 0 && remTotal <= 0);
                                    return !isExhausted || String(pc.id) === String(selectedPOCustomerId);
                                }).map(pc => {
                                    const remQty = (pc as any).remainingQuantity || 0;
                                    const remTotal = (pc as any).remainingTotal || 0;
                                    const info = pc.quantity > 0 ? `${remQty} Qty` : `${remTotal.toFixed(2)} SAR`;
                                    return (
                                        <option key={pc.id} value={pc.id}>
                                            {pc.poNumber} | {pc.customerName} {pc.itemName ? `- ${pc.itemName}` : ''} ({info})
                                        </option>
                                    );
                                })}
                            </select>

                            {/* Display Selected PO Details */}
                            {selectedPOCustomerId && (() => {
                                const pc = poCustomers.find(p => p.id === selectedPOCustomerId);
                                if (!pc) return null;
                                return (
                                    <div className={`mt-2 p-2 ${theme === 'cash' ? 'bg-blue-50 border-blue-200' : 'bg-sky-50 border-sky-200'} border rounded-md text-xs sm:text-sm animate-in fade-in slide-in-from-top-1`}>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 font-medium leading-tight">Customer:</span>
                                                <span className="font-black text-slate-900 leading-tight">{pc.customerName}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 font-medium leading-tight">PO No.:</span>
                                                <span className="font-black text-blue-700 leading-tight">{pc.poNumber}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 font-medium leading-tight">Item:</span>
                                                <span className="font-bold text-purple-700 leading-tight">{pc.itemName || '---'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 font-medium leading-tight">Balance:</span>
                                                <span className="font-black text-emerald-700 leading-tight">
                                                    {pc.quantity > 0 
                                                        ? `${(pc as any).remainingQuantity} (Qty)` 
                                                        : `${(pc as any).remainingTotal?.toFixed(2)} (Total)`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4">
                        <div className="col-span-1">
                            <label htmlFor={`code-${theme}`} className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Item Code:</label>
                            <input 
                                type="text"
                                id={`code-${theme}`}
                                ref={itemCodeRef}
                                value={itemCodeInput}
                                onChange={handleCodeInput}
                                placeholder="Code"
                                disabled={isEditing && !canEdit}
                                className={`w-full border border-gray-300 rounded-md p-1.5 sm:p-2 text-sm sm:text-base focus:ring-2 focus:ring-opacity-50 ${isEditing && !canEdit ? 'bg-gray-100' : ''}`}
                                style={{'--tw-ring-color': theme === 'cash' ? '#2563eb' : '#0ea5e9'} as React.CSSProperties}
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                            <CustomSelect 
                                label="Item Name:"
                                options={items}
                                value={selectedItemId}
                                onChange={handleItemSelect}
                                placeholder="Select Item"
                                themeColor={theme === 'cash' ? '#2563eb' : '#0ea5e9'}
                                readOnly={isEditing && !canEdit}
                                direction="up"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div>
                            <label htmlFor={`quantity-${theme}`} className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                                Quantity:
                                {selectedPO && selectedPO.quantity !== null && selectedPO.quantity > 0 && liveRemainingQty !== null && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-black uppercase tracking-wider ${liveRemainingQty < 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                                        Rem: {liveRemainingQty.toFixed(2)}
                                    </span>
                                )}
                            </label>
                            <input 
                                type="number" 
                                id={`quantity-${theme}`}
                                ref={quantityRef}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                onKeyDown={handleQuantityKeyDown}
                                placeholder="0.00"
                                min="0"
                                step="any"
                                disabled={isEditing && !canEdit}
                                className={`w-full border border-gray-300 rounded-md p-1.5 sm:p-2 text-sm sm:text-base focus:ring-2 focus:ring-opacity-50 ${isEditing && !canEdit ? 'bg-gray-100' : ''}`}
                                style={{'--tw-ring-color': theme === 'cash' ? '#2563eb' : '#0ea5e9'} as React.CSSProperties}
                            />
                        </div>
                        <div>
                            <label htmlFor={`total-${theme}`} className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                                Total:
                                {selectedPO && selectedPO.total !== null && selectedPO.total > 0 && liveRemainingTotal !== null && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-black uppercase tracking-wider ${liveRemainingTotal < 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                                        Rem: {liveRemainingTotal.toFixed(2)}
                                    </span>
                                )}
                            </label>
                            <input 
                                type="number"
                                id={`total-${theme}`}
                                ref={totalRef}
                                value={total}
                                onChange={(e) => setTotal(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="any"
                                disabled={isEditing && !canEdit}
                                className={`w-full border border-gray-300 rounded-md p-1.5 sm:p-2 text-sm sm:text-base focus:ring-2 focus:ring-opacity-50 font-semibold ${isEditing && !canEdit ? 'bg-gray-100' : ''}`}
                                style={{'--tw-ring-color': theme === 'cash' ? '#2563eb' : '#0ea5e9'} as React.CSSProperties}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 sm:mt-8 flex gap-2 flex-wrap">
                    {isEditing && (
                        <>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="flex-1 min-w-[100px] bg-gray-500 text-white font-bold py-2 sm:py-3 px-2 sm:px-4 text-sm sm:text-base rounded-lg transition-transform transform hover:scale-105 focus:outline-none"
                            >
                                Cancel
                            </button>
                            {canDelete && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className={`flex-1 min-w-[100px] text-white font-bold py-2 sm:py-3 px-2 sm:px-4 text-sm sm:text-base rounded-lg transition-transform transform hover:scale-105 focus:outline-none ${isConfirmingDelete ? 'bg-orange-500' : 'bg-red-600'}`}
                                >
                                    {isConfirmingDelete ? 'Confirm Delete?' : 'Delete'}
                                </button>
                            )}
                        </>
                    )}
                    
                    {!isEditing && !canAdd ? (
                        <div className="flex-[2] bg-gray-100 text-gray-500 font-bold py-2 sm:py-3 px-2 sm:px-4 text-sm sm:text-base rounded-lg text-center cursor-not-allowed">
                            Search to View/Edit
                        </div>
                    ) : (
                        <button 
                            type="submit"
                            disabled={(isEditing && !canEdit) || isSubmitting}
                            className={`flex-[2] text-white font-bold py-2 sm:py-3 px-2 sm:px-4 text-sm sm:text-base rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme.button} ${(isEditing && !canEdit) || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing...
                                </span>
                            ) : (
                                isEditing ? 'Update Invoice' : `Add ${theme === 'cash' ? 'Cash' : 'Credit'} Invoice`
                            )}
                        </button>
                    )}
                </div>
            </form>

            {/* Missing Invoices Modal */}
            {showMissingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className={`p-4 ${currentTheme.button.split(' ')[0]} text-white flex justify-between items-center`}>
                            <h3 className="font-bold text-lg">Missing Invoice Numbers</h3>
                            <button onClick={() => setShowMissingModal(false)} className="text-white hover:text-gray-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            {existingInvoices.length === 0 ? (
                                <p className="text-gray-600 text-center">No invoices recorded today.</p>
                            ) : missingNumbers.length > 0 ? (
                                <div>
                                    <p className="text-gray-700 mb-4 text-center">The following invoice numbers are missing in the current sequence (between {Math.min(...existingInvoices.map(i => i.invoiceNumber))} and {Math.max(...existingInvoices.map(i => i.invoiceNumber))}):</p>
                                    <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                                        {missingNumbers.map(num => (
                                            <span key={num} className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full text-sm border border-red-200">
                                                {num}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-green-600 font-bold text-lg">Perfect Sequence!</p>
                                    <p className="text-gray-500 mt-1">No missing invoice numbers detected.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t text-center">
                            <button 
                                onClick={() => setShowMissingModal(false)}
                                className={`px-6 py-2 rounded-lg text-white font-bold transition-colors ${currentTheme.button}`}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceForm;
