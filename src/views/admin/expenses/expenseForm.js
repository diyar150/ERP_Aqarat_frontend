import { plainPrice } from '@/utils/money.js';

export function expenseError(err, t) {
    return err?.response?.data?.error?.message
        || err?.response?.data?.message
        || t('expenses.fetch_error');
}

export function expenseWhen(value) {
    if (!value) return '';
    return String(value).replace('T', ' ').slice(0, 10);
}

export function expenseNumber(id) {
    return `EXP-${id}`;
}

export function today() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
}

export function cashChanged(initial, form) {
    if (!initial) return false;
    // Currency is locked after create — do not treat it as an editable cash field.
    return plainPrice(initial.price) !== plainPrice(form.price)
        || String(initial.date || '') !== String(form.date || '')
        || String(initial.branch_id || '') !== String(form.branch_id || '')
        || String(initial.expense_category_id || '') !== String(form.expense_category_id || '');
}

/** Client-side create/edit validation for empty required fields. */
export function validateExpense(form, { offices = [], askReason = false, initial = null, t }) {
    const errors = {};
    const required = t('common.required');
    if (!String(form.name || '').trim()) errors.name = required;
    if (!form.expense_category_id) errors.expense_category_id = required;
    if (plainPrice(form.price) == null) errors.price = required;
    if (!form.currency_id) errors.currency_id = required;
    if (!form.branch_id) errors.branch_id = required;
    else if (offices.length > 0 && !offices.some((office) => String(office.id) === String(form.branch_id))) {
        errors.branch_id = t('expenses.branch_not_found');
    }
    if (!String(form.date || '').trim()) errors.date = required;
    if (askReason && cashChanged(initial, form) && !String(form.reason || '').trim()) {
        errors.reason = required;
    }
    return errors;
}
