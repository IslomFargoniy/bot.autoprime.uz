import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface DigitsInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
    value?: string | number | null;
    onChange: (value: string) => void;
    /** Exact number of digits the field needs (passport number 7, PINFL 14). */
    length?: number;
    /** Upper limit when there is no exact length (Telegram ID). */
    maxLength?: number;
    /** Show "9/14" under the box. */
    showCounter?: boolean;
}

/**
 * A box that takes digits only, however they arrive (typing or paste).
 */
export function DigitsInput({ value, onChange, length, maxLength, showCounter, className, ...props }: DigitsInputProps) {
    const limit = length ?? maxLength;
    const text = String(value ?? '').replace(/\D/g, '');
    const shown = limit ? text.slice(0, limit) : text;
    const incomplete = length !== undefined && shown.length > 0 && shown.length < length;

    return (
        <>
            <Input
                {...props}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={shown}
                maxLength={undefined}
                onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');

                    onChange(limit ? digits.slice(0, limit) : digits);
                }}
                aria-invalid={incomplete || props['aria-invalid'] ? true : undefined}
                className={cn('font-mono', className)}
            />
            {showCounter && length !== undefined && (
                <p className={cn('mt-1 text-[11px]', incomplete ? 'text-amber-600' : 'text-muted-foreground')}>
                    {shown.length}/{length}
                </p>
            )}
        </>
    );
}

export default DigitsInput;
