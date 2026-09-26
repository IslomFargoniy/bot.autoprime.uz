import { useState, useCallback } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Plus, Search, Eye, CheckSquare, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Pagination from '@/components/pagination';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import { Link } from '@inertiajs/react';

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
    branch_id?: number | null;
    branch?: Branch | null;
    course_id?: number | null;
    course?: Course | null;
}

interface PageProps {
    groups: {
        data: Group[];
        links?: any[];
        from?: number;
    };
    instructors: Instructor[];
    branches?: Branch[];
    courses?: Course[];
    filters?: {
        search?: string;
        instructor_id?: string;
        per_page?: string;
    };
}

export default function GroupsIndex({ groups, instructors, branches = [], courses = [], filters = {} }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth?.user?.role === 'instructor';
    const isSuperAdmin = auth?.user?.role === 'superadmin' || auth?.user?.id === 1;

    const [editing, setEditing] = useState<Group | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    
    const [search, setSearch] = useState(filters.search || '');
    const [instructorId, setInstructorId] = useState(filters.instructor_id || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');

    const applyFilters = (newSearch: string, newInst: string, newPerPage: string) => {
        router.get('/admin/groups', { search: newSearch, instructor_id: newInst, per_page: newPerPage }, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(search, instructorId, perPage);
    };

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        instructor_id: '',
        branch_id: '' as string | number,
        course_id: '' as string | number,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return;
        if (editing) {
            put('/admin/groups/' + editing.id, {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('groups.updated_success', 'Guruh muvaffaqiyatli yangilandi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] as string || t('groups.error', 'Xatolik yuz berdi'));
                }
            });
        } else {
            post('/admin/groups', {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('groups.created_success', 'Guruh muvaffaqiyatli yaratildi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] as string || t('groups.error', 'Xatolik yuz berdi'));
                }
            });
        }
    };

    const handleEdit = (group: Group) => {
        setEditing(group);
        setData({
            name: group.name,
            instructor_id: group.instructor_id ? String(group.instructor_id) : '',
            branch_id: group.branch_id ? String(group.branch_id) : '',
            course_id: group.course_id ? String(group.course_id) : '',
        });
        setShowForm(true);
    };

    const handleDelete = (id: number) => {
        if (isDeleting === id) return;
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            setIsDeleting(id);
            destroy('/admin/groups/' + id, {
                onSuccess: () => toast.success(t('groups.deleted_success', 'Guruh o\'chirildi')),
                onError: (err) => toast.error(Object.values(err)[0] as string || t('groups.error', 'Xatolik yuz berdi')),
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
            
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('groups.title', 'Guruhlar')}</h1>
                {!isInstructor && (
                    <Button onClick={() => setShowForm(true)} size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                        <Plus className="w-4 h-4 md:mr-2" /> 
                        <span className="hidden md:inline">{t('common.add', 'Qo\'shish')}</span>
                    </Button>
                )}
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                {/* Desktop Filters */}
                <div className="hidden md:flex gap-2 items-center">
                    <select
                        className="flex h-10 w-full md:w-auto items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={perPage}
                        onChange={(e) => {
                            setPerPage(e.target.value);
                            applyFilters(search, instructorId, e.target.value);
                        }}
                        title={t('common.per_page', 'Sahifada ko\'rsatish')}
                    >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="75">75</option>
                        <option value="all">{t('common.all', 'Barchasi')}</option>
                    </select>
                    <SearchableSelect
                        value={instructorId}
                        onChange={(val) => {
                            const nextVal = val ? String(val) : '';
                            setInstructorId(nextVal);
                            applyFilters(search, nextVal, perPage);
                        }}
                        options={[
                            { value: '', label: t('drivings.all_instructors', 'Barcha instruktorlar') },
                            ...instructors.map((inst) => ({ value: inst.id, label: inst.name })),
                        ]}
                        placeholder={t('drivings.all_instructors', 'Barcha instruktorlar')}
                        className="w-52"
                        triggerClassName="h-10 text-sm"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <form onSubmit={handleSearch} className="flex relative flex-1 md:w-64">
                        <Input 
                            placeholder={t('common.search', 'Qidirish...')} 
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
                                <SheetDescription>{t('groups.filter_desc', 'Guruhlarni filtrlash')}</SheetDescription>
                            </SheetHeader>
                            <div className="grid gap-4 py-4 mt-2">
                                <div className="space-y-2">
                                    <Label>{t('drivings.instructor', 'Instruktor')}</Label>
                                    <SearchableSelect
                                        value={instructorId}
                                        onChange={(val) => {
                                            const nextVal = val ? String(val) : '';
                                            setInstructorId(nextVal);
                                            applyFilters(search, nextVal, perPage);
                                        }}
                                        options={[
                                            { value: '', label: t('drivings.all_instructors', 'Barcha instruktorlar') },
                                            ...instructors.map((inst) => ({ value: inst.id, label: inst.name })),
                                        ]}
                                        placeholder={t('drivings.all_instructors', 'Barcha instruktorlar')}
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
                                            applyFilters(search, instructorId, e.target.value);
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
                        <DialogTitle>{editing ? t('common.edit', 'Tahrirlash') : t('groups.new', 'Yangi Guruh')}</DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? t('common.edit', 'Tahrirlash') : t('common.add', 'Qo\'shish')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">{t('groups.name', 'Nomi')}</Label>
                            <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} required />
                            {errors.name && <div className="text-destructive text-sm mt-1">{errors.name}</div>}
                        </div>
                        {isSuperAdmin && (
                            <div>
                                <Label htmlFor="branch_id">{t('branches.branch', 'Filial')}</Label>
                                <SearchableSelect
                                    id="branch_id"
                                    value={data.branch_id ? String(data.branch_id) : ''}
                                    onChange={(val) => setData('branch_id', val)}
                                    options={branches.map((b) => ({
                                        value: b.id,
                                        label: b.name,
                                    }))}
                                    placeholder={t('branches.branch_optional', 'Filial (Ixtiyoriy)')}
                                    allowClear
                                />
                                {errors.branch_id && <div className="text-destructive text-sm mt-1">{errors.branch_id}</div>}
                            </div>
                        )}
                        <div>
                            <Label htmlFor="course_id">{t('groups.course', 'LMS Kurs')}</Label>
                            <SearchableSelect
                                id="course_id"
                                value={data.course_id ? String(data.course_id) : ''}
                                onChange={(val) => setData('course_id', val)}
                                options={courses.map((c) => ({
                                    value: c.id,
                                    label: `${c.name}${c.category ? ` (${c.category.toUpperCase()})` : ''}`,
                                }))}
                                placeholder={t('groups.course_optional', 'LMS Kurs (Ixtiyoriy)')}
                                allowClear
                            />
                            {errors.course_id && <div className="text-destructive text-sm mt-1">{errors.course_id}</div>}
                        </div>
                        <div>
                            <Label htmlFor="instructor_id">{t('drivings.instructor', 'Instruktor')}</Label>
                            <SearchableSelect
                                id="instructor_id"
                                value={data.instructor_id ? String(data.instructor_id) : ''}
                                onChange={(val) => setData('instructor_id', val)}
                                options={instructors.map((inst) => ({
                                    value: inst.id,
                                    label: inst.name,
                                }))}
                                placeholder={t('groups.select_instructor', '-- Tanlang --')}
                                allowClear
                            />
                            {errors.instructor_id && <div className="text-destructive text-sm mt-1">{errors.instructor_id}</div>}
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
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
                            <th className="px-4 py-3 font-medium">{t('groups.name', 'Guruh nomi')}</th>
                            <th className="px-4 py-3 font-medium">{t('branches.branch', 'Filial')}</th>
                            <th className="px-4 py-3 font-medium">{t('drivings.instructor', 'Instruktor')}</th>
                            <th className="px-4 py-3 font-medium text-right">{t('common.actions', 'Amallar')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {groups.data.map((item, index) => (
                            <tr key={item.id} className="hover:bg-muted/30">
                                <td className="px-4 py-3">{(groups.from || 1) + index}</td>
                                <td className="px-4 py-3 font-medium">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <Link href={`/admin/groups/${item.id}`} className="text-blue-600 hover:underline">
                                            {item.name}
                                        </Link>
                                        {item.course && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 w-fit">
                                                <GraduationCap className="w-3 h-3" />
                                                {item.course.name}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-xs">{item.branch?.name || '-'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.instructor?.name || t('common.not_assigned', 'Biriktirilmagan')}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <Button variant="outline" size="sm" asChild className="h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                            <Link href={`/admin/attendance?group_id=${item.id}&action=mark`}>
                                                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                                                {t('groups.take_attendance', 'Davomat')}
                                            </Link>
                                        </Button>
                                        {!isInstructor && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title={t('common.edit', 'Tahrirlash')}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)} disabled={isDeleting === item.id} title={t('common.delete', 'O\'chirish')}>
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
                    {groups.data.map((item) => (
                        <div key={item.id} className="p-4 space-y-3 bg-card border rounded-xl shadow-xs">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/admin/groups/${item.id}`} className="font-semibold text-blue-600 hover:underline text-lg block">
                                        {item.name}
                                    </Link>
                                    {item.course && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mt-1">
                                            <GraduationCap className="w-3 h-3" />
                                            {item.course.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="text-sm">
                                <span className="text-muted-foreground text-xs block">{t('drivings.instructor', 'Instruktor')}:</span>
                                <div className="font-medium">{item.instructor?.name || t('common.not_assigned', 'Biriktirilmagan')}</div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t mt-2">
                                <Button variant="outline" size="sm" asChild className="h-8 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                    <Link href={`/admin/attendance?group_id=${item.id}&action=mark`}>
                                        <CheckSquare className="w-3.5 h-3.5 mr-1" />
                                        {t('groups.take_attendance', 'Davomat')}
                                    </Link>
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="icon" asChild title={t('common.view', 'Ko\'rish')}>
                                        <Link href={`/admin/groups/${item.id}`}>
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
                        </div>
                    ))}
                </div>
            </div>

            <Pagination links={groups.links} />
        </div>
    );
}
