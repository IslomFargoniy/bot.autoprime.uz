import { router } from '@inertiajs/react';
import { History, Search, RotateCcw, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from '@/components/pagination';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import type { CashRegister, CashTransaction } from '../types';

interface Props {
    cashRegisters: CashRegister[];
    transactions: {
        data: CashTransaction[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    filters?: {
        branch_id?: string | number;
        per_page?: string;
        history_register_id?: string | number;
        history_category?: string;
        history_from?: string;
        history_to?: string;
    };
}

export function CashHistoryTab({
    cashRegisters,
    transactions,
    filters = {},
}: Props) {
    const { t } = useTranslation();

    const [historyRegId, setHistoryRegId] = useState<string | number>(
        filters.history_register_id || '',
    );
    const [historyCat, setHistoryCat] = useState<string>(
        filters.history_category || '',
    );
    const [historyFrom, setHistoryFrom] = useState<string>(
        filters.history_from || '',
    );
    const [historyTo, setHistoryTo] = useState<string>(
        filters.history_to || '',
    );
    const [perPage, setPerPage] = useState<string>(filters.per_page || '15');

    const handleFilterHistory = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/finance',
            {
                ...filters,
                history_register_id: historyRegId || undefined,
                history_category: historyCat || undefined,
                history_from: historyFrom || undefined,
                history_to: historyTo || undefined,
                per_page: perPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get(
            '/admin/finance',
            {
                ...filters,
                history_register_id: historyRegId || undefined,
                history_category: historyCat || undefined,
                history_from: historyFrom || undefined,
                history_to: historyTo || undefined,
                per_page: newPerPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleResetHistory = () => {
        setHistoryRegId('');
        setHistoryCat('');
        setHistoryFrom('');
        setHistoryTo('');
        router.get(
            '/admin/finance',
            {
                branch_id: filters.branch_id,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const renderCategoryBadge = (category: string) => {
        switch (category) {
            case 'payment':
                return (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        {t('finance.op_payment', "Kirim: To'lov")}
                    </span>
                );
            case 'expense':
                return (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                        {t('finance.op_expense', 'Chiqim: Xarajat')}
                    </span>
                );
            case 'salary':
                return (
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-950/80 dark:text-violet-300">
                        {t('finance.op_salary', 'Oylik maosh')}
                    </span>
                );
            case 'maintenance':
                return (
                    <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300">
                        {t('finance.op_maintenance', 'Avtotransport')}
                    </span>
                );
            case 'transfer_in':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                        {t('finance.op_transfer_in', 'Transfer (Kirim)')}
                    </span>
                );
            case 'transfer_out':
                return (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                        {t('finance.op_transfer_out', 'Transfer (Chiqim)')}
                    </span>
                );
            case 'sweep_out':
                return (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        {t(
                            'finance.op_sweep_out',
                            "Kassani bo'shatish (Chiqim)",
                        )}
                    </span>
                );
            case 'sweep_in':
                return (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        {t(
                            'finance.op_sweep_in',
                            "Kassa bo'shatishdan (Kirim)",
                        )}
                    </span>
                );
            case 'refund':
                return (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                        {t('finance.op_refund', 'Bekor qilish / Qaytarish')}
                    </span>
                );
            case 'initial':
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                        {t('finance.op_initial', "Boshlang'ich qoldiq")}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {category}
                    </span>
                );
        }
    };

    return (
        <div className="w-full max-w-full min-w-0 space-y-4">
            {/* Filters Bar */}
            <div className="w-full max-w-full overflow-hidden rounded-xl border bg-card p-3 shadow-xs sm:p-4">
                <form
                    onSubmit={handleFilterHistory}
                    className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center"
                >
                    <SearchableSelect
                        id="hist_reg"
                        value={historyRegId}
                        onChange={(val) => setHistoryRegId(val)}
                        options={[
                            {
                                value: '',
                                label: t(
                                    'finance.all_registers',
                                    'Barcha kassalar',
                                ),
                            },
                            ...cashRegisters.map((r) => ({
                                value: r.id,
                                label: r.name,
                                sublabel:
                                    r.branch?.name ||
                                    t(
                                        'finance.superadmin_cash_register',
                                        'Superadmin Bosh kassa',
                                    ),
                            })),
                        ]}
                        placeholder={t(
                            'finance.all_registers',
                            'Barcha kassalar',
                        )}
                        className="w-full lg:w-52"
                        triggerClassName="h-9 sm:h-10 text-xs sm:text-sm"
                    />

                    <SearchableSelect
                        id="hist_cat"
                        value={historyCat}
                        onChange={(val) => setHistoryCat(String(val))}
                        options={[
                            {
                                value: '',
                                label: t(
                                    'finance.all_categories',
                                    'Barcha amallar',
                                ),
                            },
                            {
                                value: 'payment',
                                label: t('finance.op_payment', "Kirim: To'lov"),
                            },
                            {
                                value: 'expense',
                                label: t(
                                    'finance.op_expense',
                                    'Chiqim: Xarajat',
                                ),
                            },
                            {
                                value: 'salary',
                                label: t('finance.op_salary', 'Oylik maosh'),
                            },
                            {
                                value: 'maintenance',
                                label: t(
                                    'finance.op_maintenance',
                                    'Avtotransport',
                                ),
                            },
                            {
                                value: 'sweep_out',
                                label: t(
                                    'finance.op_sweep_out',
                                    "Kassani bo'shatish (Chiqim)",
                                ),
                            },
                            {
                                value: 'sweep_in',
                                label: t(
                                    'finance.op_sweep_in',
                                    "Kassa bo'shatishdan (Kirim)",
                                ),
                            },
                            {
                                value: 'transfer_out',
                                label: t(
                                    'finance.op_transfer_out',
                                    'Transfer (Chiqim)',
                                ),
                            },
                            {
                                value: 'transfer_in',
                                label: t(
                                    'finance.op_transfer_in',
                                    'Transfer (Kirim)',
                                ),
                            },
                            {
                                value: 'refund',
                                label: t(
                                    'finance.op_refund',
                                    'Bekor qilish / Qaytarish',
                                ),
                            },
                        ]}
                        placeholder={t(
                            'finance.all_categories',
                            'Barcha amallar',
                        )}
                        className="w-full lg:w-48"
                        triggerClassName="h-9 sm:h-10 text-xs sm:text-sm"
                    />

                    <div className="grid w-full min-w-0 grid-cols-2 gap-2 lg:w-auto">
                        <DatePicker
                            id="hist_from"
                            value={historyFrom}
                            onChange={(val) => setHistoryFrom(val)}
                            placeholder={t('common.date_from', 'Dan')}
                            className="w-full lg:w-36"
                        />

                        <DatePicker
                            id="hist_to"
                            value={historyTo}
                            onChange={(val) => setHistoryTo(val)}
                            placeholder={t('common.date_to', 'Gacha')}
                            className="w-full lg:w-36"
                        />
                    </div>

                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-start">
                        <PerPageSelect
                            value={perPage}
                            onChange={handlePerPageChange}
                        />

                        <Button
                            type="submit"
                            variant="secondary"
                            className="h-9 flex-1 px-3 text-xs sm:h-10 sm:flex-initial sm:px-4 sm:text-sm"
                            title={t('common.filter', 'Filtrlash')}
                        >
                            <Search className="mr-1.5 h-4 w-4" />
                            <span>{t('common.filter', 'Filtrlash')}</span>
                        </Button>

                        {(historyRegId ||
                            historyCat ||
                            historyFrom ||
                            historyTo) && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetHistory}
                                className="h-9 px-3 text-xs sm:h-10 sm:text-sm"
                                title={t('common.reset', 'Tozalash')}
                            >
                                <RotateCcw className="mr-1.5 h-4 w-4 sm:mr-0" />
                                <span className="sm:hidden">
                                    {t('common.reset', 'Tozalash')}
                                </span>
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* Desktop Transactions Table with dedicated Horizontal Scrollbar */}
            <div className="hidden w-full max-w-full overflow-hidden md:block">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
                    <Table className="w-full min-w-[850px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">№</TableHead>
                                <TableHead>
                                    {t('finance.date', 'Sana va Vaqt')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.cash_register', 'Kassa')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.operation_type', 'Amal turi')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.amount', 'Summa')}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-900 dark:text-white">
                                    {t(
                                        'finance.balance_after',
                                        'Amaldan keyingi balans',
                                    )}
                                </TableHead>
                                <TableHead>
                                    {t('finance.description', 'Tavsif')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.user', 'Xodim')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={8}
                                    icon={
                                        <History className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    }
                                    title={t(
                                        'finance.no_transactions',
                                        'Kassa amallari tarixi topilmadi',
                                    )}
                                    description={t(
                                        'finance.no_transactions_desc',
                                        'Kassada kirim, chiqim yoki transfer amallari bajarilganda bu yerda aks etadi',
                                    )}
                                />
                            ) : (
                                transactions.data.map((tx, idx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="font-mono text-xs text-gray-400">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">
                                            {formatDateTime(tx.transacted_at)}
                                        </TableCell>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            <div>{tx.cash_register?.name}</div>
                                            {tx.cash_register?.branch && (
                                                <div className="text-[10px] text-gray-400">
                                                    {
                                                        tx.cash_register.branch
                                                            .name
                                                    }
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {renderCategoryBadge(tx.category)}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold whitespace-nowrap">
                                            {tx.type === 'in' ? (
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                    +{formatMoney(tx.amount)}
                                                </span>
                                            ) : (
                                                <span className="text-rose-600 dark:text-rose-400">
                                                    -{formatMoney(tx.amount)}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-gray-900 dark:border-gray-600 dark:bg-gray-700/80 dark:text-white">
                                                {formatMoney(tx.balance_after)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-xs text-gray-700 dark:text-gray-300">
                                            {tx.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {tx.user?.name || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile Transactions Card Feed */}
            <div className="w-full max-w-full min-w-0 space-y-3 md:hidden">
                {transactions.data.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                        <History className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t(
                                'finance.no_transactions',
                                'Kassa amallari tarixi topilmadi',
                            )}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            {t(
                                'finance.no_transactions_desc',
                                'Kassada kirim, chiqim yoki transfer amallari bajarilganda bu yerda aks etadi',
                            )}
                        </p>
                    </div>
                ) : (
                    transactions.data.map((tx) => (
                        <div
                            key={tx.id}
                            className="min-w-0 space-y-2.5 rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                                    {renderCategoryBadge(tx.category)}
                                    <span className="font-mono text-[11px] text-gray-400">
                                        {formatDateTime(tx.transacted_at)}
                                    </span>
                                </div>
                                <div className="shrink-0 text-right">
                                    {tx.type === 'in' ? (
                                        <span className="font-mono text-sm font-bold text-emerald-600 sm:text-base dark:text-emerald-400">
                                            +{formatNumber(tx.amount)}{' '}
                                            <span className="text-[10px] font-normal">
                                                UZS
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="font-mono text-sm font-bold text-rose-600 sm:text-base dark:text-rose-400">
                                            -{formatNumber(tx.amount)}{' '}
                                            <span className="text-[10px] font-normal">
                                                UZS
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex min-w-0 items-center justify-between gap-2 border-t border-gray-50 pt-1 text-xs dark:border-gray-700/50">
                                <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium text-gray-700 dark:text-gray-300">
                                    <Wallet className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                    <span className="truncate">
                                        {tx.cash_register?.name}
                                    </span>
                                    {tx.cash_register?.branch && (
                                        <span className="shrink-0 text-[10px] text-gray-400">
                                            ({tx.cash_register.branch.name})
                                        </span>
                                    )}
                                </div>
                                <div className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
                                    <span>
                                        {t('finance.balance_after', 'Balans')}
                                        :{' '}
                                    </span>
                                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                        {formatMoney(tx.balance_after)}
                                    </span>
                                </div>
                            </div>

                            {(tx.description || tx.user?.name) && (
                                <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-gray-50 p-2 text-[11px] text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">
                                    <span className="min-w-0 flex-1 truncate">
                                        {tx.description || '-'}
                                    </span>
                                    {tx.user?.name && (
                                        <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
                                            {tx.user.name}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <Pagination
                links={transactions.links}
                total={transactions.total}
                from={transactions.from}
                to={transactions.to}
            />
        </div>
    );
}
