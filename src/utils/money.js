/** ISO / legacy labels → display text used across the admin UI. */
const CURRENCY_DISPLAY = {
    IQD: 'دینار',
    دينار: 'دینار',
    USD: 'دۆلار',
    $: 'دۆلار',
    دولار: 'دۆلار',
};

export function groupPriceInput(value) {
    const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
    if (!cleaned) return '';
    const dot = cleaned.indexOf('.');
    const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '');
    const fraction = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 4);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (fraction == null) return grouped;
    return `${grouped || '0'}.${fraction}`;
}

export function formatPrice(value) {
    const grouped = groupPriceInput(value);
    if (!grouped.includes('.')) return grouped;
    const [whole, fraction] = grouped.split('.');
    const trimmed = fraction.replace(/0+$/, '');
    return trimmed ? `${whole}.${trimmed}` : whole;
}

/** Human label for a currency code or symbol (IQD → دینار). */
export function currencyLabel(codeOrSymbol) {
    const raw = String(codeOrSymbol ?? '').trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    if (CURRENCY_DISPLAY[upper]) return CURRENCY_DISPLAY[upper];
    if (CURRENCY_DISPLAY[raw]) return CURRENCY_DISPLAY[raw];
    return raw;
}

/** Amount + currency label, e.g. `1,500 دینار`. */
export function moneyLabel(value, codeOrSymbol, empty = '—') {
    if (value == null || value === '') return empty;
    const numeric = Number(value);
    const amount = Number.isFinite(numeric)
        ? `${numeric < 0 ? '-' : ''}${formatPrice(Math.abs(numeric))}`
        : formatPrice(value);
    const label = currencyLabel(codeOrSymbol);
    return label ? `${amount} ${label}` : amount;
}

export function signedPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    const text = formatPrice(Math.abs(amount));
    return amount < 0 ? `-${text}` : text;
}

export function plainPrice(value) {
    if (value == null || value === '') return null;
    const plain = String(value).replace(/,/g, '');
    return plain || null;
}

/** positive | negative | neutral — for wallet / cash balance coloring. */
export function balanceTone(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount === 0) return 'neutral';
    return amount > 0 ? 'positive' : 'negative';
}
