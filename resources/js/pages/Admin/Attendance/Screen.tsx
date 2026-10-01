import { Head, router } from '@inertiajs/react';
import { Users, CheckCircle2, StopCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

interface StudentAttendance {
    id: number;
    scanned_at?: string;
    student?: { id: number; full_name: string };
}

interface ScreenProps {
    session: {
        id: number;
        status: string;
        started_at: string;
        group?: { name: string; category: string };
        teacher?: { name: string };
        topic?: { title: string };
    };
    qrToken: string;
    studentsCount: number;
    attendances: StudentAttendance[];
}

export default function AttendanceScreen({
    session,
    qrToken: initialQrToken,
    studentsCount,
    attendances: initialAttendances,
}: ScreenProps) {
    const { t } = useTranslation();
    const [qrToken, setQrToken] = useState(initialQrToken);
    const [attendances, setAttendances] = useState<StudentAttendance[]>(
        initialAttendances || [],
    );
    const [countdown, setCountdown] = useState(15);

    // Dynamic rotation polling every 15s
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(
                    `/admin/attendance/session/${session.id}/qr`,
                );

                if (res.ok) {
                    const data = await res.json();
                    setQrToken(data.qrToken);

                    if (data.attendances) {
                        setAttendances(data.attendances);
                    }

                    setCountdown(15);
                }
            } catch (err) {
                console.error('Failed to rotate QR token:', err);
            }
        }, 15000);

        const timer = setInterval(() => {
            setCountdown((prev) => (prev > 1 ? prev - 1 : 15));
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [session.id]);

    const handleFinish = () => {
        if (
            confirm(
                t(
                    'attendance.confirm_finish',
                    'Dars sessiyasini yakunlamoqchimisiz?',
                ),
            )
        ) {
            router.post(`/admin/attendance/session/${session.id}/finish`);
        }
    };

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(qrToken)}`;

    return (
        <div className="flex min-h-screen flex-col justify-between bg-slate-950 p-8 font-sans text-white">
            <Head title={`QR Davomat: ${session.group?.name || 'Dars'}`} />

            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                    <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-blue-400 uppercase">
                        {session.group?.category || 'B'} TOIFA •{' '}
                        {session.group?.name}
                    </span>
                    <h1 className="mt-2 text-3xl font-extrabold text-white">
                        {session.topic?.title ||
                            t(
                                'attendance.theory_lesson',
                                "Nazariy Dars Mashg'uloti",
                            )}
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                        👨‍🏫 {session.teacher?.name} • AutoPrime LMS
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="block text-xs text-slate-400">
                            {t('attendance.present_count', 'Qatnashuvchilar')}
                        </span>
                        <span className="text-3xl font-black text-emerald-400">
                            {attendances.length}{' '}
                            <span className="text-base font-normal text-slate-500">
                                / {studentsCount}
                            </span>
                        </span>
                    </div>

                    <Button
                        onClick={handleFinish}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                    >
                        <StopCircle className="mr-2 h-4 w-4" />
                        {t('attendance.finish_session', 'Darsni Tugatish')}
                    </Button>
                </div>
            </div>

            {/* Middle Main Section: Dynamic QR Display & Live Log */}
            <div className="my-auto flex flex-col items-center justify-center gap-12 lg:flex-row">
                {/* QR Container */}
                <div className="flex flex-col items-center">
                    <div className="rounded-3xl border-4 border-blue-500/30 bg-white p-6 shadow-2xl shadow-blue-500/10">
                        <img
                            src={qrImageUrl}
                            alt="Dynamic QR Code"
                            className="h-80 w-80 rounded-xl object-contain"
                        />
                    </div>

                    {/* Rotation Progress & Indicator */}
                    <div className="mt-6 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                            <span>
                                {t(
                                    'attendance.rotating_in',
                                    'Kodni yangilanishi',
                                )}
                                :{' '}
                                <strong className="font-mono text-base text-blue-400">
                                    {countdown}s
                                </strong>
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {t(
                                'attendance.scan_instruction',
                                'Telegram Mini App orqali kamerani QR kodga qarating',
                            )}
                        </p>
                    </div>
                </div>

                {/* Real-time Students List */}
                <div className="flex max-h-[460px] w-full flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm lg:w-96">
                    <h3 className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3 text-sm font-bold tracking-wider text-slate-400 uppercase">
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-emerald-400" />
                            {t(
                                'attendance.scanned_students',
                                'Kelgan Talabalar',
                            )}
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                            {attendances.length} ta
                        </span>
                    </h3>

                    <div className="flex-1 space-y-2.5 overflow-y-auto pr-2">
                        {attendances.length === 0 ? (
                            <div className="py-16 text-center text-xs text-slate-500">
                                {t(
                                    'attendance.waiting_for_scans',
                                    "Hali hech kim skanerlamadi. QR kodni o'quvchilarga ko'rsating.",
                                )}
                            </div>
                        ) : (
                            attendances.map((att, idx) => (
                                <div
                                    key={att.id}
                                    className="flex animate-in items-center justify-between rounded-xl border border-slate-700/40 bg-slate-800/60 p-2.5 text-xs fade-in"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-slate-200">
                                            {att.student?.full_name}
                                        </span>
                                    </div>
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Bar Info */}
            <div className="border-t border-slate-800/80 pt-4 text-center text-xs text-slate-500">
                AutoPrime LMS &bull; Dinamik HMAC QR Texnologiyasi &bull;{' '}
                {formatDate(new Date())}
            </div>
        </div>
    );
}
