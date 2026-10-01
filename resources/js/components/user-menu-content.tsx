import { Link, router } from '@inertiajs/react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { t } = useTranslation();
    const { setOpenMobile, isMobile } = useSidebar();

    const handleLogout = () => {
        cleanup();

        if (isMobile) {
            setOpenMobile(false);
        }

        router.flushAll();
    };

    const handleProfileClick = () => {
        cleanup();

        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full cursor-pointer flex items-center" href="/profile" onClick={handleProfileClick}>
                        <UserIcon className="mr-2 w-4 h-4" />
                        {t('user_menu.profile', 'Profil')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    {t('user_menu.logout', 'Log out')}
                </Link>
            </DropdownMenuItem>
        </>
    );
}
