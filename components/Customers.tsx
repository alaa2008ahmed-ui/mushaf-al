import React, { useState, useMemo } from 'react';
import { Customer, User } from '../types';
import { Search, Plus, UserPlus, Trash2, Edit2, Check, X, Users, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomersProps {
    customers: Customer[];
    onAdd: (customer: Omit<Customer, 'id'>) => Promise<void>;
    onUpdate: (id: string, customer: Customer) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    currentUser?: User;
}

const Customers: React.FC<CustomersProps> = ({ customers, onAdd, onUpdate, onDelete, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'credit' | 'cash'>('credit');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [newCustomer, setNewCustomer] = useState({ customerNumber: '', name: '', phone: '', address: '', type: 'credit' as 'cash' | 'credit' });
    const [editData, setEditData] = useState<Customer | null>(null);

    const canAddCustomer = currentUser?.role === 'admin' || currentUser?.username.toLowerCase() === 'alaa' || currentUser?.permissions?.canAddCustomer;
    const canEditCustomer = currentUser?.role === 'admin' || currentUser?.username.toLowerCase() === 'alaa' || currentUser?.permissions?.canEditCustomer;
    const canDeleteCustomer = currentUser?.role === 'admin' || currentUser?.username.toLowerCase() === 'alaa' || currentUser?.permissions?.canDeleteCustomer;

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.customerNumber.toLowerCase().includes(searchTerm.toLowerCase());
            
            // If customer has no type, treat as credit (backward compatibility)
            const customerType = c.type || 'credit';
            const matchesTab = customerType === activeTab;
            
            return matchesSearch && matchesTab;
        }).sort((a, b) => {
            const numA = parseInt(a.customerNumber) || 0;
            const numB = parseInt(b.customerNumber) || 0;
            return numA - numB;
        });
    }, [customers, searchTerm, activeTab]);

    const handleAdd = async () => {
        if (!newCustomer.name || !newCustomer.customerNumber) return;
        await onAdd({ ...newCustomer, type: activeTab });
        setNewCustomer({ customerNumber: '', name: '', phone: '', address: '', type: activeTab });
        setIsAdding(false);
    };

    const handleStartEdit = (customer: Customer) => {
        setEditingId(customer.id);
        setEditData({ ...customer });
        setDeletingId(null);
    };

    const handleSaveEdit = async () => {
        if (editingId && editData) {
            await onUpdate(editingId, editData);
            setEditingId(null);
            setEditData(null);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
    };

    const handleConfirmDelete = async (id: string) => {
        await onDelete(id);
        setDeletingId(null);
    };

    return (
        <div id="customers-page" className="w-full max-w-7xl mx-auto space-y-6 pt-2 sm:pt-6 min-h-screen pb-20 px-4 sm:px-6 lg:px-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-teal-600 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-teal-600 rounded-lg text-white shadow-lg">
                            <Users size={24} />
                        </div>
                        {activeTab === 'credit' ? 'Credit Customers' : 'Cash Customers'}
                    </h1>
                    <p className="text-teal-400 font-medium text-sm mt-1">
                        {activeTab === 'credit' ? 'Manage your corporate/credit accounts' : 'Manage your cash/on-the-spot customers'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex p-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                        <button
                            onClick={() => { setActiveTab('credit'); setIsAdding(false); }}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'credit' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Credit
                        </button>
                        <button
                            onClick={() => { setActiveTab('cash'); setIsAdding(false); }}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'cash' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Cash
                        </button>
                    </div>
                    {canAddCustomer && (
                        <button 
                            id="add-customer-btn"
                            onClick={() => setIsAdding(true)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <UserPlus size={18} />
                            Add {activeTab === 'credit' ? 'Credit' : 'Cash'} Customer
                        </button>
                    )}
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text"
                            placeholder={`Search ${activeTab} customers by name or ID...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                        />
                    </div>
                    <div className="text-xs font-bold text-gray-400 bg-gray-100/50 px-3 py-2 rounded-lg border border-gray-200">
                        Total {activeTab}: {filteredCustomers.length}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b border-gray-100 whitespace-nowrap">
                                <th className="px-6 py-4 w-24">ID No.</th>
                                <th className="px-6 py-4">Customer Name</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            <AnimatePresence mode="popLayout">
                                {isAdding && (
                                    <motion.tr 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-indigo-50/30"
                                    >
                                        <td className="px-6 py-4">
                                            <input 
                                                type="text" 
                                                placeholder="ID"
                                                value={newCustomer.customerNumber}
                                                onChange={(e) => setNewCustomer({...newCustomer, customerNumber: e.target.value})}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="text" 
                                                placeholder="Customer Name"
                                                value={newCustomer.name}
                                                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="text" 
                                                placeholder="Phone (Optional)"
                                                value={newCustomer.phone}
                                                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs font-semibold text-teal-600">
                                            Auto Active
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={handleAdd} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => setIsAdding(false)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )}
                            </AnimatePresence>

                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        {editingId === customer.id ? (
                                            <input 
                                                type="text" 
                                                value={editData?.customerNumber}
                                                onChange={(e) => setEditData({...editData!, customerNumber: e.target.value})}
                                                className="w-full border rounded px-2 py-1"
                                            />
                                        ) : customer.customerNumber}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-700">
                                        {editingId === customer.id ? (
                                            <input 
                                                type="text" 
                                                value={editData?.name}
                                                onChange={(e) => setEditData({...editData!, name: e.target.value})}
                                                className="w-full border rounded px-2 py-1"
                                            />
                                        ) : customer.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {editingId === customer.id ? (
                                            <input 
                                                type="text" 
                                                value={editData?.phone || ''}
                                                onChange={(e) => setEditData({...editData!, phone: e.target.value})}
                                                className="w-full border rounded px-2 py-1"
                                            />
                                        ) : (customer.phone || '—')}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {customer.isActive !== false ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                Locked
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === customer.id ? (
                                            <div className="flex gap-2">
                                                <button onClick={handleSaveEdit} className="p-1.5 bg-green-500 text-white rounded-lg">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : deletingId === customer.id ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleConfirmDelete(customer.id)} className="px-2 py-1 text-xs bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors">
                                                    Confirm
                                                </button>
                                                <button onClick={() => setDeletingId(null)} className="px-2 py-1 text-xs bg-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-300 transition-colors">
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 opacity-100 transition-opacity">
                                                {canEditCustomer && (
                                                    <button 
                                                        onClick={() => onUpdate(customer.id, { ...customer, isActive: customer.isActive === false })}
                                                        title={customer.isActive === false ? "Power On" : "Power Off"}
                                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${customer.isActive === false ? 'text-green-500 hover:text-green-600 hover:bg-green-50' : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'}`}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                )}
                                                {canEditCustomer && (
                                                    <button onClick={() => handleStartEdit(customer)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {canDeleteCustomer && (
                                                    <button onClick={() => handleDeleteClick(customer.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {filteredCustomers.length === 0 && !isAdding && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={48} className="text-gray-200" />
                                            <p>No customers found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Customers;
