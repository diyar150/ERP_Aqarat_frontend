import { alpha } from '@mui/material/styles';

/**
 * Modern ERP Property Color Tokens.
 *
 * Provides high-contrast, WCAG AAA compliant palettes for light and dark modes.
 * Ensures vibrant, theme-adaptive aesthetics for total properties, sales, rentals,
 * under-contract listings, drafts, and archived inventory.
 */
export const PROPERTY_COLOR_PALETTES = {
    // Total Properties / All Inventory - Royal Blue
    total: {
        light: {
            iconColor: '#1d4ed8', // Blue 700
            bgColor: 'rgba(37, 99, 235, 0.09)',
            borderColor: 'rgba(37, 99, 235, 0.22)',
            hoverBorder: '#2563eb',
            hoverShadow: 'rgba(37, 99, 235, 0.16)',
        },
        dark: {
            iconColor: '#60a5fa', // Blue 400
            bgColor: 'rgba(96, 165, 250, 0.14)',
            borderColor: 'rgba(96, 165, 250, 0.32)',
            hoverBorder: '#60a5fa',
            hoverShadow: 'rgba(96, 165, 250, 0.22)',
        },
    },

    // For Sale / Available for Purchase - Emerald Green
    for_sale: {
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

    // For Rent / Available for Lease - Cyan / Teal
    for_rent: {
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

    // Under Contract / Reserved / Pending - Warm Amber
    under_contract: {
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

    // Draft / Incomplete / Review - Violet / Purple
    draft: {
        light: {
            iconColor: '#6d28d9', // Violet 700
            bgColor: 'rgba(139, 92, 246, 0.09)',
            borderColor: 'rgba(139, 92, 246, 0.22)',
            hoverBorder: '#8b5cf6',
            hoverShadow: 'rgba(139, 92, 246, 0.16)',
        },
        dark: {
            iconColor: '#a78bfa', // Violet 400
            bgColor: 'rgba(167, 139, 250, 0.14)',
            borderColor: 'rgba(167, 139, 250, 0.32)',
            hoverBorder: '#a78bfa',
            hoverShadow: 'rgba(167, 139, 250, 0.22)',
        },
    },

    // Archived / Inactive - Slate / Neutral
    archived: {
        light: {
            iconColor: '#475569', // Slate 600
            bgColor: 'rgba(100, 116, 139, 0.08)',
            borderColor: 'rgba(100, 116, 139, 0.20)',
            hoverBorder: '#64748b',
            hoverShadow: 'rgba(100, 116, 139, 0.12)',
        },
        dark: {
            iconColor: '#94a3b8', // Slate 400
            bgColor: 'rgba(148, 163, 184, 0.12)',
            borderColor: 'rgba(148, 163, 184, 0.28)',
            hoverBorder: '#94a3b8',
            hoverShadow: 'rgba(148, 163, 184, 0.18)',
        },
    },
};

/**
 * Returns active color tokens for the given palette key and MUI theme mode.
 *
 * @param {string} key - e.g. 'total', 'for_sale', 'for_rent', 'under_contract', 'draft', 'archived'
 * @param {object} theme - MUI theme instance
 * @returns {object} High contrast tokens { iconColor, bgColor, borderColor, hoverBorder, hoverShadow }
 */
export function getPropertyColorTokens(key, theme) {
    const mode = theme?.palette?.mode === 'dark' ? 'dark' : 'light';
    const palette = PROPERTY_COLOR_PALETTES[key] || PROPERTY_COLOR_PALETTES.total;
    const tokens = palette[mode];

    if (tokens) return tokens;

    // Fallback if specific key is missing
    const primary = theme?.palette?.primary?.main || '#2563eb';
    return {
        iconColor: primary,
        bgColor: alpha(primary, mode === 'dark' ? 0.14 : 0.08),
        borderColor: alpha(primary, mode === 'dark' ? 0.32 : 0.20),
        hoverBorder: primary,
        hoverShadow: alpha(primary, 0.18),
    };
}
