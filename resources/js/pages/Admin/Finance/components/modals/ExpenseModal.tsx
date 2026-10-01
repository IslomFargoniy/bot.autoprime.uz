import { ArrowUpRight } from 'lucide-react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatMoney } from '@/lib/utils';
import type { CashRegister } from '../../types';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expenseForm: any;
    cashRegisters: CashRegister[];
    expenseCategories: Array<{ id: number; name: string }>;
    onSubmit: (e: React.FormEvent) => void;
}

export function ExpenseModal({
    open,
    onOpenChange,
    expenseForm,
    cashRegisters,
    expenseCategories,
    onSubmit,
}: Props) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ArrowUpRight className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <span>
                            {t(
                                'finance.add_expense_title',
                                'Yangi Xarajat (Chiqim)',
                            )}
                        </span>
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label required htmlFor="exp_register_id">
                                {t('finance.register', 'Chiqim Kassasi')}
                            </Label>
                            <SearchableSelect
                                id="exp_register_id"
                                value={expenseForm.data.cash_register_id}
                                onChange={(val) =>
                                    expenseForm.setData('cash_register_id', val)
                                }
                                options={cashRegisters.map((r) => ({
                                    value: r.id,
                                    label: r.name,
                                    sublabel: formatMoney(r.balance),
                                }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label required htmlFor="exp_category_id">
                                {t('finance.category', 'Kategoriya')}
                            </Label>
                            <SearchableSelect
                                id="exp_category_id"
                                value={expenseForm.data.expense_category_id}
                                onChange={(val) =>
                                    expenseForm.setData(
                                        'expense_category_id',
                                        val,
                                    )
                                }
                                options={expenseCategories.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                }))}
                                placeholder={t(
                                    'finance.category',
                                    'Kategoriya',
                                )}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label required htmlFor="exp_amount">
                            {t('finance.amount', 'Summa (UZS)')}
                        </Label>
                        <MoneyInput
                            id="exp_amount"
                            value={expenseForm.data.amount}
                            onChange={(val) =>
                                expenseForm.setData('amount', val)
                            }
                            placeholder="500 000"
                            suffix="UZS"
                            required
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label required htmlFor="exp_desc">
                            {t('finance.description', 'Xarajat Tavsifi')}
                        </Label>
                        <Input
                            id="exp_desc"
                            value={expenseForm.data.description}
                            onChange={(e) =>
                                expenseForm.setData(
                                    'description',
                                    e.target.value,
                                )
                            }
                            required
                            className="mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
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
                            disabled={expenseForm.processing}
                        >
                            {t('common.save', 'Saqlash')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
