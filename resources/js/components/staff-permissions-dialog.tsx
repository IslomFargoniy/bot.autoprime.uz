import { router } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type PermissionCatalog = {
    groups: {
        role: string;
        label: string;
        permissions: { name: string; label: string }[];
    }[];
    role_permissions: Record<string, string[]>;
    grantable: string[];
};

export type PermissionMember = {
    id: number;
    name: string;
    role: string;
    permissions?: { name: string }[];
};

type Props = {
    member: PermissionMember | null;
    catalog: PermissionCatalog;
    onClose: () => void;
};

/**
 * Grants a staff member permissions of other staff roles on top of their own
 * role, shown grouped by role (e.g. give a receptionist the cashier set).
 */
export function StaffPermissionsDialog({ member, catalog, onClose }: Props) {
    return (
        <Dialog
            open={member !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            {member && (
                <PermissionsForm
                    key={member.id}
                    member={member}
                    catalog={catalog}
                    onClose={onClose}
                />
            )}
        </Dialog>
    );
}

function PermissionsForm({
    member,
    catalog,
    onClose,
}: {
    member: PermissionMember;
    catalog: PermissionCatalog;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<Set<string>>(
        () =>
            new Set(
                member.permissions?.map((permission) => permission.name) ?? [],
            ),
    );
    const [saving, setSaving] = useState(false);

    const inherited = useMemo(
        () => new Set(catalog.role_permissions[member.role] ?? []),
        [member, catalog],
    );
    const grantable = useMemo(() => new Set(catalog.grantable), [catalog]);

    // The member's own role first, then the other roles.
    const groups = useMemo(
        () =>
            [...catalog.groups].sort(
                (a, b) =>
                    Number(b.role === member.role) -
                    Number(a.role === member.role),
            ),
        [catalog, member],
    );

    const isChecked = (name: string) =>
        inherited.has(name) || selected.has(name);
    const isLocked = (name: string) =>
        inherited.has(name) || (!grantable.has(name) && !selected.has(name));

    const toggle = (name: string, checked: boolean) => {
        setSelected((current) => {
            const next = new Set(current);

            if (checked) {
                next.add(name);
            } else {
                next.delete(name);
            }

            return next;
        });
    };

    const toggleGroup = (names: string[], checked: boolean) => {
        setSelected((current) => {
            const next = new Set(current);
            names
                .filter((name) => !inherited.has(name) && grantable.has(name))
                .forEach((name) =>
                    checked ? next.add(name) : next.delete(name),
                );

            return next;
        });
    };

    const save = () => {
        setSaving(true);
        router.put(
            `/admin/staff/${member.id}/permissions`,
            {
                permissions: [...selected].filter(
                    (name) => !inherited.has(name),
                ),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        t('staff.permissions_saved', 'Ruxsatlar saqlandi'),
                    );
                    onClose();
                },
                onError: (errors) =>
                    toast.error(Object.values(errors)[0] as string),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    {t('staff.permissions_title', 'Ruxsatlar')}: {member.name}
                </DialogTitle>
                <DialogDescription>
                    {t(
                        'staff.permissions_hint',
                        "Xodimning o'z roli ruxsatlari doim yoqilgan. Boshqa vazifani ham bajarsa (masalan, reception kassirlik qilsa), o'sha rol ruxsatlarini qo'shimcha belgilang.",
                    )}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                {groups.map((group) => {
                    const isOwnRole = group.role === member.role;
                    const names = group.permissions.map(
                        (permission) => permission.name,
                    );
                    const extraNames = names.filter(
                        (name) => !inherited.has(name) && grantable.has(name),
                    );
                    const allChecked = names.every(isChecked);

                    return (
                        <section
                            key={group.role}
                            className="rounded-lg border border-border"
                        >
                            <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                                <div className="flex items-center gap-2 font-semibold">
                                    {group.label}
                                    {isOwnRole && (
                                        <Badge variant="secondary">
                                            {t('staff.own_role', 'Asosiy rol')}
                                        </Badge>
                                    )}
                                </div>
                                {!isOwnRole && extraNames.length > 0 && (
                                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                        <Checkbox
                                            checked={allChecked}
                                            onCheckedChange={(checked) =>
                                                toggleGroup(
                                                    names,
                                                    checked === true,
                                                )
                                            }
                                        />
                                        {t(
                                            'staff.grant_whole_role',
                                            'Hammasini berish',
                                        )}
                                    </label>
                                )}
                            </header>
                            <div className="grid gap-2 p-3 sm:grid-cols-2">
                                {group.permissions.map((permission) => (
                                    <label
                                        key={permission.name}
                                        className="flex items-start gap-2 text-sm"
                                        title={
                                            !grantable.has(permission.name) &&
                                            !inherited.has(permission.name)
                                                ? t(
                                                      'staff.not_grantable',
                                                      "Sizda bu ruxsat yo'q",
                                                  )
                                                : undefined
                                        }
                                    >
                                        <Checkbox
                                            className="mt-0.5"
                                            checked={isChecked(permission.name)}
                                            disabled={isLocked(permission.name)}
                                            onCheckedChange={(checked) =>
                                                toggle(
                                                    permission.name,
                                                    checked === true,
                                                )
                                            }
                                        />
                                        <span
                                            className={
                                                isLocked(permission.name)
                                                    ? 'text-muted-foreground'
                                                    : undefined
                                            }
                                        >
                                            {permission.label}
                                            {inherited.has(permission.name) &&
                                                !isOwnRole && (
                                                    <span className="ml-1 text-[11px]">
                                                        (
                                                        {t(
                                                            'staff.via_role',
                                                            'rol orqali',
                                                        )}
                                                        )
                                                    </span>
                                                )}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                    {t('common.cancel', 'Bekor qilish')}
                </Button>
                <Button onClick={save} disabled={saving}>
                    {t('common.save', 'Saqlash')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
