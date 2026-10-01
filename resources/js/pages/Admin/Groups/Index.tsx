import { Head, useForm, router, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import {
    Trash2,
    Edit2,
    Plus,
    Eye,
    CheckSquare,
    GraduationCap,
} from 'lucide-react';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import GroupAttendanceModal from '@/components/GroupAttendanceModal';
import { PageFilterBar, PageFilterSearch } from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import type { Branch, SharedData } from '@/types/auth';

interface Instructor {
    id: number;
    name: string;
}

interface Course {
    id: number;
    name: string;
    category?: string;
}

interface Group {
    id: number;
    name: string;
    instructor_id?: number;
    instructor?: Instructor;
    teacher_id?: number | null;
    teacher?: Instructor | null;
    branch_id?: number | null;
    branch?: Branch | null;
    course_id?: number | null;
    course?: Course | null;
}

interface PageProps {
    groups: {
        data: Group[];
        links?: any[];
        total?: number;
        from?: number;
        to?: number;
        per_page?: number;
    };
    instructors: Instructor[];
    teachers?: Instructor[];
    branches?: Branch[];
    courses?: Course[];
    filters?: {
        search?: string;
        instructor_id?: string;
        per_page?: string;
    };
}

export default function GroupsIndex({
    groups,
    instructors,
    teachers = [],
    branches = [],
    courses = [],
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const can = useCan();
    const canManageGroups = can('groups.manage');
    const canTakeAttendance = can('attendance.mark_manual');
    const isSuperAdmin = !!auth?.is_super_admin;

    const [editing, setEditing] = useState<Group | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [attendanceGroup, setAttendanceGroup] = useState<Group | null>(null);

    const [search, setSearch] = useState(filters.search || '');
    const [instructorId, setInstructorId] = useState(
        filters.instructor_id || '',
    );
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const applyFilters = (
        newSearch: string,
        newInst: string,
        newPerPage: string,
    ) => {
        router.get(
            '/admin/groups',
            { search: newSearch, instructor_id: newInst, per_page: newPerPage },
            { preserveState: true, replace: true },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(search, instructorId, perPage);
    };

    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        reset,
        errors,
        processing,
    } = useForm({
        name: '',
        instructor_id: '',
        teacher_id: '',
        branch_id: '' as string | number,
        course_id: '' as string | number,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (processing) {
            return;
        }

        if (editing) {
            put('/admin/groups/' + editing.id, {
                onSuccess: () => {
                    closeForm();
                    toast.success(
                        t(
                            'groups.updated_success',
                            'Guruh muvaffaqiyatli yangilandi',
                        ),
                    );
                },
                onError: (err) => {
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('groups.error', 'Xatolik yuz berdi'),
                    );
                },
            });
        } else {
            post('/admin/groups', {
                onSuccess: () => {
                    closeForm();
                    toast.success(
                        t(
                            'groups.created_success',
                            'Guruh muvaffaqiyatli yaratildi',
                        ),
                    );
                },
                onError: (err) => {
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('groups.error', 'Xatolik yuz berdi'),
                    );
                },
            });
        }
    };

    const handleEdit = (group: Group) => {
        setEditing(group);
        setData({
            name: group.name,
            instructor_id: group.instructor_id
                ? String(group.instructor_id)
                : '',
            teacher_id: group.teacher_id ? String(group.teacher_id) : '',
            branch_id: group.branch_id ? String(group.branch_id) : '',
            course_id: group.course_id ? String(group.course_id) : '',
        });
        setShowForm(true);
    };

    const handleDelete = (id: number) => {
        if (isDeleting === id) {
            return;
        }

        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            setIsDeleting(id);
            destroy('/admin/groups/' + id, {
                onSuccess: () =>
                    toast.success(
                        t('groups.deleted_success', "Guruh o'chirildi"),
                    ),
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('groups.error', 'Xatolik yuz berdi'),
                    ),
                onFinish: () => setIsDeleting(null),
            });
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setTimeout(() => {
            setEditing(null);
            reset();
        }, 300);
    };

    return (
        <div className="p-6">
            <Head title={t('groups.title', 'Guruhlar')} />

            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('groups.title', 'Guruhlar')}
                </h1>
                {canManageGroups && (
                    <Button
                        onClick={() => setShowForm(true)}
                        variant="brand"
                        size="icon"
                        className="shrink-0 md:w-auto md:px-4 md:py-2"
                    >
                        <Plus className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">
                            {t('common.add', "Qo'shish")}
                        </span>
                    </Button>
                )}
            </div>

            {/* Filters Bar */}
            <PageFilterBar className="mb-6">
                <div className="hidden flex-1 items-center gap-2 md:flex">
                    <SearchableSelect
                        value={instructorId}
                        onChange={(val) => {
                            const nextVal = val ? String(val) : '';
                            setInstructorId(nextVal);
                            applyFilters(search, nextVal, perPage);
                        }}
                        options={[
                            {
                                value: '',
                                label: t(
                                    'drivings.all_instructors',
                                    'Barcha instruktorlar',
                                ),
                            },
                            ...instructors.map((inst) => ({
                                value: inst.id,
                                label: inst.name,
                            })),
                        ]}
                        placeholder={t(
                            'drivings.all_instructors',
                            'Barcha instruktorlar',
                        )}
                        className="w-56"
                        triggerClassName="h-10 text-sm"
                        allowClear
                    />
                </div>

                <div className="flex w-full items-center gap-2 md:w-auto">
                    <PageFilterSearch
                        value={search}
                        onChange={setSearch}
                        onSubmit={handleSearch}
                        placeholder={t('common.search', 'Qidirish...')}
                        perPage={perPage}
                        onPerPageChange={(val) => {
                            setPerPage(val);
                            applyFilters(search, instructorId, val);
                        }}
                    >
                        {/* Mobile Filters Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 md:hidden"
                                >
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="bottom"
                                className="h-[80vh] overflow-y-auto rounded-t-xl"
                            >
                                <SheetHeader>
                                    <SheetTitle>
                                        {t('common.filters', 'Filtrlar')}
                                    </SheetTitle>
                                    <SheetDescription>
                                        {t(
                                            'groups.filter_desc',
                                            'Guruhlarni filtrlash',
                                        )}
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mt-2 grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>
                                            {t(
                                                'drivings.instructor',
                                                'Instruktor',
                                            )}
                                        </Label>
                                        <SearchableSelect
                                            value={instructorId}
                                            onChange={(val) => {
                                                const nextVal = val
                                                    ? String(val)
                                                    : '';
                                                setInstructorId(nextVal);
                                                applyFilters(
                                                    search,
                                                    nextVal,
                                                    perPage,
                                                );
                                            }}
                                            options={[
                                                {
                                                    value: '',
                                                    label: t(
                                                        'drivings.all_instructors',
                                                        'Barcha instruktorlar',
                                                    ),
                                                },
                                                ...instructors.map((inst) => ({
                                                    value: inst.id,
                                                    label: inst.name,
                                                })),
                                            ]}
                                            placeholder={t(
                                                'drivings.all_instructors',
                                                'Barcha instruktorlar',
                                            )}
                                            triggerClassName="h-10 text-sm"
                                        />
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </PageFilterSearch>
                </div>
            </PageFilterBar>

            <Dialog
                open={showForm}
                onOpenChange={(open) => !open && closeForm()}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                            {editing
                                ? t('common.edit', 'Tahrirlash')
                                : t('groups.new', 'Yangi Guruh')}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing
                                ? t('common.edit', 'Tahrirlash')
                                : t('common.add', "Qo'shish")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name" required>
                                {t('groups.name', 'Nomi')}
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                required
                            />
                            {errors.name && (
                                <div className="mt-1 text-sm text-destructive">
                                    {errors.name}
                                </div>
                            )}
                        </div>
                        {isSuperAdmin && (
                            <div>
                                <Label htmlFor="branch_id">
                                    {t('branches.branch', 'Filial')}
                                </Label>
                                <SearchableSelect
                                    id="branch_id"
                                    value={
                                        data.branch_id
                                            ? String(data.branch_id)
                                            : ''
                                    }
                                    onChange={(val) =>
                                        setData('branch_id', val)
                                    }
                                    options={branches.map((b) => ({
                                        value: b.id,
                                        label: b.name,
                                    }))}
                                    placeholder={t(
                                        'branches.branch_optional',
                                        'Filial (Ixtiyoriy)',
                                    )}
                                    allowClear
                                />
                                {errors.branch_id && (
                                    <div className="mt-1 text-sm text-destructive">
                                        {errors.branch_id}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="course_id">
                                    {t('groups.course', 'LMS Kurs')}
                                </Label>
                                <SearchableSelect
                                    id="course_id"
                                    value={
                                        data.course_id
                                            ? String(data.course_id)
                                            : ''
                                    }
                                    onChange={(val) =>
                                        setData('course_id', val)
                                    }
                                    options={courses.map((c) => ({
                                        value: c.id,
                                        label: `${c.name}${c.category ? ` (${c.category.toUpperCase()})` : ''}`,
                                    }))}
                                    placeholder={t(
                                        'groups.course_optional',
                                        'LMS Kurs (Ixtiyoriy)',
                                    )}
                                    allowClear
                                />
                                {errors.course_id && (
                                    <div className="mt-1 text-sm text-destructive">
                                        {errors.course_id}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="instructor_id">
                                    {t('drivings.instructor', 'Instruktor')}
                                </Label>
                                <SearchableSelect
                                    id="instructor_id"
                                    value={
                                        data.instructor_id
                                            ? String(data.instructor_id)
                                            : ''
                                    }
                                    onChange={(val) =>
                                        setData('instructor_id', val)
                                    }
                                    options={instructors.map((inst) => ({
                                        value: inst.id,
                                        label: inst.name,
                                    }))}
                                    placeholder={t(
                                        'groups.select_instructor',
                                        '-- Tanlang --',
                                    )}
                                    allowClear
                                />
                                {errors.instructor_id && (
                                    <div className="mt-1 text-sm text-destructive">
                                        {errors.instructor_id}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="teacher_id">
                                    {t(
                                        'groups.teacher',
                                        "O'qituvchi (nazariya)",
                                    )}
                                </Label>
                                <SearchableSelect
                                    id="teacher_id"
                                    value={
                                        data.teacher_id
                                            ? String(data.teacher_id)
                                            : ''
                                    }
                                    onChange={(val) =>
                                        setData('teacher_id', val)
                                    }
                                    options={teachers.map((teacher) => ({
                                        value: teacher.id,
                                        label: teacher.name,
                                    }))}
                                    placeholder={t(
                                        'groups.select_instructor',
                                        '-- Tanlang --',
                                    )}
                                    allowClear
                                />
                                {errors.teacher_id && (
                                    <div className="mt-1 text-sm text-destructive">
                                        {errors.teacher_id}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeForm}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={processing}
                            >
                                {processing
                                    ? t('common.saving', 'Saqlanmoqda...')
                                    : t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    {t('common.number', '№')}
                                </TableHead>
                                <TableHead>
                                    {t('groups.name', 'Guruh nomi')}
                                </TableHead>
                                <TableHead>
                                    {t('branches.branch', 'Filial')}
                                </TableHead>
                                <TableHead>
                                    {t('drivings.instructor', 'Instruktor')}
                                </TableHead>
                                <TableHead>
                                    {t(
                                        'groups.teacher',
                                        "O'qituvchi (nazariya)",
                                    )}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('common.actions', 'Amallar')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={6}
                                    title={t(
                                        'common.no_data',
                                        "Ma'lumot topilmadi",
                                    )}
                                />
                            ) : (
                                groups.data.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-muted-foreground">
                                            {(groups.from || 1) + index}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                                <Link
                                                    href={`/admin/groups/${item.id}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {item.name}
                                                </Link>
                                                {item.course && (
                                                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-normal text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                        <GraduationCap className="h-3 w-3" />
                                                        {item.course.name}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {item.branch?.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {item.instructor?.name ||
                                                t(
                                                    'common.not_assigned',
                                                    'Biriktirilmagan',
                                                )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {item.teacher?.name ||
                                                t(
                                                    'common.not_assigned',
                                                    'Biriktirilmagan',
                                                )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {canTakeAttendance && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setAttendanceGroup(
                                                                item,
                                                            )
                                                        }
                                                        className="h-8 border-emerald-300 text-xs text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                                    >
                                                        <CheckSquare className="mr-1 h-3.5 w-3.5" />
                                                        {t(
                                                            'groups.take_attendance',
                                                            'Davomat',
                                                        )}
                                                    </Button>
                                                )}
                                                {canManageGroups && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(item)
                                                            }
                                                            title={t(
                                                                'common.edit',
                                                                'Tahrirlash',
                                                            )}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:bg-destructive/10"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    item.id,
                                                                )
                                                            }
                                                            disabled={
                                                                isDeleting ===
                                                                item.id
                                                            }
                                                            title={t(
                                                                'common.delete',
                                                                "O'chirish",
                                                            )}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 bg-muted/20 p-3 md:hidden">
                    {groups.data.map((item) => (
                        <div
                            key={item.id}
                            className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <Link
                                        href={`/admin/groups/${item.id}`}
                                        className="block text-lg font-semibold text-blue-600 hover:underline"
                                    >
                                        {item.name}
                                    </Link>
                                    {item.course && (
                                        <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-normal text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                            <GraduationCap className="h-3 w-3" />
                                            {item.course.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-sm">
                                <span className="block text-xs text-muted-foreground">
                                    {t('drivings.instructor', 'Instruktor')}:
                                </span>
                                <div className="font-medium">
                                    {item.instructor?.name ||
                                        t(
                                            'common.not_assigned',
                                            'Biriktirilmagan',
                                        )}
                                </div>
                            </div>
                            <div className="text-sm">
                                <span className="block text-xs text-muted-foreground">
                                    {t(
                                        'groups.teacher',
                                        "O'qituvchi (nazariya)",
                                    )}
                                    :
                                </span>
                                <div className="font-medium">
                                    {item.teacher?.name ||
                                        t(
                                            'common.not_assigned',
                                            'Biriktirilmagan',
                                        )}
                                </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between border-t pt-2">
                                {canTakeAttendance && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAttendanceGroup(item)}
                                        className="h-8 border-emerald-300 text-xs text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                    >
                                        <CheckSquare className="mr-1 h-3.5 w-3.5" />
                                        {t('groups.take_attendance', 'Davomat')}
                                    </Button>
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        asChild
                                        title={t('common.view', "Ko'rish")}
                                    >
                                        <Link href={`/admin/groups/${item.id}`}>
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    {canManageGroups && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleEdit(item)}
                                                title={t(
                                                    'common.edit',
                                                    'Tahrirlash',
                                                )}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="border-destructive/20 text-destructive hover:bg-destructive/10"
                                                onClick={() =>
                                                    handleDelete(item.id)
                                                }
                                                disabled={
                                                    isDeleting === item.id
                                                }
                                                title={t(
                                                    'common.delete',
                                                    "O'chirish",
                                                )}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Pagination
                links={groups.links}
                total={groups.total}
                from={groups.from}
                to={groups.to}
            />

            <GroupAttendanceModal
                isOpen={!!attendanceGroup}
                onClose={() => setAttendanceGroup(null)}
                groupId={attendanceGroup?.id}
                groupName={attendanceGroup?.name}
                groups={groups.data.map((g) => ({ id: g.id, name: g.name }))}
            />
        </div>
    );
}
