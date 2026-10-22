// Cache formatters to improve performance when rendering large tables
const formatterCache = new Map();

const getFormatter = (decimals, forceDecimals) => {
    const key = `${decimals}-${forceDecimals}`;
    if (!formatterCache.has(key)) {
        formatterCache.set(key, new Intl.NumberFormat('en-US', {
            minimumFractionDigits: forceDecimals ? decimals : 0,
            maximumFractionDigits: decimals,
        }));
    }
    return formatterCache.get(key);
};

/**
 * Formats a number with comma separators and decimal control.
 * @param {number|string} value - The number to format
 * @param {number} decimals - Maximum decimal places (default 3)
 * @param {boolean} forceDecimals - If true, pads with zeros to always show 'decimals' count
 */
export const formatNumber = (value, decimals = 3, forceDecimals = false) => {
    if (value === null || value === undefined || value === '') return '0';

    // Remove existing commas if it's a string
    const cleanValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
    const num = Number(cleanValue);
    
    if (!Number.isFinite(num)) return '0';

    const formatted = getFormatter(decimals, forceDecimals).format(num);
    return num < 0 ? `\u200E${formatted}` : formatted;
};

/**
 * Safely converts a formatted string or value back to a clean number.
 * Useful for calculations and API payloads.
 */
export const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    let cleanValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
    if (typeof cleanValue === 'string') {
        cleanValue = cleanValue.replace(/\u200E/g, ''); // strip LRM characters
    }
    const num = Number(cleanValue);
    return Number.isFinite(num) ? num : 0;
};

const CURRENCY_DISPLAY = {
    IQD: 'دینار',
    دينار: 'دینار',
    USD: 'دۆلار',
    $: 'دۆلار',
    دولار: 'دۆلار',
};

function displayCurrency(symbol) {
    const raw = String(symbol ?? '').trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    if (CURRENCY_DISPLAY[upper]) return CURRENCY_DISPLAY[upper];
    if (CURRENCY_DISPLAY[raw]) return CURRENCY_DISPLAY[raw];
    return raw;
}

/**
 * Formats an amount with its currency symbol.
 * Standard format: Symbol Value (e.g., دینار 3,000)
 */
export const formatCurrency = (amount, symbol, decimals = 3) => {
    const num = parseNumber(amount);
    const isNegative = num < 0;
    const absFormatted = formatNumber(Math.abs(num), decimals);
    const label = displayCurrency(symbol);
    if (!label) return isNegative ? `\u200E-${absFormatted}` : absFormatted;

    // Use \u200E (Left-to-Right Mark) to ensure the symbol stays on the left even in RTL contexts
    // We also make sure the minus sign is right before the formatted number (after the currency symbol)
    return isNegative
        ? `\u200E${label} -${absFormatted}`
        : `\u200E${label} ${absFormatted}`;
};

/**
 * Formats a date string or object.
 * @param {string|Date} date - The date to format
 * @param {string} format - The format string (default 'YYYY-MM-DD')
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const pad = (n) => n.toString().padStart(3, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        
        if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
        if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
        return d.toLocaleDateString();
    } catch (e) {
        return '';
    }
};