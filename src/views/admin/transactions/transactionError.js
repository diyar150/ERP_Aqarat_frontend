/**
 * Handles error messages and structured 409 Conflict breakdown for transactions.
 */
export function transactionError(err, t) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || '';
    const fields = err.response?.data?.error?.fields;

    if (status === 409 && fields && typeof fields === 'object') {
        const parts = [];
        if (fields.contracts) parts.push(`${fields.contracts} ${t('transactions.linked_active_contracts', { defaultValue: 'active contracts' })}`);
        if (fields.posted_entries) parts.push(`${fields.posted_entries} ${t('transactions.linked_posted_entries', { defaultValue: 'posted financial entries' })}`);
        if (fields.earned_commissions) parts.push(`${fields.earned_commissions} ${t('transactions.linked_earned_commissions', { defaultValue: 'earned commissions' })}`);
        if (fields.is_completed) parts.push(t('transactions.is_completed_deal', { defaultValue: 'completed deal' }));
        if (parts.length > 0) {
            return `${t('transactions.in_use', { defaultValue: 'Cannot delete deal with active business records' })} (${parts.join(', ')})`;
        }
        return t('transactions.in_use', { defaultValue: 'Transaction has active linked records' });
    }

    if (status === 409 && /cannot delete/i.test(message)) {
        return t('transactions.in_use', { defaultValue: 'Transaction has active linked records and cannot be deleted' });
    }

    if (fields && typeof fields === 'object') {
        const first = Object.values(fields).find((val) => typeof val === 'string' && val);
        if (first) return first;
    }

    return message || t('login.error', { defaultValue: 'An error occurred' });
}

export function transactionWhen(value) {
    if (!value) return '—';
    return String(value).replace('T', ' ').slice(0, 10);
}
