/**
 * Pure helpers behind the masked inputs (phone, date, plate, money).
 * Kept free of React so the rules are easy to read and reason about.
 */

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/**
 * National part (9 digits) of an Uzbek phone number from whatever was stored or typed:
 * "+998901234567", "998 90 123 45 67", "901234567".
 */
export function phoneNationalDigits(value?: string | null): string {
    const digits = onlyDigits(value ?? '');

    return (digits.startsWith('998') ? digits.slice(3) : digits).slice(0, 9);
}

/**
 * "+998 (90) 123-45-67" built up as far as digits were typed, never ending in a space
 * or dash so deleting characters from the end behaves naturally.
 */
export function formatPhoneDisplay(national: string): string {
    if (national.length === 0) {
        return '';
    }

    const a = national.slice(0, 2);
    const b = national.slice(2, 5);
    const c = national.slice(5, 7);
    const d = national.slice(7, 9);

    let text = `+998 (${a}`;

    if (a.length === 2) {
        text += ')';
    }

    if (b) {
        text += ` ${b}`;
    }

    if (c) {
        text += `-${c}`;
    }

    if (d) {
        text += `-${d}`;
    }

    return text;
}

/**
 * Plate number characters in the order they were typed, upper case, 8 at most.
 */
export function cleanPlate(value: string): string {
    return value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
}

/**
 * "01 A 123 BC" (private) or "01 123 ABC" (company), decided by the third character.
 */
export function formatPlateDisplay(clean: string): string {
    const groups =
        clean.length > 2 && /[A-Z]/.test(clean[2])
            ? [
                  clean.slice(0, 2),
                  clean.slice(2, 3),
                  clean.slice(3, 6),
                  clean.slice(6, 8),
              ]
            : [clean.slice(0, 2), clean.slice(2, 5), clean.slice(5, 8)];

    return groups.filter(Boolean).join(' ');
}

/**
 * Digits typed into a date box shown as DD.MM.YYYY.
 */
export function maskDateText(value: string): string {
    const digits = onlyDigits(value).slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];

    return parts.filter(Boolean).join('.');
}

/**
 * "2026-10-03" (or the legacy "03-10-2026") as "03.10.2026"; anything else as ''.
 */
export function isoToDisplay(value?: string | null): string {
    if (!value) {
        return '';
    }

    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (iso) {
        return `${iso[3]}.${iso[2]}.${iso[1]}`;
    }

    const legacy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

    return legacy ? `${legacy[1]}.${legacy[2]}.${legacy[3]}` : '';
}

/**
 * "03.10.2026" as "2026-10-03", or null when the text is incomplete or not a real date.
 */
export function displayToIso(text: string): string | null {
    const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

    if (!match) {
        return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    const isReal =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;

    return isReal ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/**
 * Birth date hidden in a PINFL: digit 1 gives sex and century, digits 2-7 are DDMMYY.
 * Returns an ISO date or null when the PINFL is incomplete or inconsistent.
 */
export function birthDateFromPinfl(pinfl: string): string | null {
    if (!/^[1-6]\d{13}$/.test(pinfl)) {
        return null;
    }

    const century = { 1: 1800, 2: 1800, 3: 1900, 4: 1900, 5: 2000, 6: 2000 }[
        Number(pinfl[0]) as 1 | 2 | 3 | 4 | 5 | 6
    ];
    const day = pinfl.slice(1, 3);
    const month = pinfl.slice(3, 5);
    const year = century + Number(pinfl.slice(5, 7));

    return displayToIso(`${day}.${month}.${year}`);
}

/**
 * Digits only, grouped in thousands with spaces. Leading zeros are dropped and a
 * lone zero counts as empty so the field shows its "0" placeholder instead.
 * DB decimals such as "2000000.00" keep their whole part.
 */
export function moneyDigits(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const text = String(value).trim();
    const whole = /^\d+\.\d+$/.test(text) ? text.split('.')[0] : text;
    const digits = onlyDigits(whole).replace(/^0+/, '');

    return digits;
}

export const groupThousands = (digits: string): string =>
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
