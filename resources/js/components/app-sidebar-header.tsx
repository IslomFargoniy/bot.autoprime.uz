import { useEffect, useState } from 'react';
import { BranchSelector } from '@/components/branch-selector';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { isTelegramWebApp } from '@/hooks/use-telegram';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const isTg =
        isMobile &&
        typeof window !== 'undefined' &&
        (isTelegramWebApp() ||
            !!(window as any).Telegram?.WebApp?.initData ||
            !!(window as any).Telegram?.WebApp?.platform);

    return (
        <header
            style={{
                paddingTop: isTg
                    ? 'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 44px)) + 3.25rem)'
                    : undefined,
            }}
            className="sticky top-0 z-40 flex min-h-16 shrink-0 items-end justify-between gap-2 border-b border-sidebar-border/50 bg-background/95 px-4 pb-3 backdrop-blur transition-[width,height] ease-linear supports-[backdrop-filter]:bg-background/80 md:h-16 md:items-center md:px-6 md:!pt-0 md:pb-0"
        >
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-2">
                <BranchSelector />
                <LanguageSwitcher />
                <ThemeSwitcher />
            </div>
        </header>
    );
}
