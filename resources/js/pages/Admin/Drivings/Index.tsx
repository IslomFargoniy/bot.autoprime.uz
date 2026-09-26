import { useState, useCallback, useEffect } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit2, Trash2, CheckCircle2, XCircle, Filter, Download, Loader2, ShoppingCart, X, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
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
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import Pagination from '@/components/pagination';

interface Instructor {
    id: number;
    name: string;
}

interface Group {
    id: number;
    name: string;
}

interface Student {
    id: number;
    full_name: string;
    phone?: string;
    group_id?: number;
    group?: Group;
}

interface Driving {
    id: number;
    start_time: string;
    end_time: string;
    status: string;
    instructor_id?: number;
    student_id?: number;
    group_id?: number;
    autodrome_id?: number;
    student?: Student;
    group?: Group;
    instructor?: Instructor;
    autodrome?: Autodrome;
    review?: {
        rating: number;
        reason_tags?: string[];
        comment?: string;
    };
}

interface Autodrome {
    id: number;
    name: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
}

interface PageProps {
    drivings: {
        data: Driving[];
        links?: { url: string | null; label: string; active: boolean }[];
        from?: number;
    };
    instructors: Instructor[];
    students: Student[];
    groups: Group[];
    autodromes: Autodrome[];
    filters?: {
        search?: string;
        status?: string;
        instructor_id?: string;
        from?: string;
        to?: string;
        per_page?: string;
    };
}

