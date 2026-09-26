import { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Send, Lock, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { User as UserType } from '@/types';

interface PageProps {
    user: UserType;
}

export default function ProfileEdit({ user }: PageProps) {
    const { t } = useTranslation();

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        name: user.name || '',
        phone: user.phone || '',
        telegram_id: user.telegram_id || '',
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/profile', {
            onSuccess: () => {
                setData('current_password', '');
                setData('password', '');
                setData('password_confirmation', '');
                clearErrors();
                toast.success(t('profile.updated_success', 'Profil ma\'lumotlari yangilandi'));
            },
            onError: () => {
                toast.error(t('common.error', 'Xatolik yuz berdi'));
            },
        });
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl space-y-6">
            <Head title={t('profile.title', 'Profil sozlomalari')} />

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('profile.title', 'Profil sozlomalari')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('profile.description', 'Shaxsiy ma\'lumotlar va parolni yangilashingiz mumkin')}
                </p>
            </div>

            {/* Profile Information Card */}
            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <span>{user.name}</span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-normal uppercase">
                                {user.role}
                            </span>
                        </h2>
                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-1.5">
                                <User className="w-4 h-4 text-muted-foreground" />
                                {t('admins.name', 'F.I.SH')}
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <div className="text-destructive text-sm mt-1">{errors.name}</div>}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                {t('admins.phone', 'Telefon raqami')}
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value.replace(/[^0-9+]/g, ''))}
                                required
                            />
                            {errors.phone && <div className="text-destructive text-sm mt-1">{errors.phone}</div>}
                        </div>

                        {/* Telegram ID */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="telegram_id" className="flex items-center gap-1.5">
                                <Send className="w-4 h-4 text-muted-foreground" />
                                {t('common.telegram_id_optional', 'Telegram ID (Ixtiyoriy)')}
                            </Label>
                            <Input
                                id="telegram_id"
                                value={data.telegram_id}
                                onChange={(e) => setData('telegram_id', e.target.value)}
                                placeholder="111111111"
                            />
                            {errors.telegram_id && <div className="text-destructive text-sm mt-1">{errors.telegram_id}</div>}
                        </div>
                    </div>

                    {/* Password Section */}
                    <div className="pt-4 border-t space-y-4">
                        <div>
                            <h3 className="text-base font-semibold flex items-center gap-2">
                                <Lock className="w-4 h-4 text-muted-foreground" />
                                {t('profile.change_password', 'Parolni o\'zgartirish')}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {t('profile.password_hint', "Agar parolni o'zgartirmoqchi bo'lsangiz, quyidagi maydonlarni to'ldiring")}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="current_password">{t('profile.current_password', 'Joriy parol')}</Label>
                                <Input
                                    id="current_password"
                                    type="password"
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    placeholder="••••••••"
                                />
                                {errors.current_password && <div className="text-destructive text-sm mt-1">{errors.current_password}</div>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">{t('profile.new_password', 'Yangi parol')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                                {errors.password && <div className="text-destructive text-sm mt-1">{errors.password}</div>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">{t('profile.confirm_password', 'Parolni tasdiqlash')}</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    placeholder="••••••••"
                                />
                                {errors.password_confirmation && <div className="text-destructive text-sm mt-1">{errors.password_confirmation}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto min-w-[140px]">
                            <Save className="w-4 h-4 mr-2" />
                            {processing ? t('common.saving', 'Saqlanmoqda...') : t('common.save', 'Saqlash')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
