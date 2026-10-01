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

export default function Pagination({
    links,
    total,
    from,
    to,
    className,
}: PaginationProps) {
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

                    if (
                        label.includes('Previous') ||
                        label.includes('pagination.previous')
                    ) {
                        label = label.replace(
                            /Previous|pagination\.previous/g,
                            t('pagination.previous', 'Oldingisi'),
                        );
                    } else if (
                        label.includes('Next') ||
                        label.includes('pagination.next')
                    ) {
                        label = label.replace(
                            /Next|pagination\.next/g,
                            t('pagination.next', 'Keyingisi'),
                        );
                    }

                    if (link.url === null) {
                        return (
                            <div
                                key={key}
                                className="cursor-not-allowed rounded-lg border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground select-none sm:px-3"
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
                                'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors sm:px-3',
                                link.active
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-input bg-card text-foreground hover:bg-muted',
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
            <div
                className={cn(
                    'mt-4 flex flex-col items-center justify-between gap-3 px-1 sm:mt-6 sm:flex-row',
                    className,
                )}
            >
                <div className="order-2 text-center text-xs text-muted-foreground sm:order-1 sm:text-left">
                    {from !== undefined && to !== undefined ? (
                        <span>
                            {from}–{to} /{' '}
                            <strong className="font-semibold text-foreground">
                                {total}
                            </strong>{' '}
                            {t('common.records', 'ta yozuv')}
                        </span>
                    ) : (
                        <span>
                            {t('common.total', 'Jami')}:{' '}
                            <strong className="font-semibold text-foreground">
                                {total}
                            </strong>{' '}
                            {t('common.records', 'ta yozuv')}
                        </span>
                    )}
                </div>
                <div className="order-1 sm:order-2">{renderLinks()}</div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'mt-6 flex flex-wrap items-center justify-center gap-1',
                className,
            )}
        >
            {renderLinks()}
        </div>
    );
}
