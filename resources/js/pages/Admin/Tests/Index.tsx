import { useState, useRef, ChangeEvent } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    BookOpen,
    CheckCircle2,
    ExternalLink,
    HelpCircle,
    RotateCcw,
    Search,
    XCircle,
    Eye,
    Plus,
    Pencil,
    Trash2,
    ImageIcon,
    Layers,
    FolderPlus,
    UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableEmpty,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import Pagination from '@/components/pagination';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';

interface Attempt {
    id: number;
    student_id?: number;
    ticket_id?: number;
    attempt_type: string;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    score_percentage: number | string;
    is_passed: boolean;
    duration_seconds: number;
    created_at: string;
    student?: {
        id: number;
        full_name: string;
        phone: string;
        branch?: { name: string };
    };
    ticket?: {
        id: number;
        ticket_number: number;
        title_uz: string;
    };
}

interface Ticket {
    id: number;
    ticket_number: number;
    title_uz: string;
    description?: string;
    questions_count?: number;
    is_active?: boolean;
}

interface SignCategory {
    id: number;
    name_uz: string;
    name_ru?: string;
    slug: string;
    order: number;
    signs: Array<{
        id: number;
        category_id: number;
        sign_number: string;
        name_uz: string;
        description_uz?: string;
        image_url?: string;
    }>;
}

interface RoadLine {
    id: number;
    line_number: string;
    name_uz: string;
    description_uz?: string;
    image_url?: string;
}

interface PageProps {
    attempts: {
        data: Attempt[];
        links: any[];
        total: number;
    };
    stats: {
        total_tickets: number;
        total_questions: number;
        total_signs: number;
        total_attempts: number;
        passed_attempts: number;
    };
    tickets: Ticket[];
    signCategories: SignCategory[];
    roadLines: RoadLine[];
    filters: {
        search?: string;
        status?: string;
        type?: string;
    };
}

