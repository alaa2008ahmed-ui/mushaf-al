import fs from 'fs';

let content = fs.readFileSync('./App.tsx', 'utf8');

const replacements = [
    [/setNotification\(\{ message: 'Item added successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Item Added', type: 'add' });"],
    [/setNotification\(\{ message: 'Item updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Item Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'Item deleted.', type: 'success' \}\);/g, "setNotification({ message: 'Item Deleted', type: 'delete' });"],
    
    [/setNotification\(\{ message: 'Branch added successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Branch Added', type: 'add' });"],
    [/setNotification\(\{ message: 'Branch updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Branch Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'Branch deleted.', type: 'success' \}\);/g, "setNotification({ message: 'Branch Deleted', type: 'delete' });"],
    
    [/setNotification\(\{ message: 'User added successfully!', type: 'success' \}\);/g, "setNotification({ message: 'User Added', type: 'add' });"],
    [/setNotification\(\{ message: 'User updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'User Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'User deleted.', type: 'success' \}\);/g, "setNotification({ message: 'User Deleted', type: 'delete' });"],
    
    [/setNotification\(\{ message: 'Driver added successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Driver Added', type: 'add' });"],
    [/setNotification\(\{ message: 'Driver updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Driver Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'Driver deleted.', type: 'success' \}\);/g, "setNotification({ message: 'Driver Deleted', type: 'delete' });"],

    [/setNotification\(\{ message: 'Vehicle added successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Vehicle Added', type: 'add' });"],
    [/setNotification\(\{ message: 'Vehicle updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Vehicle Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'Vehicle deleted.', type: 'success' \}\);/g, "setNotification({ message: 'Vehicle Deleted', type: 'delete' });"],

    [/setNotification\(\{ message: 'Work log saved successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Work Log Saved', type: 'add' });"],
    [/setNotification\(\{ message: 'Work log updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Work Log Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'Work log deleted successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Work Log Deleted', type: 'delete' });"],

    [/setNotification\(\{ message: 'Customer added successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Customer Added', type: 'add' });"],
    [/setNotification\(\{ message: 'Customer updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Customer Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'Customer deleted.', type: 'success' \}\);/g, "setNotification({ message: 'Customer Deleted', type: 'delete' });"],
    [/setNotification\(\{ message: 'Customer deleted permanently.', type: 'success' \}\);/g, "setNotification({ message: 'Customer Deleted Permanently', type: 'delete' });"],

    [/setNotification\(\{ message: 'Settings updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Settings Updated', type: 'update' });"],
    
    // Invoices update using the dynamic strings
    [/setNotification\(\n *\{ message: \`Invoice #\$\{newInvoice\.invoiceNumber\} Saved\`, type: 'success' \},/g, "setNotification(\n            { message: `Invoice #${newInvoice.invoiceNumber} Saved`, type: 'add' },"],
    [/setNotification\(\n *\{ message: \`Invoice #\$\{updatedInvoice\.invoiceNumber\} Updated\`, type: 'success' \},/g, "setNotification(\n            { message: `Invoice #${updatedInvoice.invoiceNumber} Updated`, type: 'update' },"],
    [/setNotification\(\n *\{ message: 'Invoice Deleted', type: 'success' \},/g, "setNotification(\n                { message: 'Invoice Deleted', type: 'delete' },"],
    
    [/setNotification\(\{ message: 'Invoice Deleted', type: 'success' \}\);/g, "setNotification({ message: 'Invoice Deleted', type: 'delete' });"]
];

for (let r of replacements) {
    content = content.replace(r[0], r[1]);
}

fs.writeFileSync('./App.tsx', content, 'utf8');
console.log("App.tsx updated");
