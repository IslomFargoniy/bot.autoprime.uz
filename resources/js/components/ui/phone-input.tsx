import React, { useState } from 'react';
import { formatPhoneDisplay, onlyDigits, phoneNationalDigits } from '@/lib/input-masks';
import { Input } from './input';

export interface PhoneInputProps
    extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'defaultValue' | 'type'> {
    /** Stored value, "+998901234567" or "". Leave out to let the box keep its own value. */
    value?: string | null;
    defaultValue?: string | null;
    /** Receives "+998XXXXXXXXX" (as far as typed), or "" when the box is empty. */
    onChange?: (value: string) => void;
}

/**
 * Uzbek phone number typed as "+998 (90) 123-45-67". Only digits are accepted; pasted
 * numbers such as "901234567" or "998 90 123 45 67" are understood. With a `name`, a plain
 * HTML form submits the canonical "+998XXXXXXXXX" value.
 */
export function PhoneInput({ value, defaultValue, onChange, name, placeholder = '+998 (90) 123-45-67', ...props }: PhoneInputProps) {
    const [ownValue, setOwnValue] = useState(defaultValue ?? '');
    const current = value ?? ownValue;
    const national = phoneNationalDigits(current);
    const display = formatPhoneDisplay(national);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const typed = e.target.value;
        const typedDigits = onlyDigits(typed);
        let nextNational = phoneNationalDigits(typedDigits.length <= 3 && typedDigits.startsWith('998') ? '' : typedDigits);

        // Deleting a "(", ")" or "-" removes no digit; treat it as deleting the last digit.
        if (nextNational.length === national.length && typed.length < display.length) {
            nextNational = national.slice(0, -1);
        }

        const next = nextNational ? `+998${nextNational}` : '';

        setOwnValue(next);
        onChange?.(next);
    };

    return (
        <>
            <Input
                {...props}
                type="tel"
                inputMode="tel"
                autoComplete={props.autoComplete ?? 'tel'}
                value={display}
                onChange={handleChange}
                placeholder={placeholder}
                className={props.className}
            />
            {name && <input type="hidden" name={name} value={national ? `+998${national}` : ''} />}
        </>
    );
}

export default PhoneInput;
