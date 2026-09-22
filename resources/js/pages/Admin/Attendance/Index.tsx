import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Tv,
    QrCode,
    CheckCircle2,
    XCircle,
    UserCheck,
    Search,
    Calendar,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Attendance {
    id: number;
    student_id: number;
    date: string;
    status: 'present' | 'absent' | 'excused';
    is_manual: boolean;
    manual_reason?: string;
    scanned_at?: string;
    student?: { full_name: string; phone: string; group?: { name: string } };
    session?: { id: number; started_at: string; teacher?: { name: string } };
    marked_by?: { name: string };
}

interface LessonSession {
    id: number;
    started_at: string;
    status: string;
    group?: { name: string; category: string };
    teacher?: { name: string };
}

interface PageProps {
    attendances: {
        data: Attendance[];
        links: any[];
        total: number;
    };
    activeSessions: LessonSession[];
    groups: Array<{ id: number; name: string }>;
    students: Array<{ id: number; full_name: string; phone: string; group_id?: number }>;
    branches: Array<{ id: number; name: string }>;
    filters: {
        group_id?: string | number;
        date?: string;
        branch_id?: string | number;
    };
}

export default function AttendanceIndex({
    attendances,
    activeSessions,
    groups,
    students,
    filters,
}: PageProps) {
    const { t } = useTranslation();
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);

    const sessionForm = useForm({
        group_id: groups[0]?.id || '',
    });

    const manualForm = useForm({
        student_id: students[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        manual_reason: 'Telefoni yo\'q',
    });

    const handleStartSession = (e: React.FormEvent) => {
        e.preventDefault();
        sessionForm.post('/admin/attendance/start-session', {
            onSuccess: () => {
                setShowSessionModal(false);
                toast.success(t('attendance.session_started', 'Dars sessiyasi ochildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        manualForm.post('/admin/attendance/mark-manual', {
            onSuccess: () => {
                setShowManualModal(false);
                manualForm.reset();
                toast.success(t('attendance.manual_saved', 'Davomat belgilandi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    return (
        <div className="p-6">
            <Head title={t('attendance.title', 'Davomat Jurnali')} />

            {/* Page Title & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('attendance.title', 'Davomat Jurnali')}</h1>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowSessionModal(true)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                        <Tv className="w-4 h-4 mr-1.5" />
                        {t('attendance.start_session_button', 'Dars Ochish (QR Doska)')}
                    </Button>
                    <Button onClick={() => setShowManualModal(true)} variant="outline" className="text-xs">
                        <UserCheck className="w-4 h-4 mr-1.5" />
                        {t('attendance.manual_mark_button', 'Qo\'lda Belgilash')}
                    </Button>
                </div>
            </div>

            {/* Active Sessions Banner */}
            {activeSessions.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                    <h3 className="font-bold text-xs text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-blue-600 animate-pulse" />
                        {t('attendance.active_sessions', 'Hozirda Faol Dars Sessiyalari')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeSessions.map((s) => (
                            <div key={s.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-100 dark:border-blue-900 shadow-xs flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-xs text-gray-900 dark:text-white">{s.group?.name} ({s.group?.category || 'B'})</p>
                                    <p className="text-[11px] text-gray-500">👨‍🏫 {s.teacher?.name}</p>
                                </div>
                                <a
                                    href={`/admin/attendance/session/${s.id}/screen`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 flex items-center gap-1"
                                >
                                    <Tv className="w-3.5 h-3.5" />
                                    {t('attendance.view_screen', 'Ekran')}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attendance Records Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('attendance.date', 'Sana')}</th>
                                <th className="p-3.5 font-semibold">{t('attendance.student', 'Talaba')}</th>
                                <th className="p-3.5 font-semibold">{t('attendance.group', 'Guruh')}</th>
                                <th className="p-3.5 font-semibold">{t('attendance.status', 'Holat')}</th>
                                <th className="p-3.5 font-semibold">{t('attendance.type', 'Turi')}</th>
                                <th className="p-3.5 font-semibold">{t('attendance.teacher', 'O\'qituvchi')}</th>
                                <th className="p-3.5 font-semibold">{t('attendance.time', 'Vaqt')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {attendances.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        {t('attendance.no_records', 'Davomat yozuvlari topilmadi')}
                                    </td>
                                </tr>
                            ) : (
                                attendances.data.map((att) => (
                                    <tr key={att.id} className="hover:bg-gray-50/50">
                                        <td className="p-3.5 font-medium text-gray-900 dark:text-white">{att.date}</td>
                                        <td className="p-3.5 font-medium">{att.student?.full_name}</td>
                                        <td className="p-3.5 text-gray-500">{att.student?.group?.name || '-'}</td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                att.status === 'present'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}>
                                                {att.status === 'present' ? t('attendance.present', 'Bor') : t('attendance.absent', 'Yo\'q')}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-gray-500">
                                            {att.is_manual ? (
                                                <span className="text-amber-600">✍️ {t('attendance.manual', 'Qo\'lda')} ({att.manual_reason})</span>
                                            ) : (
                                                <span className="text-blue-600">📷 {t('attendance.qr_scanned', 'Dinamik QR')}</span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-gray-500">{att.session?.teacher?.name || att.marked_by?.name || '-'}</td>
                                        <td className="p-3.5 text-gray-400">{att.scanned_at || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Start Session Modal */}
            <Dialog open={showSessionModal} onOpenChange={setShowSessionModal}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('attendance.start_session_title', 'Dars Sessiyasini Boshlash')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleStartSession} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="sess_group">{t('attendance.group', 'Guruhni Tanlang')}</Label>
                            <select
                                id="sess_group"
                                value={sessionForm.data.group_id}
                                onChange={(e) => sessionForm.setData('group_id', e.target.value)}
                                className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                required
                            >
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowSessionModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" disabled={sessionForm.processing}>
                                {t('attendance.launch_qr', 'QR Doskani Ochish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manual Mark Modal */}
            <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('attendance.manual_modal_title', 'O\'quvchini Qo\'lda Belgilash')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="man_student">{t('attendance.student', 'Talaba')}</Label>
                            <select
                                id="man_student"
                                value={manualForm.data.student_id}
                                onChange={(e) => manualForm.setData('student_id', e.target.value)}
                                className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                required
                            >
                                {students.map((st) => (
                                    <option key={st.id} value={st.id}>{st.full_name} ({st.phone})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="man_date">{t('attendance.date', 'Sana')}</Label>
                                <Input
                                    id="man_date"
                                    type="date"
                                    value={manualForm.data.date}
                                    onChange={(e) => manualForm.setData('date', e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="man_status">{t('attendance.status', 'Holat')}</Label>
                                <select
                                    id="man_status"
                                    value={manualForm.data.status}
                                    onChange={(e) => manualForm.setData('status', e.target.value as any)}
                                    className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                >
                                    <option value="present">✅ Darsda Bor</option>
                                    <option value="absent">❌ Kelmagan</option>
                                    <option value="excused">🟡 Sababli</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="man_reason">{t('attendance.manual_reason', 'Qo\'lda belgilash sababi')}</Label>
                            <Input
                                id="man_reason"
                                value={manualForm.data.manual_reason}
                                onChange={(e) => manualForm.setData('manual_reason', e.target.value)}
                                placeholder="Smartfoni quvvati tugagan / Telefonsiz kelgan"
                                required
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowManualModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" disabled={manualForm.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
