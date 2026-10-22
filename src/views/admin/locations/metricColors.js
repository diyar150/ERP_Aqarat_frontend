import { alpha } from '@mui/material/styles';

/**
 * Modern ERP KPI Metric Color Tokens.
 *
 * Provides high-contrast, WCAG AAA compliant palettes for light and dark modes.
 * Resolves color incompatibility where monochrome themes (primary = #343434 / #FAFAFA)
 * or low-contrast info palettes make City & Neighborhood KPI icons unreadable.
 */
export const METRIC_COLOR_PALETTES = {
    // City - Municipal / Civic Royal Blue
    city: {
        light: {
            iconColor: '#1d4ed8', // Blue 700
            bgColor: 'rgba(37, 99, 235, 0.09)',
            borderColor: 'rgba(37, 99, 235, 0.22)',
            hoverBorder: '#2563eb',
            hoverShadow: 'rgba(37, 99, 235, 0.16)',
        },
        dark: {
            iconColor: '#60a5fa', // Blue 400 - luminous and crisp
            bgColor: 'rgba(96, 165, 250, 0.14)',
            borderColor: 'rgba(96, 165, 250, 0.32)',
            hoverBorder: '#60a5fa',
            hoverShadow: 'rgba(96, 165, 250, 0.22)',
        },
    },

    // Neighborhood - Community / District Vibrant Teal
    neighborhood: {
        light: {
            iconColor: '#0f766e', // Teal 700 - rich and readable
            bgColor: 'rgba(13, 148, 136, 0.09)',
            borderColor: 'rgba(13, 148, 136, 0.22)',
            hoverBorder: '#0d9488',
            hoverShadow: 'rgba(13, 148, 136, 0.16)',
        },
        dark: {
            iconColor: '#2dd4bf', // Teal 400 - glowing mint/teal
            bgColor: 'rgba(45, 212, 191, 0.14)',
            borderColor: 'rgba(45, 212, 191, 0.32)',
            hoverBorder: '#2dd4bf',
            hoverShadow: 'rgba(45, 212, 191, 0.22)',
        },
    },

    // Properties - Real Estate Asset Emerald
    properties: {
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

    // Branches - Corporate Entity Violet
    branches: {
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

    // Parties - Contacts / Stakeholders Amber
    parties: {
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
};

// Map standard MUI palette keys as fallbacks
METRIC_COLOR_PALETTES.primary = METRIC_COLOR_PALETTES.city;
METRIC_COLOR_PALETTES.info = METRIC_COLOR_PALETTES.neighborhood;
METRIC_COLOR_PALETTES.success = METRIC_COLOR_PALETTES.properties;
METRIC_COLOR_PALETTES.secondary = METRIC_COLOR_PALETTES.branches;
METRIC_COLOR_PALETTES.warning = METRIC_COLOR_PALETTES.parties;

/**
 * Returns theme-mode-adapted color tokens for a given KPI variant.
 * @param {string} colorKey - 'city' | 'neighborhood' | 'properties' | 'branches' | 'parties' | etc.
 * @param {import('@mui/material').Theme} theme - Current MUI theme
 */
export function getMetricColorTokens(colorKey, theme) {
    const mode = theme?.palette?.mode === 'dark' ? 'dark' : 'light';
    const key = String(colorKey || 'city').toLowerCase();

    if (METRIC_COLOR_PALETTES[key]) {
        return METRIC_COLOR_PALETTES[key][mode];
    }

    // Dynamic fallback for any other MUI palette color
    const pal = theme?.palette?.[key] || theme?.palette?.primary || { main: '#3b82f6' };
    if (mode === 'dark') {
        const c = pal.light || pal.main;
        return {
            iconColor: c,
            bgColor: alpha(c, 0.14),
            borderColor: alpha(c, 0.32),
            hoverBorder: c,
            hoverShadow: alpha(c, 0.22),
        };
    }
    const c = pal.dark || pal.main;
    return {
        iconColor: c,
        bgColor: alpha(pal.main, 0.09),
        borderColor: alpha(pal.main, 0.22),
        hoverBorder: pal.main,
        hoverShadow: alpha(pal.main, 0.16),
    };
}
