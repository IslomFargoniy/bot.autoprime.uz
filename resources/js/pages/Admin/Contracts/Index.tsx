import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, FileText, Search, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { DatePicker } from '@/components/ui/date-picker';

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
    filters: {
        search?: string;
        status?: string;
        payment_status?: string;
        has_debt?: boolean;
        branch_id?: string | number;
    };
}

export default function ContractsIndex({ contracts, students, contractTypes, groups, branches, filters }: PageProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState(filters.search || '');

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
                <Button onClick={() => setShowModal(true)} size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                    <Plus className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{t('common.add', 'Qo\'shish')}</span>
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {['all', 'unpaid', 'partial', 'paid'].map((st) => (
                        <button
                            key={st}
                            onClick={() => handleFilterStatus(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                (filters.payment_status || 'all') === st
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                        >
                            {t(`contracts.status_${st}`, st)}
                        </button>
                    ))}
                    <button
                        onClick={() => router.get('/admin/contracts', { ...filters, has_debt: !filters.has_debt }, { preserveState: true })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            filters.has_debt
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}
                    >
                        {t('contracts.debtors_only', 'Faqat qarzdorlar')}
                    </button>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
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

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('contracts.number', '№')}</th>
                                <th className="p-3.5 font-semibold">{t('contracts.student', 'Talaba')}</th>
                                <th className="p-3.5 font-semibold">{t('contracts.tariff', 'Tarif')}</th>
                                <th className="p-3.5 font-semibold">{t('contracts.group', 'Guruh')}</th>
                                <th className="p-3.5 font-semibold">{t('contracts.final_amount', 'Summa')}</th>
                                <th className="p-3.5 font-semibold">{t('contracts.paid_amount', 'To\'langan')}</th>
                                <th className="p-3.5 font-semibold">{t('contracts.debt_amount', 'Qarz')}</th>
                                <th className="p-3.5 font-semibold">{t('contracts.progress', 'To\'lov foizi')}</th>
                                <th className="p-3.5 font-semibold text-right">{t('common.actions', 'Amallar')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {contracts.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400 dark:text-gray-500">
                                        {t('contracts.no_contracts', 'Shartnomalar topilmadi')}
                                    </td>
                                </tr>
                            ) : (
                                contracts.data.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                                        <td className="p-3.5 font-semibold text-gray-900 dark:text-white">
                                            #{c.contract_number}
                                        </td>
                                        <td className="p-3.5">
                                            <div className="font-medium text-gray-900 dark:text-white">{c.student?.full_name}</div>
                                            <div className="text-gray-400 text-[11px]">{c.student?.phone}</div>
                                        </td>
                                        <td className="p-3.5 text-gray-600 dark:text-gray-300">
                                            {c.contract_type?.name || '-'} ({c.contract_type?.category || 'B'})
                                        </td>
                                        <td className="p-3.5 text-gray-500 dark:text-gray-400">
                                            {c.group?.name || '-'}
                                        </td>
                                        <td className="p-3.5 font-medium">
                                            {Number(c.final_amount).toLocaleString('uz-UZ')} UZS
                                        </td>
                                        <td className="p-3.5 font-medium text-emerald-600">
                                            {Number(c.paid_amount).toLocaleString('uz-UZ')} UZS
                                        </td>
                                        <td className="p-3.5 font-medium text-red-500">
                                            {Number(c.debt_amount).toLocaleString('uz-UZ')} UZS
                                        </td>
                                        <td className="p-3.5">
                                            <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${getBadgeStyle(c.payment_badge_color)}`}>
                                                {c.payment_percentage}%
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right space-x-1">
                                            <a
                                                href={`/admin/contracts/${c.id}/download-pdf`}
                                                className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1" />
                                                PDF
                                            </a>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(c)}
                                                className="h-7 text-xs text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Contract Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('contracts.create_title', 'Yangi Shartnoma Rasmiylashtirish')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="student_id">{t('contracts.select_student', 'Talaba (O\'quvchi)')}</Label>
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
                                <Label htmlFor="contract_type_id">{t('contracts.select_tariff', 'Tarif')}</Label>
                                <select
                                    id="contract_type_id"
                                    value={form.data.contract_type_id}
                                    onChange={(e) => form.setData('contract_type_id', e.target.value)}
                                    className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                    required
                                >
                                    {contractTypes.map((ct) => (
                                        <option key={ct.id} value={ct.id}>
                                            {ct.name} ({Number(ct.price).toLocaleString('uz-UZ')} UZS)
                                        </option>
                                    ))}
                                </select>
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
                            <Button type="submit" disabled={form.processing}>
                                {t('common.save', 'Shartnoma Tuzish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
