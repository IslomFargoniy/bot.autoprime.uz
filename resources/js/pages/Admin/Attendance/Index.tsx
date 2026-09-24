import { useState, useEffect } from 'react';
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
    RotateCcw,
    Loader2,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Pagination from '@/components/pagination';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
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
    status: 'present' | 'absent' | 'late' | 'excused';
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

interface StudentItem {
    id: number;
    full_name: string;
    phone: string;
    group_id?: number;
}

interface GroupRosterStudent {
    id: number;
    full_name: string;
    phone: string;
    status: 'present' | 'absent' | 'late';
    is_attended: boolean;
    is_manual: boolean;
    manual_reason?: string | null;
    already_recorded: boolean;
}

interface PageProps {
    attendances: {
        data: Attendance[];
        links: any[];
        total: number;
    };
    activeSessions: LessonSession[];
    groups: Array<{ id: number; name: string }>;
    students: StudentItem[];
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
    const [attendanceMode, setAttendanceMode] = useState<'group' | 'single'>('group');

    // Page filter states
    const [filterGroupId, setFilterGroupId] = useState(filters.group_id?.toString() || '');
    const [filterDate, setFilterDate] = useState(filters.date || '');

    // Group journal state inside modal
    const [rosterGroupId, setRosterGroupId] = useState<number | string>(
        filters.group_id || groups[0]?.id || ''
    );
    const [rosterDate, setRosterDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [rosterTopic, setRosterTopic] = useState<string>('Nazariy dars');
    const [rosterList, setRosterList] = useState<GroupRosterStudent[]>([]);
    const [isLoadingRoster, setIsLoadingRoster] = useState(false);
    const [isSubmittingRoster, setIsSubmittingRoster] = useState(false);

    // Single student manual form
    const sessionForm = useForm({
        group_id: groups[0]?.id || '',
    });

    const manualForm = useForm({
        student_id: students[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        manual_reason: 'Telefoni yo\'q',
    });

    // Fetch roster whenever modal opens or group/date changes
    useEffect(() => {
        if (!showManualModal || !rosterGroupId) return;

        let isMounted = true;
        setIsLoadingRoster(true);

        fetch(`/admin/attendance/group-attendances?group_id=${rosterGroupId}&date=${rosterDate}`)
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) return;
                setIsLoadingRoster(false);
                if (data.students) {
                    setRosterList(data.students);
                }
                if (data.session?.topic) {
                    setRosterTopic(data.session.topic);
                }
            })
            .catch(() => {
                if (!isMounted) return;
                setIsLoadingRoster(false);
                const filtered = students
                    .filter((s) => s.group_id === Number(rosterGroupId))
                    .map((s) => ({
                        id: s.id,
                        full_name: s.full_name,
                        phone: s.phone,
                        status: 'present' as const,
                        is_attended: true,
                        is_manual: true,
                        manual_reason: '',
                        already_recorded: false,
                    }));
                setRosterList(filtered);
            });

        return () => {
            isMounted = false;
        };
    }, [showManualModal, rosterGroupId, rosterDate]);

    // Handle check all / uncheck all
    const handleCheckAll = () => {
        setRosterList((prev) =>
            prev.map((s) => ({
                ...s,
                is_attended: true,
                status: 'present',
            }))
        );
    };

    const handleUncheckAll = () => {
        setRosterList((prev) =>
            prev.map((s) => ({
                ...s,
                is_attended: false,
                status: 'absent',
            }))
        );
    };

    const handleToggleStudent = (studentId: number) => {
        setRosterList((prev) =>
            prev.map((s) => {
                if (s.id === studentId) {
                    const nextAttended = !s.is_attended;
                    return {
                        ...s,
                        is_attended: nextAttended,
                        status: nextAttended ? 'present' : 'absent',
                    };
                }
                return s;
            })
        );
    };

    const handleUpdateReason = (studentId: number, reason: string) => {
        setRosterList((prev) =>
            prev.map((s) => (s.id === studentId ? { ...s, manual_reason: reason } : s))
        );
    };

    const handleSaveGroupAttendance = (e: React.FormEvent) => {
        e.preventDefault();
        if (rosterList.length === 0) {
            toast.error(t('attendance.no_students_in_group', 'Ushbu guruhda faol talabalar topilmadi'));
            return;
        }

        setIsSubmittingRoster(true);
        router.post(
            '/admin/attendance/mark-group',
            {
                group_id: rosterGroupId,
                date: rosterDate,
                topic: rosterTopic,
                attendances: rosterList.map((st) => ({
                    student_id: st.id,
                    status: st.is_attended ? (st.status === 'late' ? 'late' : 'present') : 'absent',
                    manual_reason: st.manual_reason || (st.is_attended ? 'Guruh jurnali orqali' : 'Kelmagan'),
                })),
            },
            {
                onSuccess: () => {
                    setShowManualModal(false);
                    setIsSubmittingRoster(false);
                    toast.success(t('attendance.group_saved', 'Guruh davomati muvaffaqiyatli saqlandi'));
                },
                onError: (err) => {
                    setIsSubmittingRoster(false);
                    toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi'));
                },
            }
        );
    };

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

    const handleFilterChange = (key: 'group_id' | 'date', value: string) => {
        const nextGroupId = key === 'group_id' ? value : filterGroupId;
        const nextDate = key === 'date' ? value : filterDate;

        if (key === 'group_id') setFilterGroupId(value);
        if (key === 'date') setFilterDate(value);

        router.get(
            '/admin/attendance',
            {
                group_id: nextGroupId || undefined,
                date: nextDate || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleClearFilters = () => {
        setFilterGroupId('');
        setFilterDate('');
        router.get('/admin/attendance', {}, { preserveState: true, replace: true });
    };

    const presentCount = rosterList.filter((s) => s.is_attended).length;

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

            {/* Filters Bar */}
            <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                <div className="flex-1 min-w-[200px]">
                    <Label className="text-[11px] text-gray-500 mb-1 block">{t('attendance.group', 'Guruh')}</Label>
                    <SearchableSelect
                        size="sm"
                        value={filterGroupId}
                        onChange={(val) => handleFilterChange('group_id', val ? String(val) : '')}
                        options={[
                            { value: '', label: t('common.all', 'Barcha guruhlar') },
                            ...groups.map((g) => ({ value: String(g.id), label: g.name })),
                        ]}
                        placeholder={t('common.all', 'Barcha guruhlar')}
                        allowClear
                    />
                </div>
                <div className="w-44">
                    <Label className="text-[11px] text-gray-500 mb-1 block">{t('attendance.date', 'Sana')}</Label>
                    <DatePicker
                        value={filterDate}
                        onChange={(val) => handleFilterChange('date', val)}
                        className="h-8 text-xs"
                    />
                </div>
                {(filterGroupId || filterDate) && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-8 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        {t('common.clear', 'Tozalash')}
                    </Button>
                )}
            </div>

            {/* Attendance Records Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs mb-4">
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
                                    <tr key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                                        <td className="p-3.5 font-medium text-gray-900 dark:text-white">{att.date}</td>
                                        <td className="p-3.5 font-medium">{att.student?.full_name}</td>
                                        <td className="p-3.5 text-gray-500">{att.student?.group?.name || '-'}</td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                att.status === 'present'
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : att.status === 'late'
                                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                    : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                            }`}>
                                                {att.status === 'present'
                                                    ? t('attendance.present', 'Bor')
                                                    : att.status === 'late'
                                                    ? t('attendance.late', 'Kechikkan')
                                                    : t('attendance.absent', 'Yo\'q')}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-gray-500">
                                            {att.is_manual ? (
                                                <span className="text-amber-600">✍️ {t('attendance.manual', 'Qo\'lda')} {att.manual_reason ? `(${att.manual_reason})` : ''}</span>
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

            {/* Pagination */}
            <Pagination links={attendances.links} />

            {/* Start Session Modal */}
            <Dialog open={showSessionModal} onOpenChange={setShowSessionModal}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('attendance.start_session_title', 'Dars Sessiyasini Boshlash')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleStartSession} className="space-y-4 text-xs">
                        <div>
                            <Label htmlFor="sess_group">{t('attendance.group', 'Guruhni Tanlang')}</Label>
                            <SearchableSelect
                                id="sess_group"
                                value={sessionForm.data.group_id}
                                onChange={(val) => sessionForm.setData('group_id', val)}
                                options={groups.map((g) => ({ value: g.id, label: g.name }))}
                                placeholder={t('attendance.select_group', 'Guruhni tanlang')}
                                className="mt-1"
                                required
                            />
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

            {/* Group Journal & Manual Attendance Modal */}
            <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t('attendance.group_journal_modal_title', 'Guruh Davomat Jurnali')}</DialogTitle>
                    </DialogHeader>

                    {/* Mode Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 -mt-1 mb-3">
                        <button
                            type="button"
                            onClick={() => setAttendanceMode('group')}
                            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                attendanceMode === 'group'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            {t('attendance.group_roster', 'Guruh jurnali')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAttendanceMode('single')}
                            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                attendanceMode === 'single'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            {t('attendance.single_student', 'Yakka talaba')}
                        </button>
                    </div>

                    {attendanceMode === 'group' ? (
                        /* Group Journal Form */
                        <form onSubmit={handleSaveGroupAttendance} className="space-y-3 text-xs flex-1 flex flex-col min-h-0">
                            {/* Group, Date, Topic row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label htmlFor="roster_group" className="text-xs mb-1 block">
                                        {t('attendance.select_group', 'Guruhni tanlang')}
                                    </Label>
                                    <SearchableSelect
                                        id="roster_group"
                                        value={rosterGroupId}
                                        onChange={(val) => setRosterGroupId(val)}
                                        options={groups.map((g) => ({ value: g.id, label: g.name }))}
                                        placeholder={t('attendance.select_group', 'Guruhni tanlang')}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="roster_date" className="text-xs mb-1 block">
                                        {t('attendance.date', 'Sana')}
                                    </Label>
                                    <DatePicker
                                        id="roster_date"
                                        value={rosterDate}
                                        onChange={(val) => setRosterDate(val)}
                                        className="h-9 text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="roster_topic" className="text-xs mb-1 block">
                                        {t('attendance.lesson_topic', 'Dars mavzusi')}
                                    </Label>
                                    <Input
                                        id="roster_topic"
                                        value={rosterTopic}
                                        onChange={(e) => setRosterTopic(e.target.value)}
                                        placeholder="Nazariy dars..."
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Summary & Quick Check Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {t('attendance.present_stats', '{{present}} / {{total}} ta talaba bor ({{percent}}%)', {
                                        present: presentCount,
                                        total: rosterList.length,
                                        percent: rosterList.length > 0 ? Math.round((presentCount / rosterList.length) * 100) : 0,
                                    })}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCheckAll}
                                        className="h-7 text-xs px-2.5 text-emerald-700 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        {t('attendance.all_present', 'Barchasi bor')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleUncheckAll}
                                        className="h-7 text-xs px-2.5 text-rose-700 border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                        <XCircle className="w-3.5 h-3.5 mr-1" />
                                        {t('attendance.all_absent', 'Barchasi yo\'q')}
                                    </Button>
                                </div>
                            </div>

                            {/* Roster Table */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex-1 min-h-[220px] max-h-[360px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="p-2.5 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={rosterList.length > 0 && rosterList.every((s) => s.is_attended)}
                                                    onChange={(e) => (e.target.checked ? handleCheckAll() : handleUncheckAll())}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    title={t('attendance.check_all', 'Barchasini belgilash')}
                                                />
                                            </th>
                                            <th className="p-2.5 w-8 font-semibold">№</th>
                                            <th className="p-2.5 font-semibold">{t('attendance.student', 'Talaba')}</th>
                                            <th className="p-2.5 font-semibold w-24">{t('attendance.status', 'Holat')}</th>
                                            <th className="p-2.5 font-semibold">{t('attendance.notes_placeholder', 'Izoh (ixtiyoriy)')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {isLoadingRoster ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-400">
                                                    <Loader2 className="w-5 h-5 mx-auto animate-spin mb-1 text-blue-600" />
                                                    {t('attendance.loading_roster', 'Guruh ro\'yxati yuklanmoqda...')}
                                                </td>
                                            </tr>
                                        ) : rosterList.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-400">
                                                    {t('attendance.no_students_in_group', 'Ushbu guruhda faol talabalar topilmadi')}
                                                </td>
                                            </tr>
                                        ) : (
                                            rosterList.map((st, idx) => (
                                                <tr
                                                    key={st.id}
                                                    className={`transition-colors ${
                                                        st.is_attended
                                                            ? 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/20'
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                                    }`}
                                                >
                                                    <td className="p-2.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={st.is_attended}
                                                            onChange={() => handleToggleStudent(st.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-2.5 text-gray-400 font-mono">{idx + 1}</td>
                                                    <td className="p-2.5">
                                                        <p className="font-semibold text-gray-900 dark:text-white">{st.full_name}</p>
                                                        <p className="text-[11px] text-gray-500">{st.phone}</p>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStudent(st.id)}
                                                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 ${
                                                                st.is_attended
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                                                            }`}
                                                        >
                                                            {st.is_attended ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                    {t('attendance.present', 'Bor')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="w-3 h-3 text-rose-600" />
                                                                    {t('attendance.absent', 'Yo\'q')}
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="p-2.5">
                                                        <Input
                                                            value={st.manual_reason || ''}
                                                            onChange={(e) => handleUpdateReason(st.id, e.target.value)}
                                                            placeholder={t('attendance.notes_placeholder', 'Izoh...')}
                                                            className="h-7 text-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <Button type="button" variant="outline" onClick={() => setShowManualModal(false)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" disabled={isSubmittingRoster || rosterList.length === 0} className="bg-blue-600 hover:bg-blue-700">
                                    {isSubmittingRoster ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            {t('common.saving', 'Saqlanmoqda...')}
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5 mr-1.5" />
                                            {t('attendance.save_roster', 'Davomatni Saqlash')} ({presentCount})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        /* Single Student Manual Form */
                        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
                            <div>
                                <Label htmlFor="man_student">{t('attendance.student', 'Talaba')}</Label>
                                <SearchableSelect
                                    id="man_student"
                                    value={manualForm.data.student_id}
                                    onChange={(val) => manualForm.setData('student_id', val)}
                                    options={students.map((st) => ({
                                        value: st.id,
                                        label: st.full_name,
                                        sublabel: st.phone,
                                    }))}
                                    placeholder={t('attendance.student', 'Talaba')}
                                    searchPlaceholder={t('common.search_student', 'Talaba ismi yoki telefon...')}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="man_date">{t('attendance.date', 'Sana')}</Label>
                                    <DatePicker
                                        id="man_date"
                                        value={manualForm.data.date}
                                        onChange={(val) => manualForm.setData('date', val)}
                                        required
                                        className="mt-1 h-9 text-xs"
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
                                        <option value="late">🟡 Kechikkan</option>
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
                                <Button type="submit" disabled={manualForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                    {t('common.save', 'Saqlash')}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
