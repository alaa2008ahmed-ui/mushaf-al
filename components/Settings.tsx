
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { MapPin, AlertTriangle, ShieldCheck, Lock, Unlock, Download, Upload, Users, Box, Truck, Car, Calendar, Hash, Database, Activity, ArrowLeft, Search, ClipboardList, Bell } from 'lucide-react';
import CryptoJS from 'crypto-js';
import LZString from 'lz-string';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Item, Employee, Branch, User, UserPermissions, AppSettings, Driver, Vehicle, Invoice, Customer } from '../types';

type SettingsCategory = 'users' | 'branches' | 'items' | 'drivers' | 'vehicles' | 'restrictions' | 'numbering' | 'data' | 'diagnostics' | null;
import { dualStorage, COLLECTIONS } from '../DualStorageService';
import { downloadBlob } from '../downloadUtils';
import CustomDatePicker from './ui/CustomDatePicker';

interface SettingsProps {
    customers: Customer[];
    items: Item[];
    branches: Branch[];
    users: User[];
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    onAddItem: (name: string, code?: string) => void;
    onUpdateItem: (id: string, name: string, code?: string) => void;
    onDeleteItem: (id: string) => void;
    onAddBranch: (name: string) => void;
    onDeleteBranch: (id: string) => void;
    onUpdateBranch: (id: string, name: string) => void;
    onAddUser: (user: User) => void;
    onUpdateUser: (id: string, user: User) => void;
    onDeleteUser: (id: string) => void;
    onClearInvoices: (branchId: string) => void;
    onRestoreDefaults?: () => void;
    drivers: Driver[];
    vehicles: Vehicle[];
    onAddDriver: (name: string) => void;
    onUpdateDriver: (id: string, name: string) => void;
    onDeleteDriver: (id: string) => void;
    onAddVehicle: (number: string) => void;
    onUpdateVehicle: (id: string, number: string) => void;
    onDeleteVehicle: (id: string) => void;
    canManageDrivers: boolean;
    canManageVehicles: boolean;
    currentUser: User | null;
    allSalesInvoices: Invoice[];
}

