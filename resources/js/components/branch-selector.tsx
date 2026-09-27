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
    const { auth, filters } = usePage<SharedData & { branches?: any; filters?: any }>().props;
    const user = auth?.user;
    if (!user) return null;

    const isSuperAdmin = !!auth?.is_super_admin;

    const rawBranches = branches || (usePage().props.branches as any);
    const availableBranches: Branch[] = Array.isArray(rawBranches)
        ? rawBranches
        : (Array.isArray(rawBranches?.data) ? rawBranches.data : []);

    const currentBranchId = filters?.branch_id !== undefined && filters?.branch_id !== null ? String(filters.branch_id) : '';

    if (!Array.isArray(availableBranches) || availableBranches.length === 0) {
        if (user.branch) {
            return (
                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 font-normal text-xs bg-muted/50 border-border">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>{user.branch.name}</span>
                </Badge>
            );
        }
        return null;
    }

    if (!isSuperAdmin) {
        const userBranch = user.branch || availableBranches.find((b) => b.id === user.branch_id);
        if (!userBranch) return null;
        return (
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 font-normal text-xs bg-muted/50 border-border">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>{userBranch.name}</span>
            </Badge>
        );
    }

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        router.post('/admin/select-branch', { branch_id: value }, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    return (
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-sm">
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
                value={currentBranchId}
                onChange={handleBranchChange}
                className="bg-transparent border-none text-xs font-medium focus:ring-0 focus:outline-none text-foreground cursor-pointer pr-1"
            >
                <option value="">{t('branches.all_branches', 'Barcha filiallar')}</option>
                {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                        {b.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
