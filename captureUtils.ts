
export const printOrDownloadPdf = async (canvas: HTMLCanvasElement, filename: string, orientation: 'p' | 'l' = 'p') => {
    try {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = (window as any).jspdf;
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const ratio = canvas.width / canvas.height;
        let width = pdfWidth;
        let height = width / ratio;
        
        if (height > pdfHeight) { 
            height = pdfHeight; 
            width = height * ratio; 
        }
        const xOffset = (pdfWidth - width) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, width, height);

        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        
        // Try opening in new tab for direct printing
        const printWindow = window.open(url, '_blank');
        if (!printWindow) {
            // Popup blocked, fallback to download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename + '.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert("Popup was blocked, so the document was downloaded instead. You can open the downloaded PDF to print it.");
        }
    } catch (err) {
        console.error("Print/PDF generation failed:", err);
        alert("Failed to print the document.");
    }
};

export const captureAndExport = (printableAreaId: string, exportFn: (canvas: HTMLCanvasElement) => void) => {
    const originalElement = document.getElementById(printableAreaId);
    if (!originalElement) {
        console.error("Printable area not found:", printableAreaId);
        return;
    }
    
    // Feedback to user
    const btn = document.activeElement as HTMLElement;
    const originalContent = btn?.innerHTML;
    const originalOpacity = btn?.style.opacity;
    const originalPointerEvents = btn?.style.pointerEvents;

    if (btn && btn.tagName === 'BUTTON') {
        const spanText = btn.querySelector('span');
        if (spanText) {
            spanText.setAttribute('data-original-text', spanText.innerText);
            spanText.innerText = '...';
        }
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
    }

    const clone = originalElement.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '-9999px';
    clone.style.width = `${Math.max(originalElement.offsetWidth, originalElement.scrollWidth)}px`;
    clone.style.height = `${Math.max(originalElement.offsetHeight, originalElement.scrollHeight)}px`;
    clone.style.overflow = 'visible';
    
    // Ensure all styles are captured accurately
    const elementsToHide = clone.querySelectorAll('.no-print');
    elementsToHide.forEach(el => ((el as HTMLElement).style.display = 'none'));
    const elementsToShow = clone.querySelectorAll('.print-only');
    elementsToShow.forEach(el => el.classList.add('force-show'));
    
    document.body.appendChild(clone);
    
    // Ensure the clone itself and its nested overflow containers don't clip content
    const elementsWithOverflow = [clone, ...Array.from(clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-auto'))];
    elementsWithOverflow.forEach(el => {
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.width = 'auto';
        (el as HTMLElement).style.maxWidth = 'none';
        (el as HTMLElement).style.display = 'block';
        (el as HTMLElement).style.height = 'auto';
    });

    // Remove sticky/fixed positions that might mess up the layout in the clone
    const stickyElements = clone.querySelectorAll('.sticky, .fixed');
    stickyElements.forEach(el => {
        (el as HTMLElement).style.position = 'relative';
        (el as HTMLElement).style.top = '0';
        (el as HTMLElement).style.zIndex = '1';
    });
    
    // Lower scale on mobile to avoid memory issues
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const scale = isMobile ? 1.2 : 2;

    const html2canvas = (window as any).html2canvas;
    if (!html2canvas) {
        console.error("html2canvas not loaded");
        document.body.removeChild(clone);
        if (btn) {
            btn.style.opacity = originalOpacity || '1';
            btn.style.pointerEvents = originalPointerEvents || 'auto';
        }
        return;
    }

    html2canvas(clone, { 
        scale: scale, 
        useCORS: true, 
        allowTaint: true, 
        logging: false,
        backgroundColor: '#ffffff'
    }).then((canvas: HTMLCanvasElement) => {
        exportFn(canvas);
    }).catch((err: Error) => {
        console.error("html2canvas error:", err);
        alert("Export failed on this device. Memory might be low. Please try again or use a computer.");
    }).finally(() => {
        document.body.removeChild(clone);
        if (btn && btn.tagName === 'BUTTON') {
            const spanText = btn.querySelector('span');
            const originalText = spanText?.getAttribute('data-original-text');
            if (spanText && originalText) {
                spanText.innerText = originalText;
            }
            btn.style.opacity = originalOpacity || '1';
            btn.style.pointerEvents = originalPointerEvents || 'auto';
        }
    });
};
