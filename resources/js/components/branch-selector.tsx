import { router, usePage } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { Branch, SharedData } from '@/types/auth';

interface Props {
    branches?: Branch[];
}

export function BranchSelector({ branches }: Props) {
    const { t } = useTranslation();
    const {
        auth,
        filters,
        branches: sharedBranches,
    } = usePage<SharedData & { branches?: any; filters?: any }>().props;
    const user = auth?.user;

    if (!user) {
        return null;
    }

    const isSuperAdmin = !!auth?.is_super_admin;

    const rawBranches = branches || sharedBranches;
    const availableBranches: Branch[] = Array.isArray(rawBranches)
        ? rawBranches
        : Array.isArray(rawBranches?.data)
          ? rawBranches.data
          : [];

    const currentBranchId =
        filters?.branch_id !== undefined && filters?.branch_id !== null
            ? String(filters.branch_id)
            : '';

    if (!Array.isArray(availableBranches) || availableBranches.length === 0) {
        if (user.branch) {
            return (
                <Badge
                    variant="outline"
                    className="gap-1.5 border-border bg-muted/50 px-2.5 py-1 text-xs font-normal"
                >
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>{user.branch.name}</span>
                </Badge>
            );
        }

        return null;
    }

    if (!isSuperAdmin) {
        const userBranch =
            user.branch ||
            availableBranches.find((b) => b.id === user.branch_id);

        if (!userBranch) {
            return null;
        }

        return (
            <Badge
                variant="outline"
                className="gap-1.5 border-border bg-muted/50 px-2.5 py-1 text-xs font-normal"
            >
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{userBranch.name}</span>
            </Badge>
        );
    }

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        router.post(
            '/admin/select-branch',
            { branch_id: value },
            {
                preserveScroll: true,
                preserveState: false,
            },
        );
    };

    return (
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs shadow-sm">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <select
                value={currentBranchId}
                onChange={handleBranchChange}
                className="cursor-pointer border-none bg-transparent pr-1 text-xs font-medium text-foreground focus:ring-0 focus:outline-none"
            >
                <option value="">
                    {t('branches.all_branches', 'Barcha filiallar')}
                </option>
                {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                        {b.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
