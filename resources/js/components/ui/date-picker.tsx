import React, { useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
    value?: string; // Standard format: 'YYYY-MM-DD' (e.g. 2026-09-22)
    onChange: (dateStr: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    title?: string;
}

export function DatePicker({
    value = '',
    onChange,
    placeholder = 'YYYY-MM-DD',
    className,
    id,
    required,
    disabled,
    title,
}: DatePickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Normalize any incoming format (including legacy DD-MM-YYYY) to 'YYYY-MM-DD'
    const toYmd = (val: string) => {
        if (!val) return '';
        if (val.includes('-')) {
            const parts = val.split('-');
            if (parts[0].length === 2 && parts[2]?.length === 4) {
                // DD-MM-YYYY -> YYYY-MM-DD
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            if (parts[0].length === 4) {
                return val;
            }
        }
        return val;
    };

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isoVal = e.target.value; // Native date input always provides 'YYYY-MM-DD'
        onChange(isoVal || '');
    };

    const ymdDate = toYmd(value);

    return (
        <div
            className={cn(
                'relative flex items-center justify-between h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-muted/40 transition-colors select-none',
                disabled && 'cursor-not-allowed opacity-50',
                className
            )}
            onClick={() => {
                if (disabled) return;
                if (inputRef.current?.showPicker) {
                    try {
                        inputRef.current.showPicker();
                    } catch {
                        inputRef.current.focus();
                    }
                } else {
                    inputRef.current?.focus();
                }
            }}
            title={title}
        >
            {/* Formatted Date Display: YYYY-MM-DD */}
            <span className={cn('truncate font-medium text-foreground', !ymdDate && 'text-muted-foreground font-normal')}>
                {ymdDate || placeholder}
            </span>

            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0 ml-2 pointer-events-none" />

            {/* Invisible Native Input overlaid to trigger OS native datepicker without zoom */}
            <input
                ref={inputRef}
                id={id}
                type="date"
                value={ymdDate}
                onChange={handleNativeChange}
                disabled={disabled}
                required={required}
                aria-label={placeholder}
                style={{ fontSize: '16px' }} // Critical: Prevents auto-zoom on iOS Safari and Android
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto"
            />
        </div>
    );
}

export default DatePicker;
