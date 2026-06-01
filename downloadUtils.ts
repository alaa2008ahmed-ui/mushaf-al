
/**
 * Safely downloads a blob, even in cross-origin iframes where showSaveFilePicker is restricted.
 */
export async function downloadBlob(blob: Blob, filename: string, options?: { description: string, accept: Record<string, string[]> }) {
    // Priority 1: Try showSaveFilePicker (Modern API)
    // We check for it, but we also wrap it in a try-catch for cross-origin iframe security errors
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: options ? [options] : []
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return; // Success
        } catch (err: any) {
            // If it's a security error (like in an iframe) or users cancels, 
            // we check if we should fallback or just ignore.
            if (err.name === 'AbortError') {
                return; // User canceled
            }
            // For other errors (SecurityError, etc.), we fall back to the traditional method
            console.warn('showSaveFilePicker failed, falling back to traditional download:', err.message);
        }
    }

    // Priority 2: Traditional <a> download method (Reliable in iframes)
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
