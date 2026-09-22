import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TMALayout from '@/layouts/tma-layout';

interface Group {
    id: number;
    name: string;
    students_count?: number;
}

interface Student {
    id: number;
    full_name: string;
    phone?: string;
}

interface Autodrome {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
}

interface Driving {
    id: number;
    start_time: string;
    end_time: string;
    status: string;
    student?: Student;
    group?: Group;
    autodrome_id?: number | null;
    autodrome?: Autodrome;
}

interface PageProps {
    groups: Group[];
    upcomingDrivings: Driving[];
}

export default function InstructorDashboard({ groups = [], upcomingDrivings = [] }: PageProps) {
    const { t } = useTranslation();
    const page = usePage();
    const errors = (page.props.errors || {}) as Record<string, string>;
    const [finishingId, setFinishingId] = useState<number | null>(null);
    const [locationError, setLocationError] = useState('');

    const handleFinish = (driving: Driving) => {
        if (!confirm(t('instructor_panel.confirm_finish', "Haqiqatdan ham bu mashg'ulotni yakunlamoqchimisiz?"))) return;
        
        setFinishingId(driving.id);
        setLocationError('');

        if (driving.autodrome || driving.autodrome_id) {
            if (!navigator.geolocation) {
                setLocationError(t('instructor_panel.geolocation_not_supported', "Qurilmangizda geolokatsiya qo'llab-quvvatlanmaydi."));
                setFinishingId(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    router.post(`/instructor/driving/${driving.id}/finish`, {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }, {
                        preserveScroll: true,
                        onFinish: () => setFinishingId(null)
                    });
                },
                (error) => {
                    setLocationError(t('instructor_panel.location_error', "Joylashuvni aniqlash imkonsiz: ") + error.message);
                    setFinishingId(null);
                },
                { enableHighAccuracy: true }
            );
        } else {
            router.post(`/instructor/driving/${driving.id}/finish`, {
                latitude: 0,
                longitude: 0,
            }, {
                preserveScroll: true,
                onFinish: () => setFinishingId(null)
            });
        }
    };

    return (
        <TMALayout title={t('instructor_panel.title', 'Instruktor Paneli')}>
            <div className="space-y-6">
                
                {/* Statistics / Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center">
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{groups.length}</span>
                        <span className="text-xs text-gray-500 mt-1">{t('instructor_panel.active_groups', 'Faol Guruhlar')}</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center">
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">{upcomingDrivings.length}</span>
                        <span className="text-xs text-gray-500 mt-1">{t('instructor_panel.upcoming_drivings', 'Kelgusi Darslar')}</span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Link
                        href="/instructor/driving/create"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-center transition-colors shadow-sm"
                    >
                        {t('instructor_panel.new_driving_btn', '+ Yangi mashg\'ulot belgilash')}
                    </Link>
                </div>

                {/* Upcoming Drivings */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('instructor_panel.upcoming_title', 'Kelgusi Mashg\'ulotlar')}</h2>
                    
                    {upcomingDrivings.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl text-center text-gray-500 border border-gray-100 dark:border-gray-700 shadow-sm">
                            {t('instructor_panel.no_upcoming', 'Rejalashtirilgan mashg\'ulotlar yo\'q')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {locationError && (
                                <div className="p-3 mb-2 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                                    {locationError}
                                </div>
                            )}
                            {errors && errors.location && (
                                <div className="p-3 mb-2 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                                    {errors.location}
                                </div>
                            )}
                            {errors && errors.general && (
                                <div className="p-3 mb-2 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                                    {errors.general}
                                </div>
                            )}
                            {upcomingDrivings.map((driving) => (
                                <div key={driving.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {driving.student?.full_name || t('instructor_panel.unknown_student', 'Noma\'lum o\'quvchi')} {driving.student?.phone ? `(${driving.student.phone})` : ''}
                                        </h3>
                                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium rounded-lg">
                                            {driving.group?.name || t('students.no_group', 'Guruhsiz')}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span>
                                                {new Date(driving.start_time).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {new Date(driving.end_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {driving.autodrome && (
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span>{t('drivings.autodrome', 'Avtodrom')}: {driving.autodrome.name}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                        <button 
                                            onClick={() => handleFinish(driving)}
                                            disabled={finishingId === driving.id}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {finishingId === driving.id ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                    {t('common.saving', 'Joylashuv tekshirilmoqda...')}
                                                </>
                                            ) : (
                                                t('status.completed', 'Yakunlash')
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </TMALayout>
    );
}
