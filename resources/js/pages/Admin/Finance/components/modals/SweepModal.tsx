import { ArrowDownToLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { formatMoney } from '@/lib/utils';
import type { SweepItem } from '../../types';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sweepItems: SweepItem[];
    setSweepItems: (items: SweepItem[]) => void;
    sweepNotes: string;
    setSweepNotes: (notes: string) => void;
    isSweeping: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export function SweepModal({
    open,
    onOpenChange,
    sweepItems,
    setSweepItems,
    sweepNotes,
    setSweepNotes,
    isSweeping,
    onSubmit,
}: Props) {
    const { t } = useTranslation();

    const totalSweepAmount = sweepItems
        .filter((i) => i.selected)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ArrowDownToLine className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                            {t(
                                'finance.sweep_title',
                                "Kassalarni bo'shatish va Superadminga o'tkazish",
                            )}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                    {t(
                        'finance.sweep_desc',
                        "Filiallardagi kassalarning mablag'lari o'z turiga mos Superadmin kassasiga to'liq yoki qisman transfer qilinadi. Transfer yuborilgach, Superadmin tomonidan tasdiqlanishi yoki rad etilishi mumkin.",
                    )}
                </div>

                <form onSubmit={onSubmit} className="space-y-4 text-xs">
                    <div className="max-h-72 divide-y overflow-y-auto rounded-xl border dark:divide-gray-700">
                        {sweepItems.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                {t(
                                    'finance.no_registers_to_sweep',
                                    "Bo'shatish uchun filial kassalari topilmadi",
                                )}
                            </div>
                        ) : (
                            sweepItems.map((item, idx) => (
                                <div
                                    key={item.cash_register_id}
                                    className={`flex flex-col justify-between gap-2.5 rounded-lg p-3 transition-colors sm:flex-row sm:items-center sm:gap-3 ${
                                        item.selected
                                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                            : 'bg-white dark:bg-gray-800'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5 sm:items-center">
                                        <input
                                            type="checkbox"
                                            id={`sweep_item_${item.cash_register_id}`}
                                            checked={item.selected}
                                            onChange={(e) => {
                                                const updated = [...sweepItems];
                                                updated[idx].selected =
                                                    e.target.checked;
                                                setSweepItems(updated);
                                            }}
                                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-amber-600 focus:ring-amber-500 sm:mt-0"
                                        />
                                        <div>
                                            <label
                                                htmlFor={`sweep_item_${item.cash_register_id}`}
                                                className="block cursor-pointer text-xs font-semibold text-gray-900 sm:text-sm dark:text-white"
                                            >
                                                {item.name}
                                            </label>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                                <span>{item.branch_name}</span>
                                                <span>•</span>
                                                <span className="font-medium text-amber-700 dark:text-amber-400">
                                                    {t(
                                                        'finance.target_superadmin_register',
                                                        'Qabul qiluvchi',
                                                    )}
                                                    : {item.target_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pl-6 sm:justify-end sm:pl-0">
                                        <div className="text-[11px] text-gray-500 sm:text-right dark:text-gray-400">
                                            <span className="sm:hidden">
                                                {t('finance.balance', 'Balans')}
                                                :{' '}
                                            </span>
                                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                                                {formatMoney(item.balance)}
                                            </span>
                                        </div>
                                        {item.selected && (
                                            <MoneyInput
                                                value={item.amount}
                                                onChange={(val) => {
                                                    const updated = [
                                                        ...sweepItems,
                                                    ];
                                                    updated[idx].amount =
                                                        Number(val);
                                                    setSweepItems(updated);
                                                }}
                                                className="h-8 w-32 text-right font-mono text-xs font-bold sm:w-36"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div>
                        <Label htmlFor="sweep_notes">
                            {t('finance.notes', 'Izoh')}
                        </Label>
                        <Input
                            id="sweep_notes"
                            value={sweepNotes}
                            onChange={(e) => setSweepNotes(e.target.value)}
                            placeholder={t(
                                'finance.sweep_notes_placeholder',
                                "Masalan: Hafta yakuni bo'yicha tushumlarni topshirish...",
                            )}
                            className="mt-1"
                        />
                    </div>

                    <div className="flex flex-col justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t(
                                    'finance.sweep_total',
                                    "Jami o'tkazilayotgan mablag'",
                                )}
                                :
                            </span>
                            <div className="font-mono text-base font-extrabold text-amber-600 sm:text-lg dark:text-amber-400">
                                {formatMoney(totalSweepAmount)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={isSweeping || totalSweepAmount <= 0}
                            >
                                <ArrowDownToLine className="mr-1.5 h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {t(
                                        'finance.confirm_sweep',
                                        "Bo'shatish va o'tkazish",
                                    )}
                                </span>
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
