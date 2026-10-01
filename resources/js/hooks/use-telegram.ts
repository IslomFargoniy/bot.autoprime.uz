// @ts-nocheck
import { router } from '@inertiajs/react';
import { useEffect } from 'react';

/**
 * Telegram Mini App ichida ekanligini aniqlash
 */
export function isTelegramWebApp(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return !!(window as any).Telegram?.WebApp?.initData;
}

/**
 * Headers carrying the Telegram-signed initData, which the server verifies to
 * identify the Mini App user. Empty outside Telegram.
 */
export function telegramInitDataHeaders(): Record<string, string> {
    if (typeof window === 'undefined') {
        return {};
    }

    const initData = (window as any).Telegram?.WebApp?.initData;

    return initData ? { 'X-Telegram-Init-Data': initData } : {};
}

/**
 * Telegram BackButton — ichki sahifalarda orqaga tugmasini ko'rsatish
 */
export function useTelegramBackButton(backUrl?: string) {
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const tg = (window as any).Telegram?.WebApp;

        if (!tg || !backUrl) {
            return;
        }

        try {
            if (!tg.isVersionAtLeast?.('6.1') || !tg.BackButton) {
                return;
            }

            tg.BackButton.show();
            const handler = () => router.visit(backUrl);
            tg.BackButton.onClick(handler);

            return () => {
                try {
                    tg.BackButton.offClick(handler);
                    tg.BackButton.hide();
                } catch {
                    // Ignore errors on unmount
                }
            };
        } catch {
            // Ignore unsupported WebApp errors
        }
    }, [backUrl]);
}

/**
 * Telegram HapticFeedback with safe fallback
 */
export function useTelegramHaptic() {
    return {
        light: () => {
            try {
                const tg =
                    typeof window !== 'undefined'
                        ? (window as any).Telegram?.WebApp
                        : undefined;

                if (tg && tg.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('light');
                }
            } catch {
                /* not running inside Telegram */
            }
        },
        medium: () => {
            try {
                const tg =
                    typeof window !== 'undefined'
                        ? (window as any).Telegram?.WebApp
                        : undefined;

                if (tg && tg.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
            } catch {
                /* not running inside Telegram */
            }
        },
        heavy: () => {
            try {
                const tg =
                    typeof window !== 'undefined'
                        ? (window as any).Telegram?.WebApp
                        : undefined;

                if (tg && tg.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('heavy');
                }
            } catch {
                /* not running inside Telegram */
            }
        },
        success: () => {
            try {
                const tg =
                    typeof window !== 'undefined'
                        ? (window as any).Telegram?.WebApp
                        : undefined;

                if (tg && tg.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
                    tg.HapticFeedback.notificationOccurred('success');
                }
            } catch {
                /* not running inside Telegram */
            }
        },
        error: () => {
            try {
                const tg =
                    typeof window !== 'undefined'
                        ? (window as any).Telegram?.WebApp
                        : undefined;

                if (tg && tg.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
                    tg.HapticFeedback.notificationOccurred('error');
                }
            } catch {
                /* not running inside Telegram */
            }
        },
        warning: () => {
            try {
                const tg =
                    typeof window !== 'undefined'
                        ? (window as any).Telegram?.WebApp
                        : undefined;

                if (tg && tg.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
                    tg.HapticFeedback.notificationOccurred('warning');
                }
            } catch {
                /* not running inside Telegram */
            }
        },
    };
}

/**
 * Initializes the Telegram Mini App safely by expanding it and disabling vertical swipes.
 */
export function initTelegramWebApp() {
    if (typeof window === 'undefined') {
        return;
    }

    const tg = (window as any).Telegram?.WebApp;

    if (!tg) {
        return;
    }

    try {
        tg.ready();
    } catch {
        /* not running inside Telegram */
    }

    try {
        tg.expand();
    } catch {
        /* not running inside Telegram */
    }

    if (
        tg.isVersionAtLeast?.('8.0') &&
        typeof tg.requestFullscreen === 'function'
    ) {
        try {
            tg.requestFullscreen();
        } catch {
            /* not running inside Telegram */
        }
    }

    if (
        tg.isVersionAtLeast?.('7.7') &&
        typeof tg.disableVerticalSwipes === 'function'
    ) {
        try {
            tg.disableVerticalSwipes();
        } catch {
            /* not running inside Telegram */
        }
    }
}
