import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PageFilterPillItem<T = string> {
    value: T;
    label: ReactNode;
    count?: number;
    color?: string; // Optional custom active class (e.g. red for debtors)
}

interface PageFilterPillsProps<T = string> {
    items: PageFilterPillItem<T>[];
    activeValue: T;
    onChange: (value: T) => void;
    className?: string;
}

export function PageFilterPills<T = string>({
    items,
    activeValue,
    onChange,
    className,
}: PageFilterPillsProps<T>) {
    return (
        <div
            className={cn(
                'no-scrollbar flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto py-0.5 md:w-auto md:flex-wrap',
                className,
            )}
        >
            {items.map((item) => {
                const isActive = item.value === activeValue;

                return (
                    <button
                        key={String(item.value)}
                        type="button"
                        onClick={() => onChange(item.value)}
                        className={cn(
                            'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                            isActive
                                ? item.color ||
                                      'border-blue-600 bg-blue-600 text-white shadow-xs'
                                : 'border-input bg-muted/50 text-foreground hover:bg-muted',
                        )}
                    >
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                            <span
                                className={cn(
                                    'py-0.2 rounded-full px-1.5 text-[10px]',
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-background/80 text-foreground/80',
                                )}
                            >
                                {item.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

interface PageFilterSearchProps {
    value?: string;
    onChange?: (val: string) => void;
    onSubmit?: (e: React.FormEvent) => void;
    placeholder?: string;
    perPage?: string | number;
    onPerPageChange?: (perPage: string) => void;
    searchWidth?: string;
    showSubmitButton?: boolean;
    submitLabel?: string;
    children?: ReactNode;
    className?: string;
}

export function PageFilterSearch({
    value,
    onChange,
    onSubmit,
    placeholder,
    perPage,
    onPerPageChange,
    searchWidth = 'md:w-64',
    showSubmitButton = true,
    submitLabel,
    children,
    className,
}: PageFilterSearchProps) {
    const { t } = useTranslation();

    const handleFormSubmit = (e: React.FormEvent) => {
        if (onSubmit) {
            onSubmit(e);
        } else {
            e.preventDefault();
        }
    };

    return (
        <form
            onSubmit={handleFormSubmit}
            className={cn(
                'flex w-full flex-wrap items-center gap-2 sm:flex-nowrap md:w-auto',
                className,
            )}
        >
            {onChange !== undefined && (
                <div className={cn('relative flex-1', searchWidth)}>
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={
                            placeholder || t('common.search', 'Qidirish...')
                        }
                        className="h-10 bg-background pl-9 text-sm text-foreground"
                    />
                </div>
            )}

            {children}

            {perPage !== undefined && onPerPageChange && (
                <PerPageSelect
                    value={String(perPage)}
                    onChange={onPerPageChange}
                />
            )}

            {showSubmitButton && (
                <Button
                    type="submit"
                    variant="secondary"
                    className="h-10 shrink-0 px-4"
                >
                    <Search className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                        {submitLabel || t('common.find', 'Qidiruv')}
                    </span>
                </Button>
            )}
        </form>
    );
}

interface PageFilterBarProps {
    children: ReactNode;
    className?: string;
}

export function PageFilterBar({ children, className }: PageFilterBarProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-stretch justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs sm:p-4 md:flex-row md:items-center',
                className,
            )}
        >
            {children}
        </div>
    );
}

export default PageFilterBar;
