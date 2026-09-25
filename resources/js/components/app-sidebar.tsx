import { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Award,
    Banknote,
    BookOpen,
    Building2,
    Car,
    CarFront,
    CheckSquare,
    FileText,
    FolderGit2,
    GraduationCap,
    LayoutGrid,
    MapPin,
    ShieldCheck,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { useTranslation } from 'react-i18next';
import { isTelegramWebApp } from '@/hooks/use-telegram';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import type { NavGroup, SharedData } from '@/types';

export function AppSidebar() {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth.user.role === 'instructor';
    const isSuperAdmin = auth.user.role === 'superadmin' || auth.user.id === 1;
    const { setOpenMobile, isMobile } = useSidebar();
    const [isTg, setIsTg] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && isMobile) {
            setIsTg(isTelegramWebApp() || !!(window as any).Telegram?.WebApp?.initData || !!(window as any).Telegram?.WebApp?.platform);
        }
    }, [isMobile]);

    const handleLogoClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const navGroups: NavGroup[] = [
        {
            title: t('sidebar.group_main', 'Asosiy'),
            items: [
                {
                    title: t('sidebar.dashboard', 'Bosh sahifa'),
                    href: '/admin/dashboard',
                    icon: LayoutGrid,
                },
            ],
        },
        {
            title: t('sidebar.group_reception', 'Reception'),
            items: [
                {
                    title: t('sidebar.leads', 'CRM Lidlar'),
                    href: '/admin/leads',
                    icon: Users,
                },
                {
                    title: t('sidebar.contracts', 'Shartnomalar'),
                    href: '/admin/contracts',
                    icon: FileText,
                },
                {
                    title: t('sidebar.contract_types', 'Tariflar'),
                    href: '/admin/contract-types',
                    icon: FileText,
                },
            ],
        },
        {
            title: t('sidebar.group_lms', "LMS & Ta'lim"),
            items: [
                {
                    title: t('sidebar.courses', 'LMS Kurslar'),
                    href: '/admin/courses',
                    icon: GraduationCap,
                },
                {
                    title: t('sidebar.groups', 'Guruhlar'),
                    href: '/admin/groups',
                    icon: FolderGit2,
                },
                {
                    title: t('sidebar.students', "O'quvchilar"),
                    href: '/admin/students',
                    icon: BookOpen,
                },
                {
                    title: t('sidebar.attendance', 'Davomat (QR)'),
                    href: '/admin/attendance',
                    icon: CheckSquare,
                },
                {
                    title: t('sidebar.certificates', 'Guvohnomalar'),
                    href: '/admin/certificates',
                    icon: Award,
                },
            ],
        },
        {
            title: t('sidebar.group_autodrome', 'Avtodrom & Avtopark'),
            items: [
                {
                    title: t('sidebar.drivings', "Mashg'ulotlar"),
                    href: '/admin/drivings',
                    icon: CarFront,
                },
                {
                    title: t('sidebar.vehicles', 'Avtopark'),
                    href: '/admin/vehicles',
                    icon: Car,
                },
                {
                    title: t('sidebar.autodromes', 'Avtodromlar'),
                    href: '/admin/autodromes',
                    icon: MapPin,
                },
                {
                    title: t('sidebar.instructors', 'Instruktorlar'),
                    href: '/admin/instructors',
                    icon: Users,
                },
            ],
        },
        {
            title: t('sidebar.group_finance', 'Moliya'),
            items: [
                {
                    title: t('sidebar.finance', 'Moliya & Kassa'),
                    href: '/admin/finance',
                    icon: Wallet,
                },
                {
                    title: t('sidebar.salaries', 'Xodimlar Oyligi'),
                    href: '/admin/salaries',
                    icon: Banknote,
                },
            ],
        },
        {
            title: t('sidebar.group_superadmin', 'Superadmin'),
            items: [
                {
                    title: t('sidebar.branches', 'Filiallar'),
                    href: '/admin/branches',
                    icon: Building2,
                },
                {
                    title: t('sidebar.admins', 'Adminlar'),
                    href: '/admin/admins',
                    icon: ShieldCheck,
                },
            ],
        },
    ];

    const filteredGroups = navGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (item.href === '/admin/branches' || item.href === '/admin/admins') {
                    return isSuperAdmin;
                }
                if (isInstructor) {
                    return ['/admin/dashboard', '/admin/groups', '/admin/students', '/admin/drivings', '/admin/vehicles'].includes(
                        item.href as string
                    );
                }
                return true;
            }),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader
                style={{
                    paddingTop: isTg
                        ? 'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 44px)) + 3.25rem)'
                        : undefined,
                }}
            >
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/admin/dashboard" onClick={handleLogoClick}>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={filteredGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
