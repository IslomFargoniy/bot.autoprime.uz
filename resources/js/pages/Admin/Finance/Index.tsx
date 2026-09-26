import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Wallet,
    ArrowDownRight,
    ArrowUpRight,
    ArrowLeftRight,
    Clock,
    CheckCircle2,
    DollarSign,
    CreditCard,
    Building2,
    Lock,
    Unlock,
    Trash2,
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

interface CashRegister {
    id: number;
    name: string;
    balance: number | string;
    type?: { id: number; code: string; name: string };
    branch?: { id: number; name: string };
    is_active: boolean;
    open_shift?: CashShift | null;
}

interface Payment {
    id: number;
    receipt_number: string;
    amount: number | string;
    payment_method: string;
    paid_at: string;
    student?: { full_name: string; phone: string };
    contract?: { contract_number: string };
    cash_register?: { name: string };
    received_by?: { name: string };
}

interface Expense {
    id: number;
    amount: number | string;
    description: string;
    expense_date: string;
    category?: { name: string };
    cash_register?: { name: string };
    user?: { name: string };
}

interface CashShift {
    id: number;
    cash_register?: { name: string };
    opening_balance: number | string;
    closing_balance?: number | string;
    total_income: number | string;
    total_expense: number | string;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at?: string;
    opened_by?: { name: string };
    closed_by?: { name: string };
}

interface CashTransfer {
    id: number;
    from_cash_register?: { name: string };
    to_cash_register?: { name: string };
    amount: number | string;
    status: 'pending' | 'approved' | 'rejected';
    transferred_by?: { name: string };
    approved_by?: { name: string };
    created_at: string;
}

interface PageProps {
    cashRegisters: CashRegister[];
    payments: { data: Payment[]; links: any[]; total: number };
    expenses: { data: Expense[]; links: any[]; total: number };
    shifts: { data: CashShift[]; links: any[]; total: number };
    transfers: { data: CashTransfer[]; links: any[]; total: number };
    branches: Array<{ id: number; name: string }>;
    expenseCategories: Array<{ id: number; name: string }>;
    registerTypes: Array<{ id: number; code: string; name: string }>;
    students: Array<{ id: number; full_name: string; phone: string }>;
    contracts: Array<{
        id: number;
        student_id: number;
        contract_number: string;
        final_amount: number | string;
        paid_amount: number | string;
        debt_amount: number | string;
    }>;
}

