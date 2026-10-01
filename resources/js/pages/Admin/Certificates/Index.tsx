import { Head, useForm, router } from '@inertiajs/react';
import {
    Plus,
    Award,
    Download,
    CheckCircle2,
    XCircle,
    QrCode,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFilterBar, PageFilterSearch } from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { useCan } from '@/hooks/use-can';
import { formatDate, formatMoney } from '@/lib/utils';

interface Certificate {
    id: number;
    certificate_number: string;
    qr_verify_hash: string;
    category: string;
    issued_date: string;
    status: string;
    student?: { full_name: string; phone: string };
    contract?: { contract_number: string; contract_type?: { name: string } };
    branch?: { name: string };
    issued_by?: { name: string };
}

interface Candidate {
    student_id: number;
    student_name: string;
    phone: string;
    contract_id: number;
    contract_number: string;
    category: string;
    debt_amount: number | string;
    debt_ok: boolean;
    attendance_rate: number;
    attendance_ok: boolean;
    completed_drivings: number;
    required_drivings: number;
    driving_ok: boolean;
    passed_exam: boolean;
    is_eligible: boolean;
}

interface PageProps {
    certificates: {
        data: Certificate[];
        links: any[];
        total: number;
        from?: number;
        to?: number;
    };
    candidates: Candidate[];
    branches: Array<{ id: number; name: string }>;
    filters: {
        search?: string;
        branch_id?: string | number;
        per_page?: string;
    };
}

