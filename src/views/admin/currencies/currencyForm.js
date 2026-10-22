export function currencyError(err, t, fallbackKey = 'currencies.fetch_error') {
    const data = err?.response?.data;
    return data?.errors?.is_main_currency
        || data?.errors?.exchange_rate
        || data?.error?.message
        || data?.message
        || t(fallbackKey);
}

export function currencyFieldErrors(err) {
    const fields = err?.response?.data?.errors || err?.response?.data?.error?.fields;
    if (!fields || typeof fields !== 'object') return null;
    return fields;
}
