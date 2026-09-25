import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Award,
    CheckCircle2,
    Clock,
    FileText,
    HelpCircle,
    RotateCcw,
    Search,
    ShieldAlert,
    XCircle,
    ChevronRight,
    ChevronLeft,
    Play,
    AlertCircle,
    MapPin,
    ArrowLeft,
    Check,
} from 'lucide-react';

interface Question {
    id: number;
    ticket_id: number;
    question_number: number;
    question_uz: string;
    question_ru?: string;
    question_krill?: string;
    question_en?: string;
    description_uz?: string;
    description_ru?: string;
    description_krill?: string;
    description_en?: string;
    image_url?: string;
    answers: Array<{
        id: number;
        answer_uz: string;
        answer_ru?: string;
        answer_krill?: string;
        answer_en?: string;
        is_correct?: boolean;
    }>;
}

interface Ticket {
    id: number;
    ticket_number: number;
    title_uz: string;
    questions_count?: number;
}

interface SignCategory {
    id: number;
    name_uz: string;
    name_ru?: string;
    signs: Array<{
        id: number;
        sign_number: string;
        name_uz: string;
        image_url?: string;
        description_uz?: string;
    }>;
}

interface RoadLine {
    id: number;
    line_number: string;
    name_uz: string;
    image_url?: string;
    description_uz?: string;
    color?: string;
}

interface TestQuizProps {
    studentId?: number;
}

