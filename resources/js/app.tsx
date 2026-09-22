import '@/i18n';
import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { initTelegramWebApp } from '@/hooks/use-telegram';
import { TelegramThemeProvider } from '@/components/telegram-theme-provider';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';

initTelegramWebApp();

const appName = import.meta.env.VITE_APP_NAME || 'AutoPrimeBot';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name.startsWith('Student/'):
            case name === 'Admin/Attendance/Screen':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TelegramThemeProvider>
                <TooltipProvider delayDuration={0}>
                    {app}
                    <Toaster />
                </TooltipProvider>
            </TelegramThemeProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
