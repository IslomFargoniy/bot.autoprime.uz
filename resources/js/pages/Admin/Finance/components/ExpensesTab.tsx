import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { ArrowUpRight, Trash2 } from 'lucide-react';
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
import PerPageSelect from '@/components/per-page-select';
import { useCan } from '@/hooks/use-can';
import { formatDateTime, formatNumber, formatMoney } from '@/lib/utils';
import type { Expense } from '../types';

interface Props {
    expenses: { data: Expense[]; links: any[]; total: number; current_page: number; last_page: number; from?: number; to?: number };
    onDeleteExpense: (expense: Expense) => void;
    filters?: {
        branch_id?: string | number;
        per_page?: string;
        [key: string]: any;
    };
}

export function ExpensesTab({ expenses, onDeleteExpense, filters = {} }: Props) {
    const { t } = useTranslation();
    const can = useCan();

    const handlePerPageChange = (newPerPage: string) => {
        router.get('/admin/finance', {
            ...filters,
            per_page: newPerPage,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-4 w-full max-w-full min-w-0">
            {/* Top Toolbar */}
            <div className="flex justify-end">
                <PerPageSelect value={filters?.per_page || '15'} onChange={handlePerPageChange} />
            </div>

            {/* Desktop & Tablet Table with dedicated Horizontal Scrollbar */}
            <div className="hidden md:block w-full max-w-full overflow-hidden">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                    <Table className="w-full min-w-[800px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.category', 'Kategoriya')}</TableHead>
                                <TableHead>{t('finance.description', 'Tavsif')}</TableHead>
                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                <TableHead>{t('finance.register', 'Kassa')}</TableHead>
                                <TableHead>{t('finance.user', 'Xodim')}</TableHead>
                                <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={7}
                                    icon={<ArrowUpRight className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_expenses', 'Xarajatlar topilmadi')}
                                />
                            ) : (
                                expenses.data.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-medium whitespace-nowrap">{e.category?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-700 dark:text-gray-300">{e.description}</TableCell>
                                        <TableCell className="font-bold text-red-500 dark:text-red-400 font-mono whitespace-nowrap">
                                            -{formatMoney(e.amount)}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{e.cash_register?.name}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{e.user?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500 whitespace-nowrap font-mono text-xs">{formatDateTime(e.spent_at || e.expense_date)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            {can('expenses.delete') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onDeleteExpense(e)}
                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    title={t('common.delete', "O'chirish")}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
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
            <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
                {expenses.data.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <ArrowUpRight className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_expenses', 'Xarajatlar topilmadi')}</p>
                    </div>
                ) : (
                    expenses.data.map((e) => (
                        <div
                            key={e.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5 min-w-0"
                        >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                                        {e.category?.name || '-'}
                                    </span>
                                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-1 break-words">{e.description}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="font-mono font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400">
                                        -{formatNumber(e.amount)} <span className="text-[10px] font-normal">UZS</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 gap-2 min-w-0">
                                <div className="truncate min-w-0 flex-1">
                                    <span className="truncate">{e.cash_register?.name}</span>
                                    {e.user?.name && <span className="text-[11px] text-gray-400"> ({e.user.name})</span>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] font-mono">{formatDateTime(e.spent_at || e.expense_date)}</span>
                                    {can('expenses.delete') && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onDeleteExpense(e)}
                                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            title={t('common.delete', "O'chirish")}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
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