export default function DrivingsIndex({ drivings, instructors, students, groups, autodromes = [], filters = {} }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage().props as unknown as { auth: { user: { id: number; role: string } } };
    const isInstructor = auth.user.role === 'instructor';

    const [editing, setEditing] = useState<Driving | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [statusModalDriving, setStatusModalDriving] = useState<Driving | null>(null);
    const [targetStatus, setTargetStatus] = useState<'completed' | 'cancelled' | null>(null);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [instructorId, setInstructorId] = useState(filters.instructor_id || '');
    const [fromDate, setFromDate] = useState(filters.from || '');
    const [toDate, setToDate] = useState(filters.to || '');
    const [perPage, setPerPage] = useState(filters.per_page || '25');
    const [studentSearch, setStudentSearch] = useState('');
    const [showOtherStudents, setShowOtherStudents] = useState(false);
    const [apiSearchResults, setApiSearchResults] = useState<Student[]>([]);
    const [isSearchingStudents, setIsSearchingStudents] = useState(false);
    const [selectedStudentsBasket, setSelectedStudentsBasket] = useState<Student[]>([]);

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayString = `${dd}-${mm}-${yyyy}`;

    const { data, setData, post, put, delete: destroy, reset, errors, processing, transform } = useForm({
        instructor_id: isInstructor ? String(auth.user.id) : '',
        student_id: '',
        student_ids: [] as string[],
        group_id: '',
        autodrome_id: '',
        date: todayString,
        time_from: '',
        time_to: '',
        start_time: '',
        end_time: '',
        status: 'scheduled',
    });

    useEffect(() => {
        if (!showForm) return;

        const timer = setTimeout(() => {
            setIsSearchingStudents(true);
            const params = new URLSearchParams();
            if (studentSearch) params.append('q', studentSearch);
            if (data.group_id && !showOtherStudents) params.append('group_id', data.group_id);
            if (showOtherStudents) params.append('other_students', 'true');

            fetch(`/admin/students/search-api?${params.toString()}`)
                .then(res => res.json())
                .then(resData => {
                    setApiSearchResults(Array.isArray(resData) ? resData : []);
                })
                .catch(() => setApiSearchResults([]))
                .finally(() => setIsSearchingStudents(false));
        }, 300);

        return () => clearTimeout(timer);
    }, [studentSearch, data.group_id, showOtherStudents, showForm]);

    transform((formData) => {
        let dateForBackend = '';
        if (formData.date && formData.date.includes('-')) {
            const parts = formData.date.split('-');
            if (parts[0].length === 2 && parts[2]?.length === 4) {
                dateForBackend = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (parts[0].length === 4) {
                dateForBackend = formData.date;
            }
        }
        return {
            ...formData,
            start_time: dateForBackend && formData.time_from ? `${dateForBackend} ${formData.time_from}:00` : '',
            end_time: dateForBackend && formData.time_to ? `${dateForBackend} ${formData.time_to}:00` : '',
        };
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return;
        if (editing) {
            put('/admin/drivings/' + editing.id, {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('drivings.updated_success', 'Mashg\'ulot muvaffaqiyatli yangilandi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] || t('drivings.error', 'Xatolik yuz berdi'));
                }
            });
        } else {
            post('/admin/drivings', {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('drivings.created_success', 'Mashg\'ulot muvaffaqiyatli yaratildi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] || t('drivings.error', 'Xatolik yuz berdi'));
                }
            });
        }
    };

    const handleEdit = (driving: Driving) => {
        if (driving.status === 'completed' || driving.status === 'cancelled') {
            toast.error(t('drivings.edit_completed_error', 'Tugallangan yoki bekor qilingan mashg\'ulotni o\'zgartirish mumkin emas'));
            return;
        }
        setEditing(driving);

        const formatTime = (dateString: string) => {
            const date = new Date(dateString);
            return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(11, 16);
        };
        const formatDate = (dateString: string) => {
            const date = new Date(dateString);
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear();
            return `${y}-${m}-${d}`;
        };

        setData({
            instructor_id: String(driving.instructor_id || ''),
            student_id: String(driving.student_id || ''),
            student_ids: [String(driving.student_id || '')],
            group_id: driving.group_id ? String(driving.group_id) : '',
            autodrome_id: driving.autodrome_id ? String(driving.autodrome_id) : '',
            date: formatDate(driving.start_time),
            time_from: formatTime(driving.start_time),
            time_to: formatTime(driving.end_time),
            start_time: '',
            end_time: '',
            status: driving.status,
        });
        if (driving.student) {
            setSelectedStudentsBasket([driving.student]);
        }
        setShowForm(true);
    };

    const handleDelete = (driving: Driving) => {
        if (isDeleting === driving.id) return;
        if (confirm(t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"))) {
            setIsDeleting(driving.id);
            destroy('/admin/drivings/' + driving.id, {
                onSuccess: () => {
                    toast.success(t('drivings.deleted_success', 'Mashg\'ulot o\'chirildi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] || t('drivings.error', 'Xatolik yuz berdi'));
                },
                onFinish: () => {
                    setIsDeleting(null);
                }
            });
        }
    };

    const handleStatusChangeConfirm = () => {
        if (!statusModalDriving || !targetStatus || isStatusUpdating) return;

        const performUpdate = (latitude?: number, longitude?: number) => {
            setIsStatusUpdating(true);
            router.put('/admin/drivings/' + statusModalDriving.id, {
                status: targetStatus,
                latitude,
                longitude,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setStatusModalDriving(null);
                    setTargetStatus(null);
                    toast.success(targetStatus === 'completed' ? t('drivings.updated_success', 'Mashg\'ulot muvaffaqiyatli yangilandi') : t('drivings.updated_success', 'Mashg\'ulot muvaffaqiyatli yangilandi'));
                },
                onError: (err) => {
                    toast.error(Object.values(err)[0] || t('drivings.error', 'Xatolik yuz berdi'));
                },
                onFinish: () => {
                    setIsStatusUpdating(false);
                }
            });
        };

        // Admin uchun locatsiya so'ralmaydi — to'g'ridan-to'g'ri yakunlash
        performUpdate();
    };

    const closeForm = () => {
        setShowForm(false);
        setTimeout(() => {
            setEditing(null);
            setSelectedStudentsBasket([]);
            setStudentSearch('');
            setApiSearchResults([]);
            setShowOtherStudents(false);
            reset();
        }, 300);
    };

    const handleStudentSelect = (std: Student) => {
        const idStr = String(std.id);
        if (data.student_ids.includes(idStr)) {
            setData('student_ids', data.student_ids.filter(id => id !== idStr));
            setSelectedStudentsBasket(prev => prev.filter(s => s.id !== std.id));
        } else {
            setData('student_ids', [...data.student_ids, idStr]);
            setSelectedStudentsBasket(prev => [...prev.filter(s => s.id !== std.id), std]);
        }
    };

    const handleRemoveFromBasket = (stdId: number) => {
        const idStr = String(stdId);
        setData('student_ids', data.student_ids.filter(id => id !== idStr));
        setSelectedStudentsBasket(prev => prev.filter(s => s.id !== stdId));
    };

    const applyFilters = (newSearch: string, newStatus: string, newInst: string, newFrom: string, newTo: string, newPerPage: string) => {
        router.get('/admin/drivings', {
            search: newSearch,
            status: newStatus,
            instructor_id: newInst,
            from: newFrom,
            to: newTo,
            per_page: newPerPage
        }, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(search, status, instructorId, fromDate, toDate, perPage);
    };

    const baseFilteredStudents = data.group_id ? students.filter(s => s.group_id === Number(data.group_id)) : students;
    const filteredStudents = studentSearch
        ? baseFilteredStudents.filter(s => 
            s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
            (s.phone && s.phone.includes(studentSearch)) ||
            (s.group && s.group.name.toLowerCase().includes(studentSearch.toLowerCase()))
          )
        : baseFilteredStudents;

    const handleStudentToggle = (stdId: number) => {
        const idStr = String(stdId);
        if (data.student_ids.includes(idStr)) {
            setData('student_ids', data.student_ids.filter(id => id !== idStr));
        } else {
            setData('student_ids', [...data.student_ids, idStr]);
        }
    };

    const handleFilterDateChange = (field: 'from' | 'to', dateStr: string) => {
        if (field === 'from') {
            setFromDate(dateStr);
            applyFilters(search, status, instructorId, dateStr, toDate, perPage);
        } else {
            setToDate(dateStr);
            applyFilters(search, status, instructorId, fromDate, dateStr, perPage);
        }
    };

    const handleTimeChange = (field: 'time_from' | 'time_to', val: string) => {
        let clean = val.replace(/[^\d]/g, '');
        if (clean.length > 4) clean = clean.substring(0, 4);
        if (clean.length > 2) {
            if (parseInt(clean[2]) > 5) {
                clean = clean.substring(0, 2) + '5' + clean.substring(3);
            }
        }

        let formatted = clean;
        if (clean.length > 2) {
            formatted = clean.substring(0, 2) + ':' + clean.substring(2);
        }
        setData(field, formatted);
    };

    const isNegativeTag = (tag: string) => {
        return tag.includes('Kechikdi') ||
            tag.includes('Zargona') ||
            tag.includes('nosoz') ||
            tag.includes('Tushunarsiz') ||
            tag.includes('yomon') ||
            tag.includes('kam') ||
            tag.includes('Asabiy') ||
            tag.includes('Qo');
    };

    const translateTag = (tag: string) => {
        const clean = tag.replace(/^[^\w\u0400-\u04FF']+\s*/, '').trim();
        if (tag.includes('Kechikdi') || clean === 'Kechikdi') return t('drivings.tag_late', 'Kechikdi');
        if (tag.includes('Xushmuomala') || clean === 'Xushmuomala') return t('drivings.tag_polite', 'Xushmuomala');
        if (tag.includes('Zargona tushuntirdi') || clean === 'Zargona tushuntirdi') return t('drivings.tag_slang', 'Zargona tushuntirdi');
        if (tag.includes('Tushunarsiz') || clean === 'Tushunarsiz') return t('drivings.tag_unclear', 'Tushunarsiz');
        if (tag.includes('Mashina nosoz') || clean === 'Mashina nosoz') return t('drivings.tag_car_issue', 'Mashina nosoz');
        if (tag.includes('Yaxshi tushuntirdi') || clean === 'Yaxshi tushuntirdi') return t('drivings.tag_well_explained', 'Yaxshi tushuntirdi');
        if (tag.includes('Sabrli') || clean === 'Sabrli') return t('drivings.tag_patient', 'Sabrli');
        if (tag.includes('Asabiy') || clean === 'Asabiy') return t('drivings.tag_nervous', 'Asabiy');
        if (tag.includes("Qo'pol") || clean === "Qo'pol" || tag.includes("Qo`pol") || clean === "Qopol") return t('drivings.tag_rude', "Qo'pol");
        if (tag.includes('Mashina toza') || clean === 'Mashina toza') return t('drivings.tag_clean_car', 'Mashina toza');
        if (tag.includes('Vaqtida boshladi') || clean === 'Vaqtida boshladi') return t('drivings.tag_on_time', 'Vaqtida boshladi');
        if (tag.includes('Muomala yomon') || clean === 'Muomala yomon') return t('drivings.tag_bad_attitude', 'Muomala yomon');
        if (tag.includes('Vaqtidan kam') || clean.includes('Vaqtidan kam')) return t('drivings.tag_short_lesson', "Vaqtidan kam o'tildi");
        return tag;
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        if (instructorId) params.append('instructor_id', instructorId);
        if (fromDate) params.append('from', fromDate);
        if (toDate) params.append('to', toDate);

        window.location.href = `/admin/drivings/export?${params.toString()}`;
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <Head title={t('drivings.title', 'Amaliy mashg\'ulotlar')} />

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">{t('drivings.title', 'Amaliy mashg\'ulotlar')}</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport} className="shrink-0 sm:px-4 sm:py-2">
                        <Download className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('common.export_excel', 'Excel yuklab olish')}</span>
                    </Button>
                    <Button onClick={() => setShowForm(true)} variant="brand" size="icon" className="shrink-0 sm:w-auto sm:px-4 sm:py-2">
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('drivings.new', 'Yangi mashg\'ulot')}</span>
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-card border rounded-xl p-4 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Search & Mobile Filter Trigger inline */}
                    <div className="flex items-center gap-2 flex-1 w-full md:max-w-md">
                        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('common.search_student', 'Talaba ismi yoki telefon...')}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Button type="submit" variant="secondary" size="icon" className="shrink-0 sm:w-auto sm:px-4 sm:py-2">
                                <Search className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">{t('common.search', 'Qidirish')}</span>
                            </Button>
                        </form>

                        {/* Mobile Filters Sheet Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="md:hidden shrink-0">
                                    <Filter className="w-4 h-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-xl">
                                <SheetHeader>
                                    <SheetTitle>{t('common.filters', 'Filtrlar')}</SheetTitle>
                                    <SheetDescription>{t('drivings.filter_desc', 'Mashg\'ulotlarni filtrlash')}</SheetDescription>
                                </SheetHeader>
                                <div className="grid gap-4 py-4 mt-2">
                                    <div className="space-y-2">
                                        <Label>{t('common.status', 'Holati')}</Label>
                                        <SearchableSelect
                                            value={status}
                                            onChange={(val) => {
                                                const nextVal = val ? String(val) : '';
                                                setStatus(nextVal);
                                                applyFilters(search, nextVal, instructorId, fromDate, toDate, perPage);
                                            }}
                                            options={[
                                                { value: '', label: t('common.all_statuses', 'Barcha holatlar') },
                                                { value: 'scheduled', label: t('status.scheduled', 'Rejada') },
                                                { value: 'completed', label: t('status.completed', 'Tugagan') },
                                                { value: 'cancelled', label: t('status.cancelled', 'Bekor qilingan') },
                                            ]}
                                            placeholder={t('common.all_statuses', 'Barcha holatlar')}
                                            triggerClassName="h-10 text-sm"
                                        />
                                    </div>

                                    {!isInstructor && (
                                        <div className="space-y-2">
                                            <Label>{t('drivings.instructor', 'Instruktor')}</Label>
                                            <SearchableSelect
                                                value={instructorId}
                                                onChange={(val) => {
                                                    const nextVal = val ? String(val) : '';
                                                    setInstructorId(nextVal);
                                                    applyFilters(search, status, nextVal, fromDate, toDate, perPage);
                                                }}
                                                options={[
                                                    { value: '', label: t('drivings.all_instructors', 'Barcha instruktorlar') },
                                                    ...instructors.map((ins) => ({ value: String(ins.id), label: ins.name })),
                                                ]}
                                                placeholder={t('drivings.all_instructors', 'Barcha instruktorlar')}
                                                allowClear
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>{t('common.date_from', 'Sana dan')}</Label>
                                        <DatePicker
                                            placeholder="YYYY-MM-DD"
                                            value={fromDate}
                                            onChange={(val) => handleFilterDateChange('from', val)}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('common.date_to', 'Sana gacha')}</Label>
                                        <DatePicker
                                            placeholder="YYYY-MM-DD"
                                            value={toDate}
                                            onChange={(val) => handleFilterDateChange('to', val)}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('common.pagination', 'Sahifalash')}</Label>
                                        <select
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={perPage}
                                            onChange={(e) => {
                                                setPerPage(e.target.value);
                                                applyFilters(search, status, instructorId, fromDate, toDate, e.target.value);
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

                    {/* Filters (Desktop Only) */}
                    <div className="hidden md:flex flex-wrap items-center gap-2">
                        <SearchableSelect
                            value={status}
                            onChange={(val) => {
                                const nextVal = val ? String(val) : '';
                                setStatus(nextVal);
                                applyFilters(search, nextVal, instructorId, fromDate, toDate, perPage);
                            }}
                            options={[
                                { value: '', label: t('common.all_statuses', 'Barcha holatlar') },
                                { value: 'scheduled', label: t('status.scheduled', 'Rejada') },
                                { value: 'completed', label: t('status.completed', 'Tugagan') },
                                { value: 'cancelled', label: t('status.cancelled', 'Bekor qilingan') },
                            ]}
                            placeholder={t('common.all_statuses', 'Barcha holatlar')}
                            className="w-44"
                            triggerClassName="h-10 text-sm"
                        />

                        {!isInstructor && (
                            <SearchableSelect
                                value={instructorId}
                                onChange={(val) => {
                                    const nextVal = val ? String(val) : '';
                                    setInstructorId(nextVal);
                                    applyFilters(search, status, nextVal, fromDate, toDate, perPage);
                                }}
                                options={[
                                    { value: '', label: t('drivings.all_instructors', 'Barcha instruktorlar') },
                                    ...instructors.map((ins) => ({ value: ins.id, label: ins.name })),
                                ]}
                                placeholder={t('drivings.all_instructors', 'Barcha instruktorlar')}
                                className="w-52"
                                triggerClassName="h-10 text-sm"
                            />
                        )}

                        <DatePicker
                            placeholder={t('common.date_from', 'Dan') + ' YYYY-MM-DD'}
                            value={fromDate}
                            onChange={(val) => handleFilterDateChange('from', val)}
                            className="w-36"
                            title={t('common.from', 'Dan')}
                        />

                        <DatePicker
                            placeholder={t('common.date_to', 'Gacha') + ' YYYY-MM-DD'}
                            value={toDate}
                            onChange={(val) => handleFilterDateChange('to', val)}
                            className="w-36"
                            title={t('common.to', 'Gacha')}
                        />

                        <select
                            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(e.target.value);
                                applyFilters(search, status, instructorId, fromDate, toDate, e.target.value);
                            }}
                            title={t('common.per_page', 'Sahifada ko\'rsatish')}
                        >
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="75">75</option>
                            <option value="all">{t('common.all', 'Barchasi')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Status Change Confirmation Modal */}
            <Dialog open={!!statusModalDriving} onOpenChange={(open) => { if (!open) { setStatusModalDriving(null); setTargetStatus(null); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {targetStatus === 'completed' ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    {t('drivings.finish_title', 'Mashg\'ulotni yakunlash')}
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    {t('drivings.cancel_title', 'Mashg\'ulotni bekor qilish')}
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {targetStatus === 'completed' ? (
                                <>
                                    <span>{t('drivings.confirm_finish', 'Rostdan ham ushbu mashg\'ulotni tugallamoqchimisiz?')}</span>
                                    {isInstructor && (
                                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                                            {t('drivings.finish_gps_hint', 'Mashg\'ulotni yakunlash uchun avtodrom belgilangan hududida bo\'lishingiz shart. GPS joylashuvingiz tekshiriladi.')}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span>{t('drivings.confirm_cancel', 'Rostdan ham ushbu mashg\'ulotni bekor qilmoqchimisiz?')}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 pt-4 justify-end">
                        <Button type="button" variant="outline" onClick={() => { setStatusModalDriving(null); setTargetStatus(null); }}>
                            {t('common.cancel', 'Bekor qilish')}
                        </Button>
                        <Button
                            type="button"
                            variant={targetStatus === 'completed' ? 'default' : 'destructive'}
                            className={targetStatus === 'completed' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                            disabled={isStatusUpdating}
                            onClick={handleStatusChangeConfirm}
                        >
                            {isStatusUpdating ? t('common.saving', 'Saqlanmoqda...') : (targetStatus === 'completed' ? t('drivings.yes_finish', 'Ha, tugatish') : t('drivings.yes_cancel', 'Ha, bekor qilish'))}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Modal */}
            <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-blue-600" />
                            {editing ? t('drivings.edit', 'Mashg\'ulotni tahrirlash') : t('drivings.new', 'Yangi Mashg\'ulot')}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? t('common.edit', 'Tahrirlash') : t('common.add', "Qo'shish")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {editing ? (
                            <>
                                <div className="bg-muted/40 p-3.5 rounded-xl border space-y-1.5 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">{t('drivings.student', 'O\'quvchi')}: </span>
                                        <span className="font-semibold">{editing.student?.full_name || '-'}</span>
                                        {editing.student?.phone && <span className="text-xs text-muted-foreground ml-1 font-mono">({editing.student.phone})</span>}
                                    </div>
                                    {editing.group && (
                                        <div>
                                            <span className="text-muted-foreground">{t('students.group', 'Guruh')}: </span>
                                            <span className="font-medium">{editing.group.name}</span>
                                        </div>
                                    )}
                                    {editing.instructor && (
                                        <div>
                                            <span className="text-muted-foreground">{t('drivings.instructor', 'Instruktor')}: </span>
                                            <span className="font-medium">{editing.instructor.name}</span>
                                        </div>
                                    )}
                                    {editing.autodrome && (
                                        <div>
                                            <span className="text-muted-foreground">{t('drivings.autodrome', 'Avtodrom')}: </span>
                                            <span className="font-medium">{editing.autodrome.name}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="date" required>{t('drivings.date', 'Sana')}</Label>
                                    <DatePicker 
                                        id="date" 
                                        value={data.date} 
                                        onChange={(val) => setData('date', val)} 
                                        placeholder="YYYY-MM-DD"
                                        className="w-full"
                                        required 
                                    />
                                    {errors.start_time && <div className="text-destructive text-sm mt-1">{errors.start_time}</div>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="time_from" required>{t('drivings.start_time', 'Boshlanish vaqti')}</Label>
                                        <Input 
                                            type="text" 
                                            id="time_from" 
                                            value={data.time_from} 
                                            onChange={e => handleTimeChange('time_from', e.target.value)} 
                                            placeholder="09:00"
                                            pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                                            title="09:00"
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="time_to" required>{t('drivings.end_time', 'Tugash vaqti')}</Label>
                                        <Input 
                                            type="text" 
                                            id="time_to" 
                                            value={data.time_to} 
                                            onChange={e => handleTimeChange('time_to', e.target.value)} 
                                            placeholder="18:30"
                                            pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                                            title="18:30"
                                            required 
                                        />
                                        {errors.end_time && <div className="text-destructive text-sm mt-1">{errors.end_time}</div>}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {!isInstructor && (
                                    <div>
                                        <Label htmlFor="instructor_id" required>{t('drivings.instructor', 'Instruktor')}</Label>
                                        <SearchableSelect
                                            id="instructor_id"
                                            value={data.instructor_id}
                                            onChange={(val) => setData('instructor_id', val)}
                                            options={instructors.map((i) => ({ value: i.id, label: i.name }))}
                                            placeholder={t('drivings.all_instructors', 'Barcha instruktorlar')}
                                            required
                                        />
                                        {errors.instructor_id && <div className="text-destructive text-sm mt-1">{errors.instructor_id}</div>}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label htmlFor="group_id">{t('drivings.group_optional', 'Guruh (Ixtiyoriy)')}</Label>
                                            <SearchableSelect
                                                id="group_id"
                                                value={data.group_id}
                                                onChange={(val) => setData('group_id', val)}
                                                options={groups.map((g) => ({ value: g.id, label: g.name }))}
                                                placeholder={t('common.select', '-- Tanlang --')}
                                                allowClear
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <Label htmlFor="student_search">{t('common.search', 'Qidirish')}</Label>
                                                <div 
                                                    onClick={() => setShowOtherStudents(prev => !prev)}
                                                    className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                        showOtherStudents ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background'
                                                    }`}>
                                                        {showOtherStudents && <span className="text-[9px] leading-none">✓</span>}
                                                    </div>
                                                    <span className="truncate">{t('drivings.select_other_students', 'Boshqa va guruhsiz o\'quvchilar')}</span>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="student_search"
                                                    placeholder={t('common.search_student', 'Talaba ismi yoki telefon...')}
                                                    value={studentSearch}
                                                    onChange={e => setStudentSearch(e.target.value)}
                                                    className="pl-8 text-xs sm:text-sm"
                                                />
                                                {isSearchingStudents && (
                                                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-primary animate-spin" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* API Search Results List */}
                                    <div>
                                        <div className="text-xs font-semibold text-muted-foreground mb-1 flex justify-between items-center">
                                            <span>{t('drivings.search_results', 'Qidiruv natijalari')}</span>
                                            {apiSearchResults.length > 0 && (
                                                <span className="text-[11px] font-normal">{apiSearchResults.length} ta topildi</span>
                                            )}
                                        </div>
                                        <div className="border rounded-xl p-2 bg-muted/20 h-36 overflow-y-auto space-y-1">
                                            {isSearchingStudents ? (
                                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground gap-2">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                                    <span>{t('common.searching', 'Qidirilmoqda...')}</span>
                                                </div>
                                            ) : apiSearchResults.length === 0 ? (
                                                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                                    {t('drivings.no_students', 'O\'quvchilar topilmadi')}
                                                </div>
                                            ) : (
                                                apiSearchResults.map(s => {
                                                    const isSelected = data.student_ids.includes(String(s.id));
                                                    return (
                                                        <div 
                                                            key={s.id} 
                                                            onClick={() => handleStudentSelect(s)}
                                                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                                                isSelected 
                                                                    ? 'bg-primary/10 border-primary text-primary font-medium' 
                                                                    : 'bg-card hover:bg-muted/50 border-border'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                                                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                                                                }`}>
                                                                    {isSelected && <span className="text-[9px] leading-none">✓</span>}
                                                                </div>
                                                                <span className="font-medium">{s.full_name}</span>
                                                                {s.group ? (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-normal border border-border">
                                                                        {s.group.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal border border-amber-500/20">
                                                                        {t('common.no_group', 'Guruhsiz')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {s.phone && (
                                                                <span className="text-[11px] text-muted-foreground font-mono">{s.phone}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Selected Students Basket (Korzinka) */}
                                    <div className="border-t pt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                                                <span>{t('drivings.selected_students_basket', 'Tanlangan o\'quvchilar')}</span>
                                            </Label>
                                            <span className="text-xs font-bold text-primary">
                                                ({selectedStudentsBasket.length} ta)
                                            </span>
                                        </div>

                                        {selectedStudentsBasket.length === 0 ? (
                                            <div className="text-center py-3 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                                                {t('drivings.basket_empty', 'Hali hech qanday o\'quvchi tanlanmadi')}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                                {selectedStudentsBasket.map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary text-xs px-2.5 py-1.5 rounded-lg shadow-2xs font-medium"
                                                    >
                                                        <span>{s.full_name}</span>
                                                        {s.group ? (
                                                            <span className="text-[10px] opacity-80 font-normal">({s.group.name})</span>
                                                        ) : (
                                                            <span className="text-[10px] opacity-80 font-normal">({t('common.no_group', 'Guruhsiz')})</span>
                                                        )}
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveFromBasket(s.id)}
                                                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                                            title={t('common.remove', 'O\'chirish')}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {errors.student_id && <div className="text-destructive text-sm mt-1">{errors.student_id}</div>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label htmlFor="autodrome_id">{t('drivings.autodrome', 'Avtodrom')}</Label>
                                            <SearchableSelect
                                                id="autodrome_id"
                                                value={data.autodrome_id}
                                                onChange={(val) => setData('autodrome_id', val)}
                                                options={autodromes.map((a) => ({ value: a.id, label: a.name }))}
                                                placeholder={t('common.select', '-- Tanlang --')}
                                                allowClear
                                            />
                                            {errors.autodrome_id && <div className="text-destructive text-sm mt-1">{errors.autodrome_id}</div>}
                                        </div>
                                        <div>
                                            <Label htmlFor="date" required>{t('drivings.date', 'Sana')}</Label>
                                            <DatePicker 
                                                id="date" 
                                                value={data.date} 
                                                onChange={(val) => setData('date', val)} 
                                                placeholder="YYYY-MM-DD"
                                                className="w-full"
                                                required 
                                            />
                                            {errors.start_time && <div className="text-destructive text-sm mt-1">{errors.start_time}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="time_from" required>{t('drivings.start_time', 'Boshlanish vaqti')}</Label>
                                        <Input 
                                            type="text" 
                                            id="time_from" 
                                            value={data.time_from} 
                                            onChange={e => handleTimeChange('time_from', e.target.value)} 
                                            placeholder="09:00"
                                            pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                                            title="09:00"
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="time_to" required>{t('drivings.end_time', 'Tugash vaqti')}</Label>
                                        <Input 
                                            type="text" 
                                            id="time_to" 
                                            value={data.time_to} 
                                            onChange={e => handleTimeChange('time_to', e.target.value)} 
                                            placeholder="18:30"
                                            pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                                            title="18:30"
                                            required 
                                        />
                                        {errors.end_time && <div className="text-destructive text-sm mt-1">{errors.end_time}</div>}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex gap-2 pt-2 justify-end">
                            <Button type="button" variant="outline" onClick={closeForm}>{t('common.cancel', 'Bekor qilish')}</Button>
                            <Button type="submit" variant="brand" disabled={processing}>{processing ? t('common.saving', 'Saqlanmoqda...') : t('common.save', 'Saqlash')}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Desktop Table & Mobile Cards */}
            <div className="bg-card border rounded-xl shadow-xs overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('drivings.student', 'O\'quvchi')}</TableHead>
                                <TableHead>{t('drivings.instructor', 'Instruktor')}</TableHead>
                                <TableHead>{t('students.group', 'Guruh')}</TableHead>
                                <TableHead>{t('drivings.autodrome', 'Avtodrom')}</TableHead>
                                <TableHead>{t('drivings.date_time', 'Sana / Vaqt')}</TableHead>
                                <TableHead>{t('common.status', 'Holat')}</TableHead>
                                {!isInstructor && <TableHead>{t('drivings.rating', 'Baho')}</TableHead>}
                                <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drivings.data.length === 0 ? (
                                <TableEmpty colSpan={isInstructor ? 7 : 8} title={t('common.no_data', 'Ma\'lumot topilmadi')} />
                            ) : (
                                drivings.data.map((driving) => (
                                    <TableRow key={driving.id}>
                                        <TableCell className="font-medium">
                                            <div>{driving.student?.full_name || '-'}</div>
                                            <div className="text-xs text-muted-foreground">{driving.student?.phone || ''}</div>
                                        </TableCell>
                                        <TableCell className="text-xs">{driving.instructor?.name || '-'}</TableCell>
                                        <TableCell>
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded font-medium">
                                                {driving.group?.name || t('students.no_group', 'Guruhsiz')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">{driving.autodrome?.name || '-'}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-xs">
                                                {(() => {
                                                    const d = new Date(driving.start_time);
                                                    const startDay = String(d.getDate()).padStart(2, '0');
                                                    const startMonth = String(d.getMonth() + 1).padStart(2, '0');
                                                    return `${startDay}-${startMonth}-${d.getFullYear()}`;
                                                })()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(driving.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} - {new Date(driving.end_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {driving.status === 'scheduled' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('status.scheduled', 'Rejada')}</span>}
                                            {driving.status === 'completed' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('status.completed', 'Tugagan')}</span>}
                                            {driving.status === 'cancelled' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('status.cancelled', 'Bekor qilingan')}</span>}
                                        </TableCell>
                                        {!isInstructor && (
                                            <TableCell>
                                                {driving.review ? (
                                                    <div>
                                                        <div className="flex items-center text-yellow-500 font-bold">
                                                            {driving.review.rating} ⭐
                                                        </div>
                                                        {driving.review.reason_tags && driving.review.reason_tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {driving.review.reason_tags.map((tag, i) => {
                                                                    const isNeg = isNegativeTag(tag);
                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 font-medium ${
                                                                                isNeg
                                                                                    ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                                                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                                                            }`}
                                                                        >
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${isNeg ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                                                            {translateTag(tag)}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {driving.review.comment && (
                                                            <div className="text-xs italic text-muted-foreground mt-1 max-w-xs break-words">
                                                                💬 "{driving.review.comment}"
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">{t('drivings.no_review', 'Baholanmagan')}</span>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {driving.status === 'scheduled' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
                                                            onClick={() => { setStatusModalDriving(driving); setTargetStatus('completed'); }}
                                                            title={t('drivings.complete_action', 'Tugatish')}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-1" /> {t('drivings.complete_action', 'Tugatish')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                                                            onClick={() => { setStatusModalDriving(driving); setTargetStatus('cancelled'); }}
                                                            title={t('drivings.cancel_action', 'Bekor qilish')}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" /> {t('drivings.cancel_action', 'Bekor qilish')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-9 w-9"
                                                            onClick={() => handleEdit(driving)}
                                                            title={t('common.edit', 'Tahrirlash')}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-9 w-9 text-destructive border-destructive/20 hover:bg-destructive/10"
                                                            onClick={() => handleDelete(driving)}
                                                            disabled={isDeleting === driving.id}
                                                            title={t('common.delete', 'O\'chirish')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {driving.status !== 'scheduled' && (
                                                    <span className="text-xs text-muted-foreground">-</span>
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
                <div className="md:hidden p-3 space-y-3 bg-muted/20">
                    {drivings.data.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                            {t('common.no_data', 'Ma\'lumot topilmadi')}
                        </div>
                    ) : (
                        drivings.data.map((driving) => (
                            <div key={driving.id} className="p-4 space-y-3 bg-card border rounded-xl shadow-xs">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold">{driving.student?.full_name || '-'}</div>
                                        <div className="text-sm text-muted-foreground">{driving.student?.phone || ''}</div>
                                    </div>
                                    <div>
                                        {driving.status === 'scheduled' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('status.scheduled', 'Rejada')}</span>}
                                        {driving.status === 'completed' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('status.completed', 'Tugagan')}</span>}
                                        {driving.status === 'cancelled' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('status.cancelled', 'Bekor qilingan')}</span>}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground text-xs block">{t('drivings.date_time', 'Sana / Vaqt')}:</span>
                                        <div className="font-medium">
                                            {(() => {
                                                const d = new Date(driving.start_time);
                                                const startDay = String(d.getDate()).padStart(2, '0');
                                                const startMonth = String(d.getMonth() + 1).padStart(2, '0');
                                                return `${startDay}-${startMonth}-${d.getFullYear()}`;
                                            })()}
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                            {new Date(driving.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} - {new Date(driving.end_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs block">{t('drivings.instructor', 'Instruktor')} / {t('students.group', 'Guruh')}:</span>
                                        <div className="font-medium">{driving.instructor?.name || '-'}</div>
                                        <div className="text-xs px-1.5 py-0.5 mt-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded inline-block">
                                            {driving.group?.name || t('students.no_group', 'Guruhsiz')}
                                        </div>
                                    </div>
                                </div>
                                
                                {!isInstructor && driving.review && (
                                    <div className="bg-muted/50 p-2 rounded text-sm flex items-center justify-between">
                                        <div className="text-yellow-500 font-bold">{driving.review.rating} ⭐</div>
                                        {driving.review.reason_tags && driving.review.reason_tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 justify-end">
                                                {driving.review.reason_tags.map((tag, i) => {
                                                    const isNeg = isNegativeTag(tag);
                                                    return (
                                                        <span
                                                            key={i}
                                                            className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 font-medium ${
                                                                isNeg
                                                                    ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                                            }`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isNeg ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                                            {translateTag(tag)}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="space-y-2 pt-1">
                                    {driving.status === 'scheduled' && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
                                                onClick={() => { setStatusModalDriving(driving); setTargetStatus('completed'); }}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" /> {t('drivings.complete_action', 'Tugatish')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                                                onClick={() => { setStatusModalDriving(driving); setTargetStatus('cancelled'); }}
                                            >
                                                <XCircle className="w-4 h-4 mr-1" /> {t('drivings.cancel_action', 'Bekor qilish')}
                                            </Button>
                                        </div>
                                    )}
                                    {driving.status === 'scheduled' && (
                                        <div className="flex justify-end gap-2 pt-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9"
                                                onClick={() => handleEdit(driving)}
                                                title={t('common.edit', 'Tahrirlash')}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 text-destructive border-destructive/20 hover:bg-destructive/10"
                                                onClick={() => handleDelete(driving)}
                                                disabled={isDeleting === driving.id}
                                                title={t('common.delete', 'O\'chirish')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Pagination links={drivings.links} />
        </div>
    );
}
