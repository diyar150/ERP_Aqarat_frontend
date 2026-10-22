import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ar from './locales/ar.json';
import ckb from './locales/ckb.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ar: { translation: ar },
            ckb: { translation: ckb },
        },
        fallbackLng: ['en', 'ckb'],
        supportedLngs: SUPPORTED_LANGUAGES,
        lng: DEFAULT_LANGUAGE,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
