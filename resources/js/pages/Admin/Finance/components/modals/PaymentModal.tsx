import { ArrowDownRight } from 'lucide-react';
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
import { moneyDigits } from '@/lib/input-masks';
import { formatMoney } from '@/lib/utils';
import type { CashRegister } from '../../types';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paymentForm: any;
    cashRegisters: CashRegister[];
    contracts: Array<{
        id: number;
        student_id: number;
        contract_number: string;
        final_amount: number | string;
        paid_amount: number | string;
        debt_amount: number | string;
    }>;
    students: Array<{ id: number; full_name: string; phone: string }>;
    onSubmit: (e: React.FormEvent) => void;
}

export function PaymentModal({
    open,
    onOpenChange,
    paymentForm,
    cashRegisters,
    contracts = [],
    students = [],
    onSubmit,
}: Props) {
    const { t } = useTranslation();

    // A payment can never exceed what is still owed on the contract.
    const selectedContract = (contracts || []).find(
        (c) => String(c.id) === String(paymentForm.data.contract_id),
    );
    const debt = selectedContract
        ? Math.floor(Number(selectedContract.debt_amount) || 0)
        : null;
    const amount = Number(paymentForm.data.amount) || 0;
    const exceedsDebt = debt !== null && amount > debt;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ArrowDownRight className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                            {t(
                                'finance.accept_payment_title',
                                "To'lov Qabul Qilish",
                            )}
                        </span>
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 text-xs">
                    <div>
                        <Label required htmlFor="pay_contract_id">
                            {t('finance.select_contract', 'Shartnoma')}
                        </Label>
                        <SearchableSelect
                            id="pay_contract_id"
                            value={paymentForm.data.contract_id}
                            onChange={(val) => {
                                const picked = (contracts || []).find(
                                    (c) => String(c.id) === String(val),
                                );

                                // The amount starts at the whole debt; the cashier may lower it.
                                paymentForm.setData({
                                    ...paymentForm.data,
                                    contract_id: val,
                                    amount: picked
                                        ? moneyDigits(picked.debt_amount)
                                        : '',
                                });
                            }}
                            options={(contracts || []).map((c) => {
                                const st = (students || []).find(
                                    (s) => s.id === c.student_id,
                                );

                                return {
                                    value: c.id,
                                    label: `#${c.contract_number}${st ? ` - ${st.full_name}` : ''}`,
                                    sublabel: `Qarz: ${formatMoney(c.debt_amount)}`,
                                };
                            })}
                            placeholder={t(
                                'finance.select_contract',
                                'Shartnoma',
                            )}
                            className="mt-1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label required htmlFor="payment_method">
                                {t('finance.method', "To'lov Usuli")}
                            </Label>
                            <SearchableSelect
                                id="payment_method"
                                value={paymentForm.data.payment_method}
                                onChange={(val) => {
                                    const m = String(val);
                                    paymentForm.setData({
                                        ...paymentForm.data,
                                        payment_method: m,
                                        cash_register_id:
                                            cashRegisters.find(
                                                (r) => r.type?.code === m,
                                            )?.id ||
                                            paymentForm.data.cash_register_id,
                                    });
                                }}
                                options={[
                                    {
                                        value: 'cash',
                                        label: `💵 ${t('finance.method_cash', 'Naqd pul')}`,
                                    },
                                    {
                                        value: 'card_click',
                                        label: `💳 ${t('finance.method_card_click', 'Karta / Click / Payme')}`,
                                    },
                                    {
                                        value: 'bank_transfer',
                                        label: `🏦 ${t('finance.method_bank_transfer', "Bank o'tkazmasi")}`,
                                    },
                                ]}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label required htmlFor="pay_register_id">
                                {t('finance.cash_register', 'Kassa')}
                            </Label>
                            <SearchableSelect
                                id="pay_register_id"
                                value={paymentForm.data.cash_register_id}
                                onChange={(val) =>
                                    paymentForm.setData('cash_register_id', val)
                                }
                                options={cashRegisters.map((r) => ({
                                    value: r.id,
                                    label: r.name,
                                    sublabel: r.type?.code,
                                }))}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label required htmlFor="pay_amount">
                            {t('finance.amount', "To'lov Summasi (UZS)")}
                        </Label>
                        <MoneyInput
                            id="pay_amount"
                            value={paymentForm.data.amount}
                            onChange={(val) =>
                                paymentForm.setData('amount', val)
                            }
                            placeholder="1 000 000"
                            suffix="UZS"
                            required
                            className="mt-1"
                        />
                        {debt !== null && (
                            <p
                                className={`mt-1 text-[11px] ${exceedsDebt ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}
                            >
                                {exceedsDebt
                                    ? t(
                                          'finance.amount_exceeds_debt',
                                          'Summa qoldiq qarzdan oshib ketdi: {{debt}} UZS',
                                          { debt: formatMoney(debt) },
                                      )
                                    : t(
                                          'finance.debt_left',
                                          'Qoldiq qarz: {{debt}} UZS',
                                          { debt: formatMoney(debt) },
                                      )}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="pay_notes">
                            {t('finance.notes', 'Izoh')}
                        </Label>
                        <Input
                            id="pay_notes"
                            value={paymentForm.data.notes}
                            onChange={(e) =>
                                paymentForm.setData('notes', e.target.value)
                            }
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
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={paymentForm.processing || exceedsDebt}
                        >
                            {t(
                                'finance.confirm_payment',
                                "To'lovni qabul qilish",
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
