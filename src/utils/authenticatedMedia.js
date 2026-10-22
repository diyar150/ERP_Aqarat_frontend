/**
 * True when a logo string can be embedded in a React-PDF Image.
 * Accepts data URLs and absolute http(s) URLs.
 */
export function isPdfEmbeddableLogo(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    const src = value.trim();
    if (src.startsWith('data:image/')) {
        const comma = src.indexOf(',');
        return comma > 10 && src.length > comma + 8;
    }
    return /^https?:\/\//i.test(src);
}
