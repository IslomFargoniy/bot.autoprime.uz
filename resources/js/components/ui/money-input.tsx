import React from 'react';
import { cn, formatNumber, unformatNumber } from '@/lib/utils';
import { Input } from './input';

export interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: string | number | null;
    onChange: (val: string) => void;
    suffix?: string;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value = '', onChange, className, suffix, placeholder = '0', ...props }, ref) => {
        const rawStr = value !== undefined && value !== null ? String(value) : '';
        const displayValue = rawStr ? formatNumber(rawStr) : '';

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = unformatNumber(e.target.value);
            onChange(raw);
        };

        if (suffix) {
            return (
                <div className="relative flex items-center w-full">
                    <Input
                        ref={ref}
                        type="text"
                        inputMode="numeric"
                        value={displayValue}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className={cn('pr-12 font-mono', className)}
                        {...props}
                    />
                    <span className="absolute right-3 text-xs font-semibold text-muted-foreground pointer-events-none select-none">
                        {suffix}
                    </span>
                </div>
            );
        }

        return (
            <Input
                ref={ref}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={cn('font-mono', className)}
                {...props}
            />
        );
    }
);

MoneyInput.displayName = 'MoneyInput';

export default MoneyInput;
