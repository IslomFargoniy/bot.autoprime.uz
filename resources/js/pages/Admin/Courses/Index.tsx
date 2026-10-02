import { Head, useForm, router } from '@inertiajs/react';
import { Plus, BookOpen, FileText, Play, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useCan } from '@/hooks/use-can';

interface Topic {
    id: number;
    course_id: number;
    title: string;
    description?: string;
    video_url?: string;
    duration_minutes?: number;
    order_number?: number;
    lesson_materials?: Array<{
        id: number;
        title: string;
        file_url: string;
        file_type: string;
    }>;
}

interface Course {
    id: number;
    category: string;
    title: string;
    description?: string;
    is_active: boolean;
    topics?: Topic[];
}

interface PageProps {
    courses: Course[];
}

export default function CoursesIndex({ courses }: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(
        courses[0] || null,
    );

    // Modals
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [selectedTopicForMaterial, setSelectedTopicForMaterial] =
        useState<Topic | null>(null);

    // Forms
    const courseForm = useForm({
        category: 'B',
        title: '',
        description: '',
        is_active: true,
    });

    const topicForm = useForm({
        title: '',
        description: '',
        video_url: '',
        duration_minutes: 30,
        order_number: 1,
    });

    const materialForm = useForm({
        title: '',
        file_url: '',
        file_type: 'pdf',
    });

    const closeCourseModal = () => {
        setShowCourseModal(false);
        setEditingCourse(null);
        courseForm.reset();
        courseForm.clearErrors();
    };

    const openCreateCourse = () => {
        setEditingCourse(null);
        courseForm.reset();
        setShowCourseModal(true);
    };

    const openEditCourse = (course: Course) => {
        setEditingCourse(course);
        courseForm.clearErrors();
        courseForm.setData({
            category: course.category,
            title: course.title,
            description: course.description ?? '',
            is_active: course.is_active,
        });
        setShowCourseModal(true);
    };

    const handleSaveCourse = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                const wasEditing = !!editingCourse;

                closeCourseModal();
                toast.success(
                    wasEditing
                        ? t('courses.updated', 'Kurs yangilandi')
                        : t('courses.created', 'Kurs yaratildi'),
                );
            },
            onError: (err: Record<string, string>) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        };

        if (editingCourse) {
            courseForm.put(`/admin/courses/${editingCourse.id}`, options);
        } else {
            courseForm.post('/admin/courses', options);
        }
    };

    const handleDeleteCourse = (course: Course) => {
        if (
            !confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            return;
        }

        router.delete(`/admin/courses/${course.id}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const remaining = (page.props as unknown as PageProps).courses;

                setSelectedCourse(remaining[0] ?? null);
                toast.success(t('common.deleted', "O'chirildi"));
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleCreateTopic = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCourse) {
            return;
        }

        topicForm.post(`/admin/courses/${selectedCourse.id}/topics`, {
            onSuccess: () => {
                setShowTopicModal(false);
                topicForm.reset();
                toast.success(t('courses.topic_created', "Mavzu qo'shildi"));
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    const handleCreateMaterial = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTopicForMaterial) {
            return;
        }

        materialForm.post(
            `/admin/topics/${selectedTopicForMaterial.id}/materials`,
            {
                onSuccess: () => {
                    setSelectedTopicForMaterial(null);
                    materialForm.reset();
                    toast.success(
                        t('courses.material_added', "Material qo'shildi"),
                    );
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            },
        );
    };

    return (
        <div className="p-6">
            <Head title={t('courses.title', 'LMS Kurslar va Materiallar')} />

            {/* Page Title & Add Button */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('courses.title', 'LMS Kurslar va Materiallar')}
                </h1>
                {can('lms.manage_materials') && (
                    <Button
                        onClick={openCreateCourse}
                        variant="brand"
                        className="text-xs"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t('courses.add_course', "Kurs Qo'shish")}
                    </Button>
                )}
            </div>

            {/* Course Category Tabs */}
            <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
                {courses.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCourse(c)}
                        className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
                            selectedCourse?.id === c.id
                                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                : 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <span className="h-5 w-5 rounded-full bg-white/20 text-center text-[11px] leading-5 font-bold dark:bg-white/10">
                            {c.category}
                        </span>
                        <span>{c.title}</span>
                        <span className="text-[10px] opacity-70">
                            ({c.topics?.length || 0} mavzu)
                        </span>
                    </button>
                ))}
            </div>

            {/* Selected Course Topics List */}
            {selectedCourse ? (
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-700">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                {selectedCourse.title} (
                                {selectedCourse.category} toifa)
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {selectedCourse.description ||
                                    t('courses.no_desc', 'Tavsif berilmagan')}
                            </p>
                        </div>
                        {can('lms.manage_materials') && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        openEditCourse(selectedCourse)
                                    }
                                    className="text-xs"
                                >
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    {t('common.edit', 'Tahrirlash')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        handleDeleteCourse(selectedCourse)
                                    }
                                    className="border-destructive/30 text-xs text-destructive"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                        {can('lms.manage_materials') && (
                            <Button
                                size="sm"
                                variant="brand"
                                onClick={() => {
                                    topicForm.setData(
                                        'order_number',
                                        (selectedCourse.topics?.length || 0) +
                                            1,
                                    );
                                    setShowTopicModal(true);
                                }}
                                className="text-xs"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                {t('courses.add_topic', "Mavzu Qo'shish")}
                            </Button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {!selectedCourse.topics ||
                        selectedCourse.topics.length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500">
                                {t(
                                    'courses.no_topics',
                                    'Ushbu kursda hali dars mavzulari mavjud emas.',
                                )}
                            </div>
                        ) : (
                            selectedCourse.topics.map((top, idx) => (
                                <div
                                    key={top.id}
                                    className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200/70 bg-gray-50/70 p-4 text-xs md:flex-row md:items-center dark:border-gray-700/60 dark:bg-gray-900/60"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent bg-blue-50 font-bold text-blue-600 dark:border-blue-800/40 dark:bg-blue-950/60 dark:text-blue-400">
                                            {top.order_number || idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                                {top.title}
                                            </h4>
                                            {top.description && (
                                                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                                    {top.description}
                                                </p>
                                            )}
                                            {top.lesson_materials &&
                                                top.lesson_materials.length >
                                                    0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {top.lesson_materials.map(
                                                            (m) => (
                                                                <a
                                                                    key={m.id}
                                                                    href={
                                                                        m.file_url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-blue-400"
                                                                >
                                                                    <FileText className="h-3 w-3 text-red-500" />
                                                                    {m.title}
                                                                </a>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        {top.video_url && (
                                            <a
                                                href={top.video_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1 rounded-md border border-transparent bg-blue-50 px-2.5 py-1 font-medium text-blue-600 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/60"
                                            >
                                                <Play className="h-3 w-3 fill-current" />
                                                Video
                                            </a>
                                        )}
                                        {can('lms.manage_materials') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setSelectedTopicForMaterial(
                                                        top,
                                                    )
                                                }
                                                className="h-7 text-xs"
                                            >
                                                <FileText className="mr-1 h-3 w-3" />
                                                + PDF
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : null}

            {/* Create Course Modal */}
            <Dialog
                open={showCourseModal}
                onOpenChange={(open) =>
                    open ? setShowCourseModal(true) : closeCourseModal()
                }
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            {editingCourse
                                ? t(
                                      'courses.edit_course_title',
                                      'Kursni tahrirlash',
                                  )
                                : t(
                                      'courses.create_course_title',
                                      'Yangi Kurs Yaratish',
                                  )}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={handleSaveCourse}
                        className="space-y-4 text-xs"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label required htmlFor="c_cat">
                                    {t('courses.category', 'Toifa')}
                                </Label>
                                <SearchableSelect
                                    id="c_cat"
                                    value={courseForm.data.category}
                                    onChange={(val) =>
                                        courseForm.setData(
                                            'category',
                                            String(val),
                                        )
                                    }
                                    options={[
                                        { value: 'B', label: 'B toifa' },
                                        { value: 'A', label: 'A toifa' },
                                        { value: 'C', label: 'C toifa' },
                                        { value: 'BC', label: 'BC toifa' },
                                        { value: 'D', label: 'D toifa' },
                                        { value: 'E', label: 'E toifa' },
                                    ]}
                                    className="mt-1"
                                    disabled={!!editingCourse}
                                />
                            </div>
                            <div>
                                <Label required htmlFor="c_title">
                                    {t('courses.course_title', 'Kurs Nomi')}
                                </Label>
                                <Input
                                    id="c_title"
                                    value={courseForm.data.title}
                                    onChange={(e) =>
                                        courseForm.setData(
                                            'title',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="B toifasi bo'yicha to'liq nazariy kurs"
                                    required
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="c_desc">
                                {t('courses.desc', 'Tavsif')}
                            </Label>
                            <Input
                                id="c_desc"
                                value={courseForm.data.description}
                                onChange={(e) =>
                                    courseForm.setData(
                                        'description',
                                        e.target.value,
                                    )
                                }
                                className="mt-1"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={courseForm.data.is_active}
                                onChange={(e) =>
                                    courseForm.setData(
                                        'is_active',
                                        e.target.checked,
                                    )
                                }
                                className="h-4 w-4 rounded border-input"
                            />
                            {t('courses.is_active', 'Kurs faol')}
                        </label>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeCourseModal}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={courseForm.processing}
                            >
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Topic Modal */}
            <Dialog open={showTopicModal} onOpenChange={setShowTopicModal}>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            {t(
                                'courses.create_topic_title',
                                "Yangi Mavzu Qo'shish",
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={handleCreateTopic}
                        className="space-y-4 text-xs"
                    >
                        <div>
                            <Label required htmlFor="top_title">
                                {t('courses.topic_title', 'Mavzu Nomi')}
                            </Label>
                            <Input
                                id="top_title"
                                value={topicForm.data.title}
                                onChange={(e) =>
                                    topicForm.setData('title', e.target.value)
                                }
                                placeholder="1-Mavzu: Umumiy qoidalar"
                                required
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="top_video">
                                {t(
                                    'courses.video_url',
                                    'Video Havolasi (YouTube / Vimeo)',
                                )}
                            </Label>
                            <Input
                                id="top_video"
                                type="url"
                                value={topicForm.data.video_url}
                                onChange={(e) =>
                                    topicForm.setData(
                                        'video_url',
                                        e.target.value,
                                    )
                                }
                                placeholder="https://youtube.com/..."
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="top_duration">
                                    {t(
                                        'courses.duration',
                                        'Davomiyligi (daqiqa)',
                                    )}
                                </Label>
                                <Input
                                    id="top_duration"
                                    type="number"
                                    value={topicForm.data.duration_minutes}
                                    onChange={(e) =>
                                        topicForm.setData(
                                            'duration_minutes',
                                            Number(e.target.value),
                                        )
                                    }
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="top_order">
                                    {t('courses.order', 'Tartib raqami')}
                                </Label>
                                <Input
                                    id="top_order"
                                    type="number"
                                    value={topicForm.data.order_number}
                                    onChange={(e) =>
                                        topicForm.setData(
                                            'order_number',
                                            Number(e.target.value),
                                        )
                                    }
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowTopicModal(false)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={topicForm.processing}
                            >
                                {t('common.save', 'Mavzuni Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add PDF Material Modal */}
            <Dialog
                open={!!selectedTopicForMaterial}
                onOpenChange={(open) =>
                    !open && setSelectedTopicForMaterial(null)
                }
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-red-500" />
                            {t(
                                'courses.add_material_title',
                                'PDF Material Biriktirish',
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTopicForMaterial && (
                        <form
                            onSubmit={handleCreateMaterial}
                            className="space-y-4 text-xs"
                        >
                            <div>
                                <Label required htmlFor="mat_title">
                                    {t(
                                        'courses.material_title',
                                        'Material Nomi',
                                    )}
                                </Label>
                                <Input
                                    id="mat_title"
                                    value={materialForm.data.title}
                                    onChange={(e) =>
                                        materialForm.setData(
                                            'title',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="1-Mavzu slaydlari va yo'l belgilari"
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label required htmlFor="mat_url">
                                    {t(
                                        'courses.file_url',
                                        'PDF Fayl Havolasi (URL)',
                                    )}
                                </Label>
                                <Input
                                    id="mat_url"
                                    type="url"
                                    value={materialForm.data.file_url}
                                    onChange={(e) =>
                                        materialForm.setData(
                                            'file_url',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="https://..."
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setSelectedTopicForMaterial(null)
                                    }
                                >
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="brand"
                                    disabled={materialForm.processing}
                                >
                                    {t('common.save', 'Biriktirish')}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