const Settings: React.FC<SettingsProps> = ({ 
    customers,
    items, 
    branches = [],
    users,
    settings,
    onUpdateSettings,
    onAddItem, 
    onUpdateItem,
    onDeleteItem,
    onAddBranch,
    onDeleteBranch,
    onUpdateBranch,
    onAddUser,
    onUpdateUser,
    onDeleteUser,
    onClearInvoices,
    onRestoreDefaults,
    drivers = [],
    vehicles = [],
    onAddDriver,
    onUpdateDriver,
    onDeleteDriver,
    onAddVehicle,
    onUpdateVehicle,
    onDeleteVehicle,
    canManageDrivers,
    canManageVehicles,
    currentUser,
    allSalesInvoices = []
}) => {
    const [activeCategory, setActiveCategory] = useState<SettingsCategory>(null);

    // Items State
    const [newItemName, setNewItemName] = useState('');
    const [newItemCode, setNewItemCode] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [tempItemName, setTempItemName] = useState('');
    const [tempItemCode, setTempItemCode] = useState('');
    
    // Branch State
    const [branchName, setBranchName] = useState('');
    const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

    // User Management State
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [tempUser, setTempUser] = useState<Partial<User>>({});
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [saveError, setSaveError] = useState<string | null>(null);

    // Clear Invoices State
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearPassword, setClearPassword] = useState('');
    const [clearStep, setClearStep] = useState<'password' | 'confirm'>('password');
    const [clearError, setClearError] = useState('');
    const [clearBranchId, setClearBranchId] = useState<string>('all');

    const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);
    const [migrationCount, setMigrationCount] = useState({ current: 0, total: 0 });
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationTargetBranch, setMigrationTargetBranch] = useState('');

    // Backup/Restore Encryption State
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [backupPass, setBackupPass] = useState('');
    const [backupAction, setBackupAction] = useState<'backup' | 'restore'>('backup');
    const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
    const [backupError, setBackupError] = useState<string | null>(null);

    // Driver State
    const [newDriverName, setNewDriverName] = useState('');
    const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
    const [tempDriverName, setTempDriverName] = useState('');

    const unassignedInvoices = useMemo(() => {
        return allSalesInvoices.filter(i => !i.branchId || !branches.find(b => b.id === i.branchId));
    }, [allSalesInvoices, branches]);

    const getLocalDateStr = (date: any) => {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const unassignedByDay = useMemo(() => {
        const groups: Record<string, { date: Date, count: number, total: number }> = {};
        unassignedInvoices.forEach(inv => {
            const dateStr = getLocalDateStr(inv.date);
            if (!groups[dateStr]) {
                groups[dateStr] = { 
                    date: inv.date instanceof Date ? inv.date : new Date(inv.date), 
                    count: 0, 
                    total: 0 
                };
            }
            groups[dateStr].count += 1;
            groups[dateStr].total += inv.total;
        });
        return Object.entries(groups)
            .map(([dateStr, stats]) => ({ dateStr, ...stats }))
            .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    }, [unassignedInvoices]);

    const handleStartMigration = async () => {
        if (!migrationTargetBranch) {
            alert('Please select a target branch first.');
            return;
        }

        if (unassignedInvoices.length === 0) {
            alert('No unclassified invoices found for transfer.');
            return;
        }

        setIsMigrating(true);
        setShowMigrationConfirm(false);
        setMigrationCount({ current: 0, total: unassignedInvoices.length });

        let successCount = 0;
        try {
            // Migrate invoice by invoice to ensure each one reaches the server
            for (let i = 0; i < unassignedInvoices.length; i++) {
                const inv = unassignedInvoices[i];
                // Ensure the new branchId is added
                const updatedInvoice = { 
                    ...inv, 
                    branchId: migrationTargetBranch,
                    updatedAt: new Date() // Update timestamp
                };
                
                await dualStorage.save(COLLECTIONS.SALES_INVOICES, inv.id, updatedInvoice);
                successCount++;
                setMigrationCount({ current: successCount, total: unassignedInvoices.length });
            }
            
            alert(`${successCount} invoices migrated successfully. Page will refresh now.`);
            // Final sync before reload
            await dualStorage.fullSyncFromCloud();
            window.location.reload();
        } catch (err) {
            console.error("Migration failed:", err);
            alert('Migration failed. Please check internet connection and try again.');
            setIsMigrating(false);
        }
    };

    // Vehicle State
    const [newVehicleNumber, setNewVehicleNumber] = useState('');
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const [tempVehicleNumber, setTempVehicleNumber] = useState('');

    // File Input Ref for Restore
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showUserModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showUserModal]);

    // --- User Logic ---
    const openAddUserModal = () => {
        setTempUser({
            id: `u-${Date.now()}`,
            username: '',
            password: '',
            role: 'user',
            permissions: {
                allowedPages: ['Daily Sales'],
                allowedBranches: [],
                canAddInvoice: true,
                canEditInvoice: false,
                canDeleteInvoice: false,
                canChangeInvoiceDate: false,
                canViewAccountStatement: false,
                canManageSettings: false,
                canCreatePO: true,
                canForceDeletePO: false,
                canEditPO: false,
                canDeletePO: false,
                canEditDriverLog: false,
                canDeleteDriverLog: false,
                manageDrivers: false,
                manageVehicles: false,
                canDeleteOrder: false,
                canViewAllOrders: false,
                showDeliveryConfirmationPopup: false,
                showOrderReceiptPopup: false,
                showReceiptDetailsPopup: false,
                receiveNewOrderAlert: false
            }
        });
        setEditUsername('');
        setEditPassword('');
        setEditingUserId(null);
        setCustomerSearchTerm('');
        setSaveError(null);
        setShowUserModal(true);
    };

    const openEditUserModal = (user: User) => {
        setTempUser({ ...user });
        setEditUsername(user.username);
        setEditPassword(user.password || '');
        setEditingUserId(user.id);
        setCustomerSearchTerm('');
        setSaveError(null);
        setShowUserModal(true);
    };

    const handleSaveUser = () => {
        console.log("Saving user:", { editUsername, editPassword, tempUser });
        setSaveError(null);

        if (!editUsername || !editPassword) {
            setSaveError('Username and Password are required');
            return;
        }

        const userData: User = {
            id: tempUser.id || `u-${Date.now()}`,
            username: editUsername,
            password: editPassword,
            role: tempUser.role || 'user',
            isActive: tempUser.isActive !== false, // Defaults to true
            permissions: {
                allowedPages: tempUser.permissions?.allowedPages || ['Daily Sales'],
                allowedBranches: tempUser.permissions?.allowedBranches || [],
                allowedOrderCustomers: tempUser.permissions?.allowedOrderCustomers,
                allowedOrderItems: tempUser.permissions?.allowedOrderItems,
                canAddInvoice: !!tempUser.permissions?.canAddInvoice,
                canEditInvoice: !!tempUser.permissions?.canEditInvoice,
                canDeleteInvoice: !!tempUser.permissions?.canDeleteInvoice,
                canChangeInvoiceDate: !!tempUser.permissions?.canChangeInvoiceDate,
                canViewAccountStatement: !!tempUser.permissions?.canViewAccountStatement,
                canManageSettings: !!tempUser.permissions?.canManageSettings,
                canCreatePO: !!tempUser.permissions?.canCreatePO,
                canForceDeletePO: !!tempUser.permissions?.canForceDeletePO,
                canEditPO: !!tempUser.permissions?.canEditPO,
                canDeletePO: !!tempUser.permissions?.canDeletePO,
                canEditDriverLog: !!tempUser.permissions?.canEditDriverLog,
                canDeleteDriverLog: !!tempUser.permissions?.canDeleteDriverLog,
                manageDrivers: !!tempUser.permissions?.manageDrivers,
                manageVehicles: !!tempUser.permissions?.manageVehicles,
                canDeleteOrder: !!tempUser.permissions?.canDeleteOrder,
                canViewAllOrders: !!tempUser.permissions?.canViewAllOrders,
                showDeliveryConfirmationPopup: tempUser.permissions?.showDeliveryConfirmationPopup !== false,
                showOrderReceiptPopup: tempUser.permissions?.showOrderReceiptPopup !== false,
                showReceiptDetailsPopup: tempUser.permissions?.showReceiptDetailsPopup !== false
            }
        };

        console.log("Final userData to save:", userData);

        if (editingUserId) {
            onUpdateUser(editingUserId, userData);
        } else {
            onAddUser(userData);
        }
        setShowUserModal(false);
    };

    const togglePagePermission = (page: string) => {
        if (!tempUser.permissions) return;
        const currentPages = tempUser.permissions.allowedPages;
        const newPages = currentPages.includes(page)
            ? currentPages.filter(p => p !== page)
            : [...currentPages, page];
        
        setTempUser({
            ...tempUser,
            permissions: { ...tempUser.permissions, allowedPages: newPages }
        });
    };

    const toggleBranchPermission = (branchId: string) => {
        if (!tempUser.permissions) return;
        const currentBranches = tempUser.permissions.allowedBranches;
        const newBranches = currentBranches.includes(branchId)
            ? currentBranches.filter(id => id !== branchId)
            : [...currentBranches, branchId];
        
        setTempUser({
            ...tempUser,
            permissions: { ...tempUser.permissions, allowedBranches: newBranches }
        });
    };

    // --- Clear Invoices Logic ---
    const handleClearInvoicesStart = () => {
        setClearPassword('');
        setClearError('');
        setClearStep('password');
        setShowClearModal(true);
    };

    const handleClearPasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (clearPassword === '0120301012') {
            setClearStep('confirm');
            setClearError('');
        } else {
            setClearError('Incorrect password');
        }
    };

    const handleConfirmClear = () => {
        if (onClearInvoices) {
            onClearInvoices(clearBranchId);
            setShowClearModal(false);
        }
    };

    // --- Items Logic ---
    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItemName.trim()) {
            onAddItem(newItemName.trim(), newItemCode.trim() || undefined);
            setNewItemName('');
            setNewItemCode('');
        }
    };

    const startEditItem = (item: Item) => {
        setEditingItemId(item.id);
        setTempItemName(item.name);
        setTempItemCode(item.code || '');
    };

    const cancelEditItem = () => {
        setEditingItemId(null);
        setTempItemName('');
        setTempItemCode('');
    };

    const saveEditItem = (id: string) => {
        if (tempItemName.trim()) {
            onUpdateItem(id, tempItemName.trim(), tempItemCode.trim() || undefined);
            setEditingItemId(null);
            setTempItemName('');
            setTempItemCode('');
        }
    };

    // --- Branches Logic ---
    const handleBranchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (branchName.trim()) {
            if (editingBranchId && onUpdateBranch) {
                onUpdateBranch(editingBranchId, branchName.trim());
                setEditingBranchId(null);
            } else if (onAddBranch) {
                onAddBranch(branchName.trim());
            }
            setBranchName('');
        }
    };

    const startEditBranch = (branch: Branch) => {
        setBranchName(branch.name);
        setEditingBranchId(branch.id);
    };

    const cancelEditBranch = () => {
        setBranchName('');
        setEditingBranchId(null);
    };

    // --- Backup & Restore Logic ---

    const handleBackup = async () => {
        try {
            const dataToBackup = dualStorage.exportAllData();
            const jsonString = JSON.stringify(dataToBackup);
            
            // First, compress the JSON string to extremely small size
            const compressed = LZString.compressToBase64(jsonString);
            
            // Get backup password from settings or fallback to default
            const backupPass = settings.autoBackupPassword || 'swc_backup';
            
            // Then, encrypt the compressed string
            const encrypted = CryptoJS.AES.encrypt(compressed, backupPass).toString();
            
            // Generate recovery code (Base64 obfuscated password so it is not forgotten)
            const recoveryCode = btoa(unescape(encodeURIComponent(backupPass)));

            // Wrap in a structured payload with compression metadata and recovery code
            const finalPayload = JSON.stringify({
                version: '2.5',
                encrypted: true,
                compressed: true,
                recoveryCode: recoveryCode,
                data: encrypted,
                timestamp: new Date().toISOString()
            });

            const blob = new Blob([finalPayload], { type: 'application/json' });
            
            const now = new Date();
            const yr = now.getFullYear();
            const mo = String(now.getMonth() + 1).padStart(2, '0');
            const dy = String(now.getDate()).padStart(2, '0');
            const hr = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const filename = `DailySales-${yr}-${mo}-${dy}-${hr}-${min}.json`;

            await downloadBlob(blob, filename, {
                description: 'Secure Compressed JSON Backup File',
                accept: { 'application/json': ['.json'] },
            });
        } catch (error) {
            console.error("Backup failed:", error);
            alert('Backup failed. Please try again.');
        }
    };

    const executeBackup = async () => {
        if (!backupPass.trim()) {
            setBackupError('Please enter a password to encrypt the file');
            return;
        }

        try {
            const dataToBackup = dualStorage.exportAllData();
            const jsonString = JSON.stringify(dataToBackup);
            
            // First, compress the JSON string to extremely small size
            const compressed = LZString.compressToBase64(jsonString);
            
            // Then, encrypt the compressed string
            const encrypted = CryptoJS.AES.encrypt(compressed, backupPass).toString();
            
            // Generate recovery code (Base64 obfuscated password so it is not forgotten)
            const recoveryCode = btoa(unescape(encodeURIComponent(backupPass)));

            // Wrap in a structured payload with compression metadata and recovery code
            const finalPayload = JSON.stringify({
                version: '2.5',
                encrypted: true,
                compressed: true,
                recoveryCode: recoveryCode,
                data: encrypted,
                timestamp: new Date().toISOString()
            });

            const blob = new Blob([finalPayload], { type: 'application/json' });
            
            const now = new Date();
            const yr = now.getFullYear();
            const mo = String(now.getMonth() + 1).padStart(2, '0');
            const dy = String(now.getDate()).padStart(2, '0');
            const hr = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const filename = `DailySales-${yr}-${mo}-${dy}-${hr}-${min}.json`;

            await downloadBlob(blob, filename, {
                description: 'Secure Compressed JSON Backup File',
                accept: { 'application/json': ['.json'] },
            });
            
            setShowBackupModal(false);
        } catch (error) {
            console.error("Backup failed:", error);
            setBackupError('Backup failed. Please try again.');
        }
    };

    const triggerRestore = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                
                // Try simple JSON parse first to see if it's already plain (for legacy)
                try {
                    const data = JSON.parse(content);
                    if (data && !data.encrypted) {
                        if (window.confirm('Legacy unencrypted file. Restore data? This will overwrite existing records.')) {
                            await dualStorage.importAllData(data);
                            alert('Data restored successfully. Page will reload.');
                            window.location.reload();
                            return;
                        }
                    }
                    
                    // If it is our structured encrypted format
                    if (data && data.encrypted) {
                        setRestoreFileContent(data.data);
                        setBackupAction('restore');
                        
                        let autoPass = '';
                        if (data.recoveryCode) {
                            try {
                                autoPass = decodeURIComponent(escape(atob(data.recoveryCode)));
                            } catch (e) {
                                console.log("Not in standard recovery code format:", e);
                            }
                        }

                        // If recoveryCode exists, try to automatically decrypt it first!
                        if (autoPass) {
                            try {
                                const bytes = CryptoJS.AES.decrypt(data.data, autoPass);
                                const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
                                
                                if (decryptedString) {
                                    let finalDataString = decryptedString;
                                    try {
                                        const decompressed = LZString.decompressFromBase64(decryptedString);
                                        if (decompressed && (decompressed.trim().startsWith('{') || decompressed.trim().startsWith('['))) {
                                            finalDataString = decompressed;
                                        }
                                    } catch (decompError) {
                                        console.log("Decompression failed, using raw:", decompError);
                                    }

                                    const parsedData = JSON.parse(finalDataString);
                                    if (window.confirm('Secure encrypted backup verified and decrypted successfully. Restore data? This will overwrite existing records.')) {
                                        await dualStorage.importAllData(parsedData);
                                        alert('Data restored successfully. Page will reload.');
                                        window.location.reload();
                                        return;
                                    }
                                }
                            } catch (autoDecryptErr) {
                                console.error("Auto decryption failed:", autoDecryptErr);
                            }
                        }

                        // Otherwise show manual password modal and pre-fill backupPass
                        setBackupPass(autoPass);
                        setBackupError(null);
                        setShowBackupModal(true);
                        return;
                    }
                } catch (e) {
                    // Not a valid JSON or weird format, maybe it's just raw encrypted string?
                    // We'll treat it as encrypted
                    setRestoreFileContent(content);
                    setBackupAction('restore');
                    setBackupPass('');
                    setBackupError(null);
                    setShowBackupModal(true);
                }
            } catch (error) {
                console.error("Restore failed:", error);
                alert('Failed to read file. Please ensure it is a valid backup file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const executeRestore = async () => {
        if (!restoreFileContent || !backupPass.trim()) {
            setBackupError('Please enter password to decrypt');
            return;
        }

        try {
            // Decrypt the payload
            const bytes = CryptoJS.AES.decrypt(restoreFileContent, backupPass);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedString) {
                setBackupError('Incorrect password or corrupted file');
                return;
            }

            let finalDataString = decryptedString;

            // Check if it's compressed (by checking if LzString successfully decompresses it to valid JSON)
            try {
                const decompressed = LZString.decompressFromBase64(decryptedString);
                if (decompressed && (decompressed.trim().startsWith('{') || decompressed.trim().startsWith('['))) {
                    finalDataString = decompressed;
                }
            } catch (decompError) {
                console.log("Not in compressed format, treating as legacy raw string:", decompError);
            }

            const data = JSON.parse(finalDataString);

            if (window.confirm('Decryption and decompression successful. Overwrite current data with this backup?')) {
                await dualStorage.importAllData(data);
                alert('Data restored successfully. Page will reload.');
                window.location.reload();
            }
        } catch (error) {
            console.error("Decryption/Restore failed:", error);
            setBackupError('Decryption/Restore failed. Please check your password or file integrity.');
        }
    };

    const categories = useMemo(() => {
        const cats = [
            { id: 'users', title: 'Users & Permissions', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Manage user accounts, roles, and access levels.' },
            { id: 'branches', title: 'Branches', icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Add, edit or delete business branches.' },
            { id: 'items', title: 'Items / Categories', icon: Box, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Manage product catalog and item codes.' },
            { id: 'drivers', title: 'Drivers List', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Maintain driver records and IDs.' },
            { id: 'vehicles', title: 'Vehicles List', icon: Car, color: 'text-teal-600', bg: 'bg-teal-50', desc: 'Manage vehicle numbers and identification.' },
            { id: 'restrictions', title: 'System Restrictions', icon: Calendar, color: 'text-red-600', bg: 'bg-red-50', desc: 'Control registration ranges and archive periods.' },
            { id: 'numbering', title: 'Invoice Numbering', icon: Hash, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Set starting numbers and auto-counter logic.' },
            { id: 'data', title: 'Data Management', icon: Database, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Backup, restore, or clear system databases.' },
        ];

        if (currentUser?.id === 'admin' || currentUser?.id === 'alaa-hidden') {
            cats.push({ id: 'diagnostics', title: 'Diagnostics', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Verify data integrity and sync status.' });
        }

        return cats;
    }, [currentUser]);

    const sortedBranches = useMemo(() => {
        const result = [...branches];
        result.sort((a, b) => {
            if (a.id === 'b3') return -1;
            if (b.id === 'b3') return 1;
            return a.name.localeCompare(b.name);
        });
        return result;
    }, [branches]);

    const handleDateChange = (dateStr: string, field: keyof AppSettings) => {
        const localDate = dateStr ? new Date(`${dateStr}T00:00:00`) : null;
        onUpdateSettings({
            ...settings,
            [field]: localDate
        });
    };

    const formatDateForInput = (date: any) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const triggerTestNotification = async () => {
        const getLocalDateString = (d: Date = new Date()) => {
            const yr = d.getFullYear();
            const mo = d.getMonth() + 1;
            const dy = d.getDate();
            return `${yr}-${mo < 10 ? '0' + mo : mo}-${dy < 10 ? '0' + dy : dy}`;
        };

        const todayStr = getLocalDateString();
        const todayInvoices = allSalesInvoices.filter(inv => {
            const invDateStr = getLocalDateString(new Date(inv.date));
            return invDateStr === todayStr;
        });

        const branchSummaries: string[] = [];
        let grandTotal = 0;

        sortedBranches.forEach(b => {
            const bInvs = todayInvoices.filter(inv => inv.branchId === b.id);
            const bTotal = bInvs.reduce((sum, i) => sum + i.total, 0);
            
            grandTotal += bTotal;
            
            branchSummaries.push(`${b.name} : ${bTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال`);
        });

        const bodyText = [
            ...branchSummaries,
            `اجمالي المبيعات : ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال`,
            `لمعرفة التفاصيل اضغط هنا`
        ].join('\n');

        if (Capacitor.isNativePlatform()) {
            try {
                let status = await LocalNotifications.checkPermissions();
                if (status.display !== 'granted') {
                    status = await LocalNotifications.requestPermissions();
                }
                if (status.display === 'granted') {
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: 'ملخص المبيعات اليومية لشركة المياه العذبة المحدودة',
                                body: bodyText,
                                id: 1002,
                                schedule: { at: new Date(Date.now() + 50) },
                                sound: undefined,
                                attachments: undefined,
                                actionTypeId: "",
                                extra: null
                            }
                        ]
                    });
                } else {
                    alert('يرجى تفعيل صلاحية الإشعارات للتطبيق في إعدادات الهاتف لتتمكن من تلقي الإشعارات.');
                }
            } catch (err) {
                console.error('Failed to trigger native local notification', err);
                alert('فشل في إرسال الإشعار المحلي.');
            }
        } else {
            // Web browser test simulation
            if (!('Notification' in window)) {
                alert('هذا المتصفح أو الجهاز لا يدعم الإشعارات الذكية.');
                return;
            }

            window.Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new window.Notification('ملخص المبيعات اليومية لشركة المياه العذبة المحدودة', {
                        body: bodyText,
                        icon: '/favicon.ico',
                        tag: 'daily-sales-summary-test',
                        requireInteraction: true
                    });
                } else {
                    alert('يرجى تفعيل صلاحية الإشعارات للموقع في إعدادات التطبيق أو الهاتف لتتمكن من استلام الملخص اليومي.');
                }
            });
        }
    };

    return (
        <div className="px-2 pt-2 pb-8 sm:px-6 lg:px-8 overflow-hidden">
            <div className="bg-white rounded-xl shadow-xl p-0 overflow-hidden border border-gray-100 h-full min-h-[600px]">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {activeCategory && (
                            <button 
                                onClick={() => setActiveCategory(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors group"
                                title="Back to Settings"
                            >
                                <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                {activeCategory ? categories.find(c => c.id === activeCategory)?.title : 'System Settings'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {activeCategory 
                                    ? categories.find(c => c.id === activeCategory)?.desc 
                                    : 'Configure and manage your application systems.'}
                            </p>
                        </div>
                    </div>
                </div>
            
                <div className="p-6">
                    {!activeCategory ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {categories.map((cat) => (
                                <motion.button
                                    key={cat.id}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveCategory(cat.id as SettingsCategory)}
                                    className="flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left h-full"
                                >
                                    <div className={`${cat.bg} p-4 rounded-2xl mb-4`}>
                                        <cat.icon className={`w-8 h-8 ${cat.color}`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{cat.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{cat.desc}</p>
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            {/* Navigation Header */}
                            <button 
                                onClick={() => setActiveCategory(null)}
                                className="mb-8 flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors group"
                            >
                                <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </div>
                                <span>Back to Categories</span>
                            </button>

                            {/* Categories rendering */}
                            {activeCategory === 'branches' && (
                                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Branches</h3>
                    
                    {/* Add/Edit Branch Form */}
                    <form onSubmit={handleBranchSubmit} className="flex gap-2 mb-4">
                        <div className="flex-1 flex gap-1">
                            <input
                                type="text"
                                value={branchName}
                                onChange={(e) => setBranchName(e.target.value)}
                                placeholder={editingBranchId ? "Edit Branch Name" : "New Branch Name"}
                                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            {editingBranchId && (
                                <button
                                    type="button"
                                    onClick={cancelEditBranch}
                                    className="bg-gray-400 text-white px-2 rounded-md text-xs hover:bg-gray-500"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button 
                            type="submit"
                            disabled={!branchName.trim()}
                            className={`px-4 py-2 rounded-md text-sm font-semibold text-white disabled:bg-gray-400 ${editingBranchId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {editingBranchId ? 'Save' : 'Add'}
                        </button>
                    </form>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                        {sortedBranches.length > 0 ? (
                            <ul className="space-y-2">
                                {sortedBranches.map(branch => (
                                    <li key={branch.id} className="p-2 bg-white border rounded-md shadow-sm text-gray-800 flex justify-between items-center group">
                                        <span>{branch.name}</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => startEditBranch(branch)}
                                                className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                                                title="Edit Branch"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => onDeleteBranch && onDeleteBranch(branch.id)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                title="Delete Branch"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No branches configured.</p>
                        )}
                    </div>
                                </div>
                            )}

                            {activeCategory === 'items' && (
                                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Items / Categories</h3>
                    
                    {/* Add Item Form */}
                    <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newItemCode}
                            onChange={(e) => setNewItemCode(e.target.value)}
                            placeholder="Code"
                            className="w-20 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="New Item Name"
                            className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button 
                            type="submit"
                            disabled={!newItemName.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            Add
                        </button>
                    </form>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                        {items.length > 0 ? (
                            <ul className="space-y-2">
                                {items.map(item => (
                                    <li key={item.id} className="p-2 bg-white border rounded-md shadow-sm text-gray-800 flex justify-between items-center gap-2">
                                        {editingItemId === item.id ? (
                                            <>
                                                <input 
                                                    type="text" 
                                                    value={tempItemCode} 
                                                    onChange={(e) => setTempItemCode(e.target.value)}
                                                    placeholder="Code"
                                                    className="w-16 border border-gray-300 rounded px-1 py-0.5 text-sm"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={tempItemName} 
                                                    onChange={(e) => setTempItemName(e.target.value)}
                                                    className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-sm"
                                                />
                                            </>
                                        ) : (
                                            <span className="truncate flex-1" title={item.name}>
                                                {item.code && <span className="text-xs font-mono text-gray-500 mr-2 border border-gray-200 bg-gray-50 px-1 rounded">{item.code}</span>}
                                                {item.name}
                                            </span>
                                        )}
                                        
                                        <div className="flex gap-1 shrink-0">
                                            {item.id !== 'cancel' && (
                                                <>
                                                    {editingItemId === item.id ? (
                                                        <>
                                                            <button 
                                                                onClick={() => saveEditItem(item.id)}
                                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                                title="Save"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button 
                                                                onClick={cancelEditItem}
                                                                className="text-gray-500 hover:text-gray-700 p-1"
                                                                title="Cancel"
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => startEditItem(item)}
                                                            className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                                                            title="Edit Item"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    
                                                    <button 
                                                        onClick={() => onDeleteItem(item.id)}
                                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                        title="Delete Item"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No items configured.</p>
                        )}
                    </div>
                                </div>
                            )}

                            {activeCategory === 'users' && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Users & Permissions</h3>
                                    <button 
                                        onClick={openAddUserModal}
                                        className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Add New User
                                    </button>

                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                        {users.filter(u => u.username.toLowerCase() !== 'alaa').length > 0 ? (
                                            <ul className="space-y-2">
                                                {users.filter(u => u.username.toLowerCase() !== 'alaa').map(user => (
                                                    <li key={user.id} className={`p-3 bg-white border rounded-md shadow-sm flex justify-between items-center ${user.isActive === false ? 'opacity-60 bg-gray-50' : 'text-gray-800'}`}>
                                                        <div>
                                                            <p className="font-bold flex items-center gap-2">
                                                                {user.username}
                                                                {user.isActive === false && (
                                                                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Inactive</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-gray-500 uppercase">{user.role}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const updatedUser = { ...user, isActive: user.isActive === false ? true : false };
                                                                    onUpdateUser(updatedUser.id, updatedUser);
                                                                }}
                                                                className={`p-1 rounded text-sm font-bold px-3 transition-colors ${user.isActive === false ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                                title={user.isActive === false ? "Activate User" : "Deactivate User"}
                                                            >
                                                                {user.isActive === false ? 'Activate' : 'Deactivate'}
                                                            </button>
                                                            <button 
                                                                onClick={() => openEditUserModal(user)}
                                                                className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                                                                title="Edit User"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                </svg>
                                                            </button>
                                                            {user.id !== 'admin' && (
                                                                <button 
                                                                    onClick={() => onDeleteUser(user.id)}
                                                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                                    title="Delete User"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500">No users configured.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeCategory === 'restrictions' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Invoice Registration Restriction Section */}
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-blue-900">Registration Range</h3>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={settings.restrictRegistration}
                                                        onChange={(e) => onUpdateSettings({...settings, restrictRegistration: e.target.checked})}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700">Enable Restriction</span>
                                                </label>

                                                <div className={`grid grid-cols-2 gap-2 transition-opacity duration-300 ${!settings.restrictRegistration ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">From</label>
                                                        <CustomDatePicker
                                                            value={formatDateForInput(settings.registrationStartDate)}
                                                            onChange={(val) => handleDateChange(val, 'registrationStartDate')}
                                                            themeColor="#2563eb"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">To</label>
                                                        <CustomDatePicker
                                                            value={formatDateForInput(settings.registrationEndDate)}
                                                            onChange={(val) => handleDateChange(val, 'registrationEndDate')}
                                                            themeColor="#2563eb"
                                                            align="right"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-blue-600 mt-1 italic">
                                                    * Prevents adding invoices outside this range.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Invoice Modification Restriction Section */}
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="bg-red-600 p-1.5 rounded-lg text-white">
                                                    <Lock className="h-5 w-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-red-900">Archive Protection</h3>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-lg border border-red-100 hover:bg-red-50 transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={settings.restrictModification}
                                                        onChange={(e) => onUpdateSettings({...settings, restrictModification: e.target.checked})}
                                                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700">Restrict Edit/Delete</span>
                                                </label>

                                                <div className={`grid grid-cols-2 gap-2 transition-opacity duration-300 ${!settings.restrictModification ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">From</label>
                                                        <CustomDatePicker
                                                            value={formatDateForInput(settings.modificationStartDate)}
                                                            onChange={(val) => handleDateChange(val, 'modificationStartDate')}
                                                            themeColor="#dc2626"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">To</label>
                                                        <CustomDatePicker
                                                            value={formatDateForInput(settings.modificationEndDate)}
                                                            onChange={(val) => handleDateChange(val, 'modificationEndDate')}
                                                            themeColor="#dc2626"
                                                            align="right"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-red-600 mt-1 italic">
                                                    * Prevents modifying invoices within this range.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Flow System Section */}
                                    <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
                                                <ClipboardList className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-emerald-950">Order System</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <p className="text-sm text-emerald-900 font-semibold">
                                                Select how user orders are processed:
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateSettings({...settings, directOrderFlow: false})}
                                                    className={`p-4 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between shadow-sm cursor-pointer ${!settings.directOrderFlow ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="text-sm font-bold">Approval Mode</span>
                                                        <span className="text-[11px] opacity-90 font-medium">Requires admin approval in "Order Approvals"</span>
                                                    </div>
                                                    {!settings.directOrderFlow && <span className="bg-white text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold">Active</span>}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateSettings({...settings, directOrderFlow: true})}
                                                    className={`p-4 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between shadow-sm cursor-pointer ${settings.directOrderFlow ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="text-sm font-bold">Direct Mode</span>
                                                        <span className="text-[11px] opacity-90 font-medium">Orders bypass approval directly to Daily Sales</span>
                                                    </div>
                                                    {settings.directOrderFlow && <span className="bg-white text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold">Active</span>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Daily Sales Notification System Section */}
                                    <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-orange-600 p-1.5 rounded-lg text-white">
                                                <Bell className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-orange-950">Daily Sales Notification Summary</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                                                <label className="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-orange-50 rounded-lg transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={!!settings.dailyNotificationEnabled}
                                                        onChange={(e) => {
                                                            const enabled = e.target.checked;
                                                            onUpdateSettings({
                                                                ...settings,
                                                                dailyNotificationEnabled: enabled,
                                                                dailyNotificationTime: settings.dailyNotificationTime || '18:00'
                                                            });
                                                            if (enabled) {
                                                                if (Capacitor.isNativePlatform()) {
                                                                    LocalNotifications.requestPermissions().then(permission => {
                                                                        console.log("Capacitor notification permission:", permission.display);
                                                                    }).catch(err => {
                                                                        console.error("Capacitor permission error:", err);
                                                                    });
                                                                } else {
                                                                    if ('Notification' in window) {
                                                                        window.Notification.requestPermission().then(permission => {
                                                                            if (permission === 'granted') {
                                                                                console.log("Notification permission granted!");
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700">Enable Daily Smart Notifications</span>
                                                </label>

                                                {settings.dailyNotificationEnabled && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-500">Delivery Time:</span>
                                                        <input 
                                                            type="time"
                                                            value={settings.dailyNotificationTime || '18:00'}
                                                            onChange={(e) => onUpdateSettings({
                                                                ...settings,
                                                                dailyNotificationTime: e.target.value
                                                            })}
                                                            className="border border-orange-200 rounded-md p-1 px-2 text-sm text-gray-700 font-bold focus:ring-orange-500 focus:border-orange-500"
                                                        />
                                                    </div>
                                                )}
                                                
                                                <button
                                                    type="button"
                                                    onClick={triggerTestNotification}
                                                    className="md:ml-auto text-xs font-bold bg-orange-100 hover:bg-orange-200 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg transition-all"
                                                >
                                                    Test Notification Now 🔔
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeCategory === 'numbering' && (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-amber-600 p-1.5 rounded-lg text-white">
                                                <Hash className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-amber-900">Invoice Numbering Control</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {/* Manual Entry Selection Buttons */}
                                            <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm mb-4">
                                                <h4 className="text-sm font-bold text-gray-700 mb-3">Cash Invoice Numbering Mode</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onUpdateSettings({...settings, manualInvoiceNumber: true})}
                                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${settings.manualInvoiceNumber ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                                    >
                                                        Manual Entry
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onUpdateSettings({...settings, manualInvoiceNumber: false})}
                                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${!settings.manualInvoiceNumber ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                                    >
                                                        Automatic
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-2 italic">
                                                    * Manual: Allow editing the cash invoice number field.<br/>
                                                    * Automatic: Logic handles numbering based on branch counters.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {branches.map(branch => {
                                                    const branchNext = settings.nextInvoiceNumbers?.[branch.id] || { cash: 1, credit: 1 };
                                                    return (
                                                        <div key={branch.id} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                                            <h4 className="text-sm font-bold text-gray-700 mb-2 truncate" title={branch.name}>{branch.name}</h4>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Cash Next No.</label>
                                                                    <input 
                                                                        type="number"
                                                                        value={branchNext.cash ?? 1}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value, 10) || 1;
                                                                            const updatedNext = { ...(settings.nextInvoiceNumbers || {}) };
                                                                            updatedNext[branch.id] = { ...branchNext, cash: val };
                                                                            onUpdateSettings({ ...settings, nextInvoiceNumbers: updatedNext });
                                                                        }}
                                                                        className="w-full border border-gray-300 rounded p-1.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                                                        min="1"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Credit Next No.</label>
                                                                    <input 
                                                                        type="number"
                                                                        value={branchNext.credit ?? 1}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value, 10) || 1;
                                                                            const updatedNext = { ...(settings.nextInvoiceNumbers || {}) };
                                                                            updatedNext[branch.id] = { ...branchNext, credit: val };
                                                                            onUpdateSettings({ ...settings, nextInvoiceNumbers: updatedNext });
                                                                        }}
                                                                        className="w-full border border-gray-300 rounded p-1.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                                                        min="1"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeCategory === 'diagnostics' && (
                                <div className="space-y-6">
                                    <p className="text-xs text-red-800 font-bold mb-3 uppercase tracking-wider">Branch Data Verification</p>
                                    <table className="min-w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-red-200">
                                                <th className="py-2 font-black text-red-900">Branch Name</th>
                                                <th className="py-2 font-black text-red-900">ID</th>
                                                <th className="py-2 font-black text-red-900">Inv Count</th>
                                                <th className="py-2 font-black text-red-900">Total SAR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-100">
                                            {branches.map(b => {
                                                const invs = allSalesInvoices.filter(i => i.branchId === b.id);
                                                return (
                                                    <tr key={b.id}>
                                                        <td className="py-2 font-bold text-red-800">{b.name}</td>
                                                        <td className="py-2 font-mono text-gray-500">{b.id}</td>
                                                        <td className="py-2 font-black text-red-900">{invs.length}</td>
                                                        <td className="py-2 font-black text-red-900">{invs.reduce((s, i) => s + i.total, 0).toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Catch unassigned */}
                                            {(() => {
                                                const unassigned = allSalesInvoices.filter(i => !i.branchId || !branches.find(b => b.id === i.branchId));
                                                if (unassigned.length > 0) {
                                                    return (
                                                        <tr className="bg-red-200/50">
                                                            <td className="py-2 font-black text-red-700 italic">Unassigned/Lost</td>
                                                            <td className="py-2 font-mono text-gray-400">null/none</td>
                                                            <td className="py-2 font-black text-red-900">{unassigned.length}</td>
                                                            <td className="py-2 font-black text-red-900">{unassigned.reduce((s, i) => s + i.total, 0).toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </tbody>
                                    </table>
                                    <div className="mt-4 flex flex-col gap-3 p-4 bg-white rounded-xl border border-red-200 shadow-inner">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-red-700 font-black uppercase tracking-widest flex items-center gap-1">
                                                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                                                Data Migration Tool
                                            </p>
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">ALPHA TOOL</span>
                                        </div>

                                        {/* Daily Breakdown for Unassigned */}
                                        <div className="max-h-52 overflow-y-auto border border-red-50 rounded-xl bg-red-50/20 p-2 space-y-1">
                                            <p className="text-[9px] font-black text-red-400 uppercase mb-1 px-1 tracking-tighter">Unassigned Records Daily Distribution</p>
                                            {unassignedByDay.length > 0 ? (
                                                unassignedByDay.map(day => (
                                                    <div key={day.dateStr} className="flex justify-between items-center bg-white p-2 rounded-lg border border-red-100 shadow-sm transition-all hover:bg-red-50/30">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-red-900">{day.dateStr}</span>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{day.date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[11px] font-black text-red-900 block">{day.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR</span>
                                                            <span className="text-[10px] font-bold text-red-500 uppercase">{day.count} Invoices</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-4 text-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase italic">NO UNASSIGNED INVOICES FOUND</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {!isMigrating ? (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                                    <select 
                                                        value={migrationTargetBranch}
                                                        onChange={(e) => setMigrationTargetBranch(e.target.value)}
                                                        className="text-xs border-2 border-red-100 rounded-lg px-3 py-2 bg-white font-black text-red-900 focus:outline-none focus:border-red-400 transition-colors"
                                                    >
                                                        <option value="">Move selected data to...</option>
                                                        {branches.map(b => (
                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => unassignedInvoices.length > 0 && migrationTargetBranch && setShowMigrationConfirm(true)}
                                                            disabled={!migrationTargetBranch || unassignedInvoices.length === 0}
                                                            className="flex-1 sm:flex-none bg-red-700 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-red-800 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                                        >
                                                            Process Transfer
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const dammam = branches.find(b => b.name.toLowerCase().includes('dammam') || b.id === 'b1');
                                                                if (dammam) {
                                                                    setMigrationTargetBranch(dammam.id);
                                                                    setShowMigrationConfirm(true);
                                                                }
                                                            }}
                                                            disabled={unassignedInvoices.length === 0}
                                                            className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 shadow-md"
                                                        >
                                                            Quick Move to Dammam
                                                        </button>
                                                    </div>
                                                </div>

                                                {showMigrationConfirm && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }} 
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-white p-4 rounded-xl border-2 border-red-200 shadow-xl"
                                                    >
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="bg-red-100 p-2 rounded-full">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-red-900">Transfer Confirmation</p>
                                                                <p className="text-[10px] text-red-600">You are about to re-assign {unassignedInvoices.length} invoices to <b>{branches.find(b => b.id === migrationTargetBranch)?.name}</b>.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={handleStartMigration}
                                                                className="bg-red-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-700 shadow-lg"
                                                            >
                                                                CONFIRM & TRANSFER
                                                            </button>
                                                            <button 
                                                                onClick={() => setShowMigrationConfirm(false)}
                                                                className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-gray-300"
                                                            >
                                                                CANCEL
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3 py-2">
                                                <div className="flex justify-between items-center text-xs font-black text-red-900">
                                                    <span>MIGRATING DATA...</span>
                                                    <span>{migrationCount.current} / {migrationCount.total}</span>
                                                </div>
                                                <div className="w-full bg-red-100 rounded-full h-3 overflow-hidden border border-red-200">
                                                    <div 
                                                        className="bg-red-600 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                                        style={{ width: `${(migrationCount.current / migrationCount.total) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-[10px] text-red-600 font-bold animate-pulse text-center">DO NOT CLOSE OR REFRESH THIS PAGE</p>
                                            </div>
                                        )}
                                        
                                        <div className="bg-red-50 p-2 rounded-lg border border-red-100/50">
                                            <p className="text-[9px] text-red-700 font-bold leading-tight flex items-start gap-2">
                                                <span className="shrink-0 mt-0.5">⚠️</span>
                                                <span>This will permanently assign the selected branch ID to all invoices currently showing as "Unassigned" (missing Branch ID). Use with caution.</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                         <button 
                                            type="button"
                                            onClick={() => {
                                                alert(`Diagnostics: \nDammam (b1): ${allSalesInvoices.filter(i => i.branchId === 'b1').length} invoices \nTotal: ${allSalesInvoices.length}`);
                                            }}
                                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase hover:bg-red-700 shadow-sm"
                                        >
                                            Show Summary Info
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeCategory === 'drivers' && (
                                <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-blue-900">Drivers Management</h3>
                        </div>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (newDriverName.trim()) {
                                onAddDriver(newDriverName.trim());
                                setNewDriverName('');
                            }
                        }} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newDriverName}
                                onChange={(e) => setNewDriverName(e.target.value)}
                                placeholder="New Driver Name"
                                className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button 
                                type="submit"
                                disabled={!newDriverName.trim()}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                Add
                            </button>
                        </form>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {drivers.length > 0 ? (
                                drivers.map(driver => (
                                    <div key={driver.id} className="p-2 bg-gray-50 border rounded-md shadow-sm text-gray-800 flex justify-between items-center gap-2">
                                        {editingDriverId === driver.id ? (
                                            <input 
                                                type="text" 
                                                value={tempDriverName} 
                                                onChange={(e) => setTempDriverName(e.target.value)}
                                                className="flex-1 border border-primary rounded px-1 py-0.5 text-sm"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="truncate flex-1">
                                                <span className="text-xs font-mono text-gray-500 mr-2 border border-gray-200 bg-gray-100 px-1 rounded">{driver.driverId}</span>
                                                {driver.driverName}
                                            </span>
                                        )}
                                        
                                        <div className="flex gap-1 shrink-0">
                                            {editingDriverId === driver.id ? (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            onUpdateDriver(driver.id, tempDriverName);
                                                            setEditingDriverId(null);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 p-1"
                                                        title="Save"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingDriverId(null)}
                                                        className="text-gray-500 hover:text-gray-700 p-1"
                                                        title="Cancel"
                                                    >
                                                        ✕
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            setEditingDriverId(driver.id);
                                                            setTempDriverName(driver.driverName);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-black/5"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" opacity={0.6} viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteDriver(driver.id)}
                                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" opacity={0.6} viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-blue-600 italic text-center">No drivers found.</p>
                            )}
                        </div>
                    </div>
                )}

                            {activeCategory === 'vehicles' && (
                                <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-teal-600 p-1.5 rounded-lg text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-teal-900">Vehicles Management</h3>
                        </div>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (newVehicleNumber.trim()) {
                                onAddVehicle(newVehicleNumber.trim());
                                setNewVehicleNumber('');
                            }
                        }} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newVehicleNumber}
                                onChange={(e) => setNewVehicleNumber(e.target.value)}
                                placeholder="New Vehicle Number"
                                className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            />
                            <button 
                                type="submit"
                                disabled={!newVehicleNumber.trim()}
                                className="bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-teal-700 disabled:bg-gray-400"
                            >
                                Add
                            </button>
                        </form>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {vehicles.length > 0 ? (
                                vehicles.map(vehicle => (
                                    <div key={vehicle.id} className="p-2 bg-gray-50 border rounded-md shadow-sm text-gray-800 flex justify-between items-center gap-2">
                                        {editingVehicleId === vehicle.id ? (
                                            <input 
                                                type="text" 
                                                value={tempVehicleNumber} 
                                                onChange={(e) => setTempVehicleNumber(e.target.value)}
                                                className="flex-1 border border-primary rounded px-1 py-0.5 text-sm"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="truncate flex-1">
                                                <span className="text-xs font-mono text-gray-500 mr-2 border border-gray-200 bg-gray-100 px-1 rounded">{vehicle.vehicleId}</span>
                                                {vehicle.vehicleNumber}
                                            </span>
                                        )}
                                        
                                        <div className="flex gap-1 shrink-0">
                                            {editingVehicleId === vehicle.id ? (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            onUpdateVehicle(vehicle.id, tempVehicleNumber);
                                                            setEditingVehicleId(null);
                                                        }}
                                                        className="text-teal-600 hover:text-teal-800 p-1"
                                                        title="Save"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingVehicleId(null)}
                                                        className="text-gray-500 hover:text-gray-700 p-1"
                                                        title="Cancel"
                                                    >
                                                        ✕
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            setEditingVehicleId(vehicle.id);
                                                            setTempVehicleNumber(vehicle.vehicleNumber);
                                                        }}
                                                        className="text-teal-500 hover:text-teal-700 p-1 rounded hover:bg-black/5"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" opacity={0.6} viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteVehicle(vehicle.id)}
                                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" opacity={0.6} viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-teal-600 italic text-center">No vehicles found.</p>
                            )}
                        </div>
                    </div>
                )}

                            {activeCategory === 'data' && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Data Management</h3>

                                    {/* Automatic Backup Section */}
                                    <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 shadow-sm mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-purple-600 p-1.5 rounded-lg text-white">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.25a1 1 0 11-2 0V13.003a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-purple-950">Automatic Backup Setup</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm space-y-4 text-left" dir="ltr">
                                                <div className="flex items-center gap-2.5 cursor-pointer p-1 rounded-lg">
                                                    <input 
                                                        type="checkbox"
                                                        id="autoBackupEnabled"
                                                        checked={!!settings.autoBackupEnabled}
                                                        onChange={(e) => onUpdateSettings({
                                                            ...settings,
                                                            autoBackupEnabled: e.target.checked,
                                                            autoBackupTime: settings.autoBackupTime || '22:00',
                                                            autoBackupFrequency: settings.autoBackupFrequency || 'daily',
                                                            autoBackupPassword: settings.autoBackupPassword || 'swc_backup'
                                                        })}
                                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                    />
                                                    <label htmlFor="autoBackupEnabled" className="text-sm font-bold text-gray-700 cursor-pointer">
                                                        Enable Scheduled Auto Backup
                                                    </label>
                                                </div>

                                                {settings.autoBackupEnabled && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-purple-100">
                                                        {/* Frequency selection */}
                                                        <div className="flex flex-col gap-1 text-left">
                                                            <span className="text-xs font-bold text-gray-500 mb-1">Backup Frequency:</span>
                                                            <select 
                                                                value={settings.autoBackupFrequency || 'daily'}
                                                                onChange={(e) => onUpdateSettings({
                                                                    ...settings,
                                                                    autoBackupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                                                                })}
                                                                className="border border-purple-200 rounded-md p-2 text-sm text-gray-700 font-semibold focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                            >
                                                                <option value="daily">Daily</option>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="monthly">Monthly</option>
                                                            </select>
                                                        </div>

                                                        {/* Time input */}
                                                        <div className="flex flex-col gap-1 text-left">
                                                            <span className="text-xs font-bold text-gray-500 mb-1">Backup Run Time:</span>
                                                            <input 
                                                                type="time"
                                                                value={settings.autoBackupTime || '22:00'}
                                                                onChange={(e) => onUpdateSettings({
                                                                    ...settings,
                                                                    autoBackupTime: e.target.value
                                                                })}
                                                                className="border border-purple-200 rounded-md p-2 text-sm text-gray-700 font-bold focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                            />
                                                        </div>

                                                        {/* Conditional Days parameters based on frequency */}
                                                        {settings.autoBackupFrequency === 'weekly' && (
                                                            <div className="flex flex-col gap-1 text-left">
                                                                <span className="text-xs font-bold text-gray-500 mb-1">Weekly Backup Day:</span>
                                                                <select 
                                                                    value={settings.autoBackupDayOfWeek !== undefined ? settings.autoBackupDayOfWeek : 5}
                                                                    onChange={(e) => onUpdateSettings({
                                                                        ...settings,
                                                                        autoBackupDayOfWeek: Number(e.target.value)
                                                                    })}
                                                                    className="border border-purple-200 rounded-md p-2 text-sm text-gray-700 font-semibold focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                                >
                                                                    <option value={0}>Sunday</option>
                                                                    <option value={1}>Monday</option>
                                                                    <option value={2}>Tuesday</option>
                                                                    <option value={3}>Wednesday</option>
                                                                    <option value={4}>Thursday</option>
                                                                    <option value={5}>Friday</option>
                                                                    <option value={6}>Saturday</option>
                                                                </select>
                                                            </div>
                                                        )}

                                                        {settings.autoBackupFrequency === 'monthly' && (
                                                             <div className="flex flex-col gap-1 text-left">
                                                                 <span className="text-xs font-bold text-gray-500 mb-1 font-semibold">Monthly Backup Day (1 - 31):</span>
                                                                 <input 
                                                                     type="number"
                                                                     min={1}
                                                                     max={31}
                                                                     value={settings.autoBackupDayOfMonth !== undefined ? settings.autoBackupDayOfMonth : 1}
                                                                     onChange={(e) => onUpdateSettings({
                                                                         ...settings,
                                                                         autoBackupDayOfMonth: Math.max(1, Math.min(31, Number(e.target.value)))
                                                                     })}
                                                                     className="border border-purple-200 rounded-md p-2 text-sm text-gray-700 font-bold focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                                 />
                                                             </div>
                                                         )}

                                                         {/* Backup Encryption Password */}
                                                         <div className="flex flex-col gap-1 col-span-1 md:col-span-2 lg:col-span-3 text-left">
                                                             <span className="text-xs font-bold text-gray-500 mb-1">Backup Security Password:</span>
                                                             <input 
                                                                 type="text"
                                                                 placeholder="Enter password to secure the file"
                                                                 value={settings.autoBackupPassword || 'swc_backup'}
                                                                 onChange={(e) => onUpdateSettings({
                                                                     ...settings,
                                                                     autoBackupPassword: e.target.value
                                                                 })}
                                                                 className="border border-purple-200 rounded-md p-2 text-sm text-gray-700 font-semibold focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                             />
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
                                        <p className="text-sm text-gray-600 mb-2">
                                            Backup your data to a safe location or restore from a previous backup.
                                        </p>
                                        
                                        <button 
                                            onClick={handleBackup}
                                            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            Backup Data
                                        </button>

                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept=".json"
                                                ref={fileInputRef}
                                                onChange={handleRestore}
                                                className="hidden" 
                                            />
                                            <button 
                                                onClick={triggerRestore}
                                                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.25a1 1 0 11-2 0V13.003a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                </svg>
                                                Restore Data
                                            </button>
                                        </div>

                                        <button 
                                            onClick={handleClearInvoicesStart}
                                            className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Clear All Data
                                        </button>
                                        <p className="text-xs text-red-500 mt-2 text-center">
                                            Note: You will be able to select which branch to clear.
                                        </p>

                                        {onRestoreDefaults && (
                                            <button 
                                                onClick={onRestoreDefaults}
                                                className="mt-4 w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.25a1 1 0 11-2 0V13.003a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                </svg>
                                                Restore Default Data
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User Permissions Modal - Always outside categories logic so it can show over it */}
                {showUserModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100] p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
                            <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-6 text-white rounded-t-xl">
                                <h3 className="text-xl font-bold">{editingUserId ? 'Edit User Permissions' : 'Add New User'}</h3>
                            </div>
                            
                            {saveError && (
                                <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md font-semibold">
                                    {saveError}
                                </div>
                            )}

                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                                        <input 
                                            type="text"
                                            value={editUsername}
                                            onChange={(e) => setEditUsername(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md p-2"
                                            placeholder="Enter username"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                                        <input 
                                            type="text"
                                            value={editPassword}
                                            onChange={(e) => setEditPassword(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md p-2"
                                            placeholder="Enter password"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-800 mb-3 border-b pb-1">Page Access & Detailed Permissions</h4>
                                    <div className="space-y-4">
                                        {/* Dashboard */}
                                        <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                <input 
                                                    type="checkbox"
                                                    checked={tempUser.permissions?.allowedPages.includes('Dashboard') || false}
                                                    onChange={() => togglePagePermission('Dashboard')}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span>Dashboard</span>
                                            </label>
                                        </div>

                                        {/* Branch Access Section */}
                                        <div className="p-4 border rounded-lg bg-blue-50 border-blue-200 shadow-inner">
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-100">
                                                <h4 className="font-bold text-blue-800 flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    Branch Access Control
                                                </h4>
                                                <label className="flex items-center gap-2 cursor-pointer px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={tempUser.permissions?.allowedBranches.includes('all') || false}
                                                        onChange={() => {
                                                            if (!tempUser.permissions) return;
                                                            const isAll = tempUser.permissions.allowedBranches.includes('all');
                                                            setTempUser({
                                                                ...tempUser,
                                                                permissions: { 
                                                                    ...tempUser.permissions, 
                                                                    allowedBranches: isAll ? [] : ['all'] 
                                                                }
                                                            });
                                                        }}
                                                        className="w-3.5 h-3.5 text-blue-600 rounded border-white focus:ring-offset-blue-600"
                                                    />
                                                    <span>All Branches</span>
                                                </label>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {branches.map(branch => (
                                                    <label 
                                                        key={branch.id} 
                                                        className={`flex items-center gap-2 cursor-pointer p-2 rounded border transition-all ${
                                                            tempUser.permissions?.allowedBranches.includes('all') 
                                                                ? 'opacity-60 cursor-not-allowed bg-gray-100 border-gray-200' 
                                                                : 'bg-white border-blue-100 hover:border-blue-400 hover:shadow-sm'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            disabled={tempUser.permissions?.allowedBranches.includes('all') || false}
                                                            checked={tempUser.permissions?.allowedBranches.includes('all') || tempUser.permissions?.allowedBranches.includes(branch.id) || false}
                                                            onChange={() => toggleBranchPermission(branch.id)}
                                                            className="w-4 h-4 text-blue-600 rounded disabled:bg-gray-300"
                                                        />
                                                        <span className={`text-sm ${tempUser.permissions?.allowedBranches.includes('all') ? 'text-gray-500' : 'text-gray-700'}`}>
                                                            {branch.name}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                            {tempUser.permissions?.allowedBranches.length === 0 && (
                                                <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 font-bold bg-white p-2 rounded border border-red-100">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    USER HAS NO BRANCH ACCESS - Must select at least one.
                                                </div>
                                            )}
                                        </div>

                                        {/* Daily Sales */}
                                        <div className="p-3 border rounded-lg bg-white shadow-sm border-blue-100 hover:border-blue-300 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                    <input 
                                                        type="checkbox"
                                                        checked={tempUser.permissions?.allowedPages.includes('Daily Sales') || false}
                                                        onChange={() => togglePagePermission('Daily Sales')}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <span>Daily Sales</span>
                                                </label>
                                            </div>
                                            {tempUser.permissions?.allowedPages.includes('Daily Sales') && (
                                                <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-50">
                                                    {[
                                                        { key: 'canAddInvoice', label: 'Add Invoices' },
                                                        { key: 'canEditInvoice', label: 'Edit Invoices' },
                                                        { key: 'canDeleteInvoice', label: 'Delete Invoices' },
                                                        { key: 'canChangeInvoiceDate', label: 'Change Invoice Date' },
                                                    ].map(perm => (
                                                        <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                                            <input 
                                                                type="checkbox"
                                                                checked={(tempUser.permissions as any)?.[perm.key] || false}
                                                                onChange={(e) => setTempUser({
                                                                    ...tempUser,
                                                                    permissions: { ...tempUser.permissions!, [perm.key]: e.target.checked }
                                                                })}
                                                                className="w-3.5 h-3.5 text-blue-500 rounded"
                                                            />
                                                            {perm.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* PO Management */}
                                        <div className="p-3 border rounded-lg bg-white shadow-sm border-purple-100 hover:border-purple-300 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="flex items-center gap-2 cursor-pointer font-bold font-bold">
                                                    <input 
                                                        type="checkbox"
                                                        checked={tempUser.permissions?.allowedPages.includes('PO') || false}
                                                        onChange={() => togglePagePermission('PO')}
                                                        className="w-4 h-4 text-purple-600 rounded"
                                                    />
                                                    <span>PO Management</span>
                                                </label>
                                            </div>
                                            {tempUser.permissions?.allowedPages.includes('PO') && (
                                                <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-50">
                                                    {[
                                                        { key: 'canCreatePO', label: 'Add PO' },
                                                        { key: 'canEditPO', label: 'Edit PO' },
                                                        { key: 'canDeletePO', label: 'Delete PO' },
                                                        { key: 'canForceDeletePO', label: 'Force Delete PO' },
                                                    ].map(perm => (
                                                        <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-purple-600 transition-colors">
                                                            <input 
                                                                type="checkbox"
                                                                checked={(tempUser.permissions as any)?.[perm.key] || false}
                                                                onChange={(e) => setTempUser({
                                                                    ...tempUser,
                                                                    permissions: { ...tempUser.permissions!, [perm.key]: e.target.checked }
                                                                })}
                                                                className="w-3.5 h-3.5 text-purple-500 rounded"
                                                            />
                                                            {perm.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Driver Work Log */}
                                        <div className="p-3 border rounded-lg bg-white shadow-sm border-indigo-100 hover:border-indigo-300 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                    <input 
                                                        type="checkbox"
                                                        checked={tempUser.permissions?.allowedPages.includes('Driver Work Log') || false}
                                                        onChange={() => togglePagePermission('Driver Work Log')}
                                                        className="w-4 h-4 text-indigo-600 rounded"
                                                    />
                                                    <span>Driver Work Log</span>
                                                </label>
                                            </div>
                                            {tempUser.permissions?.allowedPages.includes('Driver Work Log') && (
                                                <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-50">
                                                    {[
                                                        { key: 'canEditDriverLog', label: 'Edit Work Log' },
                                                        { key: 'canDeleteDriverLog', label: 'Delete Work Log' },
                                                        { key: 'manageDrivers', label: 'Manage Drivers List' },
                                                        { key: 'manageVehicles', label: 'Manage Vehicles List' },
                                                    ].map(perm => (
                                                        <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                                                            <input 
                                                                type="checkbox"
                                                                checked={(tempUser.permissions as any)?.[perm.key] || false}
                                                                onChange={(e) => setTempUser({
                                                                    ...tempUser,
                                                                    permissions: { ...tempUser.permissions!, [perm.key]: e.target.checked }
                                                                })}
                                                                className="w-3.5 h-3.5 text-indigo-500 rounded"
                                                            />
                                                            {perm.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Drivers Timesheet */}
                                        <div className="p-3 border rounded-lg bg-white shadow-sm border-sky-100 hover:border-sky-300 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                    <input 
                                                        type="checkbox"
                                                        checked={tempUser.permissions?.allowedPages.includes('Drivers Timesheet') || false}
                                                        onChange={() => togglePagePermission('Drivers Timesheet')}
                                                        className="w-4 h-4 text-sky-600 rounded"
                                                    />
                                                    <span>Drivers Timesheet</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* High Priority Report Pages */}
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="p-3 border rounded-lg bg-white shadow-sm border-amber-100 hover:border-amber-300 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                        <input 
                                                            type="checkbox"
                                                            checked={tempUser.permissions?.allowedPages.includes('Customers') || false}
                                                            onChange={() => togglePagePermission('Customers')}
                                                            className="w-4 h-4 text-amber-600 rounded"
                                                        />
                                                        <span>Customers List</span>
                                                    </label>
                                                </div>
                                                {tempUser.permissions?.allowedPages.includes('Customers') && (
                                                    <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-amber-50">
                                                        {[
                                                            { key: 'canAddCustomer', label: 'Add Customer' },
                                                            { key: 'canEditCustomer', label: 'Edit Customer' },
                                                            { key: 'canDeleteCustomer', label: 'Delete Customer' },
                                                        ].map(perm => (
                                                            <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-amber-600 transition-colors">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={tempUser.permissions?.[perm.key as keyof typeof tempUser.permissions] as boolean || false}
                                                                    onChange={(e) => setTempUser({
                                                                        ...tempUser,
                                                                        permissions: { ...tempUser.permissions!, [perm.key]: e.target.checked }
                                                                    })}
                                                                    className="w-3.5 h-3.5 text-amber-600 rounded"
                                                                />
                                                                {perm.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Orders Page */}
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="p-3 border rounded-lg bg-white shadow-sm border-orange-100 hover:border-orange-300 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                                                        <input 
                                                            type="checkbox"
                                                            checked={tempUser.permissions?.allowedPages.includes('Orders') || false}
                                                            onChange={() => togglePagePermission('Orders')}
                                                            className="w-4 h-4 text-orange-600 rounded"
                                                        />
                                                        <span>Orders</span>
                                                    </label>
                                                </div>
                                                {tempUser.permissions?.allowedPages.includes('Orders') && (
                                                    <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 pt-2 border-t border-orange-50">
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-700 block mb-1">Allowed Customers (Select to limit, otherwise all)</label>
                                                            <div className="relative mb-2">
                                                                <input
                                                                    id="customerPermissionSearchInput"
                                                                    type="text"
                                                                    placeholder="Search for a customer..."
                                                                    value={customerSearchTerm}
                                                                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                                                    className="w-full text-xs pl-8 pr-2.5 py-1.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white"
                                                                />
                                                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                                            </div>
                                                            <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50 flex flex-col gap-1">
                                                                {customers
                                                                    .filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                                                                    .map(c => (
                                                                        <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-orange-600 transition-colors">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={tempUser.permissions?.allowedOrderCustomers?.includes(c.name) || false}
                                                                                onChange={(e) => {
                                                                                    const current = tempUser.permissions?.allowedOrderCustomers || [];
                                                                                    const newCustomers = e.target.checked
                                                                                        ? [...current, c.name]
                                                                                        : current.filter(name => name !== c.name);
                                                                                    setTempUser({
                                                                                        ...tempUser,
                                                                                        permissions: { ...tempUser.permissions!, allowedOrderCustomers: newCustomers }
                                                                                    });
                                                                                }}
                                                                                className="w-3.5 h-3.5 text-orange-600 rounded"
                                                                            />
                                                                            {c.name}
                                                                        </label>
                                                                    ))}
                                                                {customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).length === 0 && (
                                                                    <div className="text-xs text-gray-400 text-center py-2">No matching customers found</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-700 block mb-1">Allowed Items (Select to limit, otherwise all)</label>
                                                            <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50 flex flex-col gap-1">
                                                                {items.map(i => (
                                                                    <label key={i.id} className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-orange-600 transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={tempUser.permissions?.allowedOrderItems?.includes(i.name) || false}
                                                                            onChange={(e) => {
                                                                                const current = tempUser.permissions?.allowedOrderItems || [];
                                                                                const newItems = e.target.checked
                                                                                    ? [...current, i.name]
                                                                                    : current.filter(name => name !== i.name);
                                                                                setTempUser({
                                                                                    ...tempUser,
                                                                                    permissions: { ...tempUser.permissions!, allowedOrderItems: newItems }
                                                                                });
                                                                            }}
                                                                            className="w-3.5 h-3.5 text-orange-600 rounded"
                                                                        />
                                                                        {i.name}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 sm:col-span-2 pt-2 border-t border-orange-50 grid grid-cols-1 gap-2">
                                                            {/* Moved to Order Workflow Section */}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* -------------------- NEW SECTION FOR ORDER WORKFLOW -------------------- */}
                                        <div className="grid grid-cols-1 gap-3 mb-3">
                                            <div className="p-3 border rounded-lg bg-teal-50 border-teal-200 shadow-sm">
                                                <h5 className="font-bold text-teal-800 mb-3 pb-2 border-b border-teal-100">
                                                    Order Workflow & Notifications
                                                </h5>
                                                
                                                <div className="grid grid-cols-1 gap-3">
                                                    
                                                    {/* 1. استقبال الطلبات */}
                                                    <div className="p-3 bg-white rounded-md border border-teal-100 shadow-sm">
                                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-900 border-b border-teal-50 pb-2 mb-2">
                                                            <input 
                                                                type="checkbox"
                                                                checked={tempUser.permissions?.allowedPages.includes('Orders') || false}
                                                                onChange={() => togglePagePermission('Orders')}
                                                                className="w-4 h-4 text-teal-600 rounded"
                                                            />
                                                            <span>1. Orders List</span>
                                                        </label>
                                                        <p className="text-xs text-gray-500 mb-1">To limit specific customers or items, please use the main Orders configuration above.</p>
                                                    </div>

                                                    {/* 2. الموافقة على الطلبات */}
                                                    <div className="p-3 bg-white rounded-md border border-teal-100 shadow-sm">
                                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-900">
                                                            <input 
                                                                type="checkbox"
                                                                checked={tempUser.permissions?.allowedPages.includes('Order Approvals') || false}
                                                                onChange={() => togglePagePermission('Order Approvals')}
                                                                className="w-4 h-4 text-teal-600 rounded"
                                                            />
                                                            <span>2. Order Approvals</span>
                                                        </label>
                                                    </div>

                                                    {/* 3. الإشعار بـ تم التسليم */}
                                                    <div className="p-3 bg-white rounded-md border border-teal-100 shadow-sm">
                                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-900">
                                                            <input 
                                                                type="checkbox"
                                                                checked={tempUser.permissions?.showDeliveryConfirmationPopup !== false}
                                                                onChange={(e) => setTempUser({
                                                                    ...tempUser,
                                                                    permissions: { ...tempUser.permissions!, showDeliveryConfirmationPopup: e.target.checked }
                                                                })}
                                                                className="w-4 h-4 text-teal-600 rounded"
                                                            />
                                                            <span>3. Order Executed & On Way Popup</span>
                                                        </label>
                                                    </div>

                                                    {/* 4. قائمة ان الطلب تم استلامه */}
                                                    <div className="p-3 bg-white rounded-md border border-teal-100 shadow-sm">
                                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-900">
                                                            <input 
                                                                type="checkbox"
                                                                checked={tempUser.permissions?.showOrderReceiptPopup !== false}
                                                                onChange={(e) => setTempUser({
                                                                    ...tempUser,
                                                                    permissions: { ...tempUser.permissions!, showOrderReceiptPopup: e.target.checked }
                                                                })}
                                                                className="w-4 h-4 text-teal-600 rounded"
                                                            />
                                                            <span>4. Customer Receipt Popup</span>
                                                        </label>
                                                        {tempUser.permissions?.showOrderReceiptPopup !== false && (
                                                            <div className="ml-6 mt-2 pt-2 border-t border-teal-50">
                                                                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={tempUser.permissions?.showReceiptDetailsPopup !== false}
                                                                        onChange={(e) => setTempUser({
                                                                            ...tempUser,
                                                                            permissions: { ...tempUser.permissions!, showReceiptDetailsPopup: e.target.checked }
                                                                        })}
                                                                        className="w-3.5 h-3.5 text-teal-600 rounded"
                                                                    />
                                                                    <span>Show Receipt Details Summary after Confirmation</span>
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Extra Order Privileges (View All, Delete) */}
                                                    <div className="p-3 bg-white rounded-md border border-teal-100 shadow-sm mt-2">
                                                        <h6 className="font-bold text-teal-900 mb-2 border-b border-teal-50 pb-1 text-sm">Extra Privileges</h6>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={tempUser.permissions?.canViewAllOrders || false}
                                                                    onChange={(e) => setTempUser({
                                                                        ...tempUser,
                                                                        permissions: { ...tempUser.permissions!, canViewAllOrders: e.target.checked }
                                                                    })}
                                                                    className="w-3.5 h-3.5 text-teal-600 rounded"
                                                                />
                                                                <span>View All Users' Orders (Display orders from all users)</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={tempUser.permissions?.canDeleteOrder || false}
                                                                    onChange={(e) => setTempUser({
                                                                        ...tempUser,
                                                                        permissions: { ...tempUser.permissions!, canDeleteOrder: e.target.checked }
                                                                    })}
                                                                    className="w-3.5 h-3.5 text-teal-600 rounded"
                                                                />
                                                                <span>Delete Orders (Allows deleting any order permanently)</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={tempUser.permissions?.receiveNewOrderAlert ?? false}
                                                                    onChange={(e) => setTempUser({
                                                                        ...tempUser,
                                                                        permissions: { ...tempUser.permissions!, receiveNewOrderAlert: e.target.checked }
                                                                    })}
                                                                    className="w-3.5 h-3.5 text-teal-600 rounded"
                                                                />
                                                                <span>Receive Approved Order Delivery Alerts</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                         </div>
                                         {/* ------------------------------------------------------------------------ */}

                                         {/* Notifications Permissions */}
                                         <div className="grid grid-cols-1 gap-3 mb-3">
                                             <div className="p-3 border rounded-lg bg-white shadow-sm border-purple-100 hover:border-purple-300 transition-all">
                                                 <div className="flex items-center justify-between mb-2">
                                                     <h5 className="font-bold text-purple-800">Notifications Settings</h5>
                                                 </div>
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                                     <div>
                                                         <h6 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">System Alerts</h6>
                                                         <div className="flex flex-col gap-2">
                                                             <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-purple-600 transition-colors">
                                                                 <input 
                                                                     type="checkbox"
                                                                     checked={tempUser.permissions?.receiveLowPOAlert ?? false}
                                                                     onChange={(e) => setTempUser({
                                                                         ...tempUser,
                                                                         permissions: { ...tempUser.permissions!, receiveLowPOAlert: e.target.checked }
                                                                     })}
                                                                     className="w-4 h-4 text-purple-600 rounded"
                                                                 />
                                                                 <span>Receive Low PO Balance Alerts</span>
                                                             </label>
                                                         </div>
                                                     </div>

                                                     <div>
                                                         <h6 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">Cash Invoices</h6>
                                                         <div className="flex flex-col gap-2">
                                                             {[
                                                                 { key: 'notifyAddCashInvoice', label: 'Add Cash Invoice' },
                                                                 { key: 'notifyEditCashInvoice', label: 'Edit Cash Invoice' },
                                                                 { key: 'notifyDeleteCashInvoice', label: 'Delete Cash Invoice' },
                                                             ].map(perm => (
                                                                 <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-purple-600 transition-colors">
                                                                     <input 
                                                                         type="checkbox"
                                                                         checked={(tempUser.permissions as any)?.[perm.key] ?? true}
                                                                         onChange={(e) => setTempUser({
                                                                             ...tempUser,
                                                                             permissions: { ...tempUser.permissions!, [perm.key]: e.target.checked }
                                                                         })}
                                                                         className="w-4 h-4 text-purple-600 rounded"
                                                                     />
                                                                     <span>{perm.label}</span>
                                                                 </label>
                                                             ))}
                                                         </div>
                                                     </div>

                                                     <div>
                                                         <h6 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">Credit Invoices</h6>
                                                         <div className="flex flex-col gap-2">
                                                             {[
                                                                 { key: 'notifyAddCreditInvoice', label: 'Add Credit Invoice' },
                                                                 { key: 'notifyEditCreditInvoice', label: 'Edit Credit Invoice' },
                                                                 { key: 'notifyDeleteCreditInvoice', label: 'Delete Credit Invoice' },
                                                             ].map(perm => (
                                                                 <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-purple-600 transition-colors">
                                                                     <input 
                                                                         type="checkbox"
                                                                         checked={(tempUser.permissions as any)?.[perm.key] ?? true}
                                                                         onChange={(e) => setTempUser({
                                                                             ...tempUser,
                                                                             permissions: { ...tempUser.permissions!, [perm.key]: e.target.checked }
                                                                         })}
                                                                         className="w-4 h-4 text-purple-600 rounded"
                                                                     />
                                                                     <span>{perm.label}</span>
                                                                 </label>
                                                             ))}
                                                         </div>
                                                     </div>

                                                     <div>
                                                         <h6 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">Orders & Approvals</h6>
                                                         <div className="flex flex-col gap-2">
                                                             {[
                                                                 { key: 'notifyAddOrder', label: 'Add Order' },
                                                                 { key: 'notifyApproveOrder', label: 'Approve Order' },
                                                                 { key: 'notifyRejectOrder', label: 'Reject Order' },
                                                                 { key: 'notifyDeleteOrder', label: 'Delete Order' },
                                                             ].map(perm => (
                                                                 <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-purple-600 transition-colors">
                                                                     <input 
                                                                         type="checkbox"
                                                                         checked={(tempUser.permissions as any)?.[perm.key] ?? true}
                                                                         onChange={(e) => setTempUser({
                                                                             ...tempUser,
                                                                             permissions: { ...tempUser.permissions!, [perm.key]: e.target.checked }
                                                                         })}
                                                                         className="w-4 h-4 text-purple-600 rounded"
                                                                     />
                                                                     <span>{perm.label}</span>
                                                                 </label>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Other Pages */}
                                        <div className="p-3 border rounded-lg bg-gray-50 border-gray-200 shadow-sm">
                                            <h5 className="text-[10px] uppercase font-bold text-gray-400 mb-2">Other Reports & Modules</h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {[
                                                    'Account Statement', 
                                                    'Invoices Tracking', 
                                                    'Monthly Sales', 
                                                    'Annual Sales',
                                                    
                                                ].map(page => (
                                                    <label key={page} className="flex items-center gap-2 cursor-pointer p-1">
                                                        <input 
                                                            type="checkbox"
                                                            checked={tempUser.permissions?.allowedPages.includes(page) || false}
                                                            onChange={() => togglePagePermission(page)}
                                                            className="w-4 h-4 text-green-600 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">{page}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Settings */}
                                        <div className="p-3 border rounded-lg border-red-100 bg-red-50">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold text-red-800">
                                                <input 
                                                    type="checkbox"
                                                    checked={tempUser.permissions?.allowedPages.includes('Settings') || false}
                                                    onChange={() => togglePagePermission('Settings')}
                                                    className="w-4 h-4 text-red-600 rounded"
                                                />
                                                <span>Settings (Full Admin Control)</span>
                                            </label>
                                            {tempUser.permissions?.allowedPages.includes('Settings') && (
                                                <div className="ml-6 mt-2">
                                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-red-600">
                                                        <input 
                                                            type="checkbox"
                                                            checked={tempUser.permissions?.canManageSettings || false}
                                                            onChange={(e) => setTempUser({
                                                                ...tempUser,
                                                                permissions: { ...tempUser.permissions!, canManageSettings: e.target.checked }
                                                            })}
                                                            className="w-3.5 h-3.5 text-red-600 rounded"
                                                        />
                                                        Can Change System Dates/Backup
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowUserModal(false)}
                                    className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveUser}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors"
                                >
                                    Save User
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Clear Invoices Modal */}
            {showClearModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-red-600 p-4 text-white font-bold flex justify-between items-center">
                            <span>Clear All Invoices</span>
                            <button onClick={() => setShowClearModal(false)} className="hover:text-red-200">✕</button>
                        </div>
                        
                        <div className="p-6">
                            {clearStep === 'password' ? (
                                <form onSubmit={handleClearPasswordSubmit} className="space-y-4">
                                    <p className="text-sm text-gray-600">Please enter the administrative password to proceed.</p>
                                    <div>
                                        <input 
                                            type="password"
                                            value={clearPassword}
                                            onChange={(e) => setClearPassword(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-red-500 outline-none"
                                            placeholder="Enter Password"
                                            autoFocus
                                        />
                                        {clearError && <p className="text-red-500 text-xs mt-1">{clearError}</p>}
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition-colors"
                                    >
                                        Verify Password
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch to Clear</label>
                                        <select
                                            value={clearBranchId}
                                            onChange={(e) => setClearBranchId(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-red-500 outline-none"
                                        >
                                            <option value="all">All Branches</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4">
                                        <p className="text-red-700 font-bold">FINAL WARNING</p>
                                        <p className="text-red-600 text-sm mt-1">
                                            You are about to permanently delete ALL invoices for:
                                            <br />
                                            <span className="font-black text-lg">
                                                {clearBranchId === 'all' ? 'All Branches' : branches.find(b => b.id === clearBranchId)?.name}
                                            </span>
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-600">This action cannot be undone. All sales records, totals, and invoice history will be lost.</p>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setShowClearModal(false)}
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleConfirmClear}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition-colors"
                                        >
                                            Yes, Clear All
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Backup/Restore Password Modal */}
            {showBackupModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[70] p-4 text-left" dir="ltr">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-indigo-100"
                    >
                        <div className="bg-indigo-600 p-6 text-white text-center relative">
                            <div className="inline-flex p-3 bg-indigo-500 rounded-full mb-3 shadow-lg">
                                {backupAction === 'backup' ? <Lock className="w-8 h-8" /> : <Unlock className="w-8 h-8" />}
                            </div>
                            <h3 className="text-xl font-bold">
                                {backupAction === 'backup' ? 'Encrypt & Download Backup' : 'Decrypt & Restore Data'}
                            </h3>
                            <button 
                                onClick={() => setShowBackupModal(false)}
                                className="absolute top-4 right-4 hover:scale-110 transition-transform"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-8">
                            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded-r-md">
                                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                                    {backupAction === 'backup' 
                                        ? 'The data file will be protected with a password. No one will be able to read or restore it without this password.' 
                                        : 'Please enter the password you used when creating this backup.'}
                                </p>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                backupAction === 'backup' ? executeBackup() : executeRestore();
                            }} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                                    <div className="relative">
                                        <input 
                                            type="password"
                                            value={backupPass}
                                            onChange={(e) => setBackupPass(e.target.value)}
                                            className="w-full border-2 border-gray-100 rounded-xl p-3 pr-10 focus:border-indigo-500 focus:ring-0 outline-none transition-all text-center text-lg font-mono tracking-widest bg-gray-50"
                                            placeholder="••••••••"
                                            autoFocus
                                        />
                                        <ShieldCheck className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 ${backupPass.length >= 4 ? 'text-green-500' : 'text-gray-300'}`} />
                                    </div>
                                    {backupError && <p className="text-red-500 text-sm mt-2 font-bold animate-shake">{backupError}</p>}
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button 
                                        type="submit"
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white shadow-xl transition-all active:scale-95 ${
                                            backupAction === 'backup' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                    >
                                        {backupAction === 'backup' ? <Download className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                        {backupAction === 'backup' ? 'Start Download' : 'Start Restore'}
                                    </button>
                                </div>
                            </form>
                            
                            <p className="mt-6 text-[11px] text-gray-400 text-center italic">
                                * A strong password is recommended. There is no way to recover the file if the password is lost.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
            </div>
        </div>
    );
};

export default Settings;
