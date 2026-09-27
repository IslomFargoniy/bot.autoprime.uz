import React, { useEffect, useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Loader2,
    Calendar,
    BookOpen,
} from 'lucide-react';

export interface GroupRosterStudent {
    id: number;
    full_name: string;
    phone?: string;
    status: 'present' | 'late' | 'absent';
    is_attended: boolean;
    is_manual: boolean;
    manual_reason?: string | null;
    already_recorded?: boolean;
}

interface GroupOption {
    id: number;
    name: string;
}

interface GroupAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId?: number | string | null;
    groupName?: string;
    groups?: GroupOption[];
    onSuccess?: () => void;
}

export default function GroupAttendanceModal({
    isOpen,
    onClose,
    groupId,
    groupName,
    groups,
    onSuccess,
}: GroupAttendanceModalProps) {
    const { t } = useTranslation();

    const [selectedGroupId, setSelectedGroupId] = useState<number | string>(
        groupId || (groups && groups[0] ? groups[0].id : '')
    );
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [topic, setTopic] = useState<string>('Nazariy dars');
    const [rosterList, setRosterList] = useState<GroupRosterStudent[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Sync selectedGroupId when prop changes
    useEffect(() => {
        if (groupId) {
            setSelectedGroupId(groupId);
        } else if (groups && groups.length > 0 && !selectedGroupId) {
            setSelectedGroupId(groups[0].id);
        }
    }, [groupId, groups]);

    // Fetch roster whenever modal opens or group/date changes
    useEffect(() => {
        if (!isOpen || !selectedGroupId) return;

        let isMounted = true;
        setIsLoading(true);

        fetch(`/admin/attendance/group-attendances?group_id=${selectedGroupId}&date=${selectedDate}`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load roster');
                return res.json();
            })
            .then((data) => {
                if (!isMounted) return;
                setIsLoading(false);
                if (data.students) {
                    setRosterList(data.students);
                }
                if (data.session?.topic) {
                    setTopic(data.session.topic);
                }
            })
            .catch(() => {
                if (!isMounted) return;
                setIsLoading(false);
                setRosterList([]);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, selectedGroupId, selectedDate]);

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

    const handleSetStatus = (studentId: number, status: 'present' | 'late' | 'absent') => {
        setRosterList((prev) =>
            prev.map((s) => {
                if (s.id === studentId) {
                    return {
                        ...s,
                        status,
                        is_attended: status === 'present' || status === 'late',
                    };
                }
                return s;
            })
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (rosterList.length === 0) {
            toast.error(t('attendance.no_students_in_group', 'Ushbu guruhda faol talabalar topilmadi'));
            return;
        }

        setIsSubmitting(true);
        router.post(
            '/admin/attendance/mark-group',
            {
                group_id: selectedGroupId,
                date: selectedDate,
                topic,
                attendances: rosterList.map((st) => ({
                    student_id: st.id,
                    status: st.is_attended ? (st.status === 'late' ? 'late' : 'present') : 'absent',
                    manual_reason: st.manual_reason || (st.is_attended ? 'Guruh jurnali orqali' : 'Kelmagan'),
                })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                    toast.success(t('attendance.group_saved', 'Guruh davomati muvaffaqiyatli saqlandi'));
                    onSuccess?.();
                },
                onError: (err) => {
                    setIsSubmitting(false);
                    toast.error((Object.values(err)[0] as string) || t('common.error', 'Xatolik yuz berdi'));
                },
            }
        );
    };

    const filteredRoster = useMemo(() => {
        if (!searchQuery.trim()) return rosterList;
        const query = searchQuery.toLowerCase();
        return rosterList.filter(
            (s) =>
                s.full_name.toLowerCase().includes(query) ||
                (s.phone && s.phone.toLowerCase().includes(query))
        );
    }, [rosterList, searchQuery]);

    const presentCount = rosterList.filter((s) => s.is_attended).length;
    const currentGroupName = groupName || groups?.find((g) => g.id === Number(selectedGroupId))?.name || '';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <DialogHeader className="pb-2 border-b">
                    <DialogTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span>{t('attendance.group_journal_modal_title', 'Guruh Davomat Jurnali')}</span>
                            {currentGroupName && (
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                                    {currentGroupName}
                                </span>
                            )}
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-3 pt-2">
                    {/* Top Row: Group selector (if multi-group), Date Picker, Topic */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {groups && groups.length > 1 ? (
                            <div>
                                <Label htmlFor="modal_group_select" required className="text-xs mb-1 block">
                                    {t('attendance.select_group', 'Guruhni tanlang')}
                                </Label>
                                <SearchableSelect
                                    id="modal_group_select"
                                    value={selectedGroupId}
                                    onChange={(val) => setSelectedGroupId(val)}
                                    options={groups.map((g) => ({ value: g.id, label: g.name }))}
                                    placeholder={t('attendance.select_group', 'Guruhni tanlang')}
                                    required
                                />
                            </div>
                        ) : (
                            <div>
                                <Label className="text-xs mb-1 block text-muted-foreground">
                                    {t('attendance.group', 'Guruh')}
                                </Label>
                                <div className="h-9 px-3 py-1.5 rounded-md border bg-muted/50 text-xs font-medium flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="truncate">{currentGroupName || '-'}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="modal_roster_date" required className="text-xs mb-1 block">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    {t('attendance.date', 'Sana')}
                                </span>
                            </Label>
                            <DatePicker
                                id="modal_roster_date"
                                value={selectedDate}
                                onChange={(val) => setSelectedDate(val)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="modal_roster_topic" className="text-xs mb-1 block">
                                <span className="flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                    {t('attendance.lesson_topic', 'Dars mavzusi')}
                                </span>
                            </Label>
                            <Input
                                id="modal_roster_topic"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={t('attendance.theory_lesson', 'Nazariy dars...')}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Quick Stats, Check/Uncheck actions & Search Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border text-xs">
                        <div className="flex items-center gap-3">
                            <span className="font-semibold text-foreground">
                                {t('attendance.present_stats', '{{present}} / {{total}} ta talaba bor ({{percent}}%)', {
                                    present: presentCount,
                                    total: rosterList.length,
                                    percent: rosterList.length > 0 ? Math.round((presentCount / rosterList.length) * 100) : 0,
                                })}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative w-44 sm:w-56">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('common.search', 'Qidirish...')}
                                    className="h-7 text-xs pl-8 pr-2"
                                />
                            </div>

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

                    {/* Students Roster Table */}
                    <div className="border rounded-lg overflow-hidden flex-1 min-h-[220px] max-h-[420px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/60 sticky top-0 z-10">
                                    <TableHead className="w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={rosterList.length > 0 && rosterList.every((s) => s.is_attended)}
                                            onChange={(e) => (e.target.checked ? handleCheckAll() : handleUncheckAll())}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            title={t('attendance.check_all', 'Barchasini belgilash')}
                                        />
                                    </TableHead>
                                    <TableHead className="w-8 font-semibold">№</TableHead>
                                    <TableHead className="font-semibold">{t('attendance.student', 'Talaba')}</TableHead>
                                    <TableHead className="font-semibold w-48 text-center">{t('attendance.status', 'Holat')}</TableHead>
                                    <TableHead className="font-semibold">{t('attendance.notes_placeholder', 'Izoh (ixtiyoriy)')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="w-5 h-5 mx-auto animate-spin mb-1 text-blue-600" />
                                            {t('attendance.loading_roster', 'Guruh ro\'yxati yuklanmoqda...')}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRoster.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                                            {t('attendance.no_students_in_group', 'Ushbu guruhda faol talabalar topilmadi')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRoster.map((st, idx) => (
                                        <TableRow
                                            key={st.id}
                                            className={`transition-colors ${
                                                st.is_attended
                                                    ? 'bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/20'
                                                    : 'hover:bg-muted/40'
                                            }`}
                                        >
                                            <TableCell className="text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={st.is_attended}
                                                    onChange={() => handleToggleStudent(st.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                                            <TableCell>
                                                <p className="font-medium text-xs text-foreground">{st.full_name}</p>
                                                <p className="text-[11px] text-muted-foreground font-mono">{st.phone || '-'}</p>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetStatus(st.id, 'present')}
                                                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                                            st.status === 'present'
                                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                                : 'bg-muted text-muted-foreground hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950/60'
                                                        }`}
                                                    >
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {t('attendance.present', 'Bor')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetStatus(st.id, 'late')}
                                                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                                            st.status === 'late'
                                                                ? 'bg-amber-500 text-white shadow-xs'
                                                                : 'bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/60'
                                                        }`}
                                                    >
                                                        <Clock className="w-3 h-3" />
                                                        {t('attendance.late', 'Kech')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetStatus(st.id, 'absent')}
                                                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                                            st.status === 'absent'
                                                                ? 'bg-rose-600 text-white shadow-xs'
                                                                : 'bg-muted text-muted-foreground hover:bg-rose-100 hover:text-rose-800 dark:hover:bg-rose-950/60'
                                                        }`}
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                        {t('attendance.absent', 'Yo\'q')}
                                                    </button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={st.manual_reason || ''}
                                                    onChange={(e) => handleUpdateReason(st.id, e.target.value)}
                                                    placeholder={t('attendance.notes_placeholder', 'Izoh...')}
                                                    className="h-7 text-xs"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="pt-2 border-t flex flex-row items-center justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                            {t('common.cancel', 'Bekor qilish')}
                        </Button>
                        <Button type="submit" variant="brand" size="sm" disabled={isSubmitting || isLoading || rosterList.length === 0}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    {t('common.saving', 'Saqlanmoqda...')}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                    {t('attendance.save_roster', 'Davomatni Saqlash')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
