import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, FileText } from 'lucide-react';
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

interface ContractType {
    id: number;
    name: string;
    category: string;
    price: string | number;
    has_theory: boolean;
    has_driving: boolean;
    has_lms: boolean;
    required_driving_lessons: number;
    required_theory_lessons: number;
    min_theory_payment_percent: number;
    description?: string;
    is_active: boolean;
}

interface PageProps {
    contractTypes: {
        data: ContractType[];
        links: any[];
        total: number;
    };
    branches: Array<{ id: number; name: string }>;
}

export default function ContractTypesIndex({ contractTypes, branches }: PageProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState<ContractType | null>(null);

    const form = useForm({
        name: '',
        category: 'B',
        price: '',
        has_theory: true,
        has_driving: true,
        has_lms: true,
        required_driving_lessons: 10,
        required_theory_lessons: 24,
        min_theory_payment_percent: 30,
        description: '',
        is_active: true,
    });

    const openCreate = () => {
        setEditingType(null);
        form.reset();
        setShowModal(true);
    };

    const openEdit = (ct: ContractType) => {
        setEditingType(ct);
        form.setData({
            name: ct.name,
            category: ct.category,
            price: String(ct.price),
            has_theory: Boolean(ct.has_theory),
            has_driving: Boolean(ct.has_driving),
            has_lms: Boolean(ct.has_lms),
            required_driving_lessons: ct.required_driving_lessons,
            required_theory_lessons: ct.required_theory_lessons,
            min_theory_payment_percent: ct.min_theory_payment_percent,
            description: ct.description || '',
            is_active: Boolean(ct.is_active),
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingType) {
            form.put(`/admin/contract-types/${editingType.id}`, {
                onSuccess: () => {
                    setShowModal(false);
                    toast.success(t('contract_types.updated', 'Tarif muvaffaqiyatli yangilandi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        } else {
            form.post('/admin/contract-types', {
                onSuccess: () => {
                    setShowModal(false);
                    form.reset();
                    toast.success(t('contract_types.created', 'Tarif muvaffaqiyatli yaratildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleDelete = (ct: ContractType) => {
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/contract-types/${ct.id}`, {
                onSuccess: () => toast.success(t('common.deleted', 'O\'chirildi')),
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    return (
        <div className="p-6">
            <Head title={t('contract_types.title', 'Shartnoma Tariflari')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('contract_types.title', 'Shartnoma Tariflari')}</h1>
                <Button onClick={openCreate} size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                    <Plus className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{t('common.add', 'Qo\'shish')}</span>
                </Button>
            </div>

            {/* Contract Types Grid / Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contractTypes.data.map((ct) => (
                    <div
                        key={ct.id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs">
                                    {ct.category} toifa
                                </span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full ${ct.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {ct.is_active ? t('common.active', 'Faol') : t('common.inactive', 'Nofaol')}
                                </span>
                            </div>

                            <h3 className="font-bold text-base text-gray-900 dark:text-white">{ct.name}</h3>
                            <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-2">
                                {Number(ct.price).toLocaleString('uz-UZ')} <span className="text-xs font-normal text-gray-500">UZS</span>
                            </p>

                            {ct.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{ct.description}</p>
                            )}

                            {/* Modules Checklist */}
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span>{t('contracts.has_theory', 'Nazariya')}:</span>
                                    <span className="font-semibold">{ct.has_theory ? `Ha (${ct.required_theory_lessons} dars)` : 'Yo\'q'}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span>{t('contracts.has_driving', 'Amaliy haydash')}:</span>
                                    <span className="font-semibold">{ct.has_driving ? `Ha (${ct.required_driving_lessons} dars)` : 'Yo\'q'}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span>{t('contracts.has_lms', 'LMS Testlar')}:</span>
                                    <span className="font-semibold">{ct.has_lms ? 'Ha' : 'Yo\'q'}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span>{t('contract_types.min_payment', 'Minimal to\'lov')}:</span>
                                    <span className="font-semibold">{ct.min_theory_payment_percent}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(ct)} className="h-8 text-xs">
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                {t('common.edit', 'Tahrirlash')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(ct)} className="h-8 text-xs text-red-500 hover:text-red-700">
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingType ? t('contract_types.edit_title', 'Tarifni Tahrirlash') : t('contract_types.create_title', 'Yangi Tarif Yaratish')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="name">{t('contract_types.name', 'Tarif Nomi')}</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Standart B toifa"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="category">{t('contract_types.category', 'Toifa')}</Label>
                                <select
                                    id="category"
                                    value={form.data.category}
                                    onChange={(e) => form.setData('category', e.target.value)}
                                    className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs mt-1"
                                >
                                    <option value="B">B toifa</option>
                                    <option value="A">A toifa</option>
                                    <option value="C">C toifa</option>
                                    <option value="BC">BC toifa</option>
                                    <option value="D">D toifa</option>
                                    <option value="E">E toifa</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="price">{t('contract_types.price', 'Narx (UZS)')}</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={form.data.price}
                                    onChange={(e) => form.setData('price', e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="min_pct">{t('contract_types.min_theory_pct', 'Darsga minimal to\'lov (%)')}</Label>
                                <Input
                                    id="min_pct"
                                    type="number"
                                    value={form.data.min_theory_payment_percent}
                                    onChange={(e) => form.setData('min_theory_payment_percent', Number(e.target.value))}
                                    min={0}
                                    max={100}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="theory_lessons">{t('contract_types.theory_count', 'Nazariya Darslari Soni')}</Label>
                                <Input
                                    id="theory_lessons"
                                    type="number"
                                    value={form.data.required_theory_lessons}
                                    onChange={(e) => form.setData('required_theory_lessons', Number(e.target.value))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="driving_lessons">{t('contract_types.driving_count', 'Vajdeniya Darslari Soni')}</Label>
                                <Input
                                    id="driving_lessons"
                                    type="number"
                                    value={form.data.required_driving_lessons}
                                    onChange={(e) => form.setData('required_driving_lessons', Number(e.target.value))}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Module Checkboxes */}
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 space-y-2">
                            <span className="font-semibold block mb-1">{t('contract_types.included_modules', 'Kiritilgan Modullar')}:</span>
                            <div className="grid grid-cols-3 gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_theory}
                                        onChange={(e) => form.setData('has_theory', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{t('contracts.has_theory', 'Nazariya')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_driving}
                                        onChange={(e) => form.setData('has_driving', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{t('contracts.has_driving', 'Vajdeniya')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_lms}
                                        onChange={(e) => form.setData('has_lms', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{t('contracts.has_lms', 'LMS Testlar')}</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
