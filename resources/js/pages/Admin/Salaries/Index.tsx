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
    Wallet,
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

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'base_salary':
                return t('salaries.type_base_salary', 'Oklad (Asosiy oylik)');
            case 'driving_hourly':
            case 'driving_hourly_rate':
                return t('salaries.type_driving_hourly_rate', 'Amaliy haydash (Soatbay)');
            case 'lesson_rate':
                return t('salaries.type_lesson_rate', 'Nazariya darsi (Darsbay)');
            case 'bonus_kpi':
            case 'kpi':
                return t('salaries.type_bonus_kpi', 'KPI Ustama');
            case 'bonus':
                return t('salaries.type_bonus', 'Bonus');
            case 'penalty':
            case 'fine':
                return t('salaries.type_penalty', 'Jarima');
            case 'advance':
                return t('salaries.type_advance', 'Avans');
            default:
                return t(`salaries.type_${type}`, type);
        }
    };

    const getRoleLabel = (role?: string) => {
        if (!role) return '-';
        switch (role) {
            case 'instructor':
                return t('salaries.role_instructor', 'Instruktor');
            case 'teacher':
                return t('salaries.role_teacher', "O'qituvchi");
            case 'admin':
                return t('salaries.role_admin', 'Administrator');
            case 'superadmin':
                return t('salaries.role_superadmin', 'Superadmin');
            case 'accountant':
                return t('salaries.role_accountant', 'Hisobchi');
            default:
                return t(`salaries.role_${role}`, role);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid':
                return t('salaries.status_paid', "To'langan");
            case 'calculated':
            case 'pending':
            case 'accrued':
            case 'draft':
                return t('salaries.status_calculated', 'Hisoblangan');
            default:
                return t(`salaries.status_${status}`, status);
        }
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

            {/* Table / Desktop View */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
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
                                        {getRoleLabel(sal.user?.role)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-medium">
                                            {getTypeLabel(sal.type)}
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
                                            {getStatusLabel(sal.status)}
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
            </div>

            {/* Mobile Cards Feed */}
            <div className="md:hidden space-y-3">
                {salaries.data.length === 0 ? (
                    <div className="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground shadow-xs">
                        {t('salaries.no_salaries', 'Ushbu oy uchun hali oyliklar hisoblanmagan.')}
                    </div>
                ) : (
                    salaries.data.map((sal) => (
                        <div key={sal.id} className="bg-card border rounded-xl p-4 space-y-3 shadow-xs">
                            {/* Header: Employee Name & Status */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-sm text-foreground">{sal.user?.name}</div>
                                    <div className="text-xs text-muted-foreground">{getRoleLabel(sal.user?.role)}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                    sal.status === 'paid'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                }`}>
                                    {getStatusLabel(sal.status)}
                                </span>
                            </div>

                            {/* Type & Details */}
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-muted font-medium">
                                    {getTypeLabel(sal.type)}
                                </span>
                                {sal.description && (
                                    <span className="text-muted-foreground line-clamp-1">
                                        {sal.description}
                                    </span>
                                )}
                            </div>

                            {/* Amount & Balance */}
                            <div className="grid grid-cols-2 gap-2 p-2.5 bg-muted/40 rounded-lg text-xs">
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">{t('salaries.amount', 'Summa')}</span>
                                    <span className={`font-bold ${sal.is_deduction ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {sal.is_deduction ? '-' : '+'}{Number(sal.amount).toLocaleString('uz-UZ')} UZS
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">{t('salaries.balance', 'Hozirgi Balans')}</span>
                                    <span className="font-semibold text-foreground">
                                        {Number(sal.user?.salary_balance || 0).toLocaleString('uz-UZ')} UZS
                                    </span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            {sal.status !== 'paid' && !sal.is_deduction && (
                                <div className="flex justify-end pt-2 border-t">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setPayingSalary(sal);
                                            payForm.setData('amount', String(sal.amount));
                                        }}
                                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 w-full sm:w-auto"
                                    >
                                        <Coins className="w-3.5 h-3.5" />
                                        {t('salaries.pay_button', "To'lash")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Custom Adjustment Modal (Bonus, Fine, Advance) */}
            <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
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
                                    sublabel: getRoleLabel(emp.role),
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
                                        { value: 'bonus', label: `🎁 ${t('salaries.type_bonus', 'Bonus')}` },
                                        { value: 'kpi', label: `⭐ ${t('salaries.type_bonus_kpi', 'KPI Ustama')}` },
                                        { value: 'fine', label: `⚠️ ${t('salaries.type_penalty', 'Jarima (Ushlab qolish)')}` },
                                        { value: 'advance', label: `💵 ${t('salaries.type_advance', 'Avans (Oldindan to\'lov)')}` },
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
                <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            {t('salaries.pay_modal_title', 'Oylik To\'lovini Amalga Oshirish')}
                        </DialogTitle>
                    </DialogHeader>
                    {payingSalary && (() => {
                        const selectedRegister = cashRegisters.find((r) => String(r.id) === String(payForm.data.cash_register_id));
                        const payAmountNum = Number(payForm.data.amount) || 0;
                        const regBalanceNum = selectedRegister ? Number(selectedRegister.balance) : 0;
                        const isInsufficient = selectedRegister && regBalanceNum < payAmountNum;
                        const remainingBalance = regBalanceNum - payAmountNum;

                        return (
                            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
                                {/* Employee Summary Box */}
                                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-gray-900 dark:text-white">{payingSalary.user?.name}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                                                {getRoleLabel(payingSalary.user?.role)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {payingSalary.period} {t('salaries.for_period', 'oyi uchun hisob')}
                                        </div>
                                    </div>
                                    <div className="sm:text-right">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('salaries.due_amount', 'To\'lanishi kerak')}</div>
                                        <div className="font-mono font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                                            {Number(payingSalary.amount).toLocaleString('uz-UZ')} <span className="text-xs font-normal text-gray-400">UZS</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Kassa & Usul Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                                { value: 'cash', label: `💵 ${t('finance.method_cash', 'Naqd pul')}` },
                                                { value: 'card_click', label: `💳 ${t('finance.method_card_click', 'Karta / Click')}` },
                                                { value: 'bank_transfer', label: `🏦 ${t('finance.method_bank_transfer', "Bank hisobiga")}` },
                                            ]}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Alohida Kassa Balansi Kartasi (Dedicated Prominent Cash Balance Card) */}
                                {selectedRegister && (
                                    <div className={`p-4 rounded-xl border transition-all ${
                                        isInsufficient
                                            ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                                            : 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                                    }`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl shrink-0 ${
                                                    isInsufficient
                                                        ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                                                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                                }`}>
                                                    <Wallet className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">
                                                        {t('finance.selected_register_balance', 'Tanlangan kassa balansi')}
                                                    </span>
                                                    <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                                                        {selectedRegister.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-mono font-bold text-base sm:text-lg ${
                                                    isInsufficient
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                    {Number(selectedRegister.balance).toLocaleString('uz-UZ')} <span className="text-xs font-normal">UZS</span>
                                                </div>
                                                <div className="text-[11px] mt-0.5">
                                                    {isInsufficient ? (
                                                        <span className="text-rose-600 dark:text-rose-400 font-medium inline-flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                            {t('finance.insufficient_funds', 'Mablag\' yetarli emas!')} (-{Number(payAmountNum - regBalanceNum).toLocaleString('uz-UZ')} UZS)
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-700 dark:text-emerald-300 opacity-90 font-medium">
                                                            {t('finance.remaining_after_pay', 'To\'lovdan keyin qoladi')}: {Number(remainingBalance).toLocaleString('uz-UZ')} UZS
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Summa */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <Label required htmlFor="pay_amt">{t('salaries.amount', 'To\'lanadigan Summa (UZS)')}</Label>
                                        <button
                                            type="button"
                                            onClick={() => payForm.setData('amount', String(payingSalary.amount))}
                                            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline"
                                        >
                                            {t('salaries.set_full_amount', 'To\'liq summani kiritish')}
                                        </button>
                                    </div>
                                    <Input
                                        id="pay_amt"
                                        type="number"
                                        value={payForm.data.amount}
                                        onChange={(e) => payForm.setData('amount', e.target.value)}
                                        required
                                        className="h-10 text-sm font-semibold font-mono"
                                    />
                                </div>

                                {/* Izoh / Notes */}
                                <div>
                                    <Label htmlFor="pay_notes">{t('salaries.notes_optional', 'Izoh (Ixtiyoriy)')}</Label>
                                    <Input
                                        id="pay_notes"
                                        value={payForm.data.notes}
                                        onChange={(e) => payForm.setData('notes', e.target.value)}
                                        placeholder={t('salaries.notes_placeholder', 'To\'lov tafsilotlari yoki chek raqami...')}
                                        className="mt-1 h-9"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <Button type="button" variant="outline" onClick={() => setPayingSalary(null)}>
                                        {t('common.cancel', 'Bekor qilish')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 px-5 h-9"
                                        disabled={payForm.processing || isInsufficient}
                                    >
                                        <Coins className="w-4 h-4" />
                                        {t('finance.confirm', 'Tasdiqlash')}
                                    </Button>
                                </div>
                            </form>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
