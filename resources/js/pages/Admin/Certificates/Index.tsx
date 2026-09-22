import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Award,
    Download,
    CheckCircle2,
    XCircle,
    Search,
    QrCode,
    GraduationCap,
    ExternalLink,
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
    };
    candidates: Candidate[];
    branches: Array<{ id: number; name: string }>;
    filters: {
        search?: string;
        branch_id?: string | number;
    };
}

export default function CertificatesIndex({
    certificates,
    candidates,
    filters,
}: PageProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    const form = useForm({
        contract_id: '',
        notes: '',
    });

    const handleIssueSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCandidate) return;

        form.post('/admin/certificates', {
            onSuccess: () => {
                setShowModal(false);
                setSelectedCandidate(null);
                toast.success(t('certificates.issued_success', 'Bitiruv guvohnomasi rasmiylashtirildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    return (
        <div className="p-6">
            <Head title={t('certificates.title', 'Bitiruv Guvohnomalari')} />

            {/* Page Title & Action */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('certificates.title', 'Bitiruv Guvohnomalari')}</h1>
                <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                    <Plus className="w-4 h-4 mr-1.5" />
                    {t('certificates.issue_button', 'Guvohnoma Berish')}
                </Button>
            </div>

            {/* Certificates Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="p-3.5 font-semibold">{t('certificates.number', 'Guvohnoma №')}</th>
                                <th className="p-3.5 font-semibold">{t('certificates.student', 'Bitiruvchi')}</th>
                                <th className="p-3.5 font-semibold">{t('certificates.category', 'Toifa')}</th>
                                <th className="p-3.5 font-semibold">{t('certificates.contract', 'Shartnoma')}</th>
                                <th className="p-3.5 font-semibold">{t('certificates.branch', 'Filial')}</th>
                                <th className="p-3.5 font-semibold">{t('certificates.issued_date', 'Berilgan sana')}</th>
                                <th className="p-3.5 font-semibold">{t('certificates.issued_by', 'Rasmiylashtirdi')}</th>
                                <th className="p-3.5 font-semibold text-right">{t('common.actions', 'Amallar')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {certificates.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">
                                        {t('certificates.no_certificates', 'Guvohnomalar topilmadi')}
                                    </td>
                                </tr>
                            ) : (
                                certificates.data.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-gray-50/50">
                                        <td className="p-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <Award className="w-4 h-4 text-amber-500" />
                                            #{cert.certificate_number}
                                        </td>
                                        <td className="p-3.5 font-medium">{cert.student?.full_name}</td>
                                        <td className="p-3.5">
                                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold">
                                                {cert.category}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-gray-500">#{cert.contract?.contract_number}</td>
                                        <td className="p-3.5 text-gray-500">{cert.branch?.name || '-'}</td>
                                        <td className="p-3.5 text-gray-600">{cert.issued_date}</td>
                                        <td className="p-3.5 text-gray-500">{cert.issued_by?.name || '-'}</td>
                                        <td className="p-3.5 text-right space-x-1">
                                            <a
                                                href={`/admin/certificates/${cert.id}/download-pdf`}
                                                className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1" />
                                                PDF
                                            </a>
                                            <a
                                                href={`/certificates/verify/${cert.qr_verify_hash}`}
                                                className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Issue Certificate Modal with 4-Conditions Checklist */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('certificates.issue_modal_title', 'Bitiruv Guvohnomasini Rasmiylashtirish (4 Ta Shart)')}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 text-xs">
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('certificates.conditions_desc', 'Guvohnoma berilishi uchun talaba 4 ta shartni to\'liq bajargan bo\'lishi shart (qarz 0, davomat >= 70%, haydash darslari to\'liq, imtihon topshirilgan).')}
                        </p>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                            {candidates.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                    {t('certificates.no_candidates', 'Hozirda shartnoma talablarini bajargan bitiruvchilar mavjud emas.')}
                                </div>
                            ) : (
                                candidates.map((cand) => (
                                    <div
                                        key={cand.contract_id}
                                        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                            selectedCandidate?.contract_id === cand.contract_id ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                                        }`}
                                    >
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{cand.student_name}</h4>
                                            <p className="text-gray-500 text-[11px] mt-0.5">
                                                #{cand.contract_number} &bull; {cand.category} toifa &bull; {cand.phone}
                                            </p>

                                            {/* 4 Conditions Badges */}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                                    cand.debt_ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {cand.debt_ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {cand.debt_ok ? 'Qarz yo\'q (0 UZS)' : `Qarz: ${Number(cand.debt_amount).toLocaleString('uz-UZ')}`}
                                                </span>

                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                                    cand.attendance_ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {cand.attendance_ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    Davomat: {cand.attendance_rate}%
                                                </span>

                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                                    cand.driving_ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {cand.driving_ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    Haydash: {cand.completed_drivings}/{cand.required_drivings}
                                                </span>

                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                                    cand.passed_exam ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                    {cand.passed_exam ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    Imtihon: {cand.passed_exam ? 'O\'tdi' : 'Topshirmagan'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <Button
                                                size="sm"
                                                disabled={!cand.is_eligible}
                                                onClick={() => {
                                                    setSelectedCandidate(cand);
                                                    form.setData('contract_id', String(cand.contract_id));
                                                }}
                                                className={`text-xs ${
                                                    cand.is_eligible
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                        : 'opacity-50 cursor-not-allowed'
                                                }`}
                                            >
                                                <Award className="w-3.5 h-3.5 mr-1" />
                                                {t('certificates.select_and_issue', 'Guvohnoma Berish')}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {selectedCandidate && (
                            <form onSubmit={handleIssueSubmit} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 space-y-3 pt-3 border border-gray-200 dark:border-gray-600">
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                                    {selectedCandidate.student_name} ga guvohnoma chiqarishni tasdiqlang:
                                </h4>
                                <div>
                                    <Label htmlFor="cert_notes">{t('certificates.notes', 'Qo\'shimcha izoh')}</Label>
                                    <Input
                                        id="cert_notes"
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setSelectedCandidate(null)}>
                                        {t('common.cancel', 'Bekor qilish')}
                                    </Button>
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={form.processing}>
                                        <Award className="w-4 h-4 mr-1.5" />
                                        {t('certificates.confirm_issue', 'Rasmiy Guvohnoma Chop Etish')}
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
