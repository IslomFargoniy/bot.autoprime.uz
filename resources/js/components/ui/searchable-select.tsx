import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface SearchableOption {
    value: string | number;
    label: string;
    sublabel?: string;
    disabled?: boolean;
}

export interface SearchableSelectProps {
    options: SearchableOption[];
    value?: string | number | null;
    onChange: (value: any) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
    id?: string;
    name?: string;
    required?: boolean;
    allowClear?: boolean;
    size?: 'sm' | 'default';
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    disabled = false,
    className,
    triggerClassName,
    id,
    name,
    allowClear = false,
    size = 'default',
}: SearchableSelectProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [openUpward, setOpenUpward] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => {
        return options.find((opt) => String(opt.value) === String(value));
    }, [options, value]);

    const normalize = (text: string) =>
        text
            .toLowerCase()
            .replace(/[`'ʻʼʹ]/g, "'")
            .trim();

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = normalize(searchQuery);
        return options.filter((opt) => {
            const labelStr = normalize(String(opt.label ?? ''));
            const sublabelStr = opt.sublabel ? normalize(String(opt.sublabel)) : '';
            const valStr = normalize(String(opt.value ?? ''));
            return labelStr.includes(q) || sublabelStr.includes(q) || valStr.includes(q);
        });
    }, [options, searchQuery]);

    // Check position (upward or downward)
    const checkOrientation = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 260;
        setOpenUpward(spaceBelow < dropdownHeight && rect.top > dropdownHeight);
    };

    const handleOpen = () => {
        if (disabled) return;
        checkOrientation();
        setIsOpen(true);
        setSearchQuery('');
        setHighlightIndex(0);
    };

    // Auto-focus search input when opened
    useEffect(() => {
        if (isOpen) {
            checkOrientation();
            const timer = setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                handleOpen();
            }
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            setSearchQuery('');
            triggerRef.current?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((prev) => (prev - 1 + (filteredOptions.length || 1)) % (filteredOptions.length || 1));
        } else if (e.key === 'Enter' && filteredOptions[highlightIndex]) {
            e.preventDefault();
            handleSelect(filteredOptions[highlightIndex].value);
        }
    };

    return (
        <div ref={containerRef} className={cn('relative w-full', isOpen ? 'z-40' : 'z-auto', className)}>
            {/* Trigger Button */}
            <button
                type="button"
                id={id}
                ref={triggerRef}
                onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={cn(
                    'flex w-full items-center justify-between rounded-lg border border-input bg-background text-left text-xs transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50',
                    size === 'sm' ? 'h-8 px-2.5' : 'h-9 px-3',
                    triggerClassName
                )}
            >
                <div className="flex-1 truncate pr-2">
                    {selectedOption ? (
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate font-medium text-foreground">
                                {selectedOption.label}
                            </span>
                            {selectedOption.sublabel && (
                                <span className="text-[11px] text-muted-foreground truncate">
                                    ({selectedOption.sublabel})
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-muted-foreground">
                            {placeholder || t('common.select', '-- Tanlang --')}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {allowClear && selectedOption && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onClick={handleClear}
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown
                        className={cn(
                            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
                            isOpen && 'rotate-180 text-primary'
                        )}
                    />
                </div>
            </button>

            {/* Dropdown Menu (Inline within container for seamless Dialog focus & positioning) */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className={cn(
                        'absolute left-0 z-50 w-full min-w-[200px] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100',
                        openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                    )}
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
                        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setHighlightIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            placeholder={searchPlaceholder || t('common.search', 'Qidirish...')}
                            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none border-none p-0 focus:ring-0"
                            autoComplete="off"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                }}
                                className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto p-1 text-xs">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                {emptyMessage || t('common.no_data', 'Ma\'lumot topilmadi')}
                            </div>
                        ) : (
                            filteredOptions.map((opt, index) => {
                                const isSelected = String(opt.value) === String(value);
                                const isHighlighted = index === highlightIndex;

                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={opt.disabled}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelect(opt.value);
                                        }}
                                        onMouseEnter={() => setHighlightIndex(index)}
                                        className={cn(
                                            'flex w-full items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer',
                                            isSelected &&
                                                'bg-primary/10 text-primary font-semibold',
                                            isHighlighted && !isSelected && 'bg-accent text-accent-foreground',
                                            !isSelected && !isHighlighted && 'text-foreground hover:bg-accent hover:text-accent-foreground',
                                            opt.disabled && 'opacity-40 cursor-not-allowed'
                                        )}
                                    >
                                        <div className="truncate pr-2">
                                            <div className="truncate font-medium">
                                                {opt.label}
                                            </div>
                                            {opt.sublabel && (
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {opt.sublabel}
                                                </div>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-auto" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
