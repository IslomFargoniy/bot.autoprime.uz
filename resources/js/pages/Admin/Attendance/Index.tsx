import { Head, useForm, router } from '@inertiajs/react';
import {
    Tv,
    QrCode,
    CheckCircle2,
    XCircle,
    UserCheck,
    Users,
    RotateCcw,
    Loader2,
    Check,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFilterBar } from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableEmpty,
} from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import { formatPhone } from '@/lib/input-masks';
import { formatDate, formatDateTime } from '@/lib/utils';

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
    payment_warning?: string | null;
}

interface PageProps {
    attendances: {
        data: Attendance[];
        links: any[];
        total: number;
        from?: number;
        to?: number;
    };
    activeSessions: LessonSession[];
    groups: Array<{ id: number; name: string }>;
    students: StudentItem[];
    branches: Array<{ id: number; name: string }>;
    filters: {
        group_id?: string | number;
        date?: string;
        branch_id?: string | number;
        action?: string;
        per_page?: string;
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
    const can = useCan();
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(
        Boolean(filters.action === 'mark' || filters.group_id),
    );
    const [attendanceMode, setAttendanceMode] = useState<'group' | 'single'>(
        'group',
    );

    // Page filter states
    const [filterGroupId, setFilterGroupId] = useState(
        filters.group_id?.toString() || '',
    );
    const [filterDate, setFilterDate] = useState(filters.date || '');
    const [perPage, setPerPage] = useState(filters?.per_page || '15');

    // Group journal state inside modal
    const [rosterGroupId, setRosterGroupId] = useState<number | string>(
        filters.group_id || '',
    );

    useEffect(() => {
        if (filters.action === 'mark' || filters.group_id) {
            if (filters.group_id) {
                setRosterGroupId(filters.group_id);
            }

            setAttendanceMode('group');
            setShowManualModal(true);
        }
    }, [filters.action, filters.group_id]);
    const [rosterDate, setRosterDate] = useState<string>(
        formatDate(new Date()),
    );
    const [rosterTopic, setRosterTopic] = useState<string>('Nazariy dars');
    const [rosterList, setRosterList] = useState<GroupRosterStudent[]>([]);
    const [isLoadingRoster, setIsLoadingRoster] = useState(false);
    const [isSubmittingRoster, setIsSubmittingRoster] = useState(false);

    // Single student manual form
    const sessionForm = useForm({
        group_id: '' as string | number,
    });

    const manualForm = useForm({
        student_id: '' as string | number,
        date: formatDate(new Date()),
        status: 'present',
        manual_reason: "Telefoni yo'q",
    });

    // Fetch roster whenever modal opens or group/date changes
    useEffect(() => {
        if (!showManualModal || !rosterGroupId) {
            return;
        }

        let isMounted = true;
        setIsLoadingRoster(true);

        fetch(
            `/admin/attendance/group-attendances?group_id=${rosterGroupId}&date=${rosterDate}`,
        )
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) {
                    return;
                }

                setIsLoadingRoster(false);

                if (data.students) {
                    setRosterList(data.students);
                }

                if (data.session?.topic) {
                    setRosterTopic(data.session.topic);
                }
            })
            .catch(() => {
                if (!isMounted) {
                    return;
                }

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
            })),
        );
    };

    const handleUncheckAll = () => {
        setRosterList((prev) =>
            prev.map((s) => ({
                ...s,
                is_attended: false,
                status: 'absent',
            })),
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
            }),
        );
    };

    const handleUpdateReason = (studentId: number, reason: string) => {
        setRosterList((prev) =>
            prev.map((s) =>
                s.id === studentId ? { ...s, manual_reason: reason } : s,
            ),
        );
    };

    const handleSaveGroupAttendance = (e: React.FormEvent) => {
        e.preventDefault();

        if (rosterList.length === 0) {
            toast.error(
                t(
                    'attendance.no_students_in_group',
                    'Ushbu guruhda faol talabalar topilmadi',
                ),
            );

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
                    status: st.is_attended
                        ? st.status === 'late'
                            ? 'late'
                            : 'present'
                        : 'absent',
                    manual_reason:
                        st.manual_reason ||
                        (st.is_attended ? 'Guruh jurnali orqali' : 'Kelmagan'),
                })),
            },
            {
                onSuccess: () => {
                    setShowManualModal(false);
                    setIsSubmittingRoster(false);
                    toast.success(
                        t(
                            'attendance.group_saved',
                            'Guruh davomati muvaffaqiyatli saqlandi',
                        ),
                    );
                },
                onError: (err) => {
                    setIsSubmittingRoster(false);
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    );
                },
            },
        );
    };

    const handleStartSession = (e: React.FormEvent) => {
        e.preventDefault();
        sessionForm.post('/admin/attendance/start-session', {
            onSuccess: () => {
                setShowSessionModal(false);
                toast.success(
                    t('attendance.session_started', 'Dars sessiyasi ochildi'),
                );
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        manualForm.post('/admin/attendance/mark-manual', {
            onSuccess: () => {
                setShowManualModal(false);
                manualForm.reset();
                toast.success(
                    t('attendance.manual_saved', 'Davomat belgilandi'),
                );
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleFilterChange = (key: 'group_id' | 'date', value: string) => {
        const nextGroupId = key === 'group_id' ? value : filterGroupId;
        const nextDate = key === 'date' ? value : filterDate;

        if (key === 'group_id') {
            setFilterGroupId(value);
        }

        if (key === 'date') {
            setFilterDate(value);
        }

        router.get(
            '/admin/attendance',
            {
                group_id: nextGroupId || undefined,
                date: nextDate || undefined,
                per_page: perPage,
            },
            { preserveState: true, replace: true },
        );
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get(
            '/admin/attendance',
            {
                group_id: filterGroupId || undefined,
                date: filterDate || undefined,
                per_page: newPerPage,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleClearFilters = () => {
        setFilterGroupId('');
        setFilterDate('');
        router.get(
            '/admin/attendance',
            { per_page: perPage },
            { preserveState: true, replace: true },
        );
    };

    const presentCount = rosterList.filter((s) => s.is_attended).length;

    return (
        <div className="p-6">
            <Head title={t('attendance.title', 'Davomat Jurnali')} />

            {/* Page Title & Actions */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('attendance.title', 'Davomat Jurnali')}
                </h1>
                <div className="flex flex-wrap gap-2">
                    {can('attendance.start_session') && (
                        <Button
                            onClick={() => setShowSessionModal(true)}
                            variant="brand"
                            className="text-xs"
                        >
                            <Tv className="mr-1.5 h-4 w-4" />
                            {t(
                                'attendance.start_session_button',
                                'Dars Ochish (QR Doska)',
                            )}
                        </Button>
                    )}
                    {can('attendance.mark_manual') && (
                        <Button
                            onClick={() => setShowManualModal(true)}
                            variant="outline"
                            className="text-xs"
                        >
                            <UserCheck className="mr-1.5 h-4 w-4" />
                            {t(
                                'attendance.manual_mark_button',
                                "Qo'lda Belgilash",
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Sessions Banner */}
            {activeSessions.length > 0 && (
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-900 uppercase dark:text-blue-300">
                        <QrCode className="h-4 w-4 animate-pulse text-blue-600" />
                        {t(
                            'attendance.active_sessions',
                            'Hozirda Faol Dars Sessiyalari',
                        )}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {activeSessions.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3 shadow-xs dark:border-blue-900 dark:bg-gray-800"
                            >
                                <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                        {s.group?.name} (
                                        {s.group?.category || 'B'})
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        👨‍🏫 {s.teacher?.name}
                                    </p>
                                </div>
                                <a
                                    href={`/admin/attendance/session/${s.id}/screen`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                    <Tv className="h-3.5 w-3.5" />
                                    {t('attendance.view_screen', 'Ekran')}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters Bar */}
            <PageFilterBar className="mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <SearchableSelect
                        value={filterGroupId}
                        onChange={(val) =>
                            handleFilterChange(
                                'group_id',
                                val ? String(val) : '',
                            )
                        }
                        options={[
                            {
                                value: '',
                                label: t('common.all', 'Barcha guruhlar'),
                            },
                            ...groups.map((g) => ({
                                value: String(g.id),
                                label: g.name,
                            })),
                        ]}
                        placeholder={t(
                            'attendance.all_groups',
                            'Barcha guruhlar',
                        )}
                        className="w-full sm:w-56"
                        triggerClassName="h-10 text-sm"
                        allowClear
                    />
                    <DatePicker
                        value={filterDate}
                        onChange={(val) => handleFilterChange('date', val)}
                        className="w-full sm:w-44"
                    />
                    <PerPageSelect
                        value={perPage}
                        onChange={handlePerPageChange}
                    />
                    {(filterGroupId || filterDate) && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleClearFilters}
                            className="h-10 w-10 shrink-0"
                            title={t('common.clear', 'Tozalash')}
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </PageFilterBar>

            {/* Attendance Records Table / Desktop & Tablet */}
            <div className="mb-4 hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs md:block dark:border-gray-700 dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80 dark:bg-gray-700/50">
                                <TableHead className="font-semibold">
                                    {t('attendance.date', 'Sana')}
                                </TableHead>
                                <TableHead className="font-semibold">
                                    {t('attendance.student', 'Talaba')}
                                </TableHead>
                                <TableHead className="font-semibold">
                                    {t('attendance.group', 'Guruh')}
                                </TableHead>
                                <TableHead className="font-semibold">
                                    {t('attendance.status', 'Holat')}
                                </TableHead>
                                <TableHead className="font-semibold">
                                    {t('attendance.type', 'Turi')}
                                </TableHead>
                                <TableHead className="font-semibold">
                                    {t('attendance.teacher', "O'qituvchi")}
                                </TableHead>
                                <TableHead className="font-semibold">
                                    {t('attendance.time', 'Vaqt')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendances.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={7}
                                    icon={QrCode}
                                    title={t(
                                        'attendance.no_records',
                                        'Davomat yozuvlari topilmadi',
                                    )}
                                    description={t(
                                        'attendance.no_records_desc',
                                        "Tanlangan sana yoki guruh bo'yicha davomat yozuvi mavjud emas",
                                    )}
                                />
                            ) : (
                                attendances.data.map((att) => (
                                    <TableRow
                                        key={att.id}
                                        className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                                    >
                                        <TableCell className="font-mono text-xs font-medium text-gray-900 dark:text-white">
                                            {formatDate(att.date)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {att.student?.full_name}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">
                                            {att.student?.group?.name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                    att.status === 'present'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : att.status === 'late'
                                                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                          : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                                }`}
                                            >
                                                {att.status === 'present'
                                                    ? t(
                                                          'attendance.present',
                                                          'Bor',
                                                      )
                                                    : att.status === 'late'
                                                      ? t(
                                                            'attendance.late',
                                                            'Kechikkan',
                                                        )
                                                      : t(
                                                            'attendance.absent',
                                                            "Yo'q",
                                                        )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {att.is_manual ? (
                                                <span className="text-amber-600">
                                                    ✍️{' '}
                                                    {t(
                                                        'attendance.manual',
                                                        "Qo'lda",
                                                    )}{' '}
                                                    {att.manual_reason
                                                        ? `(${att.manual_reason})`
                                                        : ''}
                                                </span>
                                            ) : (
                                                <span className="text-blue-600">
                                                    📷{' '}
                                                    {t(
                                                        'attendance.qr_scanned',
                                                        'Dinamik QR',
                                                    )}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {att.session?.teacher?.name ||
                                                att.marked_by?.name ||
                                                '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-gray-400">
                                            {formatDateTime(att.scanned_at)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Attendance Records Mobile Cards Feed */}
            <div className="mb-4 space-y-3 md:hidden">
                {attendances.data.length === 0 ? (
                    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs">
                        {t(
                            'attendance.no_records',
                            'Davomat yozuvlari topilmadi',
                        )}
                    </div>
                ) : (
                    attendances.data.map((att) => (
                        <div
                            key={att.id}
                            className="space-y-2.5 rounded-xl border bg-card p-4 shadow-xs"
                        >
                            {/* Header: Student Name + Status Badge */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">
                                        {att.student?.full_name}
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {att.student?.group?.name || '-'}
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        att.status === 'present'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : att.status === 'late'
                                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                              : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    }`}
                                >
                                    {att.status === 'present'
                                        ? t('attendance.present', 'Bor')
                                        : att.status === 'late'
                                          ? t('attendance.late', 'Kechikkan')
                                          : t('attendance.absent', "Yo'q")}
                                </span>
                            </div>

                            {/* Date & Mode info */}
                            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {t('attendance.date', 'Sana')}:
                                    </span>
                                    <span className="font-mono font-medium">
                                        {formatDate(att.date)}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {t('attendance.time', 'Vaqt')}:
                                    </span>
                                    <span className="font-mono text-muted-foreground">
                                        {formatDateTime(att.scanned_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Footer: Scan type & Teacher */}
                            <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                                <div>
                                    {att.is_manual ? (
                                        <span className="font-medium text-amber-600 dark:text-amber-400">
                                            ✍️{' '}
                                            {t('attendance.manual', "Qo'lda")}{' '}
                                            {att.manual_reason
                                                ? `(${att.manual_reason})`
                                                : ''}
                                        </span>
                                    ) : (
                                        <span className="font-medium text-blue-600 dark:text-blue-400">
                                            📷{' '}
                                            {t(
                                                'attendance.qr_scanned',
                                                'Dinamik QR',
                                            )}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    👨‍🏫{' '}
                                    {att.session?.teacher?.name ||
                                        att.marked_by?.name ||
                                        '-'}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <Pagination
                links={attendances.links}
                total={attendances.total}
                from={attendances.from}
                to={attendances.to}
            />

            {/* Start Session Modal */}
            <Dialog open={showSessionModal} onOpenChange={setShowSessionModal}>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-sm overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Tv className="h-5 w-5 text-blue-600" />
                            <span>
                                {t(
                                    'attendance.start_session_title',
                                    'Dars Sessiyasini Boshlash',
                                )}
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={handleStartSession}
                        className="space-y-4 text-xs"
                    >
                        <div>
                            <Label htmlFor="sess_group" required>
                                {t('attendance.group', 'Guruhni Tanlang')}
                            </Label>
                            <SearchableSelect
                                id="sess_group"
                                value={sessionForm.data.group_id}
                                onChange={(val) =>
                                    sessionForm.setData('group_id', val)
                                }
                                options={groups.map((g) => ({
                                    value: g.id,
                                    label: g.name,
                                }))}
                                placeholder={t(
                                    'attendance.select_group',
                                    'Guruhni tanlang',
                                )}
                                className="mt-1"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowSessionModal(false)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={sessionForm.processing}
                            >
                                {t('attendance.launch_qr', 'QR Doskani Ochish')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Group Journal & Manual Attendance Modal */}
            <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
                <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span>
                                {t(
                                    'attendance.group_journal_modal_title',
                                    'Guruh Davomat Jurnali',
                                )}
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Mode Tabs */}
                    <div className="-mt-1 mb-3 flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setAttendanceMode('group')}
                            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-xs font-semibold transition-colors ${
                                attendanceMode === 'group'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <Users className="h-3.5 w-3.5" />
                            {t('attendance.group_roster', 'Guruh jurnali')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAttendanceMode('single')}
                            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-xs font-semibold transition-colors ${
                                attendanceMode === 'single'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <UserCheck className="h-3.5 w-3.5" />
                            {t('attendance.single_student', 'Yakka talaba')}
                        </button>
                    </div>

                    {attendanceMode === 'group' ? (
                        /* Group Journal Form */
                        <form
                            onSubmit={handleSaveGroupAttendance}
                            className="flex min-h-0 flex-1 flex-col space-y-3 text-xs"
                        >
                            {/* Group, Date, Topic row */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <Label
                                        htmlFor="roster_group"
                                        required
                                        className="mb-1 block text-xs"
                                    >
                                        {t(
                                            'attendance.select_group',
                                            'Guruhni tanlang',
                                        )}
                                    </Label>
                                    <SearchableSelect
                                        id="roster_group"
                                        value={rosterGroupId}
                                        onChange={(val) =>
                                            setRosterGroupId(val)
                                        }
                                        options={groups.map((g) => ({
                                            value: g.id,
                                            label: g.name,
                                        }))}
                                        placeholder={t(
                                            'attendance.select_group',
                                            'Guruhni tanlang',
                                        )}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label
                                        htmlFor="roster_date"
                                        required
                                        className="mb-1 block text-xs"
                                    >
                                        {t('attendance.date', 'Sana')}
                                    </Label>
                                    <DatePicker
                                        id="roster_date"
                                        max={new Date().toLocaleDateString(
                                            'en-CA',
                                        )}
                                        value={rosterDate}
                                        onChange={(val) => setRosterDate(val)}
                                        className="h-9 text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label
                                        htmlFor="roster_topic"
                                        className="mb-1 block text-xs"
                                    >
                                        {t(
                                            'attendance.lesson_topic',
                                            'Dars mavzusi',
                                        )}
                                    </Label>
                                    <Input
                                        id="roster_topic"
                                        value={rosterTopic}
                                        onChange={(e) =>
                                            setRosterTopic(e.target.value)
                                        }
                                        placeholder="Nazariy dars..."
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Summary & Quick Check Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/80">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {t(
                                        'attendance.present_stats',
                                        '{{present}} / {{total}} ta talaba bor ({{percent}}%)',
                                        {
                                            present: presentCount,
                                            total: rosterList.length,
                                            percent:
                                                rosterList.length > 0
                                                    ? Math.round(
                                                          (presentCount /
                                                              rosterList.length) *
                                                              100,
                                                      )
                                                    : 0,
                                        },
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCheckAll}
                                        className="h-7 border-emerald-300 px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-950/40"
                                    >
                                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                        {t(
                                            'attendance.all_present',
                                            'Barchasi bor',
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleUncheckAll}
                                        className="h-7 border-rose-300 px-2.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/40"
                                    >
                                        <XCircle className="mr-1 h-3.5 w-3.5" />
                                        {t(
                                            'attendance.all_absent',
                                            "Barchasi yo'q",
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Roster Table */}
                            <div className="max-h-[360px] min-h-[220px] flex-1 overflow-hidden overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700/60">
                                            <TableHead className="w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        rosterList.length > 0 &&
                                                        rosterList.every(
                                                            (s) =>
                                                                s.is_attended,
                                                        )
                                                    }
                                                    onChange={(e) =>
                                                        e.target.checked
                                                            ? handleCheckAll()
                                                            : handleUncheckAll()
                                                    }
                                                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    title={t(
                                                        'attendance.check_all',
                                                        'Barchasini belgilash',
                                                    )}
                                                />
                                            </TableHead>
                                            <TableHead className="w-8 font-semibold">
                                                №
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                {t(
                                                    'attendance.student',
                                                    'Talaba',
                                                )}
                                            </TableHead>
                                            <TableHead className="w-24 font-semibold">
                                                {t(
                                                    'attendance.status',
                                                    'Holat',
                                                )}
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                {t(
                                                    'attendance.notes_placeholder',
                                                    'Izoh (ixtiyoriy)',
                                                )}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingRoster ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="p-8 text-center text-gray-400"
                                                >
                                                    <Loader2 className="mx-auto mb-1 h-5 w-5 animate-spin text-blue-600" />
                                                    {t(
                                                        'attendance.loading_roster',
                                                        "Guruh ro'yxati yuklanmoqda...",
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ) : rosterList.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="p-8 text-center text-gray-400"
                                                >
                                                    {t(
                                                        'attendance.no_students_in_group',
                                                        'Ushbu guruhda faol talabalar topilmadi',
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rosterList.map((st, idx) => (
                                                <TableRow
                                                    key={st.id}
                                                    className={`transition-colors ${
                                                        st.is_attended
                                                            ? 'bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-emerald-950/20'
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                                    }`}
                                                >
                                                    <TableCell className="text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                st.is_attended
                                                            }
                                                            onChange={() =>
                                                                handleToggleStudent(
                                                                    st.id,
                                                                )
                                                            }
                                                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono text-gray-400">
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {st.full_name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500">
                                                            {formatPhone(st.phone)}
                                                        </p>
                                                        {st.payment_warning && (
                                                            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                                ⚠{' '}
                                                                {
                                                                    st.payment_warning
                                                                }
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleToggleStudent(
                                                                    st.id,
                                                                )
                                                            }
                                                            className={`flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-transform active:scale-95 ${
                                                                st.is_attended
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                                                            }`}
                                                        >
                                                            {st.is_attended ? (
                                                                <>
                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                                    {t(
                                                                        'attendance.present',
                                                                        'Bor',
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="h-3 w-3 text-rose-600" />
                                                                    {t(
                                                                        'attendance.absent',
                                                                        "Yo'q",
                                                                    )}
                                                                </>
                                                            )}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={
                                                                st.manual_reason ||
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                handleUpdateReason(
                                                                    st.id,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder={t(
                                                                'attendance.notes_placeholder',
                                                                'Izoh...',
                                                            )}
                                                            className="h-7 text-xs"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowManualModal(false)}
                                >
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="brand"
                                    disabled={
                                        isSubmittingRoster ||
                                        rosterList.length === 0
                                    }
                                >
                                    {isSubmittingRoster ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                            {t(
                                                'common.saving',
                                                'Saqlanmoqda...',
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-1.5 h-3.5 w-3.5" />
                                            {t(
                                                'attendance.save_roster',
                                                'Davomatni Saqlash',
                                            )}{' '}
                                            ({presentCount})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        /* Single Student Manual Form */
                        <form
                            onSubmit={handleManualSubmit}
                            className="space-y-4 text-xs"
                        >
                            <div>
                                <Label htmlFor="man_student" required>
                                    {t('attendance.student', 'Talaba')}
                                </Label>
                                <SearchableSelect
                                    id="man_student"
                                    value={manualForm.data.student_id}
                                    onChange={(val) =>
                                        manualForm.setData('student_id', val)
                                    }
                                    options={students.map((st) => ({
                                        value: st.id,
                                        label: st.full_name,
                                        sublabel: st.phone,
                                    }))}
                                    placeholder={t(
                                        'attendance.select_student',
                                        'Talabani tanlang',
                                    )}
                                    searchPlaceholder={t(
                                        'common.search_student',
                                        'Talaba ismi yoki telefon...',
                                    )}
                                    allowClear
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="man_date" required>
                                        {t('attendance.date', 'Sana')}
                                    </Label>
                                    <DatePicker
                                        id="man_date"
                                        max={new Date().toLocaleDateString(
                                            'en-CA',
                                        )}
                                        value={manualForm.data.date}
                                        onChange={(val) =>
                                            manualForm.setData('date', val)
                                        }
                                        required
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="man_status" required>
                                        {t('attendance.status', 'Holat')}
                                    </Label>
                                    <SearchableSelect
                                        id="man_status"
                                        value={manualForm.data.status}
                                        onChange={(val) =>
                                            manualForm.setData(
                                                'status',
                                                val as any,
                                            )
                                        }
                                        options={[
                                            {
                                                value: 'present',
                                                label: '✅ Darsda Bor',
                                            },
                                            {
                                                value: 'absent',
                                                label: '❌ Kelmagan',
                                            },
                                            {
                                                value: 'late',
                                                label: '🟡 Kechikkan',
                                            },
                                        ]}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="man_reason" required>
                                    {t(
                                        'attendance.manual_reason',
                                        "Qo'lda belgilash sababi",
                                    )}
                                </Label>
                                <Input
                                    id="man_reason"
                                    value={manualForm.data.manual_reason}
                                    onChange={(e) =>
                                        manualForm.setData(
                                            'manual_reason',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Smartfoni quvvati tugagan / Telefonsiz kelgan"
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowManualModal(false)}
                                >
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="brand"
                                    disabled={manualForm.processing}
                                >
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
