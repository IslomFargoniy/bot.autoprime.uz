// @ts-nocheck
import { useEffect, useState } from 'react';
import { Form, Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    const { t } = useTranslation();
    const [authenticating, setAuthenticating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.initData) {
            tg.ready();
            tg.expand();
            setAuthenticating(true);

            fetch('/api/telegram-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ initData: tg.initData }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && data.redirect) {
                        window.location.href = data.redirect;
                    } else {
                        setAuthenticating(false);
                        if (data.message) {
                            setAuthError(data.message);
                        }
                    }
                })
                .catch(() => {
                    setAuthenticating(false);
                });
        }
    }, []);

    if (authenticating) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Spinner className="w-8 h-8 text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                    {t('auth.auto_logging_in', 'Telegram orqali avtomatik kirilmoqda...')}
                </p>
            </div>
        );
    }

    return (
        <>
            <Head title={t('auth.login_title', 'Tizimga kirish')} />

            {authError && (
                <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 text-center font-medium">
                    {authError}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="phone">{t('auth.phone', 'Telefon raqam')}</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    name="phone"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="username"
                                    placeholder="+998911157709"
                                    onInput={(e) => {
                                        e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+]/g, '');
                                    }}
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">{t('auth.password', 'Parol')}</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">{t('auth.remember_me', 'Meni eslab qol')}</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {t('auth.login_button', 'Tizimga kirish')}
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Tizimga kirish',
    description: 'Tizimga kirish uchun telefon raqamingiz va parolingizni kiriting',
};
