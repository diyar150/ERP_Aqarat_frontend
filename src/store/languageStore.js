// store/languageStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../i18n/languages';

export const useLanguageStore = create(
    persist(
        (set) => ({
            language: DEFAULT_LANGUAGE,
            setLanguage: (lang) => {
                const language = normalizeLanguage(lang);
                set({ language });
                localStorage.setItem('language', language);
                i18n.changeLanguage(language);
            },
        }),
        {
            name: 'language-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const language = normalizeLanguage(state.language);
                    if (language !== state.language) {
                        state.language = language;
                    }
                    localStorage.setItem('language', language);
                    i18n.changeLanguage(language);
                }
            }
        }
    )
);

export const initializeLanguage = () => {
    const savedLanguage = normalizeLanguage(useLanguageStore.getState().language);
    useLanguageStore.setState({ language: savedLanguage });
    localStorage.setItem('language', savedLanguage);
    i18n.changeLanguage(savedLanguage);
};