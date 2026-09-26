import { useState, useCallback } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Plus, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Pagination from '@/components/pagination';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Filter } from 'lucide-react';
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
        from?: number;
    };
    branches?: Branch[];
    filters?: {
        search?: string;
        branch_id?: string;
        per_page?: string;
    };
}

export default function AdminsIndex({ admins, branches = [], filters = {} }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        phone: '',
        telegram_id: '',
        branch_id: '' as string | number,
        password: '',
    });

    const applyFilters = useCallback((newSearch: string, newPerPage: string) => {
        router.get('/admin/admins', { search: newSearch, per_page: newPerPage }, { preserveState: true, replace: true });
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        applyFilters(value, perPage);
    };

    const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
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
        if (processing) return;
        if (editingAdmin) {
            put(`/admin/admins/${editingAdmin.id}`, {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('common.updated_success', 'Ma\'lumot yangilandi'));
                },
                onError: () => {
                    toast.error(t('common.error', 'Xatolik yuz berdi'));
                }
            });
        } else {
            post('/admin/admins', {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('common.created_success', 'Yangi admin yaratildi'));
                },
                onError: () => {
                    toast.error(t('common.error', 'Xatolik yuz berdi'));
                }
            });
        }
    };

    const handleDelete = (admin: AdminUser) => {
        if (auth.user.id === admin.id) {
            toast.error(t('admins.cannot_delete_self', 'O\'z hisobingizni o\'chira olmaysiz'));
            return;
        }
        if (isDeleting === admin.id) return;

        if (confirm(t('common.confirm_delete', 'Rostdan ham ushbu adminni o\'chirmoqchimisiz?'))) {
            setIsDeleting(admin.id);
            router.delete(`/admin/admins/${admin.id}`, {
                onSuccess: () => {
                    toast.success(t('common.deleted_success', 'Admin o\'chirildi'));
                },
                onError: () => {
                    toast.error(t('common.error', 'Xatolik yuz berdi'));
                },
                onFinish: () => {
                    setIsDeleting(null);
                }
            });
        }
    };

    return (
        <div className="p-6">
            <Head title={t('admins.title', 'Adminlar')} />

            {/* Header section */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('admins.title', 'Adminlar')}</h1>
                <Button onClick={openCreateForm} size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                    <Plus className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{t('admins.new', 'Yangi Admin')}</span>
                </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                {/* Desktop Filters */}
                <div className="hidden md:flex gap-2 items-center">
                    <select
                        className="flex h-10 w-full md:w-auto items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={perPage}
                        onChange={handlePerPageChange}
                        title={t('common.per_page', 'Sahifada ko\'rsatish')}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="75">75</option>
                        <option value="all">{t('common.all', 'Barchasi')}</option>
                    </select>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {/* Search Form */}
                    <form onSubmit={(e) => { e.preventDefault(); applyFilters(search, perPage); }} className="flex relative flex-1 md:w-64">
                        <Input
                            placeholder={t('admins.search_placeholder', 'Ism, email yoki telefon bo\'yicha qidiruv...')}
                            value={search}
                            onChange={handleSearchChange}
                            className="pr-8"
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <Search className="w-4 h-4" />
                        </button>
                    </form>

                    {/* Mobile Filters Trigger */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="md:hidden shrink-0">
                                <Filter className="w-4 h-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-xl">
                            <SheetHeader>
                                <SheetTitle>{t('common.filters', 'Filtrlar')}</SheetTitle>
                                <SheetDescription>{t('common.filter', 'Filtrlash')}</SheetDescription>
                            </SheetHeader>
                            <div className="grid gap-4 py-4 mt-2">
                                <div className="space-y-2">
                                    <Label>{t('common.pagination', 'Sahifalash')}</Label>
                                    <select
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={perPage}
                                        onChange={handlePerPageChange}
                                    >
                                        <option value="10">10</option>
                                        <option value="30">30</option>
                                        <option value="50">50</option>
                                        <option value="all">{t('common.all', 'Barchasi')}</option>
                                    </select>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Dialog Form */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAdmin ? t('admins.edit', 'Adminni tahrirlash') : t('admins.new', 'Yangi Admin')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admins.description', 'Admin ma\'lumotlarini kiriting')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('admins.name', 'F.I.SH')}</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="Admin ismi"
                                required
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('admins.phone', 'Telefon raqam')}</Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="+998901234567"
                                required
                            />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="telegram_id">{t('admins.telegram_id', 'Telegram ID (ixtiyoriy)')}</Label>
                            <Input
                                id="telegram_id"
                                value={data.telegram_id}
                                onChange={e => setData('telegram_id', e.target.value)}
                                placeholder="Masalan: 123456789"
                            />
                            {errors.telegram_id && <p className="text-sm text-destructive">{errors.telegram_id}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="branch_id">{t('branches.branch', 'Filial')}</Label>
                            <SearchableSelect
                                id="branch_id"
                                value={data.branch_id}
                                onChange={(val) => setData('branch_id', val ? String(val) : '')}
                                options={[
                                    { value: '', label: t('branches.branch_optional', 'Filial (Ixtiyoriy)') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                                ]}
                                placeholder={t('branches.branch_optional', 'Filial (Ixtiyoriy)')}
                                allowClear
                                triggerClassName="h-10 text-sm"
                            />
                            {errors.branch_id && <p className="text-sm text-destructive">{errors.branch_id}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">
                                {editingAdmin ? t('admins.password_edit', 'Parol (o\'zgartirish uchun)') : t('admins.password', 'Parol')}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                placeholder="••••••••"
                                required={!editingAdmin}
                            />
                            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={closeForm}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? t('common.saving', 'Saqlanmoqda...') : t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Table / List Container */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium">{t('common.number', '№')}</th>
                            <th className="px-4 py-3 font-medium">{t('admins.name', 'F.I.SH')}</th>
                            <th className="px-4 py-3 font-medium">{t('branches.branch', 'Filial')}</th>
                            <th className="px-4 py-3 font-medium">{t('admins.phone', 'Telefon raqam')}</th>
                            <th className="px-4 py-3 font-medium">{t('admins.telegram_id', 'Telegram ID')}</th>
                            <th className="px-4 py-3 font-medium text-right">{t('common.actions', 'Amallar')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {admins.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                    {t('common.no_data', 'Ma\'lumot topilmadi')}
                                </td>
                            </tr>
                        ) : (
                            admins.data.map((admin, index) => (
                                <tr key={admin.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3">{(admins.from || 1) + index}</td>
                                    <td className="px-4 py-3 font-medium">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                                            <span>{admin.name}</span>
                                            {auth.user.id === admin.id && (
                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">
                                                    {t('admins.you', 'Siz')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{admin.branch?.name || '-'}</td>
                                    <td className="px-4 py-3">{admin.phone}</td>
                                    <td className="px-4 py-3 font-mono text-muted-foreground">{admin.telegram_id || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(admin)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            {auth.user.id !== admin.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(admin)}
                                                    disabled={isDeleting === admin.id}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden p-3 space-y-3 bg-muted/20">
                    {admins.data.length > 0 ? (
                        admins.data.map((admin) => (
                            <div key={admin.id} className="p-4 space-y-3 bg-card border rounded-xl shadow-xs">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                            <span>{admin.name}</span>
                                            {auth.user.id === admin.id && (
                                                <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                                                    (Siz)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-0.5">{admin.phone}</div>
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    Telegram ID: <span className="font-medium text-foreground">{admin.telegram_id || '-'}</span>
                                </div>

                                <div className="flex gap-2 justify-end pt-1">
                                    <Button variant="outline" size="icon" onClick={() => handleEdit(admin)} title={t('common.edit', 'Tahrirlash')}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                        onClick={() => handleDelete(admin)}
                                        disabled={auth.user.id === admin.id || isDeleting === admin.id}
                                        title={t('common.delete', 'O\'chirish')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {t('common.no_data', 'Ma\'lumot topilmadi')}
                        </div>
                    )}
                </div>
            </div>

            <Pagination links={admins.links} />
        </div>
    );
}
