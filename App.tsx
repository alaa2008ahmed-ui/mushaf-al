
import React, { useState, useMemo, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import Header from './components/Header';
import Nav from './components/Nav';
import { ClipboardList, X } from 'lucide-react';
import FilterBar from './components/FilterBar';
import TotalSummary from './components/TotalSummary';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import Settings from './components/Settings';
import Notification from './components/Notification';
import MonthlyReport from './components/MonthlyReport';
import AnnualReport from './components/AnnualReport';
import AccountStatement from './components/AccountStatement';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import PO from './components/PO';
import InvoiceTracking from './components/InvoiceTracking';
import DriverWorkLog from './components/DriverWorkLog';
import DriverReport from './components/DriverReport';
import Customers from './components/Customers';
import Orders from './components/Orders';
import OrderApprovals from './components/OrderApprovals';
import { Item, Employee, Invoice, Branch, User, UserPermissions, Customer, DeliveryNote, BottleTransaction, AppSettings, POCustomer, InvoiceLog, Driver, Vehicle, DriverWorkLog as IDriverWorkLog, DriverMonthlySummary, Order } from './types';
import { mockItems, mockEmployees, mockBranches, mockDrivers, mockVehicles, defaultAdmin, alaaUser, mockPOCustomers, mockCustomers } from './constants';
import { dualStorage, COLLECTIONS } from './DualStorageService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { downloadBlob } from './downloadUtils';
import { captureAndExport, printOrDownloadPdf } from './captureUtils';
import CryptoJS from 'crypto-js';
import LZString from 'lz-string';

// Declare jsPDF and html2canvas types for TypeScript
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
        ExcelJS: any;
    }
}

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('Dashboard');
    const [isMobile, setIsMobile] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<number>(() => dualStorage.getLastSyncTime());
    const [showLowPOAlert, setShowLowPOAlert] = useState(false);
    const [hasShownLoginPOAlert, setHasShownLoginPOAlert] = useState(false);
    const alertTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Device Detection
    useEffect(() => {
        const checkDevice = () => {
            // Use width-based responsive detection
            // Note: maxTouchPoints caused touchscreen laptops to be identified as mobile
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
            const isMobileBrowser = mobileRegex.test(userAgent.toLowerCase());
            const isMobileDevice = isMobileBrowser || window.innerWidth < 1024;
            setIsMobile(isMobileDevice);
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    // Handle sync and auth readiness with a safety timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isAuthReady) setIsAuthReady(true);
        }, 3000); // 3 seconds fallback

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setIsAuthReady(true);
            clearTimeout(timer);
        });

        const setupData = async () => {
            console.log("Setting up data sync...");
            
            // 1. Initialize real-time listeners IMMEDIATELY to get data flowing
            dualStorage.initialize((collectionName, data) => {
                if (collectionName === COLLECTIONS.RECORDS) {
                    const itemsData = data.filter(r => r.type === 'item').map(r => r.data);
                    const branchesData = data.filter(r => r.type === 'branch').map(r => r.data);
                    // Sort branches
                    const sortedBranches = branchesData.sort((a, b) => {
                        const getPriority = (name: string) => {
                            const lowerName = name.toLowerCase();
                            if (lowerName.includes('main')) return 1;
                            if (lowerName.includes('dammam')) return 2;
                            if (lowerName.includes('alhasa') || lowerName.includes('hasa')) return 3;
                            return 4;
                        };
                        const priorityA = getPriority(a.name);
                        const priorityB = getPriority(b.name);
                        return priorityA !== priorityB ? priorityA - priorityB : a.name.localeCompare(b.name);
                    });

                    const usersData = data.filter(r => r.type === 'user').map(r => {
                        const u = r.data as User;
                        return {
                            ...u,
                            permissions: {
                                ...u.permissions,
                                canCreatePO: u.permissions?.canCreatePO ?? true,
                                canEditPO: u.permissions?.canEditPO ?? false,
                                canDeletePO: u.permissions?.canDeletePO ?? false,
                                canEditDriverLog: u.permissions?.canEditDriverLog ?? false,
                                canDeleteDriverLog: u.permissions?.canDeleteDriverLog ?? false,
                                receiveLowPOAlert: u.permissions?.receiveLowPOAlert ?? true,
                                receiveNewOrderAlert: u.permissions?.receiveNewOrderAlert ?? false,
                                showDeliveryConfirmationPopup: u.permissions?.showDeliveryConfirmationPopup ?? false,
                                showOrderReceiptPopup: u.permissions?.showOrderReceiptPopup ?? false,
                                showReceiptDetailsPopup: u.permissions?.showReceiptDetailsPopup ?? false,
                            }
                        } as User;
                    });
                    const driversData = data.filter(r => r.type === 'driver').map(r => r.data as Driver).sort((a, b) => a.driverId - b.driverId);
                    const vehiclesData = data.filter(r => r.type === 'vehicle').map(r => r.data as Vehicle).sort((a, b) => a.vehicleId - b.vehicleId);
                    const logsData = data.filter(r => r.type === 'driver_work_log').map(r => r.data as IDriverWorkLog);
                    const summariesData = data.filter(r => r.type === 'driver_monthly_summary').map(r => r.data as DriverMonthlySummary);
                    const settingsData = data.find(r => r.type === 'settings')?.data;
                    const invoiceLogsData = data.filter(r => r.type === 'invoice_log').map(r => r.data as InvoiceLog);
                    const ordersData = data.filter(r => r.type === 'order').map(r => ({
                        ...(r.data as Order),
                        id: r.id
                    }));

                    setItems(itemsData);
                    setBranches(sortedBranches);
                    setInvoiceLogs(invoiceLogsData);
                    setDrivers(driversData);
                    setVehicles(vehiclesData);
                    setDriverWorkLogs(logsData);
                    setDriverMonthlySummaries(summariesData);
                    setOrders(ordersData);
                    
                    if (settingsData) {
                        setAppSettings({
                            ...settingsData,
                            registrationStartDate: settingsData.registrationStartDate ? new Date(settingsData.registrationStartDate) : null,
                            registrationEndDate: settingsData.registrationEndDate ? new Date(settingsData.registrationEndDate) : null,
                            modificationStartDate: settingsData.modificationStartDate ? new Date(settingsData.modificationStartDate) : null,
                            modificationEndDate: settingsData.modificationEndDate ? new Date(settingsData.modificationEndDate) : null,
                        });
                    }

                    if (usersData.length >= 0) {
                        const filteredUsers = usersData.filter(u => u.username.toLowerCase() !== 'alaa');
                        // Deduplicate by username to fix duplicate entry issue
                        const uniqueUsers: User[] = [];
                        const seenUsernames = new Set<string>();
                        
                        // Start with alaaUser and admin if present in constants, then others
                        [alaaUser, ...filteredUsers].forEach(u => {
                            const uname = u.username.toLowerCase();
                            if (!seenUsernames.has(uname)) {
                                seenUsernames.add(uname);
                                uniqueUsers.push(u);
                            }
                        });
                        
                        setUsers(uniqueUsers);
                    }
                } else if (collectionName === COLLECTIONS.SALES_INVOICES) {
                    const parsedInvoices = data.map(inv => {
                        let dateValue = inv.date;
                        // Handle Firestore Timestamp objects
                        if (dateValue && typeof dateValue === 'object' && dateValue.seconds !== undefined) {
                            dateValue = new Date(dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000);
                        } else if (dateValue) {
                            dateValue = new Date(dateValue);
                        } else {
                            dateValue = new Date(); // Fallback to today if missing
                        }
                        
                        return { ...inv, date: isNaN(dateValue.getTime()) ? new Date() : dateValue };
                    }) as Invoice[];
                    setAllSalesInvoices(parsedInvoices);
                } else if (collectionName === COLLECTIONS.CUSTOMERS) {
                    setCustomers(data as Customer[]);
                } else if (collectionName === COLLECTIONS.DELIVERY_NOTES) {
                    setDeliveryNotes(data.map(note => {
                        const d = note.date instanceof Date ? note.date : new Date(note.date);
                        return { ...note, date: isNaN(d.getTime()) ? new Date() : d };
                    }) as DeliveryNote[]);
                } else if (collectionName === COLLECTIONS.BOTTLE_TRANSACTIONS) {
                    setBottleTransactions(data.map(tx => {
                        const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
                        return { ...tx, date: isNaN(d.getTime()) ? new Date() : d };
                    }) as BottleTransaction[]);
                } else if (collectionName === COLLECTIONS.PO_CUSTOMERS) {
                    setPoCustomers(data as POCustomer[]);
                }
            }, (msg, type) => {
                setNotification({ message: msg, type: type === 'error' ? 'error' : 'info' });
            });

            // 2. Start full sync from cloud and WAIT for it before seeding
            try {
                await dualStorage.fullSyncFromCloud();
                console.log("App: Initial cloud sync complete.");
            } catch (err) {
                console.error("App: Initial cloud sync failed:", err);
            }
            
            // Notification if offline
            if (!navigator.onLine) {
                setNotification({ message: 'You are offline. Changes will sync when online.', type: 'info' });
            }

            // Seeding and Migrations (Wait until after initial sync attempt)
            const currentRecords = dualStorage.getLocalData(COLLECTIONS.RECORDS);
            const currentPOCustomers = dualStorage.getLocalData(COLLECTIONS.PO_CUSTOMERS);
            const currentCustomers = dualStorage.getLocalData(COLLECTIONS.CUSTOMERS);
            
            // Re-seed IF AND ONLY IF cloud AND local are both empty for these types
            const hasItems = currentRecords.some((r: any) => r.type === 'item');
            const hasBranches = currentRecords.some((r: any) => r.type === 'branch');
            const hasDrivers = currentRecords.some((r: any) => r.type === 'driver');
            const hasVehicles = currentRecords.some((r: any) => r.type === 'vehicle');
            const hasUsers = currentRecords.some((r: any) => r.type === 'user');
            const hasPOCustomers = currentPOCustomers && currentPOCustomers.length > 0;
            const hasCustomers = currentCustomers && currentCustomers.length > 0;

            if (!hasItems) {
                console.log("Seeding missing items...");
                for (const item of mockItems) {
                    await dualStorage.save(COLLECTIONS.RECORDS, item.id, { type: 'item', data: item });
                }
            }
            
            if (!hasCustomers) {
                console.log("Seeding missing customers...");
                for (const customer of mockCustomers) {
                    await dualStorage.save(COLLECTIONS.CUSTOMERS, customer.id, customer);
                }
            } else {
                // Migration: Update existing customer numbers if they are in the old format
                console.log("Checking customer numbering migration...");
                for (const mockC of mockCustomers) {
                    const existingC = currentCustomers.find((c: any) => c.id === mockC.id);
                    if (existingC && existingC.customerNumber !== mockC.customerNumber) {
                        console.log(`Updating customer ${mockC.name} account number...`);
                        await dualStorage.save(COLLECTIONS.CUSTOMERS, mockC.id, mockC);
                    }
                }
            }
            
            if (!hasBranches) {
                console.log("Seeding missing branches...");
                for (const branch of mockBranches) {
                    await dualStorage.save(COLLECTIONS.RECORDS, branch.id, { type: 'branch', data: branch });
                }
            }

            if (!hasDrivers) {
                console.log("Seeding missing drivers...");
                for (const driver of mockDrivers) {
                    await dualStorage.save(COLLECTIONS.RECORDS, driver.id, { type: 'driver', data: driver });
                }
            }

            if (!hasVehicles) {
                console.log("Seeding missing vehicles...");
                for (const vehicle of mockVehicles) {
                    await dualStorage.save(COLLECTIONS.RECORDS, vehicle.id, { type: 'vehicle', data: vehicle });
                }
            }

            // Remove conditional PO Customers seeding if they're explicitly deleted
            
            if (!hasUsers) {
                console.log("Seeding missing users...");
                const defaultUsers: User[] = [
                        {
                            id: 'u-shihab',
                            username: 'shihab',
                            password: '123',
                            role: 'user',
                            permissions: {
                                allowedPages: ['Dashboard', 'Daily Sales', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers', 'Monthly Sales', 'Annual Sales', 'Account Statement', 'Invoices Tracking'],
                                allowedBranches: ['all'],
                                canAddInvoice: true,
                                canEditInvoice: false,
                                canDeleteInvoice: false,
                                canChangeInvoiceDate: false,
                                canViewAccountStatement: true,
                                canManageSettings: false,
                                canCreatePO: true,
                                canForceDeletePO: false,
                                manageDrivers: false,
                                manageVehicles: false,
                                canEditPO: false,
                                canDeletePO: false,
                                canEditDriverLog: false,
                                canDeleteDriverLog: false
                            }
                        },
                        {
                            id: 'u-yassin',
                            username: 'yassin',
                            password: '123',
                            role: 'user',
                            permissions: {
                                allowedPages: ['Dashboard', 'Daily Sales', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers', 'Monthly Sales', 'Annual Sales', 'Account Statement', 'Invoices Tracking'],
                                allowedBranches: ['all'],
                                canAddInvoice: true,
                                canEditInvoice: false,
                                canDeleteInvoice: false,
                                canChangeInvoiceDate: false,
                                canViewAccountStatement: true,
                                canManageSettings: false,
                                canCreatePO: true,
                                canForceDeletePO: false,
                                manageDrivers: false,
                                manageVehicles: false,
                                canEditPO: false,
                                canDeletePO: false,
                                canEditDriverLog: false,
                                canDeleteDriverLog: false
                            }
                        },
                        {
                            id: 'u-noaman',
                            username: 'noaman',
                            password: '123',
                            role: 'user',
                            permissions: {
                                allowedPages: ['Dashboard', 'Daily Sales', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers', 'Monthly Sales', 'Annual Sales', 'Account Statement', 'Invoices Tracking'],
                                allowedBranches: ['all'],
                                canAddInvoice: true,
                                canEditInvoice: false,
                                canDeleteInvoice: false,
                                canChangeInvoiceDate: false,
                                canViewAccountStatement: true,
                                canManageSettings: false,
                                canCreatePO: true,
                                canForceDeletePO: false,
                                manageDrivers: false,
                                manageVehicles: false,
                                canEditPO: false,
                                canDeletePO: false,
                                canEditDriverLog: false,
                                canDeleteDriverLog: false
                            }
                        }
                    ];
                for (const u of defaultUsers) {
                    await dualStorage.save(COLLECTIONS.RECORDS, u.id, { type: 'user', data: u });
                }
                await dualStorage.save(COLLECTIONS.RECORDS, defaultAdmin.id, { type: 'user', data: defaultAdmin });
                await dualStorage.save(COLLECTIONS.RECORDS, alaaUser.id, { type: 'user', data: alaaUser });
            }

            // Also check for the specific case where ALAA or ADMIN user might be missing even if others exist
            if (hasUsers) {
                if (!currentRecords.some((r: any) => r.type === 'user' && r.data.id === 'admin')) {
                    await dualStorage.save(COLLECTIONS.RECORDS, defaultAdmin.id, { type: 'user', data: defaultAdmin });
                }
                if (!currentRecords.some((r: any) => r.type === 'user' && r.data.id === 'alaa-hidden')) {
                    await dualStorage.save(COLLECTIONS.RECORDS, alaaUser.id, { type: 'user', data: alaaUser });
                }

                // DEDUPLICATION MIGRATION: Remove duplicate Dammam Branch if it exists
                const currentBranches = currentRecords.filter((r: any) => r.type === 'branch');
                const dammamBranches = currentBranches.filter((r: any) => r.data.name.toLowerCase().includes('dammam'));
                if (dammamBranches.length > 1) {
                    console.log("Cleaning up duplicate Dammam branches...");
                    // Keep the one with official ID 'b1' if possible
                    const toKeep = dammamBranches.find((r: any) => r.data.id === 'b1') || dammamBranches[0];
                    for (const b of dammamBranches) {
                        if (b.data.id !== toKeep.data.id) {
                            await dualStorage.delete(COLLECTIONS.RECORDS, b.data.id);
                        }
                    }
                }
                
                // MIGRATION: Ensure 'PO' page is available to admins and all permissions are initialized
                for (const r of currentRecords) {
                    if (r.type === 'user') {
                        const user = r.data as User;
                        let neededUpdate = false;

                        // Ensure 'PO' page for admins
                        if ((user.role === 'admin' || user.username.toLowerCase() === 'alaa' || user.username.toLowerCase() === 'admin') && !user.permissions.allowedPages.includes('PO')) {
                            user.permissions.allowedPages.push('PO');
                            neededUpdate = true;
                        }

                        // Ensure 'Invoices Tracking' page for admins
                        if ((user.role === 'admin' || user.username.toLowerCase() === 'alaa' || user.username.toLowerCase() === 'admin') && !user.permissions.allowedPages.includes('Invoices Tracking')) {
                            user.permissions.allowedPages.push('Invoices Tracking');
                            neededUpdate = true;
                        }

                        // Ensure 'Customers' page for admins
                        if ((user.role === 'admin' || user.username.toLowerCase() === 'alaa' || user.username.toLowerCase() === 'admin') && !user.permissions.allowedPages.includes('Customers')) {
                            user.permissions.allowedPages.push('Customers');
                            neededUpdate = true;
                        }

                        // Ensure 'Driver Work Log' page for admins
                        if ((user.role === 'admin' || user.username.toLowerCase() === 'alaa' || user.username.toLowerCase() === 'admin') && !user.permissions.allowedPages.includes('Driver Work Log')) {
                            user.permissions.allowedPages.push('Driver Work Log');
                            neededUpdate = true;
                        }

                        // Ensure 'Drivers Timesheet' page for admins
                        if ((user.role === 'admin' || user.username.toLowerCase() === 'alaa' || user.username.toLowerCase() === 'admin') && !user.permissions.allowedPages.includes('Drivers Timesheet')) {
                            user.permissions.allowedPages.push('Drivers Timesheet');
                            neededUpdate = true;
                        }

                        // Ensure 'Orders' and 'Order Approvals' page for admins
                        if ((user.role === 'admin' || user.username.toLowerCase() === 'alaa' || user.username.toLowerCase() === 'admin') && !user.permissions.allowedPages.includes('Orders')) {
                            user.permissions.allowedPages.push('Orders');
                            neededUpdate = true;
                        }
                        if ((user.role === 'admin' || user.username.toLowerCase() === 'alaa' || user.username.toLowerCase() === 'admin') && !user.permissions.allowedPages.includes('Order Approvals')) {
                            user.permissions.allowedPages.push('Order Approvals');
                            neededUpdate = true;
                        }

                        // Ensure canForceDeletePO is initialized
                        if (user.permissions.canForceDeletePO === undefined || (user.role === 'admin' && !user.permissions.canForceDeletePO)) {
                            user.permissions.canForceDeletePO = user.role === 'admin' || user.username.toLowerCase() === 'alaa';
                            neededUpdate = true;
                        }

                        // Ensure PO permissions are initialized for admins
                        if (user.role === 'admin' || user.username.toLowerCase() === 'alaa') {
                            if (!user.permissions.canCreatePO) { user.permissions.canCreatePO = true; neededUpdate = true; }
                            if (!user.permissions.canEditPO) { user.permissions.canEditPO = true; neededUpdate = true; }
                            if (!user.permissions.canDeletePO) { user.permissions.canDeletePO = true; neededUpdate = true; }
                        }

                        // Ensure driver permissions are initialized
                        if (user.permissions.manageDrivers === undefined) {
                            user.permissions.manageDrivers = user.role === 'admin' || user.username.toLowerCase() === 'alaa';
                            neededUpdate = true;
                        }
                        if (user.permissions.manageVehicles === undefined) {
                            user.permissions.manageVehicles = user.role === 'admin' || user.username.toLowerCase() === 'alaa';
                            neededUpdate = true;
                        }

                        if (neededUpdate) {
                            await dualStorage.save(COLLECTIONS.RECORDS, user.id, { type: 'user', data: user });
                        }
                    }
                }
            }

        };

        setupData();

        return () => {
            unsubscribeAuth();
        };
    }, []);

    const handleForceSync = async () => {
        const branchName = branches.find(b => b.id === selectedBranchId)?.name || 'the selected branch';
        setNotification({ message: `Pushing local data for ${branchName} to server...`, type: 'info' });
        try {
            // This now specifically pushes local changes for the branch to cloud
            await dualStorage.forcePushBranchData(selectedBranchId);
            
            // Also do a full sync to catch any cloud changes
            await dualStorage.fullSyncFromCloud();
            
            setPendingSyncCount(dualStorage.getPendingCount(selectedBranchId));
            setLastSyncTime(dualStorage.getLastSyncTime());
            setNotification({ message: `Data for ${branchName} is now synced with server.`, type: 'success' });
        } catch (error) {
            console.error('Manual sync failed:', error);
            setNotification({ message: 'Sync failed. Please check your connection.', type: 'error' });
        }
    };
    
    // Update pending sync count when branch changes
    // Dynamic Data State
    const [items, setItems] = useState<Item[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        return records.filter((r: any) => r.type === 'item').map((r: any) => r.data);
    });
    const [branches, setBranches] = useState<Branch[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        const branchesData = records.filter((r: any) => r.type === 'branch').map((r: any) => r.data);
        return branchesData.sort((a, b) => {
            const getPriority = (name: string) => {
                const lowerName = name.toLowerCase();
                if (lowerName.includes('main')) return 1;
                if (lowerName.includes('dammam')) return 2;
                if (lowerName.includes('alhasa') || lowerName.includes('hasa')) return 3;
                return 4;
            };
            const priorityA = getPriority(a.name);
            const priorityB = getPriority(b.name);
            return priorityA !== priorityB ? priorityA - priorityB : a.name.localeCompare(b.name);
        });
    });
    const [users, setUsers] = useState<User[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        const usersData = records.filter((r: any) => r.type === 'user').map((r: any) => r.data);
        return usersData.length > 0 ? [alaaUser, ...usersData.filter((u: any) => u.username.toLowerCase() !== 'alaa')] : [alaaUser];
    });
    const [invoiceLogs, setInvoiceLogs] = useState<InvoiceLog[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        return records.filter((r: any) => r.type === 'invoice_log').map((r: any) => r.data as InvoiceLog);
    });
    const [appSettings, setAppSettings] = useState<AppSettings>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        const settingsData = records.find((r: any) => r.type === 'settings')?.data;
        if (settingsData) {
            return {
                ...settingsData,
                registrationStartDate: settingsData.registrationStartDate ? new Date(settingsData.registrationStartDate) : null,
                registrationEndDate: settingsData.registrationEndDate ? new Date(settingsData.registrationEndDate) : null,
                modificationStartDate: settingsData.modificationStartDate ? new Date(settingsData.modificationStartDate) : null,
                modificationEndDate: settingsData.modificationEndDate ? new Date(settingsData.modificationEndDate) : null,
            };
        }
        return {
            restrictRegistration: false,
            registrationStartDate: null,
            registrationEndDate: null,
            restrictModification: false,
            modificationStartDate: null,
            modificationEndDate: null,
            nextInvoiceNumbers: {}
        };
    });

    const [drivers, setDrivers] = useState<Driver[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        return records.filter((r: any) => r.type === 'driver').map((r: any) => r.data as Driver).sort((a, b) => a.driverId - b.driverId);
    });
    const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        return records.filter((r: any) => r.type === 'vehicle').map((r: any) => r.data as Vehicle).sort((a, b) => a.vehicleId - b.vehicleId);
    });
    const [driverWorkLogs, setDriverWorkLogs] = useState<IDriverWorkLog[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        return records.filter((r: any) => r.type === 'driver_work_log').map((r: any) => r.data as IDriverWorkLog);
    });
    const [driverMonthlySummaries, setDriverMonthlySummaries] = useState<DriverMonthlySummary[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        return records.filter((r: any) => r.type === 'driver_monthly_summary').map((r: any) => r.data as DriverMonthlySummary);
    });

    const [orders, setOrders] = useState<Order[]>(() => {
        const records = dualStorage.getLocalData(COLLECTIONS.RECORDS);
        return records.filter((r: any) => r.type === 'order').map((r: any) => ({
            ...(r.data as Order),
            id: r.id
        }));
    });

    const [prefilledCreditInvoice, setPrefilledCreditInvoice] = useState<{
        customerName: string;
        item: string;
        quantity: number;
        totalWithTax: number;
        orderIds: string[];
    } | null>(null);

    const [recentDeliveredGroup, setRecentDeliveredGroup] = useState<Order[] | null>(null);

    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('currentUser');
        return saved ? JSON.parse(saved) : null;
    });

    const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false);
    const lastPendingIdsRef = React.useRef<Set<string>>(new Set());
    const lastApprovedIdsRef = React.useRef<Set<string>>(new Set());

    const pendingOrdersList = useMemo(() => {
        return orders.filter(o => o.status === 'pending');
    }, [orders]);

    const canApproveOrders = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.role === 'admin' || 
               currentUser.username.toLowerCase() === 'alaa' || 
               (currentUser.permissions?.allowedPages || []).includes('Order Approvals');
    }, [currentUser]);

    useEffect(() => {
        if (!canApproveOrders) {
            setShowPendingOrdersModal(false);
            return;
        }
        if (pendingOrdersList.length === 0) {
            setShowPendingOrdersModal(false);
            lastPendingIdsRef.current = new Set();
            return;
        }

        const currentPendingIds = new Set(pendingOrdersList.map(o => o.id));
        const hasNewPending = Array.from(currentPendingIds).some(id => !lastPendingIdsRef.current.has(id));

        if (hasNewPending) {
            setShowPendingOrdersModal(true);
        }
        lastPendingIdsRef.current = currentPendingIds;
    }, [pendingOrdersList, canApproveOrders]);

    useEffect(() => {
        if (currentUser) {
            const latestUser = users.find(u => u.username === currentUser.username);
            if (latestUser && JSON.stringify(latestUser.permissions) !== JSON.stringify(currentUser.permissions)) {
                setCurrentUser(latestUser);
                localStorage.setItem('currentUser', JSON.stringify(latestUser));
            }
        }
    }, [users, currentUser]);

    // Order Flow routing guard
    useEffect(() => {
        if (appSettings?.directOrderFlow && currentPage === 'Order Approvals') {
            setCurrentPage('Dashboard');
        }
    }, [currentPage, appSettings?.directOrderFlow]);

    useEffect(() => {
        if (!currentUser?.permissions?.receiveNewOrderAlert) {
            return;
        }

        const approvedOrders = orders.filter(o => o.status === 'approved');
        const currentApprovedIds = new Set(approvedOrders.map(o => o.id));

        if (lastApprovedIdsRef.current.size > 0) {
            const hasNewApproved = approvedOrders.some(o => !lastApprovedIdsRef.current.has(o.id));
            if (hasNewApproved) {
                setNotification({ message: 'New Approved Order', type: 'info' }, 'notifyApproveOrder');
            }
        }
        
        lastApprovedIdsRef.current = currentApprovedIds;
    }, [orders, currentUser]);

    const [isNavHovered, setIsNavHovered] = useState(false);

    const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
        return localStorage.getItem('selectedBranchId') || '';
    });

    useEffect(() => {
        setPendingSyncCount(dualStorage.getPendingCount(selectedBranchId));
        
        // Poll pending sync count every 5 seconds (filtered by selected branch)
        const pollInterval = setInterval(() => {
            setPendingSyncCount(dualStorage.getPendingCount(selectedBranchId));
            setLastSyncTime(dualStorage.getLastSyncTime());
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [selectedBranchId]);

    const filteredBranches = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.permissions.allowedBranches.includes('all')) return branches;
        return branches.filter(b => currentUser.permissions.allowedBranches.includes(b.id));
    }, [branches, currentUser]);

    useEffect(() => {
        localStorage.setItem('selectedBranchId', selectedBranchId);
    }, [selectedBranchId]);

    useEffect(() => {
        if (currentUser && !currentUser.permissions.allowedPages.includes(currentPage)) {
            // Priority fallback: 'Daily Sales' if allowed, otherwise first allowed page
            const hasDailySales = currentUser.permissions.allowedPages.includes('Daily Sales');
            if (hasDailySales) {
                setCurrentPage('Daily Sales');
            } else {
                const firstAllowed = currentUser.permissions.allowedPages[0];
                if (firstAllowed) {
                    setCurrentPage(firstAllowed);
                }
            }
        }
    }, [currentUser, currentPage]);

    useEffect(() => {
        if (currentUser && filteredBranches.length > 0) {
            // Check if current selection is valid
            const isValid = selectedBranchId !== '' && filteredBranches.some(b => b.id === selectedBranchId);
            
            if (!isValid) {
                const lowerUser = currentUser.username.toLowerCase();
                if (filteredBranches.length === 1) {
                    setSelectedBranchId(filteredBranches[0].id);
                } else if (lowerUser.includes('dammam') && filteredBranches.some(b => b.id === 'b1')) {
                    setSelectedBranchId('b1');
                } else if (lowerUser.includes('hasa') && filteredBranches.some(b => b.id === 'b2')) {
                    setSelectedBranchId('b2');
                } else if (filteredBranches.some(b => b.id === 'b3')) {
                    setSelectedBranchId('b3');
                } else {
                    setSelectedBranchId(filteredBranches[0]?.id || '');
                }
            }
        }
    }, [currentUser, filteredBranches, selectedBranchId]);


    // Items Handlers
    const handleAddItem = (name: string, code?: string) => {
        const newItem: Item = { id: Date.now().toString(), name, code };
        dualStorage.save(COLLECTIONS.RECORDS, newItem.id, { type: 'item', data: newItem });
        setNotification({ message: 'Item Added', type: 'add' });
    };

    const handleUpdateItem = (id: string, name: string, code?: string) => {
        const updatedItem: Item = { id, name, code };
        dualStorage.save(COLLECTIONS.RECORDS, id, { type: 'item', data: updatedItem });
        setNotification({ message: 'Item Updated', type: 'update' });
    };

    const handleDeleteItem = (id: string) => {
        dualStorage.delete(COLLECTIONS.RECORDS, id);
        setNotification({ message: 'Item Deleted', type: 'delete' });
    };

    // Branch Handlers
    const handleAddBranch = (name: string) => {
        const id = `b-${Date.now()}`;
        const newBranch: Branch = { id, name };
        dualStorage.save(COLLECTIONS.RECORDS, newBranch.id, { type: 'branch', data: newBranch });
        setNotification({ message: 'Branch Added', type: 'add' });
    };

    const handleUpdateBranch = (id: string, name: string) => {
        const updatedBranch: Branch = { id, name };
        dualStorage.save(COLLECTIONS.RECORDS, id, { type: 'branch', data: updatedBranch });
        setNotification({ message: 'Branch Updated', type: 'update' });
    };

    const handleDeleteBranch = (id: string) => {
        if (branches.length <= 1) {
            setNotification({ message: 'Cannot delete the last branch.', type: 'error' });
            return;
        }
        dualStorage.delete(COLLECTIONS.RECORDS, id);
        if (selectedBranchId === id) {
             const remaining = branches.filter(b => b.id !== id);
             if (remaining.length > 0) setSelectedBranchId(remaining[0].id);
        }
        setNotification({ message: 'Branch Deleted', type: 'delete' });
    };

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setHasShownLoginPOAlert(false);
        if (user.permissions.allowedPages.includes('Dashboard')) {
            setCurrentPage('Dashboard');
        } else {
            setCurrentPage('Daily Sales');
        }
        
        const allowed = user.permissions.allowedBranches;
        const hasAll = allowed.includes('all');
        const hasMain = hasAll || allowed.includes('b3');
        const hasDammam = hasAll || allowed.includes('b1');
        const hasHasa = hasAll || allowed.includes('b2');

        const lowerUser = user.username.toLowerCase();
        
        if (allowed.length === 1 && !hasAll) {
            setSelectedBranchId(allowed[0]);
        } else if (lowerUser.includes('dammam') && hasDammam) {
            setSelectedBranchId('b1');
        } else if (lowerUser.includes('hasa') && hasHasa) {
            setSelectedBranchId('b2');
        } else if (hasMain) {
            setSelectedBranchId('b3');
        } else if (allowed.length > 0) {
            const firstSafe = allowed.find(a => a !== 'all') || allowed[0];
            if (firstSafe) setSelectedBranchId(firstSafe);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        setCurrentPage('Daily Sales');
        setHasShownLoginPOAlert(false);
        setShowLowPOAlert(false);
    };

    const handleAddUser = (user: User) => {
        // Ensure we don't overwrite alaaUser in Firestore if someone tries to add a user with that username
        if (user.username.toLowerCase() === 'alaa') {
            setNotification({ message: 'Cannot add a user with username "alaa".', type: 'error' });
            return;
        }
        dualStorage.save(COLLECTIONS.RECORDS, user.id, { type: 'user', data: user });
        setNotification({ message: 'User Added', type: 'add' });
    };

    const handleUpdateUser = (id: string, updatedUser: User) => {
        if (updatedUser.username.toLowerCase() === 'alaa' && id !== 'alaa-hidden') {
            setNotification({ message: 'Username "alaa" is reserved.', type: 'error' });
            return;
        }
        dualStorage.save(COLLECTIONS.RECORDS, id, { type: 'user', data: updatedUser });
        if (currentUser?.id === id) {
            setCurrentUser(updatedUser);
        }
        setNotification({ message: 'User Updated', type: 'update' });
    };

    const handleDeleteUser = (id: string) => {
        if (id === 'admin') {
            setNotification({ message: 'Cannot delete the main admin user.', type: 'error' });
            return;
        }
        dualStorage.delete(COLLECTIONS.RECORDS, id);
        if (currentUser?.id === id) {
            handleLogout();
        }
        setNotification({ message: 'User Deleted', type: 'delete' });
    };

    const handleUpdateSettings = (newSettings: AppSettings) => {
        const dataToSave = {
            ...newSettings,
            registrationStartDate: newSettings.registrationStartDate?.toISOString() || null,
            registrationEndDate: newSettings.registrationEndDate?.toISOString() || null,
            modificationStartDate: newSettings.modificationStartDate?.toISOString() || null,
            modificationEndDate: newSettings.modificationEndDate?.toISOString() || null,
        };
        dualStorage.save(COLLECTIONS.RECORDS, 'global_settings', { type: 'settings', data: dataToSave });
        setNotification({ message: 'Settings Updated', type: 'update' });
    };

    // Driver & Vehicle Handlers
    const handleAddDriver = async (name: string) => {
        const nextId = drivers.length > 0 ? Math.max(...drivers.map(d => d.driverId)) + 1 : 1;
        const newDriver: Driver = { id: `drv-${Date.now()}`, driverId: nextId, driverName: name };
        await dualStorage.save(COLLECTIONS.RECORDS, newDriver.id, { type: 'driver', data: newDriver });
        setNotification({ message: 'Driver Added', type: 'add' });
    };

    const handleUpdateDriver = async (id: string, name: string) => {
        const existing = drivers.find(d => d.id === id);
        if (!existing) return;
        const updated: Driver = { ...existing, driverName: name };
        await dualStorage.save(COLLECTIONS.RECORDS, id, { type: 'driver', data: updated });
        setNotification({ message: 'Driver Updated', type: 'update' });
    };

    const handleDeleteDriver = async (id: string) => {
        await dualStorage.delete(COLLECTIONS.RECORDS, id);
        setNotification({ message: 'Driver Deleted', type: 'delete' });
    };

    const handleAddVehicle = async (number: string) => {
        const nextId = vehicles.length > 0 ? Math.max(...vehicles.map(v => v.vehicleId)) + 1 : 1;
        const newVehicle: Vehicle = { id: `vhl-${Date.now()}`, vehicleId: nextId, vehicleNumber: number };
        await dualStorage.save(COLLECTIONS.RECORDS, newVehicle.id, { type: 'vehicle', data: newVehicle });
        setNotification({ message: 'Vehicle Added', type: 'add' });
    };

    const handleUpdateVehicle = async (id: string, number: string) => {
        const existing = vehicles.find(v => v.id === id);
        if (!existing) return;
        const updated: Vehicle = { ...existing, vehicleNumber: number };
        await dualStorage.save(COLLECTIONS.RECORDS, id, { type: 'vehicle', data: updated });
        setNotification({ message: 'Vehicle Updated', type: 'update' });
    };

    const handleDeleteVehicle = async (id: string) => {
        await dualStorage.delete(COLLECTIONS.RECORDS, id);
        setNotification({ message: 'Vehicle Deleted', type: 'delete' });
    };

    const handleSaveDriverWorkLog = async (log: Omit<IDriverWorkLog, 'id' | 'logId' | 'createdAt'>) => {
        const logId = `LOG-${Date.now()}`;
        const newLog: IDriverWorkLog = {
            ...log,
            id: `work-log-${Date.now()}`,
            logId,
            branchId: selectedBranchId,
            createdAt: new Date().toISOString()
        };
        await dualStorage.save(COLLECTIONS.RECORDS, newLog.id, { type: 'driver_work_log', data: newLog });
        setNotification({ message: 'Work Log Saved', type: 'add' });
    };

    const handleUpdateDriverWorkLog = async (log: IDriverWorkLog) => {
        await dualStorage.save(COLLECTIONS.RECORDS, log.id, { type: 'driver_work_log', data: log });
        setNotification({ message: 'Work Log Updated', type: 'update' });
    };

    const handleDeleteDriverWorkLog = async (id: string) => {
        await dualStorage.delete(COLLECTIONS.RECORDS, id);
        setNotification({ message: 'Work Log Deleted', type: 'delete' });
    };

    const handleUpdateDriverMonthlySummary = async (summary: DriverMonthlySummary) => {
        await dualStorage.save(COLLECTIONS.RECORDS, summary.id, { type: 'driver_monthly_summary', data: summary });
        setNotification({ message: 'Summary Updated', type: 'update' });
    };

    // Migration: branchInvoiceNumbers state is removed in favor of appSettings.nextInvoiceNumbers
    
    const getNextInvoiceNumber = (branchId: string, type: 'cash' | 'credit') => {
        // 1. Calculate max from same branch and same type to allow independent sequences
        const dynamicMax = allSalesInvoices.length > 0 
            ? Math.max(...allSalesInvoices
                .filter(inv => inv.branchId === branchId && inv.type === type)
                .map(inv => inv.invoiceNumber), 0) 
            : 0;

        // 2. Get manual counter from synced settings for this specific series
        const globalNext = appSettings.nextInvoiceNumbers?.[branchId]?.[type] || 1;

        return Math.max(dynamicMax + 1, globalNext);
    };

    const [notificationData, setNotificationData] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'add' | 'update' | 'delete' | 'warning' } | null>(null);

    const setNotification = React.useCallback((
        notif: { message: string, type: 'success' | 'error' | 'info' | 'add' | 'update' | 'delete' | 'warning' } | null,
        permKey?: keyof UserPermissions
    ) => {
        if (notif && permKey && currentUser?.permissions) {
            if (currentUser.permissions[permKey] === false) return;
        }
        setNotificationData(notif);
    }, [currentUser]);
    const [workingDate, setWorkingDate] = useState(new Date());

    const [allSalesInvoices, setAllSalesInvoices] = useState<Invoice[]>(() => {
        const saved = dualStorage.getLocalData(COLLECTIONS.SALES_INVOICES);
        return saved.map((inv: any) => {
            let dateValue = inv.date;
            if (dateValue && typeof dateValue === 'object' && dateValue.seconds !== undefined) {
                dateValue = new Date(dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000);
            } else if (dateValue) {
                dateValue = new Date(dateValue);
            } else {
                dateValue = new Date();
            }
            return { ...inv, date: isNaN(dateValue.getTime()) ? new Date() : dateValue };
        });
    });
    
    // Moved migration logic inside useEffect for better persistence
    useEffect(() => {
        const migrateInvoices = async () => {
            const fsData = dualStorage.getLocalData(COLLECTIONS.SALES_INVOICES);
            if (fsData && fsData.length > 0) {
                setAllSalesInvoices(fsData.map((inv: any) => {
                    let dateValue = inv.date;
                    if (dateValue && typeof dateValue === 'object' && dateValue.seconds !== undefined) {
                        dateValue = new Date(dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000);
                    } else if (dateValue) {
                        dateValue = new Date(dateValue);
                    } else {
                        dateValue = new Date();
                    }
                    return { ...inv, date: isNaN(dateValue.getTime()) ? new Date() : dateValue };
                }));
                return;
            }

            // Migration from old localStorage keys
            console.log("App: No FS data found, checking for old storage to migrate...");
            const oldCash = localStorage.getItem('cashInvoices');
            const oldCredit = localStorage.getItem('creditInvoices');
            const oldPosted = localStorage.getItem('postedInvoices');
            const oldAnnual = localStorage.getItem('annualInvoices');
            
            if (!oldCash && !oldCredit && !oldPosted && !oldAnnual) {
                console.log("App: No old storage found to migrate.");
                return;
            }

            let migrated: Invoice[] = [];
            if (oldCash) migrated = [...migrated, ...JSON.parse(oldCash).map((i:any) => ({...i, id: i.id || `cash-m-${Date.now()}-${Math.random()}`, status: 'daily' as const, type: 'cash' as const}))];
            if (oldCredit) migrated = [...migrated, ...JSON.parse(oldCredit).map((i:any) => ({...i, id: i.id || `credit-m-${Date.now()}-${Math.random()}`, status: 'daily' as const, type: 'credit' as const}))];
            if (oldPosted) migrated = [...migrated, ...JSON.parse(oldPosted).map((i:any) => ({...i, id: i.id || `posted-m-${Date.now()}-${Math.random()}`, status: 'monthly' as const}))];
            if (oldAnnual) migrated = [...migrated, ...JSON.parse(oldAnnual).map((i:any) => ({...i, id: i.id || `annual-m-${Date.now()}-${Math.random()}`, status: 'annual' as const}))];
            
            if (migrated.length > 0) {
                console.log(`App: Migrating ${migrated.length} invoices to DualStorage...`);
                // Batch save to dualStorage (this will update localStorage and Firestore)
                for (const inv of migrated) {
                    // We use save without awaiting for each if there are many, but DualStorage handles it
                    dualStorage.save(COLLECTIONS.SALES_INVOICES, inv.id, inv);
                }
                setAllSalesInvoices(migrated.map(inv => ({ ...inv, date: new Date(inv.date) })));
                
                // Clear old keys to avoid re-migration
                localStorage.removeItem('cashInvoices');
                localStorage.removeItem('creditInvoices');
                localStorage.removeItem('postedInvoices');
                localStorage.removeItem('annualInvoices');
                console.log("App: Migration complete, old storage cleared.");
            }
        };

        if (isAuthReady) {
            migrateInvoices();
        }
    }, [isAuthReady]);
    
    useEffect(() => {
        if (!isAuthReady || allSalesInvoices.length === 0 || users.length === 0 || branches.length === 0) return;

        let requiresUpdate = false;
        
        const correctedInvoices = allSalesInvoices.map(inv => {
            let correctBranchId = inv.branchId;
            let needsFix = false;

            const creator = inv.createdBy ? users.find(u => u.username === inv.createdBy) : null;
            
            if (creator) {
                const allowed = creator.permissions.allowedBranches;
                // If the creator only belongs to ONE specific branch (not 'all')
                if (allowed.length === 1 && allowed[0] !== 'all') {
                    if (inv.branchId !== allowed[0]) {
                        correctBranchId = allowed[0];
                        needsFix = true;
                    }
                } else if (!inv.branchId) {
                    // Fallbacks if no branchId and user has 'all' access
                    if (creator.username.toLowerCase().includes('dammam')) correctBranchId = 'b1';
                    else if (creator.username.toLowerCase().includes('hasa')) correctBranchId = 'b2';
                    else correctBranchId = 'b3';
                    needsFix = true;
                }
            } else if (!inv.branchId) {
                // Orphan invoices with no branch
                correctBranchId = 'b3';
                needsFix = true;
            }

            if (needsFix && correctBranchId) {
                const correctBranchName = branches.find(b => b.id === correctBranchId)?.name;
                requiresUpdate = true;
                return {
                    ...inv,
                    branchId: correctBranchId,
                    branchName: correctBranchName || inv.branchName
                };
            }
            return inv;
        });

        if (requiresUpdate) {
            console.log("Auto-correcting invoice branch assignments...");
            setAllSalesInvoices(correctedInvoices);
            // Save each modified invoice
            correctedInvoices.forEach(inv => {
                const original = allSalesInvoices.find(o => o.id === inv.id);
                if (original && original.branchId !== inv.branchId) {
                    dualStorage.save(COLLECTIONS.SALES_INVOICES, inv.id, { ...inv, date: new Date(inv.date).toISOString() });
                }
            });
            // We set notification on next tick to avoid rapid popups on load
            setTimeout(() => {
                setNotification({ message: 'Auto-corrected invoice branch data based on user permissions.', type: 'info' });
            }, 1000);
        }
    }, [isAuthReady, allSalesInvoices, users, branches]);
    
    // Update currentUser whenever users array changes (e.g., from Firestore sync)
    // to ensure permissions and details stay up-to-date real-time.
    useEffect(() => {
        if (currentUser) {
            const upToDateUser = users.find(u => u.id === currentUser.id);
            if (upToDateUser && JSON.stringify(upToDateUser) !== JSON.stringify(currentUser)) {
                setCurrentUser(upToDateUser);
                localStorage.setItem('currentUser', JSON.stringify(upToDateUser));
            }
        }
    }, [users, currentUser]);

    // Derived values for backward compatibility and simpler logic
    const cashInvoices = useMemo(() => allSalesInvoices.filter(inv => inv.type === 'cash'), [allSalesInvoices]);
    const creditInvoices = useMemo(() => allSalesInvoices.filter(inv => inv.type === 'credit'), [allSalesInvoices]);
    const postedInvoices = allSalesInvoices; // Now everything is "posted" immediately
    const annualInvoices = allSalesInvoices; // Now everything is visible in annual immediately
    
    const [customers, setCustomers] = useState<Customer[]>(() => dualStorage.getLocalData(COLLECTIONS.CUSTOMERS));
    const sortedCustomers = useMemo(() => {
        return [...customers].sort((a, b) => {
            const numA = parseInt(a.customerNumber) || 0;
            const numB = parseInt(b.customerNumber) || 0;
            return numA - numB;
        });
    }, [customers]);
    
    const [poCustomers, setPoCustomers] = useState<POCustomer[]>(() => dualStorage.getLocalData(COLLECTIONS.PO_CUSTOMERS));
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>(() => {
        const saved = dualStorage.getLocalData(COLLECTIONS.DELIVERY_NOTES);
        return saved.map((note: any) => ({ ...note, date: new Date(note.date) }));
    });
    const [bottleTransactions, setBottleTransactions] = useState<BottleTransaction[]>(() => {
        const saved = dualStorage.getLocalData(COLLECTIONS.BOTTLE_TRANSACTIONS);
        return saved.map((tx: any) => ({ ...tx, date: new Date(tx.date) }));
    });

    const [cashEditInvoice, setCashEditInvoice] = useState<Invoice | null>(null);
    const [creditEditInvoice, setCreditEditInvoice] = useState<Invoice | null>(null);

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    // Diagnostic Metrics for admin
    const checkUniqueCashNumber = (num: number, excludeId?: string) => {
        const selectedBranch = branches.find(b => b.id === selectedBranchId);
        return !allSalesInvoices.some(inv => 
            inv.invoiceNumber === num && 
            inv.type === 'cash' &&
            (inv.branchId === selectedBranchId || (selectedBranch && inv.branchName === selectedBranch.name)) &&
            inv.id !== excludeId
        );
    };

    const checkUniqueCreditNumber = (num: number, excludeId?: string) => {
        const selectedBranch = branches.find(b => b.id === selectedBranchId);
        return !allSalesInvoices.some(inv => 
            inv.invoiceNumber === num && 
            inv.type === 'credit' &&
            (inv.branchId === selectedBranchId || (selectedBranch && inv.branchName === selectedBranch.name)) &&
            inv.id !== excludeId
        );
    };

    const branchCashInvoices = useMemo(() => {
        const selectedBranch = branches.find(b => b.id === selectedBranchId);
        return cashInvoices.filter(inv => 
            (inv.branchId === selectedBranchId || (selectedBranch && inv.branchName === selectedBranch.name) || !inv.branchId) && 
            isSameDay(new Date(inv.date), workingDate)
        ).sort((a,b) => a.invoiceNumber - b.invoiceNumber);
    }, [cashInvoices, selectedBranchId, workingDate, branches]);

    const branchCreditInvoices = useMemo(() => {
        const selectedBranch = branches.find(b => b.id === selectedBranchId);
        return creditInvoices.filter(inv => 
            (inv.branchId === selectedBranchId || (selectedBranch && inv.branchName === selectedBranch.name) || !inv.branchId) && 
            isSameDay(new Date(inv.date), workingDate)
        ).sort((a,b) => a.invoiceNumber - b.invoiceNumber);
    }, [creditInvoices, selectedBranchId, workingDate, branches]);

    const branchPostedInvoices = useMemo(() => {
        const selectedBranch = branches.find(b => b.id === selectedBranchId);
        return postedInvoices.filter(inv => 
            inv.branchId === selectedBranchId || (selectedBranch && inv.branchName === selectedBranch.name) || !inv.branchId
        );
    }, [postedInvoices, selectedBranchId, branches]);

    const branchAnnualInvoices = useMemo(() => {
        const selectedBranch = branches.find(b => b.id === selectedBranchId);
        return annualInvoices.filter(inv => 
            inv.branchId === selectedBranchId || (selectedBranch && inv.branchName === selectedBranch.name) || !inv.branchId
        );
    }, [annualInvoices, selectedBranchId, branches]);

    const handleAddPOCustomer = async (initialData?: Partial<POCustomer>) => {
        console.log('App: handleAddPOCustomer triggered');
        const newCustomer: POCustomer = {
            id: Date.now().toString(),
            customerNumber: '',
            customerName: '',
            poNumber: '',
            type: 'credit',
            quantity: null,
            total: null,
            isUnsaved: true,
            ...initialData
        };
        console.log('App: Saving new customer:', newCustomer);
        try {
            await dualStorage.save(COLLECTIONS.PO_CUSTOMERS, newCustomer.id, newCustomer);
            setNotification({ message: 'New customer card created. Please edit the details.', type: 'info' });
        } catch (error: any) {
            setNotification({ message: `Permission Denied: Please update your Firestore Rules to allow access to the 'poCustomers' collection.`, type: 'error' });
        }
    };

    const handleUpdatePOCustomer = async (id: string, updatedCustomer: POCustomer) => {
        console.log('App: handleUpdatePOCustomer for id:', id);
        try {
            await dualStorage.save(COLLECTIONS.PO_CUSTOMERS, id, updatedCustomer);
        } catch (error: any) {
            setNotification({ message: `Permission Denied: Please update your Firestore Rules to allow access to the 'poCustomers' collection.`, type: 'error' });
        }
    };

    // Customer Handlers
    const handleAddCustomer = async (customer: Omit<Customer, 'id'>) => {
        const id = `c-${Date.now()}`;
        const newCustomer: Customer = { ...customer, id, isActive: true };
        await dualStorage.save(COLLECTIONS.CUSTOMERS, id, newCustomer);
        setNotification({ message: 'Customer Added', type: 'add' });
    };

    const handleUpdateCustomer = async (id: string, updatedCustomer: Customer) => {
        await dualStorage.save(COLLECTIONS.CUSTOMERS, id, updatedCustomer);
        setNotification({ message: 'Customer Updated', type: 'update' });
    };

    const handleDeleteCustomer = async (id: string) => {
        await dualStorage.delete(COLLECTIONS.CUSTOMERS, id);
        setNotification({ message: 'Customer Deleted', type: 'delete' });
    };

    const handleDeletePOCustomer = async (id: string) => {
        console.log('App: handleDeletePOCustomer triggered with id:', id);
        if (!id) {
            console.error('App: handleDeletePOCustomer called with no ID');
            return;
        }
        try {
            await dualStorage.delete(COLLECTIONS.PO_CUSTOMERS, id);
            setNotification({ message: 'Customer Deleted Permanently', type: 'delete' });
        } catch (error: any) {
            setNotification({ message: `Permission Denied: Please update your Firestore Rules to allow access to the 'poCustomers' collection.`, type: 'error' });
        }
    };

    const activeCustomers = useMemo(() => customers.filter(c => c.isActive !== false), [customers]);
    const sortedActiveCustomers = useMemo(() => sortedCustomers.filter(c => c.isActive !== false), [sortedCustomers]);

    const poCustomersWithBalances = useMemo(() => {
        const activeCustomerNames = new Set(activeCustomers.map(c => c.name.toLowerCase().trim()));
        return poCustomers
            .filter(customer => activeCustomerNames.has(customer.customerName.toLowerCase().trim()))
            .map(customer => {
                const customerInvoices = allSalesInvoices.filter(inv => inv.poCustomerId === customer.id);
                const usedQty = customerInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
                const usedTotal = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
                return {
                    ...customer,
                    remainingQuantity: (customer.quantity || 0) - usedQty,
                    remainingTotal: (customer.total || 0) - usedTotal
                };
            });
    }, [poCustomers, allSalesInvoices, activeCustomers]);

    const lowPOs = useMemo(() => {
        return poCustomersWithBalances.filter(c => {
            const isArchived = ((c.quantity || 0) > 0 && c.remainingQuantity <= 0) || ((c.total || 0) > 0 && c.remainingTotal <= 0);
            if (isArchived) return false;

            if (c.alertThreshold === undefined || c.alertThreshold <= 0) return false;

            const isQuantityAlert = (c.quantity || 0) > 0 && c.remainingQuantity <= c.alertThreshold;
            const isTotalAlert = (c.total || 0) > 0 && c.remainingTotal <= c.alertThreshold;

            return isQuantityAlert || isTotalAlert;
        });
    }, [poCustomersWithBalances]);

    const hasMainBranchAccess = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'alaa') return true;
        if (currentUser.permissions.allowedBranches.includes('all')) return true;
        const mainIds = branches.filter(b => b.name.toLowerCase().includes('main')).map(b => b.id);
        return currentUser.permissions.allowedBranches.some(bId => mainIds.includes(bId));
    }, [currentUser, branches]);

    const triggerPOAlert = React.useCallback(() => {
        setShowLowPOAlert(true);
        if (alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current);
        }
        alertTimeoutRef.current = setTimeout(() => {
            setShowLowPOAlert(false);
            alertTimeoutRef.current = null;
        }, 5000);
    }, []);

    const prevLowPOsRef = React.useRef<string[]>([]);

    useEffect(() => {
        if (!currentUser || currentUser.permissions?.receiveLowPOAlert === false) return;
        
        const currentLowPOIds = lowPOs.map(p => p.id);
        
        if (!hasShownLoginPOAlert && currentLowPOIds.length > 0) {
            setHasShownLoginPOAlert(true);
            triggerPOAlert();
        } else if (prevLowPOsRef.current.length > 0) {
            const newLowPOs = currentLowPOIds.filter(id => !prevLowPOsRef.current.includes(id));
            if (newLowPOs.length > 0) {
                triggerPOAlert();
            }
        }
        
        prevLowPOsRef.current = currentLowPOIds;
    }, [lowPOs, currentUser, triggerPOAlert, hasShownLoginPOAlert]);

    // Background timer to check and trigger daily notifications (strictly restricted to Capacitor Native Phone App)
    useEffect(() => {
        // Enforce that notifications ONLY run if the app is running on a native mobile phone platform (via Capacitor)
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        if (!appSettings || !appSettings.dailyNotificationEnabled || !appSettings.dailyNotificationTime) {
            return;
        }

        const intervalId = setInterval(() => {
            const now = new Date();
            
            const getLocalDateString = (d: Date) => {
                const yr = d.getFullYear();
                const mo = d.getMonth() + 1;
                const dy = d.getDate();
                return `${yr}-${mo < 10 ? '0' + mo : mo}-${dy < 10 ? '0' + dy : dy}`;
            };

            const todayStr = getLocalDateString(now);
            const currentHour = String(now.getHours()).padStart(2, '0');
            const currentMin = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHour}:${currentMin}`;

            const targetTimeStr = appSettings.dailyNotificationTime!;

            // Check if we hit or passed target time, and have not yet triggered for today
            if (currentTimeStr >= targetTimeStr && appSettings.lastTriggeredNotificationDate !== todayStr) {
                // Filter today's invoices
                const todayInvoices = allSalesInvoices.filter(inv => {
                    const invDateStr = getLocalDateString(new Date(inv.date));
                    return invDateStr === todayStr;
                });

                const branchSummaries: string[] = [];
                let grandTotal = 0;

                branches.forEach(b => {
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

                const performDispatch = async () => {
                    let sent = false;
                    try {
                        const check = await LocalNotifications.checkPermissions();
                        if (check.display === 'granted') {
                            await LocalNotifications.schedule({
                                notifications: [
                                    {
                                        title: 'ملخص المبيعات اليومية لشركة المياه العذبة المحدودة',
                                        body: bodyText,
                                        id: 1001,
                                        schedule: { at: new Date(Date.now() + 50) },
                                        sound: undefined,
                                        attachments: undefined,
                                        actionTypeId: "",
                                        extra: null
                                    }
                                ]
                            });
                            sent = true;
                        } else {
                            // Attempt lazy request on native if allowed
                            const req = await LocalNotifications.requestPermissions();
                            if (req.display === 'granted') {
                                await LocalNotifications.schedule({
                                    notifications: [
                                        {
                                            title: 'ملخص المبيعات اليومية لشركة المياه العذبة المحدودة',
                                            body: bodyText,
                                            id: 1001,
                                            schedule: { at: new Date(Date.now() + 50) },
                                            sound: undefined,
                                            attachments: undefined,
                                            actionTypeId: "",
                                            extra: null
                                        }
                                    ]
                                });
                                sent = true;
                            }
                        }
                    } catch (err) {
                        console.error('Failed to trigger native local notification', err);
                    }

                    if (sent) {
                        // Update settings state to log this triggered date
                        handleUpdateSettings({
                            ...appSettings,
                            lastTriggeredNotificationDate: todayStr
                        });
                        console.log(`Daily summary notification triggered successfully for ${todayStr}.`);
                    }
                };

                performDispatch();
            }
        }, 15000); // Check every 15 seconds for hot-response

        return () => clearInterval(intervalId);
    }, [appSettings, allSalesInvoices, branches]);

    // Background timer to check and trigger automatic backup of all system databases
    useEffect(() => {
        if (!appSettings || !appSettings.autoBackupEnabled || !appSettings.autoBackupTime) {
            return;
        }

        const intervalId = setInterval(() => {
            const now = new Date();
            
            const getLocalDateString = (d: Date) => {
                const yr = d.getFullYear();
                const mo = d.getMonth() + 1;
                const dy = d.getDate();
                return `${yr}-${mo < 10 ? '0' + mo : mo}-${dy < 10 ? '0' + dy : dy}`;
            };

            const todayStr = getLocalDateString(now);
            const currentHour = String(now.getHours()).padStart(2, '0');
            const currentMin = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHour}:${currentMin}`;

            const targetTimeStr = appSettings.autoBackupTime!;

            // Verify if we are at or past the target time and have not triggered backup today yet
            if (currentTimeStr >= targetTimeStr && appSettings.lastTriggeredBackupDate !== todayStr) {
                
                let frequencyMatch = false;
                const freq = appSettings.autoBackupFrequency || 'daily';

                if (freq === 'daily') {
                    frequencyMatch = true;
                } else if (freq === 'weekly') {
                    const currentDayOfWeek = now.getDay(); // 0 is Sunday, ..., 6 is Saturday
                    const targetDayOfWeek = appSettings.autoBackupDayOfWeek !== undefined ? Number(appSettings.autoBackupDayOfWeek) : 5; // Default to Friday
                    if (currentDayOfWeek === targetDayOfWeek) {
                        frequencyMatch = true;
                    }
                } else if (freq === 'monthly') {
                    const currentDayOfMonth = now.getDate(); // 1 - 31
                    const targetDayOfMonth = appSettings.autoBackupDayOfMonth !== undefined ? Number(appSettings.autoBackupDayOfMonth) : 1; // Default to 1st of month
                    if (currentDayOfMonth === targetDayOfMonth) {
                        frequencyMatch = true;
                    }
                }

                if (frequencyMatch) {
                    try {
                        const dataToBackup = dualStorage.exportAllData();
                        const jsonString = JSON.stringify(dataToBackup);
                        
                        // First, compress the JSON string using LZ-String
                        const compressed = LZString.compressToBase64(jsonString);
                        
                        const backupPass = appSettings.autoBackupPassword || 'swc_backup';
                        // Then, encrypt the compressed string
                        const encrypted = CryptoJS.AES.encrypt(compressed, backupPass).toString();
                        
                        // Generate recovery code (Base64 obfuscated password)
                        const recoveryCode = btoa(unescape(encodeURIComponent(backupPass)));

                        // Wrap in structure with compression metadata and recovery code
                        const finalPayload = JSON.stringify({
                            version: '2.5',
                            encrypted: true,
                            compressed: true,
                            recoveryCode: recoveryCode,
                            data: encrypted,
                            timestamp: new Date().toISOString()
                        });

                        const blob = new Blob([finalPayload], { type: 'application/json' });

                        const nowTime = new Date();
                        const yr = nowTime.getFullYear();
                        const mo = String(nowTime.getMonth() + 1).padStart(2, '0');
                        const dy = String(nowTime.getDate()).padStart(2, '0');
                        const hr = String(nowTime.getHours()).padStart(2, '0');
                        const min = String(nowTime.getMinutes()).padStart(2, '0');
                        const filename = `DailySales-${yr}-${mo}-${dy}-${hr}-${min}.json`;

                        downloadBlob(blob, filename, {
                            description: 'Automatic Secure Compressed JSON Backup File',
                            accept: { 'application/json': ['.json'] },
                        });

                        // Log triggered date
                        handleUpdateSettings({
                            ...appSettings,
                            lastTriggeredBackupDate: todayStr
                        });
                        
                        setNotification({ 
                            message: `تم أخذ نسخة احتياطية تلقائية من جميع البيانات وحفظها باسم ${filename}`, 
                            type: 'success' 
                        });
                        console.log(`Automatic Backup triggered successfully for ${todayStr}.`);
                    } catch (error) {
                        console.error("Auto Backup timer failed:", error);
                    }
                }
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [appSettings, handleUpdateSettings]);

    const handleCreateInvoiceFromOrder = (group: Order[]) => {
        if (group.length === 0) return;
        
        const mainOrder = group[0];
        const customerName = mainOrder.customerName;
        const item = mainOrder.item;
        
        const totalQty = group.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        const totalWithTax = group.reduce((acc, curr) => acc + (curr.totalWithTax || 0), 0);
        const orderIds = group.map(o => o.id);

        setPrefilledCreditInvoice({
            customerName,
            item,
            quantity: totalQty,
            totalWithTax,
            orderIds
        });

        if (currentPage !== 'Daily Sales') {
            setCurrentPage('Daily Sales');
        }
    };

    const handleAddInvoice = (invoice: Omit<Invoice, 'id' | 'date' | 'employeeId' | 'branchId' | 'status'>) => {
        if (!selectedBranchId) {
            setNotification({ message: 'Error: No branch selected. Please select a branch first.', type: 'error' });
            return;
        }

        // Validation for PO Balance
        if (invoice.poCustomerId) {
            const poCust = poCustomersWithBalances.find(c => c.id === invoice.poCustomerId);
            if (poCust) {
                // If PO has quantity and invoice exceeds remaining
                if (poCust.quantity > 0 && invoice.quantity > poCust.remainingQuantity) {
                    setNotification({ 
                        message: `Insufficient PO Quantity. Remaining: ${poCust.remainingQuantity}, Requested: ${invoice.quantity}`, 
                        type: 'error' 
                    });
                    return;
                }
                // If PO has total and invoice exceeds remaining
                if (poCust.total > 0 && invoice.total > poCust.remainingTotal) {
                    setNotification({ 
                        message: `Insufficient PO Balance. Remaining: ${poCust.remainingTotal.toFixed(2)}, Requested: ${invoice.total.toFixed(2)}`, 
                        type: 'error' 
                    });
                    return;
                }
            } else {
                setNotification({ message: 'Selected PO Customer not found.', type: 'error' });
                return;
            }
        }

        // Registration Restriction
        if (appSettings.restrictRegistration) {
            const start = appSettings.registrationStartDate ? new Date(appSettings.registrationStartDate) : null;
            const end = appSettings.registrationEndDate ? new Date(appSettings.registrationEndDate) : null;
            const current = new Date(workingDate);
            current.setHours(0,0,0,0);
            
            if (start) start.setHours(0,0,0,0);
            if (end) end.setHours(0,0,0,0);

            if ((start && current < start) || (end && current > end)) {
                setNotification({ message: 'Invoice date is outside the allowed registration range.', type: 'error' });
                return;
            }
        }

        if (!isAuthReady) {
            setNotification({ message: 'System is initializing. Please wait.', type: 'error' });
            return;
        }

        // DOUBLE CHECK UNIQUENESS BEFORE SAVING (Anti-collision) - Specific to branch and type
        const isUnique = !allSalesInvoices.some(inv => 
            inv.invoiceNumber === invoice.invoiceNumber && 
            inv.branchId === selectedBranchId && 
            inv.type === invoice.type
        );
        if (!isUnique) {
            setNotification({ message: `Invoice number ${invoice.invoiceNumber} is already taken. Please use a unique number.`, type: 'error' });
            return;
        }

        const now = new Date();
        const invoiceDate = new Date(workingDate);
        invoiceDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

        // ABSOLUTE UNIQUENESS: Use a composite ID that physically prevents duplicates in Firestore/LocalStorage
        // Format: inv-[branchId]-[type]-[invoiceNumber]
        const uniqueId = `inv-${selectedBranchId}-${invoice.type}-${invoice.invoiceNumber}`;

        const newInvoice: Invoice = {
            ...invoice,
            id: uniqueId,
            date: invoiceDate,
            status: 'daily',
            branchId: selectedBranchId,
            createdBy: currentUser?.username
        };

        // Update global synced invoice numbers
        const currentNextNumbers = appSettings.nextInvoiceNumbers || {};
        const branchNext = currentNextNumbers[selectedBranchId] || { cash: 1, credit: 1 };
        
        const updatedSettings: AppSettings = {
            ...appSettings,
            nextInvoiceNumbers: {
                ...currentNextNumbers,
                [selectedBranchId]: {
                    ...branchNext,
                    [invoice.type]: newInvoice.invoiceNumber + 1
                }
            }
        };

        handleUpdateSettings(updatedSettings);

        dualStorage.save(COLLECTIONS.SALES_INVOICES, newInvoice.id, { ...newInvoice, date: newInvoice.date.toISOString() });

        // Handle prefilled orders status updates to mark them as delivered
        if (invoice.orderIds && invoice.orderIds.length > 0) {
            const deliveredOrders: Order[] = [];
            invoice.orderIds.forEach(orderId => {
                const existingOrder = orders.find(o => o.id === orderId);
                if (existingOrder) {
                    const updatedOrder = { ...existingOrder, status: 'delivered' as const };
                    deliveredOrders.push(updatedOrder);
                    dualStorage.save(COLLECTIONS.RECORDS, orderId, {
                        type: 'order',
                        data: updatedOrder
                    });
                }
            });
            if (deliveredOrders.length > 0) {
                // Determine popup permission
                const hasPopupPermission = currentUser?.role === 'admin' || 
                                           currentUser?.username?.toLowerCase() === 'alaa' || 
                                           currentUser?.permissions?.showDeliveryConfirmationPopup !== false;
                if (hasPopupPermission) {
                    setRecentDeliveredGroup(deliveredOrders);
                }
            }
            setOrders(prevOrders => 
                prevOrders.map(o => 
                    invoice.orderIds!.includes(o.id) ? { ...o, status: 'delivered' as const } : o
                )
            );
        }

        setNotification(
            { message: `Invoice #${newInvoice.invoiceNumber} Saved`, type: 'add' },
            invoice.type === 'cash' ? 'notifyAddCashInvoice' : 'notifyAddCreditInvoice'
        );
    };

    const handleUpdateInvoice = (updatedInvoice: Invoice) => {
        // DOUBLE CHECK UNIQUENESS BEFORE UPDATING (Anti-collision) - Specific to branch and type
        // Check if the new number exists in the same branch/type (exclude the one being edited)
        const isUnique = !allSalesInvoices.some(inv => 
            inv.invoiceNumber === updatedInvoice.invoiceNumber && 
            inv.branchId === updatedInvoice.branchId &&
            inv.type === updatedInvoice.type &&
            inv.id !== updatedInvoice.id
        );
        if (!isUnique) {
            setNotification({ message: `Invoice number ${updatedInvoice.invoiceNumber} is already used by another invoice.`, type: 'error' });
            return;
        }

        // Validation for PO Balance
        if (updatedInvoice.poCustomerId) {
            const poCust = poCustomersWithBalances.find(c => c.id === updatedInvoice.poCustomerId);
            if (poCust) {
                // For updates, we need to calculate remaining balance EXCLUDING the current invoice's OLD values
                const currentInvoices = allSalesInvoices.filter(inv => inv.poCustomerId === updatedInvoice.poCustomerId && inv.id !== updatedInvoice.id);
                const usedQty = currentInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
                const usedTotal = currentInvoices.reduce((sum, inv) => sum + inv.total, 0);
                const actualRemainingQty = (poCust.quantity || 0) - usedQty;
                const actualRemainingTotal = (poCust.total || 0) - usedTotal;

                if (poCust.quantity > 0 && updatedInvoice.quantity > actualRemainingQty) {
                    setNotification({ 
                        message: `Insufficient PO Quantity. Remaining: ${actualRemainingQty}, Requested: ${updatedInvoice.quantity}`, 
                        type: 'error' 
                    });
                    return;
                }
                if (poCust.total > 0 && updatedInvoice.total > actualRemainingTotal) {
                    setNotification({ 
                        message: `Insufficient PO Balance. Remaining: ${actualRemainingTotal.toFixed(2)}, Requested: ${updatedInvoice.total.toFixed(2)}`, 
                        type: 'error' 
                    });
                    return;
                }
            }
        }

        // Modification Restriction
        if (appSettings.restrictModification) {
            const start = appSettings.modificationStartDate ? new Date(appSettings.modificationStartDate) : null;
            const end = appSettings.modificationEndDate ? new Date(appSettings.modificationEndDate) : null;
            const invDate = new Date(updatedInvoice.date);
            invDate.setHours(0,0,0,0);

            if (start) start.setHours(0,0,0,0);
            if (end) end.setHours(0,0,0,0);

            if (start && end) {
                 if (invDate >= start && invDate <= end) {
                    setNotification({ message: 'Invoice Protected from Edit', type: 'error' });
                    return;
                 }
            } else if (start && invDate >= start && !end) {
                setNotification({ message: 'Invoice Protected from Edit', type: 'error' });
                return;
            } else if (end && invDate <= end && !start) {
                setNotification({ message: 'Invoice Protected from Edit', type: 'error' });
                return;
            }
        }

        const oldInvoice = allSalesInvoices.find(inv => inv.id === updatedInvoice.id);

        if (oldInvoice) {
            const logEntry: InvoiceLog = {
                id: 'log-' + new Date().getTime() + '-' + Math.random().toString(36).substring(7),
                action: 'EDIT',
                invoiceId: updatedInvoice.id,
                invoiceNumber: updatedInvoice.invoiceNumber,
                branchId: updatedInvoice.branchId,
                date: new Date(),
                user: currentUser?.username || 'Unknown',
                previousValues: oldInvoice,
                newValues: updatedInvoice
            };
            dualStorage.save(COLLECTIONS.RECORDS, logEntry.id, { type: 'invoice_log', data: logEntry });

            // If the ID was dependent on invoiceNumber and the number changed, 
            // we must create a new document and delete the old one.
            const newId = `inv-${updatedInvoice.branchId}-${updatedInvoice.type}-${updatedInvoice.invoiceNumber}`;
            
            if (newId !== updatedInvoice.id) {
                console.log(`App: Invoice identity changed from ${updatedInvoice.id} to ${newId}. Deleting old and creating new.`);
                
                // Create new invoice with updated identity
                const finalInvoice = { ...updatedInvoice, id: newId };
                dualStorage.save(COLLECTIONS.SALES_INVOICES, newId, { ...finalInvoice, date: finalInvoice.date.toISOString() });
                
                // Delete the old one
                dualStorage.delete(COLLECTIONS.SALES_INVOICES, updatedInvoice.id);
            } else {
                dualStorage.save(COLLECTIONS.SALES_INVOICES, updatedInvoice.id, { ...updatedInvoice, date: updatedInvoice.date.toISOString() });
            }
        } else {
            // Fallback for case where old invoice not found in current state
            dualStorage.save(COLLECTIONS.SALES_INVOICES, updatedInvoice.id, { ...updatedInvoice, date: updatedInvoice.date.toISOString() });
        }

        // Clear the edit state after successful update
        if (updatedInvoice.type === 'cash') setCashEditInvoice(null);
        else setCreditEditInvoice(null);

        setNotification(
            { message: `Invoice #${updatedInvoice.invoiceNumber} Updated`, type: 'update' },
            updatedInvoice.type === 'cash' ? 'notifyEditCashInvoice' : 'notifyEditCreditInvoice'
        );
    };

    const handleDeleteInvoice = (id: string) => {
        console.log(`App: Attempting to delete invoice with ID: ${id}`);
        const invoiceToDelete = allSalesInvoices.find(inv => inv.id === id);
        
        if (!invoiceToDelete) {
            console.warn(`App: Invoice with ID ${id} not found in allSalesInvoices state.`);
            console.log('App: Available IDs:', allSalesInvoices.map(inv => inv.id).join(', '));
            setNotification({ message: 'Error: Invoice not found in state.', type: 'error' });
            return;
        }

        if (invoiceToDelete && appSettings.restrictModification) {
           const start = appSettings.modificationStartDate ? new Date(appSettings.modificationStartDate) : null;
           const end = appSettings.modificationEndDate ? new Date(appSettings.modificationEndDate) : null;
           const invDate = new Date(invoiceToDelete.date);
           invDate.setHours(0,0,0,0);

           if (start) start.setHours(0,0,0,0);
           if (end) end.setHours(0,0,0,0);

           if (start && end) {
                if (invDate >= start && invDate <= end) {
                   console.warn('App: Deletion blocked by date restriction.');
                   setNotification({ message: 'Invoice Protected from Deletion', type: 'error' });
                   return;
                }
           } else if (start && invDate >= start && !end) {
               console.warn('App: Deletion blocked by date restriction (start only).');
               setNotification({ message: 'Invoice Protected from Deletion', type: 'error' });
               return;
           } else if (end && invDate <= end && !start) {
               console.warn('App: Deletion blocked by date restriction (end only).');
               setNotification({ message: 'Invoice Protected from Deletion', type: 'error' });
               return;
           }
        }

        console.log('App: Calling dualStorage.delete');
        if (invoiceToDelete) {
            const logEntry: InvoiceLog = {
                id: 'log-' + new Date().getTime() + '-' + Math.random().toString(36).substring(7),
                action: 'DELETE',
                invoiceId: invoiceToDelete.id,
                invoiceNumber: invoiceToDelete.invoiceNumber,
                branchId: invoiceToDelete.branchId,
                date: new Date(),
                user: currentUser?.username || 'Unknown',
                previousValues: invoiceToDelete,
            };
            dualStorage.save(COLLECTIONS.RECORDS, logEntry.id, { type: 'invoice_log', data: logEntry });
        }
        
        dualStorage.delete(COLLECTIONS.SALES_INVOICES, id);
        if (invoiceToDelete) {
            setNotification(
                { message: 'Invoice Deleted', type: 'delete' },
                invoiceToDelete.type === 'cash' ? 'notifyDeleteCashInvoice' : 'notifyDeleteCreditInvoice'
            );
        } else {
            setNotification({ message: 'Invoice Deleted', type: 'delete' });
        }
        
        // Reset edit mode if it was the deleted invoice
        if (cashEditInvoice?.id === id) setCashEditInvoice(null);
        if (creditEditInvoice?.id === id) setCreditEditInvoice(null);
    };

    const totalCash = useMemo(() => branchCashInvoices.reduce((sum, inv) => sum + inv.total, 0), [branchCashInvoices]);
    const totalCredit = useMemo(() => branchCreditInvoices.reduce((sum, inv) => sum + inv.total, 0), [branchCreditInvoices]);
    const totalDaySales = useMemo(() => totalCash + totalCredit, [totalCash, totalCredit]);
    const allInvoices = useMemo(() => [...branchCashInvoices, ...branchCreditInvoices].sort((a,b) => a.date.getTime() - b.date.getTime()), [branchCashInvoices, branchCreditInvoices]);
    
    const combinedSummaryData = useMemo(() => {
        const summaryData = allInvoices.reduce((acc, invoice) => {
            const { itemName, quantity, total } = invoice;
            if (itemName === 'Cancel') return acc;
            if (!acc[itemName]) {
                acc[itemName] = { totalQuantity: 0, grandTotal: 0 };
            }
            acc[itemName].totalQuantity += quantity;
            acc[itemName].grandTotal += total;
            return acc;
        }, {} as { [itemName: string]: { totalQuantity: number; grandTotal: number; } });
        return Object.keys(summaryData).map((name) => ({
                name,
                totalQuantity: summaryData[name].totalQuantity,
                grandTotal: summaryData[name].grandTotal,
        }));
    }, [allInvoices]);

    const handlePrintDaily = () => {
        captureAndExport('printable-area-daily', (canvas) => {
            const branchName = branches.find(b => b.id === selectedBranchId)?.name || 'Main_Branch';
            const filename = `daily-sales-${branchName.replace(/\s+/g, '_')}-${workingDate.toLocaleDateString('en-GB').replace(/\//g, '-')}`;
            printOrDownloadPdf(canvas, filename, 'p');
        });
    };
    
    const handleExportExcelDaily = async () => {
        const ExcelJS = window.ExcelJS;
        if (!ExcelJS) { console.error("ExcelJS library is not loaded."); return; }
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Daily Sales Report', { views: [{ rightToLeft: false }] });
        const employeeName = currentUser?.username || 'N/A';
        const branchName = branches.find(b => b.id === selectedBranchId)?.name || 'Main Branch';
        const date = workingDate.toLocaleDateString('en-GB');
        const totalSummaryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } };
        const combinedSummaryFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        const cashSectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF4FF' } };
        const creditSectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FFF4' } };
        const cashHeaderFont = { bold: true, color: { argb: 'FF2C5282' } };
        const creditHeaderFont = { bold: true, color: { argb: 'FF276749' } };
        const sectionTitleFont = { bold: true };
        const invoiceHeaderFont = { bold: true, color: { argb: 'FFFFFFFF' }};
        const cashInvoiceHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3182CE' } };
        const creditInvoiceHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF38A169' } };
        const totalRowFont = { bold: true };
        const totalCashFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBEE3F8' } };
        const totalCreditFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6F6D5' } };
        sheet.mergeCells('A1:J2');
        const headerCell = sheet.getCell('A1');
        headerCell.value = 'Daily Sales Report\nSweet Water Company LTD';
        headerCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF276749' } };
        headerCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        sheet.getRow(1).height = 25; sheet.getRow(2).height = 25;
        sheet.mergeCells('A3:J3');
        const userInfoCell = sheet.getCell('A3');
        userInfoCell.value = `Branch: ${branchName}`;
        userInfoCell.font = { size: 10, color: { argb: 'FFFFFFFF' }, bold: true };
        userInfoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F855A' } };
        userInfoCell.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.getRow(3).height = 20;
        sheet.addRow([]);
        let currentRow = 5;
        sheet.getCell(`A${currentRow}`).value = 'Date:';
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        sheet.getCell(`B${currentRow}`).value = date;
        currentRow++;
        sheet.getCell(`A${currentRow}`).value = 'Employee:';
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        sheet.getCell(`B${currentRow}`).value = employeeName;
        currentRow += 2;
        
        // Define columns constants
        // Left side: Cash. Right side: Credit.
        // Columns per section: No, Time, Employee, Item, Qty, Total (6 columns)
        // Gap: 1 column
        
        const cashColStart = 1;
        const cashWidth = 6;
        const gap = 1;
        const creditColStart = cashColStart + cashWidth + gap; // 1 + 6 + 1 = 8
        const creditWidth = 6;
        
        const summaryStartRow = currentRow;
        sheet.mergeCells(`A${summaryStartRow}:C${summaryStartRow}`);
        const totalSummaryTitle = sheet.getCell(`A${summaryStartRow}`);
        totalSummaryTitle.value = 'Total Summary';
        totalSummaryTitle.font = sectionTitleFont;
        totalSummaryTitle.fill = totalSummaryFill;
        const summaryHeaders = sheet.getRow(summaryStartRow + 1);
        summaryHeaders.getCell(1).value = 'Total Cash';
        summaryHeaders.getCell(2).value = 'Total Credit';
        summaryHeaders.getCell(3).value = 'Total Day Sales';
        summaryHeaders.eachCell(c => { c.style = { font: sectionTitleFont, fill: totalSummaryFill }; });
        const summaryDataRow = sheet.getRow(summaryStartRow + 2);
        summaryDataRow.getCell(1).value = totalCash;
        summaryDataRow.getCell(1).numFmt = '#,##0.00';
        summaryDataRow.getCell(2).value = totalCredit;
        summaryDataRow.getCell(2).numFmt = '#,##0.00';
        summaryDataRow.getCell(3).value = totalDaySales;
        summaryDataRow.getCell(3).numFmt = '#,##0.00';
        summaryDataRow.eachCell(c => { c.fill = totalSummaryFill; });
        
        if (combinedSummaryData.length > 0) {
            // Place combined summary to the right of total summary, aligned with Credit section start roughly
            const combinedSummaryStartCol = creditColStart;
            sheet.mergeCells(summaryStartRow, combinedSummaryStartCol, summaryStartRow, combinedSummaryStartCol + 2);
            const combinedSummaryTitle = sheet.getCell(summaryStartRow, combinedSummaryStartCol);
            combinedSummaryTitle.value = 'Combined Summary by Item';
            combinedSummaryTitle.font = sectionTitleFont;
            combinedSummaryTitle.fill = combinedSummaryFill;
            const combinedHeaders = sheet.getRow(summaryStartRow + 1);
            combinedHeaders.getCell(combinedSummaryStartCol).value = 'Item';
            combinedHeaders.getCell(combinedSummaryStartCol + 1).value = 'Total Quantity';
            combinedHeaders.getCell(combinedSummaryStartCol + 2).value = 'Grand Total';
            [combinedSummaryStartCol, combinedSummaryStartCol + 1, combinedSummaryStartCol + 2].forEach(colIdx => {
                combinedHeaders.getCell(colIdx).style = { font: sectionTitleFont, fill: combinedSummaryFill };
            });
            combinedSummaryData.forEach((item, index) => {
                const row = sheet.getRow(summaryStartRow + 2 + index);
                row.getCell(combinedSummaryStartCol).value = item.name;
                row.getCell(combinedSummaryStartCol + 1).value = item.totalQuantity;
                row.getCell(combinedSummaryStartCol + 2).value = item.grandTotal;
                row.getCell(combinedSummaryStartCol + 2).numFmt = '#,##0.00';
                [combinedSummaryStartCol, combinedSummaryStartCol + 1, combinedSummaryStartCol + 2].forEach(colIdx => {
                    row.getCell(colIdx).fill = combinedSummaryFill;
                });
            });
        }
        
        currentRow += Math.max(3, combinedSummaryData.length + 2) + 1;
        const invoiceStartRow = currentRow;
        
        // Headers for Invoice Tables
        sheet.mergeCells(invoiceStartRow, cashColStart, invoiceStartRow, cashColStart + cashWidth - 1);
        const cashTitleCell = sheet.getCell(invoiceStartRow, cashColStart);
        cashTitleCell.value = 'Registered Cash Invoices';
        cashTitleCell.style = { font: cashHeaderFont, fill: cashSectionFill, alignment: { horizontal: 'center' } };
        
        sheet.mergeCells(invoiceStartRow, creditColStart, invoiceStartRow, creditColStart + creditWidth - 1);
        const creditTitleCell = sheet.getCell(invoiceStartRow, creditColStart);
        creditTitleCell.value = 'Registered Credit Invoices';
        creditTitleCell.style = { font: creditHeaderFont, fill: creditSectionFill, alignment: { horizontal: 'center' } };
        
        const subheaderRow = sheet.getRow(invoiceStartRow + 1);
        const invoiceHeaders = ['No.', 'Time', 'Employee', 'Item', 'Qty', 'Total'];
        
        invoiceHeaders.forEach((header, i) => {
            const cashCell = subheaderRow.getCell(cashColStart + i);
            cashCell.value = header;
            cashCell.style = { font: invoiceHeaderFont, fill: cashInvoiceHeaderFill };
            const creditCell = subheaderRow.getCell(creditColStart + i);
            creditCell.value = header;
            creditCell.style = { font: invoiceHeaderFont, fill: creditInvoiceHeaderFill };
        });
        
        const maxInvoices = Math.max(branchCashInvoices.length, branchCreditInvoices.length);
        const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        for (let i = 0; i < maxInvoices; i++) {
            const dataRow = sheet.getRow(invoiceStartRow + 2 + i);
            if (i < branchCashInvoices.length) {
                const inv = branchCashInvoices[i];
                dataRow.getCell(cashColStart).value = inv.invoiceNumber;
                dataRow.getCell(cashColStart + 1).value = formatTime(inv.date);
                dataRow.getCell(cashColStart + 2).value = inv.createdBy || 'Unknown';
                dataRow.getCell(cashColStart + 3).value = inv.itemName;
                dataRow.getCell(cashColStart + 4).value = inv.quantity;
                dataRow.getCell(cashColStart + 5).value = inv.total;
                dataRow.getCell(cashColStart + 5).numFmt = '#,##0.00';
                for(let j=0; j<cashWidth; j++) dataRow.getCell(cashColStart + j).fill = cashSectionFill;
            }
            if (i < branchCreditInvoices.length) {
                const inv = branchCreditInvoices[i];
                dataRow.getCell(creditColStart).value = inv.invoiceNumber;
                dataRow.getCell(creditColStart + 1).value = formatTime(inv.date);
                dataRow.getCell(creditColStart + 2).value = inv.createdBy || 'Unknown';
                dataRow.getCell(creditColStart + 3).value = inv.itemName;
                dataRow.getCell(creditColStart + 4).value = inv.quantity;
                dataRow.getCell(creditColStart + 5).value = inv.total;
                dataRow.getCell(creditColStart + 5).numFmt = '#,##0.00';
                for(let j=0; j<creditWidth; j++) dataRow.getCell(creditColStart + j).fill = creditSectionFill;
            }
        }
        
        const totalCashQty = branchCashInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalCreditQty = branchCreditInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
        
        // Totals Row
        // Merge No, Time, Employee, Item cells for "Total Label"
        if (branchCashInvoices.length > 0) {
            const totalRow = sheet.getRow(invoiceStartRow + 2 + branchCashInvoices.length);
            const labelCell = totalRow.getCell(cashColStart);
            labelCell.value = 'Total Cash';
            sheet.mergeCells(totalRow.getCell(cashColStart).address, totalRow.getCell(cashColStart + 3).address);
            
            totalRow.getCell(cashColStart + 4).value = totalCashQty;
            totalRow.getCell(cashColStart + 5).value = totalCash;
            totalRow.getCell(cashColStart + 5).numFmt = '#,##0.00';
            
            // Apply styles to all cells in the range
            for(let j=0; j<cashWidth; j++) {
                const cell = totalRow.getCell(cashColStart + j);
                cell.font = totalRowFont;
                cell.fill = totalCashFill;
            }
        }
        
        if (branchCreditInvoices.length > 0) {
            const totalRow = sheet.getRow(invoiceStartRow + 2 + branchCreditInvoices.length);
            const labelCell = totalRow.getCell(creditColStart);
            labelCell.value = 'Total Credit';
            sheet.mergeCells(totalRow.getCell(creditColStart).address, totalRow.getCell(creditColStart + 3).address);
            
            totalRow.getCell(creditColStart + 4).value = totalCreditQty;
            totalRow.getCell(creditColStart + 5).value = totalCredit;
            totalRow.getCell(creditColStart + 5).numFmt = '#,##0.00';
            
            for(let j=0; j<creditWidth; j++) {
                const cell = totalRow.getCell(creditColStart + j);
                cell.font = totalRowFont;
                cell.fill = totalCreditFill;
            }
        }
        
        // Widths
        // Cash section
        sheet.getColumn(cashColStart).width = 8; // No
        sheet.getColumn(cashColStart + 1).width = 10; // Time
        sheet.getColumn(cashColStart + 2).width = 20; // Employee
        sheet.getColumn(cashColStart + 3).width = 15; // Item
        sheet.getColumn(cashColStart + 4).width = 8; // Qty
        sheet.getColumn(cashColStart + 5).width = 12; // Total
        
        // Credit section
        sheet.getColumn(creditColStart).width = 8;
        sheet.getColumn(creditColStart + 1).width = 10;
        sheet.getColumn(creditColStart + 2).width = 20;
        sheet.getColumn(creditColStart + 3).width = 15;
        sheet.getColumn(creditColStart + 4).width = 8;
        sheet.getColumn(creditColStart + 5).width = 12;
        
        workbook.xlsx.writeBuffer().then(async buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const safeDate = date.replace(/\//g, '-');
            const filename = `daily-sales-report-${safeDate}.xlsx`;
            
            await downloadBlob(blob, filename, {
                description: 'Excel File',
                accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
            });
        });
    };
    
    const handleExportPdfDaily = () => captureAndExport('printable-area-daily', async (canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth(), pdfHeight = pdf.internal.pageSize.getHeight();
        const ratio = canvas.width / canvas.height;
        let width = pdfWidth, height = width / ratio;
        if (height > pdfHeight) { height = pdfHeight; width = height * ratio; }
        const xOffset = (pdfWidth - width) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, width, height);

        const filename = `daily-sales-report-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
        const blob = pdf.output('blob');

        await downloadBlob(blob, filename, {
            description: 'PDF File',
            accept: { 'application/pdf': ['.pdf'] },
        });
    });

    const renderPage = () => {
        if (!currentUser) return null;

        // Check if user has access to current page
        if (!currentUser.permissions.allowedPages.includes(currentPage)) {
            return (
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mt-6 bg-white rounded-lg shadow-md p-6 text-center">
                        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                        <p className="text-gray-500 mt-2">You do not have permission to view the {currentPage} page.</p>
                    </div>
                </div>
            );
        }

        switch (currentPage) {
            case 'Dashboard':
                return (
                    <div className="px-2 sm:px-6 lg:px-8 pb-8 pt-0">
                        <Dashboard invoices={allSalesInvoices} branches={branches} />
                    </div>
                );
            case 'Daily Sales':
                return (
                    <div id="printable-area-daily">
                        <div className="print-only" style={{ height: '20px' }}></div>
                        <div className="print-only px-4 sm:px-6 lg:px-8">
                            <Header 
                                employeeName={currentUser.username} 
                                currentUser={currentUser}
                                date={workingDate} 
                                branches={filteredBranches}
                                selectedBranchId={selectedBranchId}
                                onSelectBranch={setSelectedBranchId}
                                readOnly={filteredBranches.length <= 1}
                                pendingCount={pendingSyncCount}
                                lastSyncTime={lastSyncTime}
                                onRefresh={handleForceSync}
                                approvedOrders={orders.filter(o => o.status === 'approved')}
                                currentPage={currentPage}
                                onCreateInvoice={handleCreateInvoiceFromOrder}
                                deliveredGroupProps={recentDeliveredGroup}
                                onCloseDeliveredGroup={() => setRecentDeliveredGroup(null)}
                            />
                        </div>
                        <div className="px-2 sm:px-6 lg:px-8 pb-8 pt-2">
                            <FilterBar 
                                invoiceCount={allInvoices.length}
                                onPrint={handlePrintDaily}
                                onExportExcel={handleExportExcelDaily}
                                onExportPdf={handleExportPdfDaily}
                                workingDate={workingDate}
                                onDateChange={setWorkingDate}
                            />
                            <div className="mt-3 sm:mt-8 space-y-3 sm:space-y-8">
                                <TotalSummary 
                                    totalCash={totalCash} 
                                    totalCredit={totalCredit} 
                                    totalDaySales={totalDaySales} 
                                    branchName={branches.find(b => b.id === selectedBranchId)?.name || 'Main Branch'}
                                    isMainBranch={selectedBranchId === 'b3' || (branches.find(b => b.id === selectedBranchId)?.name || 'Main Branch').toLowerCase().includes('main')}
                                    approvedOrders={orders.filter(o => o.status === 'approved')}
                                />
                            </div>

                            <div className="mt-3 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-8 items-start no-print">
                                <InvoiceForm 
                                    key={`cash-${selectedBranchId}`}
                                    title="Cash Invoice" 
                                    theme="cash" 
                                    branchName={branches.find(b => b.id === selectedBranchId)?.name}
                                    invoiceNumber={getNextInvoiceNumber(selectedBranchId, 'cash')} 
                                    items={items} 
                                    poCustomers={poCustomersWithBalances as any}
                                    branches={branches}
                                    onAddInvoice={handleAddInvoice}
                                    onUpdateInvoice={handleUpdateInvoice}
                                    existingInvoices={branchCashInvoices}
                                    allInvoices={allSalesInvoices}
                                    editInvoice={cashEditInvoice}
                                    manualInvoiceNumber={appSettings.manualInvoiceNumber}
                                    canEdit={currentUser.permissions.canEditInvoice}
                                    canAdd={currentUser.permissions.canAddInvoice}
                                    canDelete={currentUser.permissions.canDeleteInvoice}
                                    canChangeDate={currentUser.permissions.canChangeInvoiceDate}
                                    onDeleteInvoice={(id) => handleDeleteInvoice(id)}
                                    checkUniqueNumber={checkUniqueCashNumber}
                                />
                                <InvoiceForm 
                                    key={`credit-${selectedBranchId}`}
                                    title="Credit Invoice" 
                                    theme="credit" 
                                    branchName={branches.find(b => b.id === selectedBranchId)?.name}
                                    invoiceNumber={getNextInvoiceNumber(selectedBranchId, 'credit')} 
                                    items={items} 
                                    poCustomers={poCustomersWithBalances as any}
                                    branches={branches}
                                    onAddInvoice={handleAddInvoice}
                                    onUpdateInvoice={handleUpdateInvoice}
                                    existingInvoices={branchCreditInvoices}
                                    allInvoices={allSalesInvoices}
                                    editInvoice={creditEditInvoice}
                                    manualInvoiceNumber={appSettings.manualInvoiceNumber}
                                    canEdit={currentUser.permissions.canEditInvoice}
                                    canAdd={currentUser.permissions.canAddInvoice}
                                    canDelete={currentUser.permissions.canDeleteInvoice}
                                    canChangeDate={currentUser.permissions.canChangeInvoiceDate}
                                    onDeleteInvoice={(id) => handleDeleteInvoice(id)}
                                    checkUniqueNumber={checkUniqueCreditNumber}
                                    prefillData={prefilledCreditInvoice}
                                    onPrefillCleared={() => setPrefilledCreditInvoice(null)}
                                />
                            </div>

                            {allInvoices.length > 0 && (
                                <>
                                    <div className="mt-3 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 items-start">
                                        <div>{branchCashInvoices.length > 0 && (
                                            <InvoiceList 
                                                title="Registered Cash Invoices" 
                                                invoices={branchCashInvoices} 
                                                theme="cash" 
                                                canDelete={currentUser.permissions.canDeleteInvoice} 
                                                onDelete={handleDeleteInvoice} 
                                                canEdit={currentUser.permissions.canEditInvoice}
                                                onEdit={(inv) => setCashEditInvoice(inv)}
                                            />
                                        )}</div>
                                        <div>{branchCreditInvoices.length > 0 && (
                                            <InvoiceList 
                                                title="Registered Credit Invoices" 
                                                invoices={branchCreditInvoices} 
                                                theme="credit" 
                                                canDelete={currentUser.permissions.canDeleteInvoice} 
                                                onDelete={handleDeleteInvoice} 
                                                canEdit={currentUser.permissions.canEditInvoice}
                                                onEdit={(inv) => setCreditEditInvoice(inv)}
                                            />
                                        )}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case 'Monthly Sales':
                return (
                    <MonthlyReport 
                        invoices={postedInvoices} 
                        items={items.filter(i => i.id !== 'cancel')} 
                        branches={filteredBranches}
                        selectedBranchId={selectedBranchId}
                    />
                );
            case 'Annual Sales':
                return (
                    <AnnualReport 
                        invoices={annualInvoices} 
                        items={items.filter(i => i.id !== 'cancel')} 
                        branches={filteredBranches}
                        selectedBranchId={selectedBranchId}
                    />
                );
            case 'Account Statement':
                return (
                            <AccountStatement 
                                invoices={allSalesInvoices}
                                items={items.filter(i => i.id !== 'cancel')}
                                branches={filteredBranches}
                                selectedBranchId={selectedBranchId}
                                currentUserName={currentUser.username}
                                users={users}
                                poCustomers={poCustomersWithBalances as any}
                            />
                );
            case 'Invoices Tracking':
                return (
                    <InvoiceTracking 
                        logs={invoiceLogs}
                        branches={branches}
                        currentUserName={currentUser.username}
                        selectedBranchId={selectedBranchId}
                        pendingCount={pendingSyncCount}
                        lastSyncTime={lastSyncTime}
                        onRefresh={handleForceSync}
                    />
                );
            case 'Driver Work Log':
                return (
                    <DriverWorkLog 
                        drivers={drivers}
                        vehicles={vehicles}
                        customers={sortedActiveCustomers}
                        logs={driverWorkLogs.filter(l => l.branchId === selectedBranchId)}
                        onSave={handleSaveDriverWorkLog}
                        onUpdate={handleUpdateDriverWorkLog}
                        onDelete={handleDeleteDriverWorkLog}
                        canEdit={currentUser.permissions.canEditDriverLog}
                        canDelete={currentUser.permissions.canDeleteDriverLog}
                    />
                );
            case 'Drivers Timesheet':
                return (
                    <DriverReport 
                        drivers={drivers}
                        workLogs={driverWorkLogs}
                        canEdit={currentUser.permissions.canEditDriverLog}
                        selectedBranchId={selectedBranchId}
                    />
                );
            case 'Settings':
                 return (
                    <Settings 
                        customers={activeCustomers}
                        items={items} 
                        branches={branches}
                        users={users}
                        settings={appSettings}
                        onUpdateSettings={handleUpdateSettings}
                        onAddItem={handleAddItem}
                        onUpdateItem={handleUpdateItem}
                        onDeleteItem={handleDeleteItem}
                        onAddBranch={handleAddBranch}
                        onDeleteBranch={handleDeleteBranch}
                        onUpdateBranch={handleUpdateBranch}
                        onAddUser={handleAddUser}
                        onUpdateUser={handleUpdateUser}
                        onDeleteUser={handleDeleteUser}
                        onClearInvoices={handleClearInvoices}
                        onRestoreDefaults={handleRestoreDefaults}
                        drivers={drivers}
                        vehicles={vehicles}
                        onAddDriver={handleAddDriver}
                        onUpdateDriver={handleUpdateDriver}
                        onDeleteDriver={handleDeleteDriver}
                        onAddVehicle={handleAddVehicle}
                        onUpdateVehicle={handleUpdateVehicle}
                        onDeleteVehicle={handleDeleteVehicle}
                        canManageDrivers={currentUser.permissions.manageDrivers}
                        canManageVehicles={currentUser.permissions.manageVehicles}
                        currentUser={currentUser}
                        allSalesInvoices={allSalesInvoices}
                    />
                 );
            case 'PO':
                 return (
                    <PO 
                        poCustomers={poCustomersWithBalances as any} 
                        customers={activeCustomers} 
                        items={items} 
                        invoices={allSalesInvoices} 
                        onAddPOCustomer={handleAddPOCustomer} 
                        onUpdatePOCustomer={handleUpdatePOCustomer} 
                        onDeletePOCustomer={handleDeletePOCustomer} 
                        onAddCustomer={handleAddCustomer}
                        currentUser={currentUser} 
                        onSwitchPage={setCurrentPage} 
                        onNotification={(msg, type) => setNotification({ message: msg, type })}
                    />
                 );
            case 'Customers':
                return <Customers customers={sortedCustomers} onAdd={handleAddCustomer} onUpdate={handleUpdateCustomer} onDelete={handleDeleteCustomer} currentUser={currentUser} />;
            case 'Orders':
                return <Orders orders={orders} setNotification={setNotification} customers={customers} items={items} currentUser={currentUser} directOrderFlow={appSettings?.directOrderFlow} />;
            case 'Order Approvals':
                return <OrderApprovals orders={orders} setNotification={setNotification} currentUser={currentUser} />;
            default:
                return (
                    <div className="p-4 sm:p-6 lg:p-8">
                        <div className="mt-6 bg-white rounded-lg shadow-md p-6 text-center">
                            <h2 className="text-2xl font-bold text-gray-700">Page not available</h2>
                            <p className="text-gray-500 mt-2">{currentPage} is under construction.</p>
                        </div>
                    </div>
                );
        }
    }

    const selectedBranch = branches.find(b => b.id === selectedBranchId);
    const selectedBranchName = selectedBranch ? selectedBranch.name : 'All Branches';

    const handleRestoreDefaults = async () => {
        setNotification({ message: 'Restoring default settings data...', type: 'info' });
        try {
            for (const item of mockItems) {
                await dualStorage.save(COLLECTIONS.RECORDS, item.id, { type: 'item', data: item });
            }
            for (const branch of mockBranches) {
                await dualStorage.save(COLLECTIONS.RECORDS, branch.id, { type: 'branch', data: branch });
            }
            for (const pc of mockPOCustomers) {
                await dualStorage.save(COLLECTIONS.PO_CUSTOMERS, pc.id, pc);
            }
            const defaultUsers: User[] = [
                {
                    id: 'u-shihab',
                    username: 'shihab',
                    password: '123',
                    role: 'user',
                    permissions: {
                        allowedPages: ['Dashboard', 'Daily Sales', 'Monthly Sales', 'Annual Sales', 'Account Statement', 'Invoices Tracking', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers'],
                        allowedBranches: ['all'],
                        canAddInvoice: true,
                        canEditInvoice: false,
                        canDeleteInvoice: false,
                        canChangeInvoiceDate: false,
                        canViewAccountStatement: true,
                        canManageSettings: false,
                        canCreatePO: true,
                        canForceDeletePO: false,
                        manageDrivers: false,
                        manageVehicles: false,
                        canEditPO: false,
                        canDeletePO: false,
                        canEditDriverLog: false,
                        canDeleteDriverLog: false
                    }
                },
                {
                    id: 'u-yassin',
                    username: 'yassin',
                    password: '123',
                    role: 'user',
                    permissions: {
                        allowedPages: ['Dashboard', 'Daily Sales', 'Monthly Sales', 'Annual Sales', 'Account Statement', 'Invoices Tracking', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers'],
                        allowedBranches: ['all'],
                        canAddInvoice: true,
                        canEditInvoice: false,
                        canDeleteInvoice: false,
                        canChangeInvoiceDate: false,
                        canViewAccountStatement: true,
                        canManageSettings: false,
                        canCreatePO: true,
                        canForceDeletePO: false,
                        manageDrivers: false,
                        manageVehicles: false,
                        canEditPO: false,
                        canDeletePO: false,
                        canEditDriverLog: false,
                        canDeleteDriverLog: false
                    }
                },
                {
                    id: 'u-noaman',
                    username: 'noaman',
                    password: '123',
                    role: 'user',
                    permissions: {
                        allowedPages: ['Dashboard', 'Daily Sales', 'Monthly Sales', 'Annual Sales', 'Account Statement', 'Invoices Tracking', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers'],
                        allowedBranches: ['all'],
                        canAddInvoice: true,
                        canEditInvoice: false,
                        canDeleteInvoice: false,
                        canChangeInvoiceDate: false,
                        canViewAccountStatement: true,
                        canManageSettings: false,
                        canCreatePO: true,
                        canForceDeletePO: false,
                        manageDrivers: false,
                        manageVehicles: false,
                        canEditPO: false,
                        canDeletePO: false,
                        canEditDriverLog: false,
                        canDeleteDriverLog: false
                    }
                }
            ];
            for (const u of defaultUsers) {
                await dualStorage.save(COLLECTIONS.RECORDS, u.id, { type: 'user', data: u });
            }
            await dualStorage.save(COLLECTIONS.RECORDS, defaultAdmin.id, { type: 'user', data: defaultAdmin });
            await dualStorage.save(COLLECTIONS.RECORDS, alaaUser.id, { type: 'user', data: alaaUser });
            setNotification({ message: 'Defaults Restored', type: 'success' });
        } catch (error) {
            setNotification({ message: 'Error restoring data', type: 'error' });
        }
    };

    const handleClearInvoices = async (targetBranchId: string) => {
        if (targetBranchId && targetBranchId !== 'all') {
            const targetBranch = branches.find(b => b.id === targetBranchId);
            const targetBranchName = targetBranch ? targetBranch.name : 'Selected Branch';
            await dualStorage.clearCollection(COLLECTIONS.SALES_INVOICES, 'branchId', targetBranchId);
            
            // Reset counters for this branch
            const updatedNext = { ...(appSettings.nextInvoiceNumbers || {}) };
            updatedNext[targetBranchId] = { cash: 1, credit: 1 };
            handleUpdateSettings({ ...appSettings, nextInvoiceNumbers: updatedNext });
            
            setNotification({ message: `Invoices Cleared for ${targetBranchName}`, type: 'success' });
        } else {
            await dualStorage.clearCollection(COLLECTIONS.SALES_INVOICES);
            
            // Reset all counters
            handleUpdateSettings({ ...appSettings, nextInvoiceNumbers: {} });
            
            setNotification({ message: 'All Invoices Cleared', type: 'success' });
        }
    };

    if (!isAuthReady && !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <Login users={users} onLogin={handleLogin} />;
    }

    return (
        <div className={`min-h-screen bg-gray-100 font-sans overflow-x-hidden ${!isMobile ? 'pl-[64px]' : ''}`}>
            {notificationData && <Notification message={notificationData.message} type={notificationData.type} onClose={() => setNotification(null)} />}
            
            <Nav 
                currentPage={currentPage}
                onNavigate={setCurrentPage}
                allowedPages={(currentUser.role === 'admin' || currentUser.username.toLowerCase() === 'alaa' ? ['Dashboard', 'Daily Sales', 'Monthly Sales', 'Annual Sales', 'Account Statement', 'Invoices Tracking', 'PO', 'Driver Work Log', 'Drivers Timesheet', 'Customers', 'Orders', 'Order Approvals', 'Settings'] : currentUser.permissions.allowedPages).filter(p => !appSettings?.directOrderFlow || p !== 'Order Approvals')}
                onLogout={handleLogout}
                isMobile={isMobile}
                pendingOrdersCount={orders.filter(o => o.status === 'pending').length}
            />

            {/* Trigger Area for Desktop Auto-hide Header */}
            {!isMobile && ['Dashboard'].includes(currentPage) && (
                <div 
                    onMouseEnter={() => setIsNavHovered(true)}
                    className="fixed top-0 left-[64px] right-0 h-4 z-50 no-print"
                />
            )}

            {/* Fixed Header and Navigation Wrapper */}
            {!['Monthly Sales', 'Annual Sales'].includes(currentPage) && (
                <div 
                    onMouseEnter={() => setIsNavHovered(true)}
                    onMouseLeave={() => setIsNavHovered(false)}
                    className={`
                        ${isMobile ? 'relative' : 'fixed top-0 left-[64px] right-0 z-[50]'} 
                        bg-gray-100 no-print pb-2 
                        ${!isMobile ? 'shadow-md' : 'shadow-sm'}
                        ${!isMobile && ['Dashboard'].includes(currentPage) ? `transition-all duration-75 ease-out transform ${isNavHovered ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}` : ''}
                    `}
                >
                    {!['Dashboard'].includes(currentPage) && (
                        <div className={`px-4 sm:px-6 lg:px-8 ${isMobile ? 'pt-4 pb-2' : 'pt-4'} relative z-30`}>
                            <div className="rounded-lg shadow-md">
                                <Header 
                                employeeName={currentUser.username} 
                                currentUser={currentUser}
                                date={workingDate}
                                branches={filteredBranches}
                                selectedBranchId={selectedBranchId}
                                onSelectBranch={setSelectedBranchId}
                                readOnly={filteredBranches.length <= 1}
                                pendingCount={pendingSyncCount}
                                lastSyncTime={lastSyncTime}
                                onRefresh={handleForceSync}
                                approvedOrders={orders.filter(o => o.status === 'approved')}
                                currentPage={currentPage}
                                onCreateInvoice={handleCreateInvoiceFromOrder}
                                deliveredGroupProps={recentDeliveredGroup}
                                onCloseDeliveredGroup={() => setRecentDeliveredGroup(null)}
                            />
                        </div>
                    </div>
                )}
            </div>
            )}

            <main className="flex-1 flex flex-col min-h-0">
                {/* Spacer div to prevent content from hiding behind fixed header ONLY on Desktop */}
                {!isMobile && (
                    <div className={`
                        ${['Dashboard', 'Monthly Sales', 'Annual Sales'].includes(currentPage) 
                            ? 'h-0' 
                            : 'h-[160px]'} 
                        transition-all duration-75 ease-out
                        print-only:hidden
                    `}></div>
                )}
                
                {showLowPOAlert && lowPOs.length > 0 && hasMainBranchAccess && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 mx-4 shadow-md rounded flex flex-col justify-center print-only:hidden transition-all duration-300 ease-in-out" role="alert" dir="ltr">
                        <p className="font-bold flex items-center gap-2">
                            <span className="text-xl">⚠️</span> Low PO Balance Alert
                        </p>
                        <ul className="list-disc list-inside mt-2 text-sm">
                            {lowPOs.map(po => {
                                const isQtyLimit = (po.quantity || 0) > 0 && po.remainingQuantity <= (po.alertThreshold || 0);
                                const balanceText = isQtyLimit 
                                    ? `Remaining Qty: ${po.remainingQuantity}` 
                                    : `Remaining Total: ${po.remainingTotal.toFixed(2)}`;
                                return (
                                    <li key={po.id}>
                                        Customer: <span className="font-semibold">{po.customerName}</span> | PO: <span className="font-semibold">{po.poNumber}</span> | <span className="font-bold text-red-800">{balanceText}</span> (Limit: {po.alertThreshold})
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className={`flex-1 flex flex-col min-h-0 ${!isMobile && currentPage === 'Dashboard' ? 'px-4 sm:px-6 lg:px-8' : ''}`}>
                    {renderPage()}
                </div>
            </main>

            {!['Monthly Sales', 'Annual Sales'].includes(currentPage) && (
                <footer className="py-6 text-center text-gray-400 text-xs no-print border-t border-gray-200 mt-auto">
                    <p dir="ltr">Designed by: Alaa Ahmed</p>
                </footer>
            )}

            {/* Center-screen alert modal for Pending Approvals */}
            {showPendingOrdersModal && canApproveOrders && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print" id="pending-orders-modal-root">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white px-6 py-5 relative flex items-center gap-3">
                            <div className="bg-white/15 p-2 rounded-xl">
                                <ClipboardList className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-extrabold tracking-tight">Pending Orders Awaiting Decision</h3>
                            </div>
                            <button
                                onClick={() => setShowPendingOrdersModal(false)}
                                className="absolute top-4 right-4 hover:bg-white/10 text-white/80 hover:text-white p-1.5 rounded-full transition-colors"
                                title="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* List Area */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div className="space-y-3">
                                {pendingOrdersList.map((order, idx) => {
                                    const qtyVal = order.quantity || 0;
                                    const priceVal = order.price || 0;
                                    const totalBeforeTax = qtyVal * priceVal;
                                    const totalWithTax = totalBeforeTax * 1.15;
                                    return (
                                        <div 
                                            key={order.id || idx} 
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-155 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            <div className="text-left space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-orange-100 text-orange-850 font-black text-[10px] px-2 py-0.5 rounded-md border border-orange-200">
                                                        Serial: #{order.serial}
                                                    </span>
                                                    <span className="text-[13px] text-slate-500 font-bold font-mono">
                                                        {order.time ? new Date(order.time).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true}) : ''}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-gray-800 text-sm leading-tight">{order.customerName}</h4>
                                                <p className="text-sm text-gray-500 font-semibold">{order.item}</p>
                                            </div>

                                            <div className="flex flex-col items-start sm:items-end gap-2 min-w-[155px] border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                                                <div className="flex gap-2 items-center">
                                                    <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded text-sm border border-blue-150">
                                                        Qty: {qtyVal}
                                                    </span>
                                                    {order.price !== undefined && (
                                                        <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded text-sm border border-slate-200">
                                                            Price: {priceVal.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-600 flex gap-2.5 w-full justify-between sm:justify-end font-semibold">
                                                    <span>Ex. Tax: <span className="font-bold text-gray-800 font-mono">{totalBeforeTax.toFixed(2)}</span></span>
                                                    <span className="text-blue-600 font-extrabold">With Tax: <span className="font-mono">{totalWithTax.toFixed(2)}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <span className="text-xs text-slate-450 font-medium hidden sm:inline-block">
                                Total pending items: {pendingOrdersList.length}
                            </span>
                            <div className="flex w-full sm:w-auto items-center justify-end gap-3">
                                <button
                                    onClick={() => setShowPendingOrdersModal(false)}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 active:scale-95 transition-all text-center"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPendingOrdersModal(false);
                                        setCurrentPage('Order Approvals');
                                    }}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white rounded-xl active:scale-95 transition-all shadow-md text-center flex items-center justify-center gap-1.5"
                                >
                                    Go to Approvals
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;