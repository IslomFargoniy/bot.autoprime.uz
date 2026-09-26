import { useState, useCallback } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Trash2,
    Edit2,
    Plus,
    Search,
    UserCheck,
    Car,
    GraduationCap,
    ShieldCheck,
    Wallet,
    History,
    Users,
    Briefcase,
    Receipt,
    CheckCircle2,
    XCircle,
    Building2,
    Upload,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/pagination';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import type { Branch, SharedData } from '@/types/auth';

interface StaffUser {
    id: number;
    name: string;
    phone: string;
    telegram_id?: string | null;
    car_name?: string | null;
    photo_path?: string | null;
    photo_url?: string | null;
    role: string;
    status: 'active' | 'inactive';
    base_salary: number | string;
    driving_hourly_rate: number | string;
    lesson_rate: number | string;
    salary_balance: number | string;
    branch_id?: number | null;
    branch?: Branch | null;
    created_at?: string;
}

interface FinancialHistoryItem {
    id: number;
    type: 'credit' | 'debit';
    category: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    payment_method?: string | null;
    description?: string | null;
    transacted_at: string;
    performed_by?: {
        id: number;
        name: string;
    } | null;
}

interface PageProps {
    staff: {
        data: StaffUser[];
        links?: any[];
        from?: number;
        total?: number;
    };
    branches?: Branch[];
    roleCounts: {
        all: number;
        instructor: number;
        teacher: number;
        admin: number;
        reception: number;
        accountant: number;
        kassir: number;
        superadmin: number;
    };
    stats: {
        total_count: number;
        active_count: number;
        total_base_salary: number;
    };
    filters?: {
        search?: string;
        role?: string;
        status?: string;
        branch_id?: string | number | null;
        per_page?: string;
    };
}

