import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface PerPageSelectProps {
    value?: string | number;
    onChange: (value: string) => void;
    className?: string;
    options?: Array<number | 'all'>;
}

export default function PerPageSelect({
    value = '15',
    onChange,
    className,
    options = [15, 30, 50, 'all'],
}: PerPageSelectProps) {
    const { t } = useTranslation();

    return (
        <select
            value={String(value || '15')}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                'flex h-9 sm:h-10 items-center justify-between rounded-lg border border-input bg-background px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0 text-foreground',
                className
            )}
            title={t('common.per_page', 'Sahifada ko\'rsatish')}
        >
            {options.map((opt) => (
                <option key={String(opt)} value={String(opt)}>
                    {opt === 'all'
                        ? t('common.all', 'Barchasi')
                        : `${opt}`}
                </option>
            ))}
        </select>
    );
}
