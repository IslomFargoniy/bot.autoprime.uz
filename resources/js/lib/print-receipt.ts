const AUTO_PRINT_KEY = 'finance.auto_print_receipt';

/**
 * Whether a receipt should print by itself after saving a payment or expense.
 * On by default; the cashier can switch it off on the finance page.
 */
export function isAutoPrintEnabled(): boolean {
    try {
        return window.localStorage.getItem(AUTO_PRINT_KEY) !== '0';
    } catch {
        return true;
    }
}

export function setAutoPrintEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(AUTO_PRINT_KEY, enabled ? '1' : '0');
    } catch {
        // Storage can be blocked (private window); the toggle then only lasts for this visit.
    }
}

/**
 * Print a receipt page through an iframe. A new window would be stopped by popup blockers,
 * an iframe is not. The frame sits off screen but keeps a real size: browsers freeze the
 * page when asked to print a frame that is hidden or zero-sized, which left the screen
 * stuck behind the print dialog. The page that owns the frame starts the printing once
 * the receipt has loaded, and the frame removes itself afterwards.
 */
export function printReceipt(url: string): void {
    const frame = document.createElement('iframe');
    const remove = () => frame.remove();

    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText =
        'position:fixed;left:-10000px;top:0;width:80mm;height:200mm;border:0;';

    frame.addEventListener('load', () => {
        try {
            const receiptWindow = frame.contentWindow;

            receiptWindow?.addEventListener('afterprint', remove);
            receiptWindow?.focus();
            receiptWindow?.print();
        } catch {
            remove();
        }
    });

    frame.src = url;
    document.body.appendChild(frame);

    window.setTimeout(remove, 120_000);
}

/**
 * Open the receipt in its own tab, where it prints itself. The fallback for when printing
 * through the frame is blocked, and the way to print it again from a notification.
 */
export function openReceipt(url: string): void {
    const separator = url.includes('?') ? '&' : '?';

    window.open(`${url}${separator}autoprint=1`, '_blank');
}
