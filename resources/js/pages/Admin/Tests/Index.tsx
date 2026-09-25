import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    HelpCircle,
    RotateCcw,
    Search,
    ShieldAlert,
    XCircle,
    Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Pagination from '@/components/pagination';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
    questions_count?: number;
}

interface SignCategory {
    id: number;
    name_uz: string;
    name_ru?: string;
    slug: string;
    signs: Array<{
        id: number;
        sign_number: string;
        name_uz: string;
        description_uz?: string;
        image_url?: string;
    }>;
}

interface RoadLine {
    id: number;
    number: string;
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
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language || 'uz';

    const [activeTab, setActiveTab] = useState<'attempts' | 'tickets' | 'signs'>('attempts');
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');

    // Ticket inspection modal state
    const [inspectingTicket, setInspectingTicket] = useState<Ticket | null>(null);
    const [ticketQuestions, setTicketQuestions] = useState<any[]>([]);
    const [loadingTicketQuestions, setLoadingTicketQuestions] = useState(false);

    // Signs category filter
    const [selectedSignCategory, setSelectedSignCategory] = useState<number | 'lines' | 'all'>('all');
    const [ticketSearch, setTicketSearch] = useState('');

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
            const res = await fetch(`/api/prava24/ticket/${ticket.id}`);
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
            <Head title={t('tests.page_title', 'Prava24 Testlar & Imtihonlar')} />

