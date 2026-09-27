import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/**
 * Parse a server date. The backend sends "YYYY-MM-DD HH:mm:ss", which some
 * Safari / iOS Telegram WebView versions reject, so it is converted to the
 * ISO form "YYYY-MM-DDTHH:mm:ss" (still read as local time) first.
 */
export function parseDate(value: string | Date): Date {
    if (value instanceof Date) {
        return value;
    }

    return new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? value.replace(' ', 'T') : value);
}

/**
 * Format datetime to standard format: YYYY-MM-DD HH:mm:ss (e.g. 2026-09-27 10:35:26)
 */
export function formatDateTime(dateStr?: string | Date | null): string {
    if (!dateStr) return '-';
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : '-';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format date to standard format: YYYY-MM-DD (e.g. 2026-09-27)
 */
export function formatDate(dateStr?: string | Date | null): string {
    if (!dateStr) return '-';
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : '-';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
