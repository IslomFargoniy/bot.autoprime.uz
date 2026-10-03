import { Head, useForm, router, Link } from '@inertiajs/react';
import {
    Plus,
    Download,
    FileText,
    Trash2,
    RotateCcw,
    ReceiptText,
    Eye,
    User,
    Calendar,
    ExternalLink,
    DollarSign,
    Shield,
    BookOpen,
    Car,
    Laptop,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    PageFilterBar,
    PageFilterPills,
    PageFilterSearch,
} from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import { formatPhone } from '@/lib/input-masks';
import {
    formatDate,
    formatDateTime,
    formatNumber,
    formatMoney,
} from '@/lib/utils';

interface CashRegister {
    id: number;
    name: string;
    balance: number | string;
    type?: { id: number; name: string };
}

interface ContractPayment {
    id: number;
    receipt_number: string;
    amount: number | string;
    payment_type: string;
    payment_method: string;
    paid_at: string;
    comment?: string;
    cash_register?: { id: number; name: string };
    received_by?: { id: number; name: string };
}

interface Contract {
    id: number;
    contract_number: string;
    student_id: number;
    student?: { id: number; full_name: string; phone: string };
    contract_type_id?: number;
    contract_type?: {
        id: number;
        name: string;
        category: string;
        has_theory?: boolean;
        has_driving?: boolean;
        has_lms?: boolean;
        required_theory_lessons?: number;
        required_driving_lessons?: number;
        price?: number | string;
    };
    group_id?: number;
    group?: { id: number; name: string };
    branch_id?: number;
    branch?: { id: number; name: string };
    created_by_user_id?: number;
    createdBy?: { id: number; name: string };
    contract_date: string;
    start_date?: string;
    end_date?: string;
    has_theory?: boolean;
    has_driving?: boolean;
    has_lms?: boolean;
    required_driving_lessons?: number;
    required_theory_lessons?: number;
    total_amount: number | string;
    discount_amount: number | string;
    final_amount: number | string;
    paid_amount: number | string;
    debt_amount: number | string;
    overpaid_amount: number | string;
    payment_percentage: number;
    payment_badge_color: 'white' | 'red' | 'yellow' | 'green';
    status: 'active' | 'completed' | 'cancelled' | 'frozen';
    payment_status: 'unpaid' | 'partial' | 'paid';
    terms?: string;
    file_url?: string;
    payments?: ContractPayment[];
    certificate?: { id: number } | null;
}

interface PageProps {
    contracts: {
        data: Contract[];
        links: any[];
        total: number;
        from?: number;
        to?: number;
        per_page?: number;
    };
    students: Array<{
        id: number;
        full_name: string;
        phone: string;
        group_id?: number;
    }>;
    contractTypes: Array<{
        id: number;
        name: string;
        price: number | string;
        category: string;
    }>;
    groups: Array<{ id: number; name: string }>;
    branches: Array<{ id: number; name: string }>;
    cashRegisters?: CashRegister[];
    filters: {
        search?: string;
        status?: string;
        payment_status?: string;
        has_debt?: boolean;
        branch_id?: string | number;
        per_page?: string;
    };
}

