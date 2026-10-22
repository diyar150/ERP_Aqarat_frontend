export const BLOCK_TYPES = [
    { type: 'heading', labelKey: 'contracts.builder.block_heading' },
    { type: 'paragraph', labelKey: 'contracts.builder.block_paragraph' },
    { type: 'clause', labelKey: 'contracts.builder.block_clause' },
    { type: 'table', labelKey: 'contracts.builder.block_table' },
    { type: 'parties', labelKey: 'contracts.builder.block_parties' },
    { type: 'owners', labelKey: 'contracts.builder.block_owners' },
    { type: 'signature', labelKey: 'contracts.builder.block_signature' },
    { type: 'divider', labelKey: 'contracts.builder.block_divider' },
    { type: 'spacer', labelKey: 'contracts.builder.block_spacer' },
    { type: 'pagebreak', labelKey: 'contracts.builder.block_pagebreak' },
];

export const DEAL_TYPES = ['sale', 'rent', 'both'];
export const TEMPLATE_LOCALES = ['en', 'ar', 'ckb'];
export const LIFECYCLES = ['draft', 'published'];
export const ALIGN_OPTIONS = ['start', 'center', 'end'];
export const HEADING_SIZES = ['h1', 'h2'];
export const WHEN_OPTIONS = ['always', 'sale', 'rent'];
export const SIGNATURE_SLOT_PRESETS = {
    sale: ['agency', 'seller', 'buyer'],
    rent: ['agency', 'landlord', 'tenant'],
    both: ['agency', 'party'],
};

/** Print-safe ERP presets — hex stored on blocks for PDF parity. */
export const TEXT_COLOR_PRESETS = [
    { id: 'default', hex: null },
    { id: 'ink', hex: '#0f172a' },
    { id: 'slate', hex: '#475569' },
    { id: 'navy', hex: '#1e3a5f' },
    { id: 'teal', hex: '#0f766e' },
    { id: 'green', hex: '#166534' },
    { id: 'amber', hex: '#92400e' },
    { id: 'crimson', hex: '#991b1b' },
    { id: 'white', hex: '#ffffff' },
];

export const BACKGROUND_COLOR_PRESETS = [
    { id: 'none', hex: null },
    { id: 'mist', hex: '#f1f5f9' },
    { id: 'sky', hex: '#e0f2fe' },
    { id: 'mint', hex: '#dcfce7' },
    { id: 'sand', hex: '#fef3c7' },
    { id: 'rose', hex: '#ffe4e6' },
    { id: 'lavender', hex: '#ede9fe' },
    { id: 'navy', hex: '#1e3a5f' },
];

export const DEFAULT_TEXT_COLOR = '#0f172a';

export const MERGE_FIELDS = [
    { token: 'transaction.reference_number', labelKey: 'contracts.builder.token_deal_ref' },
    { token: 'transaction.type', labelKey: 'contracts.builder.token_deal_type' },
    { token: 'transaction.purchase_price', labelKey: 'contracts.builder.token_purchase_price' },
    { token: 'transaction.down_payment', labelKey: 'contracts.builder.token_down_payment' },
    { token: 'transaction.rent_amount', labelKey: 'contracts.builder.token_rent_amount' },
    { token: 'transaction.deposit_amount', labelKey: 'contracts.builder.token_deposit_amount' },
    { token: 'transaction.period_start', labelKey: 'contracts.builder.token_period_start' },
    { token: 'transaction.period_end', labelKey: 'contracts.builder.token_period_end' },
    { token: 'property.reference_number', labelKey: 'contracts.builder.token_property_ref' },
    { token: 'property.title', labelKey: 'contracts.builder.token_property_title' },
    { token: 'property.address', labelKey: 'contracts.builder.token_property_address' },
    { token: 'currency.code', labelKey: 'contracts.builder.token_currency' },
    { token: 'branch.name', labelKey: 'contracts.builder.token_branch' },
    { token: 'branch.phone', labelKey: 'contracts.builder.token_branch_phone' },
    { token: 'agency.name', labelKey: 'contracts.builder.token_agency_name' },
    { token: 'agency.address', labelKey: 'contracts.builder.token_agency_address' },
    { token: 'agency.phone', labelKey: 'contracts.builder.token_agency_phone' },
    { token: 'parties', labelKey: 'contracts.builder.token_parties' },
    { token: 'owner.name', labelKey: 'contracts.builder.token_owner_name' },
    { token: 'owner.phone', labelKey: 'contracts.builder.token_owner_phone' },
];

export const KNOWN_TOKENS = new Set(MERGE_FIELDS.map((field) => field.token.toLowerCase()));

