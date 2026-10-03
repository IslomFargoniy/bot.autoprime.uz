import { router } from '@inertiajs/react';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { expenseReceipt } from '@/actions/App/Http/Controllers/Admin/FinanceController';
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
import type { Expense } from '../types';
import { ReceiptButton } from './ReceiptButton';

interface Props {
    expenses: {
        data: Expense[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    onDeleteExpense: (expense: Expense) => void;
    filters?: {
        branch_id?: string | number;
        per_page?: string;
        [key: string]: any;
    };
}

export function ExpensesTab({
    expenses,
    onDeleteExpense,
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
                    <Table className="w-full min-w-[800px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {t('finance.receipt', 'Chek №')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.category', 'Kategoriya')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.description', 'Tavsif')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.amount', 'Summa')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.register', 'Kassa')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.user', 'Xodim')}
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
                            {expenses.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={8}
                                    icon={
                                        <ArrowUpRight className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    }
                                    title={t(
                                        'finance.no_expenses',
                                        'Xarajatlar topilmadi',
                                    )}
                                />
                            ) : (
                                expenses.data.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                                            {e.receipt_number || '-'}
                                        </TableCell>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {e.category?.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-gray-700 dark:text-gray-300">
                                            {e.description}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold whitespace-nowrap text-red-500 dark:text-red-400">
                                            -{formatMoney(e.amount)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {e.cash_register?.name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {e.user?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs whitespace-nowrap text-gray-400 dark:text-gray-500">
                                            {formatDateTime(
                                                e.spent_at || e.expense_date,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <ReceiptButton
                                                url={expenseReceipt.url(e.id)}
                                            />
                                            {can('expenses.delete') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        onDeleteExpense(e)
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

            {/* Mobile Expenses Card Feed */}
            <div className="w-full max-w-full min-w-0 space-y-3 md:hidden">
                {expenses.data.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                        <ArrowUpRight className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('finance.no_expenses', 'Xarajatlar topilmadi')}
                        </p>
                    </div>
                ) : (
                    expenses.data.map((e) => (
                        <div
                            key={e.id}
                            className="min-w-0 space-y-2.5 rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/60 dark:text-rose-300">
                                        {e.category?.name || '-'}
                                    </span>
                                    {e.receipt_number && (
                                        <span className="ml-1.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                                            #{e.receipt_number}
                                        </span>
                                    )}
                                    <p className="mt-1 text-xs font-medium break-words text-gray-800 dark:text-gray-200">
                                        {e.description}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-mono text-sm font-bold text-rose-600 sm:text-base dark:text-rose-400">
                                        -{formatNumber(e.amount)}{' '}
                                        <span className="text-[10px] font-normal">
                                            UZS
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex min-w-0 items-center justify-between gap-2 border-t border-gray-50 pt-1.5 text-xs text-gray-500 dark:border-gray-700/50 dark:text-gray-400">
                                <div className="min-w-0 flex-1 truncate">
                                    <span className="truncate">
                                        {e.cash_register?.name}
                                    </span>
                                    {e.user?.name && (
                                        <span className="text-[11px] text-gray-400">
                                            {' '}
                                            ({e.user.name})
                                        </span>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="font-mono text-[11px]">
                                        {formatDateTime(
                                            e.spent_at || e.expense_date,
                                        )}
                                    </span>
                                    <ReceiptButton
                                        url={expenseReceipt.url(e.id)}
                                    />
                                    {can('expenses.delete') && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onDeleteExpense(e)}
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
                links={expenses.links}
                total={expenses.total}
                from={expenses.from}
                to={expenses.to}
            />
        </div>
    );
}
