import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
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
import Pagination from '@/components/pagination';
import { formatDateTime, formatNumber, formatMoney } from '@/lib/utils';
import type { CashTransfer } from '../types';

interface Props {
    transfers: { data: CashTransfer[]; links: any[]; total: number; current_page: number; last_page: number };
    canReviewTransfer: (transfer: CashTransfer) => boolean;
    onApproveTransfer: (transfer: CashTransfer) => void;
    onRejectTransfer: (transfer: CashTransfer) => void;
}

export function TransfersTab({ transfers, canReviewTransfer, onApproveTransfer, onRejectTransfer }: Props) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4 w-full max-w-full min-w-0">
            {/* Desktop & Tablet Table with dedicated Horizontal Scrollbar */}
            <div className="hidden md:block w-full max-w-full overflow-hidden">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                    <Table className="w-full min-w-[850px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.from_register', 'Chiqim Kassasi')}</TableHead>
                                <TableHead>{t('finance.to_register', 'Qabul Qiluvchi Kassa')}</TableHead>
                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                <TableHead>{t('finance.status', 'Holat')}</TableHead>
                                <TableHead>{t('finance.sender', 'Yubordi')}</TableHead>
                                <TableHead>{t('finance.approver', 'Tasdiqladi')}</TableHead>
                                <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={8}
                                    icon={<ArrowLeftRight className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_transfers', 'Transferlar topilmadi')}
                                />
                            ) : (
                                transfers.data.map((tr) => (
                                    <TableRow key={tr.id}>
                                        <TableCell className="font-medium whitespace-nowrap">{tr.from_cash_register?.name}</TableCell>
                                        <TableCell className="font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                            {tr.to_cash_register?.name}
                                        </TableCell>
                                        <TableCell className="font-bold text-gray-900 dark:text-white font-mono whitespace-nowrap">
                                            {formatMoney(tr.amount)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                    tr.status === 'approved'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                        : tr.status === 'pending'
                                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                        : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                                }`}
                                            >
                                                {tr.status === 'approved'
                                                    ? t('finance.approved', 'Tasdiqlangan')
                                                    : tr.status === 'pending'
                                                    ? t('finance.pending', 'Kutilmoqda')
                                                    : t('finance.rejected', 'Rad etilgan')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{tr.transferred_by?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{tr.approved_by?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500 font-mono text-xs whitespace-nowrap">{formatDateTime(tr.created_at)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            {tr.status === 'pending' && canReviewTransfer(tr) && (
                                                <div className="inline-flex gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="brand"
                                                        onClick={() => onApproveTransfer(tr)}
                                                        className="h-7 text-xs"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        {t('common.confirm', 'Tasdiqlash')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onRejectTransfer(tr)}
                                                        className="h-7 text-xs"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5 mr-1" />
                                                        {t('finance.reject', 'Rad etish')}
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
            <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
                {transfers.data.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <ArrowLeftRight className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_transfers', 'Transferlar topilmadi')}</p>
                    </div>
                ) : (
                    transfers.data.map((tr) => (
                        <div
                            key={tr.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5 min-w-0"
                        >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            tr.status === 'approved'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                : tr.status === 'pending'
                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                        }`}
                                    >
                                        {tr.status === 'approved'
                                            ? t('finance.approved', 'Tasdiqlangan')
                                            : tr.status === 'pending'
                                            ? t('finance.pending', 'Kutilmoqda')
                                            : t('finance.rejected', 'Rad etilgan')}
                                    </span>
                                    <span className="text-[11px] text-gray-400 font-mono">{formatDateTime(tr.created_at)}</span>
                                </div>
                                <div className="font-mono font-bold text-sm sm:text-base text-gray-900 dark:text-white shrink-0">
                                    {formatNumber(tr.amount)} <span className="text-[10px] font-normal">UZS</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/40 p-2 rounded-lg min-w-0">
                                <span className="truncate min-w-0 flex-1">{tr.from_cash_register?.name}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="text-blue-600 dark:text-blue-400 truncate min-w-0 flex-1">{tr.to_cash_register?.name}</span>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 gap-2 min-w-0">
                                <div className="text-[11px] truncate min-w-0 flex-1">
                                    <span>{tr.transferred_by?.name || '-'}</span>
                                    {tr.approved_by?.name && <span> → {tr.approved_by.name}</span>}
                                </div>
                                {tr.status === 'pending' && canReviewTransfer(tr) && (
                                    <div className="flex gap-1.5 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="brand"
                                            onClick={() => onApproveTransfer(tr)}
                                            className="h-7 text-xs px-2.5"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                            {t('common.confirm', 'Tasdiqlash')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onRejectTransfer(tr)}
                                            className="h-7 text-xs px-2.5"
                                        >
                                            <XCircle className="w-3.5 h-3.5 mr-1" />
                                            {t('finance.reject', 'Rad etish')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Pagination links={transfers.links} />
        </div>
    );
}
