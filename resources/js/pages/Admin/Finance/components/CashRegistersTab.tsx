import {
    Wallet,
    ShieldCheck,
    Building2,
    History,
    ArrowDownToLine,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { formatMoney } from '@/lib/utils';
import type { CashRegister } from '../types';

interface Props {
    cashRegisters: CashRegister[];
    onSelectHistory: (registerId: number) => void;
    onOpenSweep: (registerId?: number) => void;
}

export function CashRegistersTab({
    cashRegisters,
    onSelectHistory,
    onOpenSweep,
}: Props) {
    const { t } = useTranslation();
    const can = useCan();

    return (
        <div className="w-full max-w-full min-w-0 space-y-4">
            {/* Desktop Table with dedicated Horizontal Scrollbar */}
            <div className="hidden w-full max-w-full overflow-hidden md:block">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
                    <Table className="w-full min-w-[700px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {t('finance.register_name', 'Kassa Nomi')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.type', 'Turi')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.branch', 'Filial')}
                                </TableHead>
                                <TableHead>
                                    {t('finance.balance', 'Balans')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('common.actions', 'Amallar')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cashRegisters.length === 0 ? (
                                <TableEmpty
                                    colSpan={5}
                                    icon={
                                        <Wallet className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    }
                                    title={t(
                                        'finance.no_registers',
                                        'Kassalar topilmadi',
                                    )}
                                />
                            ) : (
                                cashRegisters.map((reg) => {
                                    const isSuperadmin =
                                        reg.branch_id === null ||
                                        reg.branch_id === undefined;
                                    const canSweep =
                                        !isSuperadmin &&
                                        Number(reg.balance) > 0;

                                    return (
                                        <TableRow key={reg.id}>
                                            <TableCell className="flex items-center gap-2 font-semibold whitespace-nowrap text-gray-900 dark:text-white">
                                                <Wallet className="h-4 w-4 shrink-0 text-emerald-600" />
                                                <span>{reg.name}</span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    {reg.type?.name || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {isSuperadmin ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                                                        {t(
                                                            'finance.superadmin_cash_register',
                                                            'Superadmin Bosh kassa',
                                                        )}
                                                    </span>
                                                ) : (
                                                    reg.branch?.name || '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono font-extrabold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                {formatMoney(reg.balance)}
                                            </TableCell>
                                            <TableCell className="space-x-2 text-right whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onSelectHistory(reg.id)
                                                    }
                                                    className="h-8 gap-1 text-xs"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                    {t(
                                                        'finance.view_history',
                                                        'Tarix',
                                                    )}
                                                </Button>
                                                {canSweep &&
                                                    can(
                                                        'cash_transfers.create',
                                                    ) && (
                                                        <Button
                                                            size="sm"
                                                            variant="brand"
                                                            onClick={() =>
                                                                onOpenSweep(
                                                                    reg.id,
                                                                )
                                                            }
                                                            className="h-8 gap-1 text-xs"
                                                        >
                                                            <ArrowDownToLine className="h-3.5 w-3.5" />
                                                            {t(
                                                                'finance.empty_this_register',
                                                                "Bo'shatish",
                                                            )}
                                                        </Button>
                                                    )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile Registers Card Feed */}
            <div className="w-full max-w-full min-w-0 space-y-3 md:hidden">
                {cashRegisters.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                        <Wallet className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('finance.no_registers', 'Kassalar topilmadi')}
                        </p>
                    </div>
                ) : (
                    cashRegisters.map((reg) => {
                        const isSuperadmin =
                            reg.branch_id === null ||
                            reg.branch_id === undefined;
                        const canSweep =
                            !isSuperadmin && Number(reg.balance) > 0;

                        return (
                            <div
                                key={reg.id}
                                className="min-w-0 space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                {reg.type?.name || '-'}
                                            </span>
                                            {isSuperadmin ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
                                                    <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                                    {t(
                                                        'finance.superadmin_cash_register',
                                                        'Superadmin',
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">
                                                    <Building2 className="h-3 w-3 text-gray-400" />
                                                    {reg.branch?.name ||
                                                        t(
                                                            'branches.unknown',
                                                            'Filial',
                                                        )}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="flex items-center gap-1.5 truncate text-sm font-bold text-gray-900 sm:text-base dark:text-white">
                                            <Wallet className="h-4 w-4 shrink-0 text-emerald-600" />
                                            <span className="truncate">
                                                {reg.name}
                                            </span>
                                        </h4>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="block text-[10px] text-gray-400">
                                            {t('finance.balance', 'Balans')}
                                        </span>
                                        <span className="font-mono text-sm font-extrabold text-emerald-600 sm:text-base dark:text-emerald-400">
                                            {formatMoney(reg.balance)}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className={`border-t border-gray-100 pt-2.5 dark:border-gray-700/50 ${canSweep && can('cash_transfers.create') ? 'grid grid-cols-2 gap-2' : 'flex justify-end'}`}
                                >
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onSelectHistory(reg.id)}
                                        className="h-8 justify-center gap-1 text-xs"
                                    >
                                        <History className="h-3.5 w-3.5" />
                                        <span>
                                            {t('finance.view_history', 'Tarix')}
                                        </span>
                                    </Button>
                                    {canSweep &&
                                        can('cash_transfers.create') && (
                                            <Button
                                                size="sm"
                                                variant="brand"
                                                onClick={() =>
                                                    onOpenSweep(reg.id)
                                                }
                                                className="h-8 justify-center gap-1 text-xs"
                                            >
                                                <ArrowDownToLine className="h-3.5 w-3.5" />
                                                <span>
                                                    {t(
                                                        'finance.empty_this_register',
                                                        "Bo'shatish",
                                                    )}
                                                </span>
                                            </Button>
                                        )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