export const SAMPLE_VALUES = {
    'transaction.reference_number': 'DEAL-0001',
    'transaction.type': 'rent',
    'transaction.purchase_price': '150000',
    'transaction.down_payment': '30000',
    'transaction.rent_amount': '750',
    'transaction.deposit_amount': '750',
    'transaction.period_start': '2026-01-01',
    'transaction.period_end': '2026-12-31',
    'property.reference_number': 'PR-0001',
    'property.title': 'Sample property',
    'property.address': 'Sample address',
    'currency.code': 'USD',
    'branch.name': 'Main office',
    'branch.phone': '07500000000',
    'agency.name': 'Sample Agency',
    'agency.address': 'Sample agency address',
    'agency.phone': '07501111111',
    parties: 'tenant: Sample tenant',
    'owner.name': 'Sample owner',
    'owner.phone': '07000000000',
};

const EDITABLE_TYPES = new Set(['heading', 'paragraph', 'clause']);
const LAYOUT_TYPES = new Set(['heading', 'paragraph', 'clause', 'table']);

export function newBlockId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeHex(value) {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^#([0-9a-fA-F]{6})$/);
    return match ? `#${match[1].toLowerCase()}` : null;
}

export function blockSupportsColor(type) {
    return EDITABLE_TYPES.has(type);
}

export function blockSupportsLayout(type) {
    return LAYOUT_TYPES.has(type);
}

export function normalizeAlign(value) {
    return ALIGN_OPTIONS.includes(value) ? value : 'start';
}

export function normalizeHeadingSize(value) {
    return HEADING_SIZES.includes(value) ? value : 'h1';
}

export function normalizeWhen(value) {
    return WHEN_OPTIONS.includes(value) ? value : 'always';
}

export function normalizeLocale(value) {
    return TEMPLATE_LOCALES.includes(value) ? value : 'en';
}

export function normalizeDealType(value) {
    return DEAL_TYPES.includes(value) ? value : 'both';
}

export function normalizeLifecycle(value) {
    return value === 'published' ? 'published' : 'draft';
}

export function localeIsRtl(locale) {
    return locale === 'ar' || locale === 'ckb';
}

function defaultTableRows() {
    return [
        ['Item', 'Amount'],
        ['{{transaction.rent_amount}}', '{{currency.code}}'],
    ];
}

function normalizeSlots(slots, fallback = ['agency', 'party']) {
    if (!Array.isArray(slots) || slots.length === 0) return [...fallback];
    return slots.map((slot) => String(slot || '').trim()).filter(Boolean).slice(0, 4);
}

function normalizeTableRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return defaultTableRows();
    return rows.slice(0, 20).map((row) => {
        const cells = Array.isArray(row) ? row : [row];
        return cells.slice(0, 6).map((cell) => String(cell ?? ''));
    });
}

export function createBlock(type) {
    const id = newBlockId();
    switch (type) {
        case 'heading':
            return {
                id, type, title: '', textColor: null, backgroundColor: null,
                align: 'start', headingSize: 'h1', bold: true, when: 'always',
            };
        case 'paragraph':
            return {
                id, type, text: '', textColor: null, backgroundColor: null,
                align: 'start', bold: false, when: 'always',
            };
        case 'clause':
            return {
                id, type, title: '', text: '', textColor: null, backgroundColor: null,
                align: 'start', bold: true, when: 'always',
            };
        case 'table':
            return { id, type, rows: defaultTableRows(), align: 'start', when: 'always' };
        case 'parties':
            return { id, type, showPhone: false, when: 'always' };
        case 'owners':
            return { id, type, when: 'always' };
        case 'signature':
            return { id, type, slots: ['agency', 'party'], when: 'always' };
        case 'divider':
        case 'spacer':
        case 'pagebreak':
            return { id, type, when: 'always' };
        default:
            return {
                id, type: 'paragraph', text: '', textColor: null, backgroundColor: null,
                align: 'start', bold: false, when: 'always',
            };
    }
}

function colorFields(block) {
    if (!blockSupportsColor(block?.type)) return {};
    return {
        textColor: normalizeHex(block?.textColor),
        backgroundColor: normalizeHex(block?.backgroundColor),
    };
}

function layoutFields(block) {
    if (!blockSupportsLayout(block?.type)) return {};
    const fields = { align: normalizeAlign(block?.align) };
    if (block?.type === 'heading') fields.headingSize = normalizeHeadingSize(block?.headingSize);
    if (EDITABLE_TYPES.has(block?.type)) fields.bold = Boolean(block?.bold);
    return fields;
}

