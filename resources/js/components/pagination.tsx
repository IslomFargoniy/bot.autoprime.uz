import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationProps {
    links?: PaginationLink[];
    total?: number;
    from?: number;
    to?: number;
    className?: string;
}

export default function Pagination({ links, total, from, to, className }: PaginationProps) {
    const { t } = useTranslation();

    const hasLinks = links && links.length > 3;

    if (!hasLinks && (total === undefined || total === null)) {
        return null;
    }

    const renderLinks = () => {
        if (!hasLinks) {
return null;
}

        return (
            <div className="flex flex-wrap items-center justify-center gap-1">
                {links.map((link, key) => {
                    let label = link.label;

                    if (label.includes('Previous') || label.includes('pagination.previous')) {
                        label = label.replace(/Previous|pagination\.previous/g, t('pagination.previous', 'Oldingisi'));
                    } else if (label.includes('Next') || label.includes('pagination.next')) {
                        label = label.replace(/Next|pagination\.next/g, t('pagination.next', 'Keyingisi'));
                    }

                    if (link.url === null) {
                        return (
                            <div
                                key={key}
                                className="px-2.5 sm:px-3 py-1 text-xs border rounded-lg text-muted-foreground bg-muted/40 cursor-not-allowed select-none"
                                dangerouslySetInnerHTML={{ __html: label }}
                            />
                        );
                    }

                    return (
                        <Link
                            key={key}
                            href={link.url}
                            preserveScroll
                            preserveState
                            className={cn(
                                'px-2.5 sm:px-3 py-1 text-xs font-medium border rounded-lg transition-colors',
                                link.active
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-card text-foreground hover:bg-muted border-input'
                            )}
                            dangerouslySetInnerHTML={{ __html: label }}
                        />
                    );
                })}
            </div>
        );
    };

    if (total !== undefined) {
        return (
            <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 sm:mt-6 px-1', className)}>
                <div className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
                    {from !== undefined && to !== undefined ? (
                        <span>
                            {from}–{to} / <strong className="text-foreground font-semibold">{total}</strong> {t('common.records', 'ta yozuv')}
                        </span>
                    ) : (
                        <span>
                            {t('common.total', 'Jami')}: <strong className="text-foreground font-semibold">{total}</strong> {t('common.records', 'ta yozuv')}
                        </span>
                    )}
                </div>
                <div className="order-1 sm:order-2">{renderLinks()}</div>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-wrap items-center justify-center gap-1 mt-6', className)}>
            {renderLinks()}
        </div>
    );
}
