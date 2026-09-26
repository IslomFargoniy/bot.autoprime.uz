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
import { SearchableSelect } from '@/components/ui/searchable-select';

interface CashRegister {
    id: number;
    name: string;
    balance: number | string;
    type?: { id: number; code: string; name: string };
    branch?: { id: number; name: string };
    is_active: boolean;
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
    const shiftForm = useForm({
        cash_register_id: cashRegisters[0]?.id || '',
        action: 'open',
        opening_balance: '',
        closing_balance: '',
    });

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
                        className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between"
                    >
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

            {/* Tab: Payments */}
            {activeTab === 'payments' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('finance.receipt', 'Chek №')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.student', 'Talaba')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.contract', 'Shartnoma')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.amount', 'Summa')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.method', 'Usul')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.register', 'Kassa')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.cashier', 'Qabul qildi')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.date', 'Sana')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {payments.data.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                                    <td className="p-3.5 font-semibold text-gray-900 dark:text-white">#{p.receipt_number}</td>
                                    <td className="p-3.5 font-medium">{p.student?.full_name}</td>
                                    <td className="p-3.5 text-gray-500 dark:text-gray-400">#{p.contract?.contract_number}</td>
                                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                                        +{Number(p.amount).toLocaleString('uz-UZ')} UZS
                                    </td>
                                    <td className="p-3.5">
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-medium">
                                            {p.payment_method}
                                        </span>
                                    </td>
                                    <td className="p-3.5 text-gray-500 dark:text-gray-400">{p.cash_register?.name}</td>
                                    <td className="p-3.5 text-gray-500 dark:text-gray-400">{p.received_by?.name || '-'}</td>
                                    <td className="p-3.5 text-gray-400 dark:text-gray-500">{p.paid_at}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab: Expenses */}
            {activeTab === 'expenses' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('finance.category', 'Kategoriya')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.description', 'Tavsif')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.amount', 'Summa')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.register', 'Kassa')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.user', 'Xodim')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.date', 'Sana')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {expenses.data.map((e) => (
                                <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                                    <td className="p-3.5 font-medium">{e.category?.name || '-'}</td>
                                    <td className="p-3.5 text-gray-700 dark:text-gray-300">{e.description}</td>
                                    <td className="p-3.5 font-bold text-red-500 dark:text-red-400">
                                        -{Number(e.amount).toLocaleString('uz-UZ')} UZS
                                    </td>
                                    <td className="p-3.5 text-gray-500 dark:text-gray-400">{e.cash_register?.name}</td>
                                    <td className="p-3.5 text-gray-500 dark:text-gray-400">{e.user?.name || '-'}</td>
                                    <td className="p-3.5 text-gray-400 dark:text-gray-500">{e.expense_date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab: Shifts */}
            {activeTab === 'shifts' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('finance.register', 'Kassa')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.status', 'Holat')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.opening_balance', 'Boshlang\'ich')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.income', 'Jami Kirim')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.expense', 'Jami Chiqim')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.closing_balance', 'Yakuniy')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.opened_at', 'Ochilgan')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.closed_at', 'Yopilgan')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {shifts.data.map((sh) => (
                                <tr key={sh.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                                    <td className="p-3.5 font-medium">{sh.cash_register?.name}</td>
                                    <td className="p-3.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sh.status === 'open' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                            {sh.status === 'open' ? t('finance.open', 'Ochiq') : t('finance.closed', 'Yopiq')}
                                        </span>
                                    </td>
                                    <td className="p-3.5">{Number(sh.opening_balance).toLocaleString('uz-UZ')} UZS</td>
                                    <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-semibold">+{Number(sh.total_income).toLocaleString('uz-UZ')} UZS</td>
                                    <td className="p-3.5 text-red-500 dark:text-red-400 font-semibold">-{Number(sh.total_expense).toLocaleString('uz-UZ')} UZS</td>
                                    <td className="p-3.5 font-bold">{Number(sh.closing_balance || 0).toLocaleString('uz-UZ')} UZS</td>
                                    <td className="p-3.5 text-gray-400 dark:text-gray-500">{sh.opened_at}</td>
                                    <td className="p-3.5 text-gray-400 dark:text-gray-500">{sh.closed_at || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab: Transfers */}
            {activeTab === 'transfers' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('finance.from_register', 'Chiqim Kassasi')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.to_register', 'Qabul Qiluvchi Kassa')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.amount', 'Summa')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.status', 'Holat')}</th>
                                <th className="p-3.5 font-semibold">{t('finance.initiator', 'Yuboruvchi')}</th>
                                <th className="p-3.5 font-semibold text-right">{t('common.actions', 'Amallar')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {transfers.data.map((tr) => (
                                <tr key={tr.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                                    <td className="p-3.5 font-medium">{tr.from_cash_register?.name}</td>
                                    <td className="p-3.5 font-medium">{tr.to_cash_register?.name}</td>
                                    <td className="p-3.5 font-bold">{Number(tr.amount).toLocaleString('uz-UZ')} UZS</td>
                                    <td className="p-3.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                            tr.status === 'approved'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                : tr.status === 'pending'
                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                        }`}>
                                            {tr.status}
                                        </span>
                                    </td>
                                    <td className="p-3.5 text-gray-500 dark:text-gray-400">{tr.transferred_by?.name || '-'}</td>
                                    <td className="p-3.5 text-right">
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Accept Payment Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('finance.accept_payment_title', 'To\'lov Qabul Qilish (Rasmiy Chek)')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="pay_contract_id">{t('finance.select_contract', 'Shartnoma')}</Label>
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
                                <Label htmlFor="payment_method">{t('finance.method', 'To\'lov Usuli')}</Label>
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
                                <Label htmlFor="pay_register_id">{t('finance.cash_register', 'Kassa')}</Label>
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
                            <Label htmlFor="pay_amount">{t('finance.amount', 'To\'lov Summasi (UZS)')}</Label>
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
                        <DialogTitle>{t('finance.add_expense_title', 'Yangi Xarajat (Chiqim)')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="exp_register_id">{t('finance.register', 'Chiqim Kassasi')}</Label>
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
                                <Label htmlFor="exp_category_id">{t('finance.category', 'Kategoriya')}</Label>
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
                            <Label htmlFor="exp_amount">{t('finance.amount', 'Summa (UZS)')}</Label>
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
                            <Label htmlFor="exp_desc">{t('finance.description', 'Xarajat Tavsifi')}</Label>
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
                            <Button type="submit" disabled={expenseForm.processing}>
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
                        <DialogTitle>{t('finance.transfer_title', 'Kassalararo Pul O\'tkazmasi')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="tr_from">{t('finance.from_register', 'Chiqim Kassasi')}</Label>
                                <SearchableSelect
                                    id="tr_from"
                                    value={transferForm.data.from_cash_register_id}
                                    onChange={(val) => transferForm.setData('from_cash_register_id', val)}
                                    options={cashRegisters.map((r) => ({ value: r.id, label: r.name }))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="tr_to">{t('finance.to_register', 'Qabul Qiluvchi Kassa')}</Label>
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
                            <Label htmlFor="tr_amount">{t('finance.amount', 'O\'tkaziladigan Summa (UZS)')}</Label>
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
                            <Button type="submit" disabled={transferForm.processing}>
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
                        <DialogTitle>{t('finance.shift_title', 'Kassa Smenasi (Ochish / Yopish)')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleShiftSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="sh_register">{t('finance.register', 'Kassa')}</Label>
                                <SearchableSelect
                                    id="sh_register"
                                    value={shiftForm.data.cash_register_id}
                                    onChange={(val) => shiftForm.setData('cash_register_id', val)}
                                    options={cashRegisters.map((r) => ({ value: r.id, label: r.name }))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="sh_action">{t('finance.action', 'Amal')}</Label>
                                <SearchableSelect
                                    id="sh_action"
                                    value={shiftForm.data.action}
                                    onChange={(val) => shiftForm.setData('action', val)}
                                    options={[
                                        { value: 'open', label: '🔓 Smenani Ochish' },
                                        { value: 'close', label: '🔒 Smenani Yopish' },
                                    ]}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="sh_balance">
                                {shiftForm.data.action === 'open' ? t('finance.opening_balance', 'Boshlang\'ich qoldiq (UZS)') : t('finance.closing_balance', 'Yopilish qoldig\'i (UZS)')}
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
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowShiftModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" disabled={shiftForm.processing}>
                                {t('common.confirm', 'Tasdiqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
