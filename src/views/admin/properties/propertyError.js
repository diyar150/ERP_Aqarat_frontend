/**
 * Handles error messages and structured 409 Conflict breakdown for properties.
 */
export function propertyError(err, t) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || '';
    const fields = err.response?.data?.error?.fields;

    if (status === 409 && fields && typeof fields === 'object') {
        const parts = [];
        if (fields.deals) parts.push(`${fields.deals} ${t('properties.linked_deals', { defaultValue: 'deals' })}`);
        if (fields.units) parts.push(`${fields.units} ${t('properties.linked_units', { defaultValue: 'sub-units' })}`);
        if (fields.contracts) parts.push(`${fields.contracts} ${t('properties.linked_contracts', { defaultValue: 'contracts' })}`);
        if (fields.settlements) parts.push(`${fields.settlements} ${t('properties.linked_settlements', { defaultValue: 'settlements' })}`);
        if (fields.ownerships) parts.push(`${fields.ownerships} ${t('properties.linked_ownerships', { defaultValue: 'ownership records' })}`);
        if (parts.length > 0) {
            return `${t('properties.in_use')} (${parts.join(', ')})`;
        }
        return t('properties.in_use');
    }

    if (status === 409 && /in use/i.test(message)) return t('properties.in_use');

    if (fields && typeof fields === 'object') {
        const first = Object.values(fields).find((val) => typeof val === 'string' && val);
        if (first) return first;
    }

    return message || t('login.error');
}

export function propertyWhen(value) {
    if (!value) return '—';
    return String(value).replace('T', ' ').slice(0, 10);
}
