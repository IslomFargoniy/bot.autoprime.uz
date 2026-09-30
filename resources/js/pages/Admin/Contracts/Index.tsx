import { useState } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Download,
    FileText,
    Search,
    Trash2,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    ReceiptText,
    Eye,
    User,
    Calendar,
    Check,
    X,
    ExternalLink,
    Clock,
    DollarSign,
    Shield,
    BookOpen,
    Car,
    Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import PerPageSelect from '@/components/per-page-select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate, formatDateTime, parseDate, formatNumber, formatMoney } from '@/lib/utils';
import { MoneyInput } from '@/components/ui/money-input';

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
    students: Array<{ id: number; full_name: string; phone: string; group_id?: number }>;
    contractTypes: Array<{ id: number; name: string; price: number | string; category: string }>;
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

export default function ContractsIndex({ contracts, students, contractTypes, groups, branches, cashRegisters = [], filters }: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const [showModal, setShowModal] = useState(false);
    const [viewingContract, setViewingContract] = useState<Contract | null>(null);
    const [refundingContract, setRefundingContract] = useState<Contract | null>(null);
    const [viewingPaymentsContract, setViewingPaymentsContract] = useState<Contract | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const refundForm = useForm({
        cash_register_id: cashRegisters[0]?.id ? String(cashRegisters[0].id) : '',
        amount: '',
        payment_method: 'cash',
        cancel_contract: true,
        notes: '',
    });

    const form = useForm({
        student_id: students[0]?.id || '',
        contract_type_id: contractTypes[0]?.id || '',
        group_id: '',
        discount_amount: 0,
        start_date: '',
        end_date: '',
        terms: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/contracts', { ...filters, search, per_page: perPage }, { preserveState: true });
    };

    const handleFilterStatus = (status: string) => {
        router.get('/admin/contracts', { ...filters, payment_status: status === 'all' ? '' : status, per_page: perPage }, { preserveState: true });
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get('/admin/contracts', { ...filters, search, per_page: newPerPage }, { preserveState: true, replace: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/contracts', {
            onSuccess: () => {
                setShowModal(false);
                form.reset();
                toast.success(t('contracts.created_success', 'Shartnoma muvaffaqiyatli tuzildi'));
            },
            onError: (err) => {
                const first = Object.values(err)[0] as string;
                toast.error(t(first, first) || t('common.error', 'Xatolik yuz berdi'));
            },
        });
    };

    const handleDelete = (contract: Contract) => {
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/contracts/${contract.id}`, {
                onSuccess: () => {
                    if (viewingContract?.id === contract.id) setViewingContract(null);
                    toast.success(t('common.deleted', 'O\'chirildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const openRefund = (contract: Contract) => {
        setRefundingContract(contract);
        refundForm.setData({
            cash_register_id: cashRegisters[0]?.id ? String(cashRegisters[0].id) : '',
            amount: String(contract.paid_amount),
            payment_method: 'cash',
            cancel_contract: true,
            notes: '',
        });
    };

    const handleRefundSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!refundingContract) return;

        refundForm.post(`/admin/contracts/${refundingContract.id}/refund`, {
            onSuccess: () => {
                setRefundingContract(null);
                refundForm.reset();
                toast.success(t('contracts.refund_success', "To'lov muvaffaqiyatli qaytarildi"));
            },
            onError: (err) => {
                toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi'));
            },
        });
    };

    const handleDeletePayment = (paymentId: number) => {
        if (confirm(t('contracts.confirm_delete_payment', 'Rostdan ham ushbu to\'lovni o\'chirmoqchimisiz? Kassadan mablag\' yechiladi va shartnoma balansi qayta hisoblanadi.'))) {
            router.delete(`/admin/finance/payment/${paymentId}`, {
                onSuccess: () => {
                    toast.success(t('finance.payment_deleted', 'To\'lov o\'chirildi'));
                    setViewingPaymentsContract(null);
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi'));
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
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <Head title={t('contracts.title', 'Shartnomalar')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl font-bold">{t('contracts.title', 'Shartnomalar')}</h1>
                {can('contracts.create') && (
                    <Button onClick={() => setShowModal(true)} variant="brand" size="sm" className="text-xs shrink-0">
                        <Plus className="w-4 h-4 mr-1.5" />
                        <span>{t('common.add', 'Qo\'shish')}</span>
                    </Button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="bg-card border rounded-xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 flex-nowrap md:flex-wrap">
                    {['all', 'unpaid', 'partial', 'paid'].map((st) => (
                        <button
                            key={st}
                            onClick={() => handleFilterStatus(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                                (filters.payment_status || 'all') === st
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-muted/50 text-foreground border-input hover:bg-muted'
                            }`}
                        >
                            {t(`contracts.status_${st}`, st)}
                        </button>
                    ))}
                    <button
                        onClick={() => router.get('/admin/contracts', { ...filters, has_debt: !filters.has_debt }, { preserveState: true })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                            filters.has_debt
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-muted/50 text-foreground border-input hover:bg-muted'
                        }`}
                    >
                        {t('contracts.debtors_only', 'Faqat qarzdorlar')}
                    </button>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto items-center">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('common.search', 'Shartnoma yoki talaba...')}
                            className="pl-9 h-10 text-sm"
                        />
                    </div>
                    <PerPageSelect value={perPage} onChange={handlePerPageChange} />
                    <Button type="submit" variant="secondary" className="shrink-0 h-10 px-4">
                        <Search className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('common.find', 'Qidiruv')}</span>
                    </Button>
                </form>
            </div>

            {/* Desktop & Tablet Table */}
            <div className="hidden md:block bg-card border rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">{t('contracts.number', '№')}</TableHead>
                                <TableHead>{t('contracts.student', 'Talaba')}</TableHead>
                                <TableHead>{t('contracts.tariff', 'Tarif')}</TableHead>
                                <TableHead>{t('contracts.group', 'Guruh')}</TableHead>
                                <TableHead>{t('contracts.final_amount', 'Summa')}</TableHead>
                                <TableHead>{t('contracts.paid_amount', 'To\'langan')}</TableHead>
                                <TableHead>{t('contracts.debt_amount', 'Qarz')}</TableHead>
                                <TableHead>{t('contracts.progress', 'To\'lov foizi')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.data.length === 0 ? (
                                <TableEmpty colSpan={9} title={t('contracts.no_contracts', 'Shartnomalar topilmadi')} />
                            ) : (
                                contracts.data.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-semibold font-mono text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setViewingContract(c)}
                                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                #{c.contract_number}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-xs">{c.student?.full_name}</div>
                                            <div className="text-muted-foreground text-[11px] font-mono">{c.student?.phone}</div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {c.contract_type?.name || '-'} ({c.contract_type?.category || 'B'})
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {c.group?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-medium text-xs">
                                            {formatMoney(c.final_amount)}
                                        </TableCell>
                                        <TableCell className="font-medium text-xs text-emerald-600 dark:text-emerald-400">
                                            <button
                                                type="button"
                                                onClick={() => setViewingPaymentsContract(c)}
                                                className="hover:underline inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
                                                title={t('contracts.payments_history', "To'lovlar tarixi")}
                                            >
                                                <ReceiptText className="w-3.5 h-3.5 text-emerald-500" />
                                                {formatMoney(c.paid_amount)}
                                            </button>
                                        </TableCell>
                                        <TableCell className="font-medium text-xs text-red-500">
                                            {formatMoney(c.debt_amount)}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${getBadgeStyle(c.payment_badge_color)}`}>
                                                {c.payment_percentage}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setViewingContract(c)}
                                                title={t('contracts.view_details', 'Shartnoma tafsilotlari')}
                                                className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setViewingPaymentsContract(c)}
                                                title={t('contracts.payments_history', "To'lovlar tarixi")}
                                                className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                            >
                                                <ReceiptText className="w-3.5 h-3.5" />
                                            </Button>
                                            {can('contracts.print') && (
                                                <a
                                                    href={`/admin/contracts/${c.id}/download-pdf`}
                                                    className="inline-flex items-center px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Download className="w-3.5 h-3.5 mr-1" />
                                                    PDF
                                                </a>
                                            )}
                                            {Number(c.paid_amount) > 0 && (
                                                (can('payments.edit') ? <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openRefund(c)}
                                                    title={t('contracts.refund_button', "To'lovni qaytarish (Refund)")}
                                                    className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                                    {t('contracts.refund', 'Qaytarish')}
                                                </Button> : null)
                                            )}
                                            {can('contracts.edit') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(c)}
                                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
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
                {contracts.data.length === 0 ? (
                    <div className="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground shadow-xs">
                        {t('contracts.no_contracts', 'Shartnomalar topilmadi')}
                    </div>
                ) : (
                    contracts.data.map((c) => (
                        <div key={c.id} className="bg-card border rounded-xl p-4 space-y-3 shadow-xs">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-sm flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setViewingContract(c)}
                                            className="font-mono text-primary font-bold hover:underline"
                                        >
                                            #{c.contract_number}
                                        </button>
                                        <span>{c.student?.full_name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.student?.phone}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 border ${getBadgeStyle(c.payment_badge_color)}`}>
                                    {c.payment_percentage}%
                                </span>
                            </div>

                            {/* Tariff & Group */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span className="px-2 py-0.5 bg-muted rounded">
                                    {c.contract_type?.name || '-'} ({c.contract_type?.category || 'B'})
                                </span>
                                {c.group?.name && (
                                    <span className="px-2 py-0.5 bg-muted rounded">
                                        {c.group.name}
                                    </span>
                                )}
                            </div>

                            {/* Financial Summary */}
                            <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted/40 rounded-lg text-xs">
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">{t('contracts.final_amount', 'Summa')}</span>
                                    <span className="font-semibold">{formatNumber(c.final_amount)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">{t('contracts.paid_amount', "To'langan")}</span>
                                    <button
                                        type="button"
                                        onClick={() => setViewingPaymentsContract(c)}
                                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                                    >
                                        <ReceiptText className="w-3 h-3" />
                                        {formatNumber(c.paid_amount)}
                                    </button>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">{t('contracts.debt_amount', 'Qarz')}</span>
                                    <span className={`font-semibold ${Number(c.debt_amount) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        {formatNumber(c.debt_amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center justify-between pt-2 border-t text-xs gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewingContract(c)}
                                    className="h-7 text-xs flex-1"
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    {t('common.details', 'Batafsil')}
                                </Button>
                                {can('contracts.print') && (
                                    <a
                                        href={`/admin/contracts/${c.id}/download-pdf`}
                                        className="inline-flex items-center px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1" />
                                        PDF
                                    </a>
                                )}
                                {can('contracts.edit') && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(c)}
                                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <Pagination links={contracts.links} total={contracts.total} from={contracts.from} to={contracts.to} />

            {/* View Full Contract Details Modal */}
            <Dialog open={!!viewingContract} onOpenChange={(open) => !open && setViewingContract(null)}>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2 border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-base font-bold font-mono block">#{viewingContract?.contract_number}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {viewingContract?.contract_date ? formatDate(viewingContract.contract_date) : ''}
                                    </span>
                                </div>
                            </div>
                            {viewingContract && (
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${getBadgeStyle(viewingContract.payment_badge_color)}`}>
                                        {viewingContract.payment_percentage}%
                                    </span>
                                    <span className="px-2.5 py-1 rounded-md border bg-muted text-xs font-medium uppercase">
                                        {viewingContract.status}
                                    </span>
                                </div>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">Shartnomaning barcha tafsilotlari, modullari va to'lovlari</DialogDescription>
                    </DialogHeader>

                    {viewingContract && (
                        <div className="space-y-4 pt-2 text-xs">
                            {/* Student & Branch Info */}
                            <div className="bg-muted/40 rounded-xl p-3.5 border space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                                    <User className="w-4 h-4 text-blue-600" />
                                    {t('contracts.student', 'Talaba va Filial')}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[11px] text-muted-foreground block">{t('contracts.student', 'Talaba')}</span>
                                        <Link
                                            href={`/admin/students/${viewingContract.student_id}`}
                                            className="font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                        >
                                            <span>{viewingContract.student?.full_name}</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                        <div className="text-muted-foreground font-mono text-xs">{viewingContract.student?.phone}</div>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-muted-foreground block">{t('leads.branch', 'Filial')}</span>
                                        <span className="font-semibold text-sm text-foreground mt-0.5 inline-block">
                                            {viewingContract.branch?.name || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-muted-foreground block">{t('contracts.group', 'Guruh')}</span>
                                        <span className="font-medium px-2 py-0.5 bg-background border rounded inline-block mt-0.5">
                                            {viewingContract.group?.name || t('common.not_assigned', 'Biriktirilmagan')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-muted-foreground block">{t('contracts.dates', 'O\'qish muddatlari')}</span>
                                        <span className="font-medium text-foreground mt-0.5 inline-flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            {viewingContract.start_date ? formatDate(viewingContract.start_date) : '-'} — {viewingContract.end_date ? formatDate(viewingContract.end_date) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tariff & Learning Modules */}
                            <div className="bg-muted/40 rounded-xl p-3.5 border space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                                    <Shield className="w-4 h-4 text-emerald-600" />
                                    {t('contracts.tariff_and_modules', 'Tarif va Ta\'lim Modullari')}
                                </h3>
                                <div className="p-2.5 bg-background rounded-lg border flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-sm text-foreground">{viewingContract.contract_type?.name || '-'}</span>
                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[11px] font-semibold">
                                            {viewingContract.contract_type?.category || 'B'} toifa
                                        </span>
                                    </div>
                                    <span className="font-semibold font-mono text-primary">
                                        {formatMoney(viewingContract.total_amount)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${viewingContract.has_theory ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200' : 'bg-background opacity-60'}`}>
                                        <BookOpen className={`w-4 h-4 ${viewingContract.has_theory ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                                        <div>
                                            <span className="font-semibold text-[11px] block">{t('contracts.theory_module', 'Nazariya')}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {viewingContract.required_theory_lessons || 24} {t('contracts.lessons_count', 'dars')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${viewingContract.has_driving ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200' : 'bg-background opacity-60'}`}>
                                        <Car className={`w-4 h-4 ${viewingContract.has_driving ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                                        <div>
                                            <span className="font-semibold text-[11px] block">{t('contracts.driving_module', 'Haydash')}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {viewingContract.required_driving_lessons || 10} {t('contracts.lessons_count', 'dars')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${viewingContract.has_lms ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200' : 'bg-background opacity-60'}`}>
                                        <Laptop className={`w-4 h-4 ${viewingContract.has_lms ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                                        <div>
                                            <span className="font-semibold text-[11px] block">{t('contracts.lms_module', 'LMS Video')}</span>
                                            <span className="text-[10px] text-muted-foreground">Test & Video</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Calculation */}
                            <div className="bg-muted/40 rounded-xl p-3.5 border space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                    {t('contracts.financial_details', 'Moliyaviy Hisob-Kitob')}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-2 bg-background rounded-lg border">
                                        <span className="text-[10px] text-muted-foreground block">{t('contracts.total_amount', 'Tarif summasi')}</span>
                                        <span className="font-semibold text-xs">{formatMoney(viewingContract.total_amount)}</span>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg border">
                                        <span className="text-[10px] text-muted-foreground block">{t('contracts.discount', 'Chegirma')}</span>
                                        <span className="font-semibold text-xs text-amber-600">-{formatMoney(viewingContract.discount_amount)}</span>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg border">
                                        <span className="text-[10px] text-muted-foreground block">{t('contracts.final_amount', 'Yakuniy summa')}</span>
                                        <span className="font-bold text-xs text-foreground">{formatMoney(viewingContract.final_amount)}</span>
                                    </div>
                                    <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200">
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-medium">{t('contracts.paid_amount', 'To\'langan')}</span>
                                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">{formatMoney(viewingContract.paid_amount)}</span>
                                    </div>
                                    <div className="p-2 bg-rose-50/60 dark:bg-rose-950/30 rounded-lg border border-rose-200">
                                        <span className="text-[10px] text-rose-700 dark:text-rose-300 block font-medium">{t('contracts.debt_amount', 'Qoldiq qarz')}</span>
                                        <span className="font-bold text-xs text-rose-700 dark:text-rose-300">{formatMoney(viewingContract.debt_amount)}</span>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg border">
                                        <span className="text-[10px] text-muted-foreground block">{t('contracts.overpaid', 'Ortiqcha to\'lov')}</span>
                                        <span className="font-semibold text-xs text-blue-600">{formatMoney(viewingContract.overpaid_amount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info & Officer */}
                            {(viewingContract.createdBy || viewingContract.terms) && (
                                <div className="bg-muted/40 rounded-xl p-3.5 border space-y-2">
                                    {viewingContract.createdBy && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-muted-foreground">{t('contracts.created_by', 'Rasmiylashtirdi')}:</span>
                                            <span className="font-medium text-foreground">{viewingContract.createdBy.name}</span>
                                        </div>
                                    )}
                                    {viewingContract.terms && (
                                        <div>
                                            <span className="text-[11px] text-muted-foreground block">{t('common.description', 'Izoh / Shartlar')}:</span>
                                            <p className="mt-0.5 text-foreground bg-background p-2 rounded border">{viewingContract.terms}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-2 border-t gap-2">
                                <Button type="button" variant="outline" onClick={() => setViewingContract(null)}>
                                    {t('common.close', 'Yopish')}
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setViewingPaymentsContract(viewingContract);
                                        }}
                                        className="text-xs"
                                    >
                                        <ReceiptText className="w-3.5 h-3.5 mr-1" />
                                        {t('contracts.payments_history', 'To\'lovlar tarixi')}
                                    </Button>
                                    {can('contracts.print') && (
                                        <a
                                            href={`/admin/contracts/${viewingContract.id}/download-pdf`}
                                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                            {t('common.download_pdf', 'PDF Yuklab olish')}
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
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('contracts.create_title', 'Yangi Shartnoma Rasmiylashtirish')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label required htmlFor="student_id">{t('contracts.select_student', 'Talaba (O\'quvchi)')}</Label>
                            <SearchableSelect
                                id="student_id"
                                value={form.data.student_id}
                                onChange={(val) => {
                                    form.setData('student_id', val);
                                    const std = students.find((s) => s.id === Number(val));
                                    if (std && std.group_id) {
                                        form.setData('group_id', String(std.group_id));
                                    }
                                }}
                                options={students.map((s) => ({
                                    value: s.id,
                                    label: s.full_name,
                                    sublabel: s.phone,
                                }))}
                                placeholder={t('contracts.select_student', 'Talabani tanlang')}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label required htmlFor="contract_type_id">{t('contracts.select_tariff', 'Tarif')}</Label>
                            <SearchableSelect
                                id="contract_type_id"
                                value={form.data.contract_type_id}
                                onChange={(val) => form.setData('contract_type_id', val)}
                                options={contractTypes.map((ct) => ({
                                    value: ct.id,
                                    label: ct.name,
                                    sublabel: `${formatMoney(ct.price)} (${ct.category})`,
                                }))}
                                placeholder={t('contracts.select_tariff', 'Tarifni tanlang')}
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="group_id">{t('contracts.select_group', 'Guruh')}</Label>
                                <SearchableSelect
                                    id="group_id"
                                    value={form.data.group_id}
                                    onChange={(val) => form.setData('group_id', val)}
                                    options={[
                                        { value: '', label: t('common.not_assigned', 'Biriktirilmagan') },
                                        ...groups.map((g) => ({ value: g.id, label: g.name })),
                                    ]}
                                    placeholder={t('common.not_assigned', 'Biriktirilmagan')}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="discount_amount">{t('contracts.discount_amount', 'Chegirma Miqdori (UZS)')}</Label>
                                <MoneyInput
                                    id="discount_amount"
                                    value={form.data.discount_amount}
                                    onChange={(val) => form.setData('discount_amount', Number(val) || 0)}
                                    className="mt-1"
                                    placeholder="0"
                                    suffix="UZS"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="start_date">{t('contracts.start_date', 'Boshlanish Sanasi')}</Label>
                                <DatePicker
                                    id="start_date"
                                    value={form.data.start_date}
                                    onChange={(val) => form.setData('start_date', val)}
                                    className="mt-1"
                                />
                                {form.errors.start_date && (
                                    <p className="text-red-500 text-xs mt-1">{t(form.errors.start_date, form.errors.start_date)}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="end_date">{t('contracts.end_date', 'Tugash Sanasi')}</Label>
                                <DatePicker
                                    id="end_date"
                                    value={form.data.end_date}
                                    onChange={(val) => form.setData('end_date', val)}
                                    className="mt-1"
                                />
                                {form.errors.end_date && (
                                    <p className="text-red-500 text-xs mt-1">{t(form.errors.end_date, form.errors.end_date)}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="terms">{t('common.description', 'Qo\'shimcha shartlar / Izoh')}</Label>
                            <Input
                                id="terms"
                                value={form.data.terms}
                                onChange={(e) => form.setData('terms', e.target.value)}
                                className="mt-1"
                                placeholder="Maxsus kelishuvlar..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={form.processing}>
                                {t('common.save', 'Rasmiylashtirish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Refund Modal */}
            <Dialog open={!!refundingContract} onOpenChange={(open) => !open && setRefundingContract(null)}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <RotateCcw className="w-5 h-5" />
                            {t('contracts.refund_modal_title', "To'lovni Qaytarish (Refund)")}
                        </DialogTitle>
                    </DialogHeader>

                    {refundingContract && (
                        <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
                            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                                <div className="font-semibold text-foreground">
                                    {refundingContract.student?.full_name}
                                </div>
                                <div className="text-muted-foreground">
                                    #{refundingContract.contract_number} • {refundingContract.contract_type?.name}
                                </div>
                                <div className="text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                                    {t('contracts.paid_amount', "To'langan summa")}: {formatMoney(refundingContract.paid_amount)}
                                </div>
                            </div>

                            <div>
                                <Label required htmlFor="refund_amount">
                                    {t('contracts.refund_amount', 'Qaytariladigan summa (UZS)')}
                                </Label>
                                <MoneyInput
                                    id="refund_amount"
                                    value={refundForm.data.amount}
                                    onChange={(val) => refundForm.setData('amount', val)}
                                    placeholder="0"
                                    suffix="UZS"
                                    className="mt-1 font-semibold text-amber-600"
                                    required
                                />
                                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                                    {t('contracts.max_refund_notice', 'Maksimal qaytarish mumkin bo\'lgan summa')}: {formatMoney(refundingContract.paid_amount)}
                                </span>
                            </div>

                            <div>
                                <Label required htmlFor="refund_cash_register">
                                    {t('contracts.refund_from_register', 'Qaysi kassadan qaytariladi')}
                                </Label>
                                <SearchableSelect
                                    id="refund_cash_register"
                                    value={refundForm.data.cash_register_id}
                                    onChange={(val) => refundForm.setData('cash_register_id', String(val))}
                                    options={cashRegisters.map((cr) => ({
                                        value: String(cr.id),
                                        label: `${cr.name} (${formatMoney(cr.balance)})`,
                                    }))}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label required htmlFor="refund_method">{t('contracts.payment_method', "To'lov usuli")}</Label>
                                <SearchableSelect
                                    id="refund_method"
                                    value={refundForm.data.payment_method}
                                    onChange={(val) => refundForm.setData('payment_method', String(val))}
                                    options={[
                                        { value: 'cash', label: t('contracts.method_cash', 'Naqd pul') },
                                        { value: 'card', label: t('contracts.method_card', 'Karta / Terminal') },
                                        { value: 'bank_transfer', label: t('contracts.method_bank', 'Bank hisob raqami') },
                                    ]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="cancel_contract"
                                    checked={refundForm.data.cancel_contract}
                                    onChange={(e) => refundForm.setData('cancel_contract', e.target.checked)}
                                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="cancel_contract" className="text-xs text-foreground font-medium cursor-pointer">
                                    {t('contracts.cancel_contract_checkbox', 'Shartnoma holatini bekor qilingan (Cancelled) ga o\'tkazish')}
                                </label>
                            </div>

                            <div>
                                <Label htmlFor="refund_notes">{t('contracts.refund_reason', 'Qaytarish sababi / Izoh')}</Label>
                                <Input
                                    id="refund_notes"
                                    value={refundForm.data.notes}
                                    onChange={(e) => refundForm.setData('notes', e.target.value)}
                                    placeholder="O'qishni to'xtatdi..."
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setRefundingContract(null)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" disabled={refundForm.processing} className="bg-amber-600 hover:bg-amber-700 text-white">
                                    {t('contracts.refund_button', "To'lovni qaytarish")}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Contract Payments History Modal */}
            <Dialog open={!!viewingPaymentsContract} onOpenChange={(open) => !open && setViewingPaymentsContract(null)}>
                <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <ReceiptText className="w-5 h-5" />
                            {t('contracts.payments_history', "To'lovlar Tarixi")}
                        </DialogTitle>
                    </DialogHeader>

                    {viewingPaymentsContract && (
                        <div className="space-y-4 text-xs">
                            <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center border">
                                <div>
                                    <div className="font-semibold text-foreground">
                                        {viewingPaymentsContract.student?.full_name}
                                    </div>
                                    <div className="text-muted-foreground font-mono">#{viewingPaymentsContract.contract_number}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        {t('contracts.paid_amount', "To'langan")}: {formatMoney(viewingPaymentsContract.paid_amount)}
                                    </div>
                                    <div className="text-red-500 text-[11px]">
                                        {t('contracts.debt_amount', 'Qarz')}: {formatMoney(viewingPaymentsContract.debt_amount)}
                                    </div>
                                </div>
                            </div>

                            {(!viewingPaymentsContract.payments || viewingPaymentsContract.payments.length === 0) ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    {t('contracts.no_payments', "Ushbu shartnoma bo'yicha to'lovlar mavjud emas")}
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('finance.receipt', 'Chek №')}</TableHead>
                                                <TableHead>{t('finance.date', 'Sana')}</TableHead>
                                                <TableHead>{t('finance.register', 'Kassa')}</TableHead>
                                                <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewingPaymentsContract.payments.map((p) => {
                                                const isRefund = p.payment_type === 'refund';
                                                return (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium font-mono">#{p.receipt_number}</TableCell>
                                                        <TableCell className="text-muted-foreground font-mono text-xs">{formatDateTime(p.paid_at)}</TableCell>
                                                        <TableCell className="text-muted-foreground">{p.cash_register?.name || '-'}</TableCell>
                                                        <TableCell className={`font-semibold ${isRefund ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            {isRefund ? '-' : '+'}{formatMoney(p.amount)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {can('payments.edit') && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeletePayment(p.id)}
                                                                    title={t('common.delete', "O'chirish")}
                                                                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button type="button" variant="outline" onClick={() => setViewingPaymentsContract(null)}>
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
