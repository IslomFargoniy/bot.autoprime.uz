import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Wallet,
    ArrowDownRight,
    ArrowUpRight,
    ArrowLeftRight,
    CheckCircle2,
    DollarSign,
    CreditCard,
    Building2,
    Trash2,
    History,
    ArrowDownToLine,
    ShieldCheck,
    Search,
    RotateCcw,
    ArrowRight,
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
import Pagination from '@/components/pagination';

interface CashRegister {
    id: number;
    branch_id?: number | null;
    cash_register_type_id?: number;
    name: string;
    balance: number | string;
    type?: { id: number; code: string; name: string };
    branch?: { id: number; name: string } | null;
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
    spent_at?: string;
    expense_date?: string;
    category?: { name: string };
    cash_register?: { name: string };
    user?: { name: string };
}

interface CashTransaction {
    id: number;
    cash_register_id: number;
    type: 'in' | 'out';
    category: 'payment' | 'expense' | 'transfer_in' | 'transfer_out' | 'sweep_in' | 'sweep_out' | 'refund' | 'initial';
    amount: number | string;
    balance_before: number | string;
    balance_after: number | string;
    description?: string;
    user?: { name: string };
    cash_register?: {
        id: number;
        name: string;
        branch?: { id: number; name: string } | null;
        type?: { id: number; name: string; code: string };
    };
    transacted_at: string;
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
    superadminRegisters: CashRegister[];
    payments: { data: Payment[]; links: any[]; total: number; current_page: number; last_page: number };
    expenses: { data: Expense[]; links: any[]; total: number; current_page: number; last_page: number };
    transactions: { data: CashTransaction[]; links: any[]; total: number; current_page: number; last_page: number };
    transfers: { data: CashTransfer[]; links: any[]; total: number; current_page: number; last_page: number };
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
    filters?: {
        branch_id?: string | number;
        history_register_id?: string | number;
        history_category?: string;
        history_from?: string;
        history_to?: string;
    };
}

