import { Calendar as CalendarIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { displayToIso, isoToDisplay, maskDateText } from '@/lib/input-masks';
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
    min?: string; // 'YYYY-MM-DD'
    max?: string; // 'YYYY-MM-DD'
}

/**
 * Date typed by hand as DD.MM.YYYY (dots are added automatically) or picked from the
 * calendar button. The value going in and out stays 'YYYY-MM-DD'; while the typed date
 * is incomplete or not a real date, onChange receives ''.
 */
export function DatePicker({
    value = '',
    onChange,
    placeholder = 'KK.OO.YYYY',
    className,
    id,
    required,
    disabled,
    title,
    min,
    max,
}: DatePickerProps) {
    const textRef = useRef<HTMLInputElement>(null);
    const nativeRef = useRef<HTMLInputElement>(null);

    // The box keeps what the user typed; a value changed from outside (form reset, edit
    // dialog) replaces it. `emitted` remembers what we last reported to tell the two apart.
    const [text, setText] = useState(() => isoToDisplay(value));
    const [emitted, setEmitted] = useState(value);
    const [seen, setSeen] = useState(value);

    if (value !== seen) {
        setSeen(value);

        if (value !== emitted) {
            setText(isoToDisplay(value));
            setEmitted(value);
        }
    }

    const iso = displayToIso(text);
    const outOfRange = !!iso && ((!!min && iso < min) || (!!max && iso > max));
    const problem = text.length > 0 && (!iso || outOfRange);

    useEffect(() => {
        textRef.current?.setCustomValidity(problem ? "Sana noto'g'ri yoki ruxsat etilgan oraliqdan tashqarida" : '');
    }, [problem]);

    const commit = (nextText: string) => {
        const nextIso = displayToIso(nextText);
        const valid = !!nextIso && !(min && nextIso < min) && !(max && nextIso > max);
        const next = valid ? (nextIso as string) : '';

        setText(nextText);

        // Typing half a date must not fire a change per keystroke (filters reload on change).
        if (next !== emitted) {
            setEmitted(next);
            onChange(next);
        }
    };

    const openCalendar = () => {
        const native = nativeRef.current;

        if (disabled || !native) {
            return;
        }

        try {
            native.showPicker();
        } catch {
            native.focus();
        }
    };

    return (
        <div
            className={cn(
                'relative flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
                problem && 'border-destructive focus-within:ring-destructive/30',
                disabled && 'cursor-not-allowed opacity-50',
                className,
            )}
            title={title}
        >
            <input
                ref={textRef}
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={text}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                aria-invalid={problem || undefined}
                onChange={(e) => commit(maskDateText(e.target.value))}
                className="h-full min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />

            <button
                type="button"
                tabIndex={-1}
                disabled={disabled}
                onClick={openCalendar}
                aria-label="Kalendar"
                className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
            >
                <CalendarIcon className="h-4 w-4" />
            </button>

            {/* Hidden native input only used to open the operating system calendar. */}
            <input
                ref={nativeRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={iso && !outOfRange ? iso : ''}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => commit(isoToDisplay(e.target.value))}
                className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
            />
        </div>
    );
}

export default DatePicker;