export function normalizeBlocks(structure, body = '') {
    if (Array.isArray(structure) && structure.length > 0) {
        return structure.map((block) => {
            const base = createBlock(block?.type || 'paragraph');
            const merged = {
                ...base,
                ...block,
                id: block?.id || newBlockId(),
                when: normalizeWhen(block?.when),
                ...colorFields(block),
                ...layoutFields({ ...base, ...block }),
            };
            if (merged.type === 'table') merged.rows = normalizeTableRows(block?.rows);
            if (merged.type === 'signature') merged.slots = normalizeSlots(block?.slots);
            if (merged.type === 'parties') merged.showPhone = Boolean(block?.showPhone);
            return merged;
        });
    }
    return [createBlock('paragraph')].map((block) => ({ ...block, text: body || '' }));
}

function signaturePlain(block, locale = 'en') {
    const labels = {
        en: { agency: 'Agency', party: 'Party', seller: 'Seller', buyer: 'Buyer', landlord: 'Landlord', tenant: 'Tenant' },
        ar: { agency: 'الوكالة', party: 'الطرف', seller: 'البائع', buyer: 'المشتري', landlord: 'المؤجر', tenant: 'المستأجر' },
        ckb: { agency: 'ئاژانس', party: 'لایەن', seller: 'فرۆشیار', buyer: 'کڕیار', landlord: 'کرێدەر', tenant: 'کرێچی' },
    };
    const map = labels[normalizeLocale(locale)] || labels.en;
    const slots = normalizeSlots(block?.slots);
    return slots.map((slot) => `________________\n${map[slot] || slot}`).join('\n\n');
}

function partiesPlain(block) {
    if (block?.showPhone) return '{{parties}}\nPhone: {{owner.phone}}';
    return '{{parties}}';
}

function tablePlain(block) {
    return normalizeTableRows(block?.rows)
        .map((row) => row.join(' | '))
        .join('\n');
}

function blockVisible(block, dealType) {
    const when = normalizeWhen(block?.when);
    if (when === 'always') return true;
    if (!dealType || dealType === 'both') return true;
    return when === dealType;
}

function blockPlainText(block, clauseNo, locale = 'en') {
    switch (block.type) {
        case 'heading':
            return String(block.title || '').trim();
        case 'paragraph':
            return String(block.text || '').trim();
        case 'clause': {
            const title = String(block.title || '').trim();
            const text = String(block.text || '').trim();
            const head = title ? `${clauseNo}. ${title}` : `${clauseNo}.`;
            return text ? `${head}\n${text}` : head;
        }
        case 'table':
            return tablePlain(block);
        case 'parties':
            return partiesPlain(block);
        case 'owners':
            return 'Owner: {{owner.name}}\nPhone: {{owner.phone}}';
        case 'signature':
            return signaturePlain(block, locale);
        case 'divider':
            return '---';
        case 'spacer':
        case 'pagebreak':
            return '';
        default:
            return String(block.text || '').trim();
    }
}

export function compileBlocks(blocks, options = {}) {
    const locale = normalizeLocale(options.locale);
    const dealType = options.dealType || null;
    let clauseNo = 0;
    const parts = (blocks || [])
        .filter((block) => blockVisible(block, dealType))
        .map((block) => {
            if (block.type === 'clause') clauseNo += 1;
            if (block.type === 'pagebreak') return '\f';
            return blockPlainText(block, clauseNo, locale);
        });
    return parts.join('\n\n').replace(/\f\n\n/g, '\f').trim();
}

export function fillTokens(body, values = SAMPLE_VALUES) {
    return String(body || '').replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_match, key) => values[key.toLowerCase()] ?? '');
}

export function extractTokens(text) {
    const found = [];
    String(text || '').replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_match, key) => {
        found.push(String(key).toLowerCase());
        return _match;
    });
    return found;
}

export function findUnknownTokens(blocks, locale = 'en') {
    const body = compileBlocks(blocks, { locale, dealType: null });
    const unknown = [];
    for (const token of extractTokens(body)) {
        if (!KNOWN_TOKENS.has(token) && !unknown.includes(token)) unknown.push(token);
    }
    return unknown;
}

/**
 * Structured preview/PDF sections with layout + colors.
 */
