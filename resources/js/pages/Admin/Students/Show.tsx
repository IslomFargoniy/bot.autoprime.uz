import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { SharedData } from '@/types';
import { ArrowLeft, Calendar, Car, Star, User, Phone, Send, CheckCircle2, Clock, XCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
    filters?: {
        status?: string;
        per_page?: string;
    };
}

export default function StudentShow({ student, drivings, stats, filters = {} }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth.user.role === 'instructor';
    const [status, setStatus] = useState(filters.status || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');

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
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium">{t('common.number', '№')}</th>
                            <th className="px-4 py-3 font-medium">{t('drivings.date_time', 'Sana / Vaqt')}</th>
                            <th className="px-4 py-3 font-medium">{t('drivings.instructor', 'Instruktor')}</th>
                            <th className="px-4 py-3 font-medium">{t('common.status', 'Holati')}</th>
                            {!isInstructor && <th className="px-4 py-3 font-medium text-center">{t('drivings.review', 'Baho va Fikr')}</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {drivings.data.length > 0 ? (
                            drivings.data.map((driving, index) => (
                                <tr key={driving.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3">{(drivings.from || 1) + index}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
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
                                    </td>
                                    <td className="px-4 py-3 font-medium">{driving.instructor?.name || '-'}</td>
                                    <td className="px-4 py-3">
                                        {driving.status === 'scheduled' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('status.scheduled', 'Rejada')}</span>}
                                        {driving.status === 'completed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('status.completed', 'Tugagan')}</span>}
                                        {driving.status === 'cancelled' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('status.cancelled', 'Bekor qilingan')}</span>}
                                    </td>
                                    {!isInstructor && (
                                        <td className="px-4 py-3 text-center">
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
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isInstructor ? 4 : 5} className="text-center py-8 text-muted-foreground text-sm">
                                    {t('common.no_data', 'Ma\'lumot topilmadi')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

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
    );
}
