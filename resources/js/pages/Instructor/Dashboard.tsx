import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TMALayout from '@/layouts/tma-layout';
import { formatDateTime } from '@/lib/utils';

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

export default function InstructorDashboard({
    groups = [],
    upcomingDrivings = [],
}: PageProps) {
    const { t } = useTranslation();
    const page = usePage();
    const errors = (page.props.errors || {}) as Record<string, string>;
    const [finishingId, setFinishingId] = useState<number | null>(null);
    const [locationError, setLocationError] = useState('');

    const handleFinish = (driving: Driving) => {
        if (
            !confirm(
                t(
                    'instructor_panel.confirm_finish',
                    "Haqiqatdan ham bu mashg'ulotni yakunlamoqchimisiz?",
                ),
            )
        ) {
            return;
        }

        setFinishingId(driving.id);
        setLocationError('');

        if (driving.autodrome || driving.autodrome_id) {
            if (!navigator.geolocation) {
                setLocationError(
                    t(
                        'instructor_panel.geolocation_not_supported',
                        "Qurilmangizda geolokatsiya qo'llab-quvvatlanmaydi.",
                    ),
                );
                setFinishingId(null);

                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    router.post(
                        `/instructor/driving/${driving.id}/finish`,
                        {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        },
                        {
                            preserveScroll: true,
                            onFinish: () => setFinishingId(null),
                        },
                    );
                },
                (error) => {
                    setLocationError(
                        t(
                            'instructor_panel.location_error',
                            'Joylashuvni aniqlash imkonsiz: ',
                        ) + error.message,
                    );
                    setFinishingId(null);
                },
                { enableHighAccuracy: true },
            );
        } else {
            router.post(
                `/instructor/driving/${driving.id}/finish`,
                {
                    latitude: 0,
                    longitude: 0,
                },
                {
                    preserveScroll: true,
                    onFinish: () => setFinishingId(null),
                },
            );
        }
    };

    return (
        <TMALayout title={t('instructor_panel.title', 'Instruktor Paneli')}>
            <div className="space-y-6">
                {/* Statistics / Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {groups.length}
                        </span>
                        <span className="mt-1 text-xs text-gray-500">
                            {t(
                                'instructor_panel.active_groups',
                                'Faol Guruhlar',
                            )}
                        </span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {upcomingDrivings.length}
                        </span>
                        <span className="mt-1 text-xs text-gray-500">
                            {t(
                                'instructor_panel.upcoming_drivings',
                                'Kelgusi Darslar',
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Link
                        href="/instructor/driving/create"
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        {t(
                            'instructor_panel.new_driving_btn',
                            "+ Yangi mashg'ulot belgilash",
                        )}
                    </Link>
                </div>

                {/* Upcoming Drivings */}
                <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {t(
                            'instructor_panel.upcoming_title',
                            "Kelgusi Mashg'ulotlar",
                        )}
                    </h2>

                    {upcomingDrivings.length === 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            {t(
                                'instructor_panel.no_upcoming',
                                "Rejalashtirilgan mashg'ulotlar yo'q",
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {locationError && (
                                <div className="mb-2 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    {locationError}
                                </div>
                            )}
                            {errors && errors.location && (
                                <div className="mb-2 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    {errors.location}
                                </div>
                            )}
                            {errors && errors.general && (
                                <div className="mb-2 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    {errors.general}
                                </div>
                            )}
                            {upcomingDrivings.map((driving) => (
                                <div
                                    key={driving.id}
                                    className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {driving.student?.full_name ||
                                                t(
                                                    'instructor_panel.unknown_student',
                                                    "Noma'lum o'quvchi",
                                                )}{' '}
                                            {driving.student?.phone
                                                ? `(${driving.student.phone})`
                                                : ''}
                                        </h3>
                                        <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {driving.group?.name ||
                                                t(
                                                    'students.no_group',
                                                    'Guruhsiz',
                                                )}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-1.5">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span className="font-mono">
                                                {formatDateTime(
                                                    driving.start_time,
                                                )}
                                            </span>
                                        </div>
                                        {driving.autodrome && (
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                </svg>
                                                <span>
                                                    {t(
                                                        'drivings.autodrome',
                                                        'Avtodrom',
                                                    )}
                                                    : {driving.autodrome.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
                                        <button
                                            onClick={() =>
                                                handleFinish(driving)
                                            }
                                            disabled={
                                                finishingId === driving.id
                                            }
                                            className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                                        >
                                            {finishingId === driving.id ? (
                                                <>
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                                                    {t(
                                                        'common.saving',
                                                        'Joylashuv tekshirilmoqda...',
                                                    )}
                                                </>
                                            ) : (
                                                t(
                                                    'status.completed',
                                                    'Yakunlash',
                                                )
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