export default function CertificatesIndex({
    certificates,
    candidates,
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const [showModal, setShowModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] =
        useState<Candidate | null>(null);
    const [search, setSearch] = useState(filters?.search || '');
    const [perPage, setPerPage] = useState<string>(filters?.per_page || '15');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/certificates',
            {
                ...filters,
                search: search || undefined,
                per_page: perPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handlePerPageChange = (newPerPage: string) => {
        setPerPage(newPerPage);
        router.get(
            '/admin/certificates',
            {
                ...filters,
                search: search || undefined,
                per_page: newPerPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const form = useForm({
        contract_id: '',
        notes: '',
    });

    const handleIssueSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCandidate) {
            return;
        }

        form.post('/admin/certificates', {
            onSuccess: () => {
                setShowModal(false);
                setSelectedCandidate(null);
                toast.success(
                    t(
                        'certificates.issued_success',
                        'Bitiruv guvohnomasi rasmiylashtirildi',
                    ),
                );
            },
            onError: (err) =>
                toast.error(
                    (Object.values(err)[0] as string) ||
                        t('common.error', 'Xatolik yuz berdi'),
                ),
        });
    };

    return (
        <div className="p-6">
            <Head title={t('certificates.title', 'Bitiruv Guvohnomalari')} />

            {/* Page Title & Action */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('certificates.title', 'Bitiruv Guvohnomalari')}
                </h1>
                {can('certificates.create') && (
                    <Button
                        onClick={() => setShowModal(true)}
                        variant="brand"
                        className="text-xs"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t('certificates.issue_button', 'Guvohnoma Berish')}
                    </Button>
                )}
            </div>

            {/* Filter Toolbar */}
            <PageFilterBar className="mb-6">
                <div className="flex-1" />
                <PageFilterSearch
                    value={search}
                    onChange={setSearch}
                    onSubmit={handleSearch}
                    placeholder={t('common.search', 'Qidirish...')}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                />
            </PageFilterBar>

            {/* Certificates Table / Desktop & Tablet */}
            <div className="mb-4 hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs md:block dark:border-gray-700 dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {t('certificates.number', 'Guvohnoma №')}
                                </TableHead>
                                <TableHead>
                                    {t('certificates.student', 'Bitiruvchi')}
                                </TableHead>
                                <TableHead>
                                    {t('certificates.category', 'Toifa')}
                                </TableHead>
                                <TableHead>
                                    {t('certificates.contract', 'Shartnoma')}
                                </TableHead>
                                <TableHead>
                                    {t('certificates.branch', 'Filial')}
                                </TableHead>
                                <TableHead>
                                    {t(
                                        'certificates.issued_date',
                                        'Berilgan sana',
                                    )}
                                </TableHead>
                                <TableHead>
                                    {t(
                                        'certificates.issued_by',
                                        'Rasmiylashtirdi',
                                    )}
                                </TableHead>
                                <TableHead className="text-right">
                                    {t('common.actions', 'Amallar')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {certificates.data.length === 0 ? (
                                <TableEmpty
                                    colSpan={8}
                                    icon={Award}
                                    title={t(
                                        'certificates.no_certificates',
                                        'Guvohnomalar topilmadi',
                                    )}
                                />
                            ) : (
                                certificates.data.map((cert) => (
                                    <TableRow key={cert.id}>
                                        <TableCell className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                                            <Award className="h-4 w-4 text-amber-500" />
                                            #{cert.certificate_number}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {cert.student?.full_name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                                {cert.category}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">
                                            #{cert.contract?.contract_number}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">
                                            {cert.branch?.name || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-300">
                                            {formatDate(cert.issued_date)}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">
                                            {cert.issued_by?.name || '-'}
                                        </TableCell>
                                        <TableCell className="space-x-1 text-right">
                                            {can('certificates.print') && (
                                                <a
                                                    href={`/admin/certificates/${cert.id}/download-pdf`}
                                                    className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Download className="mr-1 h-3.5 w-3.5" />
                                                    PDF
                                                </a>
                                            )}
                                            <a
                                                href={`/certificates/verify/${cert.qr_verify_hash}`}
                                                className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <QrCode className="h-3.5 w-3.5" />
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Certificates Mobile Cards Feed */}
            <div className="mb-4 space-y-3 md:hidden">
                {certificates.data.length === 0 ? (
                    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-xs">
                        {t(
                            'certificates.no_certificates',
                            'Guvohnomalar topilmadi',
                        )}
                    </div>
                ) : (
                    certificates.data.map((cert) => (
                        <div
                            key={cert.id}
                            className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
                        >
                            {/* Header: Cert # + Category */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                                        <Award className="h-4 w-4 shrink-0 text-amber-500" />
                                        <span>#{cert.certificate_number}</span>
                                    </div>
                                    <div className="mt-0.5 text-xs font-medium">
                                        {cert.student?.full_name}
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                    {cert.category}{' '}
                                    {t(
                                        'contract_types.category_suffix',
                                        'toifa',
                                    )}
                                </span>
                            </div>

                            {/* Contract & Branch */}
                            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {t(
                                            'certificates.contract',
                                            'Shartnoma',
                                        )}
                                        :
                                    </span>
                                    <span className="font-mono text-muted-foreground">
                                        #{cert.contract?.contract_number}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {t('certificates.branch', 'Filial')}:
                                    </span>
                                    <span>{cert.branch?.name || '-'}</span>
                                </div>
                            </div>

                            {/* Footer: Date & Download Actions */}
                            <div className="flex items-center justify-between border-t pt-2 text-xs">
                                <span className="font-mono text-[11px] text-muted-foreground">
                                    {formatDate(cert.issued_date)}
                                </span>
                                <div className="flex items-center gap-2">
                                    {can('certificates.print') && (
                                        <a
                                            href={`/admin/certificates/${cert.id}/download-pdf`}
                                            className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Download className="mr-1 h-3.5 w-3.5" />
                                            PDF
                                        </a>
                                    )}
                                    <a
                                        href={`/certificates/verify/${cert.qr_verify_hash}`}
                                        className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <QrCode className="mr-1 h-3.5 w-3.5" />
                                        QR
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <Pagination
                links={certificates.links}
                total={certificates.total}
                from={certificates.from}
                to={certificates.to}
            />

            {/* Issue Certificate Modal with 4-Conditions Checklist */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-h-[85vh] w-[95vw] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-500" />
                            {t(
                                'certificates.issue_modal_title',
                                'Bitiruv Guvohnomasini Rasmiylashtirish (4 Ta Shart)',
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 text-xs">
                        <p className="text-gray-500 dark:text-gray-400">
                            {t(
                                'certificates.conditions_desc',
                                "Guvohnoma berilishi uchun talaba 4 ta shartni to'liq bajargan bo'lishi shart (qarz 0, davomat >= 70%, haydash darslari to'liq, imtihon topshirilgan).",
                            )}
                        </p>

                        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 dark:divide-gray-700 dark:border-gray-700">
                            {candidates.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                    {t(
                                        'certificates.no_candidates',
                                        'Hozirda shartnoma talablarini bajargan bitiruvchilar mavjud emas.',
                                    )}
                                </div>
                            ) : (
                                candidates.map((cand) => (
                                    <div
                                        key={cand.contract_id}
                                        className={`flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center ${
                                            selectedCandidate?.contract_id ===
                                            cand.contract_id
                                                ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                                : ''
                                        }`}
                                    >
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                                {cand.student_name}
                                            </h4>
                                            <p className="mt-0.5 text-[11px] text-gray-500">
                                                #{cand.contract_number} &bull;{' '}
                                                {cand.category} toifa &bull;{' '}
                                                {cand.phone}
                                            </p>

                                            {/* 4 Conditions Badges */}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                                        cand.debt_ok
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-red-200 bg-red-50 text-red-700'
                                                    }`}
                                                >
                                                    {cand.debt_ok ? (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    ) : (
                                                        <XCircle className="h-3 w-3" />
                                                    )}
                                                    {cand.debt_ok
                                                        ? "Qarz yo'q (0 UZS)"
                                                        : `Qarz: ${formatMoney(cand.debt_amount)}`}
                                                </span>

                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                                        cand.attendance_ok
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-red-200 bg-red-50 text-red-700'
                                                    }`}
                                                >
                                                    {cand.attendance_ok ? (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    ) : (
                                                        <XCircle className="h-3 w-3" />
                                                    )}
                                                    Davomat:{' '}
                                                    {cand.attendance_rate}%
                                                </span>

                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                                        cand.driving_ok
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-red-200 bg-red-50 text-red-700'
                                                    }`}
                                                >
                                                    {cand.driving_ok ? (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    ) : (
                                                        <XCircle className="h-3 w-3" />
                                                    )}
                                                    Haydash:{' '}
                                                    {cand.completed_drivings}/
                                                    {cand.required_drivings}
                                                </span>

                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                                        cand.passed_exam
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-red-200 bg-red-50 text-red-700'
                                                    }`}
                                                >
                                                    {cand.passed_exam ? (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    ) : (
                                                        <XCircle className="h-3 w-3" />
                                                    )}
                                                    Imtihon:{' '}
                                                    {cand.passed_exam
                                                        ? "O'tdi"
                                                        : 'Topshirmagan'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            {can('certificates.create') && (
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        cand.is_eligible
                                                            ? 'brand'
                                                            : 'outline'
                                                    }
                                                    disabled={!cand.is_eligible}
                                                    onClick={() => {
                                                        setSelectedCandidate(
                                                            cand,
                                                        );
                                                        form.setData(
                                                            'contract_id',
                                                            String(
                                                                cand.contract_id,
                                                            ),
                                                        );
                                                    }}
                                                    className={`text-xs ${
                                                        !cand.is_eligible
                                                            ? 'cursor-not-allowed opacity-50'
                                                            : ''
                                                    }`}
                                                >
                                                    <Award className="mr-1 h-3.5 w-3.5" />
                                                    {t(
                                                        'certificates.select_and_issue',
                                                        'Guvohnoma Berish',
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {selectedCandidate && (
                            <form
                                onSubmit={handleIssueSubmit}
                                className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 pt-3 dark:border-gray-600 dark:bg-gray-700/50"
                            >
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                    {selectedCandidate.student_name} ga
                                    guvohnoma chiqarishni tasdiqlang:
                                </h4>
                                <div>
                                    <Label htmlFor="cert_notes">
                                        {t(
                                            'certificates.notes',
                                            "Qo'shimcha izoh",
                                        )}
                                    </Label>
                                    <Input
                                        id="cert_notes"
                                        value={form.data.notes}
                                        onChange={(e) =>
                                            form.setData(
                                                'notes',
                                                e.target.value,
                                            )
                                        }
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setSelectedCandidate(null)
                                        }
                                    >
                                        {t('common.cancel', 'Bekor qilish')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        disabled={form.processing}
                                    >
                                        <Award className="mr-1.5 h-4 w-4" />
                                        {t(
                                            'certificates.confirm_issue',
                                            'Rasmiy Guvohnoma Chop Etish',
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
