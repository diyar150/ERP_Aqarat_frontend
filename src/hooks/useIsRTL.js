import { useLanguageStore } from "@/store/languageStore";
import { isRtlLanguage } from "@/i18n/languages";

/**
 * Custom hook to determine if the current language is RTL (Arabic or Kurdish).
 * @returns {boolean} True if the language is RTL, false otherwise.
 */
const useIsRTL = () => {
    const { language } = useLanguageStore();
    return isRtlLanguage(language);
};

export default useIsRTL;
