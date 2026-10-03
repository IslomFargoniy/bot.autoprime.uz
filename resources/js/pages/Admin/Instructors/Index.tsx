import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import {
    Trash2,
    Edit2,
    Plus,
    AlertTriangle,
    Star,
    Filter,
    Download,
    Eye,
    User as UserIcon,
    Car,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFilterBar, PageFilterSearch } from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import PasswordInput from '@/components/password-input';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
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
import type { SharedData, Branch } from '@/types/auth';

interface Instructor {
    id: number;
    name: string;
    phone: string;
    telegram_id?: string;
    car_name?: string;
    photo_url?: string;
    branch_id?: number | null;
    branch?: Branch | null;
    kpi_percentage: number;
    groups_count: number;
    students_count: number;
    total_drivings: number;
    completed_drivings: number;
    scheduled_drivings: number;
    reviewed_drivings: number;
    total_score: number;
    average_rating: number;
    negative_tags_count: number;
    is_low_rating: boolean;
    needs_attention: boolean;
}

interface PageProps {
    instructors: {
        data: Instructor[];
        links: any[];
        total?: number;
        from?: number;
        to?: number;
    };
    branches?: Branch[];
    filters?: {
        search?: string;
        from?: string;
        to?: string;
        per_page?: string;
    };
}

