import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import krill from './locales/krill.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            uz: { translation: uz },
            krill: { translation: krill },
            ru: { translation: ru },
            en: { translation: en },
        },
        fallbackLng: 'uz',
        lng: typeof window !== 'undefined' ? (localStorage.getItem('i18nextLng') || 'uz') : 'uz',
        load: 'languageOnly',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    });

i18n.on('languageChanged', (lng) => {
    if (lng && typeof document !== 'undefined') {
        const langCode = lng.split('-')[0];

        if (['uz', 'krill', 'ru', 'en'].includes(langCode)) {
            document.cookie = `locale=${langCode}; path=/; max-age=31536000; SameSite=Lax`;
        }
    }
});

if (typeof document !== 'undefined') {
    const initialLng = i18n.language?.split('-')[0];

    if (initialLng && ['uz', 'krill', 'ru', 'en'].includes(initialLng)) {
        document.cookie = `locale=${initialLng}; path=/; max-age=31536000; SameSite=Lax`;
    }
}

export default i18n;
