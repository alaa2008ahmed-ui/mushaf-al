import fs from 'fs';

function replaceInFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (let i = 0; i < replacements.length; i++) {
        content = content.replace(replacements[i][0], replacements[i][1]);
    }
    fs.writeFileSync(path, content, 'utf8');
}

replaceInFile('./components/OrderApprovals.tsx', [
    [
        `setNotification({ message: 'Order Deleted', type: 'success' }, 'notifyDeleteOrder');`, 
        `setNotification({ message: 'Order Deleted', type: 'delete' }, 'notifyDeleteOrder');`
    ],
    [
        `{ message, type: 'success' },\n                newStatus === 'approved' ? 'notifyApproveOrder' : 'notifyRejectOrder'`, 
        `{ message, type: newStatus === 'approved' ? 'success' : 'warning' },\n                newStatus === 'approved' ? 'notifyApproveOrder' : 'notifyRejectOrder'`
    ]
]);

replaceInFile('./components/Orders.tsx', [
    [
        `setNotification({ message: 'Orders Sent', type: 'success' }, 'notifyAddOrder');`, 
        `setNotification({ message: 'Orders Sent', type: 'add' }, 'notifyAddOrder');`
    ],
    [
        `setNotification({ message: 'Orders Deleted', type: 'success' }, 'notifyDeleteOrder');`, 
        `setNotification({ message: 'Orders Deleted', type: 'delete' }, 'notifyDeleteOrder');`
    ],
    [
        `setNotification: (notification: { message: string, type: 'success' | 'error' | 'info' } | null, permKey?: string) => void;`,
        `setNotification: (notification: { message: string, type: 'success' | 'error' | 'info' | 'add' | 'update' | 'delete' | 'warning' } | null, permKey?: string) => void;`
    ]
]);

console.log("Done");