export default function FinanceIndex({
    cashRegisters,
    superadminRegisters = [],
    payments,
    expenses,
    transactions,
    transfers,
    branches,
    expenseCategories,
    registerTypes,
    contracts,
    students = [],
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'registers' | 'history' | 'payments' | 'expenses' | 'transfers'>('registers');

    // Modals
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showSweepModal, setShowSweepModal] = useState(false);

    // Sweep Modal State
    const [sweepItems, setSweepItems] = useState<Array<{
        cash_register_id: number;
        name: string;
        branch_name: string;
        type_name: string;
        target_name: string;
        balance: number;
        amount: number;
        selected: boolean;
    }>>([]);
    const [sweepNotes, setSweepNotes] = useState('');
    const [isSweeping, setIsSweeping] = useState(false);

    // History Filters State
    const [historyRegId, setHistoryRegId] = useState<string | number>(filters.history_register_id || '');
    const [historyCat, setHistoryCat] = useState<string>(filters.history_category || '');
    const [historyFrom, setHistoryFrom] = useState<string>(filters.history_from || '');
    const [historyTo, setHistoryTo] = useState<string>(filters.history_to || '');

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

    const openSweepModal = (specificRegId?: number) => {
        // Collect all branch registers (branch_id != null)
        const branchRegs = cashRegisters.filter((r) => r.branch_id !== null && r.branch_id !== undefined);
        const mapped = branchRegs.map((reg) => {
            const currentBal = Number(reg.balance) || 0;
            const targetSuper = superadminRegisters.find((s) => s.type?.id === reg.type?.id || s.cash_register_type_id === reg.cash_register_type_id)
                || superadminRegisters[0];

            const isTarget = specificRegId ? reg.id === specificRegId : currentBal > 0;

            return {
                cash_register_id: reg.id,
                name: reg.name,
                branch_name: reg.branch?.name || t('branches.unknown', 'Filial'),
                type_name: reg.type?.name || t('finance.cash_register', 'Kassa'),
                target_name: targetSuper ? targetSuper.name : t('finance.superadmin_cash_register', 'Bosh kassa (Superadmin)'),
                balance: currentBal,
                amount: currentBal,
                selected: isTarget,
            };
        });

        setSweepItems(mapped);
        setSweepNotes('');
        setShowSweepModal(true);
    };

    const handleSelectRegisterHistory = (registerId: number) => {
        setHistoryRegId(registerId);
        setActiveTab('history');
        router.get('/admin/finance', {
            ...filters,
            history_register_id: registerId,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleFilterHistory = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/finance', {
            ...filters,
            history_register_id: historyRegId || undefined,
            history_category: historyCat || undefined,
            history_from: historyFrom || undefined,
            history_to: historyTo || undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleResetHistory = () => {
        setHistoryRegId('');
        setHistoryCat('');
        setHistoryFrom('');
        setHistoryTo('');
        router.get('/admin/finance', {
            branch_id: filters.branch_id,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSweepSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selected = sweepItems
            .filter((item) => item.selected && item.amount > 0)
            .map((item) => ({
                cash_register_id: item.cash_register_id,
                amount: item.amount,
            }));

        if (selected.length === 0) {
            toast.error(t('finance.no_registers_selected', 'Kamida bitta kassani tanlang'));
            return;
        }

        setIsSweeping(true);
        router.post('/admin/finance/sweep', {
            registers: selected,
            notes: sweepNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowSweepModal(false);
                setIsSweeping(false);
                toast.success(t('finance.sweep_success', 'Kassalar muvaffaqiyatli bo\'shatildi!'));
            },
            onError: (err) => {
                setIsSweeping(false);
                toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi'));
            },
        });
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post('/admin/finance/payment', {
            onSuccess: () => {
                setShowPaymentModal(false);
                paymentForm.reset('amount', 'notes');
                toast.success(t('finance.payment_success', 'To\'lov qabul qilindi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        expenseForm.post('/admin/finance/expense', {
            onSuccess: () => {
                setShowExpenseModal(false);
                expenseForm.reset('amount', 'description');
                toast.success(t('finance.expense_success', 'Xarajat kiritildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transferForm.post('/admin/finance/transfer', {
            onSuccess: () => {
                setShowTransferModal(false);
                transferForm.reset('amount', 'notes');
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

    const totalSweepAmount = sweepItems
        .filter((i) => i.selected)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const renderCategoryBadge = (category: string) => {
        switch (category) {
            case 'payment':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        {t('finance.op_payment', 'Kirim: To\'lov')}
                    </span>
                );
            case 'expense':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
                        {t('finance.op_expense', 'Chiqim: Xarajat')}
                    </span>
                );
            case 'salary':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300">
                        {t('finance.op_salary', 'Oylik maosh')}
                    </span>
                );
            case 'maintenance':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300">
                        {t('finance.op_maintenance', 'Avtotransport')}
                    </span>
                );
            case 'transfer_in':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                        {t('finance.op_transfer_in', 'Transfer (Kirim)')}
                    </span>
                );
            case 'transfer_out':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">
                        {t('finance.op_transfer_out', 'Transfer (Chiqim)')}
                    </span>
                );
            case 'sweep_out':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                        {t('finance.op_sweep_out', 'Kassani bo\'shatish (Chiqim)')}
                    </span>
                );
            case 'sweep_in':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        {t('finance.op_sweep_in', 'Kassa bo\'shatishdan (Kirim)')}
                    </span>
                );
            case 'refund':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                        {t('finance.op_refund', 'Bekor qilish / Qaytarish')}
                    </span>
                );
            case 'initial':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                        {t('finance.op_initial', 'Boshlang\'ich qoldiq')}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {category}
                    </span>
                );
        }
    };

    return (
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
            <Head title={t('finance.title', 'Moliya va Kassalar')} />

            {/* Page Title & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold">{t('finance.title', 'Moliya va Kassalar')}</h1>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    <Button onClick={() => openSweepModal()} variant="brand" className="text-xs h-9 justify-center">
                        <ArrowDownToLine className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="truncate">{t('finance.empty_registers', 'Kassalarni bo\'shatish')}</span>
                    </Button>
                    <Button onClick={() => setShowPaymentModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white h-9 justify-center">
                        <ArrowDownRight className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="truncate">{t('finance.accept_payment', 'To\'lov Qabul Qilish')}</span>
                    </Button>
                    <Button onClick={() => setShowExpenseModal(true)} variant="outline" className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 h-9 justify-center">
                        <ArrowUpRight className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="truncate">{t('finance.add_expense', 'Chiqim Qilish')}</span>
                    </Button>
                    <Button onClick={() => setShowTransferModal(true)} variant="outline" className="text-xs h-9 justify-center">
                        <ArrowLeftRight className="w-4 h-4 mr-1.5 shrink-0" />
                        <span className="truncate">{t('finance.transfer', 'Transfer')}</span>
                    </Button>
                </div>
            </div>

            {/* Cash Registers Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {cashRegisters.map((reg) => {
                    const isSuperadmin = reg.branch_id === null || reg.branch_id === undefined;
                    const canSweep = !isSuperadmin && Number(reg.balance) > 0;

                    return (
                        <div
                            key={reg.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    <div className="flex items-center gap-1.5 truncate">
                                        {reg.type?.code === 'cash' ? <DollarSign className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                        <span className="font-medium truncate">{reg.type?.name || 'Kassa'}</span>
                                    </div>
                                    {isSuperadmin ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shrink-0">
                                            <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                            {t('finance.superadmin_cash_register', 'Superadmin')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shrink-0">
                                            <Building2 className="w-3 h-3 text-gray-500" />
                                            {reg.branch?.name || t('branches.unknown', 'Filial')}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">{reg.name}</h3>
                                <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                                    {Number(reg.balance).toLocaleString('uz-UZ')} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">UZS</span>
                                </p>
                            </div>

                            {/* Card Footer Actions: Tarix and Bo'shatish */}
                            <div className={`mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 ${canSweep ? 'grid grid-cols-2 gap-2' : 'flex justify-end'}`}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectRegisterHistory(reg.id)}
                                    className="h-8 gap-1.5 text-xs justify-center"
                                >
                                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>{t('finance.view_history', 'Tarix')}</span>
                                </Button>

                                {canSweep && (
                                    <Button
                                        type="button"
                                        variant="brand"
                                        size="sm"
                                        onClick={() => openSweepModal(reg.id)}
                                        className="h-8 gap-1.5 text-xs justify-center"
                                    >
                                        <ArrowDownToLine className="w-3.5 h-3.5" />
                                        <span>{t('finance.empty_this_register', 'Bo\'shatish')}</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-medium w-full sm:w-max gap-1">
                <button
                    onClick={() => setActiveTab('registers')}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                        activeTab === 'registers' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_registers', 'Kassalar')}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                        activeTab === 'history' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_history', 'Kassa Tarixi')}
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                        activeTab === 'payments' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_payments', 'Kirim To\'lovlar')}
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                        activeTab === 'expenses' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_expenses', 'Chiqim Xarajatlar')}
                </button>
                <button
                    onClick={() => setActiveTab('transfers')}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                        activeTab === 'transfers' ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {t('finance.tab_transfers', 'Transferlar')}
                </button>
            </div>

            {/* Tab: Registers Overview */}
            {activeTab === 'registers' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('finance.register_name', 'Kassa Nomi')}</TableHead>
                                    <TableHead>{t('finance.type', 'Turi')}</TableHead>
                                    <TableHead>{t('finance.branch', 'Filial')}</TableHead>
                                    <TableHead>{t('finance.balance', 'Balans')}</TableHead>
                                    <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cashRegisters.length === 0 ? (
                                    <TableEmpty
                                        colSpan={5}
                                        icon={<Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                        title={t('finance.no_registers', 'Kassalar topilmadi')}
                                    />
                                ) : (
                                    cashRegisters.map((reg) => {
                                        const isSuperadmin = reg.branch_id === null || reg.branch_id === undefined;
                                        const canSweep = !isSuperadmin && Number(reg.balance) > 0;

                                        return (
                                            <TableRow key={reg.id}>
                                                <TableCell className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                                                    <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span>{reg.name}</span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                                        {reg.type?.name || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {isSuperadmin ? (
                                                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-indigo-600 dark:text-indigo-400">
                                                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                                            {t('finance.superadmin_cash_register', 'Superadmin Bosh kassa')}
                                                        </span>
                                                    ) : (
                                                        reg.branch?.name || '-'
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                                                    {Number(reg.balance).toLocaleString('uz-UZ')} UZS
                                                </TableCell>
                                                <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSelectRegisterHistory(reg.id)}
                                                        className="h-8 gap-1 text-xs"
                                                    >
                                                        <History className="w-3.5 h-3.5" />
                                                        {t('finance.view_history', 'Tarix')}
                                                    </Button>
                                                    {canSweep && (
                                                        <Button
                                                            size="sm"
                                                            variant="brand"
                                                            onClick={() => openSweepModal(reg.id)}
                                                            className="h-8 gap-1 text-xs"
                                                        >
                                                            <ArrowDownToLine className="w-3.5 h-3.5" />
                                                            {t('finance.empty_this_register', 'Bo\'shatish')}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Tab: Kassa Tarixi (Ledger / Running Balance) */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                        <form onSubmit={handleFilterHistory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                            <div>
                                <Label htmlFor="hist_reg" className="text-xs mb-1 block">
                                    {t('finance.cash_register', 'Kassa')}
                                </Label>
                                <SearchableSelect
                                    id="hist_reg"
                                    value={historyRegId}
                                    onChange={(val) => setHistoryRegId(val)}
                                    options={[
                                        { value: '', label: t('finance.all_registers', 'Barcha kassalar') },
                                        ...cashRegisters.map((r) => ({
                                            value: r.id,
                                            label: r.name,
                                            sublabel: r.branch?.name || t('finance.superadmin_cash_register', 'Superadmin Bosh kassa'),
                                        })),
                                    ]}
                                    placeholder={t('finance.all_registers', 'Barcha kassalar')}
                                />
                            </div>

                            <div>
                                <Label htmlFor="hist_cat" className="text-xs mb-1 block">
                                    {t('finance.operation_type', 'Amal turi')}
                                </Label>
                                <SearchableSelect
                                    id="hist_cat"
                                    value={historyCat}
                                    onChange={(val) => setHistoryCat(String(val))}
                                    options={[
                                        { value: '', label: t('finance.all_categories', 'Barcha amallar') },
                                        { value: 'payment', label: t('finance.op_payment', 'Kirim: To\'lov') },
                                        { value: 'expense', label: t('finance.op_expense', 'Chiqim: Xarajat') },
                                        { value: 'salary', label: t('finance.op_salary', 'Oylik maosh') },
                                        { value: 'maintenance', label: t('finance.op_maintenance', 'Avtotransport') },
                                        { value: 'sweep_out', label: t('finance.op_sweep_out', 'Kassani bo\'shatish (Chiqim)') },
                                        { value: 'sweep_in', label: t('finance.op_sweep_in', 'Kassa bo\'shatishdan (Kirim)') },
                                        { value: 'transfer_out', label: t('finance.op_transfer_out', 'Transfer (Chiqim)') },
                                        { value: 'transfer_in', label: t('finance.op_transfer_in', 'Transfer (Kirim)') },
                                        { value: 'refund', label: t('finance.op_refund', 'Bekor qilish / Qaytarish') },
                                    ]}
                                    placeholder={t('finance.all_categories', 'Barcha amallar')}
                                />
                            </div>

                            <div>
                                <Label htmlFor="hist_from" className="text-xs mb-1 block">{t('common.from', 'Dan')}</Label>
                                <Input
                                    id="hist_from"
                                    type="date"
                                    value={historyFrom}
                                    onChange={(e) => setHistoryFrom(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div>
                                <Label htmlFor="hist_to" className="text-xs mb-1 block">{t('common.to', 'Gacha')}</Label>
                                <Input
                                    id="hist_to"
                                    type="date"
                                    value={historyTo}
                                    onChange={(e) => setHistoryTo(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" variant="brand" size="sm" className="h-9 gap-1 flex-1 justify-center">
                                    <Search className="w-3.5 h-3.5" />
                                    <span>{t('common.filter', 'Filtrlash')}</span>
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleResetHistory} className="h-9 px-3" title={t('common.reset', 'Tozalash')}>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Desktop & Tablet Transactions Table */}
                    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">№</TableHead>
                                        <TableHead>{t('finance.date', 'Sana va Vaqt')}</TableHead>
                                        <TableHead>{t('finance.cash_register', 'Kassa')}</TableHead>
                                        <TableHead>{t('finance.operation_type', 'Amal turi')}</TableHead>
                                        <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                        <TableHead className="font-semibold text-gray-900 dark:text-white">
                                            {t('finance.balance_after', 'Amaldan keyingi balans')}
                                        </TableHead>
                                        <TableHead>{t('finance.description', 'Tavsif')}</TableHead>
                                        <TableHead>{t('finance.user', 'Xodim')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.data.length === 0 ? (
                                        <TableEmpty
                                            colSpan={8}
                                            icon={<History className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                            title={t('finance.no_transactions', 'Kassa amallari tarixi topilmadi')}
                                            description={t('finance.no_transactions_desc', 'Kassada kirim, chiqim yoki transfer amallari bajarilganda bu yerda aks etadi')}
                                        />
                                    ) : (
                                        transactions.data.map((tx, idx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="text-gray-400 font-mono text-xs">{idx + 1}</TableCell>
                                                <TableCell className="text-gray-600 dark:text-gray-300 font-mono text-xs whitespace-nowrap">
                                                    {tx.transacted_at ? new Date(tx.transacted_at).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    <div>{tx.cash_register?.name}</div>
                                                    {tx.cash_register?.branch && (
                                                        <div className="text-[10px] text-gray-400">{tx.cash_register.branch.name}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {renderCategoryBadge(tx.category)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap font-mono font-bold">
                                                    {tx.type === 'in' ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400">
                                                            +{Number(tx.amount).toLocaleString('uz-UZ')} UZS
                                                        </span>
                                                    ) : (
                                                        <span className="text-rose-600 dark:text-rose-400">
                                                            -{Number(tx.amount).toLocaleString('uz-UZ')} UZS
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-gray-100 dark:bg-gray-700/80 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                                                        {Number(tx.balance_after).toLocaleString('uz-UZ')} UZS
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300 text-xs max-w-xs truncate">
                                                    {tx.description || '-'}
                                                </TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                                    {tx.user?.name || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Mobile Transactions Card Feed */}
                    <div className="md:hidden space-y-3">
                        {transactions.data.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                                <History className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_transactions', 'Kassa amallari tarixi topilmadi')}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('finance.no_transactions_desc', 'Kassada kirim, chiqim yoki transfer amallari bajarilganda bu yerda aks etadi')}</p>
                            </div>
                        ) : (
                            transactions.data.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {renderCategoryBadge(tx.category)}
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {tx.transacted_at ? new Date(tx.transacted_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {tx.type === 'in' ? (
                                                <span className="font-mono font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                                                    +{Number(tx.amount).toLocaleString('uz-UZ')} <span className="text-[10px] font-normal">UZS</span>
                                                </span>
                                            ) : (
                                                <span className="font-mono font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400">
                                                    -{Number(tx.amount).toLocaleString('uz-UZ')} <span className="text-[10px] font-normal">UZS</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50 dark:border-gray-700/50">
                                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium truncate">
                                            <Wallet className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{tx.cash_register?.name}</span>
                                            {tx.cash_register?.branch && (
                                                <span className="text-[10px] text-gray-400">({tx.cash_register.branch.name})</span>
                                            )}
                                        </div>
                                        <div className="text-[11px] shrink-0 text-gray-500 dark:text-gray-400">
                                            <span>{t('finance.balance_after', 'Balans')}: </span>
                                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                                {Number(tx.balance_after).toLocaleString('uz-UZ')} UZS
                                            </span>
                                        </div>
                                    </div>

                                    {(tx.description || tx.user?.name) && (
                                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 p-2 rounded-lg gap-2">
                                            <span className="truncate">{tx.description || '-'}</span>
                                            {tx.user?.name && <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">{tx.user.name}</span>}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <Pagination links={transactions.links} />
                </div>
            )}

            {/* Tab: Payments */}
            {activeTab === 'payments' && (
                <div className="space-y-4">
                    {/* Desktop & Tablet Table */}
                    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('finance.receipt', 'Chek №')}</TableHead>
                                        <TableHead>{t('finance.student', 'Talaba')}</TableHead>
                                        <TableHead>{t('finance.contract', 'Shartnoma')}</TableHead>
                                        <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                        <TableHead>{t('finance.method', 'Usul')}</TableHead>
                                        <TableHead>{t('finance.register', 'Kassa')}</TableHead>
                                        <TableHead>{t('finance.receiver', 'Qabul qildi')}</TableHead>
                                        <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.data.length === 0 ? (
                                        <TableEmpty
                                            colSpan={9}
                                            icon={<ArrowDownRight className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                            title={t('finance.no_payments', 'To\'lovlar topilmadi')}
                                        />
                                    ) : (
                                        payments.data.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono font-medium whitespace-nowrap">{p.receipt_number}</TableCell>
                                                <TableCell className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                    {p.student?.full_name}
                                                </TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {p.contract?.contract_number ? `#${p.contract.contract_number}` : '-'}
                                                </TableCell>
                                                <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                                                    +{Number(p.amount).toLocaleString('uz-UZ')} UZS
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                        {p.payment_method}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.cash_register?.name}</TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.received_by?.name || '-'}</TableCell>
                                                <TableCell className="text-gray-400 dark:text-gray-500 whitespace-nowrap">{p.paid_at}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
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
                    </div>

                    {/* Mobile Payments Card Feed */}
                    <div className="md:hidden space-y-3">
                        {payments.data.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                                <ArrowDownRight className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_payments', 'To\'lovlar topilmadi')}</p>
                            </div>
                        ) : (
                            payments.data.map((p) => (
                                <div
                                    key={p.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-bold text-sm text-gray-900 dark:text-white">{p.student?.full_name || '-'}</div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                                                <span>#{p.receipt_number}</span>
                                                {p.contract?.contract_number && (
                                                    <>
                                                        <span>•</span>
                                                        <span>#{p.contract.contract_number}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-mono font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                                                +{Number(p.amount).toLocaleString('uz-UZ')} <span className="text-[10px] font-normal">UZS</span>
                                            </div>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mt-0.5">
                                                {p.payment_method}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400">
                                        <div className="truncate">
                                            <span>{p.cash_register?.name}</span>
                                            {p.received_by?.name && <span className="text-[11px] text-gray-400"> ({p.received_by.name})</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-mono">{p.paid_at}</span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeletePayment(p)}
                                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                title={t('common.delete', "O'chirish")}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Pagination links={payments.links} />
                </div>
            )}

            {/* Tab: Expenses */}
            {activeTab === 'expenses' && (
                <div className="space-y-4">
                    {/* Desktop & Tablet Table */}
                    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
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
                                            title={t('finance.no_expenses', 'Xarajatlar topilmadi')}
                                        />
                                    ) : (
                                        expenses.data.map((e) => (
                                            <TableRow key={e.id}>
                                                <TableCell className="font-medium whitespace-nowrap">{e.category?.name || '-'}</TableCell>
                                                <TableCell className="text-gray-700 dark:text-gray-300">{e.description}</TableCell>
                                                <TableCell className="font-bold text-red-500 dark:text-red-400 font-mono whitespace-nowrap">
                                                    -{Number(e.amount).toLocaleString('uz-UZ')} UZS
                                                </TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{e.cash_register?.name}</TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{e.user?.name || '-'}</TableCell>
                                                <TableCell className="text-gray-400 dark:text-gray-500 whitespace-nowrap">{e.spent_at || e.expense_date || '-'}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
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
                    </div>

                    {/* Mobile Expenses Card Feed */}
                    <div className="md:hidden space-y-3">
                        {expenses.data.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                                <ArrowUpRight className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_expenses', 'Xarajatlar topilmadi')}</p>
                            </div>
                        ) : (
                            expenses.data.map((e) => (
                                <div
                                    key={e.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                                                {e.category?.name || '-'}
                                            </span>
                                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-1">{e.description}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-mono font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400">
                                                -{Number(e.amount).toLocaleString('uz-UZ')} <span className="text-[10px] font-normal">UZS</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400">
                                        <div className="truncate">
                                            <span>{e.cash_register?.name}</span>
                                            {e.user?.name && <span className="text-[11px] text-gray-400"> ({e.user.name})</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-mono">{e.spent_at || e.expense_date || '-'}</span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteExpense(e)}
                                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                title={t('common.delete', "O'chirish")}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Pagination links={expenses.links} />
                </div>
            )}

            {/* Tab: Transfers */}
            {activeTab === 'transfers' && (
                <div className="space-y-4">
                    {/* Desktop & Tablet Table */}
                    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('finance.from_register', 'Chiqim Kassasi')}</TableHead>
                                        <TableHead>{t('finance.to_register', 'Qabul Qiluvchi Kassa')}</TableHead>
                                        <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                        <TableHead>{t('finance.status', 'Holat')}</TableHead>
                                        <TableHead>{t('finance.sender', 'Yubordi')}</TableHead>
                                        <TableHead>{t('finance.approver', 'Tasdiqladi')}</TableHead>
                                        <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfers.data.length === 0 ? (
                                        <TableEmpty
                                            colSpan={8}
                                            icon={<ArrowLeftRight className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                                            title={t('finance.no_transfers', 'Transferlar topilmadi')}
                                        />
                                    ) : (
                                        transfers.data.map((tr) => (
                                            <TableRow key={tr.id}>
                                                <TableCell className="font-medium whitespace-nowrap">{tr.from_cash_register?.name}</TableCell>
                                                <TableCell className="font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                                    {tr.to_cash_register?.name}
                                                </TableCell>
                                                <TableCell className="font-bold text-gray-900 dark:text-white font-mono whitespace-nowrap">
                                                    {Number(tr.amount).toLocaleString('uz-UZ')} UZS
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                            tr.status === 'approved'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                                : tr.status === 'pending'
                                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                                        }`}
                                                    >
                                                        {tr.status === 'approved' ? t('finance.approved', 'Tasdiqlangan') : tr.status === 'pending' ? t('finance.pending', 'Kutilmoqda') : t('finance.rejected', 'Rad etilgan')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{tr.transferred_by?.name || '-'}</TableCell>
                                                <TableCell className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{tr.approved_by?.name || '-'}</TableCell>
                                                <TableCell className="text-gray-400 dark:text-gray-500 whitespace-nowrap">{tr.created_at}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
                                                    {tr.status === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            variant="brand"
                                                            onClick={() => handleApproveTransfer(tr)}
                                                            className="h-7 text-xs"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                            {t('common.confirm', 'Tasdiqlash')}
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

                    {/* Mobile Transfers Card Feed */}
                    <div className="md:hidden space-y-3">
                        {transfers.data.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                                <ArrowLeftRight className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{t('finance.no_transfers', 'Transferlar topilmadi')}</p>
                            </div>
                        ) : (
                            transfers.data.map((tr) => (
                                <div
                                    key={tr.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    tr.status === 'approved'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                        : tr.status === 'pending'
                                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                        : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                                }`}
                                            >
                                                {tr.status === 'approved' ? t('finance.approved', 'Tasdiqlangan') : tr.status === 'pending' ? t('finance.pending', 'Kutilmoqda') : t('finance.rejected', 'Rad etilgan')}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-mono">{tr.created_at}</span>
                                        </div>
                                        <div className="font-mono font-bold text-sm sm:text-base text-gray-900 dark:text-white shrink-0">
                                            {Number(tr.amount).toLocaleString('uz-UZ')} <span className="text-[10px] font-normal">UZS</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/40 p-2 rounded-lg">
                                        <span className="truncate">{tr.from_cash_register?.name}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        <span className="text-blue-600 dark:text-blue-400 truncate">{tr.to_cash_register?.name}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400">
                                        <div className="text-[11px] truncate">
                                            <span>{tr.transferred_by?.name || '-'}</span>
                                            {tr.approved_by?.name && <span> → {tr.approved_by.name}</span>}
                                        </div>
                                        {tr.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                variant="brand"
                                                onClick={() => handleApproveTransfer(tr)}
                                                className="h-7 text-xs px-2.5"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                {t('common.confirm', 'Tasdiqlash')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Pagination links={transfers.links} />
                </div>
            )}

            {/* Sweep Modal (Kassalarni bo'shatish) */}
            <Dialog open={showSweepModal} onOpenChange={setShowSweepModal}>
                <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <ArrowDownToLine className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{t('finance.sweep_title', 'Kassalarni bo\'shatish va Superadminga o\'tkazish')}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        {t('finance.sweep_desc', 'Filiallardagi kassalarning mablag\'lari o\'z turiga mos Superadmin kassasiga to\'liq yoki qisman transfer qilinadi.')}
                    </div>

                    <form onSubmit={handleSweepSubmit} className="space-y-4 text-xs">
                        <div className="max-h-72 overflow-y-auto border rounded-xl divide-y dark:divide-gray-700">
                            {sweepItems.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                    {t('finance.no_registers_to_sweep', 'Bo\'shatish uchun filial kassalari topilmadi')}
                                </div>
                            ) : (
                                sweepItems.map((item, idx) => (
                                    <div key={item.cash_register_id} className={`p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors ${item.selected ? 'bg-amber-50/40 dark:bg-amber-950/20' : 'bg-white dark:bg-gray-800'}`}>
                                        <div className="flex items-start sm:items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                id={`sweep_item_${item.cash_register_id}`}
                                                checked={item.selected}
                                                onChange={(e) => {
                                                    const updated = [...sweepItems];
                                                    updated[idx].selected = e.target.checked;
                                                    setSweepItems(updated);
                                                }}
                                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 mt-1 sm:mt-0 shrink-0"
                                            />
                                            <div>
                                                <label htmlFor={`sweep_item_${item.cash_register_id}`} className="font-semibold text-gray-900 dark:text-white cursor-pointer block text-xs sm:text-sm">
                                                    {item.name}
                                                </label>
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                                                    <span>{item.branch_name}</span>
                                                    <span>•</span>
                                                    <span className="font-medium text-amber-700 dark:text-amber-400">
                                                        {t('finance.target_superadmin_register', 'Qabul qiluvchi')}: {item.target_name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3 pl-6 sm:pl-0">
                                            <div className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-right">
                                                <span className="sm:hidden">{t('finance.balance', 'Balans')}: </span>
                                                <span className="font-bold text-gray-900 dark:text-white font-mono">{Number(item.balance).toLocaleString('uz-UZ')} UZS</span>
                                            </div>
                                            {item.selected && (
                                                <Input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) => {
                                                        const updated = [...sweepItems];
                                                        updated[idx].amount = Number(e.target.value);
                                                        setSweepItems(updated);
                                                    }}
                                                    max={item.balance}
                                                    min={0.01}
                                                    className="w-32 sm:w-36 h-8 text-xs font-mono font-bold text-right"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div>
                            <Label htmlFor="sweep_notes">{t('finance.notes', 'Izoh')}</Label>
                            <Input
                                id="sweep_notes"
                                value={sweepNotes}
                                onChange={(e) => setSweepNotes(e.target.value)}
                                placeholder={t('finance.sweep_notes_placeholder', 'Masalan: Hafta yakuni bo\'yicha tushumlarni topshirish...')}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('finance.sweep_total', 'Jami o\'tkazilayotgan mablag\'')}:</span>
                                <div className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                                    {totalSweepAmount.toLocaleString('uz-UZ')} UZS
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowSweepModal(false)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" variant="brand" disabled={isSweeping || totalSweepAmount <= 0}>
                                    <ArrowDownToLine className="w-4 h-4 mr-1.5 shrink-0" />
                                    <span className="truncate">{t('finance.confirm_sweep', 'Bo\'shatish va o\'tkazish')}</span>
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <ArrowDownRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{t('finance.accept_payment_title', 'To\'lov Qabul Qilish (Rasmiy Chek)')}</span>
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

                        <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={paymentForm.processing}>
                                {t('finance.confirm_payment', 'Chekni Chiqarish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Expense Modal */}
            <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
                <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                            <span>{t('finance.add_expense_title', 'Yangi Xarajat (Chiqim)')}</span>
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

                        <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-2">
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
                <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>{t('finance.transfer_title', 'Kassalararo Pul O\'tkazmasi')}</span>
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
        </div>
    );
}