export default function InstructorsIndex({
    instructors,
    branches = [],
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = !!auth?.is_super_admin;

    const [editing, setEditing] = useState<Instructor | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const {
        data,
        setData,
        post,
        delete: destroy,
        reset,
        errors,
        processing,
    } = useForm({
        name: '',
        phone: '',
        telegram_id: '',
        car_name: '',
        branch_id: '' as string | number,
        photo: null as File | null,
        password: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/instructors',
            { search, from, to, per_page: perPage },
            { preserveState: true, replace: true },
        );
    };

    const handleExport = () => {
        const params = new URLSearchParams();

        if (search) {
            params.append('search', search);
        }

        if (from) {
            params.append('from', from);
        }

        if (to) {
            params.append('to', to);
        }

        window.location.href = `/admin/instructors/export?${params.toString()}`;
    };

    const handleEdit = (instructor: Instructor) => {
        setEditing(instructor);
        setData({
            name: instructor.name,
            phone: instructor.phone,
            telegram_id: instructor.telegram_id || '',
            car_name: instructor.car_name || '',
            branch_id: instructor.branch_id || '',
            photo: null,
            password: '',
        });
        setPhotoPreview(instructor.photo_url || null);
        setShowForm(true);
    };

    const handleDelete = (id: number) => {
        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            setIsDeleting(id);
            destroy(`/admin/instructors/${id}`, {
                onSuccess: () => {
                    toast.success(
                        t(
                            'instructors.deleted_success',
                            "Instruktor muvaffaqiyatli o'chirildi",
                        ),
                    );
                },
                onError: (err) => {
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('instructors.error', 'Xatolik yuz berdi'),
                    );
                },
                onFinish: () => setIsDeleting(null),
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (file) {
            setData('photo', file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (processing) {
            return;
        }

        if (editing) {
            router.post(
                `/admin/instructors/${editing.id}`,
                {
                    _method: 'put',
                    ...data,
                },
                {
                    onSuccess: () => {
                        closeForm();
                        toast.success(
                            t(
                                'instructors.updated_success',
                                'Instruktor muvaffaqiyatli yangilandi',
                            ),
                        );
                    },
                    onError: (err) => {
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('instructors.error', 'Xatolik yuz berdi'),
                        );
                    },
                },
            );
        } else {
            post('/admin/instructors', {
                forceFormData: true,
                onSuccess: () => {
                    closeForm();
                    toast.success(
                        t(
                            'instructors.created_success',
                            'Instruktor muvaffaqiyatli yaratildi',
                        ),
                    );
                },
                onError: (err) => {
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('instructors.error', 'Xatolik yuz berdi'),
                    );
                },
            });
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
        setPhotoPreview(null);
        reset();
    };

    return (
        <div className="p-6">
            <Head title={t('instructors.title', 'Instruktorlar')} />

            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('instructors.title', 'Instruktorlar')}
                </h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">
                            {t('common.download_excel', 'Excel yuklab olish')}
                        </span>
                    </Button>
                    {can('users.manage') && (
                        <Button
                            onClick={() => setShowForm(true)}
                            variant="brand"
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            <span>{t('common.add', "Qo'shish")}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters Bar Card */}
            <PageFilterBar className="mb-6">
                <div className="hidden flex-1 items-center gap-2 md:flex">
                    <DatePicker
                        value={from}
                        onChange={(val) => {
                            setFrom(val);
                            router.get(
                                '/admin/instructors',
                                { search, from: val, to, per_page: perPage },
                                { preserveState: true, replace: true },
                            );
                        }}
                        className="w-36"
                    />
                    <DatePicker
                        value={to}
                        onChange={(val) => {
                            setTo(val);
                            router.get(
                                '/admin/instructors',
                                { search, from, to: val, per_page: perPage },
                                { preserveState: true, replace: true },
                            );
                        }}
                        className="w-36"
                    />
                </div>

                <div className="flex w-full items-center gap-2 md:w-auto">
                    <PageFilterSearch
                        value={search}
                        onChange={setSearch}
                        onSubmit={handleSearch}
                        placeholder={t(
                            'instructors.search_placeholder',
                            'Ism, tel yoki mashina...',
                        )}
                        perPage={perPage}
                        onPerPageChange={(val) => {
                            setPerPage(val);
                            router.get(
                                '/admin/instructors',
                                { search, from, to, per_page: val },
                                { preserveState: true, replace: true },
                            );
                        }}
                    >
                        {/* Mobile Filter Drawer */}
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
                                className="h-[80vh] rounded-t-xl"
                            >
                                <SheetHeader>
                                    <SheetTitle>
                                        {t('common.filter', 'Filtrlar')}
                                    </SheetTitle>
                                    <SheetDescription className="sr-only">
                                        {t('common.filter', 'Filtrlar')}
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="space-y-4 py-4">
                                    <div>
                                        <Label>
                                            {t(
                                                'common.per_page',
                                                "Ko'rsatish soni",
                                            )}
                                        </Label>
                                        <div className="mt-1">
                                            <PerPageSelect
                                                value={perPage}
                                                onChange={(val) =>
                                                    setPerPage(val)
                                                }
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>{t('common.from', 'Dan')}</Label>
                                        <DatePicker
                                            value={from}
                                            onChange={(val) => setFrom(val)}
                                            className="mt-1 w-full"
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('common.to', 'Gacha')}</Label>
                                        <DatePicker
                                            value={to}
                                            onChange={(val) => setTo(val)}
                                            className="mt-1 w-full"
                                        />
                                    </div>
                                    <Button
                                        className="mt-4 w-full"
                                        onClick={() =>
                                            router.get('/admin/instructors', {
                                                search,
                                                from,
                                                to,
                                                per_page: perPage,
                                            })
                                        }
                                    >
                                        {t('common.apply', "Qo'llash")}
                                    </Button>
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
                            <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span>
                                {editing
                                    ? t('common.edit', 'Tahrirlash')
                                    : t('instructors.new', 'Yangi Instruktor')}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing
                                ? t('common.edit', 'Tahrirlash')
                                : t('common.add', "Qo'shish")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Instructor preview"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <Label
                                htmlFor="photo"
                                className="cursor-pointer text-xs text-primary hover:underline"
                            >
                                {t('instructors.upload_photo', 'Rasm yuklash')}
                            </Label>
                            <Input
                                id="photo"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {errors.photo && (
                                <div className="mt-1 text-xs text-destructive">
                                    {errors.photo}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="name" required>
                                {t('instructors.name', 'F.I.SH')}
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
                                <div className="mt-1 text-xs text-destructive">
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" required>
                                    {t('instructors.phone', 'Telefon')}
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
                                    {t('common.telegram_id', 'Telegram ID')}
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
                                <Label htmlFor="car_name">
                                    {t(
                                        'instructors.car_name',
                                        'Biriktirilgan mashina',
                                    )}
                                </Label>
                                <Input
                                    id="car_name"
                                    value={data.car_name}
                                    onChange={(e) =>
                                        setData('car_name', e.target.value)
                                    }
                                    placeholder="Gentra 01 A 777 AA"
                                />
                                {errors.car_name && (
                                    <div className="mt-1 text-xs text-destructive">
                                        {errors.car_name}
                                    </div>
                                )}
                            </div>
                            {isSuperAdmin && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch_id">
                                        {t('branches.branch', 'Filial')}
                                    </Label>
                                    <SearchableSelect
                                        id="branch_id"
                                        value={data.branch_id}
                                        onChange={(val) =>
                                            setData(
                                                'branch_id',
                                                val ? String(val) : '',
                                            )
                                        }
                                        options={[
                                            {
                                                value: '',
                                                label: t(
                                                    'branches.branch_optional',
                                                    'Filial (Ixtiyoriy)',
                                                ),
                                            },
                                            ...branches.map((b) => ({
                                                value: b.id,
                                                label: b.name,
                                            })),
                                        ]}
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

                        <div className="space-y-1.5">
                            <Label htmlFor="password" required={!editing}>
                                {editing
                                    ? t(
                                          'instructors.password_edit',
                                          "Parol (o'zgartirish uchun)",
                                      )
                                    : t('instructors.password', 'Parol')}
                            </Label>
                            <PasswordInput
                                id="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                placeholder={
                                    editing
                                        ? '••••••••'
                                        : t(
                                              'instructors.password_placeholder',
                                              'Parolni kiriting',
                                          )
                                }
                                required={!editing}
                            />
                            {errors.password && (
                                <p className="text-xs text-destructive">
                                    {errors.password}
                                </p>
                            )}
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
                                {t('instructors.name', 'Instruktor')}
                            </TableHead>
                            <TableHead>
                                {t('branches.branch', 'Filial')}
                            </TableHead>
                            <TableHead>
                                {t('instructors.car', 'Mashina')}
                            </TableHead>
                            <TableHead className="text-center">
                                {t('instructors.groups_count', 'Guruhlar')}
                            </TableHead>
                            <TableHead className="text-center">
                                {t('instructors.students_count', "O'quvchilar")}
                            </TableHead>
                            <TableHead className="text-center">
                                {t('instructors.drivings_count', 'Darslar')}
                            </TableHead>
                            <TableHead className="text-center">
                                {t('instructors.rating', 'Reyting')}
                            </TableHead>
                            <TableHead className="text-center">
                                {t('instructors.kpi', 'KPI')}
                            </TableHead>
                            <TableHead className="text-right">
                                {t('common.actions', 'Amallar')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {instructors.data.length === 0 ? (
                            <TableEmpty
                                icon={UserIcon}
                                title={t(
                                    'common.empty_state_title',
                                    "Ma'lumot topilmadi",
                                )}
                                description={t(
                                    'common.empty_state_desc',
                                    "Qidiruv parametrlarini o'zgartirib ko'ring",
                                )}
                                colSpan={10}
                            />
                        ) : (
                            instructors.data.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {(instructors.from || 1) + index}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        <Link
                                            href={`/admin/instructors/${item.id}`}
                                            className="group flex items-center gap-3"
                                        >
                                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted">
                                                {item.photo_url ? (
                                                    <img
                                                        src={item.photo_url}
                                                        alt={item.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                        <UserIcon className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 transition-colors group-hover:text-primary">
                                                    {item.needs_attention && (
                                                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                                                    )}
                                                    <span className="font-semibold">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {formatPhone(item.phone)}
                                                </div>
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {item.branch?.name || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {item.car_name ? (
                                            <div className="flex w-fit items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium">
                                                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span>{item.car_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {t('common.none', "Yo'q")}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.groups_count}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.students_count}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="space-y-0.5 text-xs font-medium whitespace-nowrap">
                                            <div className="text-blue-600 dark:text-blue-400">
                                                {item.total_drivings}{' '}
                                                {t(
                                                    'instructors.scheduled_drivings',
                                                    'dars belgilangan',
                                                )}
                                            </div>
                                            <div className="text-green-600 dark:text-green-400">
                                                {item.completed_drivings}{' '}
                                                {t(
                                                    'instructors.completed_drivings',
                                                    'ta yakunlangan',
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div
                                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                                    item.reviewed_drivings >
                                                        0 &&
                                                    item.average_rating <= 3
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-amber-600 dark:text-amber-400'
                                                }`}
                                            >
                                                {item.reviewed_drivings > 0 &&
                                                item.average_rating <= 3 ? (
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                                                ) : (
                                                    <Star className="h-3.5 w-3.5 shrink-0 fill-current" />
                                                )}
                                                <span>
                                                    {item.average_rating}
                                                </span>
                                                <span className="text-[11px] font-normal text-muted-foreground">
                                                    ({item.reviewed_drivings})
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                                                item.kpi_percentage >= 80
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : item.kpi_percentage >= 50
                                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }`}
                                        >
                                            {item.kpi_percentage}%
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Link
                                                href={`/admin/instructors/${item.id}`}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={t(
                                                        'common.view',
                                                        'Batafsil',
                                                    )}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            {can('users.manage') && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(item)
                                                        }
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
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
                {instructors.data.map((item) => (
                    <div
                        key={item.id}
                        className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
                    >
                        <div className="flex items-start justify-between">
                            <Link
                                href={`/admin/instructors/${item.id}`}
                                className="flex items-center gap-3"
                            >
                                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-muted">
                                    {item.photo_url ? (
                                        <img
                                            src={item.photo_url}
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                            <UserIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 text-base font-semibold">
                                        {item.needs_attention && (
                                            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                                        )}
                                        <span>{item.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatPhone(item.phone)}
                                    </div>
                                    {item.car_name && (
                                        <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                            <Car className="h-3 w-3" />
                                            <span>{item.car_name}</span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                            <span
                                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                                    item.kpi_percentage >= 80
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : item.kpi_percentage >= 50
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                            >
                                {item.kpi_percentage}% KPI
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-y py-2.5 text-sm">
                            <div>
                                <span className="block text-xs text-muted-foreground">
                                    {t('instructors.groups_count', 'Guruhlar')}{' '}
                                    /{' '}
                                    {t(
                                        'instructors.students_count',
                                        "O'quvchilar",
                                    )}
                                    :
                                </span>
                                <span className="text-xs font-medium">
                                    {item.groups_count} guruh (
                                    {item.students_count} o'quvchi)
                                </span>
                            </div>
                            <div>
                                <span className="block text-xs text-muted-foreground">
                                    {t(
                                        'instructors.rating',
                                        "O'rtacha reyting",
                                    )}
                                    :
                                </span>
                                <div className="flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    <span>
                                        {item.average_rating} (
                                        {item.reviewed_drivings} baho)
                                    </span>
                                </div>
                            </div>
                            <div className="col-span-2 mt-1 border-t pt-2">
                                <span className="mb-1 block text-xs text-muted-foreground">
                                    {t(
                                        'instructors.drivings_proportion',
                                        'Darslar proporsiyasi',
                                    )}
                                    :
                                </span>
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-blue-600 dark:text-blue-400">
                                        {item.total_drivings}{' '}
                                        {t(
                                            'instructors.scheduled_drivings',
                                            'dars belgilangan',
                                        )}
                                    </span>
                                    <span className="text-green-600 dark:text-green-400">
                                        {item.completed_drivings}{' '}
                                        {t(
                                            'instructors.completed_drivings',
                                            'ta yakunlangan',
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Link href={`/admin/instructors/${item.id}`}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>{t('common.view', 'Batafsil')}</span>
                                </Button>
                            </Link>
                            {can('users.manage') && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleEdit(item)}
                                        title={t('common.edit', 'Tahrirlash')}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-destructive/20 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(item.id)}
                                        disabled={isDeleting === item.id}
                                        title={t('common.delete', "O'chirish")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Pagination
                links={instructors.links}
                total={instructors.total}
                from={instructors.from}
                to={instructors.to}
            />
        </div>
    );
}
