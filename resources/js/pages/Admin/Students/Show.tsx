import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { SharedData } from '@/types';
import {
    ArrowLeft,
    Calendar,
    Car,
    Star,
    User,
    Phone,
    Send,
    CheckCircle2,
    Clock,
    XCircle,
    Filter,
    Wallet,
    Banknote,
    FileText,
    ArrowDownLeft,
    ArrowUpRight,
    Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableEmpty,
} from '@/components/ui/table';
import Pagination from '@/components/pagination';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface Student {
    id: number;
    full_name: string;
    phone: string;
    telegram_id?: string;
    group?: {
        id: number;
        name: string;
        instructor?: {
            id: number;
            name: string;
        };
    };
}

interface DrivingReview {
    id: number;
    rating: number;
    reason_tags?: string[];
    comment?: string;
}

interface Driving {
    id: number;
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    instructor?: {
        id: number;
        name: string;
    };
    group?: {
        id: number;
        name: string;
    };
    review?: DrivingReview;
}

interface Contract {
    id: number;
    contract_number: string;
    total_amount: number;
    paid_amount: number;
    status: string;
    payment_status: string;
    contract_type?: {
        name: string;
    };
    payments?: Array<{
        id: number;
        amount: number;
        payment_method: string;
        paid_at: string;
        cash_register?: {
            name: string;
        };
    }>;
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
        name: string;
    };
}

interface PageProps {
    student: Student;
    drivings: {
        data: Driving[];
        links?: any[];
        from?: number;
    };
    stats: {
        total_drivings: number;
        completed_drivings: number;
        scheduled_drivings: number;
        cancelled_drivings: number;
        average_rating: number;
    };
    contracts?: Contract[];
    financialHistories?: FinancialHistoryItem[];
    filters?: {
        status?: string;
        per_page?: string;
    };
}

