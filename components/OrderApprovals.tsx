import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Order, User } from '../types';
import { dualStorage, COLLECTIONS } from '../DualStorageService';

interface OrderApprovalsProps {
    orders: Order[];
    setNotification: (notification: { message: string, type: 'success' | 'error' | 'info' | 'add' | 'update' | 'delete' | 'warning' } | null, permKey?: string) => void;
    currentUser: User | null;
}

const OrderApprovals: React.FC<OrderApprovalsProps> = ({ orders, setNotification, currentUser }) => {
    const [groupToDelete, setGroupToDelete] = useState<Order[] | null>(null);
    
    // Check if user has permission to delete orders
    const canDeleteOrder = React.useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'alaa') return true;
        return !!currentUser.permissions?.canDeleteOrder;
    }, [currentUser]);

    // Group by creator and serial
    const groupedOrders = React.useMemo(() => {
        const groups = new Map<string, Order[]>();
        orders.filter(o => !o.hiddenFromApprovals).forEach(o => {
            const key = `${o.createdBy || 'unknown'}_${o.serial}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(o);
        });
        return Array.from(groups.values()).sort((a, b) => new Date(b[0].time).getTime() - new Date(a[0].time).getTime());
    }, [orders]);

    const confirmDeleteOrderGroup = async () => {
        if (!groupToDelete) return;

        const targetGroup = groupToDelete;
        setGroupToDelete(null);

        try {
            // 1. Hide the order from approvals instead of deleting it permanently
            const promises = targetGroup.map(order => dualStorage.save(COLLECTIONS.RECORDS, order.id, {
                type: 'order',
                data: { ...order, hiddenFromApprovals: true }
            }));
            await Promise.all(promises);

            setNotification({ message: 'Order Removed from Approvals', type: 'delete' }, 'notifyDeleteOrder');
        } catch (error: any) {
            setNotification({ message: 'Error Removing Order', type: 'error' });
        }
    };

    const updateOrderStatus = async (group: Order[], newStatus: 'approved' | 'rejected') => {
        try {
            const promises = group.map(order => dualStorage.save(COLLECTIONS.RECORDS, order.id, {
                type: 'order',
                data: { ...order, status: newStatus }
            }));
            await Promise.all(promises);
            const message = newStatus === 'approved'
                ? 'Order Approved'
                : 'Order Rejected';
            setNotification(
                { message, type: newStatus === 'approved' ? 'success' : 'warning' },
                newStatus === 'approved' ? 'notifyApproveOrder' : 'notifyRejectOrder'
            );
        } catch (error: any) {
            setNotification({ message: error.message || `Failed to update order`, type: 'error' });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Order Approvals</h2>
            </div>
            
            <div className="p-4 sm:p-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Serial</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created By</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-800 bg-slate-100/50 uppercase tracking-wider">Total Ex. Tax</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-blue-800 bg-blue-50 uppercase tracking-wider">Total with Tax (15%)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                                {canDeleteOrder && (
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-red-600 uppercase tracking-wider">Delete</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {groupedOrders.map((group, index) => {
                                const mainOrder = group[0];
                                const isPending = mainOrder.status === 'pending';
                                return (
                                <tr key={`${mainOrder.createdBy || 'unknown'}_${mainOrder.serial}`} className={`${isPending ? 'bg-yellow-50/30 hover:bg-yellow-50/50' : 'hover:bg-gray-50'} transition-all`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-650 font-medium">{mainOrder.createdBy || 'unknown'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                        {Array.from(new Set(group.map(o => o.customerName))).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {group.map((o, i) => <div key={i} className="py-1">{o.item}</div>)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-bold text-center">
                                        {group.map((o, i) => <div key={i} className="py-1">{o.quantity}</div>)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 text-center font-medium bg-gray-50/20">
                                        {group.map((o, i) => {
                                            const priceVal = o.price !== undefined ? o.price : 0;
                                            return <div key={i} className="py-1 font-mono">{priceVal.toFixed(2)}</div>;
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-800 text-center font-bold bg-slate-50">
                                        {group.map((o, i) => {
                                            const qty = o.quantity || 0;
                                            const price = o.price !== undefined ? o.price : 0;
                                            const totalBeforeTax = qty * price;
                                            return <div key={i} className="py-1 font-mono">{totalBeforeTax.toFixed(2)}</div>;
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-blue-700 text-center font-extrabold bg-blue-50/30">
                                        {group.map((o, i) => {
                                            const qty = o.quantity || 0;
                                            const price = o.price !== undefined ? o.price : 0;
                                            const totalBeforeTax = qty * price;
                                            const totalWithTax = totalBeforeTax * 1.15;
                                            return <div key={i} className="py-1 font-mono">{totalWithTax.toFixed(2)}</div>;
                                        })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(mainOrder.time).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {isPending ? (
                                            <div className="flex justify-center space-x-2">
                                                <button 
                                                    onClick={() => updateOrderStatus(group, 'approved')}
                                                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded shadow-sm transition-colors cursor-pointer"
                                                >
                                                    Approve
                                                </button>
                                                <button 
                                                    onClick={() => updateOrderStatus(group, 'rejected')}
                                                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1.5 px-3 rounded shadow-sm transition-colors cursor-pointer"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1.5 justify-center">
                                                <span className={`px-2.5 py-1 inline-flex text-xs leading-[1.2] font-semibold rounded-full ${
                                                    mainOrder.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                    mainOrder.status === 'delivered' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {mainOrder.status === 'approved' ? 'Approved' : 
                                                     mainOrder.status === 'delivered' ? 'Delivered' : 'Rejected'}
                                                </span>
                                                {mainOrder.status === 'approved' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(group, 'rejected')}
                                                        className="text-[11px] text-red-600 hover:text-red-800 font-bold hover:underline transition-colors focus:outline-none flex items-center gap-0.5 cursor-pointer"
                                                        title="Undo approval and reject order"
                                                    >
                                                        Undo
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    {canDeleteOrder && (
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button 
                                                onClick={() => setGroupToDelete(group)}
                                                className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 active:scale-95 p-2 rounded-lg transition-all focus:outline-none flex items-center justify-center mx-auto cursor-pointer"
                                                title="Delete Order Permanently"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )})}
                            {groupedOrders.length === 0 && (
                                <tr>
                                    <td colSpan={canDeleteOrder ? 11 : 10} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {groupToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="delete-order-confirm-modal">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-gray-150 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Removal</h3>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            Are you sure you want to remove this order from the approvals list? (It will still be visible in the Orders page).
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setGroupToDelete(null)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteOrderGroup}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer"
                            >
                                Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderApprovals;
