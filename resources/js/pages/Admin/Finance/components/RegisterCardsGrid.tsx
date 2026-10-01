import {
    DollarSign,
    CreditCard,
    ShieldCheck,
    Building2,
    History,
    ArrowDownToLine,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { formatNumber } from '@/lib/utils';
import type { CashRegister } from '../types';

interface Props {
    cashRegisters: CashRegister[];
    onSelectHistory: (registerId: number) => void;
    onOpenSweep: (registerId?: number) => void;
}

export function RegisterCardsGrid({
    cashRegisters,
    onSelectHistory,
    onOpenSweep,
}: Props) {
    const { t } = useTranslation();
    const can = useCan();

    return (
        <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {cashRegisters.map((reg) => {
                const isSuperadmin =
                    reg.branch_id === null || reg.branch_id === undefined;
                const canSweep = !isSuperadmin && Number(reg.balance) > 0;

                return (
                    <div
                        key={reg.id}
                        className="flex min-w-0 flex-col justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-xs sm:p-5 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center justify-between gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex min-w-0 items-center gap-1.5 truncate">
                                    {reg.type?.code === 'cash' ? (
                                        <DollarSign className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                    ) : (
                                        <CreditCard className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                    )}
                                    <span className="truncate font-medium">
                                        {reg.type?.name || 'Kassa'}
                                    </span>
                                </div>
                                {isSuperadmin ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                        {t(
                                            'finance.superadmin_cash_register',
                                            'Superadmin',
                                        )}
                                    </span>
                                ) : (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                        <Building2 className="h-3 w-3 text-gray-400" />
                                        {reg.branch?.name ||
                                            t('branches.unknown', 'Filial')}
                                    </span>
                                )}
                            </div>
                            <h3 className="truncate text-sm font-bold text-gray-900 sm:text-base dark:text-white">
                                {reg.name}
                            </h3>
                            <p className="mt-1 font-mono text-lg font-extrabold break-all text-emerald-600 sm:text-xl dark:text-emerald-400">
                                {formatNumber(reg.balance)}{' '}
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                                    UZS
                                </span>
                            </p>
                        </div>

                        {/* Card Footer Actions: Tarix and Bo'shatish */}
                        <div
                            className={`mt-4 border-t border-gray-100 pt-3 dark:border-gray-700/60 ${canSweep ? 'grid grid-cols-2 gap-2' : 'flex justify-end'}`}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectHistory(reg.id)}
                                className="h-8 justify-center gap-1.5 text-xs"
                            >
                                <History className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>
                                    {t('finance.view_history', 'Tarix')}
                                </span>
                            </Button>

                            {canSweep && can('cash_transfers.create') && (
                                <Button
                                    type="button"
                                    variant="brand"
                                    size="sm"
                                    onClick={() => onOpenSweep(reg.id)}
                                    className="h-8 justify-center gap-1.5 text-xs"
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
            })}
        </div>
    );
}
