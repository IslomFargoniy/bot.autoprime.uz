import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';

export interface LeadFormData {
    full_name: string;
    phone: string;
    category: string;
    branch_id: string;
    source: string;
    preferred_time: string;
    birth_date: string;
    address: string;
    passport_series: string;
    passport_number: string;
    pinfl: string;
    notes: string;
}

interface Props {
    data: LeadFormData;
    setData: (key: keyof LeadFormData, value: string) => void;
    errors: Partial<Record<string, string>>;
    branches: Array<{ id: number; name: string }>;
}

/**
 * Lead details shared by the "new lead" and "edit lead" dialogs.
 */
export function LeadFormFields({ data, setData, errors, branches }: Props) {
    const { t } = useTranslation();
    const messages = Object.values(errors).filter(Boolean);

    return (
        <>
            <div>
                <Label required htmlFor="full_name">
                    {t('leads.full_name', 'Mijoz F.I.O')}
                </Label>
                <Input
                    id="full_name"
                    value={data.full_name}
                    onChange={(e) => setData('full_name', e.target.value)}
                    placeholder="Familiya Ism Sharif"
                    required
                    className="mt-1"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label required htmlFor="phone">
                        {t('leads.phone', 'Telefon')}
                    </Label>
                    <Input
                        id="phone"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        placeholder="+998"
                        required
                        className="mt-1 font-mono"
                    />
                </div>
                <div>
                    <Label htmlFor="category">
                        {t('leads.category', 'Toifa')}
                    </Label>
                    <SearchableSelect
                        id="category"
                        value={data.category}
                        onChange={(val) => setData('category', String(val))}
                        options={[
                            { value: 'B', label: 'B toifa' },
                            { value: 'A', label: 'A toifa' },
                            { value: 'C', label: 'C toifa' },
                            { value: 'BC', label: 'BC toifa' },
                            { value: 'D', label: 'D toifa' },
                        ]}
                        className="mt-1"
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label htmlFor="branch_id">
                        {t('leads.branch', 'Filial')}
                    </Label>
                    <SearchableSelect
                        id="branch_id"
                        value={data.branch_id}
                        onChange={(val) =>
                            setData('branch_id', val ? String(val) : '')
                        }
                        options={branches.map((b) => ({
                            value: String(b.id),
                            label: b.name,
                        }))}
                        placeholder={t('leads.branch', 'Filial')}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label htmlFor="source">{t('leads.source', 'Manba')}</Label>
                    <SearchableSelect
                        id="source"
                        value={data.source}
                        onChange={(val) => setData('source', String(val))}
                        options={[
                            {
                                value: 'reception_manual',
                                label: t(
                                    'leads.source_reception_manual',
                                    'Reception',
                                ),
                            },
                            {
                                value: 'telegram_bot',
                                label: t(
                                    'leads.source_telegram_bot',
                                    'Telegram bot',
                                ),
                            },
                            {
                                value: 'instagram',
                                label: t('leads.source_instagram', 'Instagram'),
                            },
                            {
                                value: 'website',
                                label: t('leads.source_website', 'Vebsayt'),
                            },
                            {
                                value: 'recommendation',
                                label: t(
                                    'leads.source_recommendation',
                                    'Tavsiya',
                                ),
                            },
                            {
                                value: 'walk_in',
                                label: t(
                                    'leads.source_walk_in',
                                    "O'zi kelgan (Ofis)",
                                ),
                            },
                        ]}
                        className="mt-1"
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label htmlFor="preferred_time">
                        {t('leads.preferred_time', "Qulay o'qish vaqti")}
                    </Label>
                    <Input
                        id="preferred_time"
                        value={data.preferred_time}
                        onChange={(e) =>
                            setData('preferred_time', e.target.value)
                        }
                        placeholder="09:00 - 11:00 / Kechki"
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label htmlFor="birth_date">
                        {t('leads.birth_date', "Tug'ilgan sana")}
                    </Label>
                    <DatePicker
                        id="birth_date"
                        value={data.birth_date}
                        onChange={(val) => setData('birth_date', val)}
                        className="mt-1"
                    />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <Label htmlFor="passport_series">
                        {t('leads.passport_series', 'Seriya')}
                    </Label>
                    <Input
                        id="passport_series"
                        value={data.passport_series}
                        onChange={(e) =>
                            setData(
                                'passport_series',
                                e.target.value.toUpperCase(),
                            )
                        }
                        placeholder="AA"
                        maxLength={10}
                        className="mt-1 font-mono uppercase"
                    />
                </div>
                <div>
                    <Label htmlFor="passport_number">
                        {t('leads.passport_number', 'Raqam')}
                    </Label>
                    <Input
                        id="passport_number"
                        value={data.passport_number}
                        onChange={(e) =>
                            setData('passport_number', e.target.value)
                        }
                        placeholder="1234567"
                        maxLength={20}
                        className="mt-1 font-mono"
                    />
                </div>
                <div>
                    <Label htmlFor="pinfl">{t('leads.pinfl', 'JSHSHIR')}</Label>
                    <Input
                        id="pinfl"
                        value={data.pinfl}
                        onChange={(e) => setData('pinfl', e.target.value)}
                        placeholder="14 xonali"
                        maxLength={20}
                        className="mt-1 font-mono"
                    />
                </div>
            </div>
            <div>
                <Label htmlFor="address">
                    {t('leads.address', 'Yashash manzili')}
                </Label>
                <Input
                    id="address"
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                    placeholder="Toshkent sh., Chilonzor tumani..."
                    className="mt-1"
                />
            </div>
            <div>
                <Label htmlFor="notes">{t('leads.notes', 'Izoh')}</Label>
                <Input
                    id="notes"
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    placeholder="Qo'shimcha eslatma..."
                    className="mt-1"
                />
            </div>
            {messages.length > 0 && (
                <ul className="space-y-0.5 text-xs text-rose-500">
                    {messages.map((message) => (
                        <li key={message}>{message}</li>
                    ))}
                </ul>
            )}
        </>
    );
}
