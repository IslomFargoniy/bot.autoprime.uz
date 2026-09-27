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

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'telegram_bot':
                return t('leads.source_telegram_bot', 'Telegram bot');
            case 'instagram':
                return t('leads.source_instagram', 'Instagram');
            case 'website':
                return t('leads.source_website', 'Vebsayt');
            case 'recommendation':
            case 'referral':
                return t('leads.source_recommendation', 'Tavsiya');
            case 'walk_in':
                return t('leads.source_walk_in', "O'zi kelgan (Ofis)");
            case 'reception_manual':
                return t('leads.source_reception_manual', 'Reception');
            case 'other':
                return t('leads.source_other', 'Boshqa');
            default:
                return t(`leads.source_${source}`, source);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <Head title={t('leads.title', 'CRM Lidlar')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold">{t('leads.title', 'CRM Lidlar')}</h1>
                <Button onClick={() => setShowCreateModal(true)} variant="brand" size="sm" className="text-xs shrink-0">
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>{t('common.add', 'Qo\'shish')}</span>
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-2xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto">
                    {['all', 'new_lead', 'form_sent', 'form_completed', 'contract_signed', 'rejected'].map((st) => (
                        <button
                            key={st}
                            onClick={() => handleStageChange(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition-colors ${
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
                    <Button type="submit" variant="secondary" size="sm" className="shrink-0">
                        {t('common.find', 'Qidiruv')}
                    </Button>
                </form>
            </div>

            {/* Desktop/Tablet Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('leads.client', 'Mijoz (F.I.O)')}</TableHead>
                            <TableHead>{t('leads.phone', 'Telefon')}</TableHead>
                            <TableHead>{t('leads.category', 'Toifa')}</TableHead>
                            <TableHead>{t('leads.source', 'Manba')}</TableHead>
                            <TableHead>{t('leads.stage', 'Holat')}</TableHead>
                            <TableHead>{t('leads.branch', 'Filial')}</TableHead>
                            <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.data.length === 0 ? (
                            <TableEmpty
                                colSpan={7}
                                icon={UserCheck}
                                title={t('leads.no_leads', 'Hech qanday lid topilmadi')}
                            />
                        ) : (
                            leads.data.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        {lead.full_name}
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-300">
                                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                                            {lead.phone}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-semibold text-xs">
                                            {lead.category || 'B'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-300">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground">
                                            {getSourceLabel(lead.source)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${getStageBadge(lead.stage)}`}>
                                            {t(`leads.stage_${lead.stage}`, lead.stage)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400">
                                        {lead.branch?.name || '-'}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
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
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Cards Feed */}
            <div className="md:hidden space-y-3">
                {leads.data.length === 0 ? (
                    <div className="text-center py-8 bg-card border border-dashed rounded-xl p-4">
                        <UserCheck className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                        <div className="font-medium text-sm">{t('leads.no_leads', 'Hech qanday lid topilmadi')}</div>
                    </div>
                ) : (
                    leads.data.map((lead) => (
                        <div key={lead.id} className="bg-card border rounded-xl p-3.5 shadow-2xs space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-sm text-foreground">{lead.full_name}</span>
                                        <span className="px-1.5 py-0.2 rounded-md bg-muted font-bold text-[10px]">
                                            {lead.category || 'B'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                                            <Phone className="w-3 h-3 text-muted-foreground" />
                                            <span>{lead.phone}</span>
                                        </a>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium shrink-0 ${getStageBadge(lead.stage)}`}>
                                    {t(`leads.stage_${lead.stage}`, lead.stage)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t text-muted-foreground">
                                <div className="truncate">
                                    <span className="text-[10px] block opacity-70">{t('leads.source', 'Manba')}:</span>
                                    <span className="truncate font-medium text-foreground">{getSourceLabel(lead.source)}</span>
                                </div>
                                <div className="truncate text-right">
                                    <span className="text-[10px] block opacity-70">{t('leads.branch', 'Filial')}:</span>
                                    <span className="truncate">{lead.branch?.name || '-'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t gap-2">
                                {lead.stage !== 'contract_signed' ? (
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
                                        className="h-8 flex-1 text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    >
                                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                                        {t('leads.convert_button', 'Shartnoma tuzish')}
                                    </Button>
                                ) : (
                                    <div />
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(lead)}
                                    className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Lead Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {t('leads.create_lead_title', 'Yangi Lid Qo\'shish')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label required htmlFor="full_name">{t('leads.full_name', 'Mijoz F.I.O')}</Label>
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
                                <Label required htmlFor="phone">{t('leads.phone', 'Telefon')}</Label>
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
                                        { value: 'telegram_bot', label: t('leads.source_telegram_bot', 'Telegram bot') },
                                        { value: 'instagram', label: t('leads.source_instagram', 'Instagram') },
                                        { value: 'website', label: t('leads.source_website', 'Vebsayt') },
                                        { value: 'recommendation', label: t('leads.source_recommendation', 'Tavsiya') },
                                        { value: 'walk_in', label: t('leads.source_walk_in', "O'zi kelgan (Ofis)") },
                                        { value: 'reception_manual', label: t('leads.source_reception_manual', 'Reception') },
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
                            <Button type="submit" variant="brand" disabled={createForm.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Convert to Student Modal */}
            <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            {t('leads.convert_modal_title', 'Lidni O\'quvchiga Aylantirish')}
                        </DialogTitle>
                    </DialogHeader>
                    {convertingLead && (
                        <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <p className="font-semibold text-gray-900 dark:text-white">{convertingLead.full_name}</p>
                                <p className="text-gray-500 mt-0.5">{convertingLead.phone} • {convertingLead.category || 'B'} toifa</p>
                            </div>
                            <div>
                                <Label required htmlFor="contract_type_id">{t('leads.select_tariff', 'Shartnoma Tarifi')}</Label>
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
