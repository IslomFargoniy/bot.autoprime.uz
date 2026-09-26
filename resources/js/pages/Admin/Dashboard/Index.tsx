import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Users, Star, CalendarDays, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

import { Branch, SharedData } from '@/types/auth';
import { usePage } from '@inertiajs/react';

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

export default function DashboardIndex({ metrics, chartData, branches = [], filters = {} }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth?.user?.role === 'superadmin' || auth?.user?.id === 1;

    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query: any = {};
        if (from) query.from = from;
        if (to) query.to = to;

        router.get('/admin/dashboard', query, { preserveState: true, replace: true });
    };

    return (
        <div className="p-4 md:p-6 space-y-5 md:space-y-6">
            <Head title={t('dashboard.title', 'Bosh sahifa')} />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold">{t('dashboard.title', 'Bosh sahifa')}</h1>
                <div className="w-full sm:w-auto">
                    <form onSubmit={handleSearch} className="grid grid-cols-[1fr_1fr_auto] sm:flex items-center gap-2 w-full sm:w-auto">
                        <DatePicker
                            placeholder={t('common.from', 'Dan')}
                            value={from}
                            onChange={(val) => setFrom(val)}
                            className="w-full sm:w-36"
                            title={t('common.from', 'Dan')}
                        />
                        <DatePicker
                            placeholder={t('common.to', 'Gacha')}
                            value={to}
                            onChange={(val) => setTo(val)}
                            className="w-full sm:w-36"
                            title={t('common.to', 'Gacha')}
                        />
                        <Button type="submit" size="icon" className="shrink-0" title={t('common.filter', 'Filtrlash')}>
                            <Search className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* Dashboard Metrics: 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-card border rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t('dashboard.total_students', 'Umumiy Talabalar')}</h3>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <span className="text-xl sm:text-3xl font-bold">{metrics.totalStudents}</span>
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t('dashboard.avg_kpi', "O'rtacha KPI (%)")}</h3>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                            <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <div className="text-xl sm:text-2xl font-bold">{metrics.todayKpi}%</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('dashboard.avg_kpi_desc', "Tanlangan davr uchun")}</p>
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t('dashboard.monthly_drivings', "Oylik Mashg'ulotlar")}</h3>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0">
                            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <span className="text-xl sm:text-3xl font-bold">{metrics.monthlyDrivingsCount}</span>
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-3.5 sm:p-5 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t('dashboard.completion_rate', 'Oylik Tugatish')}</h3>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-4">
                        <span className="text-xl sm:text-3xl font-bold">{metrics.completionRate}%</span>
                    </div>
                </div>
            </div>

            {/* Daily Drivings Chart */}
            <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold mb-4">{t('dashboard.daily_chart_title', "Shu oydagi kunlik mashg'ulotlar")}</h3>
                <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted/30" />
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
                                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                            <Bar dataKey="Tugagan" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name={t('status.completed', 'Tugagan')} />
                            <Bar dataKey="Rejada" stackId="a" fill="#f59e0b" name={t('status.scheduled', 'Rejada')} />
                            <Bar dataKey="Bekor_qilingan" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('status.cancelled', 'Bekor qilingan')} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
