import { useState } from 'react';
import TMALayout from '@/layouts/tma-layout';
import { useTranslation } from 'react-i18next';
import {
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    GraduationCap,
    HelpCircle,
    MapPin,
    QrCode,
    User,
    Video,
    XCircle,
    Play,
    Download,
    Phone,
    Car,
} from 'lucide-react';
import { Prava24Quiz } from '@/components/prava24-quiz';


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
        contract_type?: { name: string; category: string; min_theory_payment_percent: number };
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
    const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'lms' | 'driving' | 'tests'>('overview');
    const [scanStatus, setScanStatus] = useState<{ loading: boolean; message?: string; success?: boolean } | null>(null);
    const [manualToken, setManualToken] = useState('');
    const [showManualModal, setShowManualModal] = useState(false);

    const handleQrScan = () => {
        const tgWindow = window as any;
        if (typeof window !== 'undefined' && tgWindow.Telegram?.WebApp?.showScanQrPopup) {
            tgWindow.Telegram.WebApp.showScanQrPopup(
                { text: t('tma.scan_prompt', 'Doskadagi dars QR kodini skanerlang') },
                (scannedText: string) => {
                    if (scannedText) {
                        tgWindow.Telegram.WebApp.closeScanQrPopup();
                        sendScanToken(scannedText);
                        return true;
                    }
                    return false;
                }
            );
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
                    'Accept': 'application/json',
                    'X-Telegram-Init-Data': tgInitData,
                },
                body: JSON.stringify({
                    qr_token: token.trim(),
                    student_id: student?.id,
                    initData: tgInitData,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setScanStatus({ loading: false, success: true, message: data.message });
            } else {
                setScanStatus({ loading: false, success: false, message: data.message || t('tma.scan_error', 'QR kod tekshirishda xatolik yuz berdi.') });
            }
        } catch {
            setScanStatus({ loading: false, success: false, message: t('tma.network_error', 'Server bilan bog\'lanishda xatolik yuz berdi.') });
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

    return (
        <TMALayout title={t('tma.dashboard_title', 'O\'quvchi Kabineti')}>
            {/* Top Student Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                            {student?.full_name ? student.full_name.charAt(0) : <User className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                                {student?.full_name || t('tma.guest_student', 'Mehmon O\'quvchi')}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {group?.name ? `${group.name} (${group.category || 'B'})` : (student?.branch?.name || 'AutoPrime LMS')}
                            </p>
                        </div>
                    </div>
                    {contract && (
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getBadgeStyle(contract.payment_badge_color)}`}>
                            {contract.payment_percentage}%
                        </div>
                    )}
                </div>

                {/* Financial Summary Card */}
                {contract && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                            <span className="text-gray-500 dark:text-gray-400 block">{t('contracts.paid_amount', 'To\'langan')}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                                {Number(contract.paid_amount).toLocaleString('uz-UZ')} UZS
                            </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                            <span className="text-gray-500 dark:text-gray-400 block">{t('contracts.debt_amount', 'Qoldiq qarz')}</span>
                            <span className="font-bold text-red-500 text-sm mt-0.5 block">
                                {Number(contract.debt_amount).toLocaleString('uz-UZ')} UZS
                            </span>
                        </div>
                    </div>
                )}

                {/* Primary Action: QR Attendance */}
                <div className="mt-4">
                    <button
                        onClick={handleQrScan}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors text-sm"
                    >
                        <QrCode className="w-5 h-5" />
                        {t('tma.scan_attendance_button', 'Dinamik QR Davomatni Skanerlash')}
                    </button>
                </div>
            </div>

            {/* Scan Status Toast / Alert */}
            {scanStatus && (
                <div
                    className={`p-3.5 rounded-xl mb-4 text-xs flex items-center justify-between border ${
                        scanStatus.success
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {scanStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                        <span>{scanStatus.message}</span>
                    </div>
                    <button
                        onClick={() => setScanStatus(null)}
                        className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4 text-xs font-medium">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center ${
                        activeTab === 'overview'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_overview', 'Umumiy')}
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center ${
                        activeTab === 'schedule'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_schedule', 'Jadval')}
                </button>
                <button
                    onClick={() => setActiveTab('lms')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center ${
                        activeTab === 'lms'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_lms', 'LMS Darslar')}
                </button>
                <button
                    onClick={() => setActiveTab('driving')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center ${
                        activeTab === 'driving'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    {t('tma.tab_driving', 'Vajdeniya')}
                </button>
                <button
                    onClick={() => setActiveTab('tests')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center ${
                        activeTab === 'tests'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
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
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-xs space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {t('contracts.contract_number', 'Shartnoma')}: #{contract.contract_number}
                                </span>
                                <span className="text-gray-500">{contract.contract_type?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('contracts.modules', 'Modullar')}:</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {[
                                        contract.has_theory && t('contracts.has_theory', 'Nazariya'),
                                        contract.has_driving && t('contracts.has_driving', 'Amaliy'),
                                        contract.has_lms && 'LMS Video',
                                    ]
                                        .filter(Boolean)
                                        .join(' • ')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">{t('contracts.total_amount', 'Jami to\'lov')}:</span>
                                <span className="font-semibold">{Number(contract.total_amount).toLocaleString('uz-UZ')} UZS</span>
                            </div>
                        </div>
                    )}

                    {/* Recent Attendances */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                            {t('tma.recent_attendances', 'Oxirgi Davomatlar')}
                        </h3>
                        {attendances.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2 text-center">{t('tma.no_attendances', 'Hozircha davomat yozuvlari mavjud emas')}</p>
                        ) : (
                            <div className="space-y-2">
                                {attendances.map((att) => (
                                    <div key={att.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{att.date}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {att.is_manual ? t('attendance.manual', 'Qo\'lda belgilangan') : t('attendance.qr_scanned', 'QR skanerlangan')}
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
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            {group?.name || t('groups.title', 'Dars Jadvali')}
                        </h3>
                        {group ? (
                            <div className="space-y-3 text-xs">
                                <div className="flex items-start gap-2.5">
                                    <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-gray-500 block">{t('groups.time', 'Dars vaqti')}:</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {group.start_time || '09:00'} - {group.end_time || '11:00'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-gray-500 block">{t('groups.room', 'Auditoriya / Xona')}:</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {group.room || t('groups.main_room', 'Asosiy o\'quv zali')}
                                        </span>
                                    </div>
                                </div>
                                {group.teacher && (
                                    <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <GraduationCap className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-gray-500 block">{t('groups.teacher', 'O\'qituvchi')}:</span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200 block">{group.teacher.name}</span>
                                            {group.teacher.phone && (
                                                <a href={`tel:${group.teacher.phone}`} className="text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3" /> {group.teacher.phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 py-3 text-center">{t('groups.not_assigned', 'Siz hali guruhga biriktirilmagansiz.')}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: LMS Lessons */}
            {activeTab === 'lms' && (
                <div className="space-y-3">
                    {topics.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center text-xs text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
                            {t('lms.no_lessons_yet', 'Ushbu toifa bo\'yicha video darsliklar tez kunda yuklanadi.')}
                        </div>
                    ) : (
                        topics.map((topic, idx) => (
                            <div key={topic.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                                            {topic.order_number || idx + 1}
                                        </span>
                                        <div>
                                            <h4 className="font-semibold text-xs text-gray-900 dark:text-white">{topic.title}</h4>
                                            {topic.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{topic.description}</p>}
                                        </div>
                                    </div>
                                    {topic.duration_minutes && (
                                        <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {topic.duration_minutes}m
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
                                    {topic.video_url && (
                                        <a
                                            href={topic.video_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-blue-100"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            {t('lms.watch_video', 'Videoni ko\'rish')}
                                        </a>
                                    )}
                                    {topic.lesson_materials && topic.lesson_materials.length > 0 && (
                                        <a
                                            href={topic.lesson_materials[0].file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-gray-200"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            {t('lms.download_pdf', 'PDF Material')}
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
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center text-xs text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
                            {t('drivings.no_drivings_yet', 'Hozircha amaliy haydash mashg\'ulotlari rejalashtirilmagan.')}
                        </div>
                    ) : (
                        drivings.map((drv) => (
                            <div key={drv.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Car className="w-4 h-4 text-blue-600" />
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {new Date(drv.start_time).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            drv.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : drv.status === 'scheduled'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {drv.status === 'completed' ? t('drivings.status_completed', 'O\'tildi') : t('drivings.status_scheduled', 'Rejalashtirilgan')}
                                    </span>
                                </div>
                                {drv.instructor && (
                                    <div className="text-gray-500">
                                        👨‍🏫 {drv.instructor.name} {drv.vehicle ? `(${drv.vehicle.model} - ${drv.vehicle.plate_number})` : ''}
                                    </div>
                                )}
                                {drv.autodrome && (
                                    <div className="text-gray-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {drv.autodrome.name}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab: Tests (Prava24) */}
            {activeTab === 'tests' && (
                <div className="space-y-4">
                    <Prava24Quiz studentId={student?.id} />
                </div>
            )}

            {/* Manual QR Input Modal (Fallback for desktop/regular browser) */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-xl border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                            {t('tma.manual_scan_title', 'QR Kod Skaneri (Veb Rejim)')}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            {t('tma.manual_scan_desc', 'Doskadagi dars sessiyasi QR kodi tokenini kiriting yoki nusxalang:')}
                        </p>
                        <input
                            type="text"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder="SESSION-..."
                            className="w-full px-3 py-2 text-xs border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowManualModal(false)}
                                className="px-3 py-2 text-xs rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