export default function FinanceIndex({
    cashRegisters,
    payments,
    expenses,
    shifts,
    transfers,
    branches,
    expenseCategories,
    registerTypes,
    contracts,
    students = [],
}: PageProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'registers' | 'payments' | 'expenses' | 'shifts' | 'transfers'>('registers');

    // Modals
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showShiftModal, setShowShiftModal] = useState(false);

    // Payment Form
    const paymentForm = useForm({
        contract_id: contracts[0]?.id || '',
        cash_register_id: cashRegisters[0]?.id || '',
        amount: '',
        payment_method: 'cash',
        notes: '',
    });

    // Expense Form
    const expenseForm = useForm({
        cash_register_id: cashRegisters[0]?.id || '',
        expense_category_id: expenseCategories[0]?.id || '',
        amount: '',
        description: '',
    });

    // Transfer Form
    const transferForm = useForm({
        from_cash_register_id: cashRegisters[0]?.id || '',
        to_cash_register_id: cashRegisters[1]?.id || '',
        amount: '',
        notes: '',
    });

    // Shift Form
    const initialRegister = cashRegisters[0];
    const initialHasOpen = Boolean(initialRegister?.open_shift);
    const shiftForm = useForm({
        cash_register_id: initialRegister?.id || '',
        action: initialHasOpen ? 'close' : 'open',
        opening_balance: initialHasOpen ? '' : String(initialRegister?.balance || 0),
        closing_balance: initialHasOpen ? String(initialRegister?.balance || 0) : '',
        note: '',
    });

    const openShiftForRegister = (register: CashRegister) => {
        const hasOpen = Boolean(register.open_shift);
        shiftForm.setData({
            cash_register_id: register.id,
            action: hasOpen ? 'close' : 'open',
            opening_balance: hasOpen ? '' : String(register.balance || 0),
            closing_balance: hasOpen ? String(register.balance || 0) : '',
            note: '',
        });
        setShowShiftModal(true);
    };

    const handleRegisterChange = (val: string | number) => {
        const regId = Number(val);
        const reg = cashRegisters.find((r) => r.id === regId);
        const hasOpen = Boolean(reg?.open_shift);
        shiftForm.setData({
            ...shiftForm.data,
            cash_register_id: regId,
            action: hasOpen ? 'close' : 'open',
            opening_balance: hasOpen ? '' : String(reg?.balance || 0),
            closing_balance: hasOpen ? String(reg?.balance || 0) : '',
        });
    };

    const handleActionChange = (actionVal: string | number) => {
        const action = String(actionVal);
        const reg = cashRegisters.find((r) => r.id === Number(shiftForm.data.cash_register_id));
        shiftForm.setData({
            ...shiftForm.data,
            action,
            opening_balance: action === 'open' ? String(reg?.balance || 0) : '',
            closing_balance: action === 'close' ? String(reg?.balance || 0) : '',
        });
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post('/admin/finance/payment', {
            onSuccess: () => {
                setShowPaymentModal(false);
                paymentForm.reset();
                toast.success(t('finance.payment_success', 'To\'lov muvaffaqiyatli qabul qilindi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        expenseForm.post('/admin/finance/expense', {
            onSuccess: () => {
                setShowExpenseModal(false);
                expenseForm.reset();
                toast.success(t('finance.expense_success', 'Xarajat muvaffaqiyatli saqlandi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transferForm.post('/admin/finance/transfer', {
            onSuccess: () => {
                setShowTransferModal(false);
                transferForm.reset();
                toast.success(t('finance.transfer_success', 'Transfer so\'rovi yuborildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleApproveTransfer = (transfer: CashTransfer) => {
        if (confirm(t('finance.confirm_approve_transfer', 'Ushbu transferni tasdiqlab mablag\'ni o\'tkazmoqchimisiz?'))) {
            router.post(`/admin/finance/transfer/${transfer.id}/approve`, {}, {
                onSuccess: () => toast.success(t('finance.transfer_approved', 'Transfer tasdiqlandi')),
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleShiftSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        shiftForm.post('/admin/finance/shift', {
            onSuccess: () => {
                setShowShiftModal(false);
                shiftForm.reset();
                toast.success(t('finance.shift_success', 'Kassa smenasi amali bajarildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleDeletePayment = (payment: Payment) => {
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/finance/payment/${payment.id}`, {
                onSuccess: () => toast.success(t('common.deleted', 'O\'chirildi')),
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleDeleteExpense = (expense: Expense) => {
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/finance/expense/${expense.id}`, {
                onSuccess: () => toast.success(t('common.deleted', 'O\'chirildi')),
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    return (
        <div className="p-6">
            <Head title={t('finance.title', 'Moliya va Kassalar')} />

            {/* Page Title & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('finance.title', 'Moliya va Kassalar')}</h1>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowPaymentModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                        <ArrowDownRight className="w-4 h-4 mr-1.5" />
                        {t('finance.accept_payment', 'To\'lov Qabul Qilish')}
                    </Button>
                    <Button onClick={() => setShowExpenseModal(true)} variant="outline" className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40">
                        <ArrowUpRight className="w-4 h-4 mr-1.5" />
                        {t('finance.add_expense', 'Chiqim Qilish')}
                    </Button>
                    <Button onClick={() => setShowTransferModal(true)} variant="outline" className="text-xs">
                        <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                        {t('finance.transfer', 'Transfer')}
                    </Button>
                    <Button onClick={() => setShowShiftModal(true)} variant="outline" className="text-xs">
                        <Clock className="w-4 h-4 mr-1.5" />
                        {t('finance.shift_toggle', 'Smena')}
                    </Button>
                </div>
            </div>

            {/* Cash Registers Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {cashRegisters.map((reg) => (
                    <div
                        key={reg.id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {reg.type?.code === 'cash' ? <DollarSign className="w-3.5 h-3.5 text-amber-500" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                                    <span>{reg.type?.name || 'Kassa'}</span>
                                    {reg.branch && <span>• {reg.branch.name}</span>}
                                </div>
                                <h3 className="font-bold text-base text-gray-900 dark:text-white">{reg.name}</h3>
                                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                                    {Number(reg.balance).toLocaleString('uz-UZ')} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">UZS</span>
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
                                <Wallet className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Shift Status pill */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                            {reg.open_shift ? (
                                <button
                                    type="button"
                                    onClick={() => openShiftForRegister(reg)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {t('finance.shift_status_open', 'Smena ochiq')}
                                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">({t('finance.close_shift_button', 'Yopish')})</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openShiftForRegister(reg)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                                >
                                    <Unlock className="w-3 h-3 text-gray-500" />
                                    {t('finance.open_shift_button', 'Smena ochish')}
                                </button>
                            )}
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                {reg.open_shift?.opened_by?.name ? `👤 ${reg.open_shift.opened_by.name}` : ''}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 text-xs font-medium w-full md:w-max">
                <button
                    onClick={() => setActiveTab('registers')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                        activeTab === 'registers' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_registers', 'Kassalar')}
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                        activeTab === 'payments' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_payments', 'Kirim To\'lovlar')}
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                        activeTab === 'expenses' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_expenses', 'Chiqim Xarajatlar')}
                </button>
                <button
                    onClick={() => setActiveTab('shifts')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                        activeTab === 'shifts' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_shifts', 'Kassa Smenalari')}
                </button>
                <button
                    onClick={() => setActiveTab('transfers')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                        activeTab === 'transfers' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_transfers', 'Transferlar')}
                </button>
            </div>

            {/* Tab: Registers */}
            {activeTab === 'registers' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.register_name', 'Kassa Nomi')}</TableHead>
                                <TableHead>{t('finance.type', 'Turi')}</TableHead>
                                <TableHead>{t('finance.branch', 'Filial')}</TableHead>
                                <TableHead>{t('finance.balance', 'Balans')}</TableHead>
                                <TableHead>{t('finance.shift', 'Smena')}</TableHead>
                                <TableHead>{t('finance.status', 'Holati')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cashRegisters.length === 0 ? (
                                <TableEmpty
                                    colSpan={7}
                                    icon={<Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_registers', 'Kassalar topilmadi')}
                                />
                            ) : (
                                cashRegisters.map((reg) => (
                                    <TableRow key={reg.id}>
                                        <TableCell className="font-semibold text-gray-900 dark:text-white">
                                            {reg.name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-medium">
                                                {reg.type?.code === 'cash' ? <DollarSign className="w-3.5 h-3.5 text-amber-500" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                                                {reg.type?.name || 'Kassa'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">
                                            {reg.branch?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {Number(reg.balance).toLocaleString('uz-UZ')} UZS
                                        </TableCell>
                                        <TableCell>
                                            {reg.open_shift ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    {t('finance.shift_status_open', 'Smena ochiq')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {t('finance.shift_status_closed', 'Yopiq')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                reg.is_active
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                            }`}>
                                                {reg.is_active ? t('common.active', 'Faol') : t('common.inactive', 'Nofaol')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openShiftForRegister(reg)}
                                                className="h-7 text-xs"
                                            >
                                                {reg.open_shift ? (
                                                    <>
                                                        <Lock className="w-3.5 h-3.5 mr-1" />
                                                        {t('finance.close_shift_button', 'Yopish')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock className="w-3.5 h-3.5 mr-1" />
                                                        {t('finance.open_shift_button', 'Smena ochish')}
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Tab: Payments */}
            {activeTab === 'payments' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.receipt', 'Chek №')}</TableHead>
                                <TableHead>{t('finance.student', 'Talaba')}</TableHead>
                                <TableHead>{t('finance.contract', 'Shartnoma')}</TableHead>
                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                <TableHead>{t('finance.method', 'Usul')}</TableHead>
                                <TableHead>{t('finance.register', 'Kassa')}</TableHead>
                                <TableHead>{t('finance.cashier', 'Qabul qildi')}</TableHead>
                                <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={9}
                                    icon={<DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_payments', "To'lovlar topilmadi")}
                                />
                            ) : (
                                payments.data.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-semibold text-gray-900 dark:text-white">#{p.receipt_number}</TableCell>
                                        <TableCell className="font-medium">{p.student?.full_name}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">#{p.contract?.contract_number}</TableCell>
                                        <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                                            +{Number(p.amount).toLocaleString('uz-UZ')} UZS
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-medium">
                                                {p.payment_method}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">{p.cash_register?.name}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">{p.received_by?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500">{p.paid_at}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeletePayment(p)}
                                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                title={t('common.delete', "O'chirish")}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Tab: Expenses */}
            {activeTab === 'expenses' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.category', 'Kategoriya')}</TableHead>
                                <TableHead>{t('finance.description', 'Tavsif')}</TableHead>
                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                <TableHead>{t('finance.register', 'Kassa')}</TableHead>
                                <TableHead>{t('finance.user', 'Xodim')}</TableHead>
                                <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={7}
                                    icon={<ArrowUpRight className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_expenses', "Xarajatlar topilmadi")}
                                />
                            ) : (
                                expenses.data.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-medium">{e.category?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-700 dark:text-gray-300">{e.description}</TableCell>
                                        <TableCell className="font-bold text-red-500 dark:text-red-400">
                                            -{Number(e.amount).toLocaleString('uz-UZ')} UZS
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">{e.cash_register?.name}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">{e.user?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500">{e.expense_date}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteExpense(e)}
                                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                title={t('common.delete', "O'chirish")}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Tab: Shifts */}
            {activeTab === 'shifts' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.register', 'Kassa')}</TableHead>
                                <TableHead>{t('finance.status', 'Holat')}</TableHead>
                                <TableHead>{t('finance.opening_balance', 'Boshlang\'ich')}</TableHead>
                                <TableHead>{t('finance.income', 'Jami Kirim')}</TableHead>
                                <TableHead>{t('finance.expense', 'Jami Chiqim')}</TableHead>
                                <TableHead>{t('finance.closing_balance', 'Yakuniy')}</TableHead>
                                <TableHead>{t('finance.opened_at', 'Ochilgan')}</TableHead>
                                <TableHead>{t('finance.closed_at', 'Yopilgan')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shifts.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={8}
                                    icon={<Clock className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_shifts', "Smenalar topilmadi")}
                                />
                            ) : (
                                shifts.data.map((sh) => (
                                    <TableRow key={sh.id}>
                                        <TableCell className="font-medium">{sh.cash_register?.name}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sh.status === 'open' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                                {sh.status === 'open' ? t('finance.open', 'Ochiq') : t('finance.closed', 'Yopiq')}
                                            </span>
                                        </TableCell>
                                        <TableCell>{Number(sh.opening_balance).toLocaleString('uz-UZ')} UZS</TableCell>
                                        <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">+{Number(sh.total_income).toLocaleString('uz-UZ')} UZS</TableCell>
                                        <TableCell className="text-red-500 dark:text-red-400 font-semibold">-{Number(sh.total_expense).toLocaleString('uz-UZ')} UZS</TableCell>
                                        <TableCell className="font-bold">{Number(sh.closing_balance || 0).toLocaleString('uz-UZ')} UZS</TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500">{sh.opened_at}</TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500">{sh.closed_at || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Tab: Transfers */}
            {activeTab === 'transfers' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.from_register', 'Chiqim Kassasi')}</TableHead>
                                <TableHead>{t('finance.to_register', 'Qabul Qiluvchi Kassa')}</TableHead>
                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                <TableHead>{t('finance.status', 'Holat')}</TableHead>
                                <TableHead>{t('finance.initiator', 'Yuboruvchi')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={6}
                                    icon={<ArrowLeftRight className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                    title={t('finance.no_transfers', "Transferlar topilmadi")}
                                />
                            ) : (
                                transfers.data.map((tr) => (
                                    <TableRow key={tr.id}>
                                        <TableCell className="font-medium">{tr.from_cash_register?.name}</TableCell>
                                        <TableCell className="font-medium">{tr.to_cash_register?.name}</TableCell>
                                        <TableCell className="font-bold">{Number(tr.amount).toLocaleString('uz-UZ')} UZS</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                tr.status === 'approved'
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                    : tr.status === 'pending'
                                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                            }`}>
                                                {tr.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">{tr.transferred_by?.name || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {tr.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApproveTransfer(tr)}
                                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                    {t('finance.approve', 'Tasdiqlash')}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Accept Payment Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowDownRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            {t('finance.accept_payment_title', 'To\'lov Qabul Qilish (Rasmiy Chek)')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
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
                                        sublabel: `Qarz: ${Number(c.debt_amount).toLocaleString('uz-UZ')} UZS`,
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
                                        { value: 'cash', label: '💵 Naqd pul' },
                                        { value: 'card_click', label: '💳 Karta / Click / Payme' },
                                        { value: 'bank_transfer', label: '🏦 Bank o\'tkazmasi' },
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
                            <Input
                                id="pay_amount"
                                type="number"
                                value={paymentForm.data.amount}
                                onChange={(e) => paymentForm.setData('amount', e.target.value)}
                                placeholder="1000000"
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

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={paymentForm.processing}>
                                {t('finance.confirm_payment', 'Chekni Chiqarish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Expense Modal */}
            <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                            {t('finance.add_expense_title', 'Yangi Xarajat (Chiqim)')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label required htmlFor="exp_register_id">{t('finance.register', 'Chiqim Kassasi')}</Label>
                                <SearchableSelect
                                    id="exp_register_id"
                                    value={expenseForm.data.cash_register_id}
                                    onChange={(val) => expenseForm.setData('cash_register_id', val)}
                                    options={cashRegisters.map((r) => ({
                                        value: r.id,
                                        label: r.name,
                                        sublabel: `${Number(r.balance).toLocaleString('uz-UZ')} UZS`,
                                    }))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label required htmlFor="exp_category_id">{t('finance.category', 'Kategoriya')}</Label>
                                <SearchableSelect
                                    id="exp_category_id"
                                    value={expenseForm.data.expense_category_id}
                                    onChange={(val) => expenseForm.setData('expense_category_id', val)}
                                    options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
                                    placeholder={t('finance.category', 'Kategoriya')}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label required htmlFor="exp_amount">{t('finance.amount', 'Summa (UZS)')}</Label>
                            <Input
                                id="exp_amount"
                                type="number"
                                value={expenseForm.data.amount}
                                onChange={(e) => expenseForm.setData('amount', e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label required htmlFor="exp_desc">{t('finance.description', 'Xarajat Tavsifi')}</Label>
                            <Input
                                id="exp_desc"
                                value={expenseForm.data.description}
                                onChange={(e) => expenseForm.setData('description', e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={expenseForm.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Transfer Modal */}
            <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {t('finance.transfer_title', 'Kassalararo Pul O\'tkazmasi')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
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
                            <Input
                                id="tr_amount"
                                type="number"
                                value={transferForm.data.amount}
                                onChange={(e) => transferForm.setData('amount', e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={transferForm.processing}>
                                {t('finance.send_transfer', 'O\'tkazish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Shift Modal */}
            <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {t('finance.shift_title', 'Kassa Smenasi (Ochish / Yopish)')}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Explanatory banner */}
                    <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-lg p-3 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                        <span className="font-semibold">{t('finance.shift_what_is', 'Kassa smenasi nima?')}:</span>{' '}
                        {t('finance.shift_explanation', "Kassir ish kunini boshlaganda smena ochadi va kun yakunida smenani yopadi. Bu davrda qancha pul kirim va chiqim bo'lgani aniq hisoblab boriladi.")}
                    </div>

                    {(() => {
                        const selectedRegister = cashRegisters.find((r) => r.id === Number(shiftForm.data.cash_register_id)) || cashRegisters[0];
                        return (
                            <form onSubmit={handleShiftSubmit} className="space-y-4 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label required htmlFor="sh_register">{t('finance.register', 'Kassa')}</Label>
                                        <SearchableSelect
                                            id="sh_register"
                                            value={shiftForm.data.cash_register_id}
                                            onChange={handleRegisterChange}
                                            options={cashRegisters.map((r) => ({
                                                value: r.id,
                                                label: r.name,
                                                sublabel: `${Number(r.balance).toLocaleString('uz-UZ')} UZS`,
                                            }))}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label required htmlFor="sh_action">{t('finance.action', 'Amal')}</Label>
                                        <SearchableSelect
                                            id="sh_action"
                                            value={shiftForm.data.action}
                                            onChange={handleActionChange}
                                            options={[
                                                { value: 'open', label: t('finance.shift_open_action', '🔓 Smenani Ochish') },
                                                { value: 'close', label: t('finance.shift_close_action', '🔒 Smenani Yopish') },
                                            ]}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Selected Register Status Info */}
                                {selectedRegister && (
                                    <div className="bg-gray-50 dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">{t('finance.current_register_balance', 'Hozirgi kassa balansi')}:</span>
                                            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                {Number(selectedRegister.balance).toLocaleString('uz-UZ')} UZS
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-700/60">
                                            <span className="text-gray-500 dark:text-gray-400">{t('finance.status', 'Holat')}:</span>
                                            {selectedRegister.open_shift ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    {t('finance.shift_status_open', 'Smena ochiq')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                    {t('finance.shift_status_closed', 'Smena yopiq (ochilmagan)')}
                                                </span>
                                            )}
                                        </div>
                                        {selectedRegister.open_shift && (
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                {t('finance.shift_opened_by_at', {
                                                    time: selectedRegister.open_shift.opened_at,
                                                    name: selectedRegister.open_shift.opened_by?.name || '-',
                                                })}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <Label required htmlFor="sh_balance">
                                        {shiftForm.data.action === 'open'
                                            ? t('finance.shift_opening_balance', "Boshlang'ich kassa qoldig'i (UZS)")
                                            : t('finance.shift_closing_balance', "Yakuniy kassa qoldig'i (UZS)")}
                                    </Label>
                                    <Input
                                        id="sh_balance"
                                        type="number"
                                        value={shiftForm.data.action === 'open' ? shiftForm.data.opening_balance : shiftForm.data.closing_balance}
                                        onChange={(e) => {
                                            if (shiftForm.data.action === 'open') {
                                                shiftForm.setData('opening_balance', e.target.value);
                                            } else {
                                                shiftForm.setData('closing_balance', e.target.value);
                                            }
                                        }}
                                        placeholder={String(selectedRegister?.balance || '0')}
                                        className="mt-1"
                                    />
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                        {shiftForm.data.action === 'open'
                                            ? t('finance.shift_open_hint', "Kassani qabul qilgandagi naqd/hisob qoldig'ini kiriting.")
                                            : t('finance.shift_close_hint', "Smena yakunida kassadagi haqiqiy qoldiqni kiriting. Kirim va chiqimlar avtomatik hisoblanadi.")}
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="sh_note">{t('finance.notes', 'Izoh')}</Label>
                                    <Input
                                        id="sh_note"
                                        value={shiftForm.data.note}
                                        onChange={(e) => shiftForm.setData('note', e.target.value)}
                                        placeholder={t('finance.notes_placeholder', 'Qo\'shimcha izoh yoki tafsilotlar...')}
                                        className="mt-1"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setShowShiftModal(false)}>
                                        {t('common.cancel', 'Bekor qilish')}
                                    </Button>
                                    <Button type="submit" variant="brand" disabled={shiftForm.processing}>
                                        {t('common.confirm', 'Tasdiqlash')}
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
