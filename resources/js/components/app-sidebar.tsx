import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
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
    HelpCircle,
    LayoutGrid,
    MapPin,
    ShieldCheck,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { useTranslation } from 'react-i18next';
import { useCan } from '@/hooks/use-can';
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
import type { NavGroup } from '@/types';

/**
 * Permission(s) required to see each sidebar entry (any of them is enough).
 * Entries without a mapping are visible to superadmins only.
 */
const NAV_PERMISSIONS: Record<string, string[]> = {
    '/admin/dashboard': ['dashboard.view'],
    '/admin/leads': ['crm.view'],
    '/admin/contracts': ['contracts.view'],
    '/admin/contract-types': ['contracts.view', 'contract_types.manage'],
    '/admin/courses': ['lms.view'],
    '/admin/groups': ['groups.view'],
    '/admin/students': ['students.view'],
    '/admin/attendance': ['attendance.view'],
    '/admin/tests': ['tickets.manage', 'attempts.view'],
    '/admin/certificates': ['certificates.view'],
    '/admin/drivings': ['drivings.view'],
    '/admin/vehicles': ['fleet.view'],
    '/admin/autodromes': ['autodromes.manage'],
    '/admin/instructors': ['users.view'],
    '/admin/staff': ['users.view'],
    '/admin/salaries': ['salaries.view'],
    '/admin/finance': ['finance.view'],
};

export function AppSidebar() {
    const { t } = useTranslation();
    const can = useCan();
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
                    title: t('sidebar.tests', 'Testlar & Imtihonlar'),
                    href: '/admin/tests',
                    icon: HelpCircle,
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
            title: t('sidebar.group_staff', 'Xodimlar'),
            items: [
                {
                    title: t('sidebar.staff', 'Xodimlar'),
                    href: '/admin/staff',
                    icon: UserCheck,
                },
                {
                    title: t('sidebar.salaries', 'Xodimlar Oyligi'),
                    href: '/admin/salaries',
                    icon: Banknote,
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
            items: group.items.filter((item) => can(...(NAV_PERMISSIONS[item.href as string] ?? ['__superadmin_only__']))),
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
