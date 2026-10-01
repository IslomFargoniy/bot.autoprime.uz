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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ArrowDownRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{t('finance.accept_payment_title', 'To\'lov Qabul Qilish (Rasmiy Chek)')}</span>
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 text-xs">
                    <div>
                        <Label required htmlFor="pay_contract_id">{t('finance.select_contract', 'Shartnoma')}</Label>
                        <SearchableSelect
                            id="pay_contract_id"
                            value={paymentForm.data.contract_id}
                            onChange={(val) => paymentForm.setData('contract_id', val)}
                            options={(contracts || []).map((c) => {
                                const st = (students || []).find((s) => s.id === c.student_id);

                                return {
                                    value: c.id,
                                    label: `#${c.contract_number}${st ? ` - ${st.full_name}` : ''}`,
                                    sublabel: `Qarz: ${formatMoney(c.debt_amount)}`,
                                };
                            })}
                            placeholder={t('finance.select_contract', 'Shartnoma')}
                            className="mt-1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label required htmlFor="payment_method">{t('finance.method', 'To\'lov Usuli')}</Label>
                            <SearchableSelect
                                id="payment_method"
                                value={paymentForm.data.payment_method}
                                onChange={(val) => {
                                    const m = String(val);
                                    paymentForm.setData({
                                        ...paymentForm.data,
                                        payment_method: m,
                                        cash_register_id: cashRegisters.find((r) => r.type?.code === m)?.id || paymentForm.data.cash_register_id,
                                    });
                                }}
                                options={[
                                    { value: 'cash', label: `💵 ${t('finance.method_cash', 'Naqd pul')}` },
                                    { value: 'card_click', label: `💳 ${t('finance.method_card_click', 'Karta / Click / Payme')}` },
                                    { value: 'bank_transfer', label: `🏦 ${t('finance.method_bank_transfer', "Bank o'tkazmasi")}` },
                                ]}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label required htmlFor="pay_register_id">{t('finance.cash_register', 'Kassa')}</Label>
                            <SearchableSelect
                                id="pay_register_id"
                                value={paymentForm.data.cash_register_id}
                                onChange={(val) => paymentForm.setData('cash_register_id', val)}
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
                        <Label required htmlFor="pay_amount">{t('finance.amount', 'To\'lov Summasi (UZS)')}</Label>
                        <MoneyInput
                            id="pay_amount"
                            value={paymentForm.data.amount}
                            onChange={(val) => paymentForm.setData('amount', val)}
                            placeholder="1 000 000"
                            suffix="UZS"
                            required
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="pay_notes">{t('finance.notes', 'Izoh')}</Label>
                        <Input
                            id="pay_notes"
                            value={paymentForm.data.notes}
                            onChange={(e) => paymentForm.setData('notes', e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel', 'Bekor qilish')}
                        </Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={paymentForm.processing}>
                            {t('finance.confirm_payment', 'Chekni Chiqarish')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
