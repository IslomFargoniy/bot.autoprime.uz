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
                    <Button onClick={handleGeneratePayroll} className="bg-blue-600 hover:bg-blue-700 text-xs">
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('salaries.employee', 'Xodim')}</th>
                                <th className="p-3.5 font-semibold">{t('salaries.role', 'Lavozim')}</th>
                                <th className="p-3.5 font-semibold">{t('salaries.type', 'Turi')}</th>
                                <th className="p-3.5 font-semibold">{t('salaries.amount', 'Summa')}</th>
                                <th className="p-3.5 font-semibold">{t('salaries.balance', 'Hozirgi Balans')}</th>
                                <th className="p-3.5 font-semibold">{t('salaries.status', 'Holat')}</th>
                                <th className="p-3.5 font-semibold">{t('salaries.details', 'Tafsilotlar')}</th>
                                <th className="p-3.5 font-semibold text-right">{t('common.actions', 'Amallar')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {salaries.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">
                                        {t('salaries.no_salaries', 'Ushbu oy uchun hali oyliklar hisoblanmagan.')}
                                    </td>
                                </tr>
                            ) : (
                                salaries.data.map((sal) => (
                                    <tr key={sal.id} className="hover:bg-gray-50/50">
                                        <td className="p-3.5 font-medium text-gray-900 dark:text-white">
                                            {sal.user?.name}
                                        </td>
                                        <td className="p-3.5 text-gray-500">
                                            {sal.user?.role}
                                        </td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-medium">
                                                {sal.type}
                                            </span>
                                        </td>
                                        <td className={`p-3.5 font-bold ${sal.is_deduction ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {sal.is_deduction ? '-' : '+'}{Number(sal.amount).toLocaleString('uz-UZ')} UZS
                                        </td>
                                        <td className="p-3.5 font-semibold text-gray-800 dark:text-gray-200">
                                            {Number(sal.user?.salary_balance || 0).toLocaleString('uz-UZ')} UZS
                                        </td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                sal.status === 'paid'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {sal.status}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-gray-500 max-w-xs truncate">
                                            {sal.description || '-'}
                                        </td>
                                        <td className="p-3.5 text-right">
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Adjustment Modal (Bonus, Fine, Advance) */}
            <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('salaries.adjust_title', 'Bonus, Jarima yoki Avans Kiritish')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="adj_user_id">{t('salaries.employee', 'Xodim')}</Label>
                            <select
                                id="adj_user_id"
                                value={adjustForm.data.user_id}
                                onChange={(e) => adjustForm.setData('user_id', e.target.value)}
                                className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                required
                            >
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="adj_type">{t('salaries.adjust_type', 'Turi')}</Label>
                                <select
                                    id="adj_type"
                                    value={adjustForm.data.type}
                                    onChange={(e) => adjustForm.setData('type', e.target.value)}
                                    className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                >
                                    <option value="bonus">🎁 Bonus</option>
                                    <option value="kpi">⭐ KPI Ustama</option>
                                    <option value="fine">⚠️ Jarima (Ushlab qolish)</option>
                                    <option value="advance">💵 Avans (Oldindan to'lov)</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="adj_amount">{t('salaries.amount', 'Summa (UZS)')}</Label>
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
                            <Label htmlFor="adj_desc">{t('salaries.description', 'Sabab / Tavsif')}</Label>
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
                            <Button type="submit" disabled={adjustForm.processing}>
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
                        <DialogTitle>{t('salaries.pay_modal_title', 'Oylik To\'lovini Amalga Oshirish')}</DialogTitle>
                    </DialogHeader>
                    {payingSalary && (
                        <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <p className="font-semibold text-gray-900 dark:text-white">{payingSalary.user?.name}</p>
                                <p className="text-gray-500 mt-0.5">{payingSalary.period} oyi uchun: {Number(payingSalary.amount).toLocaleString('uz-UZ')} UZS</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="pay_cash_reg">{t('finance.register', 'Kassa')}</Label>
                                    <select
                                        id="pay_cash_reg"
                                        value={payForm.data.cash_register_id}
                                        onChange={(e) => payForm.setData('cash_register_id', e.target.value)}
                                        className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                    >
                                        {cashRegisters.map((r) => (
                                            <option key={r.id} value={r.id}>{r.name} ({Number(r.balance).toLocaleString('uz-UZ')} UZS)</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="pay_method">{t('finance.method', 'Usul')}</Label>
                                    <select
                                        id="pay_method"
                                        value={payForm.data.payment_method}
                                        onChange={(e) => payForm.setData('payment_method', e.target.value)}
                                        className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                    >
                                        <option value="cash">Naqd pul</option>
                                        <option value="card_click">Karta / Click</option>
                                        <option value="bank_transfer">Bank hisobiga</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="pay_amt">{t('salaries.amount', 'To\'lanadigan Summa (UZS)')}</Label>
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