export default function TestsIndex({
    attempts,
    stats,
    tickets,
    signCategories,
    roadLines,
    filters,
}: PageProps) {
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'attempts' | 'tickets' | 'signs'>('attempts');
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');

    // Ticket inspection modal state
    const [inspectingTicket, setInspectingTicket] = useState<Ticket | null>(null);
    const [ticketQuestions, setTicketQuestions] = useState<any[]>([]);
    const [loadingTicketQuestions, setLoadingTicketQuestions] = useState(false);

    // Management Modals: Ticket
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [ticketNumber, setTicketNumber] = useState('');
    const [ticketTitle, setTicketTitle] = useState('');
    const [ticketDesc, setTicketDesc] = useState('');

    // Management Modals: Question
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
    const [questionText, setQuestionText] = useState('');
    const [questionDesc, setQuestionDesc] = useState('');
    const [questionFile, setQuestionFile] = useState<File | null>(null);
    const [questionPreview, setQuestionPreview] = useState<string | null>(null);
    const [removeQuestionImage, setRemoveQuestionImage] = useState(false);
    const [questionAnswers, setQuestionAnswers] = useState<Array<{ text: string; is_correct: boolean }>>([
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
    ]);

    // Management Modals: Sign
    const [showSignModal, setShowSignModal] = useState(false);
    const [editingSign, setEditingSign] = useState<any | null>(null);
    const [signCategoryId, setSignCategoryId] = useState<number>(signCategories[0]?.id || 1);
    const [signNumber, setSignNumber] = useState('');
    const [signName, setSignName] = useState('');
    const [signDesc, setSignDesc] = useState('');
    const [signFile, setSignFile] = useState<File | null>(null);
    const [signPreview, setSignPreview] = useState<string | null>(null);
    const [removeSignImage, setRemoveSignImage] = useState(false);

    // Management Modals: Road Line
    const [showRoadLineModal, setShowRoadLineModal] = useState(false);
    const [editingRoadLine, setEditingRoadLine] = useState<RoadLine | null>(null);
    const [roadLineNumber, setRoadLineNumber] = useState('');
    const [roadLineName, setRoadLineName] = useState('');
    const [roadLineDesc, setRoadLineDesc] = useState('');
    const [roadLineFile, setRoadLineFile] = useState<File | null>(null);
    const [roadLinePreview, setRoadLinePreview] = useState<string | null>(null);
    const [removeRoadLineImage, setRemoveRoadLineImage] = useState(false);

    // Management Modals: Category
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<SignCategory | null>(null);
    const [categoryName, setCategoryName] = useState('');

    // Signs category filter
    const [selectedSignCategory, setSelectedSignCategory] = useState<number | 'lines' | 'all'>('all');
    const [ticketSearch, setTicketSearch] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const signFileInputRef = useRef<HTMLInputElement>(null);
    const lineFileInputRef = useRef<HTMLInputElement>(null);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/tests',
            {
                search: search || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('');
        setTypeFilter('');
        router.get('/admin/tests', {}, { preserveState: true });
    };

    const openTicketDetails = async (ticket: Ticket) => {
        setInspectingTicket(ticket);
        setLoadingTicketQuestions(true);
        try {
            const res = await fetch(`/api/tests/ticket/${ticket.id}`);
            const data = await res.json();
            if (data.success && data.ticket?.questions) {
                setTicketQuestions(data.ticket.questions);
            } else {
                setTicketQuestions([]);
            }
        } catch {
            setTicketQuestions([]);
        } finally {
            setLoadingTicketQuestions(false);
        }
    };

    // Helper for image url
    const formatImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('/storage')) return url;
        return `/storage/${url.replace(/^\/+/, '')}`;
    };

    // ==========================================
    // TICKET CRUD
    // ==========================================
    const openCreateTicketModal = () => {
        setEditingTicket(null);
        setTicketNumber(String(tickets.length + 1));
        setTicketTitle(`Bilet ${tickets.length + 1}`);
        setTicketDesc('');
        setShowTicketModal(true);
    };

    const openEditTicketModal = (tkt: Ticket, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingTicket(tkt);
        setTicketNumber(String(tkt.ticket_number));
        setTicketTitle(tkt.title_uz);
        setTicketDesc(tkt.description || '');
        setShowTicketModal(true);
    };

    const handleTicketSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTicket) {
            router.put(
                `/admin/tests/tickets/${editingTicket.id}`,
                {
                    ticket_number: Number(ticketNumber),
                    title_uz: ticketTitle,
                    description: ticketDesc,
                },
                {
                    onSuccess: () => {
                        setShowTicketModal(false);
                        if (inspectingTicket && editingTicket && inspectingTicket.id === editingTicket.id) {
                            setInspectingTicket({
                                ...inspectingTicket,
                                ticket_number: Number(ticketNumber),
                                title_uz: ticketTitle,
                                description: ticketDesc,
                            });
                        }
                        toast.success(t('tests.ticket_updated', 'Bilet yangilandi'));
                    },
                    onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
                }
            );
        } else {
            router.post(
                '/admin/tests/tickets',
                {
                    ticket_number: Number(ticketNumber),
                    title_uz: ticketTitle,
                    description: ticketDesc,
                },
                {
                    onSuccess: () => {
                        setShowTicketModal(false);
                        toast.success(t('tests.ticket_created', 'Bilet yaratildi'));
                    },
                    onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
                }
            );
        }
    };

    const handleDeleteTicket = (tkt: Ticket, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (window.confirm(t('tests.confirm_delete_ticket', 'Ushbu bilet va uning barcha savollari o\'chiriladi. Rozimisiz?'))) {
            router.delete(`/admin/tests/tickets/${tkt.id}`, {
                onSuccess: () => {
                    if (inspectingTicket?.id === tkt.id) {
                        setInspectingTicket(null);
                    }
                    toast.success(t('tests.ticket_deleted', 'Bilet o\'chirildi'));
                },
            });
        }
    };

    // ==========================================
    // QUESTION CRUD
    // ==========================================
    const openCreateQuestionModal = () => {
        setEditingQuestion(null);
        setQuestionText('');
        setQuestionDesc('');
        setQuestionFile(null);
        setQuestionPreview(null);
        setRemoveQuestionImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setQuestionAnswers([
            { text: '', is_correct: true },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
        ]);
        setShowQuestionModal(true);
    };

    const openEditQuestionModal = (q: any) => {
        setEditingQuestion(q);
        setQuestionText(q.question_uz);
        setQuestionDesc(q.description_uz || '');
        setQuestionFile(null);
        setQuestionPreview(formatImageUrl(q.image_url));
        setRemoveQuestionImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (q.answers && q.answers.length > 0) {
            setQuestionAnswers(q.answers.map((a: any) => ({ text: a.answer_uz, is_correct: !!a.is_correct })));
        } else {
            setQuestionAnswers([
                { text: '', is_correct: true },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
            ]);
        }
        setShowQuestionModal(true);
    };

    const handleQuestionImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setQuestionFile(file);
            setQuestionPreview(URL.createObjectURL(file));
            setRemoveQuestionImage(false);
        }
    };

    const handleRemoveQuestionImage = () => {
        setQuestionFile(null);
        setQuestionPreview(null);
        setRemoveQuestionImage(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addQuestionAnswerOption = () => {
        setQuestionAnswers([...questionAnswers, { text: '', is_correct: false }]);
    };

    const removeQuestionAnswerOption = (index: number) => {
        if (questionAnswers.length <= 2) return;
        const next = [...questionAnswers];
        const removedWasCorrect = next[index].is_correct;
        next.splice(index, 1);
        if (removedWasCorrect && next.length > 0) {
            next[0].is_correct = true;
        }
        setQuestionAnswers(next);
    };

    const handleQuestionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inspectingTicket) return;

        const hasCorrect = questionAnswers.some((a) => a.is_correct && a.text.trim());
        if (!hasCorrect) {
            toast.error(t('tests.error_no_correct_answer', 'Kamida bitta to\'g\'ri javob belgilanishi shart'));
            return;
        }

        const validAnswers = questionAnswers.filter((a) => a.text.trim());
        if (validAnswers.length < 2) {
            toast.error(t('tests.error_min_answers', 'Kamida 2 ta javob varianti kiritilishi shart'));
            return;
        }

        const formData = new FormData();
        formData.append('ticket_id', String(inspectingTicket.id));
        formData.append('question_uz', questionText);
        formData.append('description_uz', questionDesc || '');

        if (questionFile) {
            formData.append('image', questionFile);
        } else if (removeQuestionImage) {
            formData.append('remove_image', '1');
        }

        validAnswers.forEach((ans, idx) => {
            formData.append(`answers[${idx}][text]`, ans.text);
            formData.append(`answers[${idx}][is_correct]`, ans.is_correct ? '1' : '0');
        });

        if (editingQuestion) {
            formData.append('_method', 'PUT');
            router.post(`/admin/tests/questions/${editingQuestion.id}`, formData, {
                onSuccess: () => {
                    setShowQuestionModal(false);
                    openTicketDetails(inspectingTicket);
                    toast.success(t('tests.question_updated', 'Savol yangilandi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        } else {
            router.post('/admin/tests/questions', formData, {
                onSuccess: () => {
                    setShowQuestionModal(false);
                    openTicketDetails(inspectingTicket);
                    toast.success(t('tests.question_created', 'Savol qo\'shildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleDeleteQuestion = (q: any) => {
        if (window.confirm(t('tests.confirm_delete_question', 'Ushbu savolni rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/tests/questions/${q.id}`, {
                onSuccess: () => {
                    if (inspectingTicket) openTicketDetails(inspectingTicket);
                    toast.success(t('tests.question_deleted', 'Savol o\'chirildi'));
                },
            });
        }
    };

    // ==========================================
    // SIGN CRUD
    // ==========================================
    const openCreateSignModal = () => {
        setEditingSign(null);
        setSignCategoryId(signCategories[0]?.id || 1);
        setSignNumber('');
        setSignName('');
        setSignDesc('');
        setSignFile(null);
        setSignPreview(null);
        setRemoveSignImage(false);
        if (signFileInputRef.current) signFileInputRef.current.value = '';
        setShowSignModal(true);
    };

    const openEditSignModal = (sign: any) => {
        setEditingSign(sign);
        setSignCategoryId(sign.category_id);
        setSignNumber(sign.sign_number);
        setSignName(sign.name_uz);
        setSignDesc(sign.description_uz || '');
        setSignFile(null);
        setSignPreview(formatImageUrl(sign.image_url));
        setRemoveSignImage(false);
        if (signFileInputRef.current) signFileInputRef.current.value = '';
        setShowSignModal(true);
    };

    const handleSignImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSignFile(file);
            setSignPreview(URL.createObjectURL(file));
            setRemoveSignImage(false);
        }
    };

    const handleRemoveSignImage = () => {
        setSignFile(null);
        setSignPreview(null);
        setRemoveSignImage(true);
        if (signFileInputRef.current) signFileInputRef.current.value = '';
    };

    const handleSignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('category_id', String(signCategoryId));
        formData.append('sign_number', signNumber);
        formData.append('name_uz', signName);
        formData.append('description_uz', signDesc || '');

        if (signFile) {
            formData.append('image', signFile);
        } else if (removeSignImage) {
            formData.append('remove_image', '1');
        }

        if (editingSign) {
            formData.append('_method', 'PUT');
            router.post(`/admin/tests/signs/${editingSign.id}`, formData, {
                onSuccess: () => {
                    setShowSignModal(false);
                    toast.success(t('tests.sign_updated', 'Yo\'l belgisi yangilandi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        } else {
            router.post('/admin/tests/signs', formData, {
                onSuccess: () => {
                    setShowSignModal(false);
                    toast.success(t('tests.sign_created', 'Yo\'l belgisi qo\'shildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleDeleteSign = (sign: any) => {
        if (window.confirm(t('tests.confirm_delete_sign', 'Ushbu yo\'l belgisini o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/tests/signs/${sign.id}`, {
                onSuccess: () => toast.success(t('tests.sign_deleted', 'Yo\'l belgisi o\'chirildi')),
            });
        }
    };

    // ==========================================
    // ROAD LINE CRUD
    // ==========================================
    const openCreateRoadLineModal = () => {
        setEditingRoadLine(null);
        setRoadLineNumber('');
        setRoadLineName('');
        setRoadLineDesc('');
        setRoadLineFile(null);
        setRoadLinePreview(null);
        setRemoveRoadLineImage(false);
        if (lineFileInputRef.current) lineFileInputRef.current.value = '';
        setShowRoadLineModal(true);
    };

    const openEditRoadLineModal = (line: RoadLine) => {
        setEditingRoadLine(line);
        setRoadLineNumber(line.line_number || (line as any).number || '');
        setRoadLineName(line.name_uz);
        setRoadLineDesc(line.description_uz || '');
        setRoadLineFile(null);
        setRoadLinePreview(formatImageUrl(line.image_url));
        setRemoveRoadLineImage(false);
        if (lineFileInputRef.current) lineFileInputRef.current.value = '';
        setShowRoadLineModal(true);
    };

    const handleRoadLineImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRoadLineFile(file);
            setRoadLinePreview(URL.createObjectURL(file));
            setRemoveRoadLineImage(false);
        }
    };

    const handleRemoveRoadLineImage = () => {
        setRoadLineFile(null);
        setRoadLinePreview(null);
        setRemoveRoadLineImage(true);
        if (lineFileInputRef.current) lineFileInputRef.current.value = '';
    };

    const handleRoadLineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('line_number', roadLineNumber);
        formData.append('name_uz', roadLineName);
        formData.append('description_uz', roadLineDesc || '');

        if (roadLineFile) {
            formData.append('image', roadLineFile);
        } else if (removeRoadLineImage) {
            formData.append('remove_image', '1');
        }

        if (editingRoadLine) {
            formData.append('_method', 'PUT');
            router.post(`/admin/tests/road-lines/${editingRoadLine.id}`, formData, {
                onSuccess: () => {
                    setShowRoadLineModal(false);
                    toast.success(t('tests.road_line_updated', 'Yo\'l chizig\'i yangilandi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        } else {
            router.post('/admin/tests/road-lines', formData, {
                onSuccess: () => {
                    setShowRoadLineModal(false);
                    toast.success(t('tests.road_line_created', 'Yo\'l chizig\'i qo\'shildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleDeleteRoadLine = (line: RoadLine) => {
        if (window.confirm(t('tests.confirm_delete_road_line', 'Ushbu yo\'l chizig\'ini o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/tests/road-lines/${line.id}`, {
                onSuccess: () => toast.success(t('tests.road_line_deleted', 'Yo\'l chizig\'i o\'chirildi')),
            });
        }
    };

    // ==========================================
    // CATEGORY CRUD
    // ==========================================
    const openCreateCategoryModal = () => {
        setEditingCategory(null);
        setCategoryName('');
        setShowCategoryModal(true);
    };

    const handleCategorySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            router.put(`/admin/tests/sign-categories/${editingCategory.id}`, {
                name_uz: categoryName,
            }, {
                onSuccess: () => {
                    setShowCategoryModal(false);
                    toast.success(t('tests.category_updated', 'Toifa yangilandi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        } else {
            router.post('/admin/tests/sign-categories', {
                name_uz: categoryName,
            }, {
                onSuccess: () => {
                    setShowCategoryModal(false);
                    toast.success(t('tests.category_created', 'Toifa qo\'shildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleDeleteCategory = (cat: SignCategory) => {
        if (window.confirm(t('tests.confirm_delete_category', 'Ushbu toifa va uning barcha belgilari o\'chiriladi. Rozimisiz?'))) {
            router.delete(`/admin/tests/sign-categories/${cat.id}`, {
                onSuccess: () => {
                    setSelectedSignCategory('all');
                    toast.success(t('tests.category_deleted', 'Toifa o\'chirildi'));
                },
            });
        }
    };

    const formatSeconds = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m} ${t('common.minutes', 'daq')} ${s} ${t('common.seconds', 'son')}`;
    };

    const passRate =
        stats.total_attempts > 0
            ? Math.round((stats.passed_attempts / stats.total_attempts) * 100)
            : 0;

    const filteredTickets = tickets.filter(
        (tkt) =>
            !ticketSearch ||
            String(tkt.ticket_number).includes(ticketSearch) ||
            tkt.title_uz.toLowerCase().includes(ticketSearch.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <Head title={t('tests.page_title', 'Testlar & Imtihonlar')} />

            {/* Header: Title and primary actions inline */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t('tests.page_title', 'Testlar & Imtihonlar')}
                    </h1>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {activeTab === 'tickets' && (
                        <Button onClick={openCreateTicketModal} size="sm" variant="brand" className="text-xs">
                            <Plus className="w-4 h-4 mr-1.5" />
                            {t('tests.add_ticket', '+ Bilet Qo\'shish')}
                        </Button>
                    )}
                    {activeTab === 'signs' && selectedSignCategory === 'lines' && (
                        <Button onClick={openCreateRoadLineModal} size="sm" variant="brand" className="text-xs">
                            <Plus className="w-4 h-4 mr-1.5" />
                            {t('tests.add_road_line', '+ Chiziq Qo\'shish')}
                        </Button>
                    )}
                    {activeTab === 'signs' && selectedSignCategory !== 'lines' && (
                        <>
                            <Button onClick={openCreateSignModal} size="sm" variant="brand" className="text-xs">
                                <Plus className="w-4 h-4 mr-1.5" />
                                {t('tests.add_sign', '+ Belgi Qo\'shish')}
                            </Button>
                            <Button onClick={openCreateCategoryModal} variant="outline" size="sm" className="text-xs">
                                <FolderPlus className="w-4 h-4 mr-1.5" />
                                {t('tests.add_category', '+ Toifa Qo\'shish')}
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/mini-app', '_blank')}
                        className="text-xs"
                    >
                        <ExternalLink className="w-4 h-4 mr-1.5" />
                        {t('tests.preview_mini_app', 'O\'quvchi Mini Appida Ko\'rish')}
                    </Button>
                </div>
            </div>

            {/* KPI Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs">
                    <p className="text-xs text-muted-foreground font-medium">
                        {t('tests.stats_tickets', 'Jami Biletlar')}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                        {stats.total_tickets}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{tickets.length} ta bilet</p>
                </div>

                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs">
                    <p className="text-xs text-muted-foreground font-medium">
                        {t('tests.stats_questions', 'Jami Savollar')}
                    </p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {stats.total_questions.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">4 tilda to'liq baza</p>
                </div>

                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs">
                    <p className="text-xs text-muted-foreground font-medium">
                        {t('tests.stats_signs', 'Belgi & Chiziqlar')}
                    </p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {stats.total_signs + roadLines.length}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {stats.total_signs} {t('tests.signs_label', 'belgi')} + {roadLines.length} {t('tests.lines_label', 'chiziq')}
                    </p>
                </div>

                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs">
                    <p className="text-xs text-muted-foreground font-medium">
                        {t('tests.stats_attempts', 'Topshirilgan Testlar')}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                        {stats.total_attempts.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t('tests.stats_passed_count', 'O\'tganlar')}: {stats.passed_attempts}
                    </p>
                </div>

                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs">
                    <p className="text-xs text-muted-foreground font-medium">
                        {t('tests.stats_pass_rate', 'O\'tish Ko\'rsatkichi')}
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {passRate}%
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">kamida 18/20 (90%)</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('attempts')}
                    className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === 'attempts'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('tests.tab_attempts', 'O\'quvchilar Imtihon Natijalari')} ({attempts.total})
                </button>
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === 'tickets'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('tests.tab_tickets', '130 ta Biletlar va Savollar')} ({tickets.length})
                </button>
                <button
                    onClick={() => setActiveTab('signs')}
                    className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === 'signs'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('tests.tab_signs', 'Yo\'l belgilari & Chiziqlari')} ({stats.total_signs + roadLines.length})
                </button>
            </div>

            {/* TAB 1: ATTEMPTS */}
            {activeTab === 'attempts' && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <form onSubmit={handleFilterSubmit} className="bg-card text-card-foreground p-4 rounded-xl border border-border flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('tests.search_student', 'Talaba F.I.O yoki telefoni...')}
                                className="pl-9 text-xs"
                            />
                        </div>

                        <SearchableSelect
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val ? String(val) : '')}
                            options={[
                                { value: '', label: t('tests.filter_all_status', 'Barcha natijalar') },
                                { value: 'passed', label: t('tests.filter_passed', 'Faqat o\'tganlar') },
                                { value: 'failed', label: t('tests.filter_failed', 'O\'tolmaganlar') },
                            ]}
                            placeholder={t('tests.filter_all_status', 'Barcha natijalar')}
                            className="w-44"
                            size="sm"
                            triggerClassName="h-9 text-xs"
                        />

                        <SearchableSelect
                            value={typeFilter}
                            onChange={(val) => setTypeFilter(val ? String(val) : '')}
                            options={[
                                { value: '', label: t('tests.filter_all_types', 'Barcha turlar') },
                                { value: 'random_mock', label: t('tests.type_mock', 'Ichki Nazorat Imtihoni') },
                                { value: 'ticket_exam', label: t('tests.type_ticket', 'Bilet Mashg\'uloti') },
                            ]}
                            placeholder={t('tests.filter_all_types', 'Barcha turlar')}
                            className="w-48"
                            size="sm"
                            triggerClassName="h-9 text-xs"
                        />

                        <Button type="submit" size="sm" variant="brand" className="text-xs">
                            {t('common.filter', 'Filtrlash')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} className="text-xs">
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            {t('common.reset', 'Tozalash')}
                        </Button>
                    </form>

                    {/* Attempts Table */}
                    <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-xs">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b border-border">
                                    <TableHead className="font-semibold">{t('tests.col_student', 'Talaba')}</TableHead>
                                    <TableHead className="font-semibold">{t('tests.col_branch', 'Filial')}</TableHead>
                                    <TableHead className="font-semibold">{t('tests.col_type', 'Imtihon Turi')}</TableHead>
                                    <TableHead className="font-semibold">{t('tests.col_score', 'Natija')}</TableHead>
                                    <TableHead className="font-semibold">{t('tests.col_duration', 'Vaqt')}</TableHead>
                                    <TableHead className="font-semibold">{t('tests.col_status', 'Holat')}</TableHead>
                                    <TableHead className="font-semibold">{t('tests.col_date', 'Sana')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attempts.data.length === 0 ? (
                                    <TableEmpty
                                        colSpan={7}
                                        icon={HelpCircle}
                                        title={t('tests.no_attempts', 'Hech qanday imtihon natijalari topilmadi')}
                                        description={t('tests.no_attempts_desc', 'Qidiruv parametrlarini o\'zgartirib ko\'ring')}
                                    />
                                ) : (
                                    attempts.data.map((att) => (
                                        <TableRow key={att.id} className="hover:bg-muted/40 transition-colors">
                                            <TableCell>
                                                <p className="font-semibold text-foreground">
                                                    {att.student?.full_name || t('tests.guest_student', 'Mehmon O\'quvchi')}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {att.student?.phone || '—'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {att.student?.branch?.name || '—'}
                                            </TableCell>
                                            <TableCell>
                                                {att.attempt_type === 'random_mock' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                        🎓 {t('tests.type_mock', 'Ichki Nazorat Imtihoni')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        📄 {att.ticket?.title_uz || `${t('tests.ticket_prefix', 'Bilet')} #${att.ticket_id}`}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-foreground">
                                                    {att.correct_answers} / {att.total_questions} ({Number(att.score_percentage).toFixed(0)}%)
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {att.wrong_answers} {t('tests.wrong_count', 'ta xato')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatSeconds(att.duration_seconds)}
                                            </TableCell>
                                            <TableCell>
                                                {att.is_passed ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {t('tests.status_passed', 'O\'tdi')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                                                        <XCircle className="w-3 h-3" />
                                                        {t('tests.status_failed', 'O\'tmadi')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-[11px]">
                                                {new Date(att.created_at).toLocaleString('uz-UZ', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination links={attempts.links} />
                </div>
            )}

            {/* TAB 2: TICKETS (130 ta Bilet) */}
            {activeTab === 'tickets' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative max-w-xs w-full">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={ticketSearch}
                                onChange={(e) => setTicketSearch(e.target.value)}
                                placeholder={t('tests.search_ticket_placeholder', 'Bilet raqami (1-130)...')}
                                className="pl-9 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                                {filteredTickets.length} / {tickets.length} {t('tests.tickets_count', 'ta bilet')}
                            </span>
                            <Button onClick={openCreateTicketModal} size="sm" variant="brand" className="text-xs">
                                <Plus className="w-4 h-4 mr-1.5" />
                                {t('tests.add_ticket', '+ Bilet Qo\'shish')}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredTickets.map((tkt) => (
                            <div
                                key={tkt.id}
                                onClick={() => openTicketDetails(tkt)}
                                className="bg-card text-card-foreground border-2 border-emerald-500/40 hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-500 p-3.5 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between group relative"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                                        <Layers className="w-3.5 h-3.5" />
                                        #{tkt.ticket_number}
                                    </div>
                                    {/* Action Buttons: Clearly visible */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => openEditTicketModal(tkt, e)}
                                            className="p-1.5 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                            title={t('common.edit', 'Tahrirlash')}
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteTicket(tkt, e)}
                                            className="p-1.5 rounded-lg bg-muted hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors"
                                            title={t('common.delete', 'O\'chirish')}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                <div className="my-2">
                                    <p className="text-xs font-semibold text-foreground line-clamp-1">
                                        {tkt.title_uz}
                                    </p>
                                </div>

                                <div className="mt-auto pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                                    <span className="font-medium text-foreground/80">
                                        {tkt.questions_count || 10} {t('tests.questions_unit', 'savol')}
                                    </span>
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: SIGNS & ROAD LINES */}
            {activeTab === 'signs' && (
                <div className="space-y-4">
                    {/* Category Filter Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedSignCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedSignCategory === 'all'
                                    ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                    : 'bg-muted/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border/50'
                            }`}
                        >
                            {t('tests.all_signs', 'Barchasi')} ({stats.total_signs + roadLines.length})
                        </button>

                        {signCategories.map((cat) => (
                            <div key={cat.id} className="relative group inline-flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSignCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        selectedSignCategory === cat.id
                                            ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                            : 'bg-muted/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border/50'
                                    }`}
                                >
                                    {cat.name_uz} ({cat.signs?.length || 0})
                                </button>
                                {selectedSignCategory === cat.id && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCategory(cat)}
                                        className="ml-1 text-rose-500 hover:text-rose-700 p-1"
                                        title={t('tests.delete_category', 'Toifani o\'chirish')}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setSelectedSignCategory('lines')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedSignCategory === 'lines'
                                    ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                    : 'bg-muted/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border/50'
                            }`}
                        >
                            {t('tests.road_lines_category', 'Yo\'l chiziqlari')} ({roadLines.length})
                        </button>

                        <Button onClick={openCreateCategoryModal} variant="ghost" size="sm" className="text-xs text-primary hover:bg-accent hover:text-accent-foreground">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {t('tests.add_category', '+ Toifa')}
                        </Button>
                    </div>

                    {/* Signs or Lines Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {selectedSignCategory === 'lines'
                            ? roadLines.map((line) => (
                                  <div
                                      key={line.id}
                                      className="bg-card text-card-foreground p-3 rounded-xl border border-border flex flex-col items-center text-center shadow-xs hover:shadow-md transition-shadow relative group"
                                  >
                                      {/* Action buttons directly accessible */}
                                      <div className="absolute top-2 right-2 flex items-center gap-1">
                                          <button
                                              onClick={() => openEditRoadLineModal(line)}
                                              className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                              title={t('common.edit', 'Tahrirlash')}
                                          >
                                              <Pencil className="w-3 h-3" />
                                          </button>
                                          <button
                                              onClick={() => handleDeleteRoadLine(line)}
                                              className="p-1.5 rounded-lg bg-muted text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                              title={t('common.delete', 'O\'chirish')}
                                          >
                                              <Trash2 className="w-3 h-3" />
                                          </button>
                                      </div>

                                      {line.image_url ? (
                                          <img
                                              src={formatImageUrl(line.image_url) || ''}
                                              alt={line.name_uz}
                                              className="w-16 h-16 object-contain mb-2 mt-4"
                                              loading="lazy"
                                          />
                                      ) : (
                                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground mb-2 mt-4">
                                              —
                                          </div>
                                      )}
                                      <p className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-1">
                                          {line.line_number || (line as any).number}
                                      </p>
                                      <p className="text-[11px] font-medium text-foreground line-clamp-2">
                                          {line.name_uz}
                                      </p>
                                  </div>
                              ))
                            : signCategories
                                  .filter((cat) => selectedSignCategory === 'all' || selectedSignCategory === cat.id)
                                  .flatMap((cat) => cat.signs || [])
                                  .map((sign) => (
                                      <div
                                          key={sign.id}
                                          className="bg-card text-card-foreground p-3 rounded-xl border border-border flex flex-col items-center text-center shadow-xs hover:shadow-md transition-shadow relative group"
                                      >
                                          {/* Action buttons directly accessible */}
                                          <div className="absolute top-2 right-2 flex items-center gap-1">
                                              <button
                                                  onClick={() => openEditSignModal(sign)}
                                                  className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                                  title={t('common.edit', 'Tahrirlash')}
                                              >
                                                  <Pencil className="w-3 h-3" />
                                              </button>
                                              <button
                                                  onClick={() => handleDeleteSign(sign)}
                                                  className="p-1.5 rounded-lg bg-muted text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                  title={t('common.delete', 'O\'chirish')}
                                              >
                                                  <Trash2 className="w-3 h-3" />
                                              </button>
                                          </div>

                                          {sign.image_url ? (
                                              <img
                                                  src={formatImageUrl(sign.image_url) || ''}
                                                  alt={sign.name_uz}
                                                  className="w-16 h-16 object-contain mb-2 mt-4"
                                                  loading="lazy"
                                              />
                                          ) : (
                                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground mb-2 mt-4">
                                                  —
                                              </div>
                                          )}
                                          <p className="font-bold text-[11px] text-blue-600 dark:text-blue-400 mb-0.5">
                                              {sign.sign_number}
                                          </p>
                                          <p className="text-[11px] font-medium text-foreground line-clamp-2">
                                              {sign.name_uz}
                                          </p>
                                      </div>
                                  ))}
                    </div>
                </div>
            )}

            {/* Ticket Questions Modal Dialog */}
            <Dialog open={!!inspectingTicket} onOpenChange={(open) => !open && setInspectingTicket(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background text-foreground border-border">
                    <DialogHeader className="border-b border-border pb-4">
                        <div className="flex items-center justify-between pr-6 flex-wrap gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-bold text-foreground">
                                        {inspectingTicket?.title_uz || `${t('tests.ticket_prefix', 'Bilet')} #${inspectingTicket?.ticket_number}`}
                                    </DialogTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {ticketQuestions.length} {t('tests.questions_unit', 'savol')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {inspectingTicket && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditTicketModal(inspectingTicket)}
                                            className="h-8 text-xs border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <Pencil className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                                            {t('tests.edit_ticket', 'Tahrirlash')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteTicket(inspectingTicket)}
                                            className="h-8 text-xs border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            {t('tests.delete_ticket', 'O\'chirish')}
                                        </Button>
                                    </>
                                )}
                                <Button
                                    size="sm"
                                    onClick={openCreateQuestionModal}
                                    variant="brand"
                                    className="h-8 text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    {t('tests.add_question', '+ Savol Qo\'shish')}
                                </Button>
                            </div>
                        </div>
                        <DialogDescription className="sr-only">Bilet savollarini ko'rish va boshqarish</DialogDescription>
                    </DialogHeader>

                    {loadingTicketQuestions ? (
                        <div className="py-12 text-center text-muted-foreground text-xs">
                            {t('common.loading', 'Yuklanmoqda...')}
                        </div>
                    ) : ticketQuestions.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground text-xs">
                            {t('tests.no_questions_in_ticket', 'Ushbu biletda savollar topilmadi')}
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {ticketQuestions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className="p-4 sm:p-5 rounded-2xl border border-border bg-card dark:bg-card/90 shadow-2xs space-y-3.5 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <h4 className="font-semibold text-sm text-foreground leading-snug">
                                                {q.question_uz}
                                            </h4>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditQuestionModal(q)}
                                                className="h-7.5 px-2.5 text-xs text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                                                title={t('common.edit', 'Tahrirlash')}
                                            >
                                                <Pencil className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                                                <span>{t('common.edit', 'Tahrirlash')}</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteQuestion(q)}
                                                className="h-7.5 px-2.5 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                title={t('common.delete', 'O\'chirish')}
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                <span>{t('common.delete', 'O\'chirish')}</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Question Image if present */}
                                    {q.image_url && (
                                        <div className="flex justify-center bg-muted/30 dark:bg-muted/20 p-2.5 rounded-xl border border-border overflow-hidden">
                                            <img
                                                src={formatImageUrl(q.image_url) || ''}
                                                alt={`Savol ${idx + 1}`}
                                                className="max-h-56 max-w-full rounded-lg object-contain shadow-2xs"
                                                loading="lazy"
                                            />
                                        </div>
                                    )}

                                    {/* Answer Options */}
                                    <div className="space-y-1.5">
                                        {q.answers?.map((ans: any, aIdx: number) => (
                                            <div
                                                key={ans.id}
                                                className={cn(
                                                    "p-3 rounded-xl text-xs flex items-center justify-between border transition-colors",
                                                    ans.is_correct
                                                        ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                                                        : "bg-muted/40 dark:bg-muted/20 border-border text-foreground hover:bg-muted/60"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span
                                                        className={cn(
                                                            "w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 font-mono",
                                                            ans.is_correct
                                                                ? "bg-emerald-600 text-white"
                                                                : "bg-muted text-muted-foreground border border-border"
                                                        )}
                                                    >
                                                        {String.fromCharCode(65 + aIdx)}
                                                    </span>
                                                    <span className="leading-snug">{ans.answer_uz}</span>
                                                </div>
                                                {ans.is_correct && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white ml-2 shrink-0 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {t('tests.correct_answer_badge', 'To\'g\'ri javob')}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Explanation */}
                                    {q.description_uz && (
                                        <div className="text-xs p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 flex items-start gap-2 leading-relaxed">
                                            <span className="text-base shrink-0 select-none">💡</span>
                                            <div>
                                                <span className="font-semibold">{t('tests.explanation', 'Qoidalar bo\'yicha izoh')}: </span>
                                                <span>{q.description_uz}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create/Edit Ticket Modal */}
            <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-600" />
                            <span>
                                {editingTicket ? t('tests.edit_ticket', 'Biletni Tahrirlash') : t('tests.add_ticket', '+ Bilet Qo\'shish')}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">Bilet parametrlarini kiriting</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTicketSubmit} className="space-y-3.5 pt-2">
                        <div>
                            <Label required className="text-xs">{t('tests.ticket_num_label', 'Bilet Raqami')}</Label>
                            <Input
                                type="number"
                                required
                                value={ticketNumber}
                                onChange={(e) => setTicketNumber(e.target.value)}
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">{t('tests.ticket_title_label', 'Bilet Nomi')}</Label>
                            <Input
                                required
                                value={ticketTitle}
                                onChange={(e) => setTicketTitle(e.target.value)}
                                placeholder="Bilet 1..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">{t('common.description', 'Tavsif')}</Label>
                            <Input
                                value={ticketDesc}
                                onChange={(e) => setTicketDesc(e.target.value)}
                                placeholder="Qo'shimcha izoh..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowTicketModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" size="sm" variant="brand">
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Question Modal */}
            <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-blue-600" />
                            <span>
                                {editingQuestion ? t('tests.edit_question', 'Savolni Tahrirlash') : t('tests.add_question', '+ Savol Qo\'shish')}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">Savol va javob variantlarini kiriting</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleQuestionSubmit} className="space-y-3.5 pt-2">
                        <div>
                            <Label required className="text-xs font-semibold">{t('tests.question_text_label', 'Savol Matni')}</Label>
                            <textarea
                                required
                                rows={3}
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                placeholder="Savol matnini kiriting..."
                                className="w-full mt-1.5 p-2.5 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-colors"
                            />
                        </div>

                        {/* Image file upload only */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t('tests.image_file', 'Rasm')}</Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleQuestionImageChange}
                                className="hidden"
                            />
                            {questionPreview ? (
                                <div className="relative rounded-xl border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                                            <img
                                                src={questionPreview}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">
                                                {questionFile ? questionFile.name : t('tests.current_image', 'Joriy rasm')}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {questionFile ? `${(questionFile.size / 1024).toFixed(0)} KB` : t('tests.image_ready', 'Rasm biriktirilgan')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-8 px-2.5 text-xs"
                                        >
                                            {t('tests.change_image', 'Almashtirish')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveQuestionImage}
                                            className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            {t('tests.remove_image', 'O\'chirish')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group cursor-pointer rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary p-4 flex flex-col items-center justify-center gap-1.5 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/80 transition-all text-center"
                                >
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                        <UploadCloud className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        {t('tests.upload_image_hint', 'Rasm yuklash uchun bosing')}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        PNG, JPG, WEBP (maks. 5MB)
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Answers List */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-bold">
                                    {t('tests.answers_options_label', 'Javob Variantlari (To\'g\'risini tanlang)')}
                                </Label>
                                <Button type="button" size="sm" variant="outline" onClick={addQuestionAnswerOption} className="text-xs h-7">
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    {t('tests.add_answer_option', 'Variant qo\'shish')}
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {questionAnswers.map((ans, aIdx) => (
                                    <div key={aIdx} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correct_answer_radio"
                                            checked={ans.is_correct}
                                            onChange={() => {
                                                const updated = questionAnswers.map((item, i) => ({
                                                    ...item,
                                                    is_correct: i === aIdx,
                                                }));
                                                setQuestionAnswers(updated);
                                            }}
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer accent-emerald-600"
                                            title={t('tests.correct_label', 'To\'g\'ri')}
                                        />
                                        <span className="font-mono text-xs font-bold text-gray-400 w-4">
                                            {String.fromCharCode(65 + aIdx)}.
                                        </span>
                                        <Input
                                            value={ans.text}
                                            onChange={(e) => {
                                                const updated = [...questionAnswers];
                                                updated[aIdx].text = e.target.value;
                                                setQuestionAnswers(updated);
                                            }}
                                            placeholder={`Variant ${aIdx + 1}...`}
                                            className="text-xs flex-1"
                                        />
                                        {questionAnswers.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeQuestionAnswerOption(aIdx)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                                title={t('tests.remove_answer_option', 'O\'chirish')}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">{t('tests.explanation', 'Qoidalar bo\'yicha izoh (YHQ moddasi)')}</Label>
                            <textarea
                                rows={2}
                                value={questionDesc}
                                onChange={(e) => setQuestionDesc(e.target.value)}
                                placeholder={t('tests.explanation_placeholder', 'Yo\'l harakati qoidasi bo\'yicha tushuntirish...')}
                                className="w-full mt-1.5 p-2.5 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-colors"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowQuestionModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" size="sm" variant="brand">
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Sign Modal */}
            <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                            <span>
                                {editingSign ? t('tests.edit_sign', 'Belgini Tahrirlash') : t('tests.add_sign', '+ Belgi Qo\'shish')}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">Yo'l belgisi parametrlarini kiriting</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSignSubmit} className="space-y-3.5 pt-2">
                        <div>
                            <Label required className="text-xs mb-1.5 block">{t('tests.sign_category', 'Toifa')}</Label>
                            <SearchableSelect
                                value={signCategoryId}
                                onChange={(val) => setSignCategoryId(Number(val))}
                                options={signCategories.map((c) => ({
                                    value: c.id,
                                    label: c.name_uz,
                                    sublabel: `${c.signs?.length || 0} ta belgi`,
                                }))}
                                placeholder={t('tests.select_category', '-- Toifani tanlang --')}
                                triggerClassName="text-xs rounded-xl"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">{t('tests.sign_number', 'Belgi Raqami')}</Label>
                            <Input
                                required
                                value={signNumber}
                                onChange={(e) => setSignNumber(e.target.value)}
                                placeholder="1.1, 3.27..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">{t('tests.sign_name', 'Belgi Nomi')}</Label>
                            <Input
                                required
                                value={signName}
                                onChange={(e) => setSignName(e.target.value)}
                                placeholder="To'xtash taqiqlanadi..."
                                className="mt-1 text-xs"
                            />
                        </div>

                        {/* Image file upload only */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t('tests.image_file', 'Rasm')}</Label>
                            <input
                                ref={signFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleSignImageChange}
                                className="hidden"
                            />
                            {signPreview ? (
                                <div className="relative rounded-xl border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                                            <img
                                                src={signPreview}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">
                                                {signFile ? signFile.name : t('tests.current_image', 'Joriy rasm')}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {signFile ? `${(signFile.size / 1024).toFixed(0)} KB` : t('tests.image_ready', 'Rasm biriktirilgan')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => signFileInputRef.current?.click()}
                                            className="h-8 px-2.5 text-xs"
                                        >
                                            {t('tests.change_image', 'Almashtirish')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveSignImage}
                                            className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            {t('tests.remove_image', 'O\'chirish')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => signFileInputRef.current?.click()}
                                    className="group cursor-pointer rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary p-4 flex flex-col items-center justify-center gap-1.5 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/80 transition-all text-center"
                                >
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                        <UploadCloud className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        {t('tests.upload_image_hint', 'Rasm yuklash uchun bosing')}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        PNG, JPG, WEBP (maks. 5MB)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs">{t('common.description', 'Tavsif')}</Label>
                            <textarea
                                rows={2}
                                value={signDesc}
                                onChange={(e) => setSignDesc(e.target.value)}
                                placeholder="Belgi qoidasi va talabi..."
                                className="w-full mt-1.5 p-2.5 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-colors"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowSignModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" size="sm" variant="brand">
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Road Line Modal */}
            <Dialog open={showRoadLineModal} onOpenChange={setShowRoadLineModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-600" />
                            <span>
                                {editingRoadLine ? t('tests.edit_road_line', 'Chiziqni Tahrirlash') : t('tests.add_road_line', '+ Chiziq Qo\'shish')}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">Yo'l chizig'i parametrlarini kiriting</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRoadLineSubmit} className="space-y-3.5 pt-2">
                        <div>
                            <Label required className="text-xs">{t('tests.line_number', 'Chiziq Raqami')}</Label>
                            <Input
                                required
                                value={roadLineNumber}
                                onChange={(e) => setRoadLineNumber(e.target.value)}
                                placeholder="1.1, 1.2..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">{t('tests.line_name', 'Chiziq Nomi')}</Label>
                            <Input
                                required
                                value={roadLineName}
                                onChange={(e) => setRoadLineName(e.target.value)}
                                placeholder="Yaxlit chiziq..."
                                className="mt-1 text-xs"
                            />
                        </div>

                        {/* Image file upload only */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t('tests.image_file', 'Rasm')}</Label>
                            <input
                                ref={lineFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleRoadLineImageChange}
                                className="hidden"
                            />
                            {roadLinePreview ? (
                                <div className="relative rounded-xl border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                                            <img
                                                src={roadLinePreview}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">
                                                {roadLineFile ? roadLineFile.name : t('tests.current_image', 'Joriy rasm')}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {roadLineFile ? `${(roadLineFile.size / 1024).toFixed(0)} KB` : t('tests.image_ready', 'Rasm biriktirilgan')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => lineFileInputRef.current?.click()}
                                            className="h-8 px-2.5 text-xs"
                                        >
                                            {t('tests.change_image', 'Almashtirish')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveRoadLineImage}
                                            className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            {t('tests.remove_image', 'O\'chirish')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => lineFileInputRef.current?.click()}
                                    className="group cursor-pointer rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary p-4 flex flex-col items-center justify-center gap-1.5 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/80 transition-all text-center"
                                >
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                                        <UploadCloud className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        {t('tests.upload_image_hint', 'Rasm yuklash uchun bosing')}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        PNG, JPG, WEBP (maks. 5MB)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs">{t('common.description', 'Tavsif')}</Label>
                            <textarea
                                rows={2}
                                value={roadLineDesc}
                                onChange={(e) => setRoadLineDesc(e.target.value)}
                                placeholder="Yo'l chizig'i qoidasi..."
                                className="w-full mt-1.5 p-2.5 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-colors"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowRoadLineModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" size="sm" variant="brand">
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create/Edit Category Modal */}
            <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderPlus className="w-5 h-5 text-blue-600" />
                            <span>
                                {editingCategory ? t('tests.edit_category', 'Toifani Tahrirlash') : t('tests.add_category', '+ Toifa Qo\'shish')}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">Yo'l belgisi toifasi nomini kiriting</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-3.5 pt-2">
                        <div>
                            <Label required className="text-xs">{t('tests.category_name', 'Toifa Nomi')}</Label>
                            <Input
                                required
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                placeholder="Ogohlantiruvchi belgilar..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowCategoryModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" size="sm" variant="brand">
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
