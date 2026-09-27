import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableEmpty,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import Pagination from '@/components/pagination';
import type { Branch } from '@/types/auth';

interface Props {
    branches: {
        data: Branch[];
        links: any[];
        from: number;
        to: number;
        total: number;
    };
    filters: {
        search?: string;
        per_page?: string;
    };
}

export default function Index({ branches, filters }: Props) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');
    const [isOpen, setIsOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        code: '',
        phone: '',
        address: '',
        status: 'active' as 'active' | 'inactive',
    });

    const applyFilters = (newSearch: string, newPerPage: string) => {
        router.get('/admin/branches', { search: newSearch, per_page: newPerPage }, { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(search, perPage);
    };

    const openCreateModal = () => {
        setEditingBranch(null);
        reset();
        clearErrors();
        setIsOpen(true);
    };

    const openEditModal = (branch: Branch) => {
        setEditingBranch(branch);
        setData({
            name: branch.name,
            code: branch.code,
            phone: branch.phone || '',
            address: branch.address || '',
            status: branch.status,
        });
        clearErrors();
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBranch) {
            put(`/admin/branches/${editingBranch.id}`, {
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                },
            });
        } else {
            post('/admin/branches', {
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (branch: Branch) => {
        if (branch.code === 'main') {
            alert(t('branches.cannot_delete_main', 'Asosiy filialni o\'chirib bo\'lmaydi.'));
            return;
        }
        if (confirm(t('common.confirm_delete', 'Haqiqatdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/branches/${branch.id}`);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Head title={t('branches.title', 'Filiallar')} />

            {/* Header & Primary Action Inline */}
                <div className="flex flex-row items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-primary" />
                        {t('branches.title', 'Filiallar')}
                    </h1>
                    <Button onClick={openCreateModal} variant="brand" className="gap-1.5 shadow-sm">
                        <Plus className="w-4 h-4" />
                        <span>{t('branches.new', 'Yangi filial')}</span>
                    </Button>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex items-center gap-3">
                    <select
                        className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={perPage}
                        onChange={(e) => {
                            setPerPage(e.target.value);
                            applyFilters(search, e.target.value);
                        }}
                        title={t('common.per_page', 'Sahifada ko\'rsatish')}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="75">75</option>
                        <option value="all">{t('common.all', 'Barchasi')}</option>
                    </select>
                    <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={t('common.search_placeholder', 'Qidirish...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-card"
                        />
                    </form>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('branches.name', 'Filial nomi')}</TableHead>
                                <TableHead>{t('branches.code', 'Kodi')}</TableHead>
                                <TableHead>{t('branches.phone', 'Telefon')}</TableHead>
                                <TableHead>{t('branches.address', 'Manzil')}</TableHead>
                                <TableHead className="text-center">{t('branches.users_count', 'Xodimlar')}</TableHead>
                                <TableHead className="text-center">{t('branches.groups_count', 'Guruhlar')}</TableHead>
                                <TableHead className="text-center">{t('branches.students_count', 'O\'quvchilar')}</TableHead>
                                <TableHead>{t('branches.status', 'Holati')}</TableHead>
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {branches.data.length === 0 ? (
                                <TableEmpty
                                    icon={Building2}
                                    title={t('common.empty_state_title', 'Ma\'lumot topilmadi')}
                                    description={t('common.empty_state_desc', 'Qidiruv parametrlarini o\'zgartirib ko\'ring')}
                                    colSpan={9}
                                />
                            ) : (
                                branches.data.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell className="font-semibold text-foreground">{branch.name}</TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{branch.code}</code>
                                        </TableCell>
                                        <TableCell>{branch.phone || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{branch.address || '-'}</TableCell>
                                        <TableCell className="text-center font-semibold">{branch.users_count || 0}</TableCell>
                                        <TableCell className="text-center font-semibold">{branch.groups_count || 0}</TableCell>
                                        <TableCell className="text-center font-semibold">{branch.students_count || 0}</TableCell>
                                        <TableCell>
                                            <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                                                {branch.status === 'active' ? t('branches.active', 'Faol') : t('branches.inactive', 'Nofaol')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(branch)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            {branch.code !== 'main' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(branch)} className="h-8 w-8 text-destructive hover:text-destructive/90">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden space-y-3">
                    {branches.data.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-card border rounded-xl p-6">
                            {t('common.no_data', 'Ma\'lumot topilmadi')}
                        </div>
                    ) : (
                        branches.data.map((branch) => (
                            <div key={branch.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-foreground">{branch.name}</h3>
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{branch.code}</code>
                                    </div>
                                    <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                                        {branch.status === 'active' ? t('branches.active', 'Faol') : t('branches.inactive', 'Nofaol')}
                                    </Badge>
                                </div>
                                <div className="text-xs space-y-1 text-muted-foreground">
                                    {branch.phone && <div>📞 {branch.phone}</div>}
                                    {branch.address && <div>📍 {branch.address}</div>}
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
                                    <div className="bg-muted/40 p-2 rounded">
                                        <div className="font-semibold text-foreground">{branch.users_count || 0}</div>
                                        <div className="text-[10px] text-muted-foreground">{t('branches.users_count', 'Xodimlar')}</div>
                                    </div>
                                    <div className="bg-muted/40 p-2 rounded">
                                        <div className="font-semibold text-foreground">{branch.groups_count || 0}</div>
                                        <div className="text-[10px] text-muted-foreground">{t('branches.groups_count', 'Guruhlar')}</div>
                                    </div>
                                    <div className="bg-muted/40 p-2 rounded">
                                        <div className="font-semibold text-foreground">{branch.students_count || 0}</div>
                                        <div className="text-[10px] text-muted-foreground">{t('branches.students_count', 'O\'quvchilar')}</div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={() => openEditModal(branch)} className="h-8 gap-1 text-xs">
                                        <Edit2 className="w-3.5 h-3.5" />
                                        {t('common.edit', 'Tahrirlash')}
                                    </Button>
                                    {branch.code !== 'main' && (
                                        <Button variant="outline" size="sm" onClick={() => handleDelete(branch)} className="h-8 gap-1 text-xs text-destructive border-destructive/30">
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {t('common.delete', 'O\'chirish')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                <Pagination links={branches.links} />

                {/* Create / Edit Dialog */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span>{editingBranch ? t('branches.edit', 'Filialni tahrirlash') : t('branches.new', 'Yangi filial')}</span>
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch_name" required>{t('branches.name', 'Filial nomi')}</Label>
                                    <Input
                                        id="branch_name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Chilonzor filiali"
                                        required
                                    />
                                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch_code" required>{t('branches.code', 'Filial kodi')}</Label>
                                    <Input
                                        id="branch_code"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                        placeholder="chilonzor"
                                        required
                                    />
                                    {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch_phone">{t('branches.phone', 'Telefon')}</Label>
                                    <Input
                                        id="branch_phone"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="+998901234567"
                                    />
                                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch_status">{t('branches.status', 'Holati')}</Label>
                                    <SearchableSelect
                                        id="branch_status"
                                        value={data.status}
                                        onChange={(val) => setData('status', val as 'active' | 'inactive')}
                                        options={[
                                            { value: 'active', label: t('branches.active', 'Faol') },
                                            { value: 'inactive', label: t('branches.inactive', 'Nofaol') },
                                        ]}
                                    />
                                    {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="branch_address">{t('branches.address', 'Manzil')}</Label>
                                <Input
                                    id="branch_address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Toshkent sh., Chilonzor t., 19-mavze"
                                />
                                {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" disabled={processing} variant="brand">
                                    {t('common.save', 'Saqlash')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
        </div>
    );
}
