import { router } from '@inertiajs/react';
import { ArrowDownRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { paymentReceipt } from '@/actions/App/Http/Controllers/Admin/FinanceController';
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
import { useCan } from '@/hooks/use-can';
import { formatDateTime, formatNumber, formatMoney } from '@/lib/utils';
import type { Payment } from '../types';
import { ReceiptButton } from './ReceiptButton';

interface Props {
    payments: {
        data: Payment[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    onDeletePayment: (payment: Payment) => void;
    filters?: {
        branch_id?: string | number;
        per_page?: string;
        [key: string]: any;
    };
}

export function PaymentsTab({
    payments,
    onDeletePayment,
    filters = {},
}: Props) {
    const { t } = useTranslation();
    const can = useCan();

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

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'cash':
                return t('finance.method_cash', 'Naqd pul');
            case 'card_terminal':
                return t('finance.method_card_terminal', 'Terminal / Karta');
            case 'card_click':
                return t('finance.method_card_click', 'Karta / Click / Payme');
            case 'bank_transfer':
                return t('finance.method_bank_transfer', "Bank o'tkazmasi");
            case 'click':
                return t('finance.method_click', 'Click');
            case 'payme':
                return t('finance.method_payme', 'Payme');
            case 'other':
                return t('finance.method_other', 'Boshqa');
            default:
                return t(`finance.method_${method}`, method);
        }
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
                                    {t('finance.receipt', 'Chek №')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.student', 'Talaba')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.contract', 'Shartnoma')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.amount', 'Summa')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.method', 'Usul')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.register', 'Kassa')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.receiver', 'Qabul qildi')}
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
                            {payments.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={9}
                                    icon={
                                        <ArrowDownRight className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    }
                                    title={t(
                                        'finance.no_payments',
                                        "To'lovlar topilmadi",
                                    )}
                                />
                            ) : (
                                payments.data.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-mono font-medium whitespace-nowrap">
                                            {p.receipt_number}
                                        </TableCell>
                                        <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                                            {p.student?.full_name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {p.contract?.contract_number
                                                ? `#${p.contract.contract_number}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                            +{formatMoney(p.amount)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                {getMethodLabel(
                                                    p.payment_method,
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {p.cash_register?.name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {p.received_by?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs whitespace-nowrap text-gray-400 dark:text-gray-500">
                                            {formatDateTime(p.paid_at)}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <ReceiptButton
                                                url={paymentReceipt.url(p.id)}
                                            />
                                            {can('payments.edit') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        onDeletePayment(p)
                                                    }
                                                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                                                    title={t(
                                                        'common.delete',
                                                        "O'chirish",
                                                    )}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile Payments Card Feed */}
            <div className="w-full max-w-full min-w-0 space-y-3 md:hidden">
                {payments.data.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                        <ArrowDownRight className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('finance.no_payments', "To'lovlar topilmadi")}
                        </p>
                    </div>
                ) : (
                    payments.data.map((p) => (
                        <div
                            key={p.id}
                            className="min-w-0 space-y-2.5 rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                        {p.student?.full_name || '-'}
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                        <span>#{p.receipt_number}</span>
                                        {p.contract?.contract_number && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    #
                                                    {p.contract.contract_number}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-mono text-sm font-bold text-emerald-600 sm:text-base dark:text-emerald-400">
                                        +{formatNumber(p.amount)}{' '}
                                        <span className="text-[10px] font-normal">
                                            UZS
                                        </span>
                                    </div>
                                    <span className="mt-0.5 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        {getMethodLabel(p.payment_method)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex min-w-0 items-center justify-between gap-2 border-t border-gray-50 pt-1.5 text-xs text-gray-500 dark:border-gray-700/50 dark:text-gray-400">
                                <div className="min-w-0 flex-1 truncate">
                                    <span className="truncate">
                                        {p.cash_register?.name}
                                    </span>
                                    {p.received_by?.name && (
                                        <span className="text-[11px] text-gray-400">
                                            {' '}
                                            ({p.received_by.name})
                                        </span>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="font-mono text-[11px]">
                                        {formatDateTime(p.paid_at)}
                                    </span>
                                    <ReceiptButton
                                        url={paymentReceipt.url(p.id)}
                                    />
                                    {can('payments.edit') && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onDeletePayment(p)}
                                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                                            title={t(
                                                'common.delete',
                                                "O'chirish",
                                            )}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Pagination
                links={payments.links}
                total={payments.total}
                from={payments.from}
                to={payments.to}
            />
        </div>
    );
}
