import { useState, useCallback } from 'react';
import { Head, useForm, router, Link, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Plus, Search, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Pagination from '@/components/pagination';
import { Branch, SharedData } from '@/types/auth';
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
import { SearchableSelect } from '@/components/ui/searchable-select';

interface Group {
    id: number;
    name: string;
}

interface Student {
    id: number;
    full_name: string;
    phone: string;
    telegram_id?: string;
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
        from?: number;
    };
    groups: Group[];
    branches?: Branch[];
    filters?: {
        search?: string;
        group_id?: string;
        per_page?: string;
    };
}

export default function StudentsIndex({ students, groups, branches = [], filters = {} }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth?.user?.role === 'instructor';
    const isSuperAdmin = auth?.user?.role === 'superadmin' || auth?.user?.id === 1;

    const [editing, setEditing] = useState<Student | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    
    const [search, setSearch] = useState(filters.search || '');
    const [groupId, setGroupId] = useState(filters.group_id || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');

    const applyFilters = (newSearch: string, newGroup: string, newPerPage: string) => {
        router.get('/admin/students', { search: newSearch, group_id: newGroup, per_page: newPerPage }, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(search, groupId, perPage);
    };

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        full_name: '',
        phone: '',
        telegram_id: '',
        group_id: '',
        branch_id: '' as string | number,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return;
        if (editing) {
            put('/admin/students/' + editing.id, {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('students.updated_success', 'O\'quvchi muvaffaqiyatli yangilandi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] as string || t('students.error', 'Xatolik yuz berdi'));
                }
            });
        } else {
            post('/admin/students', {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('students.created_success', 'O\'quvchi muvaffaqiyatli yaratildi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] as string || t('students.error', 'Xatolik yuz berdi'));
                }
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
        });
        setShowForm(true);
    };

    const handleDelete = (id: number) => {
        if (isDeleting === id) return;
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            setIsDeleting(id);
            destroy('/admin/students/' + id, {
                onSuccess: () => toast.success(t('students.deleted_success', 'O\'quvchi o\'chirildi')),
                onError: (err) => toast.error(Object.values(err)[0] as string || t('students.error', 'Xatolik yuz berdi')),
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
        if (search) params.append('search', search);
        if (groupId) params.append('group_id', groupId);

        window.location.href = `/admin/students/export?${params.toString()}`;
    };

    return (
        <div className="p-6">
            <Head title={t('students.title', 'O\'quvchilar')} />
            
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('students.title', 'O\'quvchilar')}</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport} className="shrink-0 md:px-4 md:py-2">
                        <Download className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">{t('common.export_excel', 'Excel yuklab olish')}</span>
                    </Button>
                    {!isInstructor && (
                        <Button onClick={() => setShowForm(true)} size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                            <Plus className="w-4 h-4 md:mr-2" /> 
                            <span className="hidden md:inline">{t('common.add', 'Qo\'shish')}</span>
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                {/* Desktop Filters */}
                <div className="hidden md:flex gap-2 items-center">
                    <select
                        className="flex h-10 w-full md:w-auto items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={perPage}
                        onChange={(e) => {
                            setPerPage(e.target.value);
                            applyFilters(search, groupId, e.target.value);
                        }}
                        title={t('common.per_page', 'Sahifada ko\'rsatish')}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="75">75</option>
                        <option value="all">{t('common.all', 'Barchasi')}</option>
                    </select>
                    <SearchableSelect
                        value={groupId}
                        onChange={(val) => {
                            setGroupId(val);
                            applyFilters(search, val, perPage);
                        }}
                        options={[
                            { value: '', label: t('students.all_groups', 'Barcha guruhlar') },
                            ...groups.map(grp => ({ value: grp.id, label: grp.name }))
                        ]}
                        className="w-48"
                        triggerClassName="h-10 text-sm"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <form onSubmit={handleSearch} className="flex relative flex-1 md:w-64">
                        <Input 
                            placeholder={t('students.search_placeholder', 'Qidirish...')} 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
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
                                <SheetDescription>{t('students.filter_desc', "O'quvchilarni filtrlash")}</SheetDescription>
                            </SheetHeader>
                            <div className="grid gap-4 py-4 mt-2">
                                <div className="space-y-2">
                                    <Label>{t('students.group', 'Guruh')}</Label>
                                    <SearchableSelect
                                        value={groupId}
                                        onChange={(val) => {
                                            setGroupId(val);
                                            applyFilters(search, val, perPage);
                                        }}
                                        options={[
                                            { value: '', label: t('students.all_groups', 'Barcha guruhlar') },
                                            ...groups.map(grp => ({ value: grp.id, label: grp.name }))
                                        ]}
                                        placeholder={t('students.all_groups', 'Barcha guruhlar')}
                                        triggerClassName="h-10 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('common.pagination', 'Sahifalash')}</Label>
                                    <select
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={perPage}
                                        onChange={(e) => {
                                            setPerPage(e.target.value);
                                            applyFilters(search, groupId, e.target.value);
                                        }}
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

            <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? t('students.edit', 'O\'quvchini tahrirlash') : t('students.new', 'Yangi o\'quvchi qo\'shish')}</DialogTitle>
                        <DialogDescription>{t('students.form_desc', 'O\'quvchi ma\'lumotlarini kiriting')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="full_name">{t('students.full_name', 'F.I.SH')}</Label>
                            <Input id="full_name" value={data.full_name} onChange={e => setData('full_name', e.target.value)} required />
                            {errors.full_name && <div className="text-destructive text-sm mt-1">{errors.full_name}</div>}
                        </div>
                        <div>
                            <Label htmlFor="phone">{t('students.phone', 'Telefon')} (Masalan: +998901234567)</Label>
                            <Input id="phone" value={data.phone} onChange={e => setData('phone', e.target.value)} required />
                            {errors.phone && <div className="text-destructive text-sm mt-1">{errors.phone}</div>}
                        </div>
                        <div>
                            <Label htmlFor="telegram_id">{t('common.telegram_id_optional', 'Telegram ID (Ixtiyoriy)')}</Label>
                            <Input id="telegram_id" value={data.telegram_id} onChange={e => setData('telegram_id', e.target.value)} />
                            {errors.telegram_id && <div className="text-destructive text-sm mt-1">{errors.telegram_id}</div>}
                        </div>
                        <div>
                            <Label htmlFor="group_id">{t('students.group', 'Guruh')}</Label>
                            <SearchableSelect
                                id="group_id"
                                value={data.group_id}
                                onChange={(val) => setData('group_id', val)}
                                options={groups.map((grp) => ({ value: grp.id, label: grp.name }))}
                                placeholder={t('common.select', '-- Tanlang --')}
                                allowClear
                                triggerClassName="h-10 text-sm"
                            />
                            {errors.group_id && <div className="text-destructive text-sm mt-1">{errors.group_id}</div>}
                        </div>
                        {isSuperAdmin && (
                            <div>
                                <Label htmlFor="branch_id">{t('branches.branch', 'Filial')}</Label>
                                <SearchableSelect
                                    id="branch_id"
                                    value={data.branch_id}
                                    onChange={(val) => setData('branch_id', val)}
                                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                                    placeholder={t('branches.branch_optional', 'Filial (Ixtiyoriy)')}
                                    allowClear
                                    triggerClassName="h-10 text-sm"
                                />
                                {errors.branch_id && <div className="text-destructive text-sm mt-1">{errors.branch_id}</div>}
                            </div>
                        )}
                        <div className="flex gap-2 pt-2 justify-end">
                            <Button type="button" variant="outline" onClick={closeForm}>{t('common.cancel', 'Bekor qilish')}</Button>
                            <Button type="submit" disabled={processing}>{processing ? t('common.saving', 'Saqlanmoqda...') : t('common.save', 'Saqlash')}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium">{t('common.number', '№')}</th>
                            <th className="px-4 py-3 font-medium">{t('students.full_name', 'F.I.SH')}</th>
                            <th className="px-4 py-3 font-medium">{t('branches.branch', 'Filial')}</th>
                            <th className="px-4 py-3 font-medium">{t('students.phone', 'Telefon')}</th>
                            <th className="px-4 py-3 font-medium">{t('students.group', 'Guruh')}</th>
                            <th className="px-4 py-3 font-medium">{t('common.telegram_id', 'Telegram ID')}</th>
                            <th className="px-4 py-3 font-medium text-center">{t('students.completed_drivings', 'Tugagan darslar')}</th>
                            <th className="px-4 py-3 font-medium text-right">{t('common.actions', 'Amallar')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {students.data.map((item, index) => (
                            <tr key={item.id} className="hover:bg-muted/30">
                                <td className="px-4 py-3">{(students.from || 1) + index}</td>
                                <td className="px-4 py-3 font-medium">
                                    <Link href={`/admin/students/${item.id}`} className="text-primary hover:underline font-semibold">
                                        {item.full_name}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-xs">{item.branch?.name || '-'}</td>
                                <td className="px-4 py-3">{item.phone}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.group?.name || t('students.no_group', 'Biriktirilmagan')}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.telegram_id || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        {item.completed_drivings_count || 0}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/students/${item.id}`}>
                                                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </Link>
                                        </Button>
                                        {!isInstructor && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)} disabled={isDeleting === item.id}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Mobile Cards */}
                <div className="md:hidden p-3 space-y-3 bg-muted/20">
                    {students.data.map((item) => (
                        <div key={item.id} className="p-4 space-y-3 bg-card border rounded-xl shadow-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/admin/students/${item.id}`} className="font-semibold text-lg text-primary hover:underline">
                                        {item.full_name}
                                    </Link>
                                    <div className="text-sm text-muted-foreground">{item.phone}</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground text-xs block">{t('students.group', 'Guruh')}:</span>
                                    <div className="font-medium">
                                        <div className="text-xs px-1.5 py-0.5 mt-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded inline-block">
                                            {item.group?.name || t('students.no_group', 'Biriktirilmagan')}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-xs block">{t('common.telegram_id', 'Telegram ID')}:</span>
                                    <div className="font-medium">{item.telegram_id || '-'}</div>
                                </div>
                                <div className="col-span-2 pt-1 mt-1 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground text-xs block">{t('students.completed_drivings', 'Tugagan darslar')}:</span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            {item.completed_drivings_count || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 justify-end pt-1">
                                <Button variant="outline" size="icon" asChild title={t('common.view', 'Ko\'rish')}>
                                    <Link href={`/admin/students/${item.id}`}>
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                </Button>
                                {!isInstructor && (
                                    <>
                                        <Button variant="outline" size="icon" onClick={() => handleEdit(item)} title={t('common.edit', 'Tahrirlash')}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleDelete(item.id)} disabled={isDeleting === item.id} title={t('common.delete', 'O\'chirish')}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Pagination links={students.links} />
        </div>
    );
}
