import fs from 'fs';

let content = fs.readFileSync('./App.tsx', 'utf8');

const replacements = [
    [/setNotification\(\{ message: 'Monthly summary updated successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Summary Updated', type: 'update' });"],
    [/setNotification\(\{ message: 'Default Data Restored Successfully!', type: 'success' \}\);/g, "setNotification({ message: 'Defaults Restored', type: 'success' });"],
    [/setNotification\(\{ message: \`Invoices for \$\{targetBranchName\} have been cleared and counters reset\.\`, type: 'success' \}\);/g, "setNotification({ message: `Invoices Cleared for ${targetBranchName}`, type: 'success' });"],
    [/setNotification\(\{ message: 'All invoices have been cleared and counters reset\.', type: 'success' \}\);/g, "setNotification({ message: 'All Invoices Cleared', type: 'success' });"],
    [/setNotification\(\{ message: 'Cannot delete this invoice because it falls within the protected period\.', type: 'error' \}\);/g, "setNotification({ message: 'Invoice Protected from Deletion', type: 'error' });"],
    [/setNotification\(\{ message: 'Cannot edit this invoice because it falls within the protected period\.', type: 'error' \}\);/g, "setNotification({ message: 'Invoice Protected from Edit', type: 'error' });"]
];

for (let r of replacements) {
    content = content.replace(r[0], r[1]);
}

fs.writeFileSync('./App.tsx', content, 'utf8');
console.log("App.tsx extra notifs updated");
