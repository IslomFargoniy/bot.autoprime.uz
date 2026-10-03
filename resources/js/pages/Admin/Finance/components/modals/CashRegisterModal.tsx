import { router, useForm, usePage } from '@inertiajs/react';
import { Wallet } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { SharedData } from '@/types/auth';
import type { CashRegister } from '../../types';

interface Props {
    /** The register being edited, or null to create a new one. */
    register: CashRegister | null;
    branches: Array<{ id: number; name: string }>;
    registerTypes: Array<{ id: number; code: string; name: string }>;
    onClose: () => void;
}

/**
 * Create or edit a cash register. A central (branch-less) register can only be renamed;
 * the server refuses the rest, and its message is shown as a toast.
 */
export function CashRegisterModal({
    register,
    branches,
    registerTypes,
    onClose,
}: Props) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isEditing = register !== null;
    const isCentral = isEditing && register.branch_id == null;

    const form = useForm({
        branch_id: register?.branch_id ? String(register.branch_id) : '',
        cash_register_type_id: register?.cash_register_type_id
            ? String(register.cash_register_type_id)
            : '',
        name: register?.name ?? '',
        is_active: register?.is_active ?? true,
    });

    const showError = (errors: Record<string, string>) =>
        toast.error(
            Object.values(errors)[0] || t('common.error', 'Xatolik yuz berdi'),
        );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(
                    isEditing
                        ? t('finance.register_updated', 'Kassa yangilandi')
                        : t('finance.register_created', 'Kassa yaratildi'),
                );
                onClose();
            },
            onError: showError,
        };

        if (isEditing) {
            form.put(`/admin/cash-registers/${register.id}`, options);
        } else {
            form.post('/admin/cash-registers', options);
        }
    };

    const handleDelete = () => {
        if (
            !register ||
            !confirm(
                t(
                    'finance.confirm_delete_register',
                    '"{{name}}" kassasi o\'chirilsinmi?',
                    { name: register.name },
                ),
            )
        ) {
            return;
        }

        router.delete(`/admin/cash-registers/${register.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(
                    t('finance.register_deleted', "Kassa o'chirildi"),
                );
                onClose();
            },
            onError: showError,
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Wallet className="h-5 w-5 shrink-0 text-emerald-600" />
                        <span>
                            {isEditing
                                ? t(
                                      'finance.edit_register',
                                      'Kassani tahrirlash',
                                  )
                                : t('finance.add_register', "Kassa qo'shish")}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {!isEditing && auth?.is_super_admin && (
                        <div>
                            <Label required htmlFor="reg_branch">
                                {t('finance.branch', 'Filial')}
                            </Label>
                            <SearchableSelect
                                id="reg_branch"
                                value={form.data.branch_id}
                                onChange={(val) =>
                                    form.setData('branch_id', String(val))
                                }
                                options={branches.map((b) => ({
                                    value: String(b.id),
                                    label: b.name,
                                }))}
                                className="mt-1"
                            />
                        </div>
                    )}

                    {!isCentral && (
                        <div>
                            <Label required htmlFor="reg_type">
                                {t('finance.type', 'Turi')}
                            </Label>
                            <SearchableSelect
                                id="reg_type"
                                value={form.data.cash_register_type_id}
                                onChange={(val) =>
                                    form.setData(
                                        'cash_register_type_id',
                                        String(val),
                                    )
                                }
                                options={registerTypes.map((type) => ({
                                    value: String(type.id),
                                    label: type.name,
                                }))}
                                className="mt-1"
                            />
                        </div>
                    )}

                    <div>
                        <Label required htmlFor="reg_name">
                            {t('finance.register_name', 'Kassa Nomi')}
                        </Label>
                        <Input
                            id="reg_name"
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            maxLength={100}
                            required
                            className="mt-1"
                        />
                    </div>

                    {isEditing && !isCentral && (
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(e) =>
                                    form.setData('is_active', e.target.checked)
                                }
                            />
                            {t('finance.register_active', 'Kassa faol')}
                        </label>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2">
                        {isEditing && !isCentral ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDelete}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                                {t('common.delete', "O'chirish")}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
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
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
