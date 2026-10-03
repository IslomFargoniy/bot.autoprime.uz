import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import {
    Trash2,
    Edit2,
    Plus,
    Eye,
    Download,
    GraduationCap,
} from 'lucide-react';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import { DigitsInput } from '@/components/ui/digits-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
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
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableEmpty,
} from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import { formatPhone } from '@/lib/input-masks';
import type { Branch, SharedData } from '@/types/auth';

interface Group {
    id: number;
    name: string;
    is_active?: boolean;
}

interface Student {
    id: number;
    full_name: string;
    phone: string;
    telegram_id?: string;
    status?: 'active' | 'graduated' | 'dropped';
    group_id?: number;
    group?: Group;
    branch_id?: number | null;
    branch?: Branch | null;
    completed_drivings_count?: number;
}

interface PageProps {
    students: {
        data: Student[];
        links?: any[];
        total?: number;
        from?: number;
        to?: number;
        per_page?: number;
    };
    groups: Group[];
    branches?: Branch[];
    filters?: {
        search?: string;
        group_id?: string;
        per_page?: string;
    };
}

export default function StudentsIndex({
    students,
    groups,
    branches = [],
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = !!auth?.is_super_admin;

    const [editing, setEditing] = useState<Student | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    const [search, setSearch] = useState(filters.search || '');
    const [groupId, setGroupId] = useState(filters.group_id || '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const applyFilters = (
        newSearch: string,
        newGroup: string,
        newPerPage: string,
    ) => {
        router.get(
            '/admin/students',
            { search: newSearch, group_id: newGroup, per_page: newPerPage },
            { preserveState: true, replace: true },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(search, groupId, perPage);
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
        full_name: '',
        phone: '',
        telegram_id: '',
        group_id: '',
        branch_id: '' as string | number,
        status: 'active' as string,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (processing) {
            return;
        }

        if (editing) {
            put('/admin/students/' + editing.id, {
                onSuccess: () => {
                    closeForm();
                    toast.success(
                        t(
                            'students.updated_success',
                            "O'quvchi muvaffaqiyatli yangilandi",
                        ),
                    );
                },
                onError: (err) => {
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('students.error', 'Xatolik yuz berdi'),
                    );
                },
            });
        } else {
            post('/admin/students', {
                onSuccess: () => {
                    closeForm();
                    toast.success(
                        t(
                            'students.created_success',
                            "O'quvchi muvaffaqiyatli yaratildi",
                        ),
                    );
                },
                onError: (err) => {
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('students.error', 'Xatolik yuz berdi'),
                    );
                },
            });
        }
    };

    const handleEdit = (student: Student) => {
        setEditing(student);
        setData({
            full_name: student.full_name,
            phone: student.phone,
            telegram_id: student.telegram_id || '',
            group_id: student.group_id ? String(student.group_id) : '',
            branch_id: student.branch_id ? String(student.branch_id) : '',
            status: student.status || 'active',
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
            destroy('/admin/students/' + id, {
                onSuccess: () =>
                    toast.success(
                        t('students.deleted_success', "O'quvchi o'chirildi"),
                    ),
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('students.error', 'Xatolik yuz berdi'),
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

    const handleExport = () => {
        const params = new URLSearchParams();

        if (search) {
            params.append('search', search);
        }

        if (groupId) {
            params.append('group_id', groupId);
        }

        window.location.href = `/admin/students/export?${params.toString()}`;
    };

    return (
        <div className="p-6">
            <Head title={t('students.title', "O'quvchilar")} />

            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('students.title', "O'quvchilar")}
                </h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="shrink-0 md:px-4 md:py-2"
                    >
                        <Download className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">
                            {t('common.export_excel', 'Excel yuklab olish')}
                        </span>
                    </Button>
                    {can('students.create') && (
                        <Button
                            onClick={() => setShowForm(true)}
                            variant="brand"
                            className="shrink-0 gap-1.5 md:w-auto md:px-4 md:py-2"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden md:inline">
                                {t('common.add', "Qo'shish")}
                            </span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <PageFilterBar className="mb-6">
                <div className="hidden flex-1 items-center gap-2 md:flex">
                    <SearchableSelect
                        value={groupId}
                        onChange={(val) => {
                            setGroupId(val);
                            applyFilters(search, val, perPage);
                        }}
                        options={[
                            {
                                value: '',
                                label: t(
                                    'students.all_groups',
                                    'Barcha guruhlar',
                                ),
                            },
                            ...groups.map((grp) => ({
                                value: grp.id,
                                label: grp.name,
                            })),
                        ]}
                        placeholder={t(
                            'students.all_groups',
                            'Barcha guruhlar',
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
                        placeholder={t(
                            'students.search_placeholder',
                            'Ism, telefon yoki pasport...',
                        )}
                        perPage={perPage}
                        onPerPageChange={(val) => {
                            setPerPage(val);
                            applyFilters(search, groupId, val);
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
                                            'students.filter_desc',
                                            "O'quvchilarni filtrlash",
                                        )}
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mt-2 grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>
                                            {t('students.group', 'Guruh')}
                                        </Label>
                                        <SearchableSelect
                                            value={groupId}
                                            onChange={(val) => {
                                                setGroupId(val);
                                                applyFilters(
                                                    search,
                                                    val,
                                                    perPage,
                                                );
                                            }}
                                            options={[
                                                {
                                                    value: '',
                                                    label: t(
                                                        'students.all_groups',
                                                        'Barcha guruhlar',
                                                    ),
                                                },
                                                ...groups.map((grp) => ({
                                                    value: grp.id,
                                                    label: grp.name,
                                                })),
                                            ]}
                                            placeholder={t(
                                                'students.all_groups',
                                                'Barcha guruhlar',
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
                            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span>
                                {editing
                                    ? t(
                                          'students.edit',
                                          "O'quvchini tahrirlash",
                                      )
                                    : t(
                                          'students.new',
                                          "Yangi o'quvchi qo'shish",
                                      )}
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'students.form_desc',
                                "O'quvchi ma'lumotlarini kiriting",
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="full_name" required>
                                {t('students.full_name', 'F.I.SH')}
                            </Label>
                            <Input
                                id="full_name"
                                value={data.full_name}
                                onChange={(e) =>
                                    setData('full_name', e.target.value)
                                }
                                required
                            />
                            {errors.full_name && (
                                <div className="mt-1 text-xs text-destructive">
                                    {errors.full_name}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" required>
                                    {t('students.phone', 'Telefon')}
                                </Label>
                                <PhoneInput
                                    id="phone"
                                    value={data.phone}
                                    onChange={(val) => setData('phone', val)}
                                    required
                                />
                                {errors.phone && (
                                    <div className="mt-1 text-xs text-destructive">
                                        {errors.phone}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="telegram_id">
                                    {t(
                                        'common.telegram_id_optional',
                                        'Telegram ID',
                                    )}
                                </Label>
                                <DigitsInput
                                    id="telegram_id"
                                    value={data.telegram_id}
                                    onChange={(val) =>
                                        setData('telegram_id', val)
                                    }
                                    maxLength={15}
                                    placeholder="12345678"
                                />
                                {errors.telegram_id && (
                                    <div className="mt-1 text-xs text-destructive">
                                        {errors.telegram_id}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div
                            className={
                                isSuperAdmin
                                    ? 'grid grid-cols-2 gap-3'
                                    : 'space-y-1.5'
                            }
                        >
                            <div className="space-y-1.5">
                                <Label htmlFor="group_id">
                                    {t('students.group', 'Guruh')}
                                </Label>
                                <SearchableSelect
                                    id="group_id"
                                    value={data.group_id}
                                    onChange={(val) => setData('group_id', val)}
                                    options={groups
                                        .filter(
                                            (grp) =>
                                                grp.is_active !== false ||
                                                String(grp.id) ===
                                                    data.group_id,
                                        )
                                        .map((grp) => ({
                                            value: grp.id,
                                            label: grp.name,
                                        }))}
                                    placeholder={t(
                                        'common.select',
                                        '-- Tanlang --',
                                    )}
                                    allowClear
                                />
                                {errors.group_id && (
                                    <div className="mt-1 text-xs text-destructive">
                                        {errors.group_id}
                                    </div>
                                )}
                            </div>
                            {editing && editing.status !== 'graduated' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="student_status">
                                        {t('students.status', 'Holat')}
                                    </Label>
                                    <SearchableSelect
                                        id="student_status"
                                        value={data.status}
                                        onChange={(val) =>
                                            setData('status', String(val))
                                        }
                                        options={[
                                            {
                                                value: 'active',
                                                label: t(
                                                    'students.status_active',
                                                    'Faol',
                                                ),
                                            },
                                            {
                                                value: 'dropped',
                                                label: t(
                                                    'students.status_dropped',
                                                    "O'qishni tashlagan",
                                                ),
                                            },
                                        ]}
                                    />
                                    {errors.status && (
                                        <div className="mt-1 text-xs text-destructive">
                                            {errors.status}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isSuperAdmin && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch_id">
                                        {t('branches.branch', 'Filial')}
                                    </Label>
                                    <SearchableSelect
                                        id="branch_id"
                                        value={data.branch_id}
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
                                        <div className="mt-1 text-xs text-destructive">
                                            {errors.branch_id}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeForm}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                variant="brand"
                            >
                                {processing
                                    ? t('common.saving', 'Saqlanmoqda...')
                                    : t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Desktop Table */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('common.number', '№')}</TableHead>
                            <TableHead>
                                {t('students.full_name', 'F.I.SH')}
                            </TableHead>
                            <TableHead>
                                {t('branches.branch', 'Filial')}
                            </TableHead>
                            <TableHead>
                                {t('students.phone', 'Telefon')}
                            </TableHead>
                            <TableHead>
                                {t('students.group', 'Guruh')}
                            </TableHead>
                            <TableHead>
                                {t('common.telegram_id', 'Telegram ID')}
                            </TableHead>
                            <TableHead className="text-center">
                                {t(
                                    'students.completed_drivings',
                                    'Tugagan darslar',
                                )}
                            </TableHead>
                            <TableHead className="text-right">
                                {t('common.actions', 'Amallar')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.data.length === 0 ? (
                            <TableEmpty
                                icon={GraduationCap}
                                title={t(
                                    'common.empty_state_title',
                                    "Ma'lumot topilmadi",
                                )}
                                description={t(
                                    'common.empty_state_desc',
                                    "Qidiruv parametrlarini o'zgartirib ko'ring",
                                )}
                                colSpan={8}
                            />
                        ) : (
                            students.data.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {(students.from || 1) + index}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        <Link
                                            href={`/admin/students/${item.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            {item.full_name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {item.branch?.name || '-'}
                                    </TableCell>
                                    <TableCell>{formatPhone(item.phone)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {item.group?.name ||
                                            t(
                                                'students.no_group',
                                                'Biriktirilmagan',
                                            )}
                                    </TableCell>
                                    <TableCell className="font-mono text-muted-foreground">
                                        {item.telegram_id || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            {item.completed_drivings_count || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                            >
                                                <Link
                                                    href={`/admin/students/${item.id}`}
                                                >
                                                    <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </Link>
                                            </Button>
                                            {(can('students.edit') ||
                                                can('students.delete')) && (
                                                <>
                                                    {can('students.edit') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleEdit(item)
                                                            }
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {can('students.delete') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    item.id,
                                                                )
                                                            }
                                                            disabled={
                                                                isDeleting ===
                                                                item.id
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
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
                {students.data.map((item) => (
                    <div
                        key={item.id}
                        className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <Link
                                    href={`/admin/students/${item.id}`}
                                    className="text-lg font-semibold text-primary hover:underline"
                                >
                                    {item.full_name}
                                </Link>
                                <div className="text-sm text-muted-foreground">
                                    {formatPhone(item.phone)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="block text-xs text-muted-foreground">
                                    {t('students.group', 'Guruh')}:
                                </span>
                                <div className="font-medium">
                                    <div className="mt-0.5 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        {item.group?.name ||
                                            t(
                                                'students.no_group',
                                                'Biriktirilmagan',
                                            )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs text-muted-foreground">
                                    {t('common.telegram_id', 'Telegram ID')}:
                                </span>
                                <div className="font-medium">
                                    {item.telegram_id || '-'}
                                </div>
                            </div>
                            <div className="col-span-2 mt-1 border-t pt-1">
                                <div className="flex items-center justify-between">
                                    <span className="block text-xs text-muted-foreground">
                                        {t(
                                            'students.completed_drivings',
                                            'Tugagan darslar',
                                        )}
                                        :
                                    </span>
                                    <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        {item.completed_drivings_count || 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="icon"
                                asChild
                                title={t('common.view', "Ko'rish")}
                            >
                                <Link href={`/admin/students/${item.id}`}>
                                    <Eye className="h-4 w-4" />
                                </Link>
                            </Button>
                            {(can('students.edit') ||
                                can('students.delete')) && (
                                <>
                                    {can('students.edit') && (
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
                                    )}
                                    {can('students.delete') && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="border-destructive/20 text-destructive hover:bg-destructive/10"
                                            onClick={() =>
                                                handleDelete(item.id)
                                            }
                                            disabled={isDeleting === item.id}
                                            title={t(
                                                'common.delete',
                                                "O'chirish",
                                            )}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Pagination
                links={students.links}
                total={students.total}
                from={students.from}
                to={students.to}
            />
        </div>
    );
}
