import { DollarSign, CreditCard, ShieldCheck, Building2, History, ArrowDownToLine } from 'lucide-react';
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

export function RegisterCardsGrid({ cashRegisters, onSelectHistory, onOpenSweep }: Props) {
    const { t } = useTranslation();
    const can = useCan();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full min-w-0">
            {cashRegisters.map((reg) => {
                const isSuperadmin = reg.branch_id === null || reg.branch_id === undefined;
                const canSweep = !isSuperadmin && Number(reg.balance) > 0;

                return (
                    <div
                        key={reg.id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col justify-between min-w-0"
                    >
                        <div className="min-w-0">
                            <div className="flex items-center justify-between gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <div className="flex items-center gap-1.5 truncate min-w-0">
                                    {reg.type?.code === 'cash' ? (
                                        <DollarSign className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    ) : (
                                        <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{reg.type?.name || 'Kassa'}</span>
                                </div>
                                {isSuperadmin ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shrink-0">
                                        <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                        {t('finance.superadmin_cash_register', 'Superadmin')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shrink-0">
                                        <Building2 className="w-3 h-3 text-gray-400" />
                                        {reg.branch?.name || t('branches.unknown', 'Filial')}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">{reg.name}</h3>
                            <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono break-all">
                                {formatNumber(reg.balance)} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">UZS</span>
                            </p>
                        </div>

                        {/* Card Footer Actions: Tarix and Bo'shatish */}
                        <div className={`mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 ${canSweep ? 'grid grid-cols-2 gap-2' : 'flex justify-end'}`}>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectHistory(reg.id)}
                                className="h-8 gap-1.5 text-xs justify-center"
                            >
                                <History className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{t('finance.view_history', 'Tarix')}</span>
                            </Button>

                            {canSweep && can('cash_transfers.create') && (
                                <Button
                                    type="button"
                                    variant="brand"
                                    size="sm"
                                    onClick={() => onOpenSweep(reg.id)}
                                    className="h-8 gap-1.5 text-xs justify-center"
                                >
                                    <ArrowDownToLine className="w-3.5 h-3.5" />
                                    <span>{t('finance.empty_this_register', 'Bo\'shatish')}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