export default function ContractsIndex({
    contracts,
    students,
    contractTypes,
    groups,
    cashRegisters = [],
    filters,
}: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const [showModal, setShowModal] = useState(false);
    const [viewingContract, setViewingContract] = useState<Contract | null>(
        null,
    );
    const [refundingContract, setRefundingContract] = useState<Contract | null>(
        null,
    );
    const [viewingPaymentsContract, setViewingPaymentsContract] =
        useState<Contract | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const refundForm = useForm({
        cash_register_id: '',
        amount: '',
        payment_method: 'cash',
        cancel_contract: true,
        notes: '',
    });

    const form = useForm({
        student_id: '' as string | number,
        contract_type_id: '' as string | number,
        group_id: '',
        discount_amount: '' as string | number,
        start_date: '',
        end_date: '',
        terms: '',
    });

    // A discount cannot be more than the tariff costs.
    const selectedTariff = contractTypes.find(
        (ct) => String(ct.id) === String(form.data.contract_type_id),
    );
    const discountTooBig =
        !!selectedTariff &&
        Number(form.data.discount_amount) > Number(selectedTariff.price);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/contracts',
            { ...filters, search, per_page: perPage },
            { preserveState: true },
        );
    };

    const handleFilterStatus = (status: string) => {
        router.get(
            '/admin/contracts',
            {
                ...filters,
                payment_status: status === 'all' ? '' : status,
                per_page: perPage,
            },
            { preserveState: true },
        );
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get(
            '/admin/contracts',
            { ...filters, search, per_page: newPerPage },
            { preserveState: true, replace: true },
        );
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/contracts', {
            onSuccess: () => {
                setShowModal(false);
                form.reset();
                toast.success(
                    t(
                        'contracts.created_success',
                        'Shartnoma muvaffaqiyatli tuzildi',
                    ),
                );
            },
            onError: (err) => {
                const first = Object.values(err)[0] as string;
                toast.error(
                    t(first, first) || t('common.error', 'Xatolik yuz berdi'),
                );
            },
        });
    };

    const handleDelete = (contract: Contract) => {
        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            router.delete(`/admin/contracts/${contract.id}`, {
                onSuccess: () => {
                    if (viewingContract?.id === contract.id) {
                        setViewingContract(null);
                    }

                    toast.success(t('common.deleted', "O'chirildi"));
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        }
    };

    const changeStatus = (contract: Contract, status: string) => {
        const questions: Record<string, string> = {
            frozen: t(
                'contracts.confirm_freeze',
                'Shartnomani muzlatmoqchimisiz?',
            ),
            active: t(
                'contracts.confirm_unfreeze',
                'Shartnomani qayta faollashtirmoqchimisiz?',
            ),
            cancelled: t(
                'contracts.confirm_cancel_contract',
                "Shartnomani bekor qilmoqchimisiz? Bu amalni qaytarib bo'lmaydi.",
            ),
        };

        if (!confirm(questions[status] ?? '')) {
            return;
        }

        router.put(
            `/admin/contracts/${contract.id}`,
            { status },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setViewingContract(null);
                    toast.success(
                        t(
                            'contracts.status_updated',
                            'Shartnoma holati yangilandi',
                        ),
                    );
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            },
        );
    };

    const renderContractActions = (c: Contract) => {
        if (!can('contracts.edit')) {
            return null;
        }

        const isOpen = c.status === 'active' || c.status === 'frozen';
        const canDelete = Number(c.paid_amount) === 0 && !c.certificate;

        return (
            <>
                {c.status === 'active' && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => changeStatus(c, 'frozen')}
                        className="h-7 text-xs text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/30"
                    >
                        {t('contracts.freeze', 'Muzlatish')}
                    </Button>
                )}
                {c.status === 'frozen' && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => changeStatus(c, 'active')}
                        className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
                    >
                        {t('contracts.unfreeze', 'Faollashtirish')}
                    </Button>
                )}
                {isOpen && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => changeStatus(c, 'cancelled')}
                        className="h-7 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30"
                    >
                        {t('contracts.cancel_contract', 'Bekor qilish')}
                    </Button>
                )}
                {canDelete && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(c)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </>
        );
    };

    const openRefund = (contract: Contract) => {
        setRefundingContract(contract);
        refundForm.setData({
            cash_register_id: '',
            amount: String(contract.paid_amount),
            payment_method: 'cash',
            cancel_contract: true,
            notes: '',
        });
    };

    const handleRefundSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!refundingContract) {
            return;
        }

        refundForm.post(`/admin/contracts/${refundingContract.id}/refund`, {
            onSuccess: () => {
                setRefundingContract(null);
                refundForm.reset();
                toast.success(
                    t(
                        'contracts.refund_success',
                        "To'lov muvaffaqiyatli qaytarildi",
                    ),
                );
            },
            onError: (err) => {
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                );
            },
        });
    };

    const handleDeletePayment = (paymentId: number) => {
        if (
            confirm(
                t(
                    'contracts.confirm_delete_payment',
                    "Rostdan ham ushbu to'lovni o'chirmoqchimisiz? Kassadan mablag' yechiladi va shartnoma balansi qayta hisoblanadi.",
                ),
            )
        ) {
            router.delete(`/admin/finance/payment/${paymentId}`, {
                onSuccess: () => {
                    toast.success(
                        t('finance.payment_deleted', "To'lov o'chirildi"),
                    );
                    setViewingPaymentsContract(null);
                },
                onError: (err) => {
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    );
                },
            });
        }
    };

    const getBadgeStyle = (color: string) => {
        switch (color) {
            case 'green':
                return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'yellow':
                return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'red':
                return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
            default:
                return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <div className="space-y-4 p-4 md:space-y-6 md:p-6">
            <Head title={t('contracts.title', 'Shartnomalar')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl font-bold sm:text-2xl">
                    {t('contracts.title', 'Shartnomalar')}
                </h1>
                {can('contracts.create') && (
                    <Button
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                            setShowModal(true);
                        }}
                        variant="brand"
                        size="sm"
                        className="shrink-0 text-xs"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        <span>{t('common.add', "Qo'shish")}</span>
                    </Button>
                )}
            </div>

            {/* Filters Bar */}
            <PageFilterBar>
                <div className="no-scrollbar flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 md:w-auto md:flex-wrap md:pb-0">
                    <PageFilterPills
                        activeValue={filters.payment_status || 'all'}
                        onChange={handleFilterStatus}
                        items={[
                            {
                                value: 'all',
                                label: t('contracts.status_all', 'Barchasi'),
                            },
                            {
                                value: 'unpaid',
                                label: t(
                                    'contracts.status_unpaid',
                                    "To'lanmagan",
                                ),
                            },
                            {
                                value: 'partial',
                                label: t(
                                    'contracts.status_partial',
                                    "Qisman to'langan",
                                ),
                            },
                            {
                                value: 'paid',
                                label: t(
                                    'contracts.status_paid',
                                    "To'liq to'langan",
                                ),
                            },
                        ]}
                    />
                    <button
                        onClick={() =>
                            router.get(
                                '/admin/contracts',
                                { ...filters, has_debt: !filters.has_debt },
                                { preserveState: true },
                            )
                        }
                        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            filters.has_debt
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-input bg-muted/50 text-foreground hover:bg-muted'
                        }`}
                    >
                        {t('contracts.debtors_only', 'Faqat qarzdorlar')}
                    </button>
                </div>

                <PageFilterSearch
                    value={search}
                    onChange={setSearch}
                    onSubmit={handleSearch}
                    placeholder={t('common.search', 'Shartnoma yoki talaba...')}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                />
            </PageFilterBar>

            {/* Desktop & Tablet Table */}
            <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">
                                    {t('contracts.number', '№')}
                                </TableHead>
                                <TableHead>
                                    {t('contracts.student', 'Talaba')}
                                </TableHead>
                                <TableHead>
                                    {t('contracts.tariff', 'Tarif')}
                                </TableHead>
                                <TableHead>
                                    {t('contracts.group', 'Guruh')}
                                </TableHead>
                                <TableHead>
                                    {t('contracts.final_amount', 'Summa')}
                                </TableHead>
                                <TableHead>
                                    {t('contracts.paid_amount', "To'langan")}
                                </TableHead>
                                <TableHead>
                                    {t('contracts.debt_amount', 'Qarz')}
                                </TableHead>
                                <TableHead>
                                    {t('contracts.progress', "To'lov foizi")}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('common.actions', 'Amallar')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={9}
                                    title={t(
                                        'contracts.no_contracts',
                                        'Shartnomalar topilmadi',
                                    )}
                                />
                            ) : (
                                contracts.data.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-mono text-xs font-semibold">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewingContract(c)
                                                }
                                                className="text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                #{c.contract_number}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-medium">
                                                {c.student?.full_name}
                                            </div>
                                            <div className="font-mono text-[11px] text-muted-foreground">
                                                {formatPhone(c.student?.phone)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {c.contract_type?.name || '-'} (
                                            {c.contract_type?.category || 'B'})
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {c.group?.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {formatMoney(c.final_amount)}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewingPaymentsContract(
                                                        c,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                                                title={t(
                                                    'contracts.payments_history',
                                                    "To'lovlar tarixi",
                                                )}
                                            >
                                                <ReceiptText className="h-3.5 w-3.5 text-emerald-500" />
                                                {formatMoney(c.paid_amount)}
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-red-500">
                                            {formatMoney(c.debt_amount)}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getBadgeStyle(c.payment_badge_color)}`}
                                            >
                                                {c.payment_percentage}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="space-x-1 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setViewingContract(c)
                                                }
                                                title={t(
                                                    'contracts.view_details',
                                                    'Shartnoma tafsilotlari',
                                                )}
                                                className="h-7 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setViewingPaymentsContract(
                                                        c,
                                                    )
                                                }
                                                title={t(
                                                    'contracts.payments_history',
                                                    "To'lovlar tarixi",
                                                )}
                                                className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
                                            >
                                                <ReceiptText className="h-3.5 w-3.5" />
                                            </Button>
                                            {can('contracts.print') && (
                                                <a
                                                    href={`/admin/contracts/${c.id}/download-pdf`}
                                                    className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Download className="mr-1 h-3.5 w-3.5" />
                                                    PDF
                                                </a>
                                            )}
                                            {Number(c.paid_amount) > 0 &&
                                                !c.certificate &&
                                                (can('payments.edit') ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            openRefund(c)
                                                        }
                                                        title={t(
                                                            'contracts.refund_button',
                                                            "To'lovni qaytarish (Refund)",
                                                        )}
                                                        className="h-7 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30"
                                                    >
                                                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                                        {t(
                                                            'contracts.refund',
                                                            'Qaytarish',
                                                        )}
                                                    </Button>
                                                ) : null)}
                                            {renderContractActions(c)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile Cards Feed */}
            <div className="space-y-3 md:hidden">
                {contracts.data.length === 0 ? (
                    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs">
                        {t('contracts.no_contracts', 'Shartnomalar topilmadi')}
                    </div>
                ) : (
                    contracts.data.map((c) => (
                        <div
                            key={c.id}
                            className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setViewingContract(c)
                                            }
                                            className="font-mono font-bold text-primary hover:underline"
                                        >
                                            #{c.contract_number}
                                        </button>
                                        <span>{c.student?.full_name}</span>
                                    </div>
                                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                        {formatPhone(c.student?.phone)}
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${getBadgeStyle(c.payment_badge_color)}`}
                                >
                                    {c.payment_percentage}%
                                </span>
                            </div>

                            {/* Tariff & Group */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded bg-muted px-2 py-0.5">
                                    {c.contract_type?.name || '-'} (
                                    {c.contract_type?.category || 'B'})
                                </span>
                                {c.group?.name && (
                                    <span className="rounded bg-muted px-2 py-0.5">
                                        {c.group.name}
                                    </span>
                                )}
                            </div>

                            {/* Financial Summary */}
                            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {t('contracts.final_amount', 'Summa')}
                                    </span>
                                    <span className="font-semibold">
                                        {formatNumber(c.final_amount)}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {t(
                                            'contracts.paid_amount',
                                            "To'langan",
                                        )}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setViewingPaymentsContract(c)
                                        }
                                        className="inline-flex items-center gap-0.5 font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                                    >
                                        <ReceiptText className="h-3 w-3" />
                                        {formatNumber(c.paid_amount)}
                                    </button>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {t('contracts.debt_amount', 'Qarz')}
                                    </span>
                                    <span
                                        className={`font-semibold ${Number(c.debt_amount) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
                                    >
                                        {formatNumber(c.debt_amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center justify-between gap-1.5 border-t pt-2 text-xs">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewingContract(c)}
                                    className="h-7 flex-1 text-xs"
                                >
                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                    {t('common.details', 'Batafsil')}
                                </Button>
                                {can('contracts.print') && (
                                    <a
                                        href={`/admin/contracts/${c.id}/download-pdf`}
                                        className="inline-flex items-center rounded bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Download className="mr-1 h-3.5 w-3.5" />
                                        PDF
                                    </a>
                                )}
                                {renderContractActions(c)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <Pagination
                links={contracts.links}
                total={contracts.total}
                from={contracts.from}
                to={contracts.to}
            />

            {/* View Full Contract Details Modal */}
            <Dialog
                open={!!viewingContract}
                onOpenChange={(open) => !open && setViewingContract(null)}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2 border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <span className="block font-mono text-base font-bold">
                                        #{viewingContract?.contract_number}
                                    </span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {viewingContract?.contract_date
                                            ? formatDate(
                                                  viewingContract.contract_date,
                                              )
                                            : ''}
                                    </span>
                                </div>
                            </div>
                            {viewingContract && (
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getBadgeStyle(viewingContract.payment_badge_color)}`}
                                    >
                                        {viewingContract.payment_percentage}%
                                    </span>
                                    <span className="rounded-md border bg-muted px-2.5 py-1 text-xs font-medium uppercase">
                                        {viewingContract.status}
                                    </span>
                                </div>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Shartnomaning barcha tafsilotlari, modullari va
                            to'lovlari
                        </DialogDescription>
                    </DialogHeader>

                    {viewingContract && (
                        <div className="space-y-4 pt-2 text-xs">
                            {/* Student & Branch Info */}
                            <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <User className="h-4 w-4 text-blue-600" />
                                    {t('contracts.student', 'Talaba va Filial')}
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t('contracts.student', 'Talaba')}
                                        </span>
                                        <Link
                                            href={`/admin/students/${viewingContract.student_id}`}
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            <span>
                                                {
                                                    viewingContract.student
                                                        ?.full_name
                                                }
                                            </span>
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                        <div className="font-mono text-xs text-muted-foreground">
                                            {formatPhone(
                                                viewingContract.student?.phone,
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t('leads.branch', 'Filial')}
                                        </span>
                                        <span className="mt-0.5 inline-block text-sm font-semibold text-foreground">
                                            {viewingContract.branch?.name ||
                                                '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t('contracts.group', 'Guruh')}
                                        </span>
                                        <span className="mt-0.5 inline-block rounded border bg-background px-2 py-0.5 font-medium">
                                            {viewingContract.group?.name ||
                                                t(
                                                    'common.not_assigned',
                                                    'Biriktirilmagan',
                                                )}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t(
                                                'contracts.dates',
                                                "O'qish muddatlari",
                                            )}
                                        </span>
                                        <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-foreground">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            {viewingContract.start_date
                                                ? formatDate(
                                                      viewingContract.start_date,
                                                  )
                                                : '-'}{' '}
                                            —{' '}
                                            {viewingContract.end_date
                                                ? formatDate(
                                                      viewingContract.end_date,
                                                  )
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tariff & Learning Modules */}
                            <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Shield className="h-4 w-4 text-emerald-600" />
                                    {t(
                                        'contracts.tariff_and_modules',
                                        "Tarif va Ta'lim Modullari",
                                    )}
                                </h3>
                                <div className="flex items-center justify-between rounded-lg border bg-background p-2.5">
                                    <div>
                                        <span className="text-sm font-bold text-foreground">
                                            {viewingContract.contract_type
                                                ?.name || '-'}
                                        </span>
                                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
                                            {viewingContract.contract_type
                                                ?.category || 'B'}{' '}
                                            toifa
                                        </span>
                                    </div>
                                    <span className="font-mono font-semibold text-primary">
                                        {formatMoney(
                                            viewingContract.total_amount,
                                        )}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                    <div
                                        className={`flex items-center gap-2 rounded-lg border p-2.5 ${viewingContract.has_theory ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-background opacity-60'}`}
                                    >
                                        <BookOpen
                                            className={`h-4 w-4 ${viewingContract.has_theory ? 'text-emerald-600' : 'text-muted-foreground'}`}
                                        />
                                        <div>
                                            <span className="block text-[11px] font-semibold">
                                                {t(
                                                    'contracts.theory_module',
                                                    'Nazariya',
                                                )}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {viewingContract.required_theory_lessons ||
                                                    24}{' '}
                                                {t(
                                                    'contracts.lessons_count',
                                                    'dars',
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className={`flex items-center gap-2 rounded-lg border p-2.5 ${viewingContract.has_driving ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-background opacity-60'}`}
                                    >
                                        <Car
                                            className={`h-4 w-4 ${viewingContract.has_driving ? 'text-emerald-600' : 'text-muted-foreground'}`}
                                        />
                                        <div>
                                            <span className="block text-[11px] font-semibold">
                                                {t(
                                                    'contracts.driving_module',
                                                    'Haydash',
                                                )}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {viewingContract.required_driving_lessons ||
                                                    10}{' '}
                                                {t(
                                                    'contracts.lessons_count',
                                                    'dars',
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className={`flex items-center gap-2 rounded-lg border p-2.5 ${viewingContract.has_lms ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-background opacity-60'}`}
                                    >
                                        <Laptop
                                            className={`h-4 w-4 ${viewingContract.has_lms ? 'text-emerald-600' : 'text-muted-foreground'}`}
                                        />
                                        <div>
                                            <span className="block text-[11px] font-semibold">
                                                {t(
                                                    'contracts.lms_module',
                                                    'LMS Video',
                                                )}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Test & Video
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Calculation */}
                            <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                    {t(
                                        'contracts.financial_details',
                                        'Moliyaviy Hisob-Kitob',
                                    )}
                                </h3>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border bg-background p-2">
                                        <span className="block text-[10px] text-muted-foreground">
                                            {t(
                                                'contracts.total_amount',
                                                'Tarif summasi',
                                            )}
                                        </span>
                                        <span className="text-xs font-semibold">
                                            {formatMoney(
                                                viewingContract.total_amount,
                                            )}
                                        </span>
                                    </div>
                                    <div className="rounded-lg border bg-background p-2">
                                        <span className="block text-[10px] text-muted-foreground">
                                            {t(
                                                'contracts.discount',
                                                'Chegirma',
                                            )}
                                        </span>
                                        <span className="text-xs font-semibold text-amber-600">
                                            -
                                            {formatMoney(
                                                viewingContract.discount_amount,
                                            )}
                                        </span>
                                    </div>
                                    <div className="rounded-lg border bg-background p-2">
                                        <span className="block text-[10px] text-muted-foreground">
                                            {t(
                                                'contracts.final_amount',
                                                'Yakuniy summa',
                                            )}
                                        </span>
                                        <span className="text-xs font-bold text-foreground">
                                            {formatMoney(
                                                viewingContract.final_amount,
                                            )}
                                        </span>
                                    </div>
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 dark:bg-emerald-950/30">
                                        <span className="block text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                            {t(
                                                'contracts.paid_amount',
                                                "To'langan",
                                            )}
                                        </span>
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                            {formatMoney(
                                                viewingContract.paid_amount,
                                            )}
                                        </span>
                                    </div>
                                    <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-2 dark:bg-rose-950/30">
                                        <span className="block text-[10px] font-medium text-rose-700 dark:text-rose-300">
                                            {t(
                                                'contracts.debt_amount',
                                                'Qoldiq qarz',
                                            )}
                                        </span>
                                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                                            {formatMoney(
                                                viewingContract.debt_amount,
                                            )}
                                        </span>
                                    </div>
                                    <div className="rounded-lg border bg-background p-2">
                                        <span className="block text-[10px] text-muted-foreground">
                                            {t(
                                                'contracts.overpaid',
                                                "Ortiqcha to'lov",
                                            )}
                                        </span>
                                        <span className="text-xs font-semibold text-blue-600">
                                            {formatMoney(
                                                viewingContract.overpaid_amount,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info & Officer */}
                            {(viewingContract.createdBy ||
                                viewingContract.terms) && (
                                <div className="space-y-2 rounded-xl border bg-muted/40 p-3.5">
                                    {viewingContract.createdBy && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-muted-foreground">
                                                {t(
                                                    'contracts.created_by',
                                                    'Rasmiylashtirdi',
                                                )}
                                                :
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {viewingContract.createdBy.name}
                                            </span>
                                        </div>
                                    )}
                                    {viewingContract.terms && (
                                        <div>
                                            <span className="block text-[11px] text-muted-foreground">
                                                {t(
                                                    'common.description',
                                                    'Izoh / Shartlar',
                                                )}
                                                :
                                            </span>
                                            <p className="mt-0.5 rounded border bg-background p-2 text-foreground">
                                                {viewingContract.terms}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between gap-2 border-t pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setViewingContract(null)}
                                >
                                    {t('common.close', 'Yopish')}
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setViewingPaymentsContract(
                                                viewingContract,
                                            );
                                        }}
                                        className="text-xs"
                                    >
                                        <ReceiptText className="mr-1 h-3.5 w-3.5" />
                                        {t(
                                            'contracts.payments_history',
                                            "To'lovlar tarixi",
                                        )}
                                    </Button>
                                    {can('contracts.print') && (
                                        <a
                                            href={`/admin/contracts/${viewingContract.id}/download-pdf`}
                                            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Download className="mr-1.5 h-3.5 w-3.5" />
                                            {t(
                                                'common.download_pdf',
                                                'PDF Yuklab olish',
                                            )}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Contract Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t(
                                'contracts.create_title',
                                'Yangi Shartnoma Rasmiylashtirish',
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={handleCreateSubmit}
                        className="space-y-4 text-xs"
                    >
                        <div>
                            <Label required htmlFor="student_id">
                                {t(
                                    'contracts.select_student',
                                    "Talaba (O'quvchi)",
                                )}
                            </Label>
                            <SearchableSelect
                                id="student_id"
                                value={form.data.student_id}
                                onChange={(val) => {
                                    form.setData('student_id', val);
                                    const std = students.find(
                                        (s) => s.id === Number(val),
                                    );

                                    if (std && std.group_id) {
                                        form.setData(
                                            'group_id',
                                            String(std.group_id),
                                        );
                                    }
                                }}
                                options={students.map((s) => ({
                                    value: s.id,
                                    label: s.full_name,
                                    sublabel: s.phone,
                                }))}
                                placeholder={t(
                                    'contracts.select_student',
                                    'Talabani tanlang',
                                )}
                                allowClear
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label required htmlFor="contract_type_id">
                                {t('contracts.select_tariff', 'Tarif')}
                            </Label>
                            <SearchableSelect
                                id="contract_type_id"
                                value={form.data.contract_type_id}
                                onChange={(val) =>
                                    form.setData('contract_type_id', val)
                                }
                                options={contractTypes.map((ct) => ({
                                    value: ct.id,
                                    label: ct.name,
                                    sublabel: `${formatMoney(ct.price)} (${ct.category})`,
                                }))}
                                placeholder={t(
                                    'contracts.select_tariff',
                                    'Tarifni tanlang',
                                )}
                                allowClear
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="group_id">
                                    {t('contracts.select_group', 'Guruh')}
                                </Label>
                                <SearchableSelect
                                    id="group_id"
                                    value={form.data.group_id}
                                    onChange={(val) =>
                                        form.setData('group_id', val)
                                    }
                                    options={groups.map((g) => ({
                                        value: g.id,
                                        label: g.name,
                                    }))}
                                    placeholder={t(
                                        'contracts.select_group',
                                        'Guruhni tanlang',
                                    )}
                                    allowClear
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="discount_amount">
                                    {t(
                                        'contracts.discount_amount',
                                        'Chegirma Miqdori (UZS)',
                                    )}
                                </Label>
                                <MoneyInput
                                    id="discount_amount"
                                    value={form.data.discount_amount}
                                    onChange={(val) =>
                                        form.setData('discount_amount', val)
                                    }
                                    className="mt-1"
                                    placeholder="0"
                                    suffix="UZS"
                                />
                                {discountTooBig && selectedTariff && (
                                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                                        {t(
                                            'contracts.discount_too_big',
                                            'Chegirma tarif narxidan ({{price}} UZS) oshmasligi kerak',
                                            {
                                                price: formatMoney(
                                                    selectedTariff.price,
                                                ),
                                            },
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="start_date">
                                    {t(
                                        'contracts.start_date',
                                        'Boshlanish Sanasi',
                                    )}
                                </Label>
                                <DatePicker
                                    id="start_date"
                                    value={form.data.start_date}
                                    onChange={(val) =>
                                        form.setData('start_date', val)
                                    }
                                    className="mt-1"
                                />
                                {form.errors.start_date && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {t(
                                            form.errors.start_date,
                                            form.errors.start_date,
                                        )}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="end_date">
                                    {t('contracts.end_date', 'Tugash Sanasi')}
                                </Label>
                                <DatePicker
                                    id="end_date"
                                    value={form.data.end_date}
                                    onChange={(val) =>
                                        form.setData('end_date', val)
                                    }
                                    className="mt-1"
                                />
                                {form.errors.end_date && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {t(
                                            form.errors.end_date,
                                            form.errors.end_date,
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="terms">
                                {t(
                                    'common.description',
                                    "Qo'shimcha shartlar / Izoh",
                                )}
                            </Label>
                            <Input
                                id="terms"
                                value={form.data.terms}
                                onChange={(e) =>
                                    form.setData('terms', e.target.value)
                                }
                                className="mt-1"
                                placeholder="Maxsus kelishuvlar..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowModal(false)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={form.processing || discountTooBig}
                            >
                                {t('common.save', 'Rasmiylashtirish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Refund Modal */}
            <Dialog
                open={!!refundingContract}
                onOpenChange={(open) => !open && setRefundingContract(null)}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <RotateCcw className="h-5 w-5" />
                            {t(
                                'contracts.refund_modal_title',
                                "To'lovni Qaytarish (Refund)",
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {refundingContract && (
                        <form
                            onSubmit={handleRefundSubmit}
                            className="space-y-4 text-xs"
                        >
                            <div className="space-y-1 rounded-lg bg-muted/50 p-3">
                                <div className="font-semibold text-foreground">
                                    {refundingContract.student?.full_name}
                                </div>
                                <div className="text-muted-foreground">
                                    #{refundingContract.contract_number} •{' '}
                                    {refundingContract.contract_type?.name}
                                </div>
                                <div className="pt-1 font-bold text-emerald-600 dark:text-emerald-400">
                                    {t(
                                        'contracts.paid_amount',
                                        "To'langan summa",
                                    )}
                                    :{' '}
                                    {formatMoney(refundingContract.paid_amount)}
                                </div>
                            </div>

                            <div>
                                <Label required htmlFor="refund_amount">
                                    {t(
                                        'contracts.refund_amount',
                                        'Qaytariladigan summa (UZS)',
                                    )}
                                </Label>
                                <MoneyInput
                                    id="refund_amount"
                                    value={refundForm.data.amount}
                                    onChange={(val) =>
                                        refundForm.setData('amount', val)
                                    }
                                    placeholder="0"
                                    suffix="UZS"
                                    className="mt-1 font-semibold text-amber-600"
                                    required
                                />
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                    {t(
                                        'contracts.max_refund_notice',
                                        "Maksimal qaytarish mumkin bo'lgan summa",
                                    )}
                                    :{' '}
                                    {formatMoney(refundingContract.paid_amount)}
                                </span>
                            </div>

                            <div>
                                <Label required htmlFor="refund_cash_register">
                                    {t(
                                        'contracts.refund_from_register',
                                        'Qaysi kassadan qaytariladi',
                                    )}
                                </Label>
                                <SearchableSelect
                                    id="refund_cash_register"
                                    value={refundForm.data.cash_register_id}
                                    onChange={(val) =>
                                        refundForm.setData(
                                            'cash_register_id',
                                            String(val),
                                        )
                                    }
                                    options={cashRegisters.map((cr) => ({
                                        value: String(cr.id),
                                        label: `${cr.name} (${formatMoney(cr.balance)})`,
                                    }))}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label required htmlFor="refund_method">
                                    {t(
                                        'contracts.payment_method',
                                        "To'lov usuli",
                                    )}
                                </Label>
                                <SearchableSelect
                                    id="refund_method"
                                    value={refundForm.data.payment_method}
                                    onChange={(val) =>
                                        refundForm.setData(
                                            'payment_method',
                                            String(val),
                                        )
                                    }
                                    options={[
                                        {
                                            value: 'cash',
                                            label: t(
                                                'contracts.method_cash',
                                                'Naqd pul',
                                            ),
                                        },
                                        {
                                            value: 'card',
                                            label: t(
                                                'contracts.method_card',
                                                'Karta / Terminal',
                                            ),
                                        },
                                        {
                                            value: 'bank_transfer',
                                            label: t(
                                                'contracts.method_bank',
                                                'Bank hisob raqami',
                                            ),
                                        },
                                    ]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="cancel_contract"
                                    checked={refundForm.data.cancel_contract}
                                    onChange={(e) =>
                                        refundForm.setData(
                                            'cancel_contract',
                                            e.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-primary"
                                />
                                <label
                                    htmlFor="cancel_contract"
                                    className="cursor-pointer text-xs font-medium text-foreground"
                                >
                                    {t(
                                        'contracts.cancel_contract_checkbox',
                                        "Shartnoma holatini bekor qilingan (Cancelled) ga o'tkazish",
                                    )}
                                </label>
                            </div>

                            <div>
                                <Label htmlFor="refund_notes">
                                    {t(
                                        'contracts.refund_reason',
                                        'Qaytarish sababi / Izoh',
                                    )}
                                </Label>
                                <Input
                                    id="refund_notes"
                                    value={refundForm.data.notes}
                                    onChange={(e) =>
                                        refundForm.setData(
                                            'notes',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="O'qishni to'xtatdi..."
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRefundingContract(null)}
                                >
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={refundForm.processing}
                                    className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                    {t(
                                        'contracts.refund_button',
                                        "To'lovni qaytarish",
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Contract Payments History Modal */}
            <Dialog
                open={!!viewingPaymentsContract}
                onOpenChange={(open) =>
                    !open && setViewingPaymentsContract(null)
                }
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <ReceiptText className="h-5 w-5" />
                            {t(
                                'contracts.payments_history',
                                "To'lovlar Tarixi",
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {viewingPaymentsContract && (
                        <div className="space-y-4 text-xs">
                            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                                <div>
                                    <div className="font-semibold text-foreground">
                                        {
                                            viewingPaymentsContract.student
                                                ?.full_name
                                        }
                                    </div>
                                    <div className="font-mono text-muted-foreground">
                                        #
                                        {
                                            viewingPaymentsContract.contract_number
                                        }
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {t(
                                            'contracts.paid_amount',
                                            "To'langan",
                                        )}
                                        :{' '}
                                        {formatMoney(
                                            viewingPaymentsContract.paid_amount,
                                        )}
                                    </div>
                                    <div className="text-[11px] text-red-500">
                                        {t('contracts.debt_amount', 'Qarz')}:{' '}
                                        {formatMoney(
                                            viewingPaymentsContract.debt_amount,
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!viewingPaymentsContract.payments ||
                            viewingPaymentsContract.payments.length === 0 ? (
                                <div className="py-6 text-center text-muted-foreground">
                                    {t(
                                        'contracts.no_payments',
                                        "Ushbu shartnoma bo'yicha to'lovlar mavjud emas",
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t(
                                                        'finance.receipt',
                                                        'Chek №',
                                                    )}
                                                </TableHead>
                                                <TableHead>
                                                    {t('finance.date', 'Sana')}
                                                </TableHead>
                                                <TableHead>
                                                    {t(
                                                        'finance.register',
                                                        'Kassa',
                                                    )}
                                                </TableHead>
                                                <TableHead>
                                                    {t(
                                                        'finance.amount',
                                                        'Summa',
                                                    )}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t(
                                                        'common.actions',
                                                        'Amallar',
                                                    )}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewingPaymentsContract.payments.map(
                                                (p) => {
                                                    const isRefund =
                                                        p.payment_type ===
                                                        'refund';

                                                    return (
                                                        <TableRow key={p.id}>
                                                            <TableCell className="font-mono font-medium">
                                                                #
                                                                {
                                                                    p.receipt_number
                                                                }
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                                {formatDateTime(
                                                                    p.paid_at,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {p.cash_register
                                                                    ?.name ||
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell
                                                                className={`font-semibold ${isRefund ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}
                                                            >
                                                                {isRefund
                                                                    ? '-'
                                                                    : '+'}
                                                                {formatMoney(
                                                                    p.amount,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {can(
                                                                    'payments.edit',
                                                                ) && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() =>
                                                                            handleDeletePayment(
                                                                                p.id,
                                                                            )
                                                                        }
                                                                        title={t(
                                                                            'common.delete',
                                                                            "O'chirish",
                                                                        )}
                                                                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                },
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setViewingPaymentsContract(null)
                                    }
                                >
                                    {t('common.close', 'Yopish')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
