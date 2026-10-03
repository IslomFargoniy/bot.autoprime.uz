import { Head, useForm, router, Link } from '@inertiajs/react';
import {
    Plus,
    UserCheck,
    Trash2,
    Phone,
    Calendar,
    Eye,
    User,
    FileText,
    ExternalLink,
    Clock,
    MapPin,
    Shield,
    ImageIcon,
    Copy,
    Check,
    CheckCircle,
    Pencil,
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
import { Badge } from '@/components/ui/badge';
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
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';
import { LeadFormFields } from './components/LeadFormFields';

interface Lead {
    id: number;
    full_name: string;
    phone: string;
    category: string;
    preferred_time?: string;
    passport_series?: string;
    passport_number?: string;
    pinfl?: string;
    birth_date?: string;
    address?: string;
    photo_url?: string;
    passport_photo_url?: string;
    medical_certificate_photo_url?: string;
    source: string;
    stage:
        | 'new_lead'
        | 'form_sent'
        | 'form_completed'
        | 'contract_signed'
        | 'rejected';
    notes?: string;
    lost_reason?: string;
    telegram_id?: string | number;
    form_token?: string;
    is_form_completed?: boolean;
    branch_id?: number;
    branch?: { id: number; name: string };
    assigned_user_id?: number;
    assignedTo?: { id: number; name: string };
    student_id?: number;
    convertedStudent?: { id: number; full_name: string; phone: string };
    contract_id?: number;
    contract?: { id: number; contract_number: string };
    created_at: string;
}

interface PageProps {
    leads: {
        data: Lead[];
        links: any[];
        total: number;
        from?: number;
        to?: number;
        per_page?: number;
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
        per_page?: string;
    };
}

export default function LeadsIndex({
    leads,
    contractTypes,
    groups,
    branches,
    filters,
}: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [viewingLead, setViewingLead] = useState<Lead | null>(null);
    const [previewImage, setPreviewImage] = useState<{
        src: string;
        title: string;
    } | null>(null);
    const [copiedPinfl, setCopiedPinfl] = useState(false);
    const [search, setSearch] = useState(filters.search || '');

    const createForm = useForm({
        full_name: '',
        phone: '',
        category: 'B',
        branch_id: '',
        source: 'reception_manual',
        preferred_time: '',
        birth_date: '',
        address: '',
        passport_series: '',
        passport_number: '',
        pinfl: '',
        notes: '',
    });

    const editForm = useForm({
        full_name: '',
        phone: '',
        category: 'B',
        branch_id: '',
        source: 'reception_manual',
        preferred_time: '',
        birth_date: '',
        address: '',
        passport_series: '',
        passport_number: '',
        pinfl: '',
        notes: '',
        stage: 'new_lead',
        lost_reason: '',
    });

    const convertForm = useForm({
        contract_type_id: '',
        group_id: '',
        branch_id: '',
        discount_amount: '' as string | number,
        start_date: '',
        end_date: '',
        terms: '',
    });

    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const isLeadConverted = (lead?: Lead | null) => {
        if (!lead) {
            return false;
        }

        return Boolean(
            lead.contract_id ||
            lead.student_id ||
            lead.stage === 'contract_signed' ||
            lead.convertedStudent ||
            lead.contract,
        );
    };

    const openEditModal = (lead: Lead) => {
        if (isLeadConverted(lead)) {
            return;
        }

        editForm.clearErrors();
        editForm.setData({
            full_name: lead.full_name ?? '',
            phone: lead.phone ?? '',
            category: lead.category || 'B',
            branch_id: lead.branch_id ? String(lead.branch_id) : '',
            source: lead.source || 'reception_manual',
            preferred_time: lead.preferred_time ?? '',
            birth_date: lead.birth_date ? lead.birth_date.slice(0, 10) : '',
            address: lead.address ?? '',
            passport_series: lead.passport_series ?? '',
            passport_number: lead.passport_number ?? '',
            pinfl: lead.pinfl ?? '',
            notes: lead.notes ?? '',
            stage: lead.stage,
            lost_reason: lead.lost_reason ?? '',
        });
        setEditingLead(lead);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingLead) {
            return;
        }

        const editedId = editingLead.id;

        editForm.put(`/admin/leads/${editedId}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const fresh = (
                    page.props as unknown as PageProps
                ).leads.data.find((lead) => lead.id === editedId);

                setViewingLead((current) =>
                    current && fresh ? fresh : current,
                );
                setEditingLead(null);
                toast.success(t('leads.updated_success', 'Lid yangilandi'));
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const openConvertModal = (lead: Lead) => {
        if (isLeadConverted(lead)) {
            toast.error(
                t(
                    'leads.already_converted',
                    'Ushbu lid bilan allaqachon shartnoma tuzilgan.',
                ),
            );

            return;
        }

        setConvertingLead(lead);
        convertForm.setData({
            contract_type_id: '',
            group_id: '',
            branch_id: String(lead.branch_id || ''),
            discount_amount: '' as string | number,
            start_date: '',
            end_date: '',
            terms: '',
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/leads',
            { ...filters, search, per_page: perPage },
            { preserveState: true },
        );
    };

    const handleStageChange = (stage: string) => {
        router.get(
            '/admin/leads',
            {
                ...filters,
                stage: stage === 'all' ? '' : stage,
                per_page: perPage,
            },
            { preserveState: true },
        );
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get(
            '/admin/leads',
            { ...filters, search, per_page: newPerPage },
            { preserveState: true, replace: true },
        );
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/leads', {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                toast.success(
                    t('leads.created_success', 'Lid muvaffaqiyatli saqlandi'),
                );
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleConvertSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!convertingLead) {
            return;
        }

        convertForm.post(`/admin/leads/${convertingLead.id}/convert`, {
            onSuccess: () => {
                setConvertingLead(null);
                setViewingLead(null);
                toast.success(
                    t(
                        'leads.converted_success',
                        "O'quvchi ochildi va shartnoma tuzildi",
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

    const handleDelete = (lead: Lead) => {
        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            router.delete(`/admin/leads/${lead.id}`, {
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
                onSuccess: () => {
                    if (viewingLead?.id === lead.id) {
                        setViewingLead(null);
                    }

                    toast.success(t('common.deleted', "O'chirildi"));
                },
            });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPinfl(true);
        toast.success(t('common.copied', 'Nusxalandi'));
        setTimeout(() => setCopiedPinfl(false), 2000);
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
        <div className="space-y-4 p-4 md:space-y-6 md:p-6">
            <Head title={t('leads.title', 'CRM Lidlar')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold sm:text-2xl">
                    {t('leads.title', 'CRM Lidlar')}
                </h1>
                {can('leads.manage') && (
                    <Button
                        onClick={() => setShowCreateModal(true)}
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
                <PageFilterPills
                    activeValue={filters.stage || 'all'}
                    onChange={handleStageChange}
                    items={[
                        {
                            value: 'all',
                            label: t('leads.stage_all', 'Barchasi'),
                        },
                        {
                            value: 'new_lead',
                            label: t('leads.stage_new_lead', 'Yangi lid'),
                        },
                        {
                            value: 'form_sent',
                            label: t(
                                'leads.stage_form_sent',
                                'Anketa yuborildi',
                            ),
                        },
                        {
                            value: 'form_completed',
                            label: t(
                                'leads.stage_form_completed',
                                "To'ldirildi",
                            ),
                        },
                        {
                            value: 'contract_signed',
                            label: t(
                                'leads.stage_contract_signed',
                                'Shartnoma tuzildi',
                            ),
                        },
                        {
                            value: 'rejected',
                            label: t('leads.stage_rejected', 'Rad etildi'),
                        },
                    ]}
                />

                <PageFilterSearch
                    value={search}
                    onChange={setSearch}
                    onSubmit={handleSearch}
                    placeholder={t('common.search', 'Qidirish...')}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                />
            </PageFilterBar>

            {/* Desktop/Tablet Table */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs md:block dark:border-gray-700 dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                {t('leads.client', 'Mijoz (F.I.O)')}
                            </TableHead>
                            <TableHead>{t('leads.phone', 'Telefon')}</TableHead>
                            <TableHead>
                                {t('leads.category', 'Toifa')}
                            </TableHead>
                            <TableHead>{t('leads.source', 'Manba')}</TableHead>
                            <TableHead>{t('leads.stage', 'Holat')}</TableHead>
                            <TableHead>{t('leads.branch', 'Filial')}</TableHead>
                            <TableHead className="text-right">
                                {t('common.actions', 'Amallar')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.data.length === 0 ? (
                            <TableEmpty
                                colSpan={7}
                                icon={UserCheck}
                                title={t(
                                    'leads.no_leads',
                                    'Hech qanday lid topilmadi',
                                )}
                            />
                        ) : (
                            leads.data.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        <button
                                            type="button"
                                            onClick={() => setViewingLead(lead)}
                                            className="text-left font-semibold text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            {lead.full_name}
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-300">
                                        <a
                                            href={`tel:${lead.phone}`}
                                            className="flex items-center gap-1 font-mono text-xs hover:text-blue-600 dark:hover:text-blue-400"
                                        >
                                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                                            {lead.phone}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold dark:bg-gray-700">
                                            {lead.category || 'B'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-300">
                                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                            {getSourceLabel(lead.source)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${getStageBadge(lead.stage)}`}
                                        >
                                            {t(
                                                `leads.stage_${lead.stage}`,
                                                lead.stage,
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                                        {lead.branch?.name || '-'}
                                    </TableCell>
                                    <TableCell className="space-x-1 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setViewingLead(lead)}
                                            title={t(
                                                'leads.view_details',
                                                'Lid tafsilotlari',
                                            )}
                                            className="h-7 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                        {isLeadConverted(lead) ? (
                                            <Badge
                                                variant="outline"
                                                className="inline-flex h-7 shrink-0 items-center border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                            >
                                                <CheckCircle className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                {t(
                                                    'leads.contract_created_badge',
                                                    'Shartnoma tuzilgan',
                                                )}
                                            </Badge>
                                        ) : can('contracts.create') ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    openConvertModal(lead)
                                                }
                                                className="h-7 border-emerald-200 bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                            >
                                                <UserCheck className="mr-1 h-3.5 w-3.5" />
                                                {t(
                                                    'leads.convert_button',
                                                    'Shartnoma tuzish',
                                                )}
                                            </Button>
                                        ) : null}
                                        {can('leads.manage') &&
                                            !isLeadConverted(lead) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        openEditModal(lead)
                                                    }
                                                    title={t(
                                                        'leads.edit',
                                                        'Tahrirlash',
                                                    )}
                                                    className="h-7 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        {can('leads.manage') &&
                                            !isLeadConverted(lead) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleDelete(lead)
                                                    }
                                                    className="h-7 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Cards Feed */}
            <div className="space-y-3 md:hidden">
                {leads.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-card p-4 py-8 text-center">
                        <UserCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                        <div className="text-sm font-medium">
                            {t('leads.no_leads', 'Hech qanday lid topilmadi')}
                        </div>
                    </div>
                ) : (
                    leads.data.map((lead) => (
                        <div
                            key={lead.id}
                            className="space-y-2.5 rounded-xl border bg-card p-3.5 shadow-2xs"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setViewingLead(lead)}
                                            className="text-left text-sm font-bold text-foreground hover:underline"
                                        >
                                            {lead.full_name}
                                        </button>
                                        <span className="py-0.2 rounded-md bg-muted px-1.5 text-[10px] font-bold">
                                            {lead.category || 'B'}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <a
                                            href={`tel:${lead.phone}`}
                                            className="flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline"
                                        >
                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                            <span>{lead.phone}</span>
                                        </a>
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${getStageBadge(lead.stage)}`}
                                >
                                    {t(`leads.stage_${lead.stage}`, lead.stage)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-t pt-1.5 text-xs text-muted-foreground">
                                <div className="truncate">
                                    <span className="block text-[10px] opacity-70">
                                        {t('leads.source', 'Manba')}:
                                    </span>
                                    <span className="truncate font-medium text-foreground">
                                        {getSourceLabel(lead.source)}
                                    </span>
                                </div>
                                <div className="truncate text-right">
                                    <span className="block text-[10px] opacity-70">
                                        {t('leads.branch', 'Filial')}:
                                    </span>
                                    <span className="truncate">
                                        {lead.branch?.name || '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t pt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setViewingLead(lead)}
                                    className="h-8 flex-1 text-xs"
                                >
                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                    {t('common.details', 'Batafsil')}
                                </Button>
                                {isLeadConverted(lead) ? (
                                    <Badge
                                        variant="outline"
                                        className="h-8 flex-1 justify-center border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    >
                                        <CheckCircle className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        {t(
                                            'leads.contract_created_badge',
                                            'Shartnoma tuzilgan',
                                        )}
                                    </Badge>
                                ) : can('contracts.create') ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openConvertModal(lead)}
                                        className="h-8 flex-1 border-emerald-200 bg-emerald-50 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    >
                                        <UserCheck className="mr-1 h-3.5 w-3.5" />
                                        {t(
                                            'leads.convert_button',
                                            'Shartnoma tuzish',
                                        )}
                                    </Button>
                                ) : null}
                                {can('leads.manage') &&
                                    !isLeadConverted(lead) && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openEditModal(lead)}
                                            title={t(
                                                'leads.edit',
                                                'Tahrirlash',
                                            )}
                                            className="h-7 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                {can('leads.manage') &&
                                    !isLeadConverted(lead) && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(lead)}
                                            className="h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <Pagination
                links={leads.links}
                total={leads.total}
                from={leads.from}
                to={leads.to}
            />

            {/* View Lead Details Modal */}
            <Dialog
                open={!!viewingLead}
                onOpenChange={(open) => !open && setViewingLead(null)}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2 border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <span className="block text-base font-bold">
                                        {viewingLead?.full_name}
                                    </span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                        ID: #{viewingLead?.id} •{' '}
                                        {viewingLead?.created_at
                                            ? formatDateTime(
                                                  viewingLead.created_at,
                                              )
                                            : ''}
                                    </span>
                                </div>
                            </div>
                            {viewingLead && (
                                <span
                                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${getStageBadge(viewingLead.stage)}`}
                                >
                                    {t(
                                        `leads.stage_${viewingLead.stage}`,
                                        viewingLead.stage,
                                    )}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Lidning barcha shaxsiy, pasport, hujjat va CRM
                            ma'lumotlari
                        </DialogDescription>
                    </DialogHeader>

                    {viewingLead && (
                        <div className="space-y-4 pt-2 text-xs">
                            {/* Personal & Contact Details */}
                            <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Phone className="h-4 w-4 text-blue-600" />
                                    {t(
                                        'leads.personal_info',
                                        "Shaxsiy va Aloqa Ma'lumotlari",
                                    )}
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t('leads.phone', 'Telefon')}
                                        </span>
                                        <a
                                            href={`tel:${viewingLead.phone}`}
                                            className="font-mono font-semibold text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            {viewingLead.phone}
                                        </a>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t('leads.category', 'Toifa')}
                                        </span>
                                        <span className="inline-block rounded border bg-background px-2 py-0.5 font-semibold">
                                            {viewingLead.category || 'B'} toifa
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t(
                                                'leads.preferred_time',
                                                "Qulay o'qish vaqti",
                                            )}
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-1 font-medium">
                                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                            {viewingLead.preferred_time || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t(
                                                'leads.birth_date',
                                                "Tug'ilgan sana",
                                            )}
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-1 font-medium">
                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                            {viewingLead.birth_date
                                                ? formatDate(
                                                      viewingLead.birth_date,
                                                  )
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t(
                                                'leads.address',
                                                'Yashash manzili',
                                            )}
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-1 font-medium">
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            {viewingLead.address || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Passport & PINFL */}
                            <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Shield className="h-4 w-4 text-emerald-600" />
                                    {t(
                                        'leads.passport_and_id',
                                        'Pasport va JSHSHIR (PINFL)',
                                    )}
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t(
                                                'leads.passport_series_num',
                                                'Pasport seriya va raqami',
                                            )}
                                        </span>
                                        <span className="mt-0.5 inline-block font-mono text-sm font-semibold">
                                            {viewingLead.passport_series ||
                                            viewingLead.passport_number
                                                ? `${viewingLead.passport_series || ''} ${viewingLead.passport_number || ''}`
                                                : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t(
                                                'leads.pinfl',
                                                'JSHSHIR (PINFL)',
                                            )}
                                        </span>
                                        {viewingLead.pinfl ? (
                                            <div className="mt-0.5 flex items-center gap-2">
                                                <span className="font-mono text-sm font-semibold">
                                                    {viewingLead.pinfl}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            viewingLead.pinfl ||
                                                                '',
                                                        )
                                                    }
                                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    title={t(
                                                        'common.copy',
                                                        'Nusxalash',
                                                    )}
                                                >
                                                    {copiedPinfl ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                -
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Uploaded Documents / Photos */}
                            <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <ImageIcon className="h-4 w-4 text-purple-600" />
                                    {t(
                                        'leads.documents_and_photos',
                                        'Hujjatlar va Yuklangan Rasmlar',
                                    )}
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {/* 3x4 Photo */}
                                    <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-2.5 text-center">
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            {t(
                                                'leads.photo_3x4',
                                                '3x4 rasm / Selfi',
                                            )}
                                        </span>
                                        {viewingLead.photo_url ? (
                                            <div
                                                onClick={() =>
                                                    setPreviewImage({
                                                        src: viewingLead.photo_url!,
                                                        title: t(
                                                            'leads.photo_3x4',
                                                            '3x4 rasm / Selfi',
                                                        ),
                                                    })
                                                }
                                                className="flex h-28 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-90"
                                            >
                                                <img
                                                    src={viewingLead.photo_url}
                                                    alt="3x4"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-28 w-24 flex-col items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground/60">
                                                <ImageIcon className="mb-1 h-6 w-6 opacity-40" />
                                                <span>
                                                    {t(
                                                        'leads.no_documents',
                                                        'Mavjud emas',
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Passport Photo */}
                                    <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-2.5 text-center">
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            {t(
                                                'leads.passport_photo',
                                                'Pasport / ID karta',
                                            )}
                                        </span>
                                        {viewingLead.passport_photo_url ? (
                                            <div
                                                onClick={() =>
                                                    setPreviewImage({
                                                        src: viewingLead.passport_photo_url!,
                                                        title: t(
                                                            'leads.passport_photo',
                                                            'Pasport / ID karta',
                                                        ),
                                                    })
                                                }
                                                className="flex h-28 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-90"
                                            >
                                                <img
                                                    src={
                                                        viewingLead.passport_photo_url
                                                    }
                                                    alt="Passport"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-28 w-24 flex-col items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground/60">
                                                <ImageIcon className="mb-1 h-6 w-6 opacity-40" />
                                                <span>
                                                    {t(
                                                        'leads.no_documents',
                                                        'Mavjud emas',
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Medical Certificate */}
                                    <div className="flex flex-col items-center space-y-2 rounded-lg border bg-background p-2.5 text-center">
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            {t(
                                                'leads.medical_cert',
                                                "083 Ma'lumotnoma",
                                            )}
                                        </span>
                                        {viewingLead.medical_certificate_photo_url ? (
                                            <div
                                                onClick={() =>
                                                    setPreviewImage({
                                                        src: viewingLead.medical_certificate_photo_url!,
                                                        title: t(
                                                            'leads.medical_cert',
                                                            "083 Ma'lumotnoma",
                                                        ),
                                                    })
                                                }
                                                className="flex h-28 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-90"
                                            >
                                                <img
                                                    src={
                                                        viewingLead.medical_certificate_photo_url
                                                    }
                                                    alt="Medical"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-28 w-24 flex-col items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground/60">
                                                <ImageIcon className="mb-1 h-6 w-6 opacity-40" />
                                                <span>
                                                    {t(
                                                        'leads.no_documents',
                                                        'Mavjud emas',
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* CRM & System Info */}
                            <div className="space-y-3 rounded-xl border bg-muted/40 p-3.5">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <FileText className="h-4 w-4 text-amber-600" />
                                    {t(
                                        'leads.crm_info',
                                        "CRM va Tizim Ma'lumotlari",
                                    )}
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t('leads.source', 'Manba')}
                                        </span>
                                        <span className="mt-0.5 inline-block font-medium">
                                            {getSourceLabel(viewingLead.source)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {t('leads.branch', 'Filial')}
                                        </span>
                                        <span className="mt-0.5 inline-block font-medium">
                                            {viewingLead.branch?.name || '-'}
                                        </span>
                                    </div>
                                    {viewingLead.telegram_id && (
                                        <div>
                                            <span className="block text-[11px] text-muted-foreground">
                                                {t(
                                                    'leads.telegram_id',
                                                    'Telegram ID',
                                                )}
                                            </span>
                                            <span className="mt-0.5 inline-block font-mono font-medium">
                                                {viewingLead.telegram_id}
                                            </span>
                                        </div>
                                    )}
                                    {viewingLead.assignedTo && (
                                        <div>
                                            <span className="block text-[11px] text-muted-foreground">
                                                {t(
                                                    'leads.assigned_manager',
                                                    "Mas'ul xodim",
                                                )}
                                            </span>
                                            <span className="mt-0.5 inline-block font-medium">
                                                {viewingLead.assignedTo.name}
                                            </span>
                                        </div>
                                    )}
                                    {viewingLead.notes && (
                                        <div className="sm:col-span-2">
                                            <span className="block text-[11px] text-muted-foreground">
                                                {t('leads.notes', 'Izoh')}
                                            </span>
                                            <p className="mt-0.5 rounded border bg-background p-2 text-foreground">
                                                {viewingLead.notes}
                                            </p>
                                        </div>
                                    )}
                                    {viewingLead.lost_reason && (
                                        <div className="sm:col-span-2">
                                            <span className="block text-[11px] font-semibold text-rose-600">
                                                {t(
                                                    'leads.lost_reason',
                                                    'Rad etilish sababi',
                                                )}
                                            </span>
                                            <p className="mt-0.5 rounded border border-rose-200 bg-rose-50 p-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                                {viewingLead.lost_reason}
                                            </p>
                                        </div>
                                    )}
                                    {viewingLead.convertedStudent && (
                                        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 sm:col-span-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                                            <div>
                                                <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                    {t(
                                                        'leads.converted_student',
                                                        "O'quvchi profili ochilgan",
                                                    )}
                                                </span>
                                                <span className="text-xs font-medium text-foreground">
                                                    {
                                                        viewingLead
                                                            .convertedStudent
                                                            .full_name
                                                    }
                                                </span>
                                            </div>
                                            <Link
                                                href={`/admin/students/${viewingLead.student_id}`}
                                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                                            >
                                                <span>
                                                    {t(
                                                        'leads.view_student',
                                                        'Profilni ochish',
                                                    )}
                                                </span>
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions in Footer */}
                            <div className="flex items-center justify-between gap-2 border-t pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setViewingLead(null)}
                                >
                                    {t('common.close', 'Yopish')}
                                </Button>
                                <div className="flex items-center gap-2">
                                    {can('leads.manage') &&
                                        !isLeadConverted(viewingLead) && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    openEditModal(viewingLead)
                                                }
                                            >
                                                <Pencil className="mr-1.5 h-4 w-4" />
                                                {t('leads.edit', 'Tahrirlash')}
                                            </Button>
                                        )}
                                    {isLeadConverted(viewingLead) ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="h-9 border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                            >
                                                <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                {t(
                                                    'leads.contract_created_badge',
                                                    'Shartnoma tuzilgan',
                                                )}
                                                {viewingLead.contract
                                                    ?.contract_number
                                                    ? ` (#${viewingLead.contract.contract_number})`
                                                    : ''}
                                            </Badge>
                                            {viewingLead.contract?.id && (
                                                <a
                                                    href={`/admin/contracts?search=${encodeURIComponent(viewingLead.contract.contract_number || '')}`}
                                                    className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                                >
                                                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                                                    {t(
                                                        'leads.view_contract',
                                                        "Shartnomani ko'rish",
                                                    )}
                                                </a>
                                            )}
                                        </div>
                                    ) : can('contracts.create') ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                openConvertModal(viewingLead)
                                            }
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            <UserCheck className="mr-1.5 h-4 w-4" />
                                            {t(
                                                'leads.convert_button',
                                                'Shartnoma tuzish',
                                            )}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Preview Modal */}
            <Dialog
                open={!!previewImage}
                onOpenChange={(open) => !open && setPreviewImage(null)}
            >
                <DialogContent className="w-[95vw] max-w-2xl p-3">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold">
                            {previewImage?.title}
                        </DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                        <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-lg border bg-background">
                            <img
                                src={previewImage.src}
                                alt={previewImage.title}
                                className="max-h-[70vh] max-w-full object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Lead Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            {t('leads.create_lead_title', "Yangi Lid Qo'shish")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Yangi lid ma'lumotlarini to'ldiring
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleCreateSubmit}
                        className="space-y-3.5 text-xs"
                    >
                        <LeadFormFields
                            data={createForm.data}
                            setData={(key, value) =>
                                createForm.setData(key, value)
                            }
                            errors={createForm.errors}
                            branches={branches}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreateModal(false)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={createForm.processing}
                            >
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Lead Modal */}
            <Dialog
                open={!!editingLead}
                onOpenChange={(open) => !open && setEditingLead(null)}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            {t('leads.edit_title', 'Lidni tahrirlash')}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Lid ma'lumotlarini o'zgartiring
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleEditSubmit}
                        className="space-y-3.5 text-xs"
                    >
                        <LeadFormFields
                            data={editForm.data}
                            setData={(key, value) =>
                                editForm.setData(key, value)
                            }
                            errors={editForm.errors}
                            branches={branches}
                        />
                        <div>
                            <Label htmlFor="edit_stage">
                                {t('leads.stage', 'Holat')}
                            </Label>
                            <SearchableSelect
                                id="edit_stage"
                                value={editForm.data.stage}
                                onChange={(val) =>
                                    editForm.setData('stage', String(val))
                                }
                                options={[
                                    'new_lead',
                                    'form_sent',
                                    'form_completed',
                                    'rejected',
                                ].map((stage) => ({
                                    value: stage,
                                    label: t(`leads.stage_${stage}`, stage),
                                }))}
                                className="mt-1"
                            />
                        </div>
                        {editForm.data.stage === 'rejected' && (
                            <div>
                                <Label required htmlFor="lost_reason">
                                    {t('leads.lost_reason', 'Rad etish sababi')}
                                </Label>
                                <Input
                                    id="lost_reason"
                                    value={editForm.data.lost_reason}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'lost_reason',
                                            e.target.value,
                                        )
                                    }
                                    placeholder={t(
                                        'leads.lost_reason_placeholder',
                                        'Nima uchun rad etildi?',
                                    )}
                                    maxLength={500}
                                    required
                                    className="mt-1"
                                />
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingLead(null)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={editForm.processing}
                            >
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Convert to Student / Create Contract Modal */}
            <Dialog
                open={!!convertingLead}
                onOpenChange={(open) => !open && setConvertingLead(null)}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t(
                                'contracts.create_title',
                                'Yangi Shartnoma Rasmiylashtirish',
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {convertingLead && (
                        <form
                            onSubmit={handleConvertSubmit}
                            className="space-y-4 text-xs"
                        >
                            <div>
                                <Label required htmlFor="lead_student">
                                    {t(
                                        'contracts.select_student',
                                        "Talaba (O'quvchi)",
                                    )}
                                </Label>
                                <SearchableSelect
                                    id="lead_student"
                                    value={String(convertingLead.id)}
                                    onChange={() => {}}
                                    disabled
                                    options={[
                                        {
                                            value: String(convertingLead.id),
                                            label: convertingLead.full_name,
                                            sublabel: convertingLead.phone,
                                        },
                                    ]}
                                    placeholder={t(
                                        'contracts.select_student',
                                        'Talabani tanlang',
                                    )}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label required htmlFor="conv_contract_type_id">
                                    {t('contracts.select_tariff', 'Tarif')}
                                </Label>
                                <SearchableSelect
                                    id="conv_contract_type_id"
                                    value={convertForm.data.contract_type_id}
                                    onChange={(val) =>
                                        convertForm.setData(
                                            'contract_type_id',
                                            val,
                                        )
                                    }
                                    options={contractTypes.map((ct) => ({
                                        value: String(ct.id),
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
                                    <Label htmlFor="conv_group_id">
                                        {t('contracts.select_group', 'Guruh')}
                                    </Label>
                                    <SearchableSelect
                                        id="conv_group_id"
                                        value={convertForm.data.group_id}
                                        onChange={(val) =>
                                            convertForm.setData('group_id', val)
                                        }
                                        options={groups.map((g) => ({
                                            value: String(g.id),
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
                                    <Label htmlFor="conv_discount_amount">
                                        {t(
                                            'contracts.discount_amount',
                                            'Chegirma Miqdori (UZS)',
                                        )}
                                    </Label>
                                    <MoneyInput
                                        id="conv_discount_amount"
                                        value={convertForm.data.discount_amount}
                                        onChange={(val) =>
                                            convertForm.setData(
                                                'discount_amount',
                                                val,
                                            )
                                        }
                                        className="mt-1"
                                        placeholder="0"
                                        suffix="UZS"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="conv_start_date">
                                        {t(
                                            'contracts.start_date',
                                            'Boshlanish Sanasi',
                                        )}
                                    </Label>
                                    <DatePicker
                                        id="conv_start_date"
                                        value={convertForm.data.start_date}
                                        onChange={(val) =>
                                            convertForm.setData(
                                                'start_date',
                                                val,
                                            )
                                        }
                                        className="mt-1"
                                    />
                                    {convertForm.errors.start_date && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {t(
                                                convertForm.errors.start_date,
                                                convertForm.errors.start_date,
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="conv_end_date">
                                        {t(
                                            'contracts.end_date',
                                            'Tugash Sanasi',
                                        )}
                                    </Label>
                                    <DatePicker
                                        id="conv_end_date"
                                        value={convertForm.data.end_date}
                                        onChange={(val) =>
                                            convertForm.setData('end_date', val)
                                        }
                                        className="mt-1"
                                    />
                                    {convertForm.errors.end_date && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {t(
                                                convertForm.errors.end_date,
                                                convertForm.errors.end_date,
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="conv_terms">
                                    {t('common.description', 'Tavsif')}
                                </Label>
                                <Input
                                    id="conv_terms"
                                    value={convertForm.data.terms}
                                    onChange={(e) =>
                                        convertForm.setData(
                                            'terms',
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1"
                                    placeholder="Maxsus kelishuvlar..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setConvertingLead(null)}
                                >
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="brand"
                                    disabled={convertForm.processing}
                                >
                                    {t('common.save', 'Saqlash')}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
