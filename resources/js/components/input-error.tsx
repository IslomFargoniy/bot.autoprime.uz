import type { HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Common error string mappings from Laravel backend defaults to i18n keys
const ERROR_KEY_MAP: Record<string, string> = {
    'auth.failed': 'auth.failed',
    'These credentials do not match our records.': 'auth.failed',
    "Kiritilgan ma'lumotlar tizimdagi yozuvlarga mos kelmadi.": 'auth.failed',
    "Kiritilgan telefon raqam yoki parol noto'g'ri.": 'auth.failed',
    'Неверный номер телефона или пароль.': 'auth.failed',
    'Киритилган телефон рақам ёки парол нотўғри.': 'auth.failed',
    'auth.password': 'auth.password',
    'The provided password is incorrect.': 'auth.password',
    'auth.throttle': 'auth.throttle',
    'validation.required': 'validation.required',
};

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    const { t } = useTranslation();

    if (!message) {
        return null;
    }

    let displayMessage = message;
    if (ERROR_KEY_MAP[message]) {
        displayMessage = t(ERROR_KEY_MAP[message]);
    } else {
        const translated = t(message);
        if (translated && translated !== message) {
            displayMessage = translated;
        }
    }

    return (
        <p
            {...props}
            className={cn('text-sm text-red-600 dark:text-red-400', className)}
        >
            {displayMessage}
        </p>
    );
}
