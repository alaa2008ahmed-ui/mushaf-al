import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, ClipboardCheck, X } from 'lucide-react';
import { Order, Customer, Item, User } from '../types';
import { dualStorage, COLLECTIONS } from '../DualStorageService';

interface OrdersProps {
    orders: Order[];
    customers: Customer[];
    items: Item[];
    currentUser: User | null;
    setNotification: (notification: { message: string, type: 'success' | 'error' | 'info' | 'add' | 'update' | 'delete' | 'warning' } | null, permKey?: string) => void;
    directOrderFlow?: boolean;
}

const Orders: React.FC<OrdersProps> = ({ orders, customers, items, currentUser, setNotification, directOrderFlow }) => {
    const allowedCustomers = currentUser?.permissions?.allowedOrderCustomers;
    const filteredCustomers = React.useMemo(() => {
        const activeCustomers = customers.filter(c => c.isActive !== false);
        return allowedCustomers && allowedCustomers.length > 0 
            ? activeCustomers.filter(c => allowedCustomers.includes(c.name))
            : activeCustomers;
    }, [customers, allowedCustomers]);

    const allowedItems = currentUser?.permissions?.allowedOrderItems;
    const filteredItems = React.useMemo(() => allowedItems && allowedItems.length > 0
        ? items.filter(i => allowedItems.includes(i.name))
        : items, [items, allowedItems]);

    const [rows, setRows] = useState([{ 
        customerName: '', 
        item: '', 
        quantity: '', 
        price: '' 
    }]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    React.useEffect(() => {
        setRows(currentRows => {
            let changed = false;
            const newRows = currentRows.map(row => {
                const updated = { ...row };
                if (!updated.customerName && filteredCustomers.length === 1) {
                    updated.customerName = filteredCustomers[0].name;
                    changed = true;
                }
                if (!updated.item && filteredItems.length === 1) {
                    updated.item = filteredItems[0].name;
                    changed = true;
                }
                return updated;
            });
            return changed ? newRows : currentRows;
        });
    }, [filteredCustomers, filteredItems]);

    const handleRowChange = (index: number, field: 'customerName' | 'item' | 'quantity' | 'price', value: string) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { 
            customerName: filteredCustomers.length === 1 ? filteredCustomers[0].name : '', 
            item: filteredItems.length === 1 ? filteredItems[0].name : '', 
            quantity: '', 
            price: '' 
        }]);
    };

    const removeRow = (index: number) => {
        if (rows.length > 1) {
            const newRows = rows.filter((_, i) => i !== index);
            setRows(newRows);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let hasError = false;
        const validRows = rows.filter(row => {
            if (!row.customerName || !row.item || !row.quantity || !row.price) {
                hasError = true;
                return false;
            }
            return true;
        });

        if (hasError || validRows.length === 0) {
            setNotification({ message: 'Please fill all fields for all rows (including price)', type: 'error' });
            return;
        }

        const myOrdersForSerial = orders.filter(o => o.createdBy === (currentUser?.username || currentUser?.id || 'unknown'));
        let currentSerial = myOrdersForSerial.length > 0 ? Math.max(...myOrdersForSerial.map(o => o.serial)) : 0;
        currentSerial++;
        const submissionTime = new Date().toISOString();
        const baseId = `order_${Date.now()}`;
        
        try {
            const promises = validRows.map((row, idx) => {
                const qtyVal = parseFloat(row.quantity);
                const priceVal = parseFloat(row.price);
                const totalBeforeTaxVal = qtyVal * priceVal;
                const totalWithTaxVal = totalBeforeTaxVal * 1.15;

                const newOrder: Order = {
                    id: `${baseId}_${idx}`,
                    serial: currentSerial,
                    customerName: row.customerName,
                    item: row.item,
                    quantity: qtyVal,
                    price: priceVal,
                    priceBeforeTax: totalBeforeTaxVal, // Total ex. tax (qty * price)
                    totalWithTax: totalWithTaxVal,     // Total with 15% tax
                    time: submissionTime,
                    status: directOrderFlow ? 'approved' : 'pending',
                    createdBy: currentUser?.username || currentUser?.id || 'unknown'
                };
                return dualStorage.save(COLLECTIONS.RECORDS, newOrder.id, {
                    type: 'order',
                    data: newOrder
                });
            });

            await Promise.all(promises);
            setNotification({ message: 'Orders Sent', type: 'add' }, 'notifyAddOrder');
            setRows([{ customerName: '', item: '', quantity: '', price: '' }]);
            setShowSuccessModal(true);
        } catch (error: any) {
            setNotification({ message: error.message || 'Failed to send orders', type: 'error' });
        }
    };

    // Permissions check
    const canViewAllOrders = React.useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'alaa') return true;
        return !!currentUser.permissions?.canViewAllOrders;
    }, [currentUser]);

    const canDeleteOrder = React.useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'alaa') return true;
        return !!currentUser.permissions?.canDeleteOrder;
    }, [currentUser]);

    const hasReceiptPopupPermission = React.useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'alaa') return true;
        return currentUser.permissions?.showOrderReceiptPopup !== false;
    }, [currentUser]);

    const hasReceiptDetailsPermission = React.useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'alaa') return true;
        return currentUser.permissions?.showReceiptDetailsPopup !== false;
    }, [currentUser]);

    const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
    const [groupToDelete, setGroupToDelete] = useState<Order[] | null>(null);
    const [inlineConfirmKey, setInlineConfirmKey] = useState<string | null>(null);
    const [receiptConfirmGroup, setReceiptConfirmGroup] = useState<Order[] | null>(null);
    const [isUpdatingReceipt, setIsUpdatingReceipt] = useState(false);

    const handleConfirmCustomerReceiptGroupInline = async (group: Order[]) => {
        setIsUpdatingReceipt(true);
        try {
            // Update each order in the group to set customerReceived = true
            const promises = group.map(order => 
                dualStorage.save(COLLECTIONS.RECORDS, order.id, {
                    type: 'order',
                    data: { ...order, customerReceived: true }
                })
            );
            await Promise.all(promises);
            
            setNotification({ message: 'Receipt confirmed successfully!', type: 'success' });
            setInlineConfirmKey(null);
            if (hasReceiptDetailsPermission) {
                setReceiptConfirmGroup(group);
            }
        } catch (error: any) {
            console.error(error);
            setNotification({ message: 'Error confirming customer receipt', type: 'error' });
        } finally {
            setIsUpdatingReceipt(false);
        }
    };

    const confirmDeleteOrderGroup = async () => {
        if (!groupToDelete) return;

        const targetGroup = groupToDelete;
        setGroupToDelete(null);

        try {
            // 1. Delete all orders in the group
            const promises = targetGroup.map(order => dualStorage.delete(COLLECTIONS.RECORDS, order.id));
            await Promise.all(promises);

            // 2. Adjust remaining serials to be contiguous per user
            const deletedIds = new Set(targetGroup.map(o => o.id));
            const remainingOrders = orders.filter(o => !deletedIds.has(o.id));

            // Group remaining orders by their creator
            const ordersByCreator = new Map<string, Order[]>();
            remainingOrders.forEach(o => {
                const creator = o.createdBy || 'unknown';
                if (!ordersByCreator.has(creator)) {
                    ordersByCreator.set(creator, []);
                }
                ordersByCreator.get(creator)!.push(o);
            });

            const updatePromises: Promise<any>[] = [];

            // For each creator, re-assign serials starting from 1
            ordersByCreator.forEach((creatorOrders, creator) => {
                // Group this creator's orders by their current serial
                const groupsBySerial = new Map<number, Order[]>();
                creatorOrders.forEach(o => {
                    const s = o.serial;
                    if (!groupsBySerial.has(s)) {
                        groupsBySerial.set(s, []);
                    }
                    groupsBySerial.get(s)!.push(o);
                });

                // Sort groups chronologically (oldest group first)
                const sortedGroups = Array.from(groupsBySerial.values()).sort(
                    (a, b) => new Date(a[0].time).getTime() - new Date(b[0].time).getTime()
                );

                // Reassign serials starting from 1 for this creator
                sortedGroups.forEach((g, index) => {
                    const newSerial = index + 1;
                    g.forEach(order => {
                        if (order.serial !== newSerial) {
                            updatePromises.push(
                                dualStorage.save(COLLECTIONS.RECORDS, order.id, {
                                    type: 'order',
                                    data: { ...order, serial: newSerial }
                                })
                            );
                        }
                    });
                });
            });

            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
            }

            setNotification({ message: 'Orders Deleted', type: 'delete' }, 'notifyDeleteOrder');
        } catch (error: any) {
            setNotification({ message: 'Error Deleting Order', type: 'error' });
        }
    };

    // Filter based on selected view mode
    const visibleOrders = React.useMemo(() => {
        if (!currentUser) return [];
        if (viewMode === 'all' && canViewAllOrders) {
            return orders;
        }
        return orders.filter(o => o.createdBy === currentUser.username || o.createdBy === currentUser.id);
    }, [orders, currentUser, viewMode, canViewAllOrders]);

    // Group matching user orders by serial code, sorted descending (latest first)
    const groupedVisibleOrders = React.useMemo(() => {
        const groups = new Map<string, Order[]>();
        visibleOrders.forEach(o => {
            const key = `${o.createdBy || 'unknown'}_${o.serial}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(o);
        });
        return Array.from(groups.values()).sort((a, b) => new Date(b[0].time).getTime() - new Date(a[0].time).getTime());
    }, [visibleOrders]);

    const hasDisabledCustomerPermission = React.useMemo(() => {
        if (!currentUser) return false;
        const allowed = currentUser.permissions?.allowedOrderCustomers;
        if (allowed && allowed.length > 0) {
            return customers.some(c => allowed.includes(c.name) && c.isActive === false);
        }
        return false;
    }, [customers, currentUser]);

    const [showSuspendedAlert, setShowSuspendedAlert] = useState(false);

    React.useEffect(() => {
        if (hasDisabledCustomerPermission) {
            setShowSuspendedAlert(true);
        }
    }, [hasDisabledCustomerPermission]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200" id="orders-page-root">
            <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Orders</h2>
            </div>
            
            <div className="p-4 sm:p-6">
                <form onSubmit={handleSend} className="mb-0 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-700 mb-4 text-left">Create New Order</h3>
                    
                    {rows.map((row, index) => {
                        const qtyVal = parseFloat(row.quantity) || 0;
                        const priceVal = parseFloat(row.price) || 0;
                        const totalBeforeTaxVal = qtyVal * priceVal;
                        const totalWithTaxVal = totalBeforeTaxVal * 1.15;

                        return (
                            <div key={index} className="relative mb-6 bg-white p-5 rounded-xl border border-gray-100 shadow-md hover:shadow-lg transition-all">
                                <div className="absolute top-0 right-4 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Order #{index + 1}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-start">
                                    <div className="lg:col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 font-sans">Customer Name</label>
                                        {filteredCustomers.length === 1 ? (
                                            <div className={`w-full border border-gray-200 rounded-lg p-2.5 text-sm font-semibold select-none ${hasDisabledCustomerPermission ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60' : 'bg-gray-100 text-gray-700'}`}>
                                                {filteredCustomers[0].name}
                                            </div>
                                        ) : (
                                            <select 
                                                value={row.customerName}
                                                onChange={(e) => handleRowChange(index, 'customerName', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                                                required
                                                disabled={hasDisabledCustomerPermission}
                                            >
                                                <option value="">Select Customer</option>
                                                {filteredCustomers.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 font-sans">Item</label>
                                        {filteredItems.length === 1 ? (
                                            <div className={`w-full border border-gray-200 rounded-lg p-2.5 text-sm font-semibold select-none ${hasDisabledCustomerPermission ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60' : 'bg-gray-100 text-gray-700'}`}>
                                                {filteredItems[0].name}
                                            </div>
                                        ) : (
                                            <select 
                                                value={row.item}
                                                onChange={(e) => handleRowChange(index, 'item', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                                                required
                                                disabled={hasDisabledCustomerPermission}
                                            >
                                                <option value="">Select Item</option>
                                                {filteredItems.map(i => (
                                                    <option key={i.id} value={i.name}>{i.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="lg:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 font-sans">Qty</label>
                                        <input 
                                            type="number"
                                            min="0.01"
                                            step="any"
                                            value={row.quantity}
                                            placeholder="0"
                                            onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                                            required
                                            disabled={hasDisabledCustomerPermission}
                                        />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 font-sans">Unit Price</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={row.price}
                                            placeholder="Unit Price"
                                            onChange={(e) => handleRowChange(index, 'price', e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                                            required
                                            disabled={hasDisabledCustomerPermission}
                                        />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <span className="block text-xs font-bold text-gray-500 mb-1.5 font-sans">Total Ex. Tax</span>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center h-[42px] flex flex-col justify-center shadow-inner">
                                            <span className="text-sm font-bold text-slate-700 font-mono">
                                                {totalBeforeTaxVal > 0 ? totalBeforeTaxVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <span className="block text-xs font-bold text-blue-600 mb-1.5 font-sans">Total with Tax 15%</span>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center h-[42px] flex flex-col justify-center shadow-inner">
                                            <span className="text-sm font-bold text-blue-700 font-mono">
                                                {totalWithTaxVal > 0 ? totalWithTaxVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {rows.length > 1 && (
                                    <div className="mt-3 flex justify-end">
                                        <button 
                                            type="button"
                                            onClick={() => removeRow(index)}
                                            disabled={hasDisabledCustomerPermission}
                                            className="text-red-500 hover:text-red-700 font-semibold text-xs flex items-center gap-1 bg-red-50 hover:bg-red-100 rounded-md px-3 py-1 transition-colors border border-red-200/50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                                            title="Remove Row"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                            </svg>
                                            Remove Row
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div className="flex justify-between mt-6">
                        <button 
                            type="button"
                            onClick={addRow}
                            disabled={hasDisabledCustomerPermission}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            + Add Row
                        </button>
                        <button 
                            type="submit"
                            disabled={hasDisabledCustomerPermission}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            Send Order
                        </button>
                    </div>
                </form>

                {/* Orders Log */}
                <div className="mt-8 border-t border-gray-200 pt-6" id="orders-log-section">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 text-left">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 font-sans">
                                {viewMode === 'all' ? "All Users' Orders Log" : "My Orders Log"}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {viewMode === 'all' ? "Viewing orders created by all system users" : "Viewing your submitted orders"}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2.5">
                            {canViewAllOrders && (
                                <div className="inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('my')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                            viewMode === 'my' 
                                                ? 'bg-white text-slate-800 shadow-sm' 
                                                : 'text-gray-500 hover:text-slate-800'
                                        }`}
                                    >
                                        My Orders
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('all')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                            viewMode === 'all' 
                                                ? 'bg-white text-slate-800 shadow-sm' 
                                                : 'text-gray-500 hover:text-slate-800'
                                        }`}
                                    >
                                        All Users' Orders
                                    </button>
                                </div>
                            )}
                            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                                {groupedVisibleOrders.length} {groupedVisibleOrders.length === 1 ? 'Order' : 'Orders'}
                            </span>
                        </div>
                    </div>

                    {groupedVisibleOrders.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6">
                            <p className="text-gray-650 font-bold">
                                {viewMode === 'all' ? "No orders found in the system" : "You haven't submitted any orders yet"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 font-sans">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Serial</th>
                                        {canViewAllOrders && viewMode === 'all' && (
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created By</th>
                                        )}
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Total (with Tax)</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        {canDeleteOrder && (
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {groupedVisibleOrders.map((group) => {
                                        const mainOrder = group[0];
                                        const groupKey = `${mainOrder.createdBy || 'unknown'}_${mainOrder.serial}`;
                                        const totalGroupWithTax = group.reduce((acc, curr) => acc + (curr.totalWithTax || 0), 0);

                                        // Determine detailed status text according to standard status strings
                                        let statusConfig = {
                                            bg: 'bg-amber-50 text-amber-700 border border-amber-200',
                                            text: 'Pending Approval'
                                        };

                                        if (mainOrder.status === 'approved') {
                                            statusConfig = {
                                                bg: 'bg-green-50 text-green-700 border border-green-200',
                                                text: 'Approved'
                                            };
                                        } else if (mainOrder.status === 'rejected') {
                                            statusConfig = {
                                                bg: 'bg-red-50 text-red-700 border border-red-200',
                                                text: 'Rejected'
                                            };
                                        } else if (mainOrder.status === 'delivered') {
                                            statusConfig = {
                                                bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                                                text: 'Delivered successfully'
                                            };
                                        }

                                        return (
                                            <tr key={groupKey} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 font-mono text-left">
                                                    #{mainOrder.serial}
                                                </td>
                                                {canViewAllOrders && viewMode === 'all' && (
                                                    <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold text-gray-650 text-left">
                                                        {mainOrder.createdBy || 'unknown'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-4 text-sm text-gray-750 font-medium text-left">
                                                    {Array.from(new Set(group.map(o => o.customerName))).join(', ')}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600 text-left">
                                                    <div className="flex flex-col gap-1.5 justify-start">
                                                        {group.map((o, idx) => (
                                                            <div key={idx} className="flex items-center gap-1.5 justify-start text-xs">
                                                                 <span className="font-semibold text-gray-800">{o.item}</span>
                                                                 <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                                     Qty: {o.quantity}
                                                                 </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-705 font-mono text-center">
                                                    {totalGroupWithTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-[11px] text-gray-500 font-mono text-center">
                                                    {new Date(mainOrder.time).toLocaleString('en-US', {
                                                        year: 'numeric',
                                                        month: 'numeric',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <div className={`inline-flex px-3 py-1.5 rounded-xl border text-xs font-bold ${statusConfig.bg}`}>
                                                        {statusConfig.text}
                                                    </div>
                                                </td>
                                                {(canDeleteOrder || (hasReceiptPopupPermission && mainOrder.status === 'delivered' && currentUser?.username === mainOrder.createdBy)) && (
                                                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {hasReceiptPopupPermission && mainOrder.status === 'delivered' && currentUser?.username === mainOrder.createdBy && (
                                                                <div className="inline-flex items-center gap-2">
                                                                    {mainOrder.customerReceived ? (
                                                                        <div className="px-3 py-1.5 rounded-lg border text-xs font-bold gap-1 text-gray-400 bg-gray-50 border-gray-200 select-none opacity-70 inline-flex items-center justify-center font-sans">
                                                                            <ClipboardCheck className="h-4 w-4" />
                                                                            <span>Receipt Confirmed</span>
                                                                        </div>
                                                                    ) : inlineConfirmKey === groupKey ? (
                                                                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 p-1.5 rounded-lg border border-emerald-250 animate-in fade-in-50 slide-in-from-left-2 duration-150">
                                                                            <span className="text-[10px] font-extrabold text-emerald-800 uppercase px-1 font-sans">
                                                                                Confirm?
                                                                            </span>
                                                                            {/* Yes, Confirm Button */}
                                                                            <button
                                                                                type="button"
                                                                                disabled={isUpdatingReceipt}
                                                                                onClick={() => handleConfirmCustomerReceiptGroupInline(group)}
                                                                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-black text-xs px-2 py-1.5 rounded shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                                                                                title="Yes, Confirm"
                                                                            >
                                                                                {isUpdatingReceipt ? "..." : "Yes"}
                                                                            </button>
                                                                            {/* No, Cancel Button */}
                                                                            <button
                                                                                type="button"
                                                                                disabled={isUpdatingReceipt}
                                                                                onClick={() => setInlineConfirmKey(null)}
                                                                                className="bg-slate-200 hover:bg-slate-300 disabled:opacity-55 disabled:cursor-not-allowed text-slate-800 font-extrabold text-xs px-2 py-1.5 rounded shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                                                                                title="No, Cancel"
                                                                            >
                                                                                No
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setInlineConfirmKey(groupKey)}
                                                                            className="px-3 py-1.5 rounded-lg border text-xs font-bold gap-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 cursor-pointer shadow-sm active:scale-95 transition-all inline-flex items-center justify-center font-sans hover:scale-[1.02]"
                                                                            title="Acknowledge Customer Receipt"
                                                                        >
                                                                            <ClipboardCheck className="h-4 w-4" />
                                                                            <span>Acknowledge Receipt</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {canDeleteOrder && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setGroupToDelete(group)}
                                                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 p-2 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                                                                    title="Delete Order"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="success-order-modal">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        
                        {/* English Text */}
                        <div className="mb-6">
                            <p className="text-base font-semibold text-gray-650 mb-2 leading-relaxed">
                                Your order has been received and you will be contacted soon
                            </p>
                            <p className="text-sm font-bold text-blue-600">
                                Sweet Water Company LTD.
                            </p>
                        </div>
                        
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 cursor-pointer"
                            id="close-success-modal-btn"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Permanent Deletion Confirmation Popup */}
            {groupToDelete && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print" id="delete-order-confirmation-root">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-md w-full overflow-hidden flex flex-col justify-between transform transition-all animate-scale-up">
                        <div className="p-6 text-center">
                            <div className="mx-auto bg-amber-50 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4 border border-amber-200">
                                <AlertTriangle className="h-8 w-8 text-amber-600 animate-bounce" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-2">Delete Order Group?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-1">
                                Are you sure you want to delete order group <strong className="text-slate-800">#{groupToDelete[0]?.serial}</strong> created by <strong className="text-slate-800">{groupToDelete[0]?.createdBy || 'unknown'}</strong>?
                            </p>
                            <p className="text-[11px] text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                                This action is permanent, cannot be undone, and will automatically rearrange all remaining serial numbers chronologically for this user!
                            </p>
                        </div>

                        <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setGroupToDelete(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-all text-sm active:scale-95 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteOrderGroup}
                                className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 text-sm cursor-pointer"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Confirmation Details Display Modal */}
            {receiptConfirmGroup && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print" id="receipt-confirmation-modal-root">
                    <div className="bg-white rounded-2xl shadow-2xl border border-emerald-150 max-w-lg w-full overflow-hidden flex flex-col transform transition-all animate-scale-up">
                        <div className="p-6">
                            {/* Icon section */}
                            <div className="flex items-center justify-between border-b pb-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-50 p-2.5 rounded-full border border-emerald-250">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 leading-tight">Customer Receipt Acknowledged</h3>
                                        <p className="text-xs text-gray-400 font-sans">Successfully confirmed customer delivery</p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setReceiptConfirmGroup(null)} 
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-650"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Prominent customer name */}
                            <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-xl text-center mb-5 shadow-inner">
                                <p className="text-xs text-emerald-700 font-sans uppercase tracking-wider font-extrabold mb-1">Customer Name</p>
                                <h1 className="text-xl md:text-2xl font-black text-emerald-950 font-sans leading-tight">
                                    {Array.from(new Set(receiptConfirmGroup.map(o => o.customerName))).join(', ')}
                                </h1>
                            </div>

                            {/* Scrollable list of items */}
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase select-none font-sans flex items-center gap-1">
                                <span>Order Details</span>
                            </p>
                            <div className="space-y-2.5 max-h-48 overflow-y-auto mb-5 border border-gray-150 rounded-xl p-3.5 bg-gray-50/50">
                                {receiptConfirmGroup.map((o, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-gray-100 last:border-none">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            <span className="font-extrabold text-slate-800 font-sans">{o.item}</span>
                                        </div>
                                        <div className="text-slate-700 font-sans flex items-center gap-2">
                                            <span className="bg-gray-100/80 px-2 py-0.5 rounded font-mono font-bold text-[10px] text-gray-600">Qty: {o.quantity}</span>
                                            <span className="text-gray-300">|</span>
                                            <span className="font-mono font-bold">{(o.totalWithTax || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary footer metadata */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 mb-6 text-xs text-slate-650 font-sans">
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>Order Serial:</span>
                                    <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">#{receiptConfirmGroup[0]?.serial}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-500">
                                    <span>Created By:</span>
                                    <span className="font-bold">{receiptConfirmGroup[0]?.createdBy || 'system'}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 font-sans">
                                    <span className="font-extrabold text-slate-800">Total Group Amount:</span>
                                    <span className="text-base font-black text-emerald-600 font-mono">
                                        {receiptConfirmGroup.reduce((acc, curr) => acc + (curr.totalWithTax || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                                    </span>
                                </div>
                            </div>

                            {/* Primary call to action button */}
                            <button
                                type="button"
                                onClick={() => setReceiptConfirmGroup(null)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-sm font-sans text-center"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspended Alert Modal */}
            {showSuspendedAlert && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="suspended-alert-modal">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-red-100 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle size={36} className="animate-bounce" />
                        </div>
                        
                        <div className="space-y-4">
                            {/* English Message */}
                            <p className="text-lg sm:text-xl font-bold text-gray-800 font-sans leading-relaxed">
                                We apologize, you cannot create an order for water. Please contact the company.
                            </p>

                            {/* Contact Box */}
                            <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 mt-4 text-xs font-semibold text-gray-800 space-y-2">
                                <div className="flex justify-center items-center gap-2">
                                    <span className="text-sm">📞</span>
                                    <span className="font-sans">Phone:</span>
                                    <a href="tel:0558479888" className="text-blue-600 font-mono text-xs hover:underline">0558479888</a>
                                    <span className="text-gray-300">|</span>
                                    <a href="tel:0138479888" className="text-blue-600 font-mono text-xs hover:underline">0138479888</a>
                                </div>
                                <div className="flex justify-center items-center gap-2">
                                    <span className="text-sm">✉️</span>
                                    <span className="font-sans">Email:</span>
                                    <a href="mailto:adba@swc.com.sa" className="text-blue-600 font-mono text-xs hover:underline">adba@swc.com.sa</a>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-8">
                            <button
                                type="button"
                                onClick={() => setShowSuspendedAlert(false)}
                                className="w-full sm:w-auto px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 cursor-pointer"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Orders;
