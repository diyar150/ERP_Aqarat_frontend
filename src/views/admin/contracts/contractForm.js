import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel } from '@/utils/money.js';

export function contractNumber(id) {
    return `CTR-${id}`;
}

export function contractWhen(value) {
    if (!value) return '—';
    return String(value).replace('T', ' ').slice(0, 10);
}

export function contractAmount(row) {
    if (!row) return '—';
    const amount = row.transaction_type === 'rent' ? row.rent_amount : row.purchase_price;
    if (amount == null || amount === '') return '—';
    const currency = currencyLabel(row.currency_symbol || row.currency_code);
    return `${formatPrice(amount)}${currency ? ` ${currency}` : ''}`;
}

export function contractPeriod(row) {
    if (!row || row.transaction_type !== 'rent') return '—';
    const start = contractWhen(row.period_start);
    const end = contractWhen(row.period_end);
    const span = [start, end].filter((value) => value !== '—').join(' – ');
    return span || '—';
}

export function contractParties(row, t) {
    const parties = row?.parties || [];
    if (!parties.length) return '—';
    return parties
        .map((party) => `${t(`transactions.roles.${party.role}`, { defaultValue: party.role })} ${party.name}`.trim())
        .join(' · ');
}

export function contractFileSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function contractError(err, t) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || '';
    const fields = err.response?.data?.error?.fields || {};
    if (fields.reason) return t('contracts.reason_required');
    if (fields.version) return t('contracts.stale');
    if (fields.transaction_id) {
        return /not open/i.test(String(fields.transaction_id))
            ? t('contracts.deal_not_open')
            : t('contracts.deal_cancelled_issue');
    }
    if (fields.renewed_from_id) return t('contracts.renewal_property');
    if (fields.idempotency_key) return t('contracts.idempotency_invalid');
    if (status === 409 && /template/i.test(message)) return t('contracts.duplicate_template');
    if (status === 409 && /signed/i.test(message)) return t('contracts.signed_locked');
    if (status === 409 && /updated/i.test(message)) return t('contracts.stale');
    if (status === 409 && /reused/i.test(message)) return t('contracts.idempotency_reused');
    if (status === 409 && /progress/i.test(message)) return t('contracts.idempotency_busy');
    if (status === 409) return t('contracts.archived_locked');
    return message || t('login.error');
}

/** Fetch a contract/template PDF blob URL for in-app preview. Caller must revoke. */
export async function loadContractPdfUrl(row) {
    if (!row?.document_id) {
        throw new Error('missing_document');
    }
    const res = await fetch.get(`documents/${row.document_id}/file`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
}

export async function downloadContractFile(row) {
    const url = await loadContractPdfUrl(row);
    const link = document.createElement('a');
    link.href = url;
    link.download = row.original_name || 'contract.pdf';
    link.click();
    URL.revokeObjectURL(url);
}

