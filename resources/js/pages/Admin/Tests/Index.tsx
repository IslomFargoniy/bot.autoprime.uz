import { Head, router } from '@inertiajs/react';
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
import type { ChangeEvent } from 'react';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import Pagination from '@/components/pagination';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { DigitsInput } from '@/components/ui/digits-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableEmpty,
} from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import { formatPhone } from '@/lib/input-masks';
import { cn, formatDateTime, formatNumber } from '@/lib/utils';

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
        from?: number;
        to?: number;
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
        per_page?: string;
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
    const can = useCan();
    const canManageTickets = can('tickets.manage');

    const [activeTab, setActiveTab] = useState<
        'attempts' | 'tickets' | 'signs'
    >('attempts');
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    // Ticket inspection modal state
    const [inspectingTicket, setInspectingTicket] = useState<Ticket | null>(
        null,
    );
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
    const [questionAnswers, setQuestionAnswers] = useState<
        Array<{ text: string; is_correct: boolean }>
    >([
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
    ]);

    // Management Modals: Sign
    const [showSignModal, setShowSignModal] = useState(false);
    const [editingSign, setEditingSign] = useState<any | null>(null);
    const [signCategoryId, setSignCategoryId] = useState<number | ''>('');
    const [signNumber, setSignNumber] = useState('');
    const [signName, setSignName] = useState('');
    const [signDesc, setSignDesc] = useState('');
    const [signFile, setSignFile] = useState<File | null>(null);
    const [signPreview, setSignPreview] = useState<string | null>(null);
    const [removeSignImage, setRemoveSignImage] = useState(false);

    // Management Modals: Road Line
    const [showRoadLineModal, setShowRoadLineModal] = useState(false);
    const [editingRoadLine, setEditingRoadLine] = useState<RoadLine | null>(
        null,
    );
    const [roadLineNumber, setRoadLineNumber] = useState('');
    const [roadLineName, setRoadLineName] = useState('');
    const [roadLineDesc, setRoadLineDesc] = useState('');
    const [roadLineFile, setRoadLineFile] = useState<File | null>(null);
    const [roadLinePreview, setRoadLinePreview] = useState<string | null>(null);
    const [removeRoadLineImage, setRemoveRoadLineImage] = useState(false);

    // Management Modals: Category
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<SignCategory | null>(
        null,
    );
    const [categoryName, setCategoryName] = useState('');

    // Signs category filter
    const [selectedSignCategory, setSelectedSignCategory] = useState<
        number | 'lines' | 'all'
    >('all');
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
                per_page: perPage,
            },
            { preserveState: true },
        );
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get(
            '/admin/tests',
            {
                search: search || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                per_page: newPerPage,
            },
            { preserveState: true },
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('');
        setTypeFilter('');
        router.get(
            '/admin/tests',
            { per_page: perPage },
            { preserveState: true },
        );
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
        if (!url) {
            return null;
        }

        if (url.startsWith('http') || url.startsWith('/storage')) {
            return url;
        }

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
        if (e) {
            e.stopPropagation();
        }

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

                        if (
                            inspectingTicket &&
                            editingTicket &&
                            inspectingTicket.id === editingTicket.id
                        ) {
                            setInspectingTicket({
                                ...inspectingTicket,
                                ticket_number: Number(ticketNumber),
                                title_uz: ticketTitle,
                                description: ticketDesc,
                            });
                        }

                        toast.success(
                            t('tests.ticket_updated', 'Bilet yangilandi'),
                        );
                    },
                    onError: (err) =>
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('common.error', 'Xatolik yuz berdi'),
                        ),
                },
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
                        toast.success(
                            t('tests.ticket_created', 'Bilet yaratildi'),
                        );
                    },
                    onError: (err) =>
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('common.error', 'Xatolik yuz berdi'),
                        ),
                },
            );
        }
    };

    const handleDeleteTicket = (tkt: Ticket, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }

        if (
            window.confirm(
                t(
                    'tests.confirm_delete_ticket',
                    "Ushbu bilet va uning barcha savollari o'chiriladi. Rozimisiz?",
                ),
            )
        ) {
            router.delete(`/admin/tests/tickets/${tkt.id}`, {
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
                onSuccess: () => {
                    if (inspectingTicket?.id === tkt.id) {
                        setInspectingTicket(null);
                    }

                    toast.success(
                        t('tests.ticket_deleted', "Bilet o'chirildi"),
                    );
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

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

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

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        if (q.answers && q.answers.length > 0) {
            setQuestionAnswers(
                q.answers.map((a: any) => ({
                    text: a.answer_uz,
                    is_correct: !!a.is_correct,
                })),
            );
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

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const addQuestionAnswerOption = () => {
        setQuestionAnswers([
            ...questionAnswers,
            { text: '', is_correct: false },
        ]);
    };

    const removeQuestionAnswerOption = (index: number) => {
        if (questionAnswers.length <= 2) {
            return;
        }

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

        if (!inspectingTicket) {
            return;
        }

        const hasCorrect = questionAnswers.some(
            (a) => a.is_correct && a.text.trim(),
        );

        if (!hasCorrect) {
            toast.error(
                t(
                    'tests.error_no_correct_answer',
                    "Kamida bitta to'g'ri javob belgilanishi shart",
                ),
            );

            return;
        }

        const validAnswers = questionAnswers.filter((a) => a.text.trim());

        if (validAnswers.length < 2) {
            toast.error(
                t(
                    'tests.error_min_answers',
                    'Kamida 2 ta javob varianti kiritilishi shart',
                ),
            );

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
            formData.append(
                `answers[${idx}][is_correct]`,
                ans.is_correct ? '1' : '0',
            );
        });

        if (editingQuestion) {
            formData.append('_method', 'PUT');
            router.post(
                `/admin/tests/questions/${editingQuestion.id}`,
                formData,
                {
                    onSuccess: () => {
                        setShowQuestionModal(false);
                        openTicketDetails(inspectingTicket);
                        toast.success(
                            t('tests.question_updated', 'Savol yangilandi'),
                        );
                    },
                    onError: (err) =>
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('common.error', 'Xatolik yuz berdi'),
                        ),
                },
            );
        } else {
            router.post('/admin/tests/questions', formData, {
                onSuccess: () => {
                    setShowQuestionModal(false);
                    openTicketDetails(inspectingTicket);
                    toast.success(
                        t('tests.question_created', "Savol qo'shildi"),
                    );
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        }
    };

    const handleDeleteQuestion = (q: any) => {
        if (
            window.confirm(
                t(
                    'tests.confirm_delete_question',
                    "Ushbu savolni rostdan ham o'chirmoqchimisiz?",
                ),
            )
        ) {
            router.delete(`/admin/tests/questions/${q.id}`, {
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
                onSuccess: () => {
                    if (inspectingTicket) {
                        openTicketDetails(inspectingTicket);
                    }

                    toast.success(
                        t('tests.question_deleted', "Savol o'chirildi"),
                    );
                },
            });
        }
    };

    // ==========================================
    // SIGN CRUD
    // ==========================================
    const openCreateSignModal = () => {
        setEditingSign(null);
        setSignCategoryId('');
        setSignNumber('');
        setSignName('');
        setSignDesc('');
        setSignFile(null);
        setSignPreview(null);
        setRemoveSignImage(false);

        if (signFileInputRef.current) {
            signFileInputRef.current.value = '';
        }

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

        if (signFileInputRef.current) {
            signFileInputRef.current.value = '';
        }

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

        if (signFileInputRef.current) {
            signFileInputRef.current.value = '';
        }
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
                    toast.success(
                        t('tests.sign_updated', "Yo'l belgisi yangilandi"),
                    );
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        } else {
            router.post('/admin/tests/signs', formData, {
                onSuccess: () => {
                    setShowSignModal(false);
                    toast.success(
                        t('tests.sign_created', "Yo'l belgisi qo'shildi"),
                    );
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        }
    };

    const handleDeleteSign = (sign: any) => {
        if (
            window.confirm(
                t(
                    'tests.confirm_delete_sign',
                    "Ushbu yo'l belgisini o'chirmoqchimisiz?",
                ),
            )
        ) {
            router.delete(`/admin/tests/signs/${sign.id}`, {
                onSuccess: () =>
                    toast.success(
                        t('tests.sign_deleted', "Yo'l belgisi o'chirildi"),
                    ),
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

        if (lineFileInputRef.current) {
            lineFileInputRef.current.value = '';
        }

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

        if (lineFileInputRef.current) {
            lineFileInputRef.current.value = '';
        }

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

        if (lineFileInputRef.current) {
            lineFileInputRef.current.value = '';
        }
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
            router.post(
                `/admin/tests/road-lines/${editingRoadLine.id}`,
                formData,
                {
                    onSuccess: () => {
                        setShowRoadLineModal(false);
                        toast.success(
                            t(
                                'tests.road_line_updated',
                                "Yo'l chizig'i yangilandi",
                            ),
                        );
                    },
                    onError: (err) =>
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('common.error', 'Xatolik yuz berdi'),
                        ),
                },
            );
        } else {
            router.post('/admin/tests/road-lines', formData, {
                onSuccess: () => {
                    setShowRoadLineModal(false);
                    toast.success(
                        t('tests.road_line_created', "Yo'l chizig'i qo'shildi"),
                    );
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        }
    };

    const handleDeleteRoadLine = (line: RoadLine) => {
        if (
            window.confirm(
                t(
                    'tests.confirm_delete_road_line',
                    "Ushbu yo'l chizig'ini o'chirmoqchimisiz?",
                ),
            )
        ) {
            router.delete(`/admin/tests/road-lines/${line.id}`, {
                onSuccess: () =>
                    toast.success(
                        t(
                            'tests.road_line_deleted',
                            "Yo'l chizig'i o'chirildi",
                        ),
                    ),
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
            router.put(
                `/admin/tests/sign-categories/${editingCategory.id}`,
                {
                    name_uz: categoryName,
                },
                {
                    onSuccess: () => {
                        setShowCategoryModal(false);
                        toast.success(
                            t('tests.category_updated', 'Toifa yangilandi'),
                        );
                    },
                    onError: (err) =>
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('common.error', 'Xatolik yuz berdi'),
                        ),
                },
            );
        } else {
            router.post(
                '/admin/tests/sign-categories',
                {
                    name_uz: categoryName,
                },
                {
                    onSuccess: () => {
                        setShowCategoryModal(false);
                        toast.success(
                            t('tests.category_created', "Toifa qo'shildi"),
                        );
                    },
                    onError: (err) =>
                        toast.error(
                            (Object.values(err)[0] as string) ||
                                t('common.error', 'Xatolik yuz berdi'),
                        ),
                },
            );
        }
    };

    const handleDeleteCategory = (cat: SignCategory) => {
        if (
            window.confirm(
                t(
                    'tests.confirm_delete_category',
                    "Ushbu toifa va uning barcha belgilari o'chiriladi. Rozimisiz?",
                ),
            )
        ) {
            router.delete(`/admin/tests/sign-categories/${cat.id}`, {
                onSuccess: () => {
                    setSelectedSignCategory('all');
                    toast.success(
                        t('tests.category_deleted', "Toifa o'chirildi"),
                    );
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
            tkt.title_uz.toLowerCase().includes(ticketSearch.toLowerCase()),
    );

    return (
        <div className="space-y-6 p-6">
            <Head title={t('tests.page_title', 'Testlar & Imtihonlar')} />

            {/* Header: Title and primary actions inline */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <HelpCircle className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t('tests.page_title', 'Testlar & Imtihonlar')}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {activeTab === 'tickets' &&
                        (canManageTickets ? (
                            <Button
                                onClick={openCreateTicketModal}
                                size="sm"
                                variant="brand"
                                className="text-xs"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('tests.add_ticket', "+ Bilet Qo'shish")}
                            </Button>
                        ) : null)}
                    {activeTab === 'signs' &&
                        selectedSignCategory === 'lines' &&
                        (canManageTickets ? (
                            <Button
                                onClick={openCreateRoadLineModal}
                                size="sm"
                                variant="brand"
                                className="text-xs"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('tests.add_road_line', "+ Chiziq Qo'shish")}
                            </Button>
                        ) : null)}
                    {activeTab === 'signs' &&
                        selectedSignCategory !== 'lines' && (
                            <>
                                {canManageTickets && (
                                    <Button
                                        onClick={openCreateSignModal}
                                        size="sm"
                                        variant="brand"
                                        className="text-xs"
                                    >
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        {t(
                                            'tests.add_sign',
                                            "+ Belgi Qo'shish",
                                        )}
                                    </Button>
                                )}
                                {canManageTickets && (
                                    <Button
                                        onClick={openCreateCategoryModal}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                    >
                                        <FolderPlus className="mr-1.5 h-4 w-4" />
                                        {t(
                                            'tests.add_category',
                                            "+ Toifa Qo'shish",
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/mini-app', '_blank')}
                        className="text-xs"
                    >
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        {t(
                            'tests.preview_mini_app',
                            "O'quvchi Mini Appida Ko'rish",
                        )}
                    </Button>
                </div>
            </div>

            {/* KPI Stats Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('tests.stats_tickets', 'Jami Biletlar')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                        {stats.total_tickets}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {tickets.length} ta bilet
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('tests.stats_questions', 'Jami Savollar')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatNumber(stats.total_questions)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        4 tilda to'liq baza
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('tests.stats_signs', 'Belgi & Chiziqlar')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                        {stats.total_signs + roadLines.length}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {stats.total_signs} {t('tests.signs_label', 'belgi')} +{' '}
                        {roadLines.length} {t('tests.lines_label', 'chiziq')}
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('tests.stats_attempts', 'Topshirilgan Testlar')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-foreground">
                        {formatNumber(stats.total_attempts)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t('tests.stats_passed_count', "O'tganlar")}:{' '}
                        {stats.passed_attempts}
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('tests.stats_pass_rate', "O'tish Ko'rsatkichi")}
                    </p>
                    <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {passRate}%
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        kamida 18/20 (90%)
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="no-scrollbar flex overflow-x-auto border-b border-border whitespace-nowrap">
                <button
                    onClick={() => setActiveTab('attempts')}
                    className={`shrink-0 border-b-2 px-4 pb-3 text-xs font-semibold transition-all ${
                        activeTab === 'attempts'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('tests.tab_attempts', "O'quvchilar Imtihon Natijalari")}{' '}
                    ({attempts.total})
                </button>
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`shrink-0 border-b-2 px-4 pb-3 text-xs font-semibold transition-all ${
                        activeTab === 'tickets'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('tests.tab_tickets', '130 ta Biletlar va Savollar')} (
                    {tickets.length})
                </button>
                <button
                    onClick={() => setActiveTab('signs')}
                    className={`shrink-0 border-b-2 px-4 pb-3 text-xs font-semibold transition-all ${
                        activeTab === 'signs'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {t('tests.tab_signs', "Yo'l belgilari & Chiziqlari")} (
                    {stats.total_signs + roadLines.length})
                </button>
            </div>

            {/* TAB 1: ATTEMPTS */}
            {activeTab === 'attempts' && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <form
                        onSubmit={handleFilterSubmit}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs"
                    >
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t(
                                    'tests.search_student',
                                    'Talaba F.I.O yoki telefoni...',
                                )}
                                className="h-10 pl-9 text-sm"
                            />
                        </div>

                        <SearchableSelect
                            value={statusFilter}
                            onChange={(val) =>
                                setStatusFilter(val ? String(val) : '')
                            }
                            options={[
                                {
                                    value: '',
                                    label: t(
                                        'tests.filter_all_status',
                                        'Barcha natijalar',
                                    ),
                                },
                                {
                                    value: 'passed',
                                    label: t(
                                        'tests.filter_passed',
                                        "Faqat o'tganlar",
                                    ),
                                },
                                {
                                    value: 'failed',
                                    label: t(
                                        'tests.filter_failed',
                                        "O'tolmaganlar",
                                    ),
                                },
                            ]}
                            placeholder={t(
                                'tests.filter_all_status',
                                'Barcha natijalar',
                            )}
                            className="w-48"
                            triggerClassName="h-10 text-sm"
                        />

                        <SearchableSelect
                            value={typeFilter}
                            onChange={(val) =>
                                setTypeFilter(val ? String(val) : '')
                            }
                            options={[
                                {
                                    value: '',
                                    label: t(
                                        'tests.filter_all_types',
                                        'Barcha turlar',
                                    ),
                                },
                                {
                                    value: 'random_mock',
                                    label: t(
                                        'tests.type_mock',
                                        'Ichki Nazorat Imtihoni',
                                    ),
                                },
                                {
                                    value: 'ticket_exam',
                                    label: t(
                                        'tests.type_ticket',
                                        "Bilet Mashg'uloti",
                                    ),
                                },
                            ]}
                            placeholder={t(
                                'tests.filter_all_types',
                                'Barcha turlar',
                            )}
                            className="w-52"
                            triggerClassName="h-10 text-sm"
                        />

                        <PerPageSelect
                            value={perPage}
                            onChange={handlePerPageChange}
                        />

                        <Button
                            type="submit"
                            variant="secondary"
                            className="h-10 px-4"
                        >
                            <Search className="mr-1.5 h-4 w-4" />
                            {t('common.filter', 'Filtrlash')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetFilters}
                            className="h-10 px-3"
                        >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            {t('common.reset', 'Tozalash')}
                        </Button>
                    </form>

                    {/* Attempts Table / Desktop & Tablet */}
                    <div className="hidden overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs md:block">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-border bg-muted/50">
                                        <TableHead className="font-semibold">
                                            {t('tests.col_student', 'Talaba')}
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            {t('tests.col_branch', 'Filial')}
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            {t(
                                                'tests.col_type',
                                                'Imtihon Turi',
                                            )}
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            {t('tests.col_score', 'Natija')}
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            {t('tests.col_duration', 'Vaqt')}
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            {t('tests.col_status', 'Holat')}
                                        </TableHead>
                                        <TableHead className="font-semibold">
                                            {t('tests.col_date', 'Sana')}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attempts.data.length === 0 ? (
                                        <TableEmpty
                                            colSpan={7}
                                            icon={HelpCircle}
                                            title={t(
                                                'tests.no_attempts',
                                                'Hech qanday imtihon natijalari topilmadi',
                                            )}
                                            description={t(
                                                'tests.no_attempts_desc',
                                                "Qidiruv parametrlarini o'zgartirib ko'ring",
                                            )}
                                        />
                                    ) : (
                                        attempts.data.map((att) => (
                                            <TableRow
                                                key={att.id}
                                                className="transition-colors hover:bg-muted/40"
                                            >
                                                <TableCell>
                                                    <p className="font-semibold text-foreground">
                                                        {att.student
                                                            ?.full_name ||
                                                            t(
                                                                'tests.guest_student',
                                                                "Mehmon O'quvchi",
                                                            )}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {att.student?.phone ||
                                                            '—'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {att.student?.branch
                                                        ?.name || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {att.attempt_type ===
                                                    'random_mock' ? (
                                                        <span className="inline-flex items-center rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                                                            🎓{' '}
                                                            {t(
                                                                'tests.type_mock',
                                                                'Ichki Nazorat Imtihoni',
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                                                            📄{' '}
                                                            {att.ticket
                                                                ?.title_uz ||
                                                                `${t('tests.ticket_prefix', 'Bilet')} #${att.ticket_id}`}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-foreground">
                                                        {att.correct_answers} /{' '}
                                                        {att.total_questions} (
                                                        {Number(
                                                            att.score_percentage,
                                                        ).toFixed(0)}
                                                        %)
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {att.wrong_answers}{' '}
                                                        {t(
                                                            'tests.wrong_count',
                                                            'ta xato',
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {formatSeconds(
                                                        att.duration_seconds,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {att.is_passed ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {t(
                                                                'tests.status_passed',
                                                                "O'tdi",
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                                                            <XCircle className="h-3 w-3" />
                                                            {t(
                                                                'tests.status_failed',
                                                                "O'tmadi",
                                                            )}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-[11px] text-muted-foreground">
                                                    {formatDateTime(
                                                        att.created_at,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Attempts Mobile Cards Feed */}
                    <div className="space-y-3 md:hidden">
                        {attempts.data.length === 0 ? (
                            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs">
                                {t(
                                    'tests.no_attempts',
                                    'Hech qanday imtihon natijalari topilmadi',
                                )}
                            </div>
                        ) : (
                            attempts.data.map((att) => (
                                <div
                                    key={att.id}
                                    className="space-y-2.5 rounded-xl border bg-card p-4 shadow-xs"
                                >
                                    {/* Header: Student Name + Pass/Fail Badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-semibold text-foreground">
                                                {att.student?.full_name ||
                                                    t(
                                                        'tests.guest_student',
                                                        "Mehmon O'quvchi",
                                                    )}
                                            </div>
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                {formatPhone(att.student?.phone) || '—'}
                                            </div>
                                        </div>
                                        {att.is_passed ? (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                <CheckCircle2 className="h-3 w-3" />
                                                {t(
                                                    'tests.status_passed',
                                                    "O'tdi",
                                                )}
                                            </span>
                                        ) : (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                                                <XCircle className="h-3 w-3" />
                                                {t(
                                                    'tests.status_failed',
                                                    "O'tmadi",
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {/* Exam Type & Branch */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span className="rounded bg-muted px-2 py-0.5">
                                            {att.attempt_type === 'random_mock'
                                                ? t(
                                                      'tests.type_mock',
                                                      'Ichki Nazorat Imtihoni',
                                                  )
                                                : `${t('tests.type_ticket', 'Bilet')} #${att.ticket_id || ''}`}
                                        </span>
                                        {att.student?.branch?.name && (
                                            <span className="rounded bg-muted px-2 py-0.5">
                                                {att.student.branch.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Score & Duration Grid */}
                                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground">
                                                {t('tests.col_score', 'Natija')}
                                                :
                                            </span>
                                            <span className="font-bold text-foreground">
                                                {att.correct_answers} /{' '}
                                                {att.total_questions} (
                                                {att.score_percentage}%)
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground">
                                                {t(
                                                    'tests.col_duration',
                                                    'Vaqt',
                                                )}
                                                :
                                            </span>
                                            <span className="font-mono text-muted-foreground">
                                                {formatSeconds(
                                                    att.duration_seconds,
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                                        <span>
                                            {t('tests.col_date', 'Sana')}:
                                        </span>
                                        <span className="font-mono">
                                            {formatDateTime(att.created_at)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Pagination
                        links={attempts.links}
                        total={attempts.total}
                        from={attempts.from}
                        to={attempts.to}
                    />
                </div>
            )}

            {/* TAB 2: TICKETS (130 ta Bilet) */}
            {activeTab === 'tickets' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={ticketSearch}
                                onChange={(e) =>
                                    setTicketSearch(e.target.value)
                                }
                                placeholder={t(
                                    'tests.search_ticket_placeholder',
                                    'Bilet raqami (1-130)...',
                                )}
                                className="pl-9 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                                {filteredTickets.length} / {tickets.length}{' '}
                                {t('tests.tickets_count', 'ta bilet')}
                            </span>
                            {canManageTickets && (
                                <Button
                                    onClick={openCreateTicketModal}
                                    size="sm"
                                    variant="brand"
                                    className="text-xs"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('tests.add_ticket', "+ Bilet Qo'shish")}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {filteredTickets.map((tkt) => (
                            <div
                                key={tkt.id}
                                onClick={() => openTicketDetails(tkt)}
                                className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 border-emerald-500/40 bg-card p-3.5 text-card-foreground transition-all hover:border-emerald-500 hover:shadow-md dark:border-emerald-500/30 dark:hover:border-emerald-500"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                                        <Layers className="h-3.5 w-3.5" />#
                                        {tkt.ticket_number}
                                    </div>
                                    {/* Action Buttons: Clearly visible */}
                                    <div className="flex items-center gap-1">
                                        {canManageTickets && (
                                            <button
                                                onClick={(e) =>
                                                    openEditTicketModal(tkt, e)
                                                }
                                                className="rounded-lg bg-muted p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                title={t(
                                                    'common.edit',
                                                    'Tahrirlash',
                                                )}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                        )}
                                        {canManageTickets && (
                                            <button
                                                onClick={(e) =>
                                                    handleDeleteTicket(tkt, e)
                                                }
                                                className="rounded-lg bg-muted p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                title={t(
                                                    'common.delete',
                                                    "O'chirish",
                                                )}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="my-2">
                                    <p className="line-clamp-1 text-xs font-semibold text-foreground">
                                        {tkt.title_uz}
                                    </p>
                                </div>

                                <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                                    <span className="font-medium text-foreground/80">
                                        {tkt.questions_count || 10}{' '}
                                        {t('tests.questions_unit', 'savol')}
                                    </span>
                                    <Eye className="h-3.5 w-3.5 text-primary" />
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
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                selectedSignCategory === 'all'
                                    ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                    : 'border border-border/50 bg-muted/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                            {t('tests.all_signs', 'Barchasi')} (
                            {stats.total_signs + roadLines.length})
                        </button>

                        {signCategories.map((cat) => (
                            <div
                                key={cat.id}
                                className="group relative inline-flex items-center"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedSignCategory(cat.id)
                                    }
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                        selectedSignCategory === cat.id
                                            ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                            : 'border border-border/50 bg-muted/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`}
                                >
                                    {cat.name_uz} ({cat.signs?.length || 0})
                                </button>
                                {selectedSignCategory === cat.id &&
                                    (canManageTickets ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeleteCategory(cat)
                                            }
                                            className="ml-1 p-1 text-rose-500 hover:text-rose-700"
                                            title={t(
                                                'tests.delete_category',
                                                "Toifani o'chirish",
                                            )}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    ) : null)}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setSelectedSignCategory('lines')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                selectedSignCategory === 'lines'
                                    ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                    : 'border border-border/50 bg-muted/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                            {t('tests.road_lines_category', "Yo'l chiziqlari")}{' '}
                            ({roadLines.length})
                        </button>

                        {canManageTickets && (
                            <Button
                                onClick={openCreateCategoryModal}
                                variant="ghost"
                                size="sm"
                                className="text-xs text-primary hover:bg-accent hover:text-accent-foreground"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                {t('tests.add_category', '+ Toifa')}
                            </Button>
                        )}
                    </div>

                    {/* Signs or Lines Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {selectedSignCategory === 'lines'
                            ? roadLines.map((line) => (
                                  <div
                                      key={line.id}
                                      className="group relative flex flex-col items-center rounded-xl border border-border bg-card p-3 text-center text-card-foreground shadow-xs transition-shadow hover:shadow-md"
                                  >
                                      {/* Action buttons directly accessible */}
                                      <div className="absolute top-2 right-2 flex items-center gap-1">
                                          {canManageTickets && (
                                              <button
                                                  onClick={() =>
                                                      openEditRoadLineModal(
                                                          line,
                                                      )
                                                  }
                                                  className="rounded-lg bg-muted p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                                  title={t(
                                                      'common.edit',
                                                      'Tahrirlash',
                                                  )}
                                              >
                                                  <Pencil className="h-3 w-3" />
                                              </button>
                                          )}
                                          {canManageTickets && (
                                              <button
                                                  onClick={() =>
                                                      handleDeleteRoadLine(line)
                                                  }
                                                  className="rounded-lg bg-muted p-1.5 text-rose-500 transition-colors hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400"
                                                  title={t(
                                                      'common.delete',
                                                      "O'chirish",
                                                  )}
                                              >
                                                  <Trash2 className="h-3 w-3" />
                                              </button>
                                          )}
                                      </div>

                                      {line.image_url ? (
                                          <img
                                              src={
                                                  formatImageUrl(
                                                      line.image_url,
                                                  ) || ''
                                              }
                                              alt={line.name_uz}
                                              className="mt-4 mb-2 h-16 w-16 object-contain"
                                              loading="lazy"
                                          />
                                      ) : (
                                          <div className="mt-4 mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                              —
                                          </div>
                                      )}
                                      <p className="mb-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                                          {line.line_number ||
                                              (line as any).number}
                                      </p>
                                      <p className="line-clamp-2 text-[11px] font-medium text-foreground">
                                          {line.name_uz}
                                      </p>
                                  </div>
                              ))
                            : signCategories
                                  .filter(
                                      (cat) =>
                                          selectedSignCategory === 'all' ||
                                          selectedSignCategory === cat.id,
                                  )
                                  .flatMap((cat) => cat.signs || [])
                                  .map((sign) => (
                                      <div
                                          key={sign.id}
                                          className="group relative flex flex-col items-center rounded-xl border border-border bg-card p-3 text-center text-card-foreground shadow-xs transition-shadow hover:shadow-md"
                                      >
                                          {/* Action buttons directly accessible */}
                                          <div className="absolute top-2 right-2 flex items-center gap-1">
                                              {canManageTickets && (
                                                  <button
                                                      onClick={() =>
                                                          openEditSignModal(
                                                              sign,
                                                          )
                                                      }
                                                      className="rounded-lg bg-muted p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                                      title={t(
                                                          'common.edit',
                                                          'Tahrirlash',
                                                      )}
                                                  >
                                                      <Pencil className="h-3 w-3" />
                                                  </button>
                                              )}
                                              {canManageTickets && (
                                                  <button
                                                      onClick={() =>
                                                          handleDeleteSign(sign)
                                                      }
                                                      className="rounded-lg bg-muted p-1.5 text-rose-500 transition-colors hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400"
                                                      title={t(
                                                          'common.delete',
                                                          "O'chirish",
                                                      )}
                                                  >
                                                      <Trash2 className="h-3 w-3" />
                                                  </button>
                                              )}
                                          </div>

                                          {sign.image_url ? (
                                              <img
                                                  src={
                                                      formatImageUrl(
                                                          sign.image_url,
                                                      ) || ''
                                                  }
                                                  alt={sign.name_uz}
                                                  className="mt-4 mb-2 h-16 w-16 object-contain"
                                                  loading="lazy"
                                              />
                                          ) : (
                                              <div className="mt-4 mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                  —
                                              </div>
                                          )}
                                          <p className="mb-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                              {sign.sign_number}
                                          </p>
                                          <p className="line-clamp-2 text-[11px] font-medium text-foreground">
                                              {sign.name_uz}
                                          </p>
                                      </div>
                                  ))}
                    </div>
                </div>
            )}

            {/* Ticket Questions Modal Dialog */}
            <Dialog
                open={!!inspectingTicket}
                onOpenChange={(open) => !open && setInspectingTicket(null)}
            >
                <DialogContent className="max-h-[85vh] w-[95vw] max-w-3xl overflow-y-auto border-border bg-background text-foreground">
                    <DialogHeader className="border-b border-border pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-bold text-foreground">
                                        {inspectingTicket?.title_uz ||
                                            `${t('tests.ticket_prefix', 'Bilet')} #${inspectingTicket?.ticket_number}`}
                                    </DialogTitle>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {ticketQuestions.length}{' '}
                                        {t('tests.questions_unit', 'savol')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {inspectingTicket && (
                                    <>
                                        {canManageTickets && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    openEditTicketModal(
                                                        inspectingTicket,
                                                    )
                                                }
                                                className="h-8 border-border text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <Pencil className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                                {t(
                                                    'tests.edit_ticket',
                                                    'Tahrirlash',
                                                )}
                                            </Button>
                                        )}
                                        {canManageTickets && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    handleDeleteTicket(
                                                        inspectingTicket,
                                                    )
                                                }
                                                className="h-8 border-rose-200 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                            >
                                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                {t(
                                                    'tests.delete_ticket',
                                                    "O'chirish",
                                                )}
                                            </Button>
                                        )}
                                    </>
                                )}
                                {canManageTickets && (
                                    <Button
                                        size="sm"
                                        onClick={openCreateQuestionModal}
                                        variant="brand"
                                        className="h-8 text-xs"
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        {t(
                                            'tests.add_question',
                                            "+ Savol Qo'shish",
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <DialogDescription className="sr-only">
                            Bilet savollarini ko'rish va boshqarish
                        </DialogDescription>
                    </DialogHeader>

                    {loadingTicketQuestions ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            {t('common.loading', 'Yuklanmoqda...')}
                        </div>
                    ) : ticketQuestions.length === 0 ? (
                        <div className="py-10 text-center text-xs text-muted-foreground">
                            {t(
                                'tests.no_questions_in_ticket',
                                'Ushbu biletda savollar topilmadi',
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {ticketQuestions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className="space-y-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs transition-colors sm:p-5 dark:bg-card/90"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary">
                                                {idx + 1}
                                            </span>
                                            <h4 className="text-sm leading-snug font-semibold text-foreground">
                                                {q.question_uz}
                                            </h4>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {canManageTickets && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        openEditQuestionModal(q)
                                                    }
                                                    className="h-7.5 border-border px-2.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
                                                    title={t(
                                                        'common.edit',
                                                        'Tahrirlash',
                                                    )}
                                                >
                                                    <Pencil className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>
                                                        {t(
                                                            'common.edit',
                                                            'Tahrirlash',
                                                        )}
                                                    </span>
                                                </Button>
                                            )}
                                            {canManageTickets && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDeleteQuestion(q)
                                                    }
                                                    className="h-7.5 border-rose-200 px-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                    title={t(
                                                        'common.delete',
                                                        "O'chirish",
                                                    )}
                                                >
                                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                    <span>
                                                        {t(
                                                            'common.delete',
                                                            "O'chirish",
                                                        )}
                                                    </span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question Image if present */}
                                    {q.image_url && (
                                        <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-muted/30 p-2.5 dark:bg-muted/20">
                                            <img
                                                src={
                                                    formatImageUrl(
                                                        q.image_url,
                                                    ) || ''
                                                }
                                                alt={`Savol ${idx + 1}`}
                                                className="max-h-56 max-w-full rounded-lg object-contain shadow-2xs"
                                                loading="lazy"
                                            />
                                        </div>
                                    )}

                                    {/* Answer Options */}
                                    <div className="space-y-1.5">
                                        {q.answers?.map(
                                            (ans: any, aIdx: number) => (
                                                <div
                                                    key={ans.id}
                                                    className={cn(
                                                        'flex items-center justify-between rounded-xl border p-3 text-xs transition-colors',
                                                        ans.is_correct
                                                            ? 'border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                            : 'border-border bg-muted/40 text-foreground hover:bg-muted/60 dark:bg-muted/20',
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span
                                                            className={cn(
                                                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold',
                                                                ans.is_correct
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : 'border border-border bg-muted text-muted-foreground',
                                                            )}
                                                        >
                                                            {String.fromCharCode(
                                                                65 + aIdx,
                                                            )}
                                                        </span>
                                                        <span className="leading-snug">
                                                            {ans.answer_uz}
                                                        </span>
                                                    </div>
                                                    {ans.is_correct && (
                                                        <span className="ml-2 flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {t(
                                                                'tests.correct_answer_badge',
                                                                "To'g'ri javob",
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    {/* Explanation */}
                                    {q.description_uz && (
                                        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                                            <span className="shrink-0 text-base select-none">
                                                💡
                                            </span>
                                            <div>
                                                <span className="font-semibold">
                                                    {t(
                                                        'tests.explanation',
                                                        "Qoidalar bo'yicha izoh",
                                                    )}
                                                    :{' '}
                                                </span>
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
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-blue-600" />
                            <span>
                                {editingTicket
                                    ? t(
                                          'tests.edit_ticket',
                                          'Biletni Tahrirlash',
                                      )
                                    : t('tests.add_ticket', "+ Bilet Qo'shish")}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Bilet parametrlarini kiriting
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleTicketSubmit}
                        className="space-y-3.5 pt-2"
                    >
                        <div>
                            <Label required className="text-xs">
                                {t('tests.ticket_num_label', 'Bilet Raqami')}
                            </Label>
                            <DigitsInput
                                required
                                maxLength={4}
                                value={ticketNumber}
                                onChange={setTicketNumber}
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">
                                {t('tests.ticket_title_label', 'Bilet Nomi')}
                            </Label>
                            <Input
                                required
                                value={ticketTitle}
                                onChange={(e) => setTicketTitle(e.target.value)}
                                placeholder="Bilet 1..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">
                                {t('common.description', 'Tavsif')}
                            </Label>
                            <Input
                                value={ticketDesc}
                                onChange={(e) => setTicketDesc(e.target.value)}
                                placeholder="Qo'shimcha izoh..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTicketModal(false)}
                            >
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
            <Dialog
                open={showQuestionModal}
                onOpenChange={setShowQuestionModal}
            >
                <DialogContent className="max-h-[85vh] w-[95vw] max-w-xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-blue-600" />
                            <span>
                                {editingQuestion
                                    ? t(
                                          'tests.edit_question',
                                          'Savolni Tahrirlash',
                                      )
                                    : t(
                                          'tests.add_question',
                                          "+ Savol Qo'shish",
                                      )}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Savol va javob variantlarini kiriting
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleQuestionSubmit}
                        className="space-y-3.5 pt-2"
                    >
                        <div>
                            <Label required className="text-xs font-semibold">
                                {t('tests.question_text_label', 'Savol Matni')}
                            </Label>
                            <textarea
                                required
                                rows={3}
                                value={questionText}
                                onChange={(e) =>
                                    setQuestionText(e.target.value)
                                }
                                placeholder="Savol matnini kiriting..."
                                className="mt-1.5 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        {/* Image file upload only */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">
                                {t('tests.image_file', 'Rasm')}
                            </Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleQuestionImageChange}
                                className="hidden"
                            />
                            {questionPreview ? (
                                <div className="relative flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-2.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                                            <img
                                                src={questionPreview}
                                                alt="Preview"
                                                className="h-full w-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-foreground">
                                                {questionFile
                                                    ? questionFile.name
                                                    : t(
                                                          'tests.current_image',
                                                          'Joriy rasm',
                                                      )}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {questionFile
                                                    ? `${(questionFile.size / 1024).toFixed(0)} KB`
                                                    : t(
                                                          'tests.image_ready',
                                                          'Rasm biriktirilgan',
                                                      )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            title={t(
                                                'tests.change_image',
                                                'Rasmni almashtirish',
                                            )}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={handleRemoveQuestionImage}
                                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                                            title={t(
                                                'tests.remove_image',
                                                'Rasmni olib tashlash',
                                            )}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-4 text-center transition-all hover:border-primary hover:bg-gray-100/60 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-primary dark:hover:bg-gray-800/80"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                        <UploadCloud className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        {t(
                                            'tests.upload_image_hint',
                                            'Rasm yuklash uchun bosing',
                                        )}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        PNG, JPG, WEBP (maks. 5MB)
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Answers List */}
                        <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                            <div className="mb-2 flex items-center justify-between">
                                <Label className="text-xs font-bold">
                                    {t(
                                        'tests.answers_options_label',
                                        "Javob Variantlari (To'g'risini tanlang)",
                                    )}
                                </Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={addQuestionAnswerOption}
                                    className="h-7 text-xs"
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    {t(
                                        'tests.add_answer_option',
                                        "Variant qo'shish",
                                    )}
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {questionAnswers.map((ans, aIdx) => (
                                    <div
                                        key={aIdx}
                                        className="flex items-center gap-2"
                                    >
                                        <input
                                            type="radio"
                                            name="correct_answer_radio"
                                            checked={ans.is_correct}
                                            onChange={() => {
                                                const updated =
                                                    questionAnswers.map(
                                                        (item, i) => ({
                                                            ...item,
                                                            is_correct:
                                                                i === aIdx,
                                                        }),
                                                    );
                                                setQuestionAnswers(updated);
                                            }}
                                            className="h-4 w-4 shrink-0 cursor-pointer text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                                            title={t(
                                                'tests.correct_label',
                                                "To'g'ri",
                                            )}
                                        />
                                        <span className="w-4 font-mono text-xs font-bold text-gray-400">
                                            {String.fromCharCode(65 + aIdx)}.
                                        </span>
                                        <Input
                                            value={ans.text}
                                            onChange={(e) => {
                                                const updated = [
                                                    ...questionAnswers,
                                                ];
                                                updated[aIdx].text =
                                                    e.target.value;
                                                setQuestionAnswers(updated);
                                            }}
                                            placeholder={`Variant ${aIdx + 1}...`}
                                            className="flex-1 text-xs"
                                        />
                                        {questionAnswers.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeQuestionAnswerOption(
                                                        aIdx,
                                                    )
                                                }
                                                className="p-1 text-gray-400 hover:text-red-500"
                                                title={t(
                                                    'tests.remove_answer_option',
                                                    "O'chirish",
                                                )}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">
                                {t(
                                    'tests.explanation',
                                    "Qoidalar bo'yicha izoh (YHQ moddasi)",
                                )}
                            </Label>
                            <textarea
                                rows={2}
                                value={questionDesc}
                                onChange={(e) =>
                                    setQuestionDesc(e.target.value)
                                }
                                placeholder={t(
                                    'tests.explanation_placeholder',
                                    "Yo'l harakati qoidasi bo'yicha tushuntirish...",
                                )}
                                className="mt-1.5 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowQuestionModal(false)}
                            >
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
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-blue-600" />
                            <span>
                                {editingSign
                                    ? t('tests.edit_sign', 'Belgini Tahrirlash')
                                    : t('tests.add_sign', "+ Belgi Qo'shish")}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Yo'l belgisi parametrlarini kiriting
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleSignSubmit}
                        className="space-y-3.5 pt-2"
                    >
                        <div>
                            <Label required className="mb-1.5 block text-xs">
                                {t('tests.sign_category', 'Toifa')}
                            </Label>
                            <SearchableSelect
                                value={signCategoryId}
                                onChange={(val) =>
                                    setSignCategoryId(val ? Number(val) : '')
                                }
                                options={signCategories.map((c) => ({
                                    value: c.id,
                                    label: c.name_uz,
                                    sublabel: `${c.signs?.length || 0} ta belgi`,
                                }))}
                                placeholder={t(
                                    'tests.select_category',
                                    '-- Toifani tanlang --',
                                )}
                                allowClear
                                triggerClassName="text-xs rounded-xl"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">
                                {t('tests.sign_number', 'Belgi Raqami')}
                            </Label>
                            <Input
                                required
                                value={signNumber}
                                onChange={(e) => setSignNumber(e.target.value)}
                                placeholder="1.1, 3.27..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">
                                {t('tests.sign_name', 'Belgi Nomi')}
                            </Label>
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
                            <Label className="text-xs font-semibold">
                                {t('tests.image_file', 'Rasm')}
                            </Label>
                            <input
                                ref={signFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleSignImageChange}
                                className="hidden"
                            />
                            {signPreview ? (
                                <div className="relative flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-2.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                                            <img
                                                src={signPreview}
                                                alt="Preview"
                                                className="h-full w-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-foreground">
                                                {signFile
                                                    ? signFile.name
                                                    : t(
                                                          'tests.current_image',
                                                          'Joriy rasm',
                                                      )}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {signFile
                                                    ? `${(signFile.size / 1024).toFixed(0)} KB`
                                                    : t(
                                                          'tests.image_ready',
                                                          'Rasm biriktirilgan',
                                                      )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() =>
                                                signFileInputRef.current?.click()
                                            }
                                            title={t(
                                                'tests.change_image',
                                                'Rasmni almashtirish',
                                            )}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={handleRemoveSignImage}
                                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                                            title={t(
                                                'tests.remove_image',
                                                'Rasmni olib tashlash',
                                            )}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() =>
                                        signFileInputRef.current?.click()
                                    }
                                    className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-4 text-center transition-all hover:border-primary hover:bg-gray-100/60 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-primary dark:hover:bg-gray-800/80"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                        <UploadCloud className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        {t(
                                            'tests.upload_image_hint',
                                            'Rasm yuklash uchun bosing',
                                        )}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        PNG, JPG, WEBP (maks. 5MB)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs">
                                {t('common.description', 'Tavsif')}
                            </Label>
                            <textarea
                                rows={2}
                                value={signDesc}
                                onChange={(e) => setSignDesc(e.target.value)}
                                placeholder="Belgi qoidasi va talabi..."
                                className="mt-1.5 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSignModal(false)}
                            >
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
            <Dialog
                open={showRoadLineModal}
                onOpenChange={setShowRoadLineModal}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-blue-600" />
                            <span>
                                {editingRoadLine
                                    ? t(
                                          'tests.edit_road_line',
                                          'Chiziqni Tahrirlash',
                                      )
                                    : t(
                                          'tests.add_road_line',
                                          "+ Chiziq Qo'shish",
                                      )}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Yo'l chizig'i parametrlarini kiriting
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleRoadLineSubmit}
                        className="space-y-3.5 pt-2"
                    >
                        <div>
                            <Label required className="text-xs">
                                {t('tests.line_number', 'Chiziq Raqami')}
                            </Label>
                            <Input
                                required
                                value={roadLineNumber}
                                onChange={(e) =>
                                    setRoadLineNumber(e.target.value)
                                }
                                placeholder="1.1, 1.2..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <Label required className="text-xs">
                                {t('tests.line_name', 'Chiziq Nomi')}
                            </Label>
                            <Input
                                required
                                value={roadLineName}
                                onChange={(e) =>
                                    setRoadLineName(e.target.value)
                                }
                                placeholder="Yaxlit chiziq..."
                                className="mt-1 text-xs"
                            />
                        </div>

                        {/* Image file upload only */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">
                                {t('tests.image_file', 'Rasm')}
                            </Label>
                            <input
                                ref={lineFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleRoadLineImageChange}
                                className="hidden"
                            />
                            {roadLinePreview ? (
                                <div className="relative flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-2.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                                            <img
                                                src={roadLinePreview}
                                                alt="Preview"
                                                className="h-full w-full object-contain"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-foreground">
                                                {roadLineFile
                                                    ? roadLineFile.name
                                                    : t(
                                                          'tests.current_image',
                                                          'Joriy rasm',
                                                      )}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {roadLineFile
                                                    ? `${(roadLineFile.size / 1024).toFixed(0)} KB`
                                                    : t(
                                                          'tests.image_ready',
                                                          'Rasm biriktirilgan',
                                                      )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            onClick={() =>
                                                lineFileInputRef.current?.click()
                                            }
                                            title={t(
                                                'tests.change_image',
                                                'Rasmni almashtirish',
                                            )}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={handleRemoveRoadLineImage}
                                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                                            title={t(
                                                'tests.remove_image',
                                                'Rasmni olib tashlash',
                                            )}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() =>
                                        lineFileInputRef.current?.click()
                                    }
                                    className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-4 text-center transition-all hover:border-primary hover:bg-gray-100/60 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-primary dark:hover:bg-gray-800/80"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                        <UploadCloud className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                        {t(
                                            'tests.upload_image_hint',
                                            'Rasm yuklash uchun bosing',
                                        )}
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                        PNG, JPG, WEBP (maks. 5MB)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs">
                                {t('common.description', 'Tavsif')}
                            </Label>
                            <textarea
                                rows={2}
                                value={roadLineDesc}
                                onChange={(e) =>
                                    setRoadLineDesc(e.target.value)
                                }
                                placeholder="Yo'l chizig'i qoidasi..."
                                className="mt-1.5 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRoadLineModal(false)}
                            >
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
            <Dialog
                open={showCategoryModal}
                onOpenChange={setShowCategoryModal}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-sm overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 text-blue-600" />
                            <span>
                                {editingCategory
                                    ? t(
                                          'tests.edit_category',
                                          'Toifani Tahrirlash',
                                      )
                                    : t(
                                          'tests.add_category',
                                          "+ Toifa Qo'shish",
                                      )}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Yo'l belgisi toifasi nomini kiriting
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleCategorySubmit}
                        className="space-y-3.5 pt-2"
                    >
                        <div>
                            <Label required className="text-xs">
                                {t('tests.category_name', 'Toifa Nomi')}
                            </Label>
                            <Input
                                required
                                value={categoryName}
                                onChange={(e) =>
                                    setCategoryName(e.target.value)
                                }
                                placeholder="Ogohlantiruvchi belgilar..."
                                className="mt-1 text-xs"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCategoryModal(false)}
                            >
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
