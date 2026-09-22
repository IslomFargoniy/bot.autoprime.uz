import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { QrCode, Users, CheckCircle2, StopCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    const [attendances, setAttendances] = useState<StudentAttendance[]>(initialAttendances || []);
    const [countdown, setCountdown] = useState(15);

    // Dynamic rotation polling every 15s
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/admin/attendance/session/${session.id}/qr`);
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
        if (confirm(t('attendance.confirm_finish', 'Dars sessiyasini yakunlamoqchimisiz?'))) {
            router.post(`/admin/attendance/session/${session.id}/finish`);
        }
    };

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(qrToken)}`;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-8 font-sans">
            <Head title={`QR Davomat: ${session.group?.name || 'Dars'}`} />

            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 font-semibold text-xs tracking-wider uppercase border border-blue-500/30">
                        {session.group?.category || 'B'} TOIFA • {session.group?.name}
                    </span>
                    <h1 className="text-3xl font-extrabold mt-2 text-white">
                        {session.topic?.title || t('attendance.theory_lesson', 'Nazariy Dars Mashg\'uloti')}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        👨‍🏫 {session.teacher?.name} • AutoPrime LMS
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-slate-400 text-xs block">{t('attendance.present_count', 'Qatnashuvchilar')}</span>
                        <span className="text-3xl font-black text-emerald-400">
                            {attendances.length} <span className="text-slate-500 text-base font-normal">/ {studentsCount}</span>
                        </span>
                    </div>

                    <Button onClick={handleFinish} variant="destructive" className="bg-red-600 hover:bg-red-700">
                        <StopCircle className="w-4 h-4 mr-2" />
                        {t('attendance.finish_session', 'Darsni Tugatish')}
                    </Button>
                </div>
            </div>

            {/* Middle Main Section: Dynamic QR Display & Live Log */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 my-auto">
                {/* QR Container */}
                <div className="flex flex-col items-center">
                    <div className="p-6 bg-white rounded-3xl shadow-2xl shadow-blue-500/10 border-4 border-blue-500/30">
                        <img
                            src={qrImageUrl}
                            alt="Dynamic QR Code"
                            className="w-80 h-80 object-contain rounded-xl"
                        />
                    </div>

                    {/* Rotation Progress & Indicator */}
                    <div className="mt-6 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                            <span>
                                {t('attendance.rotating_in', 'Kodni yangilanishi')}: <strong className="text-blue-400 font-mono text-base">{countdown}s</strong>
                            </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">
                            {t('attendance.scan_instruction', 'Telegram Mini App orqali kamerani QR kodga qarating')}
                        </p>
                    </div>
                </div>

                {/* Real-time Students List */}
                <div className="w-full lg:w-96 bg-slate-900/80 backdrop-blur-sm rounded-3xl p-6 border border-slate-800 shadow-xl max-h-[460px] flex flex-col">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-400" />
                            {t('attendance.scanned_students', 'Kelgan Talabalar')}
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{attendances.length} ta</span>
                    </h3>

                    <div className="overflow-y-auto space-y-2.5 pr-2 flex-1">
                        {attendances.length === 0 ? (
                            <div className="text-center py-16 text-slate-500 text-xs">
                                {t('attendance.waiting_for_scans', 'Hali hech kim skanerlamadi. QR kodni o\'quvchilarga ko\'rsating.')}
                            </div>
                        ) : (
                            attendances.map((att, idx) => (
                                <div
                                    key={att.id}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs animate-in fade-in"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-slate-200">{att.student?.full_name}</span>
                                    </div>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Bar Info */}
            <div className="text-center text-xs text-slate-500 border-t border-slate-800/80 pt-4">
                AutoPrime LMS &bull; Dinamik HMAC QR Texnologiyasi &bull; {new Date().toLocaleDateString('uz-UZ')}
            </div>
        </div>
    );
}
