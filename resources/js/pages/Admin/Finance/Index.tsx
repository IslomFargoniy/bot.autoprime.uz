import { Head, useForm, router } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    ArrowLeftRight,
    ArrowDownToLine,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import {
    isAutoPrintEnabled,
    openReceipt,
    printReceipt,
    setAutoPrintEnabled,
} from '@/lib/print-receipt';

import { CashHistoryTab } from './components/CashHistoryTab';
import { CashRegistersTab } from './components/CashRegistersTab';
import { ExpenseCategoriesDialog } from './components/ExpenseCategoriesDialog';
import { ExpensesTab } from './components/ExpensesTab';
import { CashRegisterModal } from './components/modals/CashRegisterModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { PaymentModal } from './components/modals/PaymentModal';
import { SweepModal } from './components/modals/SweepModal';
import { TransferModal } from './components/modals/TransferModal';
import { PaymentsTab } from './components/PaymentsTab';
import { RegisterCardsGrid } from './components/RegisterCardsGrid';
import { TransfersTab } from './components/TransfersTab';
import type {
    PageProps,
    Payment,
    Expense,
    CashRegister,
    CashTransfer,
    SweepItem,
} from './types';

export default function FinanceIndex({
    cashRegisters,
    superadminRegisters = [],
    payments,
    expenses,
    transactions,
    transfers,
    branches = [],
    registerTypes = [],
    expenseCategories,
    manageableExpenseCategories = [],
    contracts,
    students = [],
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const can = useCan();

    // The backend decides who may review a transfer (receiving branch, superadmin, never the sender).
    const canReviewTransfer = (transfer: CashTransfer) => !!transfer.can_review;

    const [autoPrint, setAutoPrint] = useState(isAutoPrintEnabled);

    const [activeTab, setActiveTab] = useState<
        'registers' | 'history' | 'payments' | 'expenses' | 'transfers'
    >('registers');

    // Switched-off registers stay in the lists, but money can no longer move through them.
    const activeRegisters = cashRegisters.filter((r) => r.is_active !== false);

    // `false` closed, `null` creating, a register when editing it.
    const [registerModal, setRegisterModal] = useState<
        CashRegister | null | false
    >(false);
    const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);

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
        contract_id: '',
        cash_register_id: '',
        amount: '',
        payment_method: 'cash',
        notes: '',
    });

    // Expense Form
    const expenseForm = useForm({
        cash_register_id: '',
        expense_category_id: '',
        amount: '',
        description: '',
    });

    // Transfer Form
    const transferForm = useForm({
        from_cash_register_id: '',
        to_cash_register_id: '',
        amount: '',
        notes: '',
    });

    const openSweepModal = (specificRegId?: number) => {
        const branchRegs = activeRegisters.filter(
            (r) => r.branch_id !== null && r.branch_id !== undefined,
        );
        const mapped = branchRegs.map((reg) => {
            const currentBal = Number(reg.balance) || 0;
            const targetSuper =
                superadminRegisters.find(
                    (s) =>
                        s.type?.id === reg.type?.id ||
                        s.cash_register_type_id === reg.cash_register_type_id,
                ) || superadminRegisters[0];

            const isTarget = specificRegId
                ? reg.id === specificRegId
                : currentBal > 0;

            return {
                cash_register_id: reg.id,
                name: reg.name,
                branch_name:
                    reg.branch?.name || t('branches.unknown', 'Filial'),
                type_name:
                    reg.type?.name || t('finance.cash_register', 'Kassa'),
                target_name: targetSuper
                    ? targetSuper.name
                    : t(
                          'finance.superadmin_cash_register',
                          'Bosh kassa (Superadmin)',
                      ),
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
        router.get(
            '/admin/finance',
            {
                ...filters,
                history_register_id: registerId,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
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
            toast.error(
                t(
                    'finance.no_registers_selected',
                    'Kamida bitta kassani tanlang',
                ),
            );

            return;
        }

        setIsSweeping(true);
        router.post(
            '/admin/finance/sweep',
            {
                registers: selected,
                notes: sweepNotes,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowSweepModal(false);
                    setIsSweeping(false);
                    toast.success(
                        t(
                            'finance.sweep_request_sent',
                            "Kassa bo'shatish so'rovi yuborildi! Admin tasdiqlashi kutilmoqda.",
                        ),
                    );
                },
                onError: (err) => {
                    setIsSweeping(false);
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    );
                },
            },
        );
    };

    // The backend flashes the receipt address of the record that was just saved. The toast keeps
    // a "Chek" button, so the receipt can be printed again (or opened) when automatic printing
    // is off or the browser blocked it. Printing starts after the dialog has closed.
    const announceSavedRecord = (
        page: { flash?: { receipt_url?: string } },
        message: string,
    ) => {
        const url = page.flash?.receipt_url;

        toast.success(
            message,
            url
                ? {
                      action: {
                          label: t('finance.print_receipt', 'Chek'),
                          onClick: () => openReceipt(url),
                      },
                  }
                : undefined,
        );

        if (url && autoPrint) {
            window.setTimeout(() => printReceipt(url), 350);
        }
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        paymentForm.post('/admin/finance/payment', {
            onSuccess: (page) => {
                setShowPaymentModal(false);
                paymentForm.reset('contract_id', 'amount', 'notes');
                announceSavedRecord(
                    page,
                    t('finance.payment_success', "To'lov qabul qilindi"),
                );
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        expenseForm.post('/admin/finance/expense', {
            onSuccess: (page) => {
                setShowExpenseModal(false);
                expenseForm.reset('amount', 'description');
                announceSavedRecord(
                    page,
                    t('finance.expense_success', 'Xarajat kiritildi'),
                );
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transferForm.post('/admin/finance/transfer', {
            onSuccess: () => {
                setShowTransferModal(false);
                transferForm.reset('amount', 'notes');
                toast.success(
                    t('finance.transfer_success', "Transfer so'rovi yuborildi"),
                );
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleApproveTransfer = (transfer: CashTransfer) => {
        if (
            confirm(
                t(
                    'finance.confirm_approve_transfer',
                    "Ushbu transferni tasdiqlab mablag'ni o'tkazmoqchimisiz?",
                ),
            )
        ) {
            router.post(
                `/admin/finance/transfer/${transfer.id}/approve`,
                {},
                {
                    onSuccess: () =>
                        toast.success(
                            t(
                                'finance.transfer_approved',
                                'Transfer tasdiqlandi',
                            ),
                        ),
                    onError: (err) =>
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('common.error', 'Xatolik yuz berdi'),
                        ),
                },
            );
        }
    };

    const handleRejectTransfer = (transfer: CashTransfer) => {
        const reason = prompt(
            t(
                'finance.prompt_reject_reason',
                'Transferni rad etish sababini kiriting (masalan: pul kam chiqdi, xatolik va h.k.):',
            ),
        );

        if (reason === null) {
            return;
        }

        router.post(
            `/admin/finance/transfer/${transfer.id}/reject`,
            { reason },
            {
                onSuccess: () =>
                    toast.success(
                        t('finance.transfer_rejected', 'Transfer rad etildi'),
                    ),
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            },
        );
    };

    const handleDeletePayment = (payment: Payment) => {
        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            router.delete(`/admin/finance/payment/${payment.id}`, {
                onSuccess: () =>
                    toast.success(t('common.deleted', "O'chirildi")),
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        }
    };

    const handleDeleteExpense = (expense: Expense) => {
        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            router.delete(`/admin/finance/expense/${expense.id}`, {
                onSuccess: () =>
                    toast.success(t('common.deleted', "O'chirildi")),
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        }
    };

    return (
        <div className="w-full max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
            <Head title={t('finance.title', 'Moliya va Kassalar')} />

            {/* Page Title & Action Buttons */}
            <div className="flex w-full min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <h1 className="shrink-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {t('finance.title', 'Moliya va Kassalar')}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground select-none">
                        <input
                            type="checkbox"
                            checked={autoPrint}
                            onChange={(e) => {
                                setAutoPrint(e.target.checked);
                                setAutoPrintEnabled(e.target.checked);
                            }}
                            className="h-3.5 w-3.5 rounded border-input"
                        />
                        {t(
                            'finance.auto_print_receipt',
                            'Saqlangandan keyin chek chiqarish',
                        )}
                    </label>
                    {can('cash_transfers.create') && (
                        <Button
                            type="button"
                            onClick={() => openSweepModal()}
                            variant="brand"
                            className="h-8 justify-center px-2.5 text-xs shadow-xs sm:h-9 sm:px-3"
                        >
                            <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                {t(
                                    'finance.empty_registers',
                                    "Kassalarni bo'shatish",
                                )}
                            </span>
                        </Button>
                    )}
                    {can('payments.create') && (
                        <Button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="h-8 justify-center bg-emerald-600 px-2.5 text-xs text-white shadow-xs hover:bg-emerald-700 sm:h-9 sm:px-3"
                        >
                            <ArrowDownRight className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                {t(
                                    'finance.accept_payment',
                                    "To'lov Qabul Qilish",
                                )}
                            </span>
                        </Button>
                    )}
                    {can('expenses.create') && (
                        <Button
                            type="button"
                            onClick={() => setShowExpenseModal(true)}
                            variant="outline"
                            className="h-8 justify-center border-red-200 px-2.5 text-xs text-red-600 shadow-xs hover:bg-red-50 sm:h-9 sm:px-3 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                {t('finance.add_expense', 'Chiqim Qilish')}
                            </span>
                        </Button>
                    )}
                    {can('cash_transfers.create') && (
                        <Button
                            type="button"
                            onClick={() => setShowTransferModal(true)}
                            variant="outline"
                            className="h-8 justify-center px-2.5 text-xs shadow-xs sm:h-9 sm:px-3"
                        >
                            <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span>{t('finance.transfer', 'Transfer')}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Cash Registers Summary Cards */}
            <RegisterCardsGrid
                cashRegisters={activeRegisters}
                onSelectHistory={handleSelectRegisterHistory}
                onOpenSweep={openSweepModal}
            />

            {/* Navigation Tabs */}
            <div className="no-scrollbar w-full max-w-full overflow-x-auto pb-0.5">
                <div className="inline-flex min-w-max items-center gap-1 rounded-xl bg-gray-100 p-1 text-xs font-medium whitespace-nowrap dark:bg-gray-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab('registers')}
                        className={`shrink-0 rounded-lg px-3.5 py-2 transition-all sm:px-4 ${
                            activeTab === 'registers'
                                ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_registers', 'Kassalar')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`shrink-0 rounded-lg px-3.5 py-2 transition-all sm:px-4 ${
                            activeTab === 'history'
                                ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_history', 'Kassa Tarixi')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('payments')}
                        className={`shrink-0 rounded-lg px-3.5 py-2 transition-all sm:px-4 ${
                            activeTab === 'payments'
                                ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_payments', "Kirim To'lovlar")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('expenses')}
                        className={`shrink-0 rounded-lg px-3.5 py-2 transition-all sm:px-4 ${
                            activeTab === 'expenses'
                                ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('finance.tab_expenses', 'Chiqim Xarajatlar')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('transfers')}
                        className={`shrink-0 rounded-lg px-3.5 py-2 transition-all sm:px-4 ${
                            activeTab === 'transfers'
                                ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
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
                    onCreateRegister={() => setRegisterModal(null)}
                    onEditRegister={(register) => setRegisterModal(register)}
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
                    filters={filters}
                />
            )}

            {activeTab === 'expenses' && (
                <ExpensesTab
                    expenses={expenses}
                    onDeleteExpense={handleDeleteExpense}
                    onManageCategories={() => setShowCategoriesDialog(true)}
                    filters={filters}
                />
            )}

            {activeTab === 'transfers' && (
                <TransfersTab
                    transfers={transfers}
                    canReviewTransfer={canReviewTransfer}
                    onApproveTransfer={handleApproveTransfer}
                    onRejectTransfer={handleRejectTransfer}
                    filters={filters}
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
                cashRegisters={activeRegisters}
                contracts={contracts}
                students={students}
                onSubmit={handlePaymentSubmit}
            />

            <ExpenseModal
                open={showExpenseModal}
                onOpenChange={setShowExpenseModal}
                expenseForm={expenseForm}
                cashRegisters={activeRegisters}
                expenseCategories={expenseCategories}
                onSubmit={handleExpenseSubmit}
            />

            {registerModal !== false && (
                <CashRegisterModal
                    key={registerModal?.id ?? 'new'}
                    register={registerModal}
                    branches={branches}
                    registerTypes={registerTypes}
                    onClose={() => setRegisterModal(false)}
                />
            )}

            <ExpenseCategoriesDialog
                open={showCategoriesDialog}
                onOpenChange={setShowCategoriesDialog}
                categories={manageableExpenseCategories}
                branches={branches}
            />

            <TransferModal
                open={showTransferModal}
                onOpenChange={setShowTransferModal}
                transferForm={transferForm}
                cashRegisters={activeRegisters}
                onSubmit={handleTransferSubmit}
            />
        </div>
    );
}
