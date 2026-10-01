import { router } from '@inertiajs/react';
import {
    ArrowLeftRight,
    CheckCircle2,
    XCircle,
    ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageFilterBar } from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { formatDateTime, formatNumber, formatMoney } from '@/lib/utils';
import type { CashTransfer } from '../types';

interface Props {
    transfers: {
        data: CashTransfer[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    canReviewTransfer: (transfer: CashTransfer) => boolean;
    onApproveTransfer: (transfer: CashTransfer) => void;
    onRejectTransfer: (transfer: CashTransfer) => void;
    filters?: {
        branch_id?: string | number;
        per_page?: string;
        [key: string]: any;
    };
}

export function TransfersTab({
    transfers,
    canReviewTransfer,
    onApproveTransfer,
    onRejectTransfer,
    filters = {},
}: Props) {
    const { t } = useTranslation();

    const handlePerPageChange = (newPerPage: string) => {
        router.get(
            '/admin/finance',
            {
                ...filters,
                per_page: newPerPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    return (
        <div className="w-full max-w-full min-w-0 space-y-4">
            {/* Top Toolbar */}
            <PageFilterBar>
                <div className="flex-1" />
                <PerPageSelect
                    value={filters?.per_page || '15'}
                    onChange={handlePerPageChange}
                />
            </PageFilterBar>

            {/* Desktop & Tablet Table with dedicated Horizontal Scrollbar */}
            <div className="hidden w-full max-w-full overflow-hidden md:block">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
                    <Table className="w-full min-w-[850px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {t(
                                        'finance.from_register',
                                        'Chiqim Kassasi',
                                    )}
                                </TableHead>
                                <TableHead>
                                    {t(
                                        'finance.to_register',
                                        'Qabul Qiluvchi Kassa',
                                    )}
                                </TableHead>
                                <TableHead>
                                    {t('finance.amount', 'Summa')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.status', 'Holat')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.sender', 'Yubordi')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.approver', 'Tasdiqladi')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.date', 'Sana')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('common.actions', 'Amallar')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={8}
                                    icon={
                                        <ArrowLeftRight className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    }
                                    title={t(
                                        'finance.no_transfers',
                                        'Transferlar topilmadi',
                                    )}
                                />
                            ) : (
                                transfers.data.map((tr) => (
                                    <TableRow key={tr.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            <div>
                                                {tr.from_cash_register?.name}
                                            </div>
                                            {tr.notes && (
                                                <div
                                                    className={`mt-0.5 max-w-[260px] truncate text-[11px] font-normal ${
                                                        tr.status === 'rejected'
                                                            ? 'font-medium text-red-600 dark:text-red-400'
                                                            : 'text-gray-500 dark:text-gray-400'
                                                    }`}
                                                    title={tr.notes}
                                                >
                                                    {tr.notes}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium whitespace-nowrap text-blue-600 dark:text-blue-400">
                                            {tr.to_cash_register?.name}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold whitespace-nowrap text-gray-900 dark:text-white">
                                            {formatMoney(tr.amount)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                    tr.status === 'approved'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : tr.status ===
                                                            'pending'
                                                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                          : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                                }`}
                                            >
                                                {tr.status === 'approved'
                                                    ? t(
                                                          'finance.approved',
                                                          'Tasdiqlangan',
                                                      )
                                                    : tr.status === 'pending'
                                                      ? t(
                                                            'finance.pending',
                                                            'Kutilmoqda',
                                                        )
                                                      : t(
                                                            'finance.rejected',
                                                            'Rad etilgan',
                                                        )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {tr.transferred_by?.name || '-'}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {tr.approved_by?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs whitespace-nowrap text-gray-400 dark:text-gray-500">
                                            {formatDateTime(tr.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            {tr.status === 'pending' &&
                                                canReviewTransfer(tr) && (
                                                    <div className="inline-flex gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="brand"
                                                            onClick={() =>
                                                                onApproveTransfer(
                                                                    tr,
                                                                )
                                                            }
                                                            className="h-7 text-xs"
                                                        >
                                                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                            {t(
                                                                'common.confirm',
                                                                'Tasdiqlash',
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                onRejectTransfer(
                                                                    tr,
                                                                )
                                                            }
                                                            className="h-7 text-xs"
                                                        >
                                                            <XCircle className="mr-1 h-3.5 w-3.5" />
                                                            {t(
                                                                'finance.reject',
                                                                'Rad etish',
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile Transfers Card Feed */}
            <div className="w-full max-w-full min-w-0 space-y-3 md:hidden">
                {transfers.data.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                        <ArrowLeftRight className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('finance.no_transfers', 'Transferlar topilmadi')}
                        </p>
                    </div>
                ) : (
                    transfers.data.map((tr) => (
                        <div
                            key={tr.id}
                            className="min-w-0 space-y-2.5 rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            tr.status === 'approved'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : tr.status === 'pending'
                                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                  : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                        }`}
                                    >
                                        {tr.status === 'approved'
                                            ? t(
                                                  'finance.approved',
                                                  'Tasdiqlangan',
                                              )
                                            : tr.status === 'pending'
                                              ? t(
                                                    'finance.pending',
                                                    'Kutilmoqda',
                                                )
                                              : t(
                                                    'finance.rejected',
                                                    'Rad etilgan',
                                                )}
                                    </span>
                                    <span className="font-mono text-[11px] text-gray-400">
                                        {formatDateTime(tr.created_at)}
                                    </span>
                                </div>
                                <div className="shrink-0 font-mono text-sm font-bold text-gray-900 sm:text-base dark:text-white">
                                    {formatNumber(tr.amount)}{' '}
                                    <span className="text-[10px] font-normal">
                                        UZS
                                    </span>
                                </div>
                            </div>

                            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-50 p-2 text-xs font-medium text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">
                                <span className="min-w-0 flex-1 truncate">
                                    {tr.from_cash_register?.name}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                <span className="min-w-0 flex-1 truncate text-blue-600 dark:text-blue-400">
                                    {tr.to_cash_register?.name}
                                </span>
                            </div>

                            {tr.notes && (
                                <div
                                    className={`rounded-lg p-2 text-xs leading-relaxed ${
                                        tr.status === 'rejected'
                                            ? 'border border-red-100 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300'
                                            : 'bg-gray-50 text-gray-600 dark:bg-gray-700/30 dark:text-gray-300'
                                    }`}
                                >
                                    <span className="font-medium">
                                        {t('finance.notes', 'Izoh')}:{' '}
                                    </span>
                                    {tr.notes}
                                </div>
                            )}

                            <div className="flex min-w-0 items-center justify-between gap-2 border-t border-gray-50 pt-1 text-xs text-gray-500 dark:border-gray-700/50 dark:text-gray-400">
                                <div className="min-w-0 flex-1 truncate text-[11px]">
                                    <span>
                                        {tr.transferred_by?.name || '-'}
                                    </span>
                                    {tr.approved_by?.name && (
                                        <span> → {tr.approved_by.name}</span>
                                    )}
                                </div>
                                {tr.status === 'pending' &&
                                    canReviewTransfer(tr) && (
                                        <div className="flex shrink-0 gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="brand"
                                                onClick={() =>
                                                    onApproveTransfer(tr)
                                                }
                                                className="h-7 px-2.5 text-xs"
                                            >
                                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                {t(
                                                    'common.confirm',
                                                    'Tasdiqlash',
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    onRejectTransfer(tr)
                                                }
                                                className="h-7 px-2.5 text-xs"
                                            >
                                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                                {t(
                                                    'finance.reject',
                                                    'Rad etish',
                                                )}
                                            </Button>
                                        </div>
                                    )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Pagination
                links={transfers.links}
                total={transfers.total}
                from={transfers.from}
                to={transfers.to}
            />
        </div>
    );
}
