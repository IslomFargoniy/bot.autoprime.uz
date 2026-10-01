import { Head, router } from '@inertiajs/react';
import { Award } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableEmpty,
} from '@/components/ui/table';

interface Instructor {
    id: number;
    name: string;
    phone: string;
    groups_count: number;
    total_drivings: number;
    average_rating: number;
    total_reviews: number;
    kpi_percentage: number;
    needs_attention?: boolean;
    negative_tags_count?: number;
}

interface PageProps {
    instructors: Instructor[];
    filters?: {
        from?: string;
        to?: string;
    };
}

export default function KPI({ instructors = [], filters = {} }: PageProps) {
    const { t } = useTranslation();
    const [fromDate, setFromDate] = useState(filters?.from || '');
    const [toDate, setToDate] = useState(filters?.to || '');

    const applyFilters = (newFrom: string, newTo: string) => {
        router.get(
            '/admin/kpi',
            {
                from: newFrom,
                to: newTo,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleFilterDateChange = (field: 'from' | 'to', dateStr: string) => {
        if (field === 'from') {
            setFromDate(dateStr);
            applyFilters(dateStr, toDate);
        } else {
            setToDate(dateStr);
            applyFilters(fromDate, dateStr);
        }
    };

    return (
        <div className="space-y-4 p-4 md:space-y-6 md:p-6">
            <Head title={t('kpi.title', 'KPI Tizimi')} />

            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <h1 className="text-xl font-bold sm:text-2xl">
                    {t('kpi.title', 'Avtomaktab KPI Tizimi')}
                </h1>

                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                    <DatePicker
                        placeholder="YYYY-MM-DD"
                        value={fromDate}
                        onChange={(val) => handleFilterDateChange('from', val)}
                        className="w-full sm:w-36"
                    />

                    <DatePicker
                        placeholder="YYYY-MM-DD"
                        value={toDate}
                        onChange={(val) => handleFilterDateChange('to', val)}
                        className="w-full sm:w-36"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-border bg-muted/50">
                                <TableHead className="font-semibold">
                                    {t('kpi.instructor', 'Instruktor')}
                                </TableHead>
                                <TableHead className="text-center font-semibold">
                                    {t('kpi.group_lesson', 'Guruh / Dars')}
                                </TableHead>
                                <TableHead className="text-center font-semibold">
                                    {t('kpi.average_rating', "O'rtacha Baho")}
                                </TableHead>
                                <TableHead className="text-center font-semibold">
                                    {t('kpi.kpi_percent', 'KPI (%)')}
                                </TableHead>
                                <TableHead className="text-center font-semibold">
                                    {t('kpi.status', 'Holat')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {instructors.length === 0 ? (
                                <TableEmpty
                                    colSpan={5}
                                    icon={Award}
                                    title={t(
                                        'common.no_data',
                                        "Ma'lumot topilmadi",
                                    )}
                                    description={t(
                                        'kpi.no_data_desc',
                                        "Tanlangan davr bo'yicha KPI ma'lumotlari mavjud emas",
                                    )}
                                />
                            ) : (
                                instructors.map((instructor) => (
                                    <TableRow
                                        key={instructor.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <TableCell className="font-medium">
                                            <div className="font-semibold text-primary">
                                                {instructor.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {instructor.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="font-medium">
                                                {instructor.groups_count}{' '}
                                                {t(
                                                    'kpi.groups_count',
                                                    'ta guruh',
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {instructor.total_drivings}{' '}
                                                {t(
                                                    'kpi.drivings_count',
                                                    "ta mashg'ulot",
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="inline-flex items-center gap-1 font-semibold">
                                                <span>
                                                    {instructor.average_rating}
                                                </span>
                                                <span className="text-yellow-500">
                                                    ⭐
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {instructor.total_reviews}{' '}
                                                {t(
                                                    'kpi.reviews_count',
                                                    'ta baho',
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                                                    instructor.kpi_percentage >=
                                                    80
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : instructor.kpi_percentage >=
                                                            50
                                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                }`}
                                            >
                                                {instructor.kpi_percentage}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {instructor.needs_attention ? (
                                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                    {t(
                                                        'kpi.warning_status',
                                                        'Xavotirli',
                                                    )}{' '}
                                                    (
                                                    {
                                                        instructor.negative_tags_count
                                                    }{' '}
                                                    {t(
                                                        'kpi.complaints_count',
                                                        'shikoyat',
                                                    )}
                                                    )
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                    {t(
                                                        'kpi.excellent_status',
                                                        "A'lo",
                                                    )}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 bg-muted/20 p-3 md:hidden">
                    {instructors.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            {t('common.no_data', "Ma'lumot topilmadi")}
                        </div>
                    ) : (
                        instructors.map((instructor) => (
                            <div
                                key={instructor.id}
                                className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-lg font-semibold text-primary">
                                            {instructor.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {instructor.phone}
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                                            instructor.kpi_percentage >= 80
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : instructor.kpi_percentage >=
                                                    50
                                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}
                                    >
                                        {instructor.kpi_percentage}%{' '}
                                        {t('instructors.kpi', 'KPI')}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t pt-2 text-sm">
                                    <div>
                                        <span className="block text-xs text-muted-foreground">
                                            {t(
                                                'kpi.group_lesson',
                                                'Guruh / Darslar',
                                            )}
                                            :
                                        </span>
                                        <div className="mt-0.5 text-xs font-medium">
                                            {instructor.groups_count}{' '}
                                            {t('kpi.groups_count', 'guruh')} /{' '}
                                            {instructor.total_drivings}{' '}
                                            {t('kpi.drivings_count', 'dars')}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-muted-foreground">
                                            {t(
                                                'kpi.average_rating',
                                                "O'rtacha baho",
                                            )}
                                            :
                                        </span>
                                        <div className="mt-0.5 flex items-center gap-1 text-xs font-medium">
                                            <span>
                                                {instructor.average_rating}
                                            </span>
                                            <span className="text-yellow-500">
                                                ⭐
                                            </span>
                                            <span className="text-muted-foreground">
                                                ({instructor.total_reviews})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t pt-2 text-xs">
                                    <span className="text-muted-foreground">
                                        {t('kpi.status', 'Holat')}:
                                    </span>
                                    {instructor.needs_attention ? (
                                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                            {t(
                                                'kpi.warning_status',
                                                'Xavotirli',
                                            )}{' '}
                                            ({instructor.negative_tags_count}{' '}
                                            {t('kpi.complaints_count', 'ta')})
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            {t('kpi.excellent_status', "A'lo")}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
