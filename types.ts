
export interface Item {
    id: string;
    name: string;
    code?: string;
}

export interface Employee {
    id: string;
    name: string;
    branchId: string;
}

export interface Branch {
    id: string;
    name: string;
}

export interface POCustomer {
    id: string;
    type: 'cash' | 'credit';
    customerNumber: string;
    customerName: string;
    poNumber: string;
    quantity: number | null;
    total: number | null;
    alertThreshold?: number;
    itemName?: string;
    isUnsaved?: boolean;
}

export interface Invoice {
    id: string;
    invoiceNumber: number;
    type: 'cash' | 'credit';
    itemName: string;
    itemCode?: string;
    quantity: number;
    total: number;
    date: Date;
    status: 'daily' | 'monthly' | 'annual';
    employeeId?: string;
    branchId?: string;
    createdBy?: string;
    poCustomerId?: string;
    poNumber?: string;
    poItemName?: string;
    orderIds?: string[];
}

export interface UserPermissions {
    allowedPages: string[];
    allowedBranches: string[]; // 'all' or specific branch IDs
    allowedOrderCustomers?: string[];
    allowedOrderItems?: string[];
    canAddInvoice: boolean;
    canEditInvoice: boolean;
    canDeleteInvoice: boolean;
    canChangeInvoiceDate: boolean;
    canViewAccountStatement: boolean;
    canManageSettings: boolean;
    canCreatePO: boolean;
    canForceDeletePO: boolean;
    canEditPO: boolean;
    canDeletePO: boolean;
    canEditDriverLog: boolean;
    canDeleteDriverLog: boolean;
    manageDrivers: boolean;
    manageVehicles: boolean;
    canAddCustomer?: boolean;
    canEditCustomer?: boolean;
    canDeleteCustomer?: boolean;
    canDeleteOrder?: boolean;
    canViewAllOrders?: boolean;
    showDeliveryConfirmationPopup?: boolean;
    showOrderReceiptPopup?: boolean;
    showReceiptDetailsPopup?: boolean;
    receiveLowPOAlert?: boolean;
    receiveNewOrderAlert?: boolean;
    notifyAddCashInvoice?: boolean;
    notifyEditCashInvoice?: boolean;
    notifyDeleteCashInvoice?: boolean;
    notifyAddCreditInvoice?: boolean;
    notifyEditCreditInvoice?: boolean;
    notifyDeleteCreditInvoice?: boolean;
    notifyAddOrder?: boolean;
    notifyApproveOrder?: boolean;
    notifyRejectOrder?: boolean;
    notifyDeleteOrder?: boolean;
    notifyAddCustomer?: boolean;
    notifyEditCustomer?: boolean;
    notifyDeleteCustomer?: boolean;
    notifyAddItem?: boolean;
    notifyEditItem?: boolean;
    notifyDeleteItem?: boolean;
    notifyAddBranch?: boolean;
    notifyEditBranch?: boolean;
    notifyDeleteBranch?: boolean;
    notifyAddUser?: boolean;
    notifyEditUser?: boolean;
    notifyDeleteUser?: boolean;
    notifyAddDriver?: boolean;
    notifyEditDriver?: boolean;
    notifyDeleteDriver?: boolean;
    notifyAddVehicle?: boolean;
    notifyEditVehicle?: boolean;
    notifyDeleteVehicle?: boolean;
    notifyUpdateSettings?: boolean;
    notifyAddDriverLog?: boolean;
    notifyEditDriverLog?: boolean;
    notifyDeleteDriverLog?: boolean;
    notifySync?: boolean;
    notifyErrors?: boolean;
}

export interface Driver {
    id: string;
    driverId: number; // Auto-incrementing or unique number
    driverName: string;
}

export interface Vehicle {
    id: string;
    vehicleId: number; // Auto-incrementing or unique number
    vehicleNumber: string;
}

export interface DriverWorkLog {
    id: string;
    logId: string;
    branchId?: string;
    driverId: number;
    driverName: string;
    vehicleId: number;
    vehicleNumber: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    workDurationHours: number;
    date: string; // YYYY-MM-DD
    paymentType: 'cash' | 'credit';
    customerName?: string;
    accountNumber?: string;
    invoiceNumber?: string;
    dutyStatus?: 'on_duty' | 'off_duty' | 'normal';
    createdAt: string; // ISO string
}

export interface DriverMonthlySummary {
    id: string;
    driverId: number;
    driverName: string;
    date: string; // YYYY-MM-DD
    totalHours: number;
    deductedHours: number; // fixed = 8
    extraHours: number;
    manualAdjustment: number;
    updatedAt: string;
}

export interface Order {
    id: string;
    serial: number;
    customerName: string;
    item: string;
    quantity: number;
    price?: number;            // السعر
    priceBeforeTax?: number;   // السعر قبل الضريبة
    totalWithTax?: number;     // الإجمالي بالضريبة 15
    time: string; // ISO string
    status: 'pending' | 'approved' | 'rejected' | 'delivered';
    createdBy?: string;        // ID or Username of creator
    hiddenFromApprovals?: boolean;
    customerReceived?: boolean;
}

export interface User {
    id: string;
    username: string;
    password?: string;
    role: 'admin' | 'user';
    isActive?: boolean;
    permissions: UserPermissions;
}

export interface Customer {
    id: string;
    customerNumber: string;
    name: string;
    phone?: string;
    address?: string;
    type?: 'cash' | 'credit';
    isActive?: boolean;
}

export interface DeliveryNote {
    id: string;
    date: Date;
    customerId: string;
    items: { itemName: string; quantity: number }[];
}

export interface BottleTransaction {
    id: string;
    date: Date;
    customerId: string;
    type: 'out' | 'in';
    quantity: number;
}

export interface AppSettings {
    restrictRegistration: boolean;
    registrationStartDate: Date | null;
    registrationEndDate: Date | null;
    restrictModification: boolean;
    modificationStartDate: Date | null;
    modificationEndDate: Date | null;
    manualInvoiceNumber?: boolean;
    directOrderFlow?: boolean;
    dailyNotificationEnabled?: boolean;
    dailyNotificationTime?: string;
    lastTriggeredNotificationDate?: string;
    autoBackupEnabled?: boolean;
    autoBackupFrequency?: 'daily' | 'weekly' | 'monthly';
    autoBackupTime?: string;
    autoBackupDayOfWeek?: number;
    autoBackupDayOfMonth?: number;
    autoBackupPassword?: string;
    lastTriggeredBackupDate?: string;
    nextInvoiceNumbers?: {
        [branchId: string]: {
            cash: number;
            credit: number;
        };
    };
}

export interface InvoiceLog {
    id: string; // Unique ID for the log
    invoiceId: string;
    invoiceNumber: number;
    action: 'EDIT' | 'DELETE';
    date: Date; // Time when action was performed
    user: string; // The username who did the action
    branchId?: string; // Branch ID so we can filter
    previousValues: Partial<Invoice>;
    newValues?: Partial<Invoice>;
}
