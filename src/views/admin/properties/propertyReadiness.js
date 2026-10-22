/**
 * Client-side draft readiness gaps — mirrors backend assertWorkingListing.
 * Returns field keys: price | currency_id | city | address | owner
 */
export function draftReadinessKeys(property) {
    if (!property || property.status !== 'draft') return [];

    const gaps = [];
    if (property.price == null || property.price === '') gaps.push('price');
    if (!property.currency_id) gaps.push('currency_id');
    if (!property.city) gaps.push('city');
    if (!property.address && !property.district && !property.neighborhood) gaps.push('address');

    const openOwners = Array.isArray(property.owners)
        ? property.owners.filter((row) => !row.effective_to).length
        : Number(property.owner_count || 0);
    if (openOwners < 1) gaps.push('owner');

    return gaps;
}

export function draftReadinessGaps(property, t) {
    const labels = {
        price: t('properties.price'),
        currency_id: t('properties.currency'),
        city: t('properties.city'),
        address: t('properties.location'),
        owner: t('properties.owners'),
    };
    return draftReadinessKeys(property).map((key) => labels[key] || key);
}

export function draftNotReadyMessage(property, t) {
    const gaps = draftReadinessGaps(property, t);
    if (!gaps.length) return '';
    return t('properties.not_ready', { fields: gaps.join(', ') });
}

export function draftReadinessChip(property, t) {
    const keys = draftReadinessKeys(property);
    if (!keys.length) return '';
    if (keys.length === 1 && keys[0] === 'owner') return t('properties.needs_owners');
    return t('properties.incomplete');
}

export function fieldsNotReadyMessage(fields, t) {
    if (!fields || typeof fields !== 'object') return '';
    const labels = {
        price: t('properties.price'),
        currency_id: t('properties.currency'),
        city: t('properties.city'),
        address: t('properties.location'),
        owner: t('properties.owners'),
    };
    const names = Object.keys(fields).map((key) => labels[key] || key);
    if (!names.length) return '';
    return t('properties.not_ready', { fields: names.join(', ') });
}
