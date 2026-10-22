/**
 * Strip control chars and normalize whitespace for @react-pdf Text nodes.
 */
export function sanitizePdfText(value) {
    if (value == null) return '';
    return String(value)
        // eslint-disable-next-line no-control-regex -- PDF text nodes reject control chars
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
