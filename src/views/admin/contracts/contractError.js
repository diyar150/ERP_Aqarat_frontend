/**
 * Modern ERP Contract Error Helper.
 * Translates backend validation errors, 409 optimistic locking conflicts,
 * and SaaS permission checks into localized, actionable user notifications.
 */
export function contractError(err, t) {
    const status = err?.response?.status;
    const message = err?.response?.data?.error?.message || err?.response?.data?.message || '';
    const fields = err?.response?.data?.error?.fields || {};

    if (fields.reason) return t('contracts.reason_required', { defaultValue: 'A reason is required' });
    if (fields.version) return t('contracts.stale', { defaultValue: 'Record was modified by another user. Please reload.' });
    if (fields.transaction_id) {
        return /not open/i.test(String(fields.transaction_id))
            ? t('contracts.deal_not_open', { defaultValue: 'Only open deals can have contracts issued' })
            : t('contracts.deal_cancelled_issue', { defaultValue: 'Deal is not eligible for contract issuance' });
    }
    if (fields.renewed_from_id) {
        return t('contracts.renewal_property', { defaultValue: 'Renewal contract must be on the same property' });
    }
    if (fields.template_id) {
        if (/published/i.test(String(fields.template_id))) {
            return t('contracts.template_not_published', { defaultValue: 'Only published templates can be used to issue contracts' });
        }
        return t('contracts.template_required', { defaultValue: 'Please select a valid template' });
    }
    if (fields.idempotency_key) {
        return t('contracts.idempotency_invalid', { defaultValue: 'Invalid transaction submission key' });
    }

    if (status === 409) {
        if (/template/i.test(message)) {
            return t('contracts.duplicate_template', { defaultValue: 'Template with this name already exists' });
        }
        if (/signed/i.test(message)) {
            return t('contracts.signed_locked', { defaultValue: 'Signed contracts cannot be reissued or edited' });
        }
        if (/updated/i.test(message) || /stale/i.test(message)) {
            return t('contracts.stale', { defaultValue: 'Contract was modified by another user. Please reload and try again.' });
        }
        if (/reused/i.test(message)) {
            return t('contracts.idempotency_reused', { defaultValue: 'Request was already processed with different parameters' });
        }
        if (/progress/i.test(message)) {
            return t('contracts.idempotency_busy', { defaultValue: 'Contract generation is currently in progress. Please wait.' });
        }
        return t('contracts.archived_locked', { defaultValue: 'Archived contracts cannot be reissued' });
    }

    if (status === 404) {
        return t('contracts.not_found', { defaultValue: 'Contract or template not found' });
    }

    if (status === 403) {
        return t('common.forbidden', { defaultValue: 'You do not have permission to perform this action' });
    }

    return message || t('login.error', { defaultValue: 'An unexpected error occurred' });
}

export default contractError;