export function compileSections(blocks, values = SAMPLE_VALUES, options = {}) {
    const locale = normalizeLocale(options.locale);
    const dealType = options.dealType || values['transaction.type'] || null;
    let clauseNo = 0;
    return (blocks || [])
        .filter((block) => blockVisible(block, dealType))
        .map((block) => {
            if (block.type === 'clause') clauseNo += 1;
            if (block.type === 'pagebreak') {
                return { type: 'pagebreak', text: '', role: 'body', textColor: null, backgroundColor: null, align: 'start' };
            }
            if (block.type === 'table') {
                const rows = normalizeTableRows(block.rows).map((row) => row.map((cell) => fillTokens(cell, values)));
                return {
                    type: 'table',
                    text: rows.map((row) => row.join(' | ')).join('\n'),
                    rows,
                    role: 'body',
                    align: normalizeAlign(block.align),
                    textColor: null,
                    backgroundColor: null,
                };
            }
            const plain = blockPlainText(block, clauseNo, locale);
            const filled = fillTokens(plain, values);
            const colors = blockSupportsColor(block.type) ? colorFields(block) : {};
            const layout = layoutFields(block);
            return {
                type: block.type,
                text: filled,
                role: block.type === 'heading' ? 'heading' : 'body',
                textColor: colors.textColor || null,
                backgroundColor: colors.backgroundColor || null,
                align: layout.align || 'start',
                headingSize: layout.headingSize || null,
                bold: Boolean(layout.bold),
            };
        })
        .filter((section) => (
            section.type === 'spacer'
            || section.type === 'divider'
            || section.type === 'pagebreak'
            || section.type === 'table'
            || String(section.text || '').trim()
        ));
}

export function tokenMarkup(token) {
    return `{{${token}}}`;
}

function optionalColorPayload(block) {
    const colors = colorFields(block);
    return {
        ...(colors.textColor ? { textColor: colors.textColor } : {}),
        ...(colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : {}),
    };
}

function optionalLayoutPayload(block) {
    const layout = layoutFields(block);
    const payload = {};
    if (layout.align && layout.align !== 'start') payload.align = layout.align;
    if (layout.headingSize && layout.headingSize !== 'h1') payload.headingSize = layout.headingSize;
    if (layout.bold) payload.bold = true;
    return payload;
}

export function serializeStructure(blocks) {
    return (blocks || []).map((block) => {
        const base = {
            id: block.id,
            type: block.type,
            ...(normalizeWhen(block.when) !== 'always' ? { when: normalizeWhen(block.when) } : {}),
        };
        if (block.type === 'heading') {
            return {
                ...base,
                title: block.title || '',
                ...optionalColorPayload(block),
                ...optionalLayoutPayload(block),
            };
        }
        if (block.type === 'paragraph') {
            return {
                ...base,
                text: block.text || '',
                ...optionalColorPayload(block),
                ...optionalLayoutPayload(block),
            };
        }
        if (block.type === 'clause') {
            return {
                ...base,
                title: block.title || '',
                text: block.text || '',
                ...optionalColorPayload(block),
                ...optionalLayoutPayload(block),
            };
        }
        if (block.type === 'table') {
            return {
                ...base,
                rows: normalizeTableRows(block.rows),
                ...optionalLayoutPayload(block),
            };
        }
        if (block.type === 'signature') {
            return { ...base, slots: normalizeSlots(block.slots) };
        }
        if (block.type === 'parties') {
            return { ...base, ...(block.showPhone ? { showPhone: true } : {}) };
        }
        return base;
    });
}

/** Starter library for new templates (locale + deal type aware). */
export function starterBlocks(dealType = 'both', locale = 'en') {
    const type = normalizeDealType(dealType);
    const loc = normalizeLocale(locale);
    const heading = createBlock('heading');
    heading.title = loc === 'ar' ? 'عقد عقاري' : loc === 'ckb' ? 'گرێبەستی خانووبەرە' : 'Real estate contract';
    const intro = createBlock('paragraph');
    intro.text = loc === 'ar'
        ? 'تم الاتفاق بين الأطراف بموجب هذا العقد على ما يلي.'
        : loc === 'ckb'
            ? 'لایەنەکان لەسەر ئەم گرێبەستە ڕێککەوتن.'
            : 'The parties agree to the following terms.';
    const parties = createBlock('parties');
    const clause = createBlock('clause');
    clause.title = loc === 'ar' ? 'المبلغ' : loc === 'ckb' ? 'بڕ' : 'Amount';
    clause.text = type === 'sale'
        ? '{{transaction.purchase_price}} {{currency.code}}'
        : type === 'rent'
            ? '{{transaction.rent_amount}} {{currency.code}}'
            : '{{transaction.purchase_price}} / {{transaction.rent_amount}} {{currency.code}}';
    if (type === 'sale') clause.when = 'sale';
    if (type === 'rent') clause.when = 'rent';
    const signature = createBlock('signature');
    signature.slots = SIGNATURE_SLOT_PRESETS[type] || SIGNATURE_SLOT_PRESETS.both;
    return [heading, intro, parties, clause, createBlock('pagebreak'), signature];
}
