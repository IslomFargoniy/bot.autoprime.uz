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
 * Print a receipt page through a hidden iframe. A new window would be stopped
 * by popup blockers, an iframe is not. The receipt page opens the print dialog
 * itself when it is loaded with ?autoprint=1.
 */
export function printReceipt(url: string): void {
    const frame = document.createElement('iframe');
    const separator = url.includes('?') ? '&' : '?';

    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    frame.src = `${url}${separator}autoprint=1`;
    document.body.appendChild(frame);

    window.setTimeout(() => frame.remove(), 60_000);
}