            {/* Header: Title and primary actions inline */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t('tests.page_title', 'Prava24 Testlar & Imtihonlar')}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
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
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {t('tests.stats_tickets', 'Jami Biletlar')}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.total_tickets}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">130 ta bilet</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {t('tests.stats_questions', 'Jami Savollar')}
                    </p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {stats.total_questions.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">4 tilda to'liq baza</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {t('tests.stats_signs', 'Belgi & Chiziqlar')}
                    </p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {stats.total_signs + roadLines.length}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">259 belgi + 22 chiziq</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {t('tests.stats_attempts', 'Topshirilgan Testlar')}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.total_attempts.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        {t('tests.stats_passed_count', 'O\'tganlar')}: {stats.passed_attempts}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {t('tests.stats_pass_rate', 'O\'tish Ko\'rsatkichi')}
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {passRate}%
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">kamida 18/20 (90%)</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('attempts')}
                    className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === 'attempts'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    {t('tests.tab_attempts', 'O\'quvchilar Imtihon Natijalari')} ({attempts.total})
                </button>
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === 'tickets'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    {t('tests.tab_tickets', '130 ta Biletlar va Savollar')} ({tickets.length})
                </button>
                <button
                    onClick={() => setActiveTab('signs')}
                    className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === 'signs'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    {t('tests.tab_signs', 'Yo\'l belgilari & Chiziqlari')} ({stats.total_signs + roadLines.length})
                </button>
            </div>

            {/* TAB 1: ATTEMPTS */}
            {activeTab === 'attempts' && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <form onSubmit={handleFilterSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('tests.search_student', 'Talaba F.I.O yoki telefoni...')}
                                className="pl-9 text-xs"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 outline-none"
                        >
                            <option value="">{t('tests.filter_all_status', 'Barcha natijalar')}</option>
                            <option value="passed">{t('tests.filter_passed', 'Faqat o\'tganlar')}</option>
                            <option value="failed">{t('tests.filter_failed', 'O\'tolmaganlar')}</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 outline-none"
                        >
                            <option value="">{t('tests.filter_all_types', 'Barcha turlar')}</option>
                            <option value="random_mock">{t('tests.type_mock', 'Ichki Nazorat Imtihoni')}</option>
                            <option value="ticket_exam">{t('tests.type_ticket', 'Bilet Mashg\'uloti')}</option>
                        </select>

                        <Button type="submit" size="sm" className="text-xs">
                            {t('common.filter', 'Filtrlash')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} className="text-xs">
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            {t('common.reset', 'Tozalash')}
                        </Button>
                    </form>

                    {/* Attempts Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="py-3 px-4">{t('tests.col_student', 'Talaba')}</th>
                                        <th className="py-3 px-4">{t('tests.col_branch', 'Filial')}</th>
                                        <th className="py-3 px-4">{t('tests.col_type', 'Imtihon Turi')}</th>
                                        <th className="py-3 px-4">{t('tests.col_score', 'Natija')}</th>
                                        <th className="py-3 px-4">{t('tests.col_duration', 'Vaqt')}</th>
                                        <th className="py-3 px-4">{t('tests.col_status', 'Holat')}</th>
                                        <th className="py-3 px-4">{t('tests.col_date', 'Sana')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {attempts.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-gray-400">
                                                {t('tests.no_attempts', 'Hech qanday imtihon natijalari topilmadi')}
                                            </td>
                                        </tr>
                                    ) : (
                                        attempts.data.map((att) => (
                                            <tr key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750">
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {att.student?.full_name || t('tests.guest_student', 'Mehmon O\'quvchi')}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400">
                                                        {att.student?.phone || '—'}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                                    {att.student?.branch?.name || '—'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {att.attempt_type === 'random_mock' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                            🎓 {t('tests.type_mock', 'Ichki Nazorat Imtihoni')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                            📄 {att.ticket?.title_uz || `${t('tests.ticket_prefix', 'Bilet')} #${att.ticket_id}`}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {att.correct_answers} / {att.total_questions} ({Number(att.score_percentage).toFixed(0)}%)
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">
                                                        {att.wrong_answers} {t('tests.wrong_count', 'ta xato')}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-gray-500">
                                                    {formatSeconds(att.duration_seconds)}
                                                </td>
                                                <td className="py-3 px-4">
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
                                                </td>
                                                <td className="py-3 px-4 text-gray-400 text-[11px]">
                                                    {new Date(att.created_at).toLocaleString('uz-UZ', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
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
                        <span className="text-xs text-gray-400">
                            {filteredTickets.length} / {tickets.length} {t('tests.tickets_count', 'ta bilet')}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {filteredTickets.map((tkt) => (
                            <div
                                key={tkt.id}
                                onClick={() => openTicketDetails(tkt)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600">
                                        #{tkt.ticket_number}
                                    </span>
                                    <Eye className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                                </div>
                                <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    {tkt.questions_count || 10} {t('tests.questions_unit', 'savol')}
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
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedSignCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedSignCategory === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            {t('tests.all_signs', 'Barchasi')} ({stats.total_signs + roadLines.length})
                        </button>

                        {signCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedSignCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    selectedSignCategory === cat.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                {cat.name_uz} ({cat.signs?.length || 0})
                            </button>
                        ))}

                        <button
                            onClick={() => setSelectedSignCategory('lines')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedSignCategory === 'lines'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            {t('tests.road_lines_category', 'Yo\'l chiziqlari')} ({roadLines.length})
                        </button>
                    </div>

                    {/* Signs Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {selectedSignCategory === 'lines'
                            ? roadLines.map((line) => (
                                  <div
                                      key={line.id}
                                      className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center shadow-xs"
                                  >
                                      {line.image_url ? (
                                          <img
                                              src={line.image_url}
                                              alt={line.name_uz}
                                              className="w-16 h-16 object-contain mb-2"
                                              loading="lazy"
                                          />
                                      ) : (
                                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 mb-2">
                                              —
                                          </div>
                                      )}
                                      <p className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-1">
                                          {line.number}
                                      </p>
                                      <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
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
                                          className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-shadow"
                                      >
                                          {sign.image_url ? (
                                              <img
                                                  src={sign.image_url}
                                                  alt={sign.name_uz}
                                                  className="w-16 h-16 object-contain mb-2"
                                                  loading="lazy"
                                              />
                                          ) : (
                                              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 mb-2">
                                                  —
                                              </div>
                                          )}
                                          <p className="font-bold text-[11px] text-blue-600 dark:text-blue-400 mb-0.5">
                                              {sign.sign_number}
                                          </p>
                                          <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                                              {sign.name_uz}
                                          </p>
                                      </div>
                                  ))}
                    </div>
                </div>
            )}

            {/* Ticket Questions Modal Dialog */}
            <Dialog open={!!inspectingTicket} onOpenChange={(open) => !open && setInspectingTicket(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            {inspectingTicket?.title_uz || `${t('tests.ticket_prefix', 'Bilet')} #${inspectingTicket?.ticket_number}`} ({t('tests.ticket_modal_title', 'Savollar va Javoblar')})
                        </DialogTitle>
                    </DialogHeader>

                    {loadingTicketQuestions ? (
                        <div className="py-12 text-center text-gray-400">
                            {t('common.loading', 'Yuklanmoqda...')}
                        </div>
                    ) : ticketQuestions.length === 0 ? (
                        <div className="py-8 text-center text-gray-400">
                            {t('tests.no_questions_in_ticket', 'Ushbu biletda savollar topilmadi')}
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {ticketQuestions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-850 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                {idx + 1}
                                            </span>
                                            <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                                                {q.question_uz}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Question Image if present */}
                                    {q.image_url && (
                                        <div className="flex justify-center bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                            <img
                                                src={q.image_url}
                                                alt={`Savol ${idx + 1}`}
                                                className="max-h-48 max-w-full rounded object-contain"
                                                loading="lazy"
                                            />
                                        </div>
                                    )}

                                    {/* Answer Options */}
                                    <div className="space-y-1.5">
                                        {q.answers?.map((ans: any, aIdx: number) => (
                                            <div
                                                key={ans.id}
                                                className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                                                    ans.is_correct
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-semibold'
                                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <span>
                                                    <strong className="mr-2 font-mono">
                                                        {String.fromCharCode(65 + aIdx)}.
                                                    </strong>
                                                    {ans.answer_uz}
                                                </span>
                                                {ans.is_correct && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white ml-2 shrink-0">
                                                        {t('tests.correct_answer_badge', 'To\'g\'ri javob')}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Explanation */}
                                    {q.description_uz && (
                                        <div className="text-[11px] p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900/50">
                                            <span className="font-bold mr-1">💡 {t('tests.explanation', 'Qoidalar bo\'yicha izoh')}:</span>
                                            {q.description_uz}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
