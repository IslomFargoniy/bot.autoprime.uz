import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Award,
    CheckCircle2,
    Clock,
    RotateCcw,
    Search,
    XCircle,
    Play,
    AlertCircle,
    ArrowLeft,
    Check,
    AArrowDown,
    AArrowUp,
    Info,
    X,
    Layers,
    Zap,
    ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    description?: string;
    questions_count?: number;
    attempts_count?: number;
    is_active?: boolean;
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
}

interface TestQuizProps {
    studentId?: number;
}

export function TestQuiz({ studentId }: TestQuizProps) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';

    // Top view modes
    const [subTab, setSubTab] = useState<'tickets' | 'signs' | 'history'>('tickets');
    const [activeQuizMode, setActiveQuizMode] = useState<'exam' | 'ticket' | null>(null);

    // Tickets & Search
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [ticketSearch, setTicketSearch] = useState('');
    const [selectedTicketForModal, setSelectedTicketForModal] = useState<Ticket | null>(null);

    // Active Quiz state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [revealedQuestions, setRevealedQuestions] = useState<Record<number, boolean>>({});
    const [optimisticAnswerId, setOptimisticAnswerId] = useState<number | null>(null);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

    // Settings inside Quiz
    const [fontSize, setFontSize] = useState<number>(15);
    const [isExplanationEnabled, setIsExplanationEnabled] = useState<boolean>(false);
    const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
    const [showFinishConfirmModal, setShowFinishConfirmModal] = useState<boolean>(false);

    // Timer
    const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
    const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
    const timerRef = useRef<any>(null);

    // Touch swipe refs
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const mobileScrollRef = useRef<HTMLDivElement>(null);

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
    const [selectedSignCategory, setSelectedSignCategory] = useState<number | 'lines' | 'all'>('all');
    const [selectedSignModal, setSelectedSignModal] = useState<any | null>(null);

    // History stats
    const [stats, setStats] = useState<{
        has_passed_exam: boolean;
        total_attempts: number;
        passed_attempts: number;
        recent_attempts: any[];
    } | null>(null);

    // Multilang helper
    const getLocalized = (item: any, field: string) => {
        if (!item) return '';
        if (currentLang === 'ru' && item[`${field}_ru`]) return item[`${field}_ru`];
        if (currentLang === 'krill' && item[`${field}_krill`]) return item[`${field}_krill`];
        if (currentLang === 'en' && item[`${field}_en`]) return item[`${field}_en`];
        return item[`${field}_uz`] || item[field] || '';
    };

    const formatImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('/storage')) return url;
        return `/storage/${url.replace(/^\/+/, '')}`;
    };

    // Load initial data
    useEffect(() => {
        fetchTickets();
        fetchStats();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tests/tickets');
            const data = await res.json();
            if (data.success && data.tickets) {
                setTickets(data.tickets);
            }
        } catch (e) {
            console.error('Error loading tickets:', e);
        }
    };

    const fetchSigns = async () => {
        try {
            const res = await fetch('/api/tests/signs');
            const data = await res.json();
            if (data.success) {
                setSignCategories(data.categories || []);
                setRoadLines(data.road_lines || []);
            }
        } catch (e) {
            console.error('Error loading signs:', e);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/tests/stats${studentId ? `?student_id=${studentId}` : ''}`);
            const data = await res.json();
            if (data.success) {
                setStats({
                    has_passed_exam: !!data.passed_exam,
                    total_attempts: data.total_attempts || 0,
                    passed_attempts: data.attempts?.filter((a: any) => a.is_passed).length || 0,
                    recent_attempts: data.attempts || [],
                });
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    };

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
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, timeLeft]);

    // Auto-scroll ribbon to active button
    useEffect(() => {
        if (!mobileScrollRef.current) return;
        const container = mobileScrollRef.current;
        const activeBtn = container.querySelector<HTMLElement>('[data-active="true"]');
        if (!activeBtn) return;
        const containerWidth = container.clientWidth;
        const btnLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        const targetScroll = btnLeft - containerWidth / 2 + btnWidth / 2;
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }, [currentIndex]);

    // Start Ticket Exam
    const startTicketExam = async (tkt: Ticket) => {
        setSelectedTicketForModal(null);
        try {
            const res = await fetch(`/api/tests/ticket/${tkt.id}`);
            const data = await res.json();
            if (data.success && data.ticket?.questions?.length > 0) {
                setQuestions(data.ticket.questions);
                setActiveTicket(tkt);
                setActiveQuizMode('ticket');
                setCurrentIndex(0);
                setSelectedAnswers({});
                setRevealedQuestions({});
                setResult(null);
                setTimeLeft(25 * 60);
                setIsTimerRunning(true);
            }
        } catch (e) {
            console.error('Error starting ticket exam:', e);
        }
    };

    // Start Random Mock Exam (20 questions)
    const startMockExam = async () => {
        try {
            const res = await fetch('/api/tests/exam');
            const data = await res.json();
            if (data.success && data.questions?.length > 0) {
                setQuestions(data.questions);
                setActiveTicket(null);
                setActiveQuizMode('exam');
                setCurrentIndex(0);
                setSelectedAnswers({});
                setRevealedQuestions({});
                setResult(null);
                setTimeLeft(25 * 60);
                setIsTimerRunning(true);
            }
        } catch (e) {
            console.error('Error starting mock exam:', e);
        }
    };

    // Handle next question
    const handleNextQuestion = useCallback((fromIndex?: number) => {
        setShowExplanationModal(false);
        setCurrentIndex((prev) => {
            if (fromIndex !== undefined && prev !== fromIndex) {
                return prev;
            }
            if (prev < questions.length - 1) {
                return prev + 1;
            }
            return prev;
        });
    }, [questions.length]);

    // Handle Answer Selection
    const handleSelectAnswer = useCallback((questionId: number, answerId: number) => {
        if (result) return; // quiz already finished

        setOptimisticAnswerId(answerId);
        setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerId }));
        setRevealedQuestions((prev) => ({ ...prev, [questionId]: true }));

        const currentQ = questions[currentIndex];
        const selectedAns = currentQ?.answers?.find((a) => a.id === answerId);

        // Haptic feedback if available in Telegram WebApp
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
            if (selectedAns?.is_correct) {
                (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            } else {
                (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
        }

        if (isExplanationEnabled) {
            setShowExplanationModal(true);
        } else {
            const scheduledFromIndex = currentIndex;
            setTimeout(() => {
                handleNextQuestion(scheduledFromIndex);
            }, 400);
        }
    }, [result, questions, currentIndex, isExplanationEnabled, handleNextQuestion]);

    // Touch Swipe Handlers for smooth mobile UX
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (showExplanationModal || showFinishConfirmModal) return;
        if (touchStartX.current === null || touchStartY.current === null) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX.current;
        const diffY = touchEndY - touchStartY.current;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
            if (diffX > 0) {
                // Swipe Right -> previous question
                if (currentIndex > 0) {
                    setShowExplanationModal(false);
                    setCurrentIndex((prev) => prev - 1);
                }
            } else {
                // Swipe Left -> next question
                if (currentIndex < questions.length - 1) {
                    setShowExplanationModal(false);
                    setCurrentIndex((prev) => prev + 1);
                }
            }
        }

        touchStartX.current = null;
        touchStartY.current = null;
    };

    // Keyboard Shortcuts (F1-F9, 1-9, Enter)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeQuizMode || questions.length === 0) return;

            if (showExplanationModal) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNextQuestion();
                }
                return;
            }

            const currentQ = questions[currentIndex];
            if (!currentQ) return;

            const keyMap: Record<string, number> = {
                F1: 0, F2: 1, F3: 2, F4: 3,
                '1': 0, '2': 1, '3': 2, '4': 3,
                a: 0, b: 1, c: 2, d: 3,
                A: 0, B: 1, C: 2, D: 3,
            };

            if (e.key in keyMap) {
                const idx = keyMap[e.key];
                if (currentQ.answers && idx < currentQ.answers.length) {
                    e.preventDefault();
                    handleSelectAnswer(currentQ.id, currentQ.answers[idx].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeQuizMode, questions, currentIndex, showExplanationModal, handleNextQuestion, handleSelectAnswer]);

    // Submit Attempt
    const submitQuiz = async (autoTimeout = false) => {
        setShowFinishConfirmModal(false);
        setIsTimerRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);

        const durationSeconds = 25 * 60 - timeLeft;

        const payload = {
            student_id: studentId,
            ticket_id: activeTicket?.id,
            attempt_type: activeQuizMode === 'exam' ? 'random_mock' : 'ticket_exam',
            duration_seconds: durationSeconds,
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
                    'Accept': 'application/json',
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

    const unansweredCount = questions.filter((q) => !selectedAnswers[q.id]).length;

    // =========================================================================
    // ACTIVE QUIZ INTERFACE (1:1 with panel.prava24.uz ExamInterface)
    // =========================================================================
    if (activeQuizMode && questions.length > 0) {
        const currentQ = questions[currentIndex];
        const currentSelectedId = optimisticAnswerId !== null && optimisticAnswerId !== undefined
            ? optimisticAnswerId
            : selectedAnswers[currentQ?.id];
        const currentSelectedObject = currentQ?.answers?.find((a) => a.id === currentSelectedId);
        const isCorrectValue = !!currentSelectedObject?.is_correct;
        const isCurrentAnswered = currentSelectedId !== undefined && currentSelectedId !== null;

        return (
            <div
                className="bg-background text-foreground min-h-screen flex flex-col -mx-4 -mt-4 px-4 pt-2"
                style={{ fontSize: `${fontSize}px` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Minimal Header (matching PracticeLayout) */}
                <header className="sticky top-0 z-40 bg-background/95 border-b border-border/60 backdrop-blur-xl py-2 px-1">
                    <div className="flex items-center justify-between gap-2">
                        {/* Chap tomon: Orqaga + Timer */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (window.confirm(t('quiz.exit_confirm', 'Haqiqatan ham testdan chiqmoqchimisiz?'))) {
                                        setActiveQuizMode(null);
                                        setIsTimerRunning(false);
                                    }
                                }}
                                className="flex items-center justify-center h-8 px-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                {t('common.back', 'Ortga')}
                            </button>

                            {/* Timer badge */}
                            <div
                                className={cn(
                                    'flex items-center justify-center rounded-xl border-2 px-3 py-1 shadow-xs transition-all',
                                    timeLeft < 60
                                        ? 'animate-pulse border-red-500 bg-red-500/10 text-red-600'
                                        : 'border-primary/20 bg-background text-primary'
                                )}
                            >
                                <span className="font-mono text-sm font-black tabular-nums">{formatTime(timeLeft)}</span>
                            </div>
                        </div>

                        {/* O'ng tomon: Tavsif toggle + Font size + Language */}
                        <div className="flex items-center gap-2 ml-auto">
                            {/* Tavsif toggle switch */}
                            <div className="flex flex-col items-center justify-center gap-0.5 group">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                                    {t('tests.explanation_mode', 'Tavsif')}
                                </span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isExplanationEnabled}
                                    onClick={() => setIsExplanationEnabled(!isExplanationEnabled)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all ${
                                        isExplanationEnabled ? 'bg-blue-600' : 'bg-muted'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                                            isExplanationEnabled ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="w-px h-5 bg-border/60" />

                            {/* Font size controls */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setFontSize((prev) => Math.max(prev - 1, 12))}
                                    disabled={fontSize <= 12}
                                    className="flex items-center justify-center h-7 w-7 rounded-lg border border-border bg-card text-foreground hover:bg-muted active:scale-95 disabled:opacity-30"
                                    title={t('tests.font_decrease', 'Kichraytirish')}
                                >
                                    <AArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[10px] font-bold text-muted-foreground w-4 text-center tabular-nums">{fontSize}</span>
                                <button
                                    onClick={() => setFontSize((prev) => Math.min(prev + 1, 22))}
                                    disabled={fontSize >= 22}
                                    className="flex items-center justify-center h-7 w-7 rounded-lg border border-border bg-card text-foreground hover:bg-muted active:scale-95 disabled:opacity-30"
                                    title={t('tests.font_increase', 'Kattalashtirish')}
                                >
                                    <AArrowUp className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <div className="w-px h-5 bg-border/60" />

                            {/* Quick Language Toggle */}
                            <div className="flex rounded-lg border border-border bg-card p-0.5 text-[10px] font-bold">
                                {['uz', 'ru', 'krill', 'en'].map((lng) => (
                                    <button
                                        key={lng}
                                        onClick={() => i18n.changeLanguage(lng)}
                                        className={cn(
                                            'px-1.5 py-0.5 rounded uppercase transition-colors',
                                            currentLang === lng ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {lng === 'krill' ? 'Ўз' : lng}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Question Area */}
                <main className="flex-1 flex flex-col gap-3 py-3">
                    {/* Savol sarlavhasi + Tavsif Info tugmasi */}
                    <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                                    {activeQuizMode === 'exam'
                                        ? t('tests.type_mock', 'Ichki Nazorat Imtihoni')
                                        : `${activeTicket?.title_uz || 'Bilet'}`} — {currentIndex + 1} / {questions.length}
                                </div>
                                <h2
                                    className="font-bold text-foreground leading-snug"
                                    style={{ fontSize: `${fontSize + 1}px` }}
                                >
                                    {getLocalized(currentQ, 'question')}
                                </h2>
                            </div>

                            {/* Circular Tavsif (Info) button */}
                            <button
                                onClick={() => setShowExplanationModal(true)}
                                className="flex items-center justify-center bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 size-9 rounded-full shrink-0 transition-all active:scale-90"
                                title={t('tests.explanation_mode', 'Tavsif')}
                            >
                                <Info className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Question Image (agar mavjud bo'lsa) */}
                    {currentQ?.image_url && (
                        <div className="border-border bg-card/60 rounded-2xl border p-3 flex items-center justify-center">
                            <img
                                src={formatImageUrl(currentQ.image_url) || ''}
                                alt="Question"
                                className="max-h-56 md:max-h-64 w-auto max-w-full object-contain rounded-lg shadow-xs"
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Answers Options (Exact panel.prava24.uz styling) */}
                    <div className="flex flex-col gap-2.5">
                        {currentQ?.answers?.map((ans, idx) => {
                            const isSelected = selectedAnswers[currentQ.id] === ans.id || optimisticAnswerId === ans.id;
                            const isAnswered = isCurrentAnswered || !!result;
                            const isCorrect = ans.is_correct;

                            let btnStyle = 'border-border bg-card hover:border-primary hover:bg-muted/50';

                            if (isAnswered) {
                                if (isCorrect) {
                                    btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500';
                                } else if (isSelected && !isCorrect) {
                                    btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-semibold ring-1 ring-rose-500';
                                }
                            } else if (isSelected) {
                                btnStyle = 'border-primary bg-primary/10 text-primary font-bold';
                            }

                            return (
                                <button
                                    key={ans.id}
                                    onClick={() => handleSelectAnswer(currentQ.id, ans.id)}
                                    className={cn(
                                        'group flex items-stretch rounded-xl border text-left transition-all active:scale-[0.98]',
                                        btnStyle
                                    )}
                                >
                                    <div className="bg-primary/10 text-primary group-hover:bg-primary/20 flex w-11 shrink-0 items-center justify-center font-bold text-sm">
                                        F{idx + 1}
                                    </div>
                                    <div
                                        className="text-foreground/90 flex-1 p-3 leading-snug font-medium"
                                        style={{ fontSize: `${fontSize}px` }}
                                    >
                                        {getLocalized(ans, 'answer')}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </main>

                {/* Sticky Bottom Navigation (Ribbon + Tugatish) */}
                <footer className="sticky bottom-0 z-30 border-border bg-card/95 backdrop-blur-md border-t p-3 -mx-4 mt-auto">
                    <div
                        ref={mobileScrollRef}
                        className="overflow-x-auto py-1 mb-2.5 no-scrollbar"
                    >
                        <div className="flex gap-1.5 w-max mx-auto px-1">
                            {questions.map((q, idx) => {
                                const selectedAnsId = selectedAnswers[q.id];
                                const isActive = currentIndex === idx;
                                const isAnswered = selectedAnsId !== undefined && selectedAnsId !== null;
                                const selectedAnsObj = q.answers?.find((a) => a.id === selectedAnsId);
                                const isCorrect = selectedAnsObj?.is_correct;

                                return (
                                    <button
                                        key={q.id}
                                        data-active={isActive ? 'true' : 'false'}
                                        onClick={() => {
                                            setOptimisticAnswerId(null);
                                            setCurrentIndex(idx);
                                        }}
                                        className={cn(
                                            'flex h-8 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all shadow-xs',
                                            isActive && 'ring-2 ring-blue-400 z-10',
                                            !isAnswered
                                                ? (isActive ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')
                                                : (isCorrect ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700')
                                        )}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowFinishConfirmModal(true)}
                        className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 text-sm transition-colors active:scale-95 shadow-sm"
                    >
                        {t('tests.finish_quiz', 'Testni Yakunlash')}
                    </button>
                </footer>

                {/* Explanation Modal Overlay (Matching panel.prava24.uz) */}
                {showExplanationModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                        <div className="bg-card border-border animate-in fade-in zoom-in relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl duration-200">
                            <button
                                onClick={() => setShowExplanationModal(false)}
                                className="absolute top-3 right-3 z-10 text-white/70 transition-colors hover:text-white"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {isCurrentAnswered ? (
                                <div className={cn('p-3.5 text-center font-bold text-white', isCorrectValue ? 'bg-emerald-600' : 'bg-rose-600')}>
                                    {isCorrectValue ? t('tests.correct_answer', 'To\'g\'ri javob') : t('tests.wrong_answer', 'Noto\'g\'ri javob')}
                                </div>
                            ) : (
                                <div className="bg-blue-600 p-3.5 text-center font-bold text-white uppercase tracking-wider">
                                    {t('tests.explanation_mode', 'Tavsif')}
                                </div>
                            )}

                            <div className="p-5">
                                <h3 className="text-foreground mb-2 text-base font-bold">{t('tests.explanation_mode', 'Tavsif')}</h3>
                                <div
                                    className="bg-muted/50 text-foreground/90 max-h-[40vh] overflow-y-auto rounded-xl p-3.5 leading-relaxed text-xs"
                                    style={{ fontSize: `${fontSize}px` }}
                                >
                                    {getLocalized(currentQ, 'description') || t('tests.no_description_available', 'Ushbu savol uchun izoh kiritilmagan')}
                                </div>
                            </div>

                            <div className="border-border border-t p-3.5">
                                <button
                                    onClick={() => {
                                        if (isCurrentAnswered) {
                                            handleNextQuestion();
                                        } else {
                                            setShowExplanationModal(false);
                                        }
                                    }}
                                    className="bg-primary text-primary-foreground w-full rounded-xl py-2.5 font-bold text-sm transition hover:opacity-90 active:scale-[0.98]"
                                >
                                    {t('tests.understand_and_continue', 'Tushunarli va davom etish')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Finish Confirmation Modal (Matching FinishAttemptModal.tsx) */}
                <Dialog open={showFinishConfirmModal} onOpenChange={setShowFinishConfirmModal}>
                    <DialogContent className="w-[92%] max-w-md rounded-2xl border bg-card p-5 shadow-lg">
                        <DialogHeader>
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <DialogTitle className="text-center text-lg font-bold text-foreground">
                                {t('tests.finish_confirm_title', 'Testni yakunlaysizmi?')}
                            </DialogTitle>
                            <DialogDescription className="text-center text-xs text-muted-foreground pt-1">
                                {t('tests.finish_confirm_desc', 'Barcha javoblaringiz tekshiriladi va natija saqlanadi.')}
                            </DialogDescription>
                        </DialogHeader>

                        {unansweredCount > 0 && (
                            <div className="my-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/30 dark:bg-yellow-900/20">
                                <p className="text-center text-xs font-semibold text-yellow-800 dark:text-yellow-400">
                                    {t('tests.unanswered_warning', { count: unansweredCount, defaultValue: `Sizda ${unansweredCount} ta javob berilmagan savol qoldi!` })}
                                </p>
                            </div>
                        )}

                        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost" className="h-9 text-xs">
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                            </DialogClose>
                            <Button onClick={() => submitQuiz(false)} className="h-9 bg-green-600 hover:bg-green-700 text-white text-xs px-6">
                                {t('tests.confirm_finish', 'Ha, yakunlash')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Results Screen Overlay (if finished) */}
                {result && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                        <div className="bg-card border-border relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl p-6 text-center space-y-4">
                            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                                result.is_passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                            }`}>
                                {result.is_passed ? <CheckCircle2 className="h-9 w-9" /> : <XCircle className="h-9 w-9" />}
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-foreground">
                                    {result.is_passed ? t('tests.status_passed', 'Imtihondan o\'tdingiz!') : t('tests.status_failed', 'Imtihondan o\'tolmadingiz')}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {result.is_passed
                                        ? t('quiz.passed_note', 'Tabriklaymiz, siz minimal talab qilingan 90% balldan yuqori natija qayd etdingiz.')
                                        : t('quiz.failed_note', 'Afsuski, natija kamida 90% bo\'lishi kerak. Qayta urinib ko\'ring.')}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-2">
                                <div className="p-3 bg-muted/40 rounded-xl">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('tests.col_score', 'Natija')}</p>
                                    <p className="text-base font-bold text-foreground mt-0.5">{Number(result.score_percentage).toFixed(0)}%</p>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                                    <p className="text-[10px] text-emerald-600 uppercase font-bold">{t('tests.correct_answer', 'To\'g\'ri')}</p>
                                    <p className="text-base font-bold text-emerald-600 mt-0.5">{result.correct_answers}</p>
                                </div>
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                                    <p className="text-[10px] text-rose-600 uppercase font-bold">{t('tests.wrong_count', 'Xato')}</p>
                                    <p className="text-base font-bold text-rose-600 mt-0.5">{result.wrong_answers}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setActiveQuizMode(null);
                                        setResult(null);
                                    }}
                                    className="flex-1 text-xs"
                                >
                                    {t('tests.all_tickets', 'Barcha biletlar')}
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (activeQuizMode === 'exam') startMockExam();
                                        else if (activeTicket) startTicketExam(activeTicket);
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    {t('tests.retake_exam', 'Qayta topshirish')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // TICKETS CATALOG & EXAM MENU (1:1 with panel.prava24.uz ActiveTicketTable)
    // =========================================================================
    const filteredTickets = tickets.filter(
        (tkt) =>
            !ticketSearch ||
            String(tkt.ticket_number).includes(ticketSearch) ||
            tkt.title_uz.toLowerCase().includes(ticketSearch.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Top Mock Exam Card (Ichki Nazorat Imtihoni) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-800 p-5 text-white shadow-md">
                <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-indigo-200 uppercase">
                            <Zap className="h-4 w-4 text-yellow-300" />
                            {t('tests.type_mock', 'Ichki Nazorat Imtihoni')}
                        </div>
                        <h3 className="text-lg font-extrabold text-white">
                            20 ta tasodifiy savol • 25 daqiqa
                        </h3>
                        <p className="text-xs text-indigo-100">
                            Kamida 18 ta to'g'ri javob (90%) guvohnoma olish uchun talab qilinadi.
                        </p>
                    </div>

                    <button
                        onClick={startMockExam}
                        className="group flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-indigo-700 shadow-md transition hover:bg-indigo-50 active:scale-95 shrink-0"
                    >
                        <Play className="h-4 w-4 fill-indigo-700" />
                        <span>{t('tests.start_attempt', 'Imtihonni Boshlash')}</span>
                    </button>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-border text-xs font-semibold">
                <button
                    onClick={() => setSubTab('tickets')}
                    className={cn(
                        'pb-2.5 px-3 border-b-2 transition-colors',
                        subTab === 'tickets' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    {t('tests.tab_tickets', '130 ta Biletlar')} ({tickets.length})
                </button>
                <button
                    onClick={() => {
                        setSubTab('signs');
                        if (signCategories.length === 0) fetchSigns();
                    }}
                    className={cn(
                        'pb-2.5 px-3 border-b-2 transition-colors',
                        subTab === 'signs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    {t('tests.tab_signs', 'Yo\'l belgilari & Chiziqlari')}
                </button>
                <button
                    onClick={() => setSubTab('history')}
                    className={cn(
                        'pb-2.5 px-3 border-b-2 transition-colors',
                        subTab === 'history' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    {t('tests.tab_attempts', 'Natijalar tarixi')} ({stats?.total_attempts || 0})
                </button>
            </div>

            {/* TAB 1: TICKETS (Exact 2-column mobile layout like ActiveTicketTable.tsx) */}
            {subTab === 'tickets' && (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={ticketSearch}
                            onChange={(e) => setTicketSearch(e.target.value)}
                            placeholder={t('tests.search_ticket_placeholder', 'Bilet raqami (1-130)...')}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Grid of tickets: 2 columns on mobile */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-0.5">
                        {filteredTickets.map((tkt) => (
                            <div
                                key={tkt.id}
                                onClick={() => setSelectedTicketForModal(tkt)}
                                className="group relative flex flex-col overflow-hidden rounded-[20px] bg-card p-3 shadow-xs border-2 border-emerald-500/50 cursor-pointer transition-all hover:shadow-md hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-500/70"
                                role="button"
                            >
                                <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20" />

                                <div className="relative z-10 mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-sm font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
                                        <Layers className="h-3.5 w-3.5" />
                                        {tkt.title_uz || `Bilet ${tkt.ticket_number}`}
                                    </div>
                                    <div className="flex shrink-0 items-center justify-center rounded-full p-1 bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    </div>
                                </div>

                                <div className="relative z-10 mt-auto flex items-center gap-1.5">
                                    <div className="flex flex-1 items-center gap-1 rounded-lg bg-muted/50 px-2 py-1">
                                        <ClipboardList className="h-3 w-3 text-blue-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase">{t('tests.questions_unit', 'Savol')}</span>
                                            <span className="text-xs font-bold">{tkt.questions_count || 10}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 items-center gap-1 rounded-lg bg-muted/50 px-2 py-1">
                                        <Play className="h-3 w-3 text-orange-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase">{t('tests.stats_attempts', 'Urinish')}</span>
                                            <span className="text-xs font-bold">{tkt.attempts_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: SIGNS & ROAD LINES */}
            {subTab === 'signs' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            onClick={() => setSelectedSignCategory('all')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                selectedSignCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                        >
                            {t('tests.all_signs', 'Barchasi')}
                        </button>
                        {signCategories.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedSignCategory(c.id)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    selectedSignCategory === c.id ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                {c.name_uz}
                            </button>
                        ))}
                        <button
                            onClick={() => setSelectedSignCategory('lines')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                selectedSignCategory === 'lines' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                        >
                            {t('tests.road_lines_category', 'Yo\'l chiziqlari')}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {selectedSignCategory === 'lines'
                            ? roadLines.map((line) => (
                                  <div
                                      key={line.id}
                                      onClick={() => setSelectedSignModal(line)}
                                      className="bg-card p-3 rounded-2xl border border-border flex flex-col items-center text-center shadow-xs cursor-pointer hover:border-blue-500"
                                  >
                                      {line.image_url ? (
                                          <img
                                              src={formatImageUrl(line.image_url) || ''}
                                              alt={line.name_uz}
                                              className="w-16 h-16 object-contain mb-2"
                                              loading="lazy"
                                          />
                                      ) : (
                                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground mb-2">
                                              —
                                          </div>
                                      )}
                                      <p className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-0.5">
                                          {line.line_number}
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
                                          onClick={() => setSelectedSignModal(sign)}
                                          className="bg-card p-3 rounded-2xl border border-border flex flex-col items-center text-center shadow-xs cursor-pointer hover:border-blue-500"
                                      >
                                          {sign.image_url ? (
                                              <img
                                                  src={formatImageUrl(sign.image_url) || ''}
                                                  alt={sign.name_uz}
                                                  className="w-16 h-16 object-contain mb-2"
                                                  loading="lazy"
                                              />
                                          ) : (
                                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground mb-2">
                                                  —
                                              </div>
                                          )}
                                          <p className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-0.5">
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

            {/* TAB 3: ATTEMPTS HISTORY */}
            {subTab === 'history' && (
                <div className="space-y-3">
                    {stats?.recent_attempts && stats.recent_attempts.length > 0 ? (
                        <div className="space-y-2">
                            {stats.recent_attempts.map((att: any) => (
                                <div
                                    key={att.id}
                                    className="p-3 bg-card border border-border rounded-xl flex items-center justify-between text-xs"
                                >
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-foreground">
                                            {att.attempt_type === 'random_mock'
                                                ? t('tests.type_mock', 'Ichki Nazorat Imtihoni')
                                                : att.ticket?.title_uz || `Bilet #${att.ticket_id}`}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(att.created_at).toLocaleString('uz-UZ')} • {Math.floor(att.duration_seconds / 60)} daq
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                                                att.is_passed
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                            )}
                                        >
                                            {att.is_passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {Number(att.score_percentage).toFixed(0)}%
                                        </span>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {att.correct_answers} / {att.total_questions}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground text-xs">
                            {t('tests.no_attempts', 'Hech qanday imtihon natijalari topilmadi')}
                        </div>
                    )}
                </div>
            )}

            {/* Start Attempt Modal (Exact panel.prava24.uz StartAttemptModal) */}
            <Dialog open={!!selectedTicketForModal} onOpenChange={(open) => !open && setSelectedTicketForModal(null)}>
                <DialogContent className="max-w-sm overflow-hidden p-0 border-none shadow-2xl rounded-2xl">
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-800 p-6 text-white">
                        <div className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                        <DialogClose asChild>
                            <button className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 active:scale-90">
                                <X className="h-4 w-4" />
                            </button>
                        </DialogClose>
                        <div className="relative z-10">
                            <div className="mb-1 flex items-center gap-2">
                                <Zap className="h-5 w-5 text-yellow-300" />
                                <span className="text-xs font-black tracking-widest text-indigo-200 uppercase">
                                    {t('tests.ticket_details', 'Bilet tafsilotlari')}
                                </span>
                            </div>
                            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                                {selectedTicketForModal?.title_uz || `Bilet ${selectedTicketForModal?.ticket_number}`}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-xs text-indigo-100">
                                Ushbu bilet bo'yicha 10 ta test savolini yechishni boshlaysizmi?
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="p-6 bg-card space-y-4">
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3 rounded-xl bg-blue-50/50 p-3 ring-1 ring-blue-100 dark:bg-blue-900/10 dark:ring-blue-900/20">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500/70">
                                        {t('tests.questions_unit', 'Savollar soni')}
                                    </p>
                                    <p className="text-sm font-bold text-foreground">
                                        {selectedTicketForModal?.questions_count || 10} {t('tests.tickets_count', 'ta')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <DialogClose asChild>
                                <button
                                    type="button"
                                    className="flex-1 rounded-xl border border-border bg-muted py-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted/80 active:scale-[0.98]"
                                >
                                    {t('common.cancel', 'Bekor qilish')}
                                </button>
                            </DialogClose>
                            <button
                                type="button"
                                onClick={() => selectedTicketForModal && startTicketExam(selectedTicketForModal)}
                                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 py-3 text-xs font-black text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-violet-600 active:scale-[0.98]"
                            >
                                {t('tests.start_attempt', 'Boshlash')}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sign / Line Detail Modal */}
            <Dialog open={!!selectedSignModal} onOpenChange={(open) => !open && setSelectedSignModal(null)}>
                <DialogContent className="max-w-sm rounded-2xl bg-card p-5">
                    {selectedSignModal && (
                        <div className="text-center space-y-3">
                            {selectedSignModal.image_url && (
                                <img
                                    src={formatImageUrl(selectedSignModal.image_url) || ''}
                                    alt={selectedSignModal.name_uz}
                                    className="w-24 h-24 object-contain mx-auto"
                                />
                            )}
                            <DialogTitle className="text-base font-bold text-foreground">
                                {selectedSignModal.sign_number || selectedSignModal.line_number} — {selectedSignModal.name_uz}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                                {selectedSignModal.description_uz || t('tests.no_description_available', 'Ushbu belgi uchun izoh kiritilmagan')}
                            </DialogDescription>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
