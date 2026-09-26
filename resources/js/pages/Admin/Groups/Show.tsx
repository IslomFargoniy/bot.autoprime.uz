import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Users, Upload, ArrowLeft, Download, Trash2, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { useRef, useState } from 'react';
import { SharedData } from '@/types/auth';

interface Group {
    id: number;
    name: string;
    instructor?: {
        name: string;
    };
    course?: {
        id: number;
        name: string;
    } | null;
}

interface Student {
    id: number;
    full_name: string;
    phone: string;
    completed_drivings_count?: number;
}

interface PageProps {
    group: Group;
    students: Student[];
}

export default function GroupShow({ group, students }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth?.user?.role === 'instructor';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const { data, setData, post, errors, reset } = useForm({
        file: null as File | null,
    });

    const handleDeleteStudent = (studentId: number) => {
        if (confirm(t('common.confirm_delete', 'Haqiqatdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/students/${studentId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setData('file', e.target.files[0]);
        }
    };

    const submitUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.file) return;
        setUploading(true);
        post(`/admin/groups/${group.id}/import-students`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setUploading(false);
                reset('file');
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: () => setUploading(false),
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
            <Head title={`${group.name} - ${t('groups.title', 'Guruhlar')}`} />
            
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div>
                        <Link href="/admin/groups" className="text-sm text-blue-600 hover:underline flex items-center mb-2">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            {t('common.back', 'Ortga')}
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                            {group.name}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('groups.instructor_label', 'Instruktor')}: {group.instructor?.name || t('common.not_assigned', 'Biriktirilmagan')} • {t('groups.students_count_label', 'Talabalar soni')}: {students.length}
                            {group.course && ` • LMS: ${group.course.name}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Link href={`/admin/attendance?group_id=${group.id}&action=mark`}>
                                <CheckSquare className="w-4 h-4 mr-2" />
                                {t('groups.take_attendance', 'Davomat')}
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = `/admin/groups/${group.id}/export-students`}>
                            <Download className="w-4 h-4 mr-2" />
                            {t('common.export_excel', 'Excel yuklab olish')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Import */}
                    {!isInstructor && (
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-green-600" />
                                    {t('groups.import_excel', 'Excel orqali yuklash')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    {t('groups.excel_columns_hint', "Ustunlar: full_name, phone bo'lishi kerak.")}
                                </p>
                                
                                <div className="mb-6">
                                    <a 
                                        href="/admin/groups/download-template" 
                                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                        target="_blank"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        {t('groups.download_template', 'Shablonni yuklab olish')}
                                    </a>
                                </div>
                                
                                <form onSubmit={submitUpload} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label required>{t('groups.select_file', 'Faylni tanlang')}</Label>
                                        <Input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                            className="cursor-pointer"
                                        />
                                        {errors.file && <div className="text-red-500 text-sm mt-1">{errors.file}</div>}
                                    </div>
                                    <Button type="submit" variant="brand" disabled={!data.file || uploading} className="w-full">
                                        {uploading ? t('common.uploading', 'Yuklanmoqda...') : t('common.upload', 'Yuklash')}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Right Column - Students List */}
                    <div className={isInstructor ? 'col-span-full' : 'lg:col-span-2'}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('groups.students_title', 'Guruh Talabalari')}</h2>
                            </div>
                            <div>
                                {/* Desktop Table */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">{t('common.number', '№')}</TableHead>
                                                <TableHead>{t('students.full_name', 'F.I.SH')}</TableHead>
                                                <TableHead>{t('students.phone', 'Telefon')}</TableHead>
                                                <TableHead className="text-center">{t('students.completed_drivings', 'Tugagan darslar')}</TableHead>
                                                {!isInstructor && <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.length === 0 ? (
                                                <TableEmpty
                                                    colSpan={isInstructor ? 4 : 5}
                                                    icon={Users}
                                                    title={t('groups.no_students_in_group', "Guruhda hozircha talabalar yo'q")}
                                                    description={t('groups.no_students_in_group_desc', "Excel orqali talabalarni yuklang")}
                                                />
                                            ) : (
                                                students.map((student, index) => (
                                                    <TableRow key={student.id}>
                                                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                        <TableCell className="font-medium text-foreground">
                                                            {student.full_name}
                                                        </TableCell>
                                                        <TableCell>{student.phone || '-'}</TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                                {student.completed_drivings_count || 0}
                                                            </span>
                                                        </TableCell>
                                                        {!isInstructor && (
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)} className="h-8 w-8 text-destructive hover:text-destructive/90">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden p-3 space-y-3 bg-muted/20">
                                    {students.length === 0 ? (
                                        <div className="p-6 text-center text-muted-foreground text-sm">
                                            {t('groups.no_students_in_group', "Guruhda hozircha talabalar yo'q")}
                                        </div>
                                    ) : (
                                        students.map((student, index) => (
                                            <div key={student.id} className="p-4 space-y-2 bg-card border rounded-xl shadow-xs">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-semibold">{index + 1}. {student.full_name}</div>
                                                        <div className="text-sm text-muted-foreground">{student.phone || '-'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                {student.completed_drivings_count || 0} {t('drivings.lessons_suffix', 'dars')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {!isInstructor && (
                                                    <div className="flex justify-end pt-2 border-t">
                                                        <Button variant="outline" size="sm" onClick={() => handleDeleteStudent(student.id)} className="h-8 gap-1 text-xs text-destructive border-destructive/30">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            {t('common.delete', 'O\'chirish')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
