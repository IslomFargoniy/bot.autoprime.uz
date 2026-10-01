import { Wallet, ShieldCheck, Building2, History, ArrowDownToLine } from 'lucide-react';
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

export function CashRegistersTab({ cashRegisters, onSelectHistory, onOpenSweep }: Props) {
    const { t } = useTranslation();
    const can = useCan();

    return (
        <div className="space-y-4 w-full max-w-full min-w-0">
            {/* Desktop Table with dedicated Horizontal Scrollbar */}
            <div className="hidden md:block w-full max-w-full overflow-hidden">
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                    <Table className="w-full min-w-[700px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.register_name', 'Kassa Nomi')}</TableHead>
                                <TableHead>{t('finance.type', 'Turi')}</TableHead>
                                <TableHead>{t('finance.branch', 'Filial')}</TableHead>
                                <TableHead>{t('finance.balance', 'Balans')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cashRegisters.length === 0 ? (
                                <TableEmpty
                                    colSpan={5}
                                    icon={<Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_registers', 'Kassalar topilmadi')}
                                />
                            ) : (
                                cashRegisters.map((reg) => {
                                    const isSuperadmin = reg.branch_id === null || reg.branch_id === undefined;
                                    const canSweep = !isSuperadmin && Number(reg.balance) > 0;

                                    return (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                                                <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span>{reg.name}</span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                                    {reg.type?.name || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {isSuperadmin ? (
                                                    <span className="inline-flex items-center gap-1 font-semibold text-xs text-indigo-600 dark:text-indigo-400">
                                                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                                        {t('finance.superadmin_cash_register', 'Superadmin Bosh kassa')}
                                                    </span>
                                                ) : (
                                                    reg.branch?.name || '-'
                                                )}
                                            </TableCell>
                                            <TableCell className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                                                {formatMoney(reg.balance)}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onSelectHistory(reg.id)}
                                                    className="h-8 gap-1 text-xs"
                                                >
                                                    <History className="w-3.5 h-3.5" />
                                                    {t('finance.view_history', 'Tarix')}
                                                </Button>
                                                {canSweep && can('cash_transfers.create') && (
                                                    <Button
                                                        size="sm"
                                                        variant="brand"
                                                        onClick={() => onOpenSweep(reg.id)}
                                                        className="h-8 gap-1 text-xs"
                                                    >
                                                        <ArrowDownToLine className="w-3.5 h-3.5" />
                                                        {t('finance.empty_this_register', 'Bo\'shatish')}
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
            <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
                {cashRegisters.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_registers', 'Kassalar topilmadi')}</p>
                    </div>
                ) : (
                    cashRegisters.map((reg) => {
                        const isSuperadmin = reg.branch_id === null || reg.branch_id === undefined;
                        const canSweep = !isSuperadmin && Number(reg.balance) > 0;

                        return (
                            <div
                                key={reg.id}
                                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-xs space-y-3 min-w-0"
                            >
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                                {reg.type?.name || '-'}
                                            </span>
                                            {isSuperadmin ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                                                    <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                    {t('finance.superadmin_cash_register', 'Superadmin')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40">
                                                    <Building2 className="w-3 h-3 text-gray-400" />
                                                    {reg.branch?.name || t('branches.unknown', 'Filial')}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                                            <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span className="truncate">{reg.name}</span>
                                        </h4>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[10px] text-gray-400 block">{t('finance.balance', 'Balans')}</span>
                                        <span className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 font-mono">
                                            {formatMoney(reg.balance)}
                                        </span>
                                    </div>
                                </div>

                                <div className={`pt-2.5 border-t border-gray-100 dark:border-gray-700/50 ${canSweep && can('cash_transfers.create') ? 'grid grid-cols-2 gap-2' : 'flex justify-end'}`}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onSelectHistory(reg.id)}
                                        className="h-8 gap-1 text-xs justify-center"
                                    >
                                        <History className="w-3.5 h-3.5" />
                                        <span>{t('finance.view_history', 'Tarix')}</span>
                                    </Button>
                                    {canSweep && can('cash_transfers.create') && (
                                        <Button
                                            size="sm"
                                            variant="brand"
                                            onClick={() => onOpenSweep(reg.id)}
                                            className="h-8 gap-1 text-xs justify-center"
                                        >
                                            <ArrowDownToLine className="w-3.5 h-3.5" />
                                            <span>{t('finance.empty_this_register', 'Bo\'shatish')}</span>
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
