export function rateError(err, t, fallbackKey = 'currency_exchange_rates.fetch_error') {
    const data = err?.response?.data;
    return data?.error?.message
        || data?.message
        || t(fallbackKey);
}

export function rateFieldErrors(err) {
    const fields = err?.response?.data?.errors || err?.response?.data?.error?.fields;
    if (!fields || typeof fields !== 'object') return null;
    return fields;
}

export function todayDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function asDateInput(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    } catch {
        return '';
    }
}

export function currencyLabel(currency) {
    if (!currency) return '';
    const name = currency.name || '';
    const symbol = currency.symbol ? ` (${currency.symbol})` : '';
    return `${name}${symbol}`;
}
