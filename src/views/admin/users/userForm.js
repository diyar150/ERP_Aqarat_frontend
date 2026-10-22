export function userError(err, t, fallbackKey = 'user.fetch_error') {
    return err?.response?.data?.error?.message
        || err?.response?.data?.message
        || t(fallbackKey);
}

export function userFieldErrors(err) {
    const fields = err?.response?.data?.errors || err?.response?.data?.error?.fields;
    if (!fields || typeof fields !== 'object') return null;
    return fields;
}