export default function StaffIndex({
    staff,
    branches = [],
    roleCounts,
    stats,
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth?.user?.role === 'superadmin' || auth?.user?.id === 1;

    const [search, setSearch] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id ? String(filters.branch_id) : '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Ledger / Financial History Drawer
    const [historyStaff, setHistoryStaff] = useState<StaffUser | null>(null);
    const [historyList, setHistoryList] = useState<FinancialHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        phone: '',
        telegram_id: '',
        role: 'instructor',
        branch_id: '' as string | number,
        status: 'active',
        base_salary: '' as string | number,
        driving_hourly_rate: '' as string | number,
        lesson_rate: '' as string | number,
        car_name: '',
        photo: null as File | null,
        password: '',
    });

    const formatMoney = (val: number | string | undefined | null) => {
        const num = Number(val || 0);
        return new Intl.NumberFormat('uz-UZ').format(num) + " " + t('common.sum', "so'm");
    };

    const applyFilters = useCallback(
        (newRole: string, newStatus: string, newBranch: string, newSearch: string, newPerPage: string) => {
            router.get(
                '/admin/staff',
                {
                    role: newRole,
                    status: newStatus,
                    branch_id: newBranch || undefined,
                    search: newSearch || undefined,
                    per_page: newPerPage,
                },
                { preserveState: true, replace: true }
            );
        },
        []
    );

    const handleRoleTabChange = (role: string) => {
        setSelectedRole(role);
        applyFilters(role, selectedStatus, selectedBranch, search, perPage);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        applyFilters(selectedRole, selectedStatus, selectedBranch, val, perPage);
    };

    const handleBranchChange = (branchId: string) => {
        setSelectedBranch(branchId);
        applyFilters(selectedRole, selectedStatus, branchId, search, perPage);
    };

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status);
        applyFilters(selectedRole, status, selectedBranch, search, perPage);
    };

    const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setPerPage(val);
        applyFilters(selectedRole, selectedStatus, selectedBranch, search, val);
    };

    const openCreateForm = () => {
        setEditingStaff(null);
        setPhotoPreview(null);
        reset();
        clearErrors();
        setData({
            name: '',
            phone: '',
            telegram_id: '',
            role: 'instructor',
            branch_id: auth?.user?.branch_id ? String(auth.user.branch_id) : '',
            status: 'active',
            base_salary: '',
            driving_hourly_rate: '',
            lesson_rate: '',
            car_name: '',
            photo: null,
            password: '',
        });
        setIsFormOpen(true);
    };

    const handleEdit = (staffMember: StaffUser) => {
        setEditingStaff(staffMember);
        setPhotoPreview(staffMember.photo_url || null);
        clearErrors();
        setData({
            name: staffMember.name || '',
            phone: staffMember.phone || '',
            telegram_id: staffMember.telegram_id || '',
            role: staffMember.role || 'instructor',
            branch_id: staffMember.branch_id ? String(staffMember.branch_id) : '',
            status: staffMember.status || 'active',
            base_salary: staffMember.base_salary ? String(staffMember.base_salary) : '',
            driving_hourly_rate: staffMember.driving_hourly_rate ? String(staffMember.driving_hourly_rate) : '',
            lesson_rate: staffMember.lesson_rate ? String(staffMember.lesson_rate) : '',
            car_name: staffMember.car_name || '',
            photo: null,
            password: '',
        });
        setIsFormOpen(true);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setData('photo', file);
        if (file) {
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingStaff) {
            post(`/admin/staff/${editingStaff.id}?_method=PUT`, {
                forceFormData: true,
                onSuccess: () => {
                    setIsFormOpen(false);
                    toast.success(t('staff.updated_success', "Xodim ma'lumotlari yangilandi"));
                },
                onError: () => {
                    toast.error(t('staff.save_error', "Xatolik yuz berdi. Maydonlarni tekshiring"));
                },
            });
        } else {
            post('/admin/staff', {
                forceFormData: true,
                onSuccess: () => {
                    setIsFormOpen(false);
                    toast.success(t('staff.created_success', "Yangi xodim muvaffaqiyatli qo'shildi"));
                },
                onError: () => {
                    toast.error(t('staff.save_error', "Xatolik yuz berdi. Maydonlarni tekshiring"));
                },
            });
        }
    };

    const handleDelete = (staffMember: StaffUser) => {
        if (!confirm(t('staff.confirm_delete', "Ushbu xodimni rostdan ham tizimdan o'chirmoqchimisiz?"))) {
            return;
        }

        setIsDeleting(staffMember.id);
        router.delete(`/admin/staff/${staffMember.id}`, {
            onSuccess: () => {
                toast.success(t('staff.deleted_success', "Xodim o'chirildi"));
            },
            onError: (err: any) => {
                toast.error(err?.message || t('common.error_occurred', "Xatolik yuz berdi"));
            },
            onFinish: () => setIsDeleting(null),
        });
    };

    const openHistory = async (staffMember: StaffUser) => {
        setHistoryStaff(staffMember);
        setLoadingHistory(true);
        setIsHistoryOpen(true);
        try {
            const res = await fetch(`/admin/staff/${staffMember.id}`);
            if (res.ok) {
                const json = await res.json();
                setHistoryList(json.financialHistories || []);
            } else {
                setHistoryList([]);
            }
        } catch (error) {
            setHistoryList([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'instructor':
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40 font-medium">
                        <Car className="w-3 h-3 mr-1" />
                        {t('roles.instructor', 'Instruktor')}
                    </Badge>
                );
            case 'teacher':
                return (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40 font-medium">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {t('roles.teacher', "O'qituvchi")}
                    </Badge>
                );
            case 'admin':
                return (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40 font-medium">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {t('roles.admin', 'Admin')}
                    </Badge>
                );
            case 'superadmin':
                return (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40 font-medium">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {t('roles.superadmin', 'Bosh Admin')}
                    </Badge>
                );
            case 'reception':
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40 font-medium">
                        <Users className="w-3 h-3 mr-1" />
                        {t('roles.reception', 'Reception')}
                    </Badge>
                );
            case 'accountant':
                return (
                    <Badge variant="outline" className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/40 font-medium">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {t('roles.accountant', 'Buxgalter')}
                    </Badge>
                );
            case 'kassir':
                return (
                    <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/40 font-medium">
                        <Receipt className="w-3 h-3 mr-1" />
                        {t('roles.kassir', 'Kassir')}
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                        {role}
                    </Badge>
                );
        }
    };

    const roleOptions = [
        { value: 'instructor', label: t('roles.instructor', 'Instruktor (Praktika)') },
        { value: 'teacher', label: t('roles.teacher', "O'qituvchi (Nazariya)") },
        { value: 'reception', label: t('roles.reception', 'Reception / Administrator') },
        { value: 'kassir', label: t('roles.kassir', 'Kassir') },
        { value: 'accountant', label: t('roles.accountant', 'Buxgalter') },
        { value: 'admin', label: t('roles.admin', 'Filial Admini') },
        ...(isSuperAdmin ? [{ value: 'superadmin', label: t('roles.superadmin', 'Bosh Admin (Superadmin)') }] : []),
    ];

    const roleTabs = [
        { key: 'all', label: t('staff.all', 'Barchasi'), count: roleCounts.all },
        { key: 'instructor', label: t('roles.instructor_plural', 'Instruktorlar'), count: roleCounts.instructor },
        { key: 'teacher', label: t('roles.teacher_plural', "O'qituvchilar"), count: roleCounts.teacher },
        { key: 'admin', label: t('roles.admin_plural', 'Adminlar'), count: roleCounts.admin },
        { key: 'reception', label: t('roles.reception', 'Reception'), count: roleCounts.reception },
        { key: 'accountant', label: t('roles.accountant_plural', 'Buxgalterlar'), count: roleCounts.accountant },
        { key: 'kassir', label: t('roles.kassir_plural', 'Kassirlar'), count: roleCounts.kassir },
        ...(isSuperAdmin && roleCounts.superadmin > 0
            ? [{ key: 'superadmin', label: t('roles.superadmin_plural', 'Bosh Adminlar'), count: roleCounts.superadmin }]
            : []),
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6 pb-20">
            <Head title={t('staff.title', 'Xodimlar')} />

            {/* Page Header (Inline Title + Action Button) */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            {t('staff.title', 'Xodimlar')}
                        </h1>
                    </div>
                </div>

                <Button onClick={openCreateForm} variant="brand" className="gap-2 shadow-xs shrink-0">
                    <Plus className="w-4 h-4" />
                    <span>{t('staff.add_staff', "Xodim qo'shish")}</span>
                </Button>
            </div>

            {/* KPI Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 bg-card border rounded-xl shadow-2xs space-y-1">
                    <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                        <span>{t('staff.stats_total', 'Jami xodimlar')}</span>
                        <Users className="w-4 h-4 text-primary/70" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground">
                        {stats.total_count}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {stats.active_count} {t('staff.active_count', 'faol holatda')}
                    </div>
                </div>

                <div className="p-4 bg-card border rounded-xl shadow-2xs space-y-1">
                    <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                        <span>{t('staff.stats_active', 'Faol holatdagilar')}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.active_count}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {stats.total_count - stats.active_count} {t('staff.inactive_count', 'nofaol')}
                    </div>
                </div>

                <div className="p-4 bg-card border rounded-xl shadow-2xs space-y-1 col-span-2 sm:col-span-1">
                    <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                        <span>{t('staff.stats_salary_fund', 'Oylik fiksa fondi')}</span>
                        <Wallet className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-foreground truncate">
                        {formatMoney(stats.total_base_salary)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {t('staff.salary_fund_desc', "Har oylik kafolatlangan to'lov")}
                    </div>
                </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {roleTabs.map((tab) => {
                    const isActive = selectedRole === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleRoleTabChange(tab.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isActive
                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                        : 'bg-background/80 text-muted-foreground'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="relative sm:col-span-5 md:col-span-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={handleSearchChange}
                        placeholder={t('staff.search_placeholder', "Ism, telefon, mashina yoki Telegram ID bo'yicha...")}
                        className="pl-9 h-10 text-sm"
                    />
                </div>

                {isSuperAdmin && branches.length > 0 && (
                    <div className="sm:col-span-4 md:col-span-3">
                        <SearchableSelect
                            id="branch_filter"
                            value={selectedBranch}
                            onChange={(val) => handleBranchChange(val ? String(val) : '')}
                            options={[
                                { value: '', label: t('staff.all_branches', 'Barcha filiallar') },
                                ...branches.map((b) => ({ value: b.id, label: b.name })),
                            ]}
                            placeholder={t('staff.filter_branch', 'Filial')}
                            allowClear
                            triggerClassName="h-10 text-sm"
                        />
                    </div>
                )}

                <div className="sm:col-span-3 md:col-span-2">
                    <select
                        value={selectedStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full h-10 px-3 border rounded-md text-sm bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">{t('staff.all_statuses', 'Barcha holat')}</option>
                        <option value="active">{t('staff.active', 'Faol')}</option>
                        <option value="inactive">{t('staff.inactive', 'Nofaol')}</option>
                    </select>
                </div>

                <div className="sm:col-span-2 md:col-span-2 flex justify-end">
                    <select
                        value={perPage}
                        onChange={handlePerPageChange}
                        className="h-10 px-3 border rounded-md text-sm bg-background text-foreground"
                    >
                        <option value="15">15 {t('common.per_page', '/ sahifa')}</option>
                        <option value="25">25 {t('common.per_page', '/ sahifa')}</option>
                        <option value="50">50 {t('common.per_page', '/ sahifa')}</option>
                        <option value="all">{t('common.all', 'Barchasi')}</option>
                    </select>
                </div>
            </div>

            {/* Staff Table / List */}
            <div className="bg-card border rounded-xl shadow-2xs overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-center">{t('common.number', '№')}</TableHead>
                                <TableHead>{t('staff.employee', 'Xodim')}</TableHead>
                                <TableHead>{t('staff.role', 'Lavozim')}</TableHead>
                                <TableHead>{t('branches.branch', 'Filial')}</TableHead>
                                <TableHead>{t('staff.phone', 'Aloqa')}</TableHead>
                                <TableHead>{t('staff.salary_rates', 'Maosh stavkalari')}</TableHead>
                                <TableHead>{t('staff.balance', 'Qarz / Haq')}</TableHead>
                                <TableHead className="text-center">{t('common.status', 'Holati')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.data.length === 0 ? (
                                <TableEmpty colSpan={9} title={t('common.no_data', "Ma'lumot topilmadi")} />
                            ) : (
                                staff.data.map((member, index) => {
                                    const balance = Number(member.salary_balance || 0);
                                    return (
                                        <TableRow key={member.id} className="hover:bg-muted/30">
                                            <TableCell className="text-center font-mono text-muted-foreground text-xs">
                                                {(staff.from || 1) + index}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0 border">
                                                        {member.photo_url ? (
                                                            <img
                                                                src={member.photo_url}
                                                                alt={member.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            member.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-sm flex items-center gap-1.5">
                                                            <span>{member.name}</span>
                                                            {auth.user.id === member.id && (
                                                                <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.2 rounded font-medium">
                                                                    {t('admins.you', 'Siz')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {member.car_name && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <Car className="w-3 h-3 text-amber-500" />
                                                                <span>{member.car_name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(member.role)}</TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    <span>{member.branch?.name || t('branches.central', 'Bosh markaz')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs font-medium text-foreground">{member.phone}</div>
                                                {member.telegram_id && (
                                                    <div className="text-[11px] text-muted-foreground font-mono">
                                                        @{member.telegram_id.replace(/^@/, '')}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5 text-xs">
                                                    <div className="font-medium text-foreground">
                                                        {formatMoney(member.base_salary)}
                                                        <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                                            ({t('staff.base_salary_label', 'fiksa')})
                                                        </span>
                                                    </div>
                                                    {Number(member.driving_hourly_rate) > 0 && (
                                                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                                                            + {formatMoney(member.driving_hourly_rate)}{' '}
                                                            <span className="text-[10px] text-muted-foreground">/ soat dars</span>
                                                        </div>
                                                    )}
                                                    {Number(member.lesson_rate) > 0 && (
                                                        <div className="text-[11px] text-purple-600 dark:text-purple-400">
                                                            + {formatMoney(member.lesson_rate)}{' '}
                                                            <span className="text-[10px] text-muted-foreground">/ nazariya</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className={`text-xs font-semibold ${
                                                        balance > 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : balance < 0
                                                              ? 'text-rose-600 dark:text-rose-400'
                                                              : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {formatMoney(balance)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {member.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {t('staff.active', 'Faol')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        {t('staff.inactive', 'Nofaol')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openHistory(member)}
                                                        title={t('staff.history', 'Moliya tarixi')}
                                                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(member)}
                                                        title={t('common.edit', 'Tahrirlash')}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    {auth.user.id !== member.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                            onClick={() => handleDelete(member)}
                                                            disabled={isDeleting === member.id}
                                                            title={t('common.delete', "O'chirish")}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden p-3 space-y-3 bg-muted/20">
                    {staff.data.length > 0 ? (
                        staff.data.map((member) => {
                            const balance = Number(member.salary_balance || 0);
                            return (
                                <div
                                    key={member.id}
                                    className="p-4 space-y-3 bg-card border rounded-xl shadow-2xs"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border">
                                                {member.photo_url ? (
                                                    <img
                                                        src={member.photo_url}
                                                        alt={member.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    member.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm flex items-center gap-1.5">
                                                    <span>{member.name}</span>
                                                    {auth.user.id === member.id && (
                                                        <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.2 rounded font-medium">
                                                            {t('admins.you', 'Siz')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{member.phone}</div>
                                            </div>
                                        </div>
                                        <div>{getRoleBadge(member.role)}</div>
                                    </div>

                                    {member.car_name && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/40 p-2 rounded-lg">
                                            <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <span>
                                                {t('staff.assigned_car', 'Avtomobil')}: <strong>{member.car_name}</strong>
                                            </span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">
                                                {t('branches.branch', 'Filial')}:
                                            </span>
                                            <span className="font-medium">
                                                {member.branch?.name || t('branches.central', 'Bosh markaz')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">
                                                {t('staff.balance', 'Qarz / Haq')}:
                                            </span>
                                            <span
                                                className={`font-semibold ${
                                                    balance > 0
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : balance < 0
                                                          ? 'text-rose-600 dark:text-rose-400'
                                                          : 'text-muted-foreground'
                                                }`}
                                            >
                                                {formatMoney(balance)}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground block text-[11px]">
                                                {t('staff.salary_rates', 'Maosh stavkalari')}:
                                            </span>
                                            <div className="font-medium text-foreground">
                                                {formatMoney(member.base_salary)}
                                                {Number(member.driving_hourly_rate) > 0 && (
                                                    <span className="text-amber-600 dark:text-amber-400 ml-2">
                                                        (+{formatMoney(member.driving_hourly_rate)} / soat)
                                                    </span>
                                                )}
                                                {Number(member.lesson_rate) > 0 && (
                                                    <span className="text-purple-600 dark:text-purple-400 ml-2">
                                                        (+{formatMoney(member.lesson_rate)} / dars)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div>
                                            {member.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {t('staff.active', 'Faol')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    {t('staff.inactive', 'Nofaol')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openHistory(member)}
                                                className="h-8 gap-1 text-xs"
                                            >
                                                <History className="w-3.5 h-3.5 text-primary" />
                                                <span>{t('staff.history', 'Tarix')}</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleEdit(member)}
                                                className="h-8 w-8"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            {auth.user.id !== member.id && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                    onClick={() => handleDelete(member)}
                                                    disabled={isDeleting === member.id}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {t('common.no_data', "Ma'lumot topilmadi")}
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <Pagination links={staff.links} />

            {/* Add / Edit Staff Modal */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-primary" />
                            {editingStaff
                                ? t('staff.edit_title', "Xodim ma'lumotlarini tahrirlash")
                                : t('staff.create_title', "Yangi xodim qo'shish")}
                        </DialogTitle>
                        <DialogDescription>
                            {t('staff.form_desc', "Xodimning shaxsiy ma'lumotlari, lavozimi va oylik maosh parametrlarini kiriting")}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* Avatar / Photo preview row */}
                        <div className="flex items-center gap-4 p-3 bg-muted/30 border rounded-xl">
                            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg overflow-hidden border shrink-0">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Upload className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="staff_photo" className="text-xs font-semibold cursor-pointer">
                                    {t('staff.upload_photo', 'Surat yuklash (ixtiyoriy)')}
                                </Label>
                                <Input
                                    id="staff_photo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="h-8 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                />
                                {errors.photo && <p className="text-xs text-rose-500">{errors.photo}</p>}
                            </div>
                        </div>

                        {/* Mobile Responsive 2-column grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                <Label htmlFor="staff_name" required>
                                    {t('staff.name', 'F.I.SH')}
                                </Label>
                                <Input
                                    id="staff_name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder={t('staff.name_placeholder', 'Masalan: Aliyev Vali')}
                                    required
                                />
                                {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                <Label htmlFor="staff_phone" required>
                                    {t('staff.phone', 'Telefon raqam')}
                                </Label>
                                <Input
                                    id="staff_phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+998 90 123 45 67"
                                    required
                                />
                                {errors.phone && <p className="text-xs text-rose-500">{errors.phone}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="staff_role" required>
                                    {t('staff.role', 'Lavozim / Rol')}
                                </Label>
                                <select
                                    id="staff_role"
                                    value={data.role}
                                    onChange={(e) => setData('role', e.target.value)}
                                    className="w-full h-10 px-3 border rounded-md text-sm bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                    required
                                >
                                    {roleOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.role && <p className="text-xs text-rose-500">{errors.role}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="staff_branch">
                                    {t('branches.branch', 'Filial')}
                                </Label>
                                <SearchableSelect
                                    id="staff_branch"
                                    value={data.branch_id}
                                    onChange={(val) => setData('branch_id', val ? String(val) : '')}
                                    options={[
                                        { value: '', label: t('branches.central_branch', 'Bosh markaz (Filialsiz)') },
                                        ...branches.map((b) => ({ value: b.id, label: b.name })),
                                    ]}
                                    placeholder={t('branches.branch', 'Filial')}
                                    allowClear
                                    triggerClassName="h-10 text-sm"
                                />
                                {errors.branch_id && <p className="text-xs text-rose-500">{errors.branch_id}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="staff_telegram">
                                    {t('staff.telegram_id', 'Telegram ID')}
                                </Label>
                                <Input
                                    id="staff_telegram"
                                    value={data.telegram_id}
                                    onChange={(e) => setData('telegram_id', e.target.value)}
                                    placeholder="123456789 yoki username"
                                />
                                {errors.telegram_id && <p className="text-xs text-rose-500">{errors.telegram_id}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="staff_status">
                                    {t('common.status', 'Holati')}
                                </Label>
                                <select
                                    id="staff_status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value as 'active' | 'inactive')}
                                    className="w-full h-10 px-3 border rounded-md text-sm bg-background text-foreground"
                                >
                                    <option value="active">{t('staff.active', 'Faol')}</option>
                                    <option value="inactive">{t('staff.inactive', 'Nofaol')}</option>
                                </select>
                                {errors.status && <p className="text-xs text-rose-500">{errors.status}</p>}
                            </div>
                        </div>

                        {/* Role-Specific fields (Car for instructors, rates) */}
                        {data.role === 'instructor' && (
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                    <Car className="w-4 h-4" />
                                    <span>{t('staff.instructor_fields', "Instruktor sozlamalari")}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="staff_car">
                                            {t('staff.car_name', 'Biriktirilgan avtomobil')}
                                        </Label>
                                        <Input
                                            id="staff_car"
                                            value={data.car_name}
                                            onChange={(e) => setData('car_name', e.target.value)}
                                            placeholder="Lacetti 01 A 777 AA"
                                        />
                                        {errors.car_name && <p className="text-xs text-rose-500">{errors.car_name}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="staff_driving_rate">
                                            {t('staff.driving_hourly_rate', 'Soatbay stavka (soat/so\'m)')}
                                        </Label>
                                        <Input
                                            id="staff_driving_rate"
                                            type="number"
                                            min="0"
                                            value={data.driving_hourly_rate}
                                            onChange={(e) => setData('driving_hourly_rate', e.target.value)}
                                            placeholder="50 000"
                                        />
                                        {errors.driving_hourly_rate && (
                                            <p className="text-xs text-rose-500">{errors.driving_hourly_rate}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {data.role === 'teacher' && (
                            <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
                                <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                                    <GraduationCap className="w-4 h-4" />
                                    <span>{t('staff.teacher_fields', "O'qituvchi sozlamalari")}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="staff_lesson_rate">
                                        {t('staff.lesson_rate', 'Har bir nazariy dars stavkasi (so\'m)')}
                                    </Label>
                                    <Input
                                        id="staff_lesson_rate"
                                        type="number"
                                        min="0"
                                        value={data.lesson_rate}
                                        onChange={(e) => setData('lesson_rate', e.target.value)}
                                        placeholder="75 000"
                                    />
                                    {errors.lesson_rate && <p className="text-xs text-rose-500">{errors.lesson_rate}</p>}
                                </div>
                            </div>
                        )}

                        {/* Salary and Password */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="staff_base_salary">
                                    {t('staff.base_salary', 'Asosiy oylik maosh (Fiksa, so\'m)')}
                                </Label>
                                <Input
                                    id="staff_base_salary"
                                    type="number"
                                    min="0"
                                    value={data.base_salary}
                                    onChange={(e) => setData('base_salary', e.target.value)}
                                    placeholder="4 000 000"
                                />
                                {errors.base_salary && <p className="text-xs text-rose-500">{errors.base_salary}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="staff_password" required={!editingStaff}>
                                    {editingStaff
                                        ? t('admins.password_edit', "Parol (o'zgartirish uchun)")
                                        : t('admins.password', 'Parol')}
                                </Label>
                                <Input
                                    id="staff_password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    required={!editingStaff}
                                />
                                {errors.password && <p className="text-xs text-rose-500">{errors.password}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFormOpen(false)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={processing}>
                                {processing
                                    ? t('common.saving', 'Saqlanmoqda...')
                                    : t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Financial History & Ledger Sheet Drawer */}
            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="pb-4 border-b">
                        <SheetTitle className="text-lg font-bold flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            {historyStaff?.name}
                        </SheetTitle>
                        <SheetDescription className="text-xs">
                            {historyStaff && getRoleBadge(historyStaff.role)} •{' '}
                            {historyStaff?.branch?.name || t('branches.central', 'Bosh markaz')}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-4 py-4">
                        {/* Current Balance card */}
                        <div className="p-4 bg-muted/30 border rounded-xl flex items-center justify-between">
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    {t('staff.current_balance', 'Joriy qarz / haq balansi')}
                                </div>
                                <div
                                    className={`text-xl font-bold mt-0.5 ${
                                        Number(historyStaff?.salary_balance || 0) > 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : Number(historyStaff?.salary_balance || 0) < 0
                                              ? 'text-rose-600 dark:text-rose-400'
                                              : 'text-foreground'
                                    }`}
                                >
                                    {formatMoney(historyStaff?.salary_balance)}
                                </div>
                            </div>
                            <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                <Wallet className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{t('staff.ledger_history', 'Moliyaviy amaliyotlar daftari')}</span>
                            </div>

                            {loadingHistory ? (
                                <div className="text-center py-10 text-xs text-muted-foreground">
                                    {t('common.loading', 'Yuklanmoqda...')}
                                </div>
                            ) : historyList.length === 0 ? (
                                <div className="text-center py-10 text-xs text-muted-foreground border rounded-xl border-dashed">
                                    {t('staff.no_financial_history', "Hali birorta moliyaviy amaliyot qayd etilmagan")}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {historyList.map((item) => {
                                        const isDebit = item.type === 'debit';
                                        return (
                                            <div
                                                key={item.id}
                                                className="p-3 border rounded-xl bg-card space-y-1.5 text-xs shadow-2xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        {isDebit ? (
                                                            <ArrowDownLeft className="w-4 h-4 text-rose-500" />
                                                        ) : (
                                                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                                        )}
                                                        <span>
                                                            {item.category === 'salary_payout'
                                                                ? t('finance.salary_payout', 'Oylik tolandi')
                                                                : item.category === 'salary_accrual'
                                                                  ? t('finance.salary_accrual', 'Oylik hisoblandi')
                                                                  : item.category === 'bonus'
                                                                    ? t('finance.bonus', 'Mukofot / Bonus')
                                                                    : item.category === 'fine'
                                                                      ? t('finance.fine', 'Jarima / Ushlab qolish')
                                                                      : item.category === 'advance'
                                                                        ? t('finance.advance', 'Avans berildi')
                                                                        : item.category}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`font-bold ${
                                                            isDebit
                                                                ? 'text-rose-600 dark:text-rose-400'
                                                                : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}
                                                    >
                                                        {isDebit ? '-' : '+'}
                                                        {formatMoney(item.amount)}
                                                    </span>
                                                </div>

                                                {item.description && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {item.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                                                    <span>{new Date(item.transacted_at).toLocaleDateString('uz-UZ')}</span>
                                                    <span>
                                                        {t('staff.balance_after', 'Balans')}: {formatMoney(item.balance_after)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
