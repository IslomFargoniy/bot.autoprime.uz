import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface PassportSeriesInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
    value?: string | null;
    onChange: (value: string) => void;
}

/**
 * Passport / ID card series: two Latin letters, upper case. Anything else is dropped.
 */
export function PassportSeriesInput({ value, onChange, className, ...props }: PassportSeriesInputProps) {
    const clean = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    const shown = clean(value ?? '');

    return (
        <Input
            {...props}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={shown}
            onChange={(e) => onChange(clean(e.target.value))}
            aria-invalid={(shown.length === 1) || props['aria-invalid'] ? true : undefined}
            className={cn('font-mono uppercase', className)}
        />
    );
}

export default PassportSeriesInput;
