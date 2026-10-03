import { router, usePage } from '@inertiajs/react';
import { Check, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { SharedData } from '@/types/auth';
import type { ManageableExpenseCategory } from '../types';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: ManageableExpenseCategory[];
    branches: Array<{ id: number; name: string }>;
}

/**
 * Add, rename, switch off and delete expense categories. The server decides what each
 * person may change (`can_edit`) and refuses what is not allowed (system categories
 * cannot be removed, used ones cannot be deleted); its message is shown as a toast.
 */
export function ExpenseCategoriesDialog({
    open,
    onOpenChange,
    categories,
    branches,
}: Props) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;

    const [newName, setNewName] = useState('');
    const [newBranchId, setNewBranchId] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    const options = {
        preserveScroll: true,
        preserveState: true,
        onError: (errors: Record<string, string>) =>
            toast.error(
                Object.values(errors)[0] ||
                    t('common.error', 'Xatolik yuz berdi'),
            ),
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        router.post(
            '/admin/expense-categories',
            { name: newName, branch_id: newBranchId || null },
            {
                ...options,
                onSuccess: () => {
                    setNewName('');
                    toast.success(
                        t('finance.category_created', "Xarajat turi qo'shildi"),
                    );
                },
            },
        );
    };

    const handleRename = (category: ManageableExpenseCategory) => {
        router.put(
            `/admin/expense-categories/${category.id}`,
            { name: editName },
            {
                ...options,
                onSuccess: () => {
                    setEditingId(null);
                    toast.success(
                        t(
                            'finance.category_updated',
                            'Xarajat turi yangilandi',
                        ),
                    );
                },
            },
        );
    };

    const handleToggle = (category: ManageableExpenseCategory) => {
        router.put(
            `/admin/expense-categories/${category.id}`,
            { name: category.name, is_active: !category.is_active },
            options,
        );
    };

    const handleDelete = (category: ManageableExpenseCategory) => {
        if (
            !confirm(
                t(
                    'finance.confirm_delete_category',
                    '"{{name}}" xarajat turi o\'chirilsinmi?',
                    { name: category.name },
                ),
            )
        ) {
            return;
        }

        router.delete(`/admin/expense-categories/${category.id}`, {
            ...options,
            onSuccess: () =>
                toast.success(
                    t('finance.category_deleted', "Xarajat turi o'chirildi"),
                ),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">
                        {t('finance.expense_categories', 'Xarajat turlari')}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={t(
                            'finance.category_name',
                            'Yangi xarajat turi nomi',
                        )}
                        maxLength={255}
                        required
                        className="min-w-0 flex-1"
                    />
                    {auth?.is_super_admin && (
                        <div className="w-full sm:w-44">
                            <SearchableSelect
                                value={newBranchId}
                                onChange={(val) =>
                                    setNewBranchId(val ? String(val) : '')
                                }
                                options={[
                                    {
                                        value: '',
                                        label: t(
                                            'finance.category_shared',
                                            'Umumiy (barcha filiallar)',
                                        ),
                                    },
                                    ...branches.map((b) => ({
                                        value: String(b.id),
                                        label: b.name,
                                    })),
                                ]}
                            />
                        </div>
                    )}
                    <Button type="submit" variant="brand" className="gap-1">
                        <Plus className="h-4 w-4" />
                        {t('common.add', "Qo'shish")}
                    </Button>
                </form>

                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-gray-700 dark:border-gray-700">
                    {categories.map((category) => (
                        <li
                            key={category.id}
                            className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                        >
                            {editingId === category.id ? (
                                <>
                                    <Input
                                        value={editName}
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        maxLength={255}
                                        className="h-8 min-w-0 flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleRename(category)}
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setEditingId(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="min-w-0 flex-1">
                                        <span
                                            className={
                                                category.is_active
                                                    ? 'font-medium'
                                                    : 'text-gray-400 line-through'
                                            }
                                        >
                                            {category.name}
                                        </span>
                                        <span className="ml-2 text-[11px] text-gray-500">
                                            {category.branch?.name ??
                                                t(
                                                    'finance.category_shared_short',
                                                    'Umumiy',
                                                )}
                                        </span>
                                        {category.code && (
                                            <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                                                {t(
                                                    'finance.category_system',
                                                    'Tizim',
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {category.can_edit && (
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0"
                                                title={t(
                                                    'common.edit',
                                                    'Tahrirlash',
                                                )}
                                                onClick={() => {
                                                    setEditingId(category.id);
                                                    setEditName(category.name);
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {!category.code && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0"
                                                        title={
                                                            category.is_active
                                                                ? t(
                                                                      'finance.category_deactivate',
                                                                      'Nofaol qilish',
                                                                  )
                                                                : t(
                                                                      'finance.category_activate',
                                                                      'Faollashtirish',
                                                                  )
                                                        }
                                                        onClick={() =>
                                                            handleToggle(
                                                                category,
                                                            )
                                                        }
                                                    >
                                                        <Power
                                                            className={`h-3.5 w-3.5 ${category.is_active ? 'text-emerald-600' : 'text-gray-400'}`}
                                                        />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 border-red-200 p-0 text-red-500 hover:bg-red-50"
                                                        title={t(
                                                            'common.delete',
                                                            "O'chirish",
                                                        )}
                                                        onClick={() =>
                                                            handleDelete(
                                                                category,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
