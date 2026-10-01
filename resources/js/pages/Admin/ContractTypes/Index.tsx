import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFilterBar } from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableEmpty } from '@/components/ui/table';
import { useCan } from '@/hooks/use-can';
import { formatNumber } from '@/lib/utils';

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
        from?: number;
        to?: number;
    };
    branches: Array<{ id: number; name: string }>;
    filters?: {
        branch_id?: string | number;
        per_page?: string;
    };
}

export default function ContractTypesIndex({
    contractTypes,
    filters = {},
}: PageProps) {
    const { t } = useTranslation();
    const can = useCan();
    const [perPage, setPerPage] = useState(filters?.per_page || '15');
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState<ContractType | null>(null);

    const handlePerPageChange = (val: string) => {
        setPerPage(val);
        router.get(
            '/admin/contract-types',
            {
                ...filters,
                per_page: val,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

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
                    toast.success(
                        t(
                            'contract_types.updated',
                            'Tarif muvaffaqiyatli yangilandi',
                        ),
                    );
                },
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        } else {
            form.post('/admin/contract-types', {
                onSuccess: () => {
                    setShowModal(false);
                    form.reset();
                    toast.success(
                        t(
                            'contract_types.created',
                            'Tarif muvaffaqiyatli yaratildi',
                        ),
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

    const handleDelete = (ct: ContractType) => {
        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            router.delete(`/admin/contract-types/${ct.id}`, {
                onSuccess: () =>
                    toast.success(t('common.deleted', "O'chirildi")),
                onError: (err) =>
                    toast.error(
                        (Object.values(err)[0] as string) ||
                            t('common.error', 'Xatolik yuz berdi'),
                    ),
            });
        }
    };

    return (
        <div className="p-6">
            <Head title={t('contract_types.title', 'Shartnoma Tariflari')} />

            {/* Page Title & Add Button */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {t('contract_types.title', 'Shartnoma Tariflari')}
                </h1>
                {can('contract_types.manage') && (
                    <Button
                        onClick={openCreate}
                        variant="brand"
                        className="shrink-0"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>{t('common.add', "Qo'shish")}</span>
                    </Button>
                )}
            </div>

            {/* Filter Toolbar */}
            <PageFilterBar>
                <div className="flex-1" />
                <PerPageSelect value={perPage} onChange={handlePerPageChange} />
            </PageFilterBar>

            {/* Contract Types Grid / Table */}
            {contractTypes.data.length === 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
                    <Table>
                        <TableBody>
                            <TableEmpty
                                icon={FileText}
                                title={t(
                                    'contract_types.no_tariffs',
                                    'Tariflar mavjud emas',
                                )}
                                description={t(
                                    'contract_types.no_tariffs_desc',
                                    'Hozircha hech qanday shartnoma tarifi yaratilmagan.',
                                )}
                                action={
                                    can('contract_types.manage') ? (
                                        <Button
                                            variant="brand"
                                            size="sm"
                                            onClick={openCreate}
                                            className="mt-2"
                                        >
                                            <Plus className="mr-1.5 h-4 w-4" />
                                            {t(
                                                'contract_types.add_new',
                                                "Yangi tarif qo'shish",
                                            )}
                                        </Button>
                                    ) : null
                                }
                            />
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {contractTypes.data.map((ct) => (
                        <div
                            key={ct.id}
                            className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                        {ct.category}{' '}
                                        {t(
                                            'contract_types.category_suffix',
                                            'toifa',
                                        )}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[11px] ${ct.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                                    >
                                        {ct.is_active
                                            ? t('common.active', 'Faol')
                                            : t('common.inactive', 'Nofaol')}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    {ct.name}
                                </h3>
                                <p className="mt-2 text-xl font-extrabold text-gray-900 dark:text-white">
                                    {formatNumber(ct.price)}{' '}
                                    <span className="text-xs font-normal text-gray-500">
                                        UZS
                                    </span>
                                </p>

                                {ct.description && (
                                    <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                        {ct.description}
                                    </p>
                                )}

                                {/* Modules Checklist */}
                                <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-xs dark:border-gray-700/60">
                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                        <span>
                                            {t(
                                                'contracts.has_theory',
                                                'Nazariya',
                                            )}
                                            :
                                        </span>
                                        <span className="font-semibold">
                                            {ct.has_theory
                                                ? `${t('common.yes', 'Ha')} (${ct.required_theory_lessons} ${t('common.lessons', 'dars')})`
                                                : t('common.no', "Yo'q")}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                        <span>
                                            {t(
                                                'contracts.has_driving',
                                                'Amaliy haydash',
                                            )}
                                            :
                                        </span>
                                        <span className="font-semibold">
                                            {ct.has_driving
                                                ? `${t('common.yes', 'Ha')} (${ct.required_driving_lessons} ${t('common.lessons', 'dars')})`
                                                : t('common.no', "Yo'q")}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                        <span>
                                            {t(
                                                'contracts.has_lms',
                                                'LMS Testlar',
                                            )}
                                            :
                                        </span>
                                        <span className="font-semibold">
                                            {ct.has_lms
                                                ? t('common.yes', 'Ha')
                                                : t('common.no', "Yo'q")}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                        <span>
                                            {t(
                                                'contract_types.min_payment',
                                                "Minimal to'lov",
                                            )}
                                            :
                                        </span>
                                        <span className="font-semibold">
                                            {ct.min_theory_payment_percent}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700/60">
                                {can('contract_types.manage') && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEdit(ct)}
                                        className="h-8 text-xs"
                                    >
                                        <Edit2 className="mr-1 h-3.5 w-3.5" />
                                        {t('common.edit', 'Tahrirlash')}
                                    </Button>
                                )}
                                {can('contract_types.manage') && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(ct)}
                                        className="h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <Pagination
                links={contractTypes.links}
                total={contractTypes.total}
                from={contractTypes.from}
                to={contractTypes.to}
            />

            {/* Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <span>
                                {editingType
                                    ? t(
                                          'contract_types.edit_title',
                                          'Tarifni Tahrirlash',
                                      )
                                    : t(
                                          'contract_types.create_title',
                                          'Yangi Tarif Yaratish',
                                      )}
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="name" required>
                                    {t('contract_types.name', 'Tarif Nomi')}
                                </Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    placeholder="Standart B toifa"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="category" required>
                                    {t('contract_types.category', 'Toifa')}
                                </Label>
                                <SearchableSelect
                                    id="category"
                                    value={form.data.category}
                                    onChange={(val) =>
                                        form.setData('category', String(val))
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
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="price" required>
                                    {t('contract_types.price', 'Narx (UZS)')}
                                </Label>
                                <MoneyInput
                                    id="price"
                                    value={form.data.price}
                                    onChange={(val) =>
                                        form.setData('price', val)
                                    }
                                    required
                                    suffix="UZS"
                                    placeholder="0"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="min_pct">
                                    {t(
                                        'contract_types.min_theory_pct',
                                        "Darsga minimal to'lov (%)",
                                    )}
                                </Label>
                                <Input
                                    id="min_pct"
                                    type="number"
                                    value={form.data.min_theory_payment_percent}
                                    onChange={(e) =>
                                        form.setData(
                                            'min_theory_payment_percent',
                                            Number(e.target.value),
                                        )
                                    }
                                    min={0}
                                    max={100}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="theory_lessons" required>
                                    {t(
                                        'contract_types.theory_count',
                                        'Nazariya Darslari Soni',
                                    )}
                                </Label>
                                <Input
                                    id="theory_lessons"
                                    type="number"
                                    value={form.data.required_theory_lessons}
                                    onChange={(e) =>
                                        form.setData(
                                            'required_theory_lessons',
                                            Number(e.target.value),
                                        )
                                    }
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="driving_lessons" required>
                                    {t(
                                        'contract_types.driving_count',
                                        'Vajdeniya Darslari Soni',
                                    )}
                                </Label>
                                <Input
                                    id="driving_lessons"
                                    type="number"
                                    value={form.data.required_driving_lessons}
                                    onChange={(e) =>
                                        form.setData(
                                            'required_driving_lessons',
                                            Number(e.target.value),
                                        )
                                    }
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Module Checkboxes */}
                        <div className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
                            <span className="mb-1 block font-semibold">
                                {t(
                                    'contract_types.included_modules',
                                    'Kiritilgan Modullar',
                                )}
                                :
                            </span>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_theory}
                                        onChange={(e) =>
                                            form.setData(
                                                'has_theory',
                                                e.target.checked,
                                            )
                                        }
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                        {t('contracts.has_theory', 'Nazariya')}
                                    </span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_driving}
                                        onChange={(e) =>
                                            form.setData(
                                                'has_driving',
                                                e.target.checked,
                                            )
                                        }
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                        {t(
                                            'contracts.has_driving',
                                            'Vajdeniya',
                                        )}
                                    </span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_lms}
                                        onChange={(e) =>
                                            form.setData(
                                                'has_lms',
                                                e.target.checked,
                                            )
                                        }
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                        {t('contracts.has_lms', 'LMS Testlar')}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowModal(false)}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={form.processing}
                            >
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
