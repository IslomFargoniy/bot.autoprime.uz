// @ts-nocheck
import React, { useEffect } from 'react';

export function TelegramThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const tg = (window as any).Telegram?.WebApp;

        // Auto scroll focused input into view on mobile devices / Telegram WebApp
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                }, 100);
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                }, 400);
            }
        };

        const handleViewportResize = () => {
            const activeEl = document.activeElement as HTMLElement;
            if (activeEl && ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeEl.tagName)) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        };

        // Universal Touch-to-Focus fix for Telegram Mini App webview gesture bug
        const handleTouchStart = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                if ((target as HTMLInputElement).disabled || (target as HTMLInputElement).readOnly) return;
                if (document.activeElement !== target) {
                    target.focus();
                }
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('focusin', handleFocusIn);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }

        if (!tg || tg.platform === 'unknown') {
            return () => {
                document.removeEventListener('touchstart', handleTouchStart);
                document.removeEventListener('focusin', handleFocusIn);
                if (window.visualViewport) {
                    window.visualViewport.removeEventListener('resize', handleViewportResize);
                }
            };
        }

        const updateTheme = () => {
            const theme = tg.themeParams;
            const root = document.documentElement;

            if (theme?.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
            if (theme?.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
            if (theme?.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
            if (theme?.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
            if (theme?.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
            if (theme?.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
            if (theme?.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);

            if (tg.colorScheme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        const handleViewportChange = () => {
            if (tg.viewportHeight) {
                document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
            }
            handleViewportResize();
        };

        const updateSafeArea = () => {
            const root = document.documentElement;
            if (tg.contentSafeAreaInset?.top !== undefined) {
                root.style.setProperty('--tg-content-safe-area-inset-top', `${tg.contentSafeAreaInset.top}px`);
            }
            if (tg.safeAreaInset?.top !== undefined) {
                root.style.setProperty('--tg-safe-area-inset-top', `${tg.safeAreaInset.top}px`);
            }
        };

        if (tg.onEvent) {
            tg.onEvent('themeChanged', updateTheme);
            tg.onEvent('viewportChanged', handleViewportChange);
            tg.onEvent('contentSafeAreaChanged', updateSafeArea);
            tg.onEvent('safeAreaChanged', updateSafeArea);
        }
        updateTheme();
        handleViewportChange();
        updateSafeArea();

        tg.ready();
        tg.expand();

        if (tg.isVersionAtLeast?.('8.0') && typeof tg.requestFullscreen === 'function') {
            try {
                tg.requestFullscreen();
            } catch {
                // Fullscreen unsupported or rejected by client
            }
        }

        if (tg.isVersionAtLeast?.('7.7') && typeof tg.disableVerticalSwipes === 'function') {
            tg.disableVerticalSwipes();
        }

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('focusin', handleFocusIn);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportResize);
            }
            if (tg.offEvent) {
                tg.offEvent('themeChanged', updateTheme);
                tg.offEvent('viewportChanged', handleViewportChange);
            }
        };
    }, []);

    return <>{children}</>;
}

export const useHaptic = () => {
    const impact = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
        (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    };

    const notification = (type: 'error' | 'success' | 'warning') => {
        (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    };

    const selection = () => {
        (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    };

    return { impact, notification, selection };
};
