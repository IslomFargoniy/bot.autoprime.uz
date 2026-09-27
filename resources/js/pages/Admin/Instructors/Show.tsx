import { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Car,
    Phone,
    Star,
    CheckCircle2,
    Clock,
    XCircle,
    Calendar,
    User as UserIcon,
    AlertTriangle,
    MessageSquare,
    TrendingUp,
    Search,
    MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { SharedData } from '@/types/auth';

interface TagCount {
    tag: string;
    count: number;
    percentage: number;
}

interface RatingDist {
    stars: number;
    count: number;
    percentage: number;
}

interface DrivingReview {
    id: number;
    rating: number;
    comment?: string;
    reason_tags?: string[];
}

interface Driving {
    id: number;
    start_time: string;
    end_time: string;
    status: string;
    student?: {
        id: number;
        full_name: string;
        phone?: string;
        group?: {
            name: string;
        };
    };
    autodrome?: {
        name: string;
    };
    review?: DrivingReview;
}

interface PageProps {
    instructor: {
        id: number;
        name: string;
        phone: string;
        telegram_id?: string;
        car_name?: string;
        photo_url?: string;
        groups_count: number;
    };
    stats: {
        total_drivings: number;
        completed_drivings: number;
        scheduled_drivings: number;
        cancelled_drivings: number;
        total_reviews: number;
        average_rating: number;
        kpi_percentage: number;
        tag_counts: TagCount[];
        rating_distribution: RatingDist[];
    };
    drivings: Driving[];
}

export default function InstructorShow({ instructor, stats, drivings }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructorRole = auth?.user?.role === 'instructor';

    const [search, setSearch] = useState('');

    const filteredDrivings = drivings.filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const studentName = d.student?.full_name?.toLowerCase() || '';
        const groupName = d.student?.group?.name?.toLowerCase() || '';
        const autodromeName = d.autodrome?.name?.toLowerCase() || '';
        const comment = d.review?.comment?.toLowerCase() || '';
        return studentName.includes(q) || groupName.includes(q) || autodromeName.includes(q) || comment.includes(q);
    });

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
                   date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Head title={`${instructor.name} - ${t('instructors.infographics', 'Infografika va statistika')}`} />

            {/* Top Navigation & Back Button */}
            <div className="flex items-center justify-between">
                <Link href="/admin/instructors">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('common.back', 'Orqaga')}</span>
                    </Button>
                </Link>
                <div className="text-xs text-muted-foreground font-mono">
                    ID: #{instructor.id}
                </div>
            </div>

            {/* Instructor Header Card */}
            <div className="bg-card border rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-muted shrink-0 overflow-hidden border-2 border-border shadow-xs">
                        {instructor.photo_url ? (
                            <img src={instructor.photo_url} alt={instructor.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <UserIcon className="w-8 h-8" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl md:text-2xl font-bold">{instructor.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                <span className="font-mono">{instructor.phone}</span>
                            </div>
                            {instructor.car_name && (
                                <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md font-medium text-foreground">
                                    <Car className="w-3.5 h-3.5 text-primary" />
                                    <span>{instructor.car_name}</span>
                                </div>
                            )}
                            <div className="bg-muted px-2 py-0.5 rounded-md font-medium text-foreground">
                                {instructor.groups_count} {t('instructors.groups', 'guruh')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overall KPI & Score Badge */}
                <div className="flex items-center gap-4 self-stretch md:self-auto justify-around border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-extrabold text-primary">
                            {stats.kpi_percentage}%
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                            {t('instructors.kpi_score', 'KPI Ko\'rsatgichi')}
                        </div>
                    </div>

                    {!isInstructorRole && (
                        <div className="text-center">
                            <div className="text-2xl md:text-3xl font-extrabold text-amber-500 flex items-center justify-center gap-1">
                                <Star className="w-6 h-6 fill-current" />
                                <span>{stats.average_rating}</span>
                            </div>
                            <div className="text-xs text-muted-foreground font-medium mt-0.5">
                                ({stats.total_reviews} {t('instructors.reviews_count', 'baho')})
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-card border rounded-xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>{t('instructors.total_drivings', 'Jami darslar')}</span>
                        <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">{stats.total_drivings}</div>
                </div>

                <div className="bg-card border rounded-xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>{t('instructors.completed', 'Yakunlangan')}</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed_drivings}</div>
                </div>

                <div className="bg-card border rounded-xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>{t('instructors.scheduled', 'Rejalashtirilgan')}</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.scheduled_drivings}</div>
                </div>

                <div className="bg-card border rounded-xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>{t('instructors.cancelled', 'Bekor qilingan')}</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.cancelled_drivings}</div>
                </div>
            </div>

            {/* Infographics & Rating Criteria (Hidden from instructors as per privacy policy rule) */}
            {!isInstructorRole && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Star Rating Distribution */}
                    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="font-semibold text-base flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500 fill-current" />
                                <span>{t('instructors.rating_distribution', 'Baholar taqsimoti')}</span>
                            </h2>
                            <span className="text-xs text-muted-foreground font-medium">{stats.total_reviews} {t('instructors.reviews_count', 'baho')}</span>
                        </div>

                        <div className="space-y-2.5">
                            {stats.rating_distribution.map((dist) => (
                                <div key={dist.stars} className="flex items-center gap-3 text-xs">
                                    <div className="w-12 flex items-center gap-1 font-semibold">
                                        <span>{dist.stars}</span>
                                        <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                                    </div>
                                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                            style={{ width: `${dist.percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-16 text-right text-muted-foreground font-mono">
                                        {dist.count} ({dist.percentage}%)
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Review Reason Tags Breakdown */}
                    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="font-semibold text-base flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span>{t('instructors.criteria_breakdown', 'Baholash mezonlari (Taglar)')}</span>
                            </h2>
                            <span className="text-xs text-muted-foreground font-medium">{stats.tag_counts.length} {t('instructors.tags_count_suffix', 'ta mezon')}</span>
                        </div>

                        {stats.tag_counts.length === 0 ? (
                            <div className="text-center py-6 text-xs text-muted-foreground">
                                {t('instructors.no_tags', 'Hozircha baholash mezonlari bildirilmagan')}
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {stats.tag_counts.map((tc) => {
                                    const isNegative = ['Kechiqdi', 'Muomala yomon', 'Mashina nosoz', 'Vaqtidan kam o\'tildi', 'Nervniy'].some(k => tc.tag.includes(k));
                                    return (
                                        <div key={tc.tag} className="space-y-1">
                                            <div className="flex justify-between items-center text-xs font-medium">
                                                <span className={`px-2 py-0.5 rounded-md border text-xs ${
                                                    isNegative ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                                                }`}>
                                                    {tc.tag}
                                                </span>
                                                <span className="text-muted-foreground font-mono">{tc.count} {t('common.times', 'marta')} ({tc.percentage}%)</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${isNegative ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{ width: `${tc.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Conducted Drivings List Section */}
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                    <div>
                        <h2 className="text-lg font-bold">{t('instructors.conducted_drivings', 'O\'tkazgan mashg\'ulotlari ro\'yxati')}</h2>
                        <p className="text-xs text-muted-foreground">
                            {t('instructors.drivings_subtitle', 'Instruktor tomonidan o\'tkazilgan barcha amaliy darslar')} ({filteredDrivings.length})
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('common.search', 'Qidirish...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 text-xs sm:text-sm"
                        />
                    </div>
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">№</TableHead>
                                <TableHead>{t('drivings.date_time', 'Sana va Vaqt')}</TableHead>
                                <TableHead>{t('students.title', 'O\'quvchi (Guruh)')}</TableHead>
                                <TableHead>{t('drivings.autodrome', 'Avtodrom')}</TableHead>
                                <TableHead className="text-center">{t('drivings.status', 'Holat')}</TableHead>
                                {!isInstructorRole && <TableHead>{t('drivings.review', 'Baho / Taglar')}</TableHead>}
                                {!isInstructorRole && <TableHead>{t('drivings.comment', 'Izoh')}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDrivings.length === 0 ? (
                                <TableEmpty
                                    colSpan={isInstructorRole ? 5 : 7}
                                    icon={Car}
                                    title={t('drivings.no_drivings', 'Mashg\'ulotlar topilmadi')}
                                    description={t('drivings.no_drivings_desc', 'Hozircha birorta ham amaliy dars mavjud emas')}
                                />
                            ) : (
                                filteredDrivings.map((driving, idx) => (
                                    <TableRow key={driving.id}>
                                        <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell className="font-mono whitespace-nowrap">
                                            {formatDate(driving.start_time)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{driving.student?.full_name || '-'}</div>
                                            {driving.student?.group && (
                                                <div className="text-xs text-muted-foreground">
                                                    {driving.student.group.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {driving.autodrome ? (
                                                <div className="flex items-center gap-1 text-xs">
                                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span>{driving.autodrome.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                driving.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                driving.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                            }`}>
                                                {driving.status === 'completed' ? t('drivings.status_completed', 'Yakunlangan') :
                                                 driving.status === 'scheduled' ? t('drivings.status_scheduled', 'Belgilangan') :
                                                 t('drivings.status_cancelled', 'Bekor qilingan')}
                                            </span>
                                        </TableCell>
                                        {!isInstructorRole && (
                                            <TableCell>
                                                {driving.review ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                                            <Star className="w-3.5 h-3.5 fill-current" />
                                                            <span>{driving.review.rating} / 5</span>
                                                        </div>
                                                        {driving.review.reason_tags && driving.review.reason_tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {driving.review.reason_tags.map((tag, i) => (
                                                                    <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded border">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground font-normal">{t('drivings.no_review', 'Baholanmagan')}</span>
                                                )}
                                            </TableCell>
                                        )}
                                        {!isInstructorRole && (
                                            <TableCell className="max-w-xs text-xs text-muted-foreground">
                                                {driving.review?.comment ? (
                                                    <div className="flex items-start gap-1">
                                                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                                        <span>{driving.review.comment}</span>
                                                    </div>
                                                ) : (
                                                    <span>-</span>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards Feed */}
                <div className="md:hidden space-y-3">
                    {filteredDrivings.length === 0 ? (
                        <div className="text-center py-8 bg-muted/20 border border-dashed rounded-xl p-4">
                            <Car className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                            <div className="font-medium text-sm">{t('drivings.no_drivings', 'Mashg\'ulotlar topilmadi')}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {t('drivings.no_drivings_desc', 'Hozircha birorta ham amaliy dars mavjud emas')}
                            </div>
                        </div>
                    ) : (
                        filteredDrivings.map((driving, idx) => (
                            <div key={driving.id} className="bg-card border rounded-xl p-3.5 shadow-2xs space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                                            <span className="font-semibold text-sm truncate">
                                                {driving.student?.full_name || '-'}
                                            </span>
                                        </div>
                                        {driving.student?.group && (
                                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                                                {driving.student.group.name}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                        driving.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        driving.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                        'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                    }`}>
                                        {driving.status === 'completed' ? t('drivings.status_completed', 'Yakunlangan') :
                                         driving.status === 'scheduled' ? t('drivings.status_scheduled', 'Belgilangan') :
                                         t('drivings.status_cancelled', 'Bekor qilingan')}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t text-muted-foreground">
                                    <div className="flex items-center gap-1 truncate">
                                        <Clock className="w-3.5 h-3.5 shrink-0" />
                                        <span className="font-mono text-[11px] truncate">{formatDate(driving.start_time)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 justify-end truncate">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{driving.autodrome?.name || '-'}</span>
                                    </div>
                                </div>

                                {!isInstructorRole && driving.review && (
                                    <div className="p-2 bg-muted/40 rounded-lg space-y-1.5 border">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                <span>{driving.review.rating} / 5</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">{t('drivings.review', 'Baho')}</span>
                                        </div>
                                        {driving.review.reason_tags && driving.review.reason_tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {driving.review.reason_tags.map((tag, i) => (
                                                    <span key={i} className="text-[10px] bg-card px-1.5 py-0.5 rounded border">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {driving.review.comment && (
                                            <div className="flex items-start gap-1 text-xs text-foreground/80 pt-1">
                                                <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                                                <span className="text-[11px] italic">"{driving.review.comment}"</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
