export const SUPPORTED_LANGUAGES = ['ckb', 'ar', 'en'];
export const DEFAULT_LANGUAGE = 'ckb';
export const RTL_LANGUAGES = ['ckb', 'ar'];

export function isRtlLanguage(lng) {
    return RTL_LANGUAGES.includes(lng);
}

export function normalizeLanguage(lng) {
    return SUPPORTED_LANGUAGES.includes(lng) ? lng : DEFAULT_LANGUAGE;
}
