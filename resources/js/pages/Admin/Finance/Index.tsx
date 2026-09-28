import { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import type { SharedData } from '@/types/auth';
import { useTranslation } from 'react-i18next';
import {
    ArrowDownRight,
    ArrowUpRight,
    ArrowLeftRight,
    ArrowDownToLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCan } from '@/hooks/use-can';

import type { PageProps, Payment, Expense, CashTransfer, SweepItem } from './types';
import { RegisterCardsGrid } from './components/RegisterCardsGrid';
import { CashRegistersTab } from './components/CashRegistersTab';
import { CashHistoryTab } from './components/CashHistoryTab';
import { PaymentsTab } from './components/PaymentsTab';
import { ExpensesTab } from './components/ExpensesTab';
import { TransfersTab } from './components/TransfersTab';
import { SweepModal } from './components/modals/SweepModal';
import { PaymentModal } from './components/modals/PaymentModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { TransferModal } from './components/modals/TransferModal';

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
    const can = useCan();
    const { auth } = usePage<SharedData>().props;

    // The sender may not review their own transfer (superadmins excepted), mirroring the backend.
    const canReviewTransfer = (transfer: CashTransfer) =>
        can('cash_transfers.approve') && (auth.is_super_admin || transfer.sent_by_user_id !== auth.user.id);

    const [activeTab, setActiveTab] = useState<'registers' | 'history' | 'payments' | 'expenses' | 'transfers'>('registers');

    // Modals visibility
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showSweepModal, setShowSweepModal] = useState(false);

    // Sweep Modal State
    const [sweepItems, setSweepItems] = useState<SweepItem[]>([]);
    const [sweepNotes, setSweepNotes] = useState('');
    const [isSweeping, setIsSweeping] = useState(false);

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
        const branchRegs = cashRegisters.filter((r) => r.branch_id !== null && r.branch_id !== undefined);
        const mapped = branchRegs.map((reg) => {
            const currentBal = Number(reg.balance) || 0;
            const targetSuper = superadminRegisters.find(
                (s) => s.type?.id === reg.type?.id || s.cash_register_type_id === reg.cash_register_type_id
            ) || superadminRegisters[0];

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
        setActiveTab('history');
        router.get('/admin/finance', {
            ...filters,
            history_register_id: registerId,
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
                toast.success(t('finance.sweep_request_sent', 'Kassa bo\'shatish so\'rovi yuborildi! Admin tasdiqlashi kutilmoqda.'));
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

    const handleRejectTransfer = (transfer: CashTransfer) => {
        const reason = prompt(t('finance.prompt_reject_reason', 'Transferni rad etish sababini kiriting (masalan: pul kam chiqdi, xatolik va h.k.):'));
        if (reason === null) {
            return;
        }
        router.post(`/admin/finance/transfer/${transfer.id}/reject`, { reason }, {
            onSuccess: () => toast.success(t('finance.transfer_rejected', 'Transfer rad etildi')),
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
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden min-w-0 w-full">
            <Head title={t('finance.title', 'Moliya va Kassalar')} />

            {/* Page Title & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 w-full">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground shrink-0">
                    {t('finance.title', 'Moliya va Kassalar')}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                    {can('cash_transfers.create') && (
                        <Button
                            type="button"
                            onClick={() => openSweepModal()}
                            variant="brand"
                            className="text-xs h-8 sm:h-9 px-2.5 sm:px-3 justify-center shadow-xs"
                        >
                            <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span>{t('finance.empty_registers', 'Kassalarni bo\'shatish')}</span>
                        </Button>
                    )}
                    {can('payments.create') && (
                        <Button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white h-8 sm:h-9 px-2.5 sm:px-3 justify-center shadow-xs"
                        >
                            <ArrowDownRight className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span>{t('finance.accept_payment', 'To\'lov Qabul Qilish')}</span>
                        </Button>
                    )}
                    {can('expenses.create') && (
                        <Button
                            type="button"
                            onClick={() => setShowExpenseModal(true)}
                            variant="outline"
                            className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 sm:h-9 px-2.5 sm:px-3 justify-center shadow-xs"
                        >
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span>{t('finance.add_expense', 'Chiqim Qilish')}</span>
                        </Button>
                    )}
                    {can('cash_transfers.create') && (
                        <Button
                            type="button"
                            onClick={() => setShowTransferModal(true)}
                            variant="outline"
                            className="text-xs h-8 sm:h-9 px-2.5 sm:px-3 justify-center shadow-xs"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span>{t('finance.transfer', 'Transfer')}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Cash Registers Summary Cards */}
            <RegisterCardsGrid
                cashRegisters={cashRegisters}
                onSelectHistory={handleSelectRegisterHistory}
                onOpenSweep={openSweepModal}
            />

            {/* Navigation Tabs */}
            <div className="w-full max-w-full overflow-x-auto no-scrollbar pb-0.5">
                <div className="inline-flex items-center whitespace-nowrap bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-medium gap-1 min-w-max">
                    <button
                        type="button"
                        onClick={() => setActiveTab('registers')}
                        className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                            activeTab === 'registers'
                                ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_registers', 'Kassalar')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                            activeTab === 'history'
                                ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_history', 'Kassa Tarixi')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('payments')}
                        className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                            activeTab === 'payments'
                                ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_payments', 'Kirim To\'lovlar')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('expenses')}
                        className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                            activeTab === 'expenses'
                                ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_expenses', 'Chiqim Xarajatlar')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('transfers')}
                        className={`px-3.5 sm:px-4 py-2 rounded-lg transition-all shrink-0 ${
                            activeTab === 'transfers'
                                ? 'bg-white dark:bg-gray-700 shadow-xs font-bold text-blue-600 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_transfers', 'Transferlar')}
                    </button>
                </div>
            </div>

            {/* Active Tab Content */}
            {activeTab === 'registers' && (
                <CashRegistersTab
                    cashRegisters={cashRegisters}
                    onSelectHistory={handleSelectRegisterHistory}
                    onOpenSweep={openSweepModal}
                />
            )}

            {activeTab === 'history' && (
                <CashHistoryTab
                    cashRegisters={cashRegisters}
                    transactions={transactions}
                    filters={filters}
                />
            )}

            {activeTab === 'payments' && (
                <PaymentsTab
                    payments={payments}
                    onDeletePayment={handleDeletePayment}
                />
            )}

            {activeTab === 'expenses' && (
                <ExpensesTab
                    expenses={expenses}
                    onDeleteExpense={handleDeleteExpense}
                />
            )}

            {activeTab === 'transfers' && (
                <TransfersTab
                    transfers={transfers}
                    canReviewTransfer={canReviewTransfer}
                    onApproveTransfer={handleApproveTransfer}
                    onRejectTransfer={handleRejectTransfer}
                />
            )}

            {/* Modals */}
            <SweepModal
                open={showSweepModal}
                onOpenChange={setShowSweepModal}
                sweepItems={sweepItems}
                setSweepItems={setSweepItems}
                sweepNotes={sweepNotes}
                setSweepNotes={setSweepNotes}
                isSweeping={isSweeping}
                onSubmit={handleSweepSubmit}
            />

            <PaymentModal
                open={showPaymentModal}
                onOpenChange={setShowPaymentModal}
                paymentForm={paymentForm}
                cashRegisters={cashRegisters}
                contracts={contracts}
                students={students}
                onSubmit={handlePaymentSubmit}
            />

            <ExpenseModal
                open={showExpenseModal}
                onOpenChange={setShowExpenseModal}
                expenseForm={expenseForm}
                cashRegisters={cashRegisters}
                expenseCategories={expenseCategories}
                onSubmit={handleExpenseSubmit}
            />

            <TransferModal
                open={showTransferModal}
                onOpenChange={setShowTransferModal}
                transferForm={transferForm}
                cashRegisters={cashRegisters}
                onSubmit={handleTransferSubmit}
            />
        </div>
    );
}
