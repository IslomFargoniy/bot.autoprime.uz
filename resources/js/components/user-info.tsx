import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

import { useTranslation } from 'react-i18next';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const { t } = useTranslation();
    const getInitials = useInitials();

    const getRoleTitle = (role?: string) => {
        switch (role) {
            case 'superadmin':
                return `👑 ${t('roles.superadmin', 'Bosh Admin')}`;
            case 'admin':
                return `🛡️ ${t('roles.admin', 'Admin')}`;
            case 'instructor':
                return `👨‍🏫 ${t('roles.instructor', 'Instruktor')}`;
            case 'student':
                return `🎓 ${t('roles.student', "O'quvchi")}`;
            default:
                return role ? `👑 ${t('roles.superadmin', 'Bosh Admin')}` : `👑 ${t('roles.superadmin', 'Bosh Admin')}`;
        }
    };

    const roleTitle = getRoleTitle(user?.role);

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                    {roleTitle}
                </span>
            </div>
        </>
    );
}
