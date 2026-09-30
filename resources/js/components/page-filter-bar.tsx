import React, { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PerPageSelect from '@/components/per-page-select';
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
        <div className={cn("flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto flex-nowrap md:flex-wrap", className)}>
            {items.map((item) => {
                const isActive = item.value === activeValue;
                return (
                    <button
                        key={String(item.value)}
                        type="button"
                        onClick={() => onChange(item.value)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 flex items-center gap-1.5",
                            isActive
                                ? (item.color || "bg-blue-600 text-white border-blue-600 shadow-xs")
                                : "bg-muted/50 text-foreground border-input hover:bg-muted"
                        )}
                    >
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                            <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[10px]",
                                isActive ? "bg-white/20 text-white" : "bg-background/80 text-foreground/80"
                            )}>
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
        <form onSubmit={handleFormSubmit} className={cn("flex gap-2 w-full md:w-auto items-center flex-wrap sm:flex-nowrap", className)}>
            {onChange !== undefined && (
                <div className={cn("relative flex-1", searchWidth)}>
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || t('common.search', 'Qidirish...')}
                        className="pl-9 h-10 text-sm bg-background text-foreground"
                    />
                </div>
            )}

            {children}

            {perPage !== undefined && onPerPageChange && (
                <PerPageSelect value={String(perPage)} onChange={onPerPageChange} />
            )}

            {showSubmitButton && (
                <Button type="submit" variant="secondary" className="shrink-0 h-10 px-4">
                    <Search className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{submitLabel || t('common.find', 'Qidiruv')}</span>
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
        <div className={cn(
            "bg-card border border-border rounded-xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between",
            className
        )}>
            {children}
        </div>
    );
}

export default PageFilterBar;
