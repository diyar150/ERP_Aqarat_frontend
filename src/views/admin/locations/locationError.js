export function locationError(err, t) {
    const status = err.response?.status;
    const errorData = err.response?.data?.error;
    const message = errorData?.message || '';
    const fields = errorData?.fields;

    if (status === 409) {
        if (/already/i.test(message)) {
            return t('locations.duplicate');
        }
        if (fields && typeof fields === 'object') {
            const parts = [];
            if (fields.neighborhoods) parts.push(`${fields.neighborhoods} ${t('locations.neighborhoods')}`);
            if (fields.properties) parts.push(`${fields.properties} ${t('locations.properties')}`);
            if (fields.branches) parts.push(`${fields.branches} ${t('locations.branches')}`);
            if (fields.parties) parts.push(`${fields.parties} ${t('locations.parties')}`);
            if (parts.length > 0) {
                return t('locations.in_use_detailed', { count: parts.join(', ') });
            }
        }
        return t('locations.in_use');
    }

    if (status === 422 && fields && typeof fields === 'object') {
        const first = Object.values(fields).find((val) => typeof val === 'string');
        if (first) return first;
    }

    return message || t('login.error');
}
