import { formatPrice, plainPrice } from '@/utils/money.js';

export const PARTY_ROLES = ['client', 'lead', 'buyer', 'renter', 'owner', 'seller', 'contact'];
export const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'land', 'commercial', 'office', 'warehouse', 'building'];
export const PURPOSES = ['sale', 'rent', 'sale_or_rent'];
export const CHANNELS = ['phone', 'email', 'visit', 'message', 'other'];
export const DIRECTIONS = ['inbound', 'outbound'];
export const ACTIVITY_TYPES = ['call', 'visit', 'viewing', 'follow_up', 'other'];
export const PIPELINE_STAGES = ['lead', 'qualified', 'viewing', 'negotiating', 'won', 'lost'];

export const emptyParty = {
    display_name: '',
    email: '',
    phone: '',
    address: '',
    party_kind: 'person',
    roles: ['lead'],
    branch_id: '',
    city_id: '',
    pipeline_stage: 'lead',
};

export const emptyPreference = {
    purpose: '',
    property_type: '',
    min_price: '',
    max_price: '',
    city: '',
    district: '',
    min_area: '',
    max_area: '',
    rooms: '',
    bathrooms: '',
    requirements: '',
    currency_id: '',
};

export function partyPayload(form) {
    return {
        party_kind: form.party_kind,
        display_name: String(form.display_name || '').trim(),
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        city_id: form.city_id ? Number(form.city_id) : null,
        pipeline_stage: form.pipeline_stage || null,
        roles: form.roles,
    };
}

/** Client-side create/edit validation for empty required fields. */
export function validateParty(form, { branches = [], t }) {
    const errors = {};
    const required = t('common.required');
    if (!String(form.display_name || '').trim()) errors.display_name = required;
    if (branches.length > 0 && !form.branch_id) errors.branch_id = required;
    return errors;
}

function amountField(value) {
    if (value == null || value === '') return '';
    return formatPrice(value);
}

function moneyValue(value, places) {
    const plain = plainPrice(value);
    if (plain == null) return null;
    const trimmed = plain.endsWith('.') ? plain.slice(0, -1) : plain;
    if (!trimmed) return null;
    const dot = trimmed.indexOf('.');
    if (dot === -1) return trimmed;
    const fraction = trimmed.slice(dot + 1).replace(/\D/g, '').slice(0, places);
    return fraction ? `${trimmed.slice(0, dot)}.${fraction}` : trimmed.slice(0, dot);
}

export function preferencePayload(preference) {
    return {
        purpose: preference.purpose || null,
        property_type: preference.property_type || null,
        min_price: moneyValue(preference.min_price, 4),
        max_price: moneyValue(preference.max_price, 4),
        currency_id: preference.currency_id ? Number(preference.currency_id) : null,
        city: preference.city || null,
        district: preference.district || null,
        min_area: moneyValue(preference.min_area, 2),
        max_area: moneyValue(preference.max_area, 2),
        rooms: preference.rooms === '' ? null : Number(preference.rooms),
        bathrooms: preference.bathrooms === '' ? null : Number(preference.bathrooms),
        requirements: preference.requirements || null,
    };
}

export function preferenceFromParty(saved) {
    if (!saved) return { ...emptyPreference, currency_id: '' };
    return {
        purpose: saved.purpose || '',
        property_type: saved.property_type || '',
        min_price: amountField(saved.min_price),
        max_price: amountField(saved.max_price),
        currency_id: saved.currency_id ? String(saved.currency_id) : '',
        currency_code: saved.currency_code || '',
        city: saved.city || '',
        district: saved.district || '',
        min_area: amountField(saved.min_area),
        max_area: amountField(saved.max_area),
        rooms: saved.rooms ?? '',
        bathrooms: saved.bathrooms ?? '',
        requirements: saved.requirements || '',
    };
}

export function partyInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    const letters = parts.map((part) => part[0]).join('');
    return letters ? letters.toUpperCase() : '—';
}

export function partyWhen(value) {
    if (!value) return '—';
    return String(value).replace('T', ' ').slice(0, 16);
}

export function activityFeed(party) {
    const items = [
        ...(party.notes || []).map((item) => ({
            id: `note-${item.id}`,
            at: item.created_at,
            kind: 'note',
            title: '',
            body: item.body,
        })),
        ...(party.communications || []).map((item) => ({
            id: `communication-${item.id}`,
            at: item.occurred_at,
            kind: 'communication',
            channel: item.channel,
            direction: item.direction,
            title: item.subject || '',
            body: item.body || '',
        })),
        ...(party.activities || []).map((item) => ({
            id: `activity-${item.id}`,
            at: item.occurred_at,
            kind: 'activity',
            activity_type: item.activity_type,
            title: '',
            body: item.body,
        })),
    ];
    return items.sort((left, right) => String(right.at || '').localeCompare(String(left.at || '')));
}

export function partyError(err, t) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || '';
    const fields = err.response?.data?.error?.fields;
    if (status === 409 && fields && typeof fields === 'object') {
        const parts = [];
        if (fields.holdings) parts.push(`${fields.holdings} ${t('parties.holdings')}`);
        if (fields.deals) parts.push(`${fields.deals} ${t('parties.deals')}`);
        if (fields.entries) parts.push(`${fields.entries} ${t('parties.entries', { defaultValue: 'ledger entries' })}`);
        if (fields.settlements) parts.push(`${fields.settlements} ${t('parties.settlements', { defaultValue: 'settlements' })}`);
        if (parts.length > 0) {
            return `${t('parties.in_use')} (${parts.join(', ')})`;
        }
        return t('parties.in_use');
    }
    if (status === 409 && /in use/i.test(message)) return t('parties.in_use');
    if (fields && typeof fields === 'object') {
        const first = Object.values(fields).find((value) => typeof value === 'string' && value);
        if (first) return first;
    }
    return message || t('login.error');
}
