import React from 'react';
import { cleanPlate, formatPlateDisplay } from '@/lib/input-masks';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface PlateNumberInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
    value?: string | null;
    /** Receives the plate without spaces, e.g. "01A123BC". */
    onChange: (value: string) => void;
}

/**
 * Vehicle plate typed as "01 A 123 BC" (private) or "01 123 ABC" (company), Latin upper case.
 */
export function PlateNumberInput({ value, onChange, className, placeholder = '01 A 123 BC', ...props }: PlateNumberInputProps) {
    const clean = cleanPlate(value ?? '');

    return (
        <Input
            {...props}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={formatPlateDisplay(clean)}
            onChange={(e) => onChange(cleanPlate(e.target.value))}
            placeholder={placeholder}
            className={cn('font-mono uppercase', className)}
        />
    );
}

export default PlateNumberInput;
