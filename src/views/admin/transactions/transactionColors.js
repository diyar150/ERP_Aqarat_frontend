import { alpha } from '@mui/material/styles';

/**
 * Modern ERP Transaction Color Tokens.
 *
 * Provides high-contrast, WCAG AAA compliant palettes for light and dark modes.
 * Ensures vibrant, theme-adaptive aesthetics for total deals, sales, rentals,
 * working pipeline, expiring leases, and closed transactions.
 */
export const TRANSACTION_COLOR_PALETTES = {
    // Total Transactions / All Deals - Indigo
    total: {
        light: {
            iconColor: '#4338ca', // Indigo 700
            bgColor: 'rgba(79, 70, 229, 0.09)',
            borderColor: 'rgba(79, 70, 229, 0.22)',
            hoverBorder: '#4f46e5',
            hoverShadow: 'rgba(79, 70, 229, 0.16)',
        },
        dark: {
            iconColor: '#818cf8', // Indigo 400
            bgColor: 'rgba(129, 140, 248, 0.14)',
            borderColor: 'rgba(129, 140, 248, 0.32)',
            hoverBorder: '#818cf8',
            hoverShadow: 'rgba(129, 140, 248, 0.22)',
        },
    },

    // Sales - Emerald Green
    sale: {
        light: {
            iconColor: '#047857', // Emerald 700
            bgColor: 'rgba(16, 185, 129, 0.09)',
            borderColor: 'rgba(16, 185, 129, 0.22)',
            hoverBorder: '#10b981',
            hoverShadow: 'rgba(16, 185, 129, 0.16)',
        },
        dark: {
            iconColor: '#34d399', // Emerald 400
            bgColor: 'rgba(52, 211, 153, 0.14)',
            borderColor: 'rgba(52, 211, 153, 0.32)',
            hoverBorder: '#34d399',
            hoverShadow: 'rgba(52, 211, 153, 0.22)',
        },
    },

    // Rentals - Sky Blue
    rent: {
        light: {
            iconColor: '#0369a1', // Sky 700
            bgColor: 'rgba(14, 165, 233, 0.09)',
            borderColor: 'rgba(14, 165, 233, 0.22)',
            hoverBorder: '#0ea5e9',
            hoverShadow: 'rgba(14, 165, 233, 0.16)',
        },
        dark: {
            iconColor: '#38bdf8', // Sky 400
            bgColor: 'rgba(56, 189, 248, 0.14)',
            borderColor: 'rgba(56, 189, 248, 0.32)',
            hoverBorder: '#38bdf8',
            hoverShadow: 'rgba(56, 189, 248, 0.22)',
        },
    },

    // Working Pipeline / Open - Amber
    open: {
        light: {
            iconColor: '#b45309', // Amber 700
            bgColor: 'rgba(245, 158, 11, 0.10)',
            borderColor: 'rgba(245, 158, 11, 0.24)',
            hoverBorder: '#f59e0b',
            hoverShadow: 'rgba(245, 158, 11, 0.16)',
        },
        dark: {
            iconColor: '#fbbf24', // Amber 400
            bgColor: 'rgba(251, 191, 36, 0.14)',
            borderColor: 'rgba(251, 191, 36, 0.32)',
            hoverBorder: '#fbbf24',
            hoverShadow: 'rgba(251, 191, 36, 0.22)',
        },
    },

    // Expiring Leases - Rose / Coral Red
    expiring: {
        light: {
            iconColor: '#be123c', // Rose 700
            bgColor: 'rgba(244, 63, 94, 0.09)',
            borderColor: 'rgba(244, 63, 94, 0.22)',
            hoverBorder: '#f43f5e',
            hoverShadow: 'rgba(244, 63, 94, 0.16)',
        },
        dark: {
            iconColor: '#fb7185', // Rose 400
            bgColor: 'rgba(251, 113, 133, 0.14)',
            borderColor: 'rgba(251, 113, 133, 0.32)',
            hoverBorder: '#fb7185',
            hoverShadow: 'rgba(251, 113, 133, 0.22)',
        },
    },

    // Completed - Teal
    completed: {
        light: {
            iconColor: '#0f766e', // Teal 700
            bgColor: 'rgba(13, 148, 136, 0.09)',
            borderColor: 'rgba(13, 148, 136, 0.22)',
            hoverBorder: '#0d9488',
            hoverShadow: 'rgba(13, 148, 136, 0.16)',
        },
        dark: {
            iconColor: '#2dd4bf', // Teal 400
            bgColor: 'rgba(45, 212, 191, 0.14)',
            borderColor: 'rgba(45, 212, 191, 0.32)',
            hoverBorder: '#2dd4bf',
            hoverShadow: 'rgba(45, 212, 191, 0.22)',
        },
    },

    // Cancelled / Draft - Slate / Violet
    cancelled: {
        light: {
            iconColor: '#475569', // Slate 600
            bgColor: 'rgba(100, 116, 139, 0.09)',
            borderColor: 'rgba(100, 116, 139, 0.22)',
            hoverBorder: '#64748b',
            hoverShadow: 'rgba(100, 116, 139, 0.16)',
        },
        dark: {
            iconColor: '#94a3b8', // Slate 400
            bgColor: 'rgba(148, 163, 184, 0.14)',
            borderColor: 'rgba(148, 163, 184, 0.32)',
            hoverBorder: '#94a3b8',
            hoverShadow: 'rgba(148, 163, 184, 0.22)',
        },
    },
};

/**
 * Returns the theme-specific color palette for a given transaction KPI key.
 *
 * @param {object} theme - MUI theme object.
 * @param {string} key - 'total' | 'sale' | 'rent' | 'open' | 'expiring' | 'completed' | 'cancelled'
 * @returns {object} Palette object containing iconColor, bgColor, borderColor, hoverBorder, hoverShadow.
 */
export function getTransactionPalette(theme, key) {
    const isDark = theme.palette.mode === 'dark';
    const fallback = TRANSACTION_COLOR_PALETTES.total[isDark ? 'dark' : 'light'];
    const palette = TRANSACTION_COLOR_PALETTES[key] || TRANSACTION_COLOR_PALETTES.total;
    return palette[isDark ? 'dark' : 'light'] || fallback;
}

/**
 * Theme-aware status chip styling for deals.
 */
export function getDealStatusChipSx(theme, status) {
    const isDark = theme.palette.mode === 'dark';
    switch (status) {
        case 'open':
            return {
                fontWeight: 600,
                color: isDark ? '#fbbf24' : '#b45309',
                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.14)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${isDark ? 'rgba(251, 191, 36, 0.35)' : 'rgba(245, 158, 11, 0.3)'}`,
            };
        case 'completed':
            return {
                fontWeight: 600,
                color: isDark ? '#34d399' : '#047857',
                backgroundColor: isDark ? 'rgba(52, 211, 153, 0.14)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${isDark ? 'rgba(52, 211, 153, 0.35)' : 'rgba(16, 185, 129, 0.3)'}`,
            };
        case 'cancelled':
            return {
                fontWeight: 600,
                color: isDark ? '#94a3b8' : '#475569',
                backgroundColor: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(100, 116, 139, 0.12)',
                border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.3)'}`,
            };
        case 'draft':
        default:
            return {
                fontWeight: 600,
                color: isDark ? '#a78bfa' : '#6d28d9',
                backgroundColor: isDark ? 'rgba(167, 139, 250, 0.14)' : 'rgba(139, 92, 246, 0.12)',
                border: `1px solid ${isDark ? 'rgba(167, 139, 250, 0.35)' : 'rgba(139, 92, 246, 0.3)'}`,
            };
    }
}
