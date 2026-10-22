import { alpha } from '@mui/material/styles';

/**
 * Modern ERP Party Color Tokens.
 *
 * Provides high-contrast, WCAG AAA compliant palettes for light and dark modes.
 * Ensures vibrant, theme-adaptive aesthetics for contacts, clients, leads, owners, and organizations.
 */
export const PARTY_COLOR_PALETTES = {
    // Total Parties / Directory - Royal Blue
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

    // Active Clients & Buyers - Vibrant Cyan/Teal
    clients: {
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

    // Property Owners & Landlords - Emerald
    owners: {
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

    // Leads & Prospects - Warm Amber
    leads: {
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

    // Organizations & Commercial - Violet
    organizations: {
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

// Aliases
PARTY_COLOR_PALETTES.parties = PARTY_COLOR_PALETTES.total;
PARTY_COLOR_PALETTES.people = PARTY_COLOR_PALETTES.total;
PARTY_COLOR_PALETTES.client = PARTY_COLOR_PALETTES.clients;
PARTY_COLOR_PALETTES.owner = PARTY_COLOR_PALETTES.owners;
PARTY_COLOR_PALETTES.lead = PARTY_COLOR_PALETTES.leads;
PARTY_COLOR_PALETTES.organization = PARTY_COLOR_PALETTES.organizations;

/**
 * Returns theme-mode-adapted color tokens for a given party KPI variant.
 * @param {string} colorKey - 'total' | 'clients' | 'owners' | 'leads' | 'organizations' | 'archived'
 * @param {import('@mui/material').Theme} theme - Current MUI theme
 */
export function getPartyColorTokens(colorKey, theme) {
    const mode = theme?.palette?.mode === 'dark' ? 'dark' : 'light';
    const key = String(colorKey || 'total').toLowerCase();

    if (PARTY_COLOR_PALETTES[key]) {
        return PARTY_COLOR_PALETTES[key][mode];
    }

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
