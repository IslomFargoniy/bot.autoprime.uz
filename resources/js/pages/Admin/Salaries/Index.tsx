import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Calculator,
    CreditCard,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    UserCheck,
    Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface Salary {
    id: number;
    user_id: number;
    period: string;
    type: 'base_salary' | 'driving_hourly' | 'lesson_rate' | 'bonus' | 'kpi' | 'fine' | 'advance';
    amount: number | string;
    is_deduction: boolean;
    status: 'draft' | 'accrued' | 'paid';
    description?: string;
    user?: { id: number; name: string; role: string; phone: string; salary_balance: number | string };
    salary_payments?: Array<{ id: number; amount: number | string; paid_at: string }>;
    created_at: string;
}

interface Employee {
    id: number;
    name: string;
    phone: string;
    role: string;
    base_salary: number | string;
    driving_hourly_rate: number | string;
    lesson_rate: number | string;
    salary_balance: number | string;
}

interface CashRegister {
    id: number;
    name: string;
    balance: number | string;
}

interface PageProps {
    salaries: {
        data: Salary[];
        links: any[];
        total: number;
    };
    employees: Employee[];
    cashRegisters: CashRegister[];
    branches: Array<{ id: number; name: string }>;
    filters: {
        period: string;
        branch_id?: string | number;
    };
}

