import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, UserCheck, Trash2, Filter, Search, Phone, Calendar, ArrowRight } from 'lucide-react';
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

interface Lead {
    id: number;
    full_name: string;
    phone: string;
    category?: string;
    source: string;
    stage: 'new_lead' | 'form_sent' | 'form_completed' | 'contract_signed' | 'rejected';
    notes?: string;
    branch_id?: number;
    branch?: { name: string };
    converted_student_id?: number;
    created_at: string;
}

interface PageProps {
    leads: {
        data: Lead[];
        links: any[];
        total: number;
    };
    contractTypes: Array<{
        id: number;
        name: string;
        price: string | number;
        category: string;
    }>;
    groups: Array<{
        id: number;
        name: string;
        category: string;
    }>;
    branches: Array<{ id: number; name: string }>;
    filters: {
        search?: string;
        stage?: string;
        source?: string;
        branch_id?: string | number;
    };
}

export default function LeadsIndex({ leads, contractTypes, groups, branches, filters }: PageProps) {
    const { t } = useTranslation();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
    const [search, setSearch] = useState(filters.search || '');

    const createForm = useForm({
        full_name: '',
        phone: '',
        category: 'B',
        branch_id: branches[0]?.id || '',
        source: 'reception_manual',
        notes: '',
    });

    const convertForm = useForm({
        contract_type_id: contractTypes[0]?.id || '',
        group_id: groups[0]?.id || '',
        branch_id: '',
        discount_amount: 0,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/leads', { ...filters, search }, { preserveState: true });
    };

    const handleStageChange = (stage: string) => {
        router.get('/admin/leads', { ...filters, stage: stage === 'all' ? '' : stage }, { preserveState: true });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/leads', {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                toast.success(t('leads.created_success', 'Lid muvaffaqiyatli saqlandi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleConvertSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!convertingLead) return;

        convertForm.post(`/admin/leads/${convertingLead.id}/convert`, {
            onSuccess: () => {
                setConvertingLead(null);
                toast.success(t('leads.converted_success', 'O\'quvchi ochildi va shartnoma tuzildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleDelete = (lead: Lead) => {
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/leads/${lead.id}`, {
                onSuccess: () => toast.success(t('common.deleted', 'O\'chirildi')),
            });
        }
    };

    const getStageBadge = (stage: string) => {
        switch (stage) {
            case 'new_lead':
                return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'form_sent':
                return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'form_completed':
                return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'contract_signed':
                return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'rejected':
                return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
            default:
                return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    return (
        <div className="p-6">
            <Head title={t('leads.title', 'CRM Lidlar')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('leads.title', 'CRM Lidlar')}</h1>
                <Button onClick={() => setShowCreateModal(true)} size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                    <Plus className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{t('common.add', 'Qo\'shish')}</span>
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {['all', 'new_lead', 'form_sent', 'form_completed', 'contract_signed', 'rejected'].map((st) => (
                        <button
                            key={st}
                            onClick={() => handleStageChange(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                (filters.stage || 'all') === st
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {t(`leads.stage_${st}`, st)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('common.search', 'Qidirish...')}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                    <Button type="submit" variant="secondary" size="sm">
                        {t('common.find', 'Qidiruv')}
                    </Button>
                </form>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('leads.client', 'Mijoz (F.I.O)')}</th>
                                <th className="p-3.5 font-semibold">{t('leads.phone', 'Telefon')}</th>
                                <th className="p-3.5 font-semibold">{t('leads.category', 'Toifa')}</th>
                                <th className="p-3.5 font-semibold">{t('leads.source', 'Manba')}</th>
                                <th className="p-3.5 font-semibold">{t('leads.stage', 'Holat')}</th>
                                <th className="p-3.5 font-semibold">{t('leads.branch', 'Filial')}</th>
                                <th className="p-3.5 font-semibold text-right">{t('common.actions', 'Amallar')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {leads.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400 dark:text-gray-500">
                                        {t('leads.no_leads', 'Hech qanday lid topilmadi')}
                                    </td>
                                </tr>
                            ) : (
                                leads.data.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40">
                                        <td className="p-3.5 font-medium text-gray-900 dark:text-white">
                                            {lead.full_name}
                                        </td>
                                        <td className="p-3.5 text-gray-600 dark:text-gray-300">
                                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                {lead.phone}
                                            </a>
                                        </td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-semibold">
                                                {lead.category || 'B'}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-gray-500 dark:text-gray-400">
                                            {lead.source}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${getStageBadge(lead.stage)}`}>
                                                {t(`leads.stage_${lead.stage}`, lead.stage)}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-gray-500 dark:text-gray-400">
                                            {lead.branch?.name || '-'}
                                        </td>
                                        <td className="p-3.5 text-right space-x-1">
                                            {lead.stage !== 'contract_signed' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setConvertingLead(lead);
                                                        convertForm.setData({
                                                            ...convertForm.data,
                                                            branch_id: String(lead.branch_id || branches[0]?.id || ''),
                                                        });
                                                    }}
                                                    className="h-7 text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                                >
                                                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                                                    {t('leads.convert_button', 'Shartnoma tuzish')}
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(lead)}
                                                className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
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

            {/* Create Lead Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('leads.create_lead_title', 'Yangi Lid Qo\'shish')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="full_name">{t('leads.full_name', 'Mijoz F.I.O')}</Label>
                            <Input
                                id="full_name"
                                value={createForm.data.full_name}
                                onChange={(e) => createForm.setData('full_name', e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="phone">{t('leads.phone', 'Telefon')}</Label>
                                <Input
                                    id="phone"
                                    value={createForm.data.phone}
                                    onChange={(e) => createForm.setData('phone', e.target.value)}
                                    placeholder="+998"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="category">{t('leads.category', 'Toifa')}</Label>
                                <SearchableSelect
                                    id="category"
                                    value={createForm.data.category}
                                    onChange={(val) => createForm.setData('category', String(val))}
                                    options={[
                                        { value: 'B', label: 'B toifa' },
                                        { value: 'A', label: 'A toifa' },
                                        { value: 'C', label: 'C toifa' },
                                        { value: 'BC', label: 'BC toifa' },
                                        { value: 'D', label: 'D toifa' },
                                    ]}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="branch_id">{t('leads.branch', 'Filial')}</Label>
                                <SearchableSelect
                                    id="branch_id"
                                    value={createForm.data.branch_id}
                                    onChange={(val) => createForm.setData('branch_id', val ? String(val) : '')}
                                    options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                                    placeholder={t('leads.branch', 'Filial')}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="source">{t('leads.source', 'Manba')}</Label>
                                <SearchableSelect
                                    id="source"
                                    value={createForm.data.source}
                                    onChange={(val) => createForm.setData('source', String(val))}
                                    options={[
                                        { value: 'reception_manual', label: 'Reception' },
                                        { value: 'telegram_bot', label: 'Telegram Bot' },
                                        { value: 'instagram', label: 'Instagram' },
                                        { value: 'website', label: 'Vebsayt' },
                                        { value: 'referral', label: 'Tavsiya' },
                                    ]}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="notes">{t('leads.notes', 'Izoh')}</Label>
                            <Input
                                id="notes"
                                value={createForm.data.notes}
                                onChange={(e) => createForm.setData('notes', e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" disabled={createForm.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Convert to Student Modal */}
            <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('leads.convert_modal_title', 'Lidni O\'quvchiga Aylantirish')}</DialogTitle>
                    </DialogHeader>
                    {convertingLead && (
                        <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <p className="font-semibold text-gray-900 dark:text-white">{convertingLead.full_name}</p>
                                <p className="text-gray-500 mt-0.5">{convertingLead.phone} • {convertingLead.category || 'B'} toifa</p>
                            </div>
                            <div>
                                <Label htmlFor="contract_type_id">{t('leads.select_tariff', 'Shartnoma Tarifi')}</Label>
                                <SearchableSelect
                                    id="contract_type_id"
                                    value={convertForm.data.contract_type_id}
                                    onChange={(val) => convertForm.setData('contract_type_id', val)}
                                    options={contractTypes.map((ct) => ({
                                        value: ct.id,
                                        label: ct.name,
                                        sublabel: `${Number(ct.price).toLocaleString('uz-UZ')} UZS`,
                                    }))}
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="conv_group_id">{t('leads.select_group', 'Guruh')}</Label>
                                    <SearchableSelect
                                        id="conv_group_id"
                                        value={convertForm.data.group_id}
                                        onChange={(val) => convertForm.setData('group_id', val)}
                                        options={[
                                            { value: '', label: t('common.not_assigned', 'Biriktirilmagan') },
                                            ...groups.map((g) => ({ value: g.id, label: g.name })),
                                        ]}
                                        placeholder={t('common.not_assigned', 'Biriktirilmagan')}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="discount_amount">{t('leads.discount_amount', 'Chegirma (UZS)')}</Label>
                                    <Input
                                        id="discount_amount"
                                        type="number"
                                        value={convertForm.data.discount_amount}
                                        onChange={(e) => convertForm.setData('discount_amount', Number(e.target.value))}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setConvertingLead(null)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={convertForm.processing}>
                                    <ArrowRight className="w-4 h-4 mr-1.5" />
                                    {t('leads.confirm_convert', 'Shartnomani Rasmiylashtirish')}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
