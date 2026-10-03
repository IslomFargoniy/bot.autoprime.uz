import { Head, router } from '@inertiajs/react';
import { Users, Star, CalendarDays, CheckCircle2, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';

import type { Branch } from '@/types/auth';

interface PageProps {
    metrics: {
        totalStudents: number;
        todayKpi: number;
        monthlyDrivingsCount: number;
        completionRate: number;
    };
    chartData: any[];
    branches?: Branch[];
    filters?: {
        from?: string;
        to?: string;
        branch_id?: string;
    };
}

export default function DashboardIndex({
    metrics,
    chartData,
    filters = {},
}: PageProps) {
    const { t } = useTranslation();

    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query: any = {};

        if (from) {
            query.from = from;
        }

        if (to) {
            query.to = to;
        }

        router.get('/admin/dashboard', query, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <div className="space-y-5 p-4 md:space-y-6 md:p-6">
            <Head title={t('dashboard.title', 'Bosh sahifa')} />

            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <h1 className="text-xl font-bold sm:text-2xl">
                    {t('dashboard.title', 'Bosh sahifa')}
                </h1>
                <div className="w-full sm:w-auto">
                    <form
                        onSubmit={handleSearch}
                        className="grid w-full grid-cols-[1fr_1fr_auto] items-center gap-2 sm:flex sm:w-auto"
                    >
                        <DatePicker
                            value={from}
                            onChange={(val) => setFrom(val)}
                            className="w-full sm:w-36"
                        />
                        <DatePicker
                            value={to}
                            onChange={(val) => setTo(val)}
                            className="w-full sm:w-36"
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            title={t('common.filter', 'Filtrlash')}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* Dashboard Metrics: 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-2xs sm:p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
                            {t('dashboard.total_students', 'Umumiy Talabalar')}
                        </h3>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 sm:h-10 sm:w-10 dark:bg-blue-900/30 dark:text-blue-400">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <span className="text-xl font-bold sm:text-3xl">
                            {metrics.totalStudents}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-2xs sm:p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
                            {t('dashboard.avg_kpi', "O'rtacha KPI (%)")}
                        </h3>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 sm:h-10 sm:w-10 dark:bg-amber-900/30 dark:text-amber-400">
                            <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <div className="text-xl font-bold sm:text-2xl">
                            {metrics.todayKpi}%
                        </div>
                        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                            {t(
                                'dashboard.avg_kpi_desc',
                                'Tanlangan davr uchun',
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-2xs sm:p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
                            {t(
                                'dashboard.monthly_drivings',
                                "Oylik Mashg'ulotlar",
                            )}
                        </h3>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 sm:h-10 sm:w-10 dark:bg-indigo-900/30 dark:text-indigo-400">
                            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <span className="text-xl font-bold sm:text-3xl">
                            {metrics.monthlyDrivingsCount}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-2xs sm:p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
                            {t('dashboard.completion_rate', 'Oylik Tugatish')}
                        </h3>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 sm:h-10 sm:w-10 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <span className="text-xl font-bold sm:text-3xl">
                            {metrics.completionRate}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Daily Drivings Chart */}
            <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
                <h3 className="mb-4 text-base font-semibold sm:text-lg">
                    {t(
                        'dashboard.daily_chart_title',
                        "Shu oydagi kunlik mashg'ulotlar",
                    )}
                </h3>
                <div className="h-[250px] w-full sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: -20,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="currentColor"
                                className="text-muted/30"
                            />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                className="text-muted-foreground"
                                dy={8}
                                minTickGap={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'currentColor' }}
                                className="text-muted-foreground"
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--card)',
                                    color: 'var(--foreground)',
                                }}
                            />
                            <Legend
                                wrapperStyle={{
                                    paddingTop: '16px',
                                    fontSize: '12px',
                                }}
                            />
                            <Bar
                                dataKey="Tugagan"
                                stackId="a"
                                fill="#10b981"
                                radius={[0, 0, 4, 4]}
                                name={t('status.completed', 'Tugagan')}
                            />
                            <Bar
                                dataKey="Rejada"
                                stackId="a"
                                fill="#f59e0b"
                                name={t('status.scheduled', 'Rejada')}
                            />
                            <Bar
                                dataKey="Bekor_qilingan"
                                stackId="a"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                name={t('status.cancelled', 'Bekor qilingan')}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
