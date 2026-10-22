import { formatPrice, currencyLabel } from '@/utils/money.js';

export const emptyTransactionForm = {
    reference_number: '',
    transaction_type: 'sale',
    currency_id: '',
    purchase_price: '',
    down_payment: '',
    rent_amount: '',
    deposit_amount: '',
    period_start: '',
    period_end: '',
    buyer_side_kind: 'percent',
    buyer_side: '1',
    seller_side_kind: 'percent',
    seller_side: '1',
    staff_kind: 'percent',
    staff_amount: '',
};

function blank(value) {
    return value == null || String(value).trim() === '';
}

function positive(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0;
}

export function optionLabel(row, fields) {
    return fields.map((field) => row?.[field]).filter(Boolean).join(' · ');
}

export function commissionLine(kind, value, payerSide) {
    if (value == null || String(value).trim() === '') return null;
    if (kind === 'percent') {
        return {
            beneficiary_kind: 'agency',
            payer_side: payerSide,
            calc_kind: 'percent',
            rate_percent: value,
        };
    }
    return {
        beneficiary_kind: 'agency',
        payer_side: payerSide,
        calc_kind: 'flat',
        amount: value,
    };
}

export function buildCommissions(form, { principalRole, counterpartyRole, staffAgent }) {
    const lines = [
        commissionLine(form.buyer_side_kind, form.buyer_side, principalRole),
        commissionLine(form.seller_side_kind, form.seller_side, counterpartyRole),
    ].filter(Boolean);
    if (staffAgent?.id && form.staff_amount) {
        lines.push(form.staff_kind === 'percent'
            ? {
                beneficiary_kind: 'staff',
                beneficiary_user_id: Number(staffAgent.id),
                calc_kind: 'percent',
                rate_percent: form.staff_amount,
            }
            : {
                beneficiary_kind: 'staff',
                beneficiary_user_id: Number(staffAgent.id),
                calc_kind: 'flat',
                amount: form.staff_amount,
            });
    }
    return lines;
}

export function buildTransactionPayload({
    form,
    property,
    principal,
    counterparty,
    staffAgent,
    assignedUserId,
}) {
    const sale = form.transaction_type === 'sale';
    const principalRole = sale ? 'buyer' : 'renter';
    const counterpartyRole = sale ? 'seller' : 'owner';
    return {
        reference_number: form.reference_number,
        transaction_type: form.transaction_type,
        property_id: Number(property?.id),
        currency_id: Number(form.currency_id),
        assigned_user_id: assignedUserId,
        parties: [
            { party_id: Number(principal?.id), participant_role: principalRole },
            { party_id: Number(counterparty?.id), participant_role: counterpartyRole },
        ],
        purchase_price: sale ? form.purchase_price : null,
        down_payment: sale ? (form.down_payment || '0') : null,
        rent_amount: sale ? null : form.rent_amount,
        deposit_amount: sale ? null : (form.deposit_amount || '0'),
        period_start: sale ? null : form.period_start,
        period_end: sale ? null : form.period_end,
        commissions: buildCommissions(form, { principalRole, counterpartyRole, staffAgent }),
    };
}

/** Client-side create validation. Returns field keys with i18n messages for red borders. */
export function validateTransactionCreate({
    form,
    property,
    principal,
    counterparty,
    staffAgent,
    sale,
    t,
}) {
    const errors = {};
    const required = t('common.required');

    if (blank(form.reference_number)) errors.reference_number = required;
    if (!property?.id) errors.property = required;
    if (!principal?.id) errors.principal = required;
    if (!counterparty?.id) errors.counterparty = required;
    if (principal?.id && counterparty?.id && Number(principal.id) === Number(counterparty.id)) {
        errors.counterparty = t('transactions.errors.parties_distinct');
    }
    if (!form.currency_id) errors.currency_id = required;

    if (sale) {
        if (blank(form.purchase_price)) errors.purchase_price = required;
        else if (!positive(form.purchase_price)) {
            errors.purchase_price = t('transactions.errors.price_required');
        }
        if (!blank(form.down_payment) && positive(form.purchase_price)
            && Number(form.down_payment) > Number(form.purchase_price)) {
            errors.down_payment = t('transactions.errors.down_payment_exceeds');
        }
    } else {
        if (blank(form.rent_amount)) errors.rent_amount = required;
        else if (!positive(form.rent_amount)) {
            errors.rent_amount = t('transactions.errors.rent_required');
        }
        if (blank(form.period_start)) errors.period_start = required;
        if (blank(form.period_end)) errors.period_end = required;
        if (!blank(form.period_start) && !blank(form.period_end) && form.period_end < form.period_start) {
            errors.period_end = t('transactions.errors.period_invalid');
        }
    }

    const hasBuyer = !blank(form.buyer_side);
    const hasSeller = !blank(form.seller_side);
    if (!hasBuyer && !hasSeller) {
        errors.buyer_side = required;
        errors.seller_side = required;
    }

    if (staffAgent?.id && blank(form.staff_amount)) {
        errors.staff_amount = required;
    }

    if (staffAgent?.id && !blank(form.staff_amount)) {
        const base = sale ? Number(form.purchase_price || 0) : Number(form.rent_amount || 0);
        const agencyTotal = ['buyer_side', 'seller_side'].reduce((sum, key) => {
            const value = form[key];
            if (blank(value)) return sum;
            const kind = key === 'buyer_side' ? form.buyer_side_kind : form.seller_side_kind;
            const amount = kind === 'percent' ? (base * Number(value) / 100) : Number(value);
            return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);
        const staffAmount = form.staff_kind === 'percent'
            ? (base * Number(form.staff_amount) / 100)
            : Number(form.staff_amount);
        if (Number.isFinite(staffAmount) && staffAmount > agencyTotal + 1e-8) {
            errors.staff_amount = t('transactions.errors.staff_exceeds_agency');
        }
    }

    return errors;
}

/** Map API validation fields onto create-form keys. */
export function mapTransactionFieldErrors(fields = {}) {
    const next = { ...fields };
    if (fields.property_id) next.property = fields.property_id;
    if (fields.parties) {
        next.principal = fields.parties;
        next.counterparty = fields.parties;
    }
    if (fields.commissions) {
        next.buyer_side = fields.commissions;
        next.seller_side = fields.commissions;
    }
    return next;
}

export function dealWhen(value) {
    if (!value) return '—';
    return String(value).replace('T', ' ').slice(0, 10);
}

export function dealAmount(row) {
    if (!row) return '—';
    const amount = row.transaction_type === 'rent' ? row.rent_amount : row.purchase_price;
    if (amount == null || amount === '') return '—';
    const currency = currencyLabel(row.currency_symbol || row.currency_code);
    return `${formatPrice(amount)}${currency ? ` ${currency}` : ''}`;
}

export function dealPeriod(row) {
    if (!row || row.transaction_type !== 'rent') return '—';
    const span = [dealWhen(row.period_start), dealWhen(row.period_end)].filter((value) => value !== '—').join(' – ');
    return span || '—';
}

export function dealParties(row, t) {
    const parties = row?.parties || [];
    if (!parties.length) return '—';
    return parties
        .map((party) => {
            const role = party.role || party.participant_role;
            const name = party.name || party.display_name || '';
            return `${t(`transactions.roles.${role}`, { defaultValue: role })} ${name}`.trim();
        })
        .join(' · ');
}
