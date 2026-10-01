import { Head, Link, usePage } from '@inertiajs/react';
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
    MessageSquare,
    TrendingUp,
    Search,
    MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatDateTime } from '@/lib/utils';
import type { SharedData } from '@/types/auth';

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

export default function InstructorShow({
    instructor,
    stats,
    drivings,
}: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructorRole = auth?.user?.role === 'instructor';

    const [search, setSearch] = useState('');

    const filteredDrivings = drivings.filter((d) => {
        if (!search) {
            return true;
        }

        const q = search.toLowerCase();
        const studentName = d.student?.full_name?.toLowerCase() || '';
        const groupName = d.student?.group?.name?.toLowerCase() || '';
        const autodromeName = d.autodrome?.name?.toLowerCase() || '';
        const comment = d.review?.comment?.toLowerCase() || '';

        return (
            studentName.includes(q) ||
            groupName.includes(q) ||
            autodromeName.includes(q) ||
            comment.includes(q)
        );
    });

    const formatDate = (dateStr: string) => {
        return formatDateTime(dateStr);
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <Head
                title={`${instructor.name} - ${t('instructors.infographics', 'Infografika va statistika')}`}
            />

            {/* Top Navigation & Back Button */}
            <div className="flex items-center justify-between">
                <Link href="/admin/instructors">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>{t('common.back', 'Orqaga')}</span>
                    </Button>
                </Link>
                <div className="font-mono text-xs text-muted-foreground">
                    ID: #{instructor.id}
                </div>
            </div>

            {/* Instructor Header Card */}
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:p-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-xs md:h-20 md:w-20">
                        {instructor.photo_url ? (
                            <img
                                src={instructor.photo_url}
                                alt={instructor.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <UserIcon className="h-8 w-8" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold md:text-2xl">
                            {instructor.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground md:text-sm">
                            <div className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                <span className="font-mono">
                                    {instructor.phone}
                                </span>
                            </div>
                            {instructor.car_name && (
                                <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                                    <Car className="h-3.5 w-3.5 text-primary" />
                                    <span>{instructor.car_name}</span>
                                </div>
                            )}
                            <div className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                                {instructor.groups_count}{' '}
                                {t('instructors.groups', 'guruh')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overall KPI & Score Badge */}
                <div className="flex items-center justify-around gap-4 self-stretch border-t pt-4 md:self-auto md:border-t-0 md:border-l md:pt-0 md:pl-6">
                    <div className="text-center">
                        <div className="text-2xl font-extrabold text-primary md:text-3xl">
                            {stats.kpi_percentage}%
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                            {t('instructors.kpi_score', "KPI Ko'rsatgichi")}
                        </div>
                    </div>

                    {!isInstructorRole && (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-2xl font-extrabold text-amber-500 md:text-3xl">
                                <Star className="h-6 w-6 fill-current" />
                                <span>{stats.average_rating}</span>
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                                ({stats.total_reviews}{' '}
                                {t('instructors.reviews_count', 'baho')})
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                <div className="space-y-1 rounded-xl border bg-card p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>
                            {t('instructors.total_drivings', 'Jami darslar')}
                        </span>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">
                        {stats.total_drivings}
                    </div>
                </div>

                <div className="space-y-1 rounded-xl border bg-card p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>{t('instructors.completed', 'Yakunlangan')}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.completed_drivings}
                    </div>
                </div>

                <div className="space-y-1 rounded-xl border bg-card p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>
                            {t('instructors.scheduled', 'Rejalashtirilgan')}
                        </span>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {stats.scheduled_drivings}
                    </div>
                </div>

                <div className="space-y-1 rounded-xl border bg-card p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>
                            {t('instructors.cancelled', 'Bekor qilingan')}
                        </span>
                        <XCircle className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {stats.cancelled_drivings}
                    </div>
                </div>
            </div>

            {/* Infographics & Rating Criteria (Hidden from instructors as per privacy policy rule) */}
            {!isInstructorRole && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Star Rating Distribution */}
                    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="flex items-center gap-2 text-base font-semibold">
                                <Star className="h-4 w-4 fill-current text-amber-500" />
                                <span>
                                    {t(
                                        'instructors.rating_distribution',
                                        'Baholar taqsimoti',
                                    )}
                                </span>
                            </h2>
                            <span className="text-xs font-medium text-muted-foreground">
                                {stats.total_reviews}{' '}
                                {t('instructors.reviews_count', 'baho')}
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {stats.rating_distribution.map((dist) => (
                                <div
                                    key={dist.stars}
                                    className="flex items-center gap-3 text-xs"
                                >
                                    <div className="flex w-12 items-center gap-1 font-semibold">
                                        <span>{dist.stars}</span>
                                        <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                                    </div>
                                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-amber-400 transition-all duration-500"
                                            style={{
                                                width: `${dist.percentage}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="w-16 text-right font-mono text-muted-foreground">
                                        {dist.count} ({dist.percentage}%)
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Review Reason Tags Breakdown */}
                    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="flex items-center gap-2 text-base font-semibold">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <span>
                                    {t(
                                        'instructors.criteria_breakdown',
                                        'Baholash mezonlari (Taglar)',
                                    )}
                                </span>
                            </h2>
                            <span className="text-xs font-medium text-muted-foreground">
                                {stats.tag_counts.length}{' '}
                                {t('instructors.tags_count_suffix', 'ta mezon')}
                            </span>
                        </div>

                        {stats.tag_counts.length === 0 ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">
                                {t(
                                    'instructors.no_tags',
                                    'Hozircha baholash mezonlari bildirilmagan',
                                )}
                            </div>
                        ) : (
                            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                                {stats.tag_counts.map((tc) => {
                                    const isNegative = [
                                        'Kechiqdi',
                                        'Muomala yomon',
                                        'Mashina nosoz',
                                        "Vaqtidan kam o'tildi",
                                        'Nervniy',
                                    ].some((k) => tc.tag.includes(k));

                                    return (
                                        <div key={tc.tag} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs font-medium">
                                                <span
                                                    className={`rounded-md border px-2 py-0.5 text-xs ${
                                                        isNegative
                                                            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                                                            : 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                                                    }`}
                                                >
                                                    {tc.tag}
                                                </span>
                                                <span className="font-mono text-muted-foreground">
                                                    {tc.count}{' '}
                                                    {t('common.times', 'marta')}{' '}
                                                    ({tc.percentage}%)
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${isNegative ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{
                                                        width: `${tc.percentage}%`,
                                                    }}
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
            <div className="space-y-4 overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-bold">
                            {t(
                                'instructors.conducted_drivings',
                                "O'tkazgan mashg'ulotlari ro'yxati",
                            )}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'instructors.drivings_subtitle',
                                "Instruktor tomonidan o'tkazilgan barcha amaliy darslar",
                            )}{' '}
                            ({filteredDrivings.length})
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('common.search', 'Qidirish...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 text-xs sm:text-sm"
                        />
                    </div>
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">№</TableHead>
                                <TableHead>
                                    {t('drivings.date_time', 'Sana va Vaqt')}
                                </TableHead>
                                <TableHead>
                                    {t('students.title', "O'quvchi (Guruh)")}
                                </TableHead>
                                <TableHead>
                                    {t('drivings.autodrome', 'Avtodrom')}
                                </TableHead>
                                <TableHead className="text-center">
                                    {t('drivings.status', 'Holat')}
                                </TableHead>
                                {!isInstructorRole && (
                                    <TableHead>
                                        {t('drivings.review', 'Baho / Taglar')}
                                    </TableHead>
                                )}
                                {!isInstructorRole && (
                                    <TableHead>
                                        {t('drivings.comment', 'Izoh')}
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDrivings.length === 0 ? (
                                <TableEmpty
                                    colSpan={isInstructorRole ? 5 : 7}
                                    icon={Car}
                                    title={t(
                                        'drivings.no_drivings',
                                        "Mashg'ulotlar topilmadi",
                                    )}
                                    description={t(
                                        'drivings.no_drivings_desc',
                                        'Hozircha birorta ham amaliy dars mavjud emas',
                                    )}
                                />
                            ) : (
                                filteredDrivings.map((driving, idx) => (
                                    <TableRow key={driving.id}>
                                        <TableCell className="font-medium text-muted-foreground">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell className="font-mono whitespace-nowrap">
                                            {formatDate(driving.start_time)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {driving.student?.full_name ||
                                                    '-'}
                                            </div>
                                            {driving.student?.group && (
                                                <div className="text-xs text-muted-foreground">
                                                    {driving.student.group.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {driving.autodrome ? (
                                                <div className="flex items-center gap-1 text-xs">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                    <span>
                                                        {driving.autodrome.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                    driving.status ===
                                                    'completed'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : driving.status ===
                                                            'scheduled'
                                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                                }`}
                                            >
                                                {driving.status === 'completed'
                                                    ? t(
                                                          'drivings.status_completed',
                                                          'Yakunlangan',
                                                      )
                                                    : driving.status ===
                                                        'scheduled'
                                                      ? t(
                                                            'drivings.status_scheduled',
                                                            'Belgilangan',
                                                        )
                                                      : t(
                                                            'drivings.status_cancelled',
                                                            'Bekor qilingan',
                                                        )}
                                            </span>
                                        </TableCell>
                                        {!isInstructorRole && (
                                            <TableCell>
                                                {driving.review ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                            <Star className="h-3.5 w-3.5 fill-current" />
                                                            <span>
                                                                {
                                                                    driving
                                                                        .review
                                                                        .rating
                                                                }{' '}
                                                                / 5
                                                            </span>
                                                        </div>
                                                        {driving.review
                                                            .reason_tags &&
                                                            driving.review
                                                                .reason_tags
                                                                .length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {driving.review.reason_tags.map(
                                                                        (
                                                                            tag,
                                                                            i,
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    i
                                                                                }
                                                                                className="rounded border bg-muted px-1.5 py-0.5 text-[10px]"
                                                                            >
                                                                                {
                                                                                    tag
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        {t(
                                                            'drivings.no_review',
                                                            'Baholanmagan',
                                                        )}
                                                    </span>
                                                )}
                                            </TableCell>
                                        )}
                                        {!isInstructorRole && (
                                            <TableCell className="max-w-xs text-xs text-muted-foreground">
                                                {driving.review?.comment ? (
                                                    <div className="flex items-start gap-1">
                                                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                        <span>
                                                            {
                                                                driving.review
                                                                    .comment
                                                            }
                                                        </span>
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
                <div className="space-y-3 md:hidden">
                    {filteredDrivings.length === 0 ? (
                        <div className="rounded-xl border border-dashed bg-muted/20 p-4 py-8 text-center">
                            <Car className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                            <div className="text-sm font-medium">
                                {t(
                                    'drivings.no_drivings',
                                    "Mashg'ulotlar topilmadi",
                                )}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                {t(
                                    'drivings.no_drivings_desc',
                                    'Hozircha birorta ham amaliy dars mavjud emas',
                                )}
                            </div>
                        </div>
                    ) : (
                        filteredDrivings.map((driving, idx) => (
                            <div
                                key={driving.id}
                                className="space-y-2.5 rounded-xl border bg-card p-3.5 shadow-2xs"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                #{idx + 1}
                                            </span>
                                            <span className="truncate text-sm font-semibold">
                                                {driving.student?.full_name ||
                                                    '-'}
                                            </span>
                                        </div>
                                        {driving.student?.group && (
                                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {driving.student.group.name}
                                            </div>
                                        )}
                                    </div>
                                    <span
                                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                            driving.status === 'completed'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : driving.status === 'scheduled'
                                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}
                                    >
                                        {driving.status === 'completed'
                                            ? t(
                                                  'drivings.status_completed',
                                                  'Yakunlangan',
                                              )
                                            : driving.status === 'scheduled'
                                              ? t(
                                                    'drivings.status_scheduled',
                                                    'Belgilangan',
                                                )
                                              : t(
                                                    'drivings.status_cancelled',
                                                    'Bekor qilingan',
                                                )}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t pt-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1 truncate">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate font-mono text-[11px]">
                                            {formatDate(driving.start_time)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 truncate">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            {driving.autodrome?.name || '-'}
                                        </span>
                                    </div>
                                </div>

                                {!isInstructorRole && driving.review && (
                                    <div className="space-y-1.5 rounded-lg border bg-muted/40 p-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                <Star className="h-3.5 w-3.5 fill-current" />
                                                <span>
                                                    {driving.review.rating} / 5
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {t('drivings.review', 'Baho')}
                                            </span>
                                        </div>
                                        {driving.review.reason_tags &&
                                            driving.review.reason_tags.length >
                                                0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {driving.review.reason_tags.map(
                                                        (tag, i) => (
                                                            <span
                                                                key={i}
                                                                className="rounded border bg-card px-1.5 py-0.5 text-[10px]"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        {driving.review.comment && (
                                            <div className="flex items-start gap-1 pt-1 text-xs text-foreground/80">
                                                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                                <span className="text-[11px] italic">
                                                    "{driving.review.comment}"
                                                </span>
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
