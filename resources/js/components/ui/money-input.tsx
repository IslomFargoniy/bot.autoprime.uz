import React, { useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { groupThousands, moneyDigits } from '@/lib/input-masks';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: string | number | null;
    /** Receives the raw digits ("1500000"), or "" when the box is empty. */
    onChange: (val: string) => void;
    suffix?: string;
}

const MAX_DIGITS = 12;

/**
 * Money amount typed as "1 500 000". An empty box (or a zero) shows the "0" placeholder
 * instead of a real zero, so the cashier can type straight away without deleting anything.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value = '', onChange, className, suffix, placeholder = '0', ...props }, ref) => {
        const inputRef = useRef<HTMLInputElement>(null);
        const caretDigits = useRef<number | null>(null);

        useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

        const digits = moneyDigits(value);
        const displayValue = groupThousands(digits);

        // Reformatting moves the text under the cursor, so put the cursor back after the same digit.
        useLayoutEffect(() => {
            const input = inputRef.current;

            if (caretDigits.current === null || !input) {
                return;
            }

            let seen = 0;
            let position = 0;

            while (position < input.value.length && seen < caretDigits.current) {
                if (/\d/.test(input.value[position])) {
                    seen++;
                }

                position++;
            }

            input.setSelectionRange(position, position);
            caretDigits.current = null;
        }, [displayValue]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const typed = e.target.value;
            const caret = e.target.selectionStart ?? typed.length;

            caretDigits.current = typed.slice(0, caret).replace(/\D/g, '').length;
            onChange(moneyDigits(typed.replace(/\D/g, '').slice(0, MAX_DIGITS)));
        };

        const input = (
            <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={cn('font-mono', suffix && 'pr-12', className)}
                {...props}
            />
        );

        if (!suffix) {
            return input;
        }

        return (
            <div className="relative flex w-full items-center">
                {input}
                <span className="pointer-events-none absolute right-3 text-xs font-semibold text-muted-foreground select-none">
                    {suffix}
                </span>
            </div>
        );
    },
);

MoneyInput.displayName = 'MoneyInput';

export default MoneyInput;
