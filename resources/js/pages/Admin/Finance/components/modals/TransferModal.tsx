import { useTranslation } from 'react-i18next';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MoneyInput } from '@/components/ui/money-input';
import type { CashRegister } from '../../types';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transferForm: any;
    cashRegisters: CashRegister[];
    onSubmit: (e: React.FormEvent) => void;
}

export function TransferModal({
    open,
    onOpenChange,
    transferForm,
    cashRegisters,
    onSubmit,
}: Props) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{t('finance.transfer_title', 'Kassalararo Pul O\'tkazmasi')}</span>
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label required htmlFor="tr_from">{t('finance.from_register', 'Chiqim Kassasi')}</Label>
                            <SearchableSelect
                                id="tr_from"
                                value={transferForm.data.from_cash_register_id}
                                onChange={(val) => transferForm.setData('from_cash_register_id', val)}
                                options={cashRegisters.map((r) => ({ value: r.id, label: r.name }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label required htmlFor="tr_to">{t('finance.to_register', 'Qabul Qiluvchi Kassa')}</Label>
                            <SearchableSelect
                                id="tr_to"
                                value={transferForm.data.to_cash_register_id}
                                onChange={(val) => transferForm.setData('to_cash_register_id', val)}
                                options={cashRegisters.map((r) => ({ value: r.id, label: r.name }))}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <Label required htmlFor="tr_amount">{t('finance.amount', 'O\'tkaziladigan Summa (UZS)')}</Label>
                        <MoneyInput
                            id="tr_amount"
                            value={transferForm.data.amount}
                            onChange={(val) => transferForm.setData('amount', val)}
                            placeholder="500 000"
                            suffix="UZS"
                            required
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="tr_notes">{t('finance.notes', 'Izoh')}</Label>
                        <Input
                            id="tr_notes"
                            value={transferForm.data.notes}
                            onChange={(e) => transferForm.setData('notes', e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel', 'Bekor qilish')}
                        </Button>
                        <Button type="submit" variant="brand" disabled={transferForm.processing}>
                            {t('finance.send_transfer', 'O\'tkazish')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