export default function StudentShow({
    student,
    drivings,
    stats,
    contracts = [],
    financialHistories = [],
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth.user.role === 'instructor';
    const [activeTab, setActiveTab] = useState<'drivings' | 'finance'>('drivings');
    const [status, setStatus] = useState(filters.status || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');

    const formatMoney = (val: number | string | undefined | null) => {
        const num = Number(val || 0);
        return new Intl.NumberFormat('uz-UZ').format(num) + ' ' + t('common.sum', "so'm");
    };

    const totalContractAmount = contracts.reduce((acc, c) => acc + Number(c.total_amount || 0), 0);
    const totalPaidAmount = contracts.reduce((acc, c) => acc + Number(c.paid_amount || 0), 0);
    const totalDebt = Math.max(totalContractAmount - totalPaidAmount, 0);

    const applyFilters = (newStatus: string, newPerPage: string) => {
        router.get(`/admin/students/${student.id}`, { status: newStatus, per_page: newPerPage }, { preserveState: true, replace: true });
    };

    const isNegativeTag = (tag: string) => {
        return tag.includes('Kechikdi') ||
            tag.includes('Zargona') ||
            tag.includes('nosoz') ||
            tag.includes('Tushunarsiz') ||
            tag.includes('yomon') ||
            tag.includes('kam') ||
            tag.includes('Asabiy') ||
            tag.includes('Qo');
    };

    const translateTag = (tag: string) => {
        const clean = tag.replace(/^[^\w\u0400-\u04FF']+\s*/, '').trim();
        if (tag.includes('Kechikdi') || clean === 'Kechikdi') return t('drivings.tag_late', 'Kechikdi');
        if (tag.includes('Xushmuomala') || clean === 'Xushmuomala') return t('drivings.tag_polite', 'Xushmuomala');
        if (tag.includes('Zargona tushuntirdi') || clean === 'Zargona tushuntirdi') return t('drivings.tag_slang', 'Zargona tushuntirdi');
        if (tag.includes('Tushunarsiz') || clean === 'Tushunarsiz') return t('drivings.tag_unclear', 'Tushunarsiz');
        if (tag.includes('Mashina nosoz') || clean === 'Mashina nosoz') return t('drivings.tag_car_issue', 'Mashina nosoz');
        if (tag.includes('Yaxshi tushuntirdi') || clean === 'Yaxshi tushuntirdi') return t('drivings.tag_well_explained', 'Yaxshi tushuntirdi');
        if (tag.includes('Sabrli') || clean === 'Sabrli') return t('drivings.tag_patient', 'Sabrli');
        if (tag.includes('Asabiy') || clean === 'Asabiy') return t('drivings.tag_nervous', 'Asabiy');
        if (tag.includes("Qo'pol") || clean === "Qo'pol" || tag.includes("Qo`pol") || clean === "Qopol") return t('drivings.tag_rude', "Qo'pol");
        if (tag.includes('Mashina toza') || clean === 'Mashina toza') return t('drivings.tag_clean_car', 'Mashina toza');
        if (tag.includes('Vaqtida boshladi') || clean === 'Vaqtida boshladi') return t('drivings.tag_on_time', 'Vaqtida boshladi');
        if (tag.includes('Muomala yomon') || clean === 'Muomala yomon') return t('drivings.tag_bad_attitude', 'Muomala yomon');
        if (tag.includes('Vaqtidan kam') || clean.includes('Vaqtidan kam')) return t('drivings.tag_short_lesson', "Vaqtidan kam o'tildi");
        return tag;
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Head title={`${student.full_name} - ${t('students.lessons_history', 'Mashg\'ulotlar tarixi')}`} />

            {/* Top Navigation & Student Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border p-4 md:p-6 rounded-xl shadow-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild className="shrink-0">
                            <Link href="/admin/students">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">{student.full_name}</h1>
                            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" />
                                    {student.phone}
                                </span>
                                {student.group && (
                                    <span className="flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                                        <User className="w-3.5 h-3.5" />
                                        {student.group.name}
                                    </span>
                                )}
                                {student.telegram_id && (
                                    <span className="flex items-center gap-1">
                                        <Send className="w-3.5 h-3.5 text-sky-500" />
                                        ID: {student.telegram_id}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {!isInstructor && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-semibold">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{stats.average_rating}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-card border p-4 rounded-xl space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                        <span>{t('drivings.title', 'Darslar')}</span>
                        <Car className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold">{stats.total_drivings}</div>
                </div>
                <div className="bg-card border p-4 rounded-xl space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-green-600 dark:text-green-400 text-xs font-medium">
                        <span>{t('status.completed', 'Tugagan')}</span>
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed_drivings}</div>
                </div>
                <div className="bg-card border p-4 rounded-xl space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-medium">
                        <span>{t('status.scheduled', 'Rejada')}</span>
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.scheduled_drivings}</div>
                </div>
                <div className="bg-card border p-4 rounded-xl space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-xs font-medium">
                        <span>{t('status.cancelled', 'Bekor qilingan')}</span>
                        <XCircle className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.cancelled_drivings}</div>
                </div>
            </div>

            {/* Tabs for Admin / Non-Instructors */}
            {!isInstructor && (
                <div className="flex items-center gap-2 border-b pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('drivings')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            activeTab === 'drivings'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Car className="w-4 h-4" />
                        <span>{t('students.tab_drivings', "Mashg'ulotlar")}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('finance')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            activeTab === 'finance'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Wallet className="w-4 h-4" />
                        <span>{t('students.tab_finance', "Moliya & To'lovlar tarixi")}</span>
                        {contracts.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-primary-foreground">
                                {contracts.length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {activeTab === 'drivings' ? (
                <div>
            {/* Filters Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border p-4 rounded-xl shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold">{t('students.lessons_history', 'Mashg\'ulotlar tarixi')}</h2>
                    <p className="text-xs text-muted-foreground">{t('students.lessons_history_desc', "Talabaning barcha mashg'ulotlari va baholari")}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Desktop Filters */}
                    <div className="hidden md:flex items-center gap-2">
                        <SearchableSelect
                            value={status}
                            onChange={(val) => {
                                const v = String(val ?? '');
                                setStatus(v);
                                applyFilters(v, perPage);
                            }}
                            options={[
                                { value: '', label: t('status.all', 'Barcha holatlar') },
                                { value: 'scheduled', label: t('status.scheduled', 'Rejada') },
                                { value: 'completed', label: t('status.completed', 'Tugagan') },
                                { value: 'cancelled', label: t('status.cancelled', 'Bekor qilingan') },
                            ]}
                            className="w-44"
                            triggerClassName="h-10 text-sm"
                        />

                        <select
                            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(e.target.value);
                                applyFilters(status, e.target.value);
                            }}
                        >
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="75">75</option>
                            <option value="all">{t('common.all', 'Barchasi')}</option>
                        </select>
                    </div>

                    {/* Mobile Sheet Filter */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="md:hidden">
                                <Filter className="w-4 h-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[60vh] overflow-y-auto rounded-t-xl">
                            <SheetHeader>
                                <SheetTitle>{t('common.filters', 'Filtrlar')}</SheetTitle>
                                <SheetDescription>{t('drivings.filter_desc', "Mashg'ulotlarni filtrlash")}</SheetDescription>
                            </SheetHeader>
                            <div className="grid gap-4 py-4 mt-2">
                                <div className="space-y-2">
                                    <Label>{t('common.status', 'Holati')}</Label>
                                    <SearchableSelect
                                        value={status}
                                        onChange={(val) => {
                                            const v = String(val ?? '');
                                            setStatus(v);
                                            applyFilters(v, perPage);
                                        }}
                                        options={[
                                            { value: '', label: t('status.all', 'Barcha holatlar') },
                                            { value: 'scheduled', label: t('status.scheduled', 'Rejada') },
                                            { value: 'completed', label: t('status.completed', 'Tugagan') },
                                            { value: 'cancelled', label: t('status.cancelled', 'Bekor qilingan') },
                                        ]}
                                        className="w-full"
                                        triggerClassName="h-10 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('common.pagination', 'Sahifalash')}</Label>
                                    <select
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={perPage}
                                        onChange={(e) => {
                                            setPerPage(e.target.value);
                                            applyFilters(status, e.target.value);
                                        }}
                                    >
                                        <option value="10">10</option>
                                        <option value="30">30</option>
                                        <option value="50">50</option>
                                        <option value="all">{t('common.all', 'Barchasi')}</option>
                                    </select>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Drivings Table / Mobile Cards */}
            <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-b border-border">
                                <TableHead className="font-semibold">{t('common.number', '№')}</TableHead>
                                <TableHead className="font-semibold">{t('drivings.date_time', 'Sana / Vaqt')}</TableHead>
                                <TableHead className="font-semibold">{t('drivings.instructor', 'Instruktor')}</TableHead>
                                <TableHead className="font-semibold">{t('common.status', 'Holati')}</TableHead>
                                {!isInstructor && <TableHead className="font-semibold text-center">{t('drivings.review', 'Baho va Fikr')}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drivings.data.length > 0 ? (
                                drivings.data.map((driving, index) => (
                                    <TableRow key={driving.id} className="hover:bg-muted/30">
                                        <TableCell>{(drivings.from || 1) + index}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <div className="font-medium">
                                                {(() => {
                                                    const d = new Date(driving.start_time);
                                                    const dd = String(d.getDate()).padStart(2, '0');
                                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                    const yyyy = d.getFullYear();
                                                    return `${dd}-${mm}-${yyyy}`;
                                                })()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(driving.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                                {' - '}
                                                {new Date(driving.end_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{driving.instructor?.name || '-'}</TableCell>
                                        <TableCell>
                                            {driving.status === 'scheduled' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('status.scheduled', 'Rejada')}</span>}
                                            {driving.status === 'completed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('status.completed', 'Tugagan')}</span>}
                                            {driving.status === 'cancelled' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('status.cancelled', 'Bekor qilingan')}</span>}
                                        </TableCell>
                                        {!isInstructor && (
                                            <TableCell className="text-center">
                                                {driving.review ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                                            <span>{driving.review.rating}</span>
                                                            <Star className="w-4 h-4 fill-current" />
                                                        </div>
                                                        {driving.review.reason_tags && driving.review.reason_tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 justify-center max-w-[200px]">
                                                                {driving.review.reason_tags.map((tag, i) => {
                                                                    const isNeg = isNegativeTag(tag);
                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 font-medium whitespace-nowrap ${
                                                                                isNeg
                                                                                    ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                                                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                                                            }`}
                                                                        >
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${isNeg ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                                                            {translateTag(tag)}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {driving.review.comment && (
                                                            <div className="text-xs text-muted-foreground italic max-w-[200px] truncate">
                                                                "{driving.review.comment}"
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableEmpty
                                    colSpan={isInstructor ? 4 : 5}
                                    icon={Car}
                                    title={t('common.no_data', 'Ma\'lumot topilmadi')}
                                    description={t('drivings.no_drivings_desc', 'Ushbu o\'quvchi uchun mashg\'ulotlar topilmadi')}
                                />
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden p-3 space-y-3 bg-muted/20">
                    {drivings.data.length > 0 ? (
                        drivings.data.map((driving) => (
                            <div key={driving.id} className="p-4 space-y-3 bg-card border rounded-xl shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold text-sm">
                                            {(() => {
                                                const d = new Date(driving.start_time);
                                                const dd = String(d.getDate()).padStart(2, '0');
                                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                const yyyy = d.getFullYear();
                                                return `${dd}-${mm}-${yyyy}`;
                                            })()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(driving.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                            {' - '}
                                            {new Date(driving.end_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div>
                                        {driving.status === 'scheduled' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('status.scheduled', 'Rejada')}</span>}
                                        {driving.status === 'completed' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('status.completed', 'Tugagan')}</span>}
                                        {driving.status === 'cancelled' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('status.cancelled', 'Bekor qilingan')}</span>}
                                    </div>
                                </div>

                                <div className="text-sm">
                                    <span className="text-muted-foreground text-xs block">{t('drivings.instructor', 'Instruktor')}:</span>
                                    <span className="font-medium">{driving.instructor?.name || '-'}</span>
                                </div>

                                {!isInstructor && driving.review && (
                                    <div className="pt-2 border-t space-y-1">
                                        <div className="flex items-center gap-1 text-yellow-500 font-bold text-xs">
                                            <span>{t('drivings.review', 'Baho')}: {driving.review.rating}</span>
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                        </div>
                                        {driving.review.reason_tags && driving.review.reason_tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {driving.review.reason_tags.map((tag, i) => {
                                                    const isNeg = isNegativeTag(tag);
                                                    return (
                                                        <span
                                                            key={i}
                                                            className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 font-medium ${
                                                                isNeg
                                                                    ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                                            }`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isNeg ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                                            {translateTag(tag)}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {driving.review.comment && (
                                            <div className="text-xs text-muted-foreground italic">
                                                "{driving.review.comment}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {t('common.no_data', 'Ma\'lumot topilmadi')}
                        </div>
                    )}
                </div>

                <Pagination links={drivings.links} />
            </div>
            </div>
            ) : (
                <div className="space-y-6">
                    {/* Finance Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-card border p-4 rounded-xl space-y-1 shadow-xs">
                            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                                <span>{t('students.total_contract', 'Jami shartnoma qiymati')}</span>
                                <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="text-xl md:text-2xl font-bold text-foreground">
                                {formatMoney(totalContractAmount)}
                            </div>
                        </div>

                        <div className="bg-card border p-4 rounded-xl space-y-1 shadow-xs">
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                <span>{t('students.total_paid', "To'langan summa")}</span>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(totalPaidAmount)}
                            </div>
                        </div>

                        <div className="bg-card border p-4 rounded-xl space-y-1 shadow-xs">
                            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium">
                                <span>{t('students.debt_remaining', 'Qoldiq qarz')}</span>
                                <Wallet className="w-4 h-4" />
                            </div>
                            <div className="text-xl md:text-2xl font-bold text-rose-600 dark:text-rose-400">
                                {formatMoney(totalDebt)}
                            </div>
                        </div>
                    </div>

                    {/* Financial Transactions Ledger */}
                    <div className="bg-card border rounded-xl shadow-xs overflow-hidden">
                        <div className="p-4 border-b">
                            <h2 className="text-base font-semibold">{t('students.financial_ledger', 'Moliyaviy amaliyotlar daftari')}</h2>
                            <p className="text-xs text-muted-foreground">{t('students.financial_ledger_desc', "Barcha to'lovlar, hisoblangan qarzlar va pul o'tkazmalari tarixi")}</p>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">№</TableHead>
                                        <TableHead>{t('common.date', 'Sana')}</TableHead>
                                        <TableHead>{t('finance.type', 'Amaliyot turi')}</TableHead>
                                        <TableHead>{t('finance.amount', 'Summa')}</TableHead>
                                        <TableHead>{t('finance.payment_method', "To'lov usuli")}</TableHead>
                                        <TableHead>{t('finance.balance_state', "Balans o'zgarishi")}</TableHead>
                                        <TableHead>{t('common.description', 'Izoh')}</TableHead>
                                        <TableHead>{t('finance.performed_by', "Mas'ul")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {financialHistories.length === 0 ? (
                                        <TableEmpty colSpan={8} title={t('common.no_data', "Ma'lumot topilmadi")} />
                                    ) : (
                                        financialHistories.map((fh, idx) => {
                                            const isDebit = fh.type === 'debit';
                                            return (
                                                <TableRow key={fh.id}>
                                                    <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                                                    <TableCell className="text-xs">{new Date(fh.transacted_at).toLocaleDateString('uz-UZ')}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5 text-xs font-medium">
                                                            {isDebit ? (
                                                                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                                                            ) : (
                                                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                                                            )}
                                                            <span>
                                                                {fh.category === 'tuition_payment'
                                                                    ? t('finance.tuition_payment', "O'qish to'lovi")
                                                                    : fh.category === 'refund'
                                                                      ? t('finance.refund', "To'lov qaytarish")
                                                                      : fh.category === 'discount'
                                                                        ? t('finance.discount', 'Chegirma')
                                                                        : fh.category}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`font-semibold text-xs ${isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            {isDebit ? '-' : '+'}{formatMoney(fh.amount)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{fh.payment_method || '-'}</TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        <span className="text-muted-foreground">{formatMoney(fh.balance_before)}</span>
                                                        <span className="mx-1">→</span>
                                                        <span className="font-semibold text-foreground">{formatMoney(fh.balance_after)}</span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{fh.description || '-'}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{fh.performed_by?.name || '-'}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile List */}
                        <div className="md:hidden p-3 space-y-2.5">
                            {financialHistories.length === 0 ? (
                                <div className="text-center py-8 text-xs text-muted-foreground">{t('common.no_data', "Ma'lumot topilmadi")}</div>
                            ) : (
                                financialHistories.map((fh) => {
                                    const isDebit = fh.type === 'debit';
                                    return (
                                        <div key={fh.id} className="p-3 bg-muted/20 border rounded-xl space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    {isDebit ? (
                                                        <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                                                    ) : (
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                                                    )}
                                                    <span>
                                                        {fh.category === 'tuition_payment'
                                                            ? t('finance.tuition_payment', "O'qish to'lovi")
                                                            : fh.category === 'refund'
                                                              ? t('finance.refund', "To'lov qaytarish")
                                                              : fh.category}
                                                    </span>
                                                </div>
                                                <span className={`font-bold ${isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {isDebit ? '-' : '+'}{formatMoney(fh.amount)}
                                                </span>
                                            </div>
                                            {fh.description && <div className="text-[11px] text-muted-foreground">{fh.description}</div>}
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                                                <span>{new Date(fh.transacted_at).toLocaleDateString('uz-UZ')}</span>
                                                <span>{t('staff.balance_after', 'Balans')}: {formatMoney(fh.balance_after)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