export function TestQuiz({ studentId }: TestQuizProps) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';

    // View state
    const [subTab, setSubTab] = useState<'exam_menu' | 'tickets' | 'signs' | 'history'>('exam_menu');
    const [activeQuizMode, setActiveQuizMode] = useState<'exam' | 'ticket' | null>(null);

    // Tickets & data
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [ticketSearch, setTicketSearch] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    // Active Quiz state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [revealedQuestions, setRevealedQuestions] = useState<Record<number, boolean>>({});
    const [quizLoading, setQuizLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Result state
    const [result, setResult] = useState<{
        attempt_id?: number;
        is_passed: boolean;
        score_percentage: number;
        correct_answers: number;
        wrong_answers: number;
        total_questions: number;
        duration_seconds: number;
        details?: any[];
    } | null>(null);

    // Signs & Road Lines
    const [signCategories, setSignCategories] = useState<SignCategory[]>([]);
    const [roadLines, setRoadLines] = useState<RoadLine[]>([]);
    const [selectedSignCategory, setSelectedSignCategory] = useState<number | 'lines' | null>(null);
    const [selectedSignModal, setSelectedSignModal] = useState<any | null>(null);

    // History stats
    const [stats, setStats] = useState<{
        has_passed_exam: boolean;
        total_attempts: number;
        passed_attempts: number;
        recent_attempts: any[];
    } | null>(null);

    const timerRef = useRef<any>(null);

    // Helper for multilang
    const getLocalized = (item: any, field: string) => {
        if (!item) return '';
        if (currentLang === 'ru' && item[`${field}_ru`]) return item[`${field}_ru`];
        if (currentLang === 'krill' && item[`${field}_krill`]) return item[`${field}_krill`];
        if (currentLang === 'en' && item[`${field}_en`]) return item[`${field}_en`];
        return item[`${field}_uz`] || item[field] || '';
    };

    // Load initial data
    useEffect(() => {
        fetchTickets();
        fetchStats();
    }, []);

    // Timer effect
    useEffect(() => {
        if (isTimerRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        submitQuiz(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isTimerRunning, timeLeft]);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tests/tickets');
            const data = await res.json();
            if (data.success) {
                setTickets(data.tickets);
            }
        } catch (e) {
            console.error('Error fetching tickets:', e);
        }
    };

    const fetchSigns = async () => {
        if (signCategories.length > 0) return;
        try {
            const res = await fetch('/api/tests/signs');
            const data = await res.json();
            if (data.success) {
                setSignCategories(data.categories);
                setRoadLines(data.road_lines);
                if (data.categories.length > 0) {
                    setSelectedSignCategory(data.categories[0].id);
                }
            }
        } catch (e) {
            console.error('Error fetching signs:', e);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/tests/stats${studentId ? `?student_id=${studentId}` : ''}`);
            const data = await res.json();
            if (data.success) {
                setStats(data);
            }
        } catch (e) {
            console.error('Error fetching stats:', e);
        }
    };

    // Start 20-question mock exam
    const startMockExam = async () => {
        setQuizLoading(true);
        setActiveQuizMode('exam');
        setSelectedTicket(null);
        setSelectedAnswers({});
        setRevealedQuestions({});
        setResult(null);
        setCurrentIndex(0);
        setTimeLeft(25 * 60);

        try {
            const res = await fetch('/api/tests/exam');
            const data = await res.json();
            if (data.success && data.questions.length > 0) {
                setQuestions(data.questions);
                setIsTimerRunning(true);
            }
        } catch (e) {
            console.error('Error starting exam:', e);
        } finally {
            setQuizLoading(false);
        }
    };

    // Start 10-question ticket practice
    const startTicketPractice = async (ticket: Ticket) => {
        setQuizLoading(true);
        setActiveQuizMode('ticket');
        setSelectedTicket(ticket);
        setSelectedAnswers({});
        setRevealedQuestions({});
        setResult(null);
        setCurrentIndex(0);
        setTimeLeft(15 * 60);

        try {
            const res = await fetch(`/api/tests/ticket/${ticket.id}`);
            const data = await res.json();
            if (data.success && data.questions.length > 0) {
                setQuestions(data.questions);
                setIsTimerRunning(true);
            }
        } catch (e) {
            console.error('Error loading ticket:', e);
        } finally {
            setQuizLoading(false);
        }
    };

    // Answer selection
    const handleSelectAnswer = (questionId: number, answerId: number) => {
        if (result) return; // already completed

        setSelectedAnswers((prev) => ({
            ...prev,
            [questionId]: answerId,
        }));

        // In practice mode (ticket), show explanation right away
        if (activeQuizMode === 'ticket') {
            setRevealedQuestions((prev) => ({
                ...prev,
                [questionId]: true,
            }));
        }
    };

    // Submit Quiz / Exam
    const submitQuiz = async (isTimeOut = false) => {
        setIsTimerRunning(false);
        const duration = (activeQuizMode === 'exam' ? 25 * 60 : 15 * 60) - timeLeft;

        const payload = {
            student_id: studentId,
            ticket_id: selectedTicket?.id ?? null,
            attempt_type: activeQuizMode === 'exam' ? 'random_mock' : 'ticket_exam',
            duration_seconds: Math.max(1, duration),
            answers: questions.map((q) => ({
                question_id: q.id,
                answer_id: selectedAnswers[q.id] || null,
            })),
        };

        try {
            const res = await fetch('/api/tests/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setResult(data);
                fetchStats();
            }
        } catch (e) {
            console.error('Error submitting exam:', e);
        }
    };

    // Format mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Render Quiz Question Screen
    if (activeQuizMode && questions.length > 0) {
        const currentQ = questions[currentIndex];
        const isAnswered = !!selectedAnswers[currentQ?.id];
        const isRevealed = revealedQuestions[currentQ?.id] || !!result;

        return (
            <div className="space-y-4">
                {/* Header bar */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (window.confirm(t('quiz.exit_confirm', 'Haqiqatan ham testdan chiqmoqchimisiz?'))) {
                                setActiveQuizMode(null);
                                setIsTimerRunning(false);
                            }
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('common.back', 'Orqaga')}
                    </button>

                    <div className="text-center">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">
                            {activeQuizMode === 'exam'
                                ? t('quiz.mock_exam_title', 'Ichki Nazorat Imtihoni')
                                : `${selectedTicket?.title_uz || 'Bilet'} (${currentIndex + 1}/${questions.length})`}
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {t('quiz.passing_rule', 'O\'tish: kamida 90%')}
                        </span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        timeLeft < 180 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Question Bubbles Carousel */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {questions.map((q, idx) => {
                        const ans = selectedAnswers[q.id];
                        let statusColor = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';

                        if (idx === currentIndex) {
                            statusColor = 'bg-blue-600 text-white font-bold ring-2 ring-blue-400';
                        } else if (ans) {
                            if (result) {
                                const detail = result.details?.find((d) => d.question_id === q.id);
                                statusColor = detail?.is_correct
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-red-500 text-white';
                            } else {
                                statusColor = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold';
                            }
                        }

                        return (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-8 h-8 rounded-lg shrink-0 text-xs flex items-center justify-center transition-all ${statusColor}`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>

                {/* Current Question Card */}
                {currentQ && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        {/* Image if exists */}
                        {currentQ.image_url && (
                            <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-2 border border-gray-100 dark:border-gray-700">
                                <img
                                    src={currentQ.image_url}
                                    alt="Savol rasmi"
                                    className="max-h-56 w-auto object-contain rounded-lg shadow-xs"
                                    loading="lazy"
                                />
                            </div>
                        )}

                        {/* Question Text */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                {t('quiz.question_label', 'Savol')} #{currentIndex + 1}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                                {getLocalized(currentQ, 'question')}
                            </h3>
                        </div>

                        {/* Answers Options */}
                        <div className="space-y-2 pt-1">
                            {currentQ.answers.map((ans, aIdx) => {
                                const isSelected = selectedAnswers[currentQ.id] === ans.id;
                                const isCorrectAnswer = ans.is_correct;

                                let btnStyle = 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200 hover:bg-gray-100';

                                if (isRevealed) {
                                    if (isCorrectAnswer) {
                                        btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500';
                                    } else if (isSelected && !isCorrectAnswer) {
                                        btnStyle = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 font-semibold ring-1 ring-red-500';
                                    }
                                } else if (isSelected) {
                                    btnStyle = 'border-blue-600 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold ring-1 ring-blue-600';
                                }

                                return (
                                    <button
                                        key={ans.id}
                                        onClick={() => handleSelectAnswer(currentQ.id, ans.id)}
                                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 ${btnStyle}`}
                                    >
                                        <span className={`w-5 h-5 rounded-full text-[10px] shrink-0 font-bold flex items-center justify-center ${
                                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                        }`}>
                                            {String.fromCharCode(65 + aIdx)}
                                        </span>
                                        <span className="leading-relaxed flex-1">
                                            {getLocalized(ans, 'answer')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation (Shown when revealed in practice or completed) */}
                        {isRevealed && getLocalized(currentQ, 'description') && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{t('quiz.explanation', 'Qoidalar bo\'yicha izoh')}:</span>
                                </div>
                                <p className="text-amber-900/80 dark:text-amber-200/80 leading-relaxed pl-5">
                                    {getLocalized(currentQ, 'description')}
                                </p>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60">
                            <button
                                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                                disabled={currentIndex === 0}
                                className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 disabled:opacity-30 flex items-center gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {t('common.prev', 'Oldingi')}
                            </button>

                            {currentIndex < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shadow-sm"
                                >
                                    {t('common.next', 'Keyingi')}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                !result && (
                                    <button
                                        onClick={() => submitQuiz()}
                                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Check className="w-4 h-4" />
                                        {t('quiz.submit_test', 'Imtihonni Yakunlash')}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* Exam Result Modal / Overlay */}
                {result && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                                result.is_passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                            }`}>
                                {result.is_passed ? <Award className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                                    {result.is_passed
                                        ? t('quiz.congrats_passed', 'Tabriklaymiz, Imtihondan O\'tdingiz!')
                                        : t('quiz.failed_title', 'Afsuski, O\'ta Olmadingiz')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {result.is_passed
                                        ? t('quiz.cert_criteria_met', 'Bitiruv Guvohnomasi uchun ichki test sinovi muvaffaqiyatli topshirildi!')
                                        : t('quiz.retry_prompt', 'Kamida 18 ta to\'g\'ri javob kerak. Yana bir bor mashq qilib ko\'ring.')}
                                </p>
                            </div>

                            {/* Score Card */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-400 block text-[10px] uppercase font-bold">{t('quiz.score', 'Natija')}</span>
                                    <span className={`text-base font-extrabold mt-0.5 block ${result.is_passed ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {result.score_percentage}%
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px] uppercase font-bold">{t('quiz.correct', 'To\'g\'ri')}</span>
                                    <span className="text-base font-extrabold text-emerald-600 mt-0.5 block">
                                        {result.correct_answers}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px] uppercase font-bold">{t('quiz.wrong', 'Xato')}</span>
                                    <span className="text-base font-extrabold text-red-500 mt-0.5 block">
                                        {result.wrong_answers}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setResult(null);
                                        if (activeQuizMode === 'exam') startMockExam();
                                        else if (selectedTicket) startTicketPractice(selectedTicket);
                                    }}
                                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {t('quiz.restart_quiz', 'Qaytadan topshirish')}
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveQuizMode(null);
                                        setResult(null);
                                    }}
                                    className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    {t('quiz.back_to_menu', 'Bosh menyuga qaytish')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default Main View with 4 Sub-Tabs
    return (
        <div className="space-y-4">
            {/* Sub-Tabs Navbar */}
            <div className="grid grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-[11px] font-semibold">
                <button
                    onClick={() => setSubTab('exam_menu')}
                    className={`py-1.5 rounded-lg transition-all text-center ${
                        subTab === 'exam_menu'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    🎯 {t('quiz.tab_exam', 'Imtihon')}
                </button>
                <button
                    onClick={() => setSubTab('tickets')}
                    className={`py-1.5 rounded-lg transition-all text-center ${
                        subTab === 'tickets'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    📑 {t('quiz.tab_tickets', 'Biletlar')}
                </button>
                <button
                    onClick={() => {
                        setSubTab('signs');
                        fetchSigns();
                    }}
                    className={`py-1.5 rounded-lg transition-all text-center ${
                        subTab === 'signs'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    🚸 {t('quiz.tab_signs', 'Belgilar')}
                </button>
                <button
                    onClick={() => {
                        setSubTab('history');
                        fetchStats();
                    }}
                    className={`py-1.5 rounded-lg transition-all text-center ${
                        subTab === 'history'
                            ? 'bg-white dark:bg-gray-700 shadow-xs text-blue-600 dark:text-white font-bold'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    📊 {t('quiz.tab_stats', 'Tarix')}
                </button>
            </div>

            {/* TAB 1: MOCK EXAM MENU */}
            {subTab === 'exam_menu' && (
                <div className="space-y-4">
                    {/* Big Hero Card */}
                    <div className="bg-linear-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-5 text-white shadow-lg space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs">
                                    NAZARIY TESTLAR
                                </span>
                                <h2 className="text-lg font-extrabold leading-tight">
                                    {t('quiz.mock_exam_card_title', 'Ichki Nazorat Imtihoni')}
                                </h2>
                                <p className="text-xs text-blue-100 max-w-xs leading-relaxed">
                                    {t('quiz.mock_exam_desc', '20 ta savol, 25 daqiqa vaqt. Bitiruv Guvohnomasi olish uchun kamida 18 ta to\'g\'ri javob talab etiladi.')}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center">
                                <Award className="w-6 h-6 text-yellow-300" />
                            </div>
                        </div>

                        {/* Certificate status pill */}
                        <div className="p-3 bg-black/20 rounded-2xl backdrop-blur-xs flex items-center justify-between text-xs">
                            <span className="text-blue-100">{t('quiz.cert_status', 'Guvohnoma imtihon holati')}:</span>
                            <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                                stats?.has_passed_exam
                                    ? 'bg-emerald-400 text-emerald-950'
                                    : 'bg-yellow-400 text-yellow-950'
                            }`}>
                                {stats?.has_passed_exam
                                    ? t('quiz.status_passed', 'Topshirilgan ✅')
                                    : t('quiz.status_pending', 'Topshirilmagan')}
                            </span>
                        </div>

                        <button
                            onClick={startMockExam}
                            disabled={quizLoading}
                            className="w-full py-3.5 px-4 bg-white text-blue-700 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-blue-50 active:scale-98 transition-all text-sm"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            {quizLoading ? t('common.loading', 'Yuklanmoqda...') : t('quiz.start_exam_btn', 'Imtihonni Boshlash')}
                        </button>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-400 text-[10px] uppercase font-bold block">{t('quiz.total_tickets', 'Jami Biletlar')}</span>
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white mt-1 block">130 ta</span>
                            <span className="text-[10px] text-gray-400 mt-0.5 block">1300 ta rasmli savol</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-400 text-[10px] uppercase font-bold block">{t('quiz.my_attempts', 'Urinishlarim')}</span>
                            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
                                {stats?.total_attempts || 0} ta
                            </span>
                            <span className="text-[10px] text-emerald-500 mt-0.5 block">
                                {stats?.passed_attempts || 0} marta o'tdingiz
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: TICKETS LIST (1-130) */}
            {subTab === 'tickets' && (
                <div className="space-y-3">
                    {/* Search box */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={ticketSearch}
                            onChange={(e) => setTicketSearch(e.target.value)}
                            placeholder={t('quiz.search_ticket', 'Bilet raqami (masalan: 12)...')}
                            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Tickets Grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-[65vh] overflow-y-auto pr-1">
                        {tickets
                            .filter((t) => !ticketSearch || t.ticket_number.toString().includes(ticketSearch) || t.title_uz.toLowerCase().includes(ticketSearch.toLowerCase()))
                            .map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => startTicketPractice(t)}
                                    className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 hover:border-blue-500 transition-all text-left flex items-center justify-between group"
                                >
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white block group-hover:text-blue-600 transition-colors">
                                            {t.title_uz}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                                            10 ta savol
                                        </span>
                                    </div>
                                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* TAB 3: TRAFFIC SIGNS & ROAD LINES */}
            {subTab === 'signs' && (
                <div className="space-y-3">
                    {/* Category Selector Pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                        {signCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedSignCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-xl shrink-0 font-medium transition-all ${
                                    selectedSignCategory === cat.id
                                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700'
                                }`}
                            >
                                {cat.name_uz}
                            </button>
                        ))}
                        <button
                            onClick={() => setSelectedSignCategory('lines')}
                            className={`px-3 py-1.5 rounded-xl shrink-0 font-medium transition-all ${
                                selectedSignCategory === 'lines'
                                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700'
                            }`}
                        >
                            {t('quiz.road_lines_tab', 'Yo\'l chiziqlari (22 ta)')}
                        </button>
                    </div>

                    {/* Signs Grid */}
                    {selectedSignCategory !== 'lines' ? (
                        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                            {signCategories
                                .find((c) => c.id === selectedSignCategory)
                                ?.signs.map((sign) => (
                                    <div
                                        key={sign.id}
                                        onClick={() => setSelectedSignModal(sign)}
                                        className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xs border border-gray-100 dark:border-gray-700 text-center space-y-2 cursor-pointer hover:border-blue-400 transition-all flex flex-col items-center justify-between"
                                    >
                                        <div className="h-20 flex items-center justify-center">
                                            {sign.image_url ? (
                                                <img src={sign.image_url} alt={sign.name_uz} className="max-h-18 max-w-full object-contain" />
                                            ) : (
                                                <MapPin className="w-8 h-8 text-gray-300" />
                                            )}
                                        </div>
                                        <div>
                                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                {sign.sign_number}
                                            </span>
                                            <h4 className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 mt-1 line-clamp-2 leading-tight">
                                                {sign.name_uz}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        /* Road Lines Grid */
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                            {roadLines.map((line) => (
                                <div
                                    key={line.id}
                                    onClick={() => setSelectedSignModal(line)}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xs border border-gray-100 dark:border-gray-700 flex items-center gap-3 cursor-pointer hover:border-blue-400 transition-all"
                                >
                                    <div className="w-16 h-12 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center shrink-0 p-1">
                                        {line.image_url ? (
                                            <img src={line.image_url} alt={line.name_uz} className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <MapPin className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="text-xs">
                                        <span className="font-bold text-gray-900 dark:text-white block">
                                            {line.line_number}
                                        </span>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                                            {line.description_uz || line.name_uz}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Sign / Line Detail Modal */}
            {selectedSignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 text-center">
                        {selectedSignModal.image_url && (
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl flex items-center justify-center">
                                <img src={selectedSignModal.image_url} alt="Belgi" className="max-h-36 max-w-full object-contain" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                {selectedSignModal.sign_number || selectedSignModal.line_number}
                            </span>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mt-1">
                                {selectedSignModal.name_uz}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300 text-left pt-2 leading-relaxed">
                                {selectedSignModal.description_uz || selectedSignModal.name_uz}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedSignModal(null)}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            {t('common.close', 'Yopish')}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 4: ATTEMPTS HISTORY */}
            {subTab === 'history' && (
                <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-2">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                            {t('quiz.exam_status_summary', 'Imtihon Natijalari')}
                        </h3>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            {stats?.has_passed_exam
                                ? t('quiz.summary_passed_msg', '🎉 Siz ichki imtihonni muvaffaqiyatli topshirgansiz. Bitiruv talablari bo\'yicha ushbu band qondirildi.')
                                : t('quiz.summary_not_passed_msg', '⚠️ Bitiruv Guvohnomasi olish uchun kamida bitta Ichki Nazorat Imtihonidan (20 tadan 18 ta) o\'tishingiz kerak.')}
                        </p>
                    </div>

                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                        {stats?.recent_attempts && stats.recent_attempts.length > 0 ? (
                            stats.recent_attempts.map((att) => (
                                <div
                                    key={att.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs"
                                >
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {att.attempt_type === 'random_mock'
                                                    ? t('quiz.mock_exam_title', 'Ichki Imtihon')
                                                    : (att.ticket?.title_uz || 'Bilet')}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    att.is_passed
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                                }`}
                                            >
                                                {att.is_passed ? t('quiz.passed', 'O\'tdi') : t('quiz.failed', 'O\'tmadi')}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 block">
                                            {new Date(att.created_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-extrabold text-sm text-gray-900 dark:text-white block">
                                            {att.correct_answers} / {att.total_questions}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {att.score_percentage}%
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center text-xs text-gray-400 border border-gray-100 dark:border-gray-700">
                                {t('quiz.no_attempts_yet', 'Hali imtihon topshirilmagan.')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
