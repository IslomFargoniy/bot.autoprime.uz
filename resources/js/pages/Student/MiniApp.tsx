import { router } from '@inertiajs/react';
import {
    Calendar,
    CheckCircle2,
    Clock,
    GraduationCap,
    MapPin,
    QrCode,
    User,
    XCircle,
    Play,
    Download,
    Phone,
    Car,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TestQuiz } from '@/components/test-quiz';
import { telegramInitDataHeaders } from '@/hooks/use-telegram';
import TMALayout from '@/layouts/tma-layout';
import { formatPhone } from '@/lib/input-masks';
import {
    formatDate,
    formatDateTime,
    formatMoney,
    formatTime,
} from '@/lib/utils';

interface StudentProps {
    student: {
        id: number;
        full_name: string;
        phone: string;
        photo_url?: string;
        branch?: { name: string };
    } | null;
    contract: {
        id: number;
        contract_number: string;
        total_amount: number | string;
        paid_amount: number | string;
        debt_amount: number | string;
        payment_percentage: number;
        payment_badge_color: 'white' | 'red' | 'yellow' | 'green';
        has_theory: boolean;
        has_driving: boolean;
        has_lms: boolean;
        contract_type?: {
            name: string;
            category: string;
            min_theory_payment_percent: number;
        };
    } | null;
    group: {
        id: number;
        name: string;
        category: string;
        days_of_week?: string[] | string;
        start_time?: string;
        end_time?: string;
        room?: string;
        teacher?: { id: number; name: string; phone: string } | null;
    } | null;
    topics: Array<{
        id: number;
        title: string;
        description?: string;
        video_url?: string;
        duration_minutes?: number;
        order_number?: number;
        lesson_materials?: Array<{
            id: number;
            title: string;
            file_url: string;
            file_type: string;
        }>;
    }>;
    drivings: Array<{
        id: number;
        start_time: string;
        end_time: string;
        status: string;
        instructor?: { name: string; phone?: string; car_name?: string };
        vehicle?: { plate_number: string; model: string };
        autodrome?: { name: string };
    }>;
    attendances: Array<{
        id: number;
        date: string;
        status: string;
        is_manual: boolean;
        session?: { id: number; started_at: string };
    }>;
}