export default function SalariesIndex({
    salaries,
    employees,
    cashRegisters,
    filters,
}: PageProps) {
    const { t } = useTranslation();
    const [period, setPeriod] = useState(filters.period);

    // Modals
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [payingSalary, setPayingSalary] = useState<Salary | null>(null);

    // Forms
    const adjustForm = useForm({
        user_id: employees[0]?.id || '',
        period: period,
        type: 'bonus',
        amount: '',
        description: '',
    });

    const payForm = useForm({
        cash_register_id: cashRegisters[0]?.id || '',
        amount: '',
        payment_method: 'cash',
        notes: '',
    });

    const handlePeriodChange = (newPeriod: string) => {
        setPeriod(newPeriod);
        router.get('/admin/salaries', { ...filters, period: newPeriod }, { preserveState: true });
    };

    const handleGeneratePayroll = () => {
        if (confirm(t('salaries.confirm_generate', `${period} davri uchun oylik vedomostini avtomatik hisoblamoqchimisiz?`))) {
            router.post('/admin/salaries/generate', { period }, {
                onSuccess: () => toast.success(t('salaries.generate_success', 'Oyliklar hisoblandi')),
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        adjustForm.post('/admin/salaries/adjustment', {
            onSuccess: () => {
                setShowAdjustModal(false);
                adjustForm.reset();
                toast.success(t('salaries.adjust_success', 'Qo\'shimcha hisob saqlandi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handlePaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingSalary) return;

        payForm.post(`/admin/salaries/${payingSalary.id}/pay`, {
            onSuccess: () => {
                setPayingSalary(null);
                payForm.reset();
                toast.success(t('salaries.pay_success', 'Oylik to\'lovi amalga oshirildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    return (
        <div className="p-6">
            <Head title={t('salaries.title', 'Xodimlar Oylik Hisob-kitobi')} />

            {/* Page Title & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('salaries.title', 'Xodimlar Oylik Hisob-kitobi')}</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        type="month"
                        value={period}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="w-36 h-9 text-xs"
                    />
                    <Button onClick={handleGeneratePayroll} variant="brand" className="text-xs">
                        <Calculator className="w-4 h-4 mr-1.5" />
                        {t('salaries.generate_button', '1-Klikda Hisoblash')}
                    </Button>
                    <Button onClick={() => setShowAdjustModal(true)} variant="outline" className="text-xs">
                        <Plus className="w-4 h-4 mr-1.5" />
                        {t('salaries.add_adjust', 'Bonus / Jarima')}
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('salaries.employee', 'Xodim')}</TableHead>
                            <TableHead>{t('salaries.role', 'Lavozim')}</TableHead>
                            <TableHead>{t('salaries.type', 'Turi')}</TableHead>
                            <TableHead>{t('salaries.amount', 'Summa')}</TableHead>
                            <TableHead>{t('salaries.balance', 'Hozirgi Balans')}</TableHead>
                            <TableHead>{t('salaries.status', 'Holat')}</TableHead>
                            <TableHead>{t('salaries.details', 'Tafsilotlar')}</TableHead>
                            <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {salaries.data.length === 0 ? (
                            <TableEmpty
                                colSpan={8}
                                icon={Coins}
                                title={t('salaries.no_salaries', 'Ushbu oy uchun hali oyliklar hisoblanmagan.')}
                            />
                        ) : (
                            salaries.data.map((sal) => (
                                <TableRow key={sal.id}>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        {sal.user?.name}
                                    </TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400">
                                        {sal.user?.role}
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-medium">
                                            {sal.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className={`font-bold ${sal.is_deduction ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {sal.is_deduction ? '-' : '+'}{Number(sal.amount).toLocaleString('uz-UZ')} UZS
                                    </TableCell>
                                    <TableCell className="font-semibold text-gray-800 dark:text-gray-200">
                                        {Number(sal.user?.salary_balance || 0).toLocaleString('uz-UZ')} UZS
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                            sal.status === 'paid'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                        }`}>
                                            {sal.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                        {sal.description || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {sal.status !== 'paid' && !sal.is_deduction && (
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setPayingSalary(sal);
                                                    payForm.setData('amount', String(sal.amount));
                                                }}
                                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                <Coins className="w-3.5 h-3.5 mr-1" />
                                                {t('salaries.pay_button', 'To\'lash')}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Custom Adjustment Modal (Bonus, Fine, Advance) */}
            <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {t('salaries.adjust_title', 'Bonus, Jarima yoki Avans Kiritish')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label required htmlFor="adj_user_id">{t('salaries.employee', 'Xodim')}</Label>
                            <SearchableSelect
                                id="adj_user_id"
                                value={adjustForm.data.user_id}
                                onChange={(val) => adjustForm.setData('user_id', val)}
                                options={employees.map((emp) => ({
                                    value: emp.id,
                                    label: emp.name,
                                    sublabel: emp.role,
                                }))}
                                placeholder={t('salaries.select_employee', '-- Xodimni tanlang --')}
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label required htmlFor="adj_type">{t('salaries.adjust_type', 'Turi')}</Label>
                                <SearchableSelect
                                    id="adj_type"
                                    value={adjustForm.data.type}
                                    onChange={(val) => adjustForm.setData('type', val)}
                                    options={[
                                        { value: 'bonus', label: '🎁 Bonus' },
                                        { value: 'kpi', label: '⭐ KPI Ustama' },
                                        { value: 'fine', label: '⚠️ Jarima (Ushlab qolish)' },
                                        { value: 'advance', label: '💵 Avans (Oldindan to\'lov)' },
                                    ]}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label required htmlFor="adj_amount">{t('salaries.amount', 'Summa (UZS)')}</Label>
                                <Input
                                    id="adj_amount"
                                    type="number"
                                    value={adjustForm.data.amount}
                                    onChange={(e) => adjustForm.setData('amount', e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label required htmlFor="adj_desc">{t('salaries.description', 'Sabab / Tavsif')}</Label>
                            <Input
                                id="adj_desc"
                                value={adjustForm.data.description}
                                onChange={(e) => adjustForm.setData('description', e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={adjustForm.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Pay Salary from Cash Register Modal */}
            <Dialog open={!!payingSalary} onOpenChange={(open) => !open && setPayingSalary(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            {t('salaries.pay_modal_title', 'Oylik To\'lovini Amalga Oshirish')}
                        </DialogTitle>
                    </DialogHeader>
                    {payingSalary && (
                        <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <p className="font-semibold text-gray-900 dark:text-white">{payingSalary.user?.name}</p>
                                <p className="text-gray-500 mt-0.5">{payingSalary.period} oyi uchun: {Number(payingSalary.amount).toLocaleString('uz-UZ')} UZS</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label required htmlFor="pay_cash_reg">{t('finance.register', 'Kassa')}</Label>
                                    <SearchableSelect
                                        id="pay_cash_reg"
                                        value={payForm.data.cash_register_id}
                                        onChange={(val) => payForm.setData('cash_register_id', val)}
                                        options={cashRegisters.map((r) => ({
                                            value: r.id,
                                            label: r.name,
                                            sublabel: `${Number(r.balance).toLocaleString('uz-UZ')} UZS`,
                                        }))}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label required htmlFor="pay_method">{t('finance.method', 'Usul')}</Label>
                                    <SearchableSelect
                                        id="pay_method"
                                        value={payForm.data.payment_method}
                                        onChange={(val) => payForm.setData('payment_method', String(val))}
                                        options={[
                                            { value: 'cash', label: 'Naqd pul' },
                                            { value: 'card_click', label: 'Karta / Click' },
                                            { value: 'bank_transfer', label: 'Bank hisobiga' },
                                        ]}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label required htmlFor="pay_amt">{t('salaries.amount', 'To\'lanadigan Summa (UZS)')}</Label>
                                <Input
                                    id="pay_amt"
                                    type="number"
                                    value={payForm.data.amount}
                                    onChange={(e) => payForm.setData('amount', e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setPayingSalary(null)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={payForm.processing}>
                                    {t('finance.confirm', 'To\'lash')}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
