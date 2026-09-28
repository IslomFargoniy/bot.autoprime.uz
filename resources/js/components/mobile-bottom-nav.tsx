import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Users, CarFront, FolderGit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCan } from '@/hooks/use-can';
import { navPermissionsFor } from '@/lib/nav-permissions';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';

export function MobileBottomNav() {
    const { t } = useTranslation();
    const { url } = usePage<SharedData>();
    const can = useCan();

    const navItems = [
        {
            title: t('sidebar.dashboard', 'Bosh sahifa'),
            href: '/admin/dashboard',
            icon: LayoutGrid,
        },
        {
            title: t('sidebar.groups', 'Guruhlar'),
            href: '/admin/groups',
            icon: FolderGit2,
        },
        {
            title: t('sidebar.students', 'O\'quvchilar'),
            href: '/admin/students',
            icon: Users,
        },
        {
            title: t('sidebar.drivings', 'Mashg\'ulotlar'),
            href: '/admin/drivings',
            icon: CarFront,
        },
    ].filter((item) => can(...navPermissionsFor(item.href)));

    if (navItems.length === 0) {
        return null;
    }

    return (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            {/* Main pill container */}
            <div className="flex items-center gap-2 bg-primary p-2 rounded-full shadow-2xl">
                {navItems.map((item) => {
                    const isActive = url.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-center transition-all duration-300 ease-in-out",
                                isActive
                                    ? "bg-background text-primary w-16 h-11 rounded-full shadow-sm"
                                    : "bg-black/20 dark:bg-white/10 text-primary-foreground/90 w-11 h-11 rounded-full hover:bg-black/30 dark:hover:bg-white/20 active:scale-95"
                            )}
                        >
                            <Icon 
                                className="w-6 h-6 shrink-0 transition-transform duration-300" 
                                strokeWidth={isActive ? 2.5 : 2} 
                            />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
