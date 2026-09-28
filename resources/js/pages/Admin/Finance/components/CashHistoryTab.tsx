import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { History, Search, RotateCcw, Wallet } from 'lucide-react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import Pagination from '@/components/pagination';
import { formatDateTime, formatNumber, formatMoney } from '@/lib/utils';
import type { CashRegister, CashTransaction } from '../types';

interface Props {
    cashRegisters: CashRegister[];
    transactions: { data: CashTransaction[]; links: any[]; total: number; current_page: number; last_page: number };
    filters?: {
        branch_id?: string | number;
        history_register_id?: string | number;
        history_category?: string;
        history_from?: string;
        history_to?: string;
    };
}

export function CashHistoryTab({ cashRegisters, transactions, filters = {} }: Props) {
    const { t } = useTranslation();

    const [historyRegId, setHistoryRegId] = useState<string | number>(filters.history_register_id || '');
    const [historyCat, setHistoryCat] = useState<string>(filters.history_category || '');
    const [historyFrom, setHistoryFrom] = useState<string>(filters.history_from || '');
    const [historyTo, setHistoryTo] = useState<string>(filters.history_to || '');

    const handleFilterHistory = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/finance', {
            ...filters,
            history_register_id: historyRegId || undefined,
            history_category: historyCat || undefined,
            history_from: historyFrom || undefined,
            history_to: historyTo || undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleResetHistory = () => {
        setHistoryRegId('');
        setHistoryCat('');
        setHistoryFrom('');
        setHistoryTo('');
        router.get('/admin/finance', {
            branch_id: filters.branch_id,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const renderCategoryBadge = (category: string) => {
        switch (category) {
            case 'payment':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        {t('finance.op_payment', 'Kirim: To\'lov')}
                    </span>
                );
            case 'expense':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
                        {t('finance.op_expense', 'Chiqim: Xarajat')}
                    </span>
                );
            case 'salary':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300">
                        {t('finance.op_salary', 'Oylik maosh')}
                    </span>
                );
            case 'maintenance':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300">
                        {t('finance.op_maintenance', 'Avtotransport')}
                    </span>
                );
            case 'transfer_in':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                        {t('finance.op_transfer_in', 'Transfer (Kirim)')}
                    </span>
                );
            case 'transfer_out':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">
                        {t('finance.op_transfer_out', 'Transfer (Chiqim)')}
                    </span>
                );
            case 'sweep_out':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                        {t('finance.op_sweep_out', 'Kassani bo\'shatish (Chiqim)')}
                    </span>
                );
            case 'sweep_in':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        {t('finance.op_sweep_in', 'Kassa bo\'shatishdan (Kirim)')}
                    </span>
                );
            case 'refund':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                        {t('finance.op_refund', 'Bekor qilish / Qaytarish')}
                    </span>
                );
            case 'initial':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                        {t('finance.op_initial', 'Boshlang\'ich qoldiq')}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {category}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-4 w-full max-w-full min-w-0">
            {/* Filters Bar */}
            <div className="bg-card border rounded-xl p-3 sm:p-4 shadow-xs w-full max-w-full overflow-hidden">
                <form onSubmit={handleFilterHistory} className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center gap-2.5 min-w-0">
                    <SearchableSelect
                        id="hist_reg"
                        value={historyRegId}
                        onChange={(val) => setHistoryRegId(val)}
                        options={[
                            { value: '', label: t('finance.all_registers', 'Barcha kassalar') },
                            ...cashRegisters.map((r) => ({
                                value: r.id,
                                label: r.name,
                                sublabel: r.branch?.name || t('finance.superadmin_cash_register', 'Superadmin Bosh kassa'),
                            })),
                        ]}
                        placeholder={t('finance.all_registers', 'Barcha kassalar')}
                        className="w-full lg:w-52"
                        triggerClassName="h-9 sm:h-10 text-xs sm:text-sm"
                    />

                    <SearchableSelect
                        id="hist_cat"
                        value={historyCat}
                        onChange={(val) => setHistoryCat(String(val))}
                        options={[
                            { value: '', label: t('finance.all_categories', 'Barcha amallar') },
                            { value: 'payment', label: t('finance.op_payment', 'Kirim: To\'lov') },
                            { value: 'expense', label: t('finance.op_expense', 'Chiqim: Xarajat') },
                            { value: 'salary', label: t('finance.op_salary', 'Oylik maosh') },
                            { value: 'maintenance', label: t('finance.op_maintenance', 'Avtotransport') },
                            { value: 'sweep_out', label: t('finance.op_sweep_out', 'Kassani bo\'shatish (Chiqim)') },
                            { value: 'sweep_in', label: t('finance.op_sweep_in', 'Kassa bo\'shatishdan (Kirim)') },
                            { value: 'transfer_out', label: t('finance.op_transfer_out', 'Transfer (Chiqim)') },
                            { value: 'transfer_in', label: t('finance.op_transfer_in', 'Transfer (Kirim)') },
                            { value: 'refund', label: t('finance.op_refund', 'Bekor qilish / Qaytarish') },
                        ]}
                        placeholder={t('finance.all_categories', 'Barcha amallar')}
                        className="w-full lg:w-48"
                        triggerClassName="h-9 sm:h-10 text-xs sm:text-sm"
                    />

                    <div className="grid grid-cols-2 gap-2 w-full lg:w-auto min-w-0">
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

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                        <Button type="submit" variant="secondary" className="flex-1 sm:flex-initial h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm" title={t('common.filter', 'Filtrlash')}>
                            <Search className="w-4 h-4 mr-1.5" />
                            <span>{t('common.filter', 'Filtrlash')}</span>
                        </Button>

                        {(historyRegId || historyCat || historyFrom || historyTo) && (
                            <Button type="button" variant="outline" onClick={handleResetHistory} className="h-9 sm:h-10 px-3 text-xs sm:text-sm" title={t('common.reset', 'Tozalash')}>
                                <RotateCcw className="w-4 h-4 mr-1.5 sm:mr-0" />
                                <span className="sm:hidden">{t('common.reset', 'Tozalash')}</span>
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* Desktop Transactions Table with dedicated Horizontal Scrollbar */}
            <div className="hidden md:block w-full max-w-full overflow-hidden">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                    <Table className="w-full min-w-[850px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">№</TableHead>
                                <TableHead>{t('finance.date', 'Sana va Vaqt')}</TableHead>
                                <TableHead>{t('finance.cash_register', 'Kassa')}</TableHead>
                                <TableHead>{t('finance.operation_type', 'Amal turi')}</TableHead>
                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                <TableHead className="font-semibold text-gray-900 dark:text-white">
                                    {t('finance.balance_after', 'Amaldan keyingi balans')}
                                </TableHead>
                                <TableHead>{t('finance.description', 'Tavsif')}</TableHead>
                                <TableHead>{t('finance.user', 'Xodim')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={8}
                                    icon={<History className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_transactions', 'Kassa amallari tarixi topilmadi')}
                                    description={t('finance.no_transactions_desc', 'Kassada kirim, chiqim yoki transfer amallari bajarilganda bu yerda aks etadi')}
                                />
                            ) : (
                                transactions.data.map((tx, idx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-gray-400 font-mono text-xs">{idx + 1}</TableCell>
                                        <TableCell className="text-gray-600 dark:text-gray-300 font-mono text-xs whitespace-nowrap">
                                            {formatDateTime(tx.transacted_at)}
                                        </TableCell>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            <div>{tx.cash_register?.name}</div>
                                            {tx.cash_register?.branch && (
                                                <div className="text-[10px] text-gray-400">{tx.cash_register.branch.name}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {renderCategoryBadge(tx.category)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-mono font-bold">
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
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-gray-100 dark:bg-gray-700/80 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                                                {formatMoney(tx.balance_after)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-700 dark:text-gray-300 text-xs max-w-xs truncate">
                                            {tx.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
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
            <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
                {transactions.data.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <History className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_transactions', 'Kassa amallari tarixi topilmadi')}</p>
                        <p className="text-xs text-gray-400 mt-1">{t('finance.no_transactions_desc', 'Kassada kirim, chiqim yoki transfer amallari bajarilganda bu yerda aks etadi')}</p>
                    </div>
                ) : (
                    transactions.data.map((tx) => (
                        <div
                            key={tx.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5 min-w-0"
                        >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                                    {renderCategoryBadge(tx.category)}
                                    <span className="text-[11px] text-gray-400 font-mono">
                                        {formatDateTime(tx.transacted_at)}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    {tx.type === 'in' ? (
                                        <span className="font-mono font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                                            +{formatNumber(tx.amount)} <span className="text-[10px] font-normal">UZS</span>
                                        </span>
                                    ) : (
                                        <span className="font-mono font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400">
                                            -{formatNumber(tx.amount)} <span className="text-[10px] font-normal">UZS</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50 dark:border-gray-700/50 gap-2 min-w-0">
                                <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium truncate min-w-0 flex-1">
                                    <Wallet className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span className="truncate">{tx.cash_register?.name}</span>
                                    {tx.cash_register?.branch && (
                                        <span className="text-[10px] text-gray-400 shrink-0">({tx.cash_register.branch.name})</span>
                                    )}
                                </div>
                                <div className="text-[11px] shrink-0 text-gray-500 dark:text-gray-400">
                                    <span>{t('finance.balance_after', 'Balans')}: </span>
                                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                        {formatMoney(tx.balance_after)}
                                    </span>
                                </div>
                            </div>

                            {(tx.description || tx.user?.name) && (
                                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 p-2 rounded-lg gap-2 min-w-0">
                                    <span className="truncate min-w-0 flex-1">{tx.description || '-'}</span>
                                    {tx.user?.name && <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">{tx.user.name}</span>}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <Pagination links={transactions.links} />
        </div>
    );
}
