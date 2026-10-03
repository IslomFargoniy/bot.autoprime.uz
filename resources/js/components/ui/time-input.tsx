import React, { useEffect, useRef } from 'react';
import { maskTimeText, normalizeTime } from '@/lib/input-masks';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface TimeInputProps
    extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
    /** "HH:mm" (or the "HH:mm:ss" the database returns), or "". */
    value?: string | null;
    /** Receives the text as typed ("19:3" while incomplete); "HH:mm" once complete. */
    onChange: (value: string) => void;
}

/**
 * Time typed as 24-hour HH:mm: only digits are taken and the colon is added while typing.
 * An incomplete or impossible time marks the box invalid, so a form cannot be submitted with it.
 */
export function TimeInput({
    value,
    onChange,
    className,
    placeholder = 'HH:mm',
    required,
    ...props
}: TimeInputProps) {
    const ref = useRef<HTMLInputElement>(null);
    const text = normalizeTime(value) || maskTimeText(value ?? '');
    const problem = text.length > 0 && normalizeTime(text) === '';

    useEffect(() => {
        ref.current?.setCustomValidity(problem ? 'Vaqt HH:mm ko\'rinishida bo\'lishi kerak (00:00 - 23:59)' : '');
    }, [problem]);

    return (
        <Input
            {...props}
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            required={required}
            placeholder={placeholder}
            aria-invalid={problem || props['aria-invalid'] ? true : undefined}
            onChange={(e) => onChange(maskTimeText(e.target.value))}
            className={cn('font-mono', className)}
        />
    );
}

export default TimeInput;
