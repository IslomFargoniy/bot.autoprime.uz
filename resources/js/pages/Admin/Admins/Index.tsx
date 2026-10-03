import { Head, useForm, router, usePage } from '@inertiajs/react';
import { Trash2, Edit2, Plus, ShieldCheck } from 'lucide-react';
import { useState, useCallback } from 'react';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { formatPhone } from '@/lib/input-masks';
import type { Branch, SharedData } from '@/types/auth';

interface AdminUser {
    id: number;
    name: string;
    phone: string;
    telegram_id?: string;
    branch_id?: number | null;
    branch?: Branch | null;
    created_at: string;
}

interface PageProps {
    admins: {
        data: AdminUser[];
        links?: any[];
        total?: number;
        from?: number;
        to?: number;
    };
    branches?: Branch[];
    filters?: {
        search?: string;
        branch_id?: string;
        per_page?: string;
    };
}

export default function AdminsIndex({
    admins,
    branches = [],
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: '',
            phone: '',
            telegram_id: '',
            branch_id: '' as string | number,
            password: '',
        });

    const applyFilters = useCallback(
        (newSearch: string, newPerPage: string) => {
            router.get(
                '/admin/admins',
                { search: newSearch, per_page: newPerPage },
                { preserveState: true, replace: true },
            );
        },
        [],
    );

    const handleSearchChange = (value: string) => {
        setSearch(value);
        applyFilters(value, perPage);
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        applyFilters(search, value);
    };

    const openCreateForm = () => {
        setEditingAdmin(null);
        reset();
        clearErrors();
        setIsFormOpen(true);
    };

    const handleEdit = (admin: AdminUser) => {
        setEditingAdmin(admin);
        setData({
            name: admin.name,
            phone: admin.phone,
            telegram_id: admin.telegram_id || '',
            branch_id: admin.branch_id || '',
            password: '',
        });
        clearErrors();
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingAdmin(null);
        reset();
        clearErrors();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (processing) {
            return;
        }

        if (editingAdmin) {
            put(`/admin/admins/${editingAdmin.id}`, {
                onSuccess: () => {
                    closeForm();
                    toast.success(
                        t('common.updated_success', "Ma'lumot yangilandi"),
                    );
                },
                onError: () => {
                    toast.error(t('common.error', 'Xatolik yuz berdi'));
                },
            });
        } else {
            post('/admin/admins', {
                onSuccess: () => {
                    closeForm();
                    toast.success(
                        t('common.created_success', 'Yangi admin yaratildi'),
                    );
                },
                onError: () => {
                    toast.error(t('common.error', 'Xatolik yuz berdi'));
                },
            });
        }
    };

    const handleDelete = (admin: AdminUser) => {
        if (auth.user.id === admin.id) {
            toast.error(
                t(
                    'admins.cannot_delete_self',
                    "O'z hisobingizni o'chira olmaysiz",
                ),
            );

            return;
        }

        if (isDeleting === admin.id) {
            return;
        }

        if (
            confirm(
                t(
                    'common.confirm_delete',
                    "Rostdan ham ushbu adminni o'chirmoqchimisiz?",
                ),
            )
        ) {
            setIsDeleting(admin.id);
            router.delete(`/admin/admins/${admin.id}`, {
                onSuccess: () => {
                    toast.success(
                        t('common.deleted_success', "Admin o'chirildi"),
                    );
                },
                onError: () => {
                    toast.error(t('common.error', 'Xatolik yuz berdi'));
                },
                onFinish: () => {
                    setIsDeleting(null);
                },
            });
        }
    };

    return (
        <div className="p-6">
            <Head title={t('admins.title', 'Adminlar')} />

            {/* Header section */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('admins.title', 'Adminlar')}
                </h1>
                <Button
                    onClick={openCreateForm}
                    variant="brand"
                    size="icon"
                    className="shrink-0 md:w-auto md:px-4 md:py-2"
                >
                    <Plus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">
                        {t('admins.new', 'Yangi Admin')}
                    </span>
                </Button>
            </div>

            {/* Filters Bar */}
            <PageFilterBar className="mb-6">
                <div className="flex-1" />
                <PageFilterSearch
                    value={search}
                    onChange={handleSearchChange}
                    onSubmit={(e) => {
                        e.preventDefault();
                        applyFilters(search, perPage);
                    }}
                    placeholder={t(
                        'admins.search_placeholder',
                        "Ism, email yoki telefon bo'yicha qidiruv...",
                    )}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                />
            </PageFilterBar>

            {/* Dialog Form */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            {editingAdmin
                                ? t('admins.edit', 'Adminni tahrirlash')
                                : t('admins.new', 'Yangi Admin')}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'admins.description',
                                "Admin ma'lumotlarini kiriting",
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="name" required>
                                {t('admins.name', 'F.I.SH')}
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                placeholder="Admin ismi"
                                required
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="phone" required>
                                    {t('admins.phone', 'Telefon raqam')}
                                </Label>
                                <PhoneInput
                                    id="phone"
                                    value={data.phone}
                                    onChange={(val) => setData('phone', val)}
                                    required
                                />
                                {errors.phone && (
                                    <p className="text-sm text-destructive">
                                        {errors.phone}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="telegram_id">
                                    {t('admins.telegram_id', 'Telegram ID')}
                                </Label>
                                <DigitsInput
                                    id="telegram_id"
                                    value={data.telegram_id}
                                    onChange={(val) =>
                                        setData('telegram_id', val)
                                    }
                                    maxLength={15}
                                    placeholder="123456789"
                                />
                                {errors.telegram_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.telegram_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="branch_id" required>
                                {t('branches.branch', 'Filial')}
                            </Label>
                            <SearchableSelect
                                id="branch_id"
                                value={data.branch_id}
                                onChange={(val) =>
                                    setData('branch_id', val ? String(val) : '')
                                }
                                options={branches.map((b) => ({
                                    value: b.id,
                                    label: b.name,
                                }))}
                                placeholder={t('branches.branch', 'Filial')}
                                triggerClassName="h-10 text-sm"
                            />
                            {errors.branch_id && (
                                <p className="text-sm text-destructive">
                                    {errors.branch_id}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" required={!editingAdmin}>
                                {editingAdmin
                                    ? t(
                                          'admins.password_edit',
                                          "Parol (o'zgartirish uchun)",
                                      )
                                    : t('admins.password', 'Parol')}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                placeholder="••••••••"
                                required={!editingAdmin}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">
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

            {/* Table / List Container */}
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
                                    {t('admins.name', 'F.I.SH')}
                                </TableHead>
                                <TableHead>
                                    {t('branches.branch', 'Filial')}
                                </TableHead>
                                <TableHead>
                                    {t('admins.phone', 'Telefon raqam')}
                                </TableHead>
                                <TableHead>
                                    {t('admins.telegram_id', 'Telegram ID')}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('common.actions', 'Amallar')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admins.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={6}
                                    title={t(
                                        'common.no_data',
                                        "Ma'lumot topilmadi",
                                    )}
                                />
                            ) : (
                                admins.data.map((admin, index) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-mono text-muted-foreground">
                                            {(admins.from || 1) + index}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                                                <span>{admin.name}</span>
                                                {auth.user.id === admin.id && (
                                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">
                                                        {t('admins.you', 'Siz')}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {admin.branch?.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {formatPhone(admin.phone)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {admin.telegram_id || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleEdit(admin)
                                                    }
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                {auth.user.id !== admin.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() =>
                                                            handleDelete(admin)
                                                        }
                                                        disabled={
                                                            isDeleting ===
                                                            admin.id
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
                    {admins.data.length > 0 ? (
                        admins.data.map((admin) => (
                            <div
                                key={admin.id}
                                className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold">
                                            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                            <span>{admin.name}</span>
                                            {auth.user.id === admin.id && (
                                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                    ({t('admins.you', 'Siz')})
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 text-sm text-muted-foreground">
                                            {formatPhone(admin.phone)}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    Telegram ID:{' '}
                                    <span className="font-medium text-foreground">
                                        {admin.telegram_id || '-'}
                                    </span>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleEdit(admin)}
                                        title={t('common.edit', 'Tahrirlash')}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-destructive/20 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(admin)}
                                        disabled={
                                            auth.user.id === admin.id ||
                                            isDeleting === admin.id
                                        }
                                        title={t('common.delete', "O'chirish")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            {t('common.no_data', "Ma'lumot topilmadi")}
                        </div>
                    )}
                </div>
            </div>

            <Pagination
                links={admins.links}
                total={admins.total}
                from={admins.from}
                to={admins.to}
            />
        </div>
    );
}
