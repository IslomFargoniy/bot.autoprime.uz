import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, FileText, Search, Trash2, CheckCircle2, AlertCircle, RotateCcw, ReceiptText } from 'lucide-react';
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
import { DatePicker } from '@/components/ui/date-picker';

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
    contract_type?: { name: string; category: string };
    group?: { name: string };
    branch?: { name: string };
    total_amount: number | string;
    final_amount: number | string;
    paid_amount: number | string;
    debt_amount: number | string;
    payment_percentage: number;
    payment_badge_color: 'white' | 'red' | 'yellow' | 'green';
    status: 'draft' | 'active' | 'completed' | 'cancelled';
    payment_status: 'unpaid' | 'partial' | 'paid';
    contract_date: string;
    payments?: ContractPayment[];
}

interface PageProps {
    contracts: {
        data: Contract[];
        links: any[];
        total: number;
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
    };
}

export default function ContractsIndex({ contracts, students, contractTypes, groups, branches, cashRegisters = [], filters }: PageProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [refundingContract, setRefundingContract] = useState<Contract | null>(null);
    const [viewingPaymentsContract, setViewingPaymentsContract] = useState<Contract | null>(null);
    const [search, setSearch] = useState(filters.search || '');

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
        router.get('/admin/contracts', { ...filters, search }, { preserveState: true });
    };

    const handleFilterStatus = (status: string) => {
        router.get('/admin/contracts', { ...filters, payment_status: status === 'all' ? '' : status }, { preserveState: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/contracts', {
            onSuccess: () => {
                setShowModal(false);
                form.reset();
                toast.success(t('contracts.created_success', 'Shartnoma muvaffaqiyatli tuzildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleDelete = (contract: Contract) => {
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/contracts/${contract.id}`, {
                onSuccess: () => toast.success(t('common.deleted', 'O\'chirildi')),
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
        <div className="p-6">
            <Head title={t('contracts.title', 'Shartnomalar')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('contracts.title', 'Shartnomalar')}</h1>
                <Button onClick={() => setShowModal(true)} variant="brand" size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                    <Plus className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{t('common.add', 'Qo\'shish')}</span>
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="bg-card border rounded-xl p-4 shadow-xs mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
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

                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('common.search', 'Shartnoma yoki talaba...')}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                    <Button type="submit" variant="secondary" size="sm">
                        {t('common.find', 'Qidiruv')}
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
                                    <TableCell className="font-semibold font-mono">
                                        #{c.contract_number}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{c.student?.full_name}</div>
                                        <div className="text-muted-foreground text-[11px] font-mono">{c.student?.phone}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {c.contract_type?.name || '-'} ({c.contract_type?.category || 'B'})
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {c.group?.name || '-'}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">
                                        {Number(c.final_amount).toLocaleString('uz-UZ')} UZS
                                    </TableCell>
                                    <TableCell className="font-medium text-xs text-emerald-600 dark:text-emerald-400">
                                        <button
                                            type="button"
                                            onClick={() => setViewingPaymentsContract(c)}
                                            className="hover:underline inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
                                            title={t('contracts.payments_history', "To'lovlar tarixi")}
                                        >
                                            <ReceiptText className="w-3.5 h-3.5 text-emerald-500" />
                                            {Number(c.paid_amount).toLocaleString('uz-UZ')} UZS
                                        </button>
                                    </TableCell>
                                    <TableCell className="font-medium text-xs text-red-500">
                                        {Number(c.debt_amount).toLocaleString('uz-UZ')} UZS
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
                                            onClick={() => setViewingPaymentsContract(c)}
                                            title={t('contracts.payments_history', "To'lovlar tarixi")}
                                            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                        >
                                            <ReceiptText className="w-3.5 h-3.5" />
                                        </Button>
                                        <a
                                            href={`/admin/contracts/${c.id}/download-pdf`}
                                            className="inline-flex items-center px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1" />
                                            PDF
                                        </a>
                                        {Number(c.paid_amount) > 0 && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openRefund(c)}
                                                title={t('contracts.refund_button', "To'lovni qaytarish (Refund)")}
                                                className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                                {t('contracts.refund', 'Qaytarish')}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(c)}
                                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
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

            {/* Mobile Cards Feed */}
            <div className="md:hidden space-y-3">
                {contracts.data.length === 0 ? (
                    <div className="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground shadow-xs">
                        {t('contracts.no_contracts', 'Shartnomalar topilmadi')}
                    </div>
                ) : (
                    contracts.data.map((c) => (
                        <div key={c.id} className="bg-card border rounded-xl p-4 space-y-3 shadow-xs">
                            {/* Header: Contract Number + Student + Badge */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-sm flex items-center gap-1.5">
                                        <span className="font-mono text-primary font-bold">#{c.contract_number}</span>
                                        <span>{c.student?.full_name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.student?.phone}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 border ${getBadgeStyle(c.payment_badge_color)}`}>
                                    {c.payment_percentage}%
                                </span>
                            </div>

                            {/* Tariff & Group Badges */}
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
                                    <span className="font-semibold">{Number(c.final_amount).toLocaleString('uz-UZ')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">{t('contracts.paid_amount', "To'langan")}</span>
                                    <button
                                        type="button"
                                        onClick={() => setViewingPaymentsContract(c)}
                                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                                        title={t('contracts.payments_history', "To'lovlar tarixi")}
                                    >
                                        <ReceiptText className="w-3 h-3" />
                                        {Number(c.paid_amount).toLocaleString('uz-UZ')}
                                    </button>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">{t('contracts.debt_amount', 'Qarz')}</span>
                                    <span className={`font-semibold ${Number(c.debt_amount) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        {Number(c.debt_amount).toLocaleString('uz-UZ')}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        c.payment_badge_color === 'green'
                                            ? 'bg-emerald-500'
                                            : c.payment_badge_color === 'yellow'
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, c.payment_percentage))}%` }}
                                />
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center justify-between pt-2 border-t text-xs">
                                <button
                                    type="button"
                                    onClick={() => setViewingPaymentsContract(c)}
                                    className="text-blue-600 dark:text-blue-400 font-medium inline-flex items-center gap-1 hover:underline"
                                >
                                    <ReceiptText className="w-3.5 h-3.5" />
                                    {t('contracts.payments_history', "To'lovlar")}
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <a
                                        href={`/admin/contracts/${c.id}/download-pdf`}
                                        className="inline-flex items-center px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1" />
                                        PDF
                                    </a>
                                    {Number(c.paid_amount) > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openRefund(c)}
                                            className="h-7 text-xs text-amber-600 hover:text-amber-700 border-amber-300 dark:border-amber-800"
                                        >
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            {t('contracts.refund', 'Qaytarish')}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(c)}
                                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Contract Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {t('contracts.create_title', 'Yangi Shartnoma Rasmiylashtirish')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="student_id" required>{t('contracts.select_student', 'Talaba (O\'quvchi)')}</Label>
                            <SearchableSelect
                                id="student_id"
                                value={form.data.student_id}
                                onChange={(val) => {
                                    const stId = Number(val);
                                    const found = students.find((s) => s.id === stId);
                                    form.setData({
                                        ...form.data,
                                        student_id: String(stId),
                                        group_id: found?.group_id ? String(found.group_id) : form.data.group_id,
                                    });
                                }}
                                options={students.map((s) => ({
                                    value: s.id,
                                    label: s.full_name,
                                    sublabel: s.phone,
                                }))}
                                placeholder={t('contracts.select_student', 'Talaba (O\'quvchi)')}
                                className="mt-1"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="contract_type_id" required>{t('contracts.select_tariff', 'Tarif')}</Label>
                                <SearchableSelect
                                    id="contract_type_id"
                                    value={form.data.contract_type_id}
                                    onChange={(val) => form.setData('contract_type_id', val)}
                                    options={contractTypes.map((ct) => ({
                                        value: ct.id,
                                        label: ct.name,
                                        sublabel: `${Number(ct.price).toLocaleString('uz-UZ')} UZS`,
                                    }))}
                                    placeholder={t('contracts.select_tariff', 'Tarif')}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="group_id">{t('contracts.select_group', 'Guruh')}</Label>
                                <SearchableSelect
                                    id="group_id"
                                    value={form.data.group_id}
                                    onChange={(val) => form.setData('group_id', val)}
                                    options={groups.map((g) => ({ value: g.id, label: g.name }))}
                                    placeholder={t('common.not_assigned', 'Biriktirilmagan')}
                                    allowClear
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="discount_amount">{t('contracts.discount_amount', 'Chegirma Miqdori (UZS)')}</Label>
                            <Input
                                id="discount_amount"
                                type="number"
                                value={form.data.discount_amount}
                                onChange={(e) => form.setData('discount_amount', Number(e.target.value))}
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="start_date">{t('contracts.start_date', 'Boshlanish Sanasi')}</Label>
                                <DatePicker
                                    id="start_date"
                                    value={form.data.start_date}
                                    onChange={(val) => form.setData('start_date', val)}
                                    placeholder="YYYY-MM-DD"
                                    className="mt-1 h-9 text-xs"
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_date">{t('contracts.end_date', 'Tugash Sanasi')}</Label>
                                <DatePicker
                                    id="end_date"
                                    value={form.data.end_date}
                                    onChange={(val) => form.setData('end_date', val)}
                                    placeholder="YYYY-MM-DD"
                                    className="mt-1 h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={form.processing}>
                                {t('common.save', 'Shartnoma Tuzish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Refund Modal */}
            <Dialog open={!!refundingContract} onOpenChange={(open) => !open && setRefundingContract(null)}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <RotateCcw className="w-5 h-5" />
                            {t('contracts.refund_modal_title', "To'lovni Qaytarish (Refund)")}
                        </DialogTitle>
                    </DialogHeader>

                    {refundingContract && (
                        <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg space-y-1">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                    {refundingContract.student?.full_name}
                                </div>
                                <div className="text-gray-500 flex justify-between">
                                    <span>#{refundingContract.contract_number}</span>
                                    <span>
                                        {t('contracts.max_refund_notice', "Maksimal summa")}:{' '}
                                        <strong className="text-emerald-600">
                                            {Number(refundingContract.paid_amount).toLocaleString('uz-UZ')} UZS
                                        </strong>
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="refund_amount" required>{t('contracts.refund_amount', 'Qaytariladigan summa (UZS)')}</Label>
                                    <Input
                                        id="refund_amount"
                                        type="number"
                                        min="1"
                                        max={refundingContract.paid_amount}
                                        value={refundForm.data.amount}
                                        onChange={(e) => refundForm.setData('amount', e.target.value)}
                                        className="mt-1"
                                        required
                                    />
                                    {refundForm.errors.amount && (
                                        <p className="text-red-500 text-[11px] mt-1">{refundForm.errors.amount}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="refund_payment_method" required>{t('contracts.payment_method', "To'lov usuli")}</Label>
                                    <SearchableSelect
                                        id="refund_payment_method"
                                        value={refundForm.data.payment_method}
                                        onChange={(val) => refundForm.setData('payment_method', String(val))}
                                        options={[
                                            { value: 'cash', label: t('contracts.method_cash', 'Naqd pul') },
                                            { value: 'card_click', label: t('contracts.method_card', 'Karta / Terminal') },
                                            { value: 'bank_transfer', label: t('contracts.method_bank', 'Bank hisob raqami') },
                                        ]}
                                        placeholder={t('contracts.payment_method', "To'lov usuli")}
                                        className="mt-1"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="refund_cash_register_id" required>{t('contracts.refund_from_register', 'Qaysi kassadan qaytariladi')}</Label>
                                <SearchableSelect
                                    id="refund_cash_register_id"
                                    value={refundForm.data.cash_register_id}
                                    onChange={(val) => refundForm.setData('cash_register_id', String(val))}
                                    options={(cashRegisters || []).map((cr) => ({
                                        value: cr.id,
                                        label: `${cr.name} (${Number(cr.balance).toLocaleString('uz-UZ')} UZS)`,
                                        sublabel: cr.type?.name || undefined,
                                    }))}
                                    placeholder={t('contracts.refund_from_register', 'Kassani tanlang')}
                                    className="mt-1"
                                    required
                                />
                                {refundForm.errors.cash_register_id && (
                                    <p className="text-red-500 text-[11px] mt-1">{refundForm.errors.cash_register_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="refund_notes">{t('contracts.refund_reason', 'Qaytarish sababi / Izoh')}</Label>
                                <Input
                                    id="refund_notes"
                                    type="text"
                                    value={refundForm.data.notes}
                                    onChange={(e) => refundForm.setData('notes', e.target.value)}
                                    placeholder={t('contracts.refund_reason', 'Qaytarish sababi...')}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="cancel_contract"
                                    checked={refundForm.data.cancel_contract}
                                    onChange={(e) => refundForm.setData('cancel_contract', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <Label htmlFor="cancel_contract" className="cursor-pointer text-xs font-normal">
                                    {t('contracts.cancel_contract_checkbox', "Shartnoma holatini bekor qilingan (Cancelled) ga o'tkazish")}
                                </Label>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-input">
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
                                        {t('contracts.paid_amount', "To'langan")}: {Number(viewingPaymentsContract.paid_amount).toLocaleString('uz-UZ')} UZS
                                    </div>
                                    <div className="text-red-500 text-[11px]">
                                        {t('contracts.debt_amount', 'Qarz')}: {Number(viewingPaymentsContract.debt_amount).toLocaleString('uz-UZ')} UZS
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
                                                        <TableCell className="text-muted-foreground">{p.paid_at}</TableCell>
                                                        <TableCell className="text-muted-foreground">{p.cash_register?.name || '-'}</TableCell>
                                                        <TableCell className={`font-semibold ${isRefund ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            {isRefund ? '-' : '+'}{Number(p.amount).toLocaleString('uz-UZ')} UZS
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeletePayment(p.id)}
                                                                title={t('common.delete', "O'chirish")}
                                                                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
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
