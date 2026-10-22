export function branchError(err, t) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || '';
    const fields = err.response?.data?.error?.fields || {};
    if (fields.city_id && /inactive/i.test(String(fields.city_id))) return t('branches.city_inactive');
    if (fields.city_id) return t('locations.pick_city');
    if (fields.neighborhood_id) return t('branches.neighborhood_invalid');
    if (status === 409 && /code/i.test(message)) return t('branches.duplicate_code');
    if (status === 409 && /already/i.test(message)) return t('branches.duplicate');
    if (status === 409 && /stays open/i.test(message)) return t('branches.main_open');
    if (status === 409 && /another branch is main/i.test(message)) return t('branches.main_required');
    if (status === 409 && /no main branch/i.test(message)) return t('branches.no_main');
    if (status === 409 && /closed/i.test(message)) return t('branches.closed');
    return message || t('login.error');
}
