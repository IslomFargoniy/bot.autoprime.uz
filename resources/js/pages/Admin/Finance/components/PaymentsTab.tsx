import { router } from '@inertiajs/react';
import { ArrowDownRight, Trash2 } from 'lucide-react';
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
import { useCan } from '@/hooks/use-can';
import { formatDateTime, formatNumber, formatMoney } from '@/lib/utils';
import type { Payment } from '../types';

interface Props {
    payments: { data: Payment[]; links: any[]; total: number; current_page: number; last_page: number; from?: number; to?: number };
    onDeletePayment: (payment: Payment) => void;
    filters?: {
        branch_id?: string | number;
        per_page?: string;
        [key: string]: any;
    };
}

export function PaymentsTab({ payments, onDeletePayment, filters = {} }: Props) {
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
        <div className="space-y-4 w-full max-w-full min-w-0">
            {/* Top Toolbar */}
            <PageFilterBar>
                <div className="flex-1" />
                <PerPageSelect value={filters?.per_page || '15'} onChange={handlePerPageChange} />
            </PageFilterBar>

            {/* Desktop & Tablet Table with dedicated Horizontal Scrollbar */}
            <div className="hidden md:block w-full max-w-full overflow-hidden">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                    <Table className="w-full min-w-[850px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.receipt', 'Chek №')}</TableHead>
                                <TableHead>{t('finance.student', 'Talaba')}</TableHead>
                                <TableHead>{t('finance.contract', 'Shartnoma')}</TableHead>
                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                <TableHead>{t('finance.method', 'Usul')}</TableHead>
                                <TableHead>{t('finance.register', 'Kassa')}</TableHead>
                                <TableHead>{t('finance.receiver', 'Qabul qildi')}</TableHead>
                                <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={9}
                                    icon={<ArrowDownRight className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_payments', 'To\'lovlar topilmadi')}
                                />
                            ) : (
                                payments.data.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-mono font-medium whitespace-nowrap">{p.receipt_number}</TableCell>
                                        <TableCell className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            {p.student?.full_name}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {p.contract?.contract_number ? `#${p.contract.contract_number}` : '-'}
                                        </TableCell>
                                        <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                                            +{formatMoney(p.amount)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                {getMethodLabel(p.payment_method)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.cash_register?.name}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.received_by?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500 whitespace-nowrap font-mono text-xs">{formatDateTime(p.paid_at)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            {can('payments.edit') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onDeletePayment(p)}
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

            {/* Mobile Payments Card Feed */}
            <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
                {payments.data.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <ArrowDownRight className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_payments', 'To\'lovlar topilmadi')}</p>
                    </div>
                ) : (
                    payments.data.map((p) => (
                        <div
                            key={p.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5 min-w-0"
                        >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{p.student?.full_name || '-'}</div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate">
                                        <span>#{p.receipt_number}</span>
                                        {p.contract?.contract_number && (
                                            <>
                                                <span>•</span>
                                                <span>#{p.contract.contract_number}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="font-mono font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                                        +{formatNumber(p.amount)} <span className="text-[10px] font-normal">UZS</span>
                                    </div>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mt-0.5">
                                        {getMethodLabel(p.payment_method)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 gap-2 min-w-0">
                                <div className="truncate min-w-0 flex-1">
                                    <span className="truncate">{p.cash_register?.name}</span>
                                    {p.received_by?.name && <span className="text-[11px] text-gray-400"> ({p.received_by.name})</span>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] font-mono">{formatDateTime(p.paid_at)}</span>
                                    {can('payments.edit') && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onDeletePayment(p)}
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
                links={payments.links}
                total={payments.total}
                from={payments.from}
                to={payments.to}
            />
        </div>
    );
}
