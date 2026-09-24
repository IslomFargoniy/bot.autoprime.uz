import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [coords, setCoords] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width: number;
    }>({
        left: 0,
        width: 0,
    });

    const selectedOption = useMemo(() => {
        return options.find((opt) => String(opt.value) === String(value));
    }, [options, value]);

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(q) ||
                (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
        );
    }, [options, searchQuery]);

    // Update position of dropdown
    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownMaxHeight = 260;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < dropdownMaxHeight && rect.top > dropdownMaxHeight;

        const safeWidth = Math.min(rect.width, window.innerWidth - 16);
        const safeLeft = Math.max(8, Math.min(rect.left, window.innerWidth - safeWidth - 8));

        if (openUpward) {
            setCoords({
                bottom: window.innerHeight - rect.top + 4,
                top: undefined,
                left: safeLeft,
                width: safeWidth,
            });
        } else {
            setCoords({
                top: rect.bottom + 4,
                bottom: undefined,
                left: safeLeft,
                width: safeWidth,
            });
        }
    };

    // Open & calculate coords
    const handleOpen = () => {
        if (disabled) return;
        updatePosition();
        setIsOpen(true);
        setSearchQuery('');
        setHighlightIndex(0);
    };

    // Focus search input when open
    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Update position on scroll/resize
    useEffect(() => {
        if (!isOpen) return;

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen]);

    // Handle outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current &&
                !triggerRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
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
        <div className={cn('relative w-full', className)}>
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
                    'flex w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-left text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
                    size === 'sm' ? 'h-8 px-2.5' : 'h-9 px-3',
                    triggerClassName
                )}
            >
                <div className="flex-1 truncate pr-2">
                    {selectedOption ? (
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate font-medium text-gray-900 dark:text-white">
                                {selectedOption.label}
                            </span>
                            {selectedOption.sublabel && (
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                    ({selectedOption.sublabel})
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-gray-400 dark:text-gray-500">
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
                            className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown
                        className={cn(
                            'w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
                            isOpen && 'rotate-180 text-blue-500'
                        )}
                    />
                </div>
            </button>

            {/* Portal Dropdown Menu */}
            {isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            top: coords.top !== undefined ? `${coords.top}px` : undefined,
                            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                            left: `${coords.left}px`,
                            width: `${coords.width}px`,
                        }}
                        className="fixed z-[99999] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80">
                            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setHighlightIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={searchPlaceholder || t('common.search', 'Qidirish...')}
                                className="w-full bg-transparent text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Options List */}
                        <div className="max-h-56 overflow-y-auto p-1 text-xs">
                            {filteredOptions.length === 0 ? (
                                <div className="p-4 text-center text-xs text-gray-400">
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
                                            onClick={() => handleSelect(opt.value)}
                                            onMouseEnter={() => setHighlightIndex(index)}
                                            className={cn(
                                                'flex w-full items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer',
                                                isSelected &&
                                                    'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium',
                                                isHighlighted && !isSelected && 'bg-gray-100 dark:bg-gray-700/60',
                                                opt.disabled && 'opacity-40 cursor-not-allowed'
                                            )}
                                        >
                                            <div className="truncate pr-2">
                                                <div className="truncate font-medium text-gray-900 dark:text-white">
                                                    {opt.label}
                                                </div>
                                                {opt.sublabel && (
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                        {opt.sublabel}
                                                    </div>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-auto" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
