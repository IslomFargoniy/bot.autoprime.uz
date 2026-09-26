import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    BookOpen,
    Video,
    FileText,
    Play,
    Download,
    Trash2,
    Clock,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(courses[0] || null);

    // Modals
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [selectedTopicForMaterial, setSelectedTopicForMaterial] = useState<Topic | null>(null);

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

    const handleCreateCourse = (e: React.FormEvent) => {
        e.preventDefault();
        courseForm.post('/admin/courses', {
            onSuccess: () => {
                setShowCourseModal(false);
                courseForm.reset();
                toast.success(t('courses.created', 'Kurs yaratildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleCreateTopic = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;

        topicForm.post(`/admin/courses/${selectedCourse.id}/topics`, {
            onSuccess: () => {
                setShowTopicModal(false);
                topicForm.reset();
                toast.success(t('courses.topic_created', 'Mavzu qo\'shildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleCreateMaterial = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTopicForMaterial) return;

        materialForm.post(`/admin/topics/${selectedTopicForMaterial.id}/materials`, {
            onSuccess: () => {
                setSelectedTopicForMaterial(null);
                materialForm.reset();
                toast.success(t('courses.material_added', 'Material qo\'shildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    return (
        <div className="p-6">
            <Head title={t('courses.title', 'LMS Kurslar va Materiallar')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('courses.title', 'LMS Kurslar va Materiallar')}</h1>
                <Button onClick={() => setShowCourseModal(true)} variant="brand" className="text-xs">
                    <Plus className="w-4 h-4 mr-1.5" />
                    {t('courses.add_course', 'Kurs Qo\'shish')}
                </Button>
            </div>

            {/* Course Category Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
                {courses.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCourse(c)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 shrink-0 ${
                            selectedCourse?.id === c.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                        }`}
                    >
                        <span className="w-5 h-5 rounded-full bg-white/20 dark:bg-white/10 text-center leading-5 text-[11px] font-bold">
                            {c.category}
                        </span>
                        <span>{c.title}</span>
                        <span className="text-[10px] opacity-70">({c.topics?.length || 0} mavzu)</span>
                    </button>
                ))}
            </div>

            {/* Selected Course Topics List */}
            {selectedCourse ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4 mb-4 gap-2 flex-wrap">
                        <div>
                            <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                {selectedCourse.title} ({selectedCourse.category} toifa)
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedCourse.description || t('courses.no_desc', 'Tavsif berilmagan')}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="brand"
                            onClick={() => {
                                topicForm.setData('order_number', (selectedCourse.topics?.length || 0) + 1);
                                setShowTopicModal(true);
                            }}
                            className="text-xs"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {t('courses.add_topic', 'Mavzu Qo\'shish')}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {!selectedCourse.topics || selectedCourse.topics.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                                {t('courses.no_topics', 'Ushbu kursda hali dars mavzulari mavjud emas.')}
                            </div>
                        ) : (
                            selectedCourse.topics.map((top, idx) => (
                                <div
                                    key={top.id}
                                    className="p-4 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 font-bold flex items-center justify-center shrink-0">
                                            {top.order_number || idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-xs">{top.title}</h4>
                                            {top.description && (
                                                <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">{top.description}</p>
                                            )}
                                            {top.lesson_materials && top.lesson_materials.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {top.lesson_materials.map((m) => (
                                                        <a
                                                            key={m.id}
                                                            href={m.file_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                                        >
                                                            <FileText className="w-3 h-3 text-red-500" />
                                                            {m.title}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {top.video_url && (
                                            <a
                                                href={top.video_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 font-medium flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                                Video
                                            </a>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedTopicForMaterial(top)}
                                            className="h-7 text-xs"
                                        >
                                            <FileText className="w-3 h-3 mr-1" />
                                            + PDF
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : null}

            {/* Create Course Modal */}
            <Dialog open={showCourseModal} onOpenChange={setShowCourseModal}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {t('courses.create_course_title', 'Yangi Kurs Yaratish')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label required htmlFor="c_cat">{t('courses.category', 'Toifa')}</Label>
                                <SearchableSelect
                                    id="c_cat"
                                    value={courseForm.data.category}
                                    onChange={(val) => courseForm.setData('category', String(val))}
                                    options={[
                                        { value: 'B', label: 'B toifa' },
                                        { value: 'A', label: 'A toifa' },
                                        { value: 'C', label: 'C toifa' },
                                        { value: 'BC', label: 'BC toifa' },
                                        { value: 'D', label: 'D toifa' },
                                        { value: 'E', label: 'E toifa' },
                                    ]}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label required htmlFor="c_title">{t('courses.course_title', 'Kurs Nomi')}</Label>
                                <Input
                                    id="c_title"
                                    value={courseForm.data.title}
                                    onChange={(e) => courseForm.setData('title', e.target.value)}
                                    placeholder="B toifasi bo'yicha to'liq nazariy kurs"
                                    required
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="c_desc">{t('courses.desc', 'Tavsif')}</Label>
                            <Input
                                id="c_desc"
                                value={courseForm.data.description}
                                onChange={(e) => courseForm.setData('description', e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowCourseModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={courseForm.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Topic Modal */}
            <Dialog open={showTopicModal} onOpenChange={setShowTopicModal}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {t('courses.create_topic_title', 'Yangi Mavzu Qo\'shish')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTopic} className="space-y-4 text-xs">
                        <div>
                            <Label required htmlFor="top_title">{t('courses.topic_title', 'Mavzu Nomi')}</Label>
                            <Input
                                id="top_title"
                                value={topicForm.data.title}
                                onChange={(e) => topicForm.setData('title', e.target.value)}
                                placeholder="1-Mavzu: Umumiy qoidalar"
                                required
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="top_video">{t('courses.video_url', 'Video Havolasi (YouTube / Vimeo)')}</Label>
                            <Input
                                id="top_video"
                                type="url"
                                value={topicForm.data.video_url}
                                onChange={(e) => topicForm.setData('video_url', e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="top_duration">{t('courses.duration', 'Davomiyligi (daqiqa)')}</Label>
                                <Input
                                    id="top_duration"
                                    type="number"
                                    value={topicForm.data.duration_minutes}
                                    onChange={(e) => topicForm.setData('duration_minutes', Number(e.target.value))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="top_order">{t('courses.order', 'Tartib raqami')}</Label>
                                <Input
                                    id="top_order"
                                    type="number"
                                    value={topicForm.data.order_number}
                                    onChange={(e) => topicForm.setData('order_number', Number(e.target.value))}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowTopicModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" variant="brand" disabled={topicForm.processing}>
                                {t('common.save', 'Mavzuni Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add PDF Material Modal */}
            <Dialog open={!!selectedTopicForMaterial} onOpenChange={(open) => !open && setSelectedTopicForMaterial(null)}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-red-500" />
                            {t('courses.add_material_title', 'PDF Material Biriktirish')}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTopicForMaterial && (
                        <form onSubmit={handleCreateMaterial} className="space-y-4 text-xs">
                            <div>
                                <Label required htmlFor="mat_title">{t('courses.material_title', 'Material Nomi')}</Label>
                                <Input
                                    id="mat_title"
                                    value={materialForm.data.title}
                                    onChange={(e) => materialForm.setData('title', e.target.value)}
                                    placeholder="1-Mavzu slaydlari va yo'l belgilari"
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label required htmlFor="mat_url">{t('courses.file_url', 'PDF Fayl Havolasi (URL)')}</Label>
                                <Input
                                    id="mat_url"
                                    type="url"
                                    value={materialForm.data.file_url}
                                    onChange={(e) => materialForm.setData('file_url', e.target.value)}
                                    placeholder="https://..."
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setSelectedTopicForMaterial(null)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" variant="brand" disabled={materialForm.processing}>
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
