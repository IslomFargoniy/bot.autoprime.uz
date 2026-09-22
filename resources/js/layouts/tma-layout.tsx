import { useEffect, useState, ReactNode } from 'react';
import { Head } from '@inertiajs/react';
import { initTelegramWebApp } from '@/hooks/use-telegram';
import { LanguageSwitcher } from '@/components/language-switcher';

interface TMALayoutProps {
    children: ReactNode;
    title?: string;
}

export default function TMALayout({ children, title }: TMALayoutProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const tgWindow = window as any;
        if (typeof window !== 'undefined' && tgWindow.Telegram && tgWindow.Telegram.WebApp) {
            initTelegramWebApp();

            const webApp = tgWindow.Telegram.WebApp;
            if (webApp.backgroundColor) {
                document.documentElement.style.setProperty('--tg-theme-bg-color', webApp.backgroundColor);
            }
            if (webApp.textColor) {
                document.documentElement.style.setProperty('--tg-theme-text-color', webApp.textColor);
            }

            setIsReady(true);
        } else {
            console.log("Telegram WebApp not found. Running in browser mode.");
            setIsReady(true);
        }
    }, []);

    if (!isReady) {
        return <div className="flex h-screen items-center justify-center p-4">Yuklanmoqda...</div>;
    }

    return (
        <div className="min-h-screen bg-[var(--tg-theme-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#1f2937)] font-sans">
            <Head title={title ? `${title} - Avtomaktab KPI` : 'Avtomaktab KPI'} />

            <header
                style={{ paddingTop: 'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 44px)) + 3.25rem)' }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700"
            >
                <div className="px-4 py-2 flex items-center justify-between gap-2">
                    <h1 className="text-base font-bold truncate">{title || 'Boshqaruv Paneli'}</h1>
                    <LanguageSwitcher />
                </div>
            </header>

            <main className="p-4 pb-24 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