export default function MiniApp({
    student,
    contract,
    group,
    topics = [],
    drivings = [],
    attendances = [],
}: StudentProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<
        'overview' | 'schedule' | 'lms' | 'driving' | 'tests'
    >('overview');
    const [scanStatus, setScanStatus] = useState<{
        loading: boolean;
        message?: string;
        success?: boolean;
    } | null>(null);
    const [manualToken, setManualToken] = useState('');
    const [showManualModal, setShowManualModal] = useState(false);
    const hasRequestedIdentity = useRef(false);

    // The bot opens /mini-app without identity; initData only exists client-side,
    // so reload once with the signed header to let the server recognise the student.
    useEffect(() => {
        const headers = telegramInitDataHeaders();

        if (
            student ||
            hasRequestedIdentity.current ||
            !headers['X-Telegram-Init-Data']
        ) {
            return;
        }

        hasRequestedIdentity.current = true;
        router.reload({ headers });
    }, [student]);

    const handleQrScan = () => {
        const tgWindow = window as any;
        const tg =
            typeof window !== 'undefined' ? tgWindow.Telegram?.WebApp : null;
        const isQrSupported = Boolean(
            tg &&
            typeof tg.isVersionAtLeast === 'function' &&
            tg.isVersionAtLeast('6.4') &&
            typeof tg.showScanQrPopup === 'function',
        );

        if (isQrSupported) {
            try {
                tg.showScanQrPopup(
                    {
                        text: t(
                            'tma.scan_prompt',
                            'Doskadagi dars QR kodini skanerlang',
                        ),
                    },
                    (scannedText: string) => {
                        if (scannedText) {
                            try {
                                tg.closeScanQrPopup();
                            } catch {
                                // ignore
                            }

                            sendScanToken(scannedText);

                            return true;
                        }

                        return false;
                    },
                );

                return;
            } catch {
                setShowManualModal(true);
            }
        } else {
            setShowManualModal(true);
        }
    };

    const sendScanToken = async (token: string) => {
        setScanStatus({ loading: true });

        try {
            const tgInitData = (window as any).Telegram?.WebApp?.initData || '';
            const res = await fetch('/api/attendance/scan-qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Telegram-Init-Data': tgInitData,
                },
                body: JSON.stringify({
                    qr_token: token.trim(),
                    initData: tgInitData,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setScanStatus({
                    loading: false,
                    success: true,
                    message: data.message,
                });
            } else {
                setScanStatus({
                    loading: false,
                    success: false,
                    message:
                        data.message ||
                        t(
                            'tma.scan_error',
                            'QR kod tekshirishda xatolik yuz berdi.',
                        ),
                });
            }
        } catch {
            setScanStatus({
                loading: false,
                success: false,
                message: t(
                    'tma.network_error',
                    "Server bilan bog'lanishda xatolik yuz berdi.",
                ),
            });
        }
    };

    const getBadgeStyle = (color?: string) => {
        switch (color) {
            case 'green':
                return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
            case 'yellow':
                return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
            case 'red':
                return 'bg-red-500/10 text-red-600 border border-red-500/20';
            default:
                return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
        }
    };

    if (!student) {
        return (
            <TMALayout title={t('tma.dashboard_title', "O'quvchi Kabineti")}>
                <div className="mt-4 flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white px-4 py-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-500/5 dark:bg-blue-900/30 dark:text-blue-400">
                        <GraduationCap className="h-8 w-8" />
                    </div>
                    <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                        {t(
                            'tma.auth_required_title',
                            "Faqat O'quvchilar Uchun",
                        )}
                    </h2>
                    <p className="mb-6 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {t(
                            'tma.auth_required_desc',
                            "Ushbu tizim faqat AutoPrime avtomaktabi o'quvchilari uchun mo'ljallangan. Iltimos, Telegram boti orqali shaxsiy kabinetingizga kiring.",
                        )}
                    </p>
                    <a
                        href="https://t.me/autoprimeuz_bot"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
                    >
                        <Phone className="h-4 w-4" />
                        {t('tma.open_telegram_bot', 'Telegram Botni Ochish')}
                    </a>
                </div>
            </TMALayout>
        );
    }

    return (
        <TMALayout title={t('tma.dashboard_title', "O'quvchi Kabineti")}>
            {/* Top Student Header Card */}
            <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            {student?.full_name ? (
                                student.full_name.charAt(0)
                            ) : (
                                <User className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-base leading-tight font-bold text-gray-900 dark:text-white">
                                {student?.full_name ||
                                    t('tma.guest_student', "Mehmon O'quvchi")}
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {group?.name
                                    ? `${group.name} (${group.category || 'B'})`
                                    : student?.branch?.name || 'AutoPrime LMS'}
                            </p>
                        </div>
                    </div>
                    {contract && (
                        <div
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${getBadgeStyle(contract.payment_badge_color)}`}
                        >
                            {contract.payment_percentage}%
                        </div>
                    )}
                </div>

                {/* Financial Summary Card */}
                {contract && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs dark:border-gray-700/60">
                        <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-gray-700/40">
                            <span className="block text-gray-500 dark:text-gray-400">
                                {t('contracts.paid_amount', "To'langan")}
                            </span>
                            <span className="mt-0.5 block text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(contract.paid_amount)}
                            </span>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-gray-700/40">
                            <span className="block text-gray-500 dark:text-gray-400">
                                {t('contracts.debt_amount', 'Qoldiq qarz')}
                            </span>
                            <span className="mt-0.5 block text-sm font-bold text-red-500">
                                {formatMoney(contract.debt_amount)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Primary Action: QR Attendance */}
                <div className="mt-4">
                    <button
                        onClick={handleQrScan}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
                    >
                        <QrCode className="h-5 w-5" />
                        {t(
                            'tma.scan_attendance_button',
                            'Dinamik QR Davomatni Skanerlash',
                        )}
                    </button>
                </div>
            </div>

            {/* Scan Status Toast / Alert */}
            {scanStatus && (
                <div
                    className={`mb-4 flex items-center justify-between rounded-xl border p-3.5 text-xs ${
                        scanStatus.success
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {scanStatus.success ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : (
                            <XCircle className="h-4 w-4 shrink-0" />
                        )}
                        <span>{scanStatus.message}</span>
                    </div>
                    <button
                        onClick={() => setScanStatus(null)}
                        className="ml-2 text-xs font-bold opacity-70 hover:opacity-100"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="mb-4 flex rounded-xl bg-gray-100 p-1 text-xs font-medium dark:bg-gray-800">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 rounded-lg py-2 text-center transition-all ${
                        activeTab === 'overview'
                            ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_overview', 'Umumiy')}
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`flex-1 rounded-lg py-2 text-center transition-all ${
                        activeTab === 'schedule'
                            ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_schedule', 'Jadval')}
                </button>
                <button
                    onClick={() => setActiveTab('lms')}
                    className={`flex-1 rounded-lg py-2 text-center transition-all ${
                        activeTab === 'lms'
                            ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_lms', 'LMS Darslar')}
                </button>
                <button
                    onClick={() => setActiveTab('driving')}
                    className={`flex-1 rounded-lg py-2 text-center transition-all ${
                        activeTab === 'driving'
                            ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_driving', 'Vajdeniya')}
                </button>
                <button
                    onClick={() => setActiveTab('tests')}
                    className={`flex-1 rounded-lg py-2 text-center transition-all ${
                        activeTab === 'tests'
                            ? 'bg-white font-bold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_tests', 'Testlar')}
                </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    {/* Contract Details */}
                    {contract && (
                        <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-4 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {t(
                                        'contracts.contract_number',
                                        'Shartnoma',
                                    )}
                                    : #{contract.contract_number}
                                </span>
                                <span className="text-gray-500">
                                    {contract.contract_type?.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    {t('contracts.modules', 'Modullar')}:
                                </span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {[
                                        contract.has_theory &&
                                            t(
                                                'contracts.has_theory',
                                                'Nazariya',
                                            ),
                                        contract.has_driving &&
                                            t(
                                                'contracts.has_driving',
                                                'Amaliy',
                                            ),
                                        contract.has_lms && 'LMS Video',
                                    ]
                                        .filter(Boolean)
                                        .join(' • ')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    {t('contracts.total_amount', "Jami to'lov")}
                                    :
                                </span>
                                <span className="font-semibold">
                                    {formatMoney(contract.total_amount)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Recent Attendances */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                            {t('tma.recent_attendances', 'Oxirgi Davomatlar')}
                        </h3>
                        {attendances.length === 0 ? (
                            <p className="py-2 text-center text-xs text-gray-400">
                                {t(
                                    'tma.no_attendances',
                                    'Hozircha davomat yozuvlari mavjud emas',
                                )}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {attendances.map((att) => (
                                    <div
                                        key={att.id}
                                        className="flex items-center justify-between border-b border-gray-50 py-1.5 text-xs last:border-0 dark:border-gray-700/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                                                {formatDate(att.date)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {att.is_manual
                                                ? t(
                                                      'attendance.manual',
                                                      "Qo'lda belgilangan",
                                                  )
                                                : t(
                                                      'attendance.qr_scanned',
                                                      'QR skanerlangan',
                                                  )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Schedule */}
            {activeTab === 'schedule' && (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            {group?.name || t('groups.title', 'Dars Jadvali')}
                        </h3>
                        {group ? (
                            <div className="space-y-3 text-xs">
                                <div className="flex items-start gap-2.5">
                                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                    <div>
                                        <span className="block text-gray-500">
                                            {t('groups.time', 'Dars vaqti')}:
                                        </span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {formatTime(
                                                group.start_time || '09:00',
                                            )}{' '}
                                            -{' '}
                                            {formatTime(
                                                group.end_time || '11:00',
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                    <div>
                                        <span className="block text-gray-500">
                                            {t(
                                                'groups.room',
                                                'Auditoriya / Xona',
                                            )}
                                            :
                                        </span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {group.room ||
                                                t(
                                                    'groups.main_room',
                                                    "Asosiy o'quv zali",
                                                )}
                                        </span>
                                    </div>
                                </div>
                                {group.teacher && (
                                    <div className="flex items-start gap-2.5 border-t border-gray-100 pt-2 dark:border-gray-700">
                                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                        <div>
                                            <span className="block text-gray-500">
                                                {t(
                                                    'groups.teacher',
                                                    "O'qituvchi",
                                                )}
                                                :
                                            </span>
                                            <span className="block font-semibold text-gray-800 dark:text-gray-200">
                                                {group.teacher.name}
                                            </span>
                                            {group.teacher.phone && (
                                                <a
                                                    href={`tel:${group.teacher.phone}`}
                                                    className="mt-0.5 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
                                                >
                                                    <Phone className="h-3 w-3" />{' '}
                                                    {formatPhone(
                                                        group.teacher.phone,
                                                    )}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="py-3 text-center text-xs text-gray-400">
                                {t(
                                    'groups.not_assigned',
                                    'Siz hali guruhga biriktirilmagansiz.',
                                )}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: LMS Lessons */}
            {activeTab === 'lms' && (
                <div className="space-y-3">
                    {topics.length === 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            {t(
                                'lms.no_lessons_yet',
                                "Ushbu toifa bo'yicha video darsliklar tez kunda yuklanadi.",
                            )}
                        </div>
                    ) : (
                        topics.map((topic, idx) => (
                            <div
                                key={topic.id}
                                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            {topic.order_number || idx + 1}
                                        </span>
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                                                {topic.title}
                                            </h4>
                                            {topic.description && (
                                                <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {topic.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {topic.duration_minutes && (
                                        <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                                            <Clock className="h-3 w-3" />{' '}
                                            {topic.duration_minutes}m
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-700/60">
                                    {topic.video_url && (
                                        <a
                                            href={topic.video_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                                        >
                                            <Play className="h-3.5 w-3.5 fill-current" />
                                            {t(
                                                'lms.watch_video',
                                                "Videoni ko'rish",
                                            )}
                                        </a>
                                    )}
                                    {topic.lesson_materials &&
                                        topic.lesson_materials.length > 0 && (
                                            <a
                                                href={
                                                    topic.lesson_materials[0]
                                                        .file_url
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                {t(
                                                    'lms.download_pdf',
                                                    'PDF Material',
                                                )}
                                            </a>
                                        )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab: Driving (Vajdeniya) */}
            {activeTab === 'driving' && (
                <div className="space-y-3">
                    {drivings.length === 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            {t(
                                'drivings.no_drivings_yet',
                                "Hozircha amaliy haydash mashg'ulotlari rejalashtirilmagan.",
                            )}
                        </div>
                    ) : (
                        drivings.map((drv) => (
                            <div
                                key={drv.id}
                                className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Car className="h-4 w-4 text-blue-600" />
                                        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                                            {formatDateTime(drv.start_time)}
                                        </span>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            drv.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : drv.status === 'scheduled'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {drv.status === 'completed'
                                            ? t(
                                                  'drivings.status_completed',
                                                  "O'tildi",
                                              )
                                            : t(
                                                  'drivings.status_scheduled',
                                                  'Rejalashtirilgan',
                                              )}
                                    </span>
                                </div>
                                {drv.instructor && (
                                    <div className="text-gray-500">
                                        👨‍🏫 {drv.instructor.name}{' '}
                                        {drv.vehicle
                                            ? `(${drv.vehicle.model} - ${drv.vehicle.plate_number})`
                                            : ''}
                                    </div>
                                )}
                                {drv.autodrome && (
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <MapPin className="h-3 w-3" />{' '}
                                        {drv.autodrome.name}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab: Tests */}
            {activeTab === 'tests' && (
                <div className="space-y-4">
                    <TestQuiz />
                </div>
            )}

            {/* Manual QR Input Modal (Fallback for desktop/regular browser) */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                            {t(
                                'tma.manual_scan_title',
                                'QR Kod Skaneri (Veb Rejim)',
                            )}
                        </h3>
                        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                            {t(
                                'tma.manual_scan_desc',
                                'Doskadagi dars sessiyasi QR kodi tokenini kiriting yoki nusxalang:',
                            )}
                        </p>
                        <input
                            type="text"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder="SESSION-..."
                            className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowManualModal(false)}
                                className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </button>
                            <button
                                onClick={() => {
                                    if (manualToken.trim()) {
                                        setShowManualModal(false);
                                        sendScanToken(manualToken);
                                    }
                                }}
                                disabled={!manualToken.trim()}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {t('tma.submit_scan', 'Yuborish')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </TMALayout>
    );
}
