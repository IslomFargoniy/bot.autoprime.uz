import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
    { code: 'uz', displayCode: 'UZ', label: "O'zbekcha", flag: '🇺🇿' },
    { code: 'krill', displayCode: 'ЎЗ', label: 'Ўзбекча', flag: '🇺🇿' },
    { code: 'ru', displayCode: 'RU', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', displayCode: 'EN', label: 'English', flag: '🇬🇧' },
] as const;

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const langCode = i18n.language?.split('-')[0] || 'uz';
    const currentLang = languages.find((l) => l.code === langCode) ?? languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1.5 cursor-pointer px-2.5 h-9 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
                    title={currentLang.label}
                >
                    <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                    <span className="text-xs font-semibold">{currentLang.flag} {currentLang.displayCode}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => {
                            i18n.changeLanguage(lang.code);
                            document.cookie = `locale=${lang.code}; path=/; max-age=31536000; SameSite=Lax`;
                        }}
                        className={`cursor-pointer gap-2 ${langCode === lang.code
                            ? 'bg-accent font-medium'
                            : ''
                            }`}
                    >
                        <span className="text-base leading-none">{lang.flag}</span>
                        <span>{lang.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
