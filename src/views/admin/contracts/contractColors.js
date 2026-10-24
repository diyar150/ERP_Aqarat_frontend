import { alpha } from '@mui/material/styles';

/**
 * Modern ERP Contract Color Tokens.
 *
 * Provides high-contrast, WCAG AAA compliant palettes for light and dark modes.
 * Ensures vibrant, theme-adaptive aesthetics for total contracts, active/signed,
 * expiring leases, rental agreements, sales, and archived records.
 */
export const CONTRACT_COLOR_PALETTES = {
    // Total Contracts - Indigo
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

    // Active / Signed Contracts - Emerald Green
    active: {
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

    // Lease Agreements / Rentals - Sky Blue
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

    // Sales Contracts - Violet / Purple
    sale: {
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

    // Archived / Inactive Records - Slate / Neutral
    archived: {
        light: {
            iconColor: '#475569', // Slate 600
            bgColor: 'rgba(100, 116, 139, 0.08)',
            borderColor: 'rgba(100, 116, 139, 0.20)',
            hoverBorder: '#64748b',
            hoverShadow: 'rgba(100, 116, 139, 0.14)',
        },
        dark: {
            iconColor: '#94a3b8', // Slate 400
            bgColor: 'rgba(148, 163, 184, 0.12)',
            borderColor: 'rgba(148, 163, 184, 0.28)',
            hoverBorder: '#94a3b8',
            hoverShadow: 'rgba(148, 163, 184, 0.20)',
        },
    },
};

/**
 * Retrieve the active color palette for a metric or status.
 */
export function getContractColor(type, isDark = false) {
    const palette = CONTRACT_COLOR_PALETTES[type] || CONTRACT_COLOR_PALETTES.total;
    return isDark ? palette.dark : palette.light;
}

/**
 * Returns style attributes for modern clickable KPI cards.
 */
export function getContractMetricCardStyle(type, isDark = false, isSelected = false) {
    const colors = getContractColor(type, isDark);
    return {
        px: 2,
        py: 1.75,
        flex: '1 1 180px',
        minWidth: 160,
        borderRadius: 2.5,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: isSelected ? colors.bgColor : (isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff'),
        borderColor: isSelected ? colors.hoverBorder : colors.borderColor,
        borderWidth: isSelected ? 2 : 1,
        borderStyle: 'solid',
        boxShadow: isSelected
            ? `0 4px 14px ${colors.hoverShadow}`
            : (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)'),
        '&:hover': {
            borderColor: colors.hoverBorder,
            backgroundColor: colors.bgColor,
            transform: 'translateY(-2px)',
            boxShadow: `0 6px 18px ${colors.hoverShadow}`,
        },
    };
}

/**
 * Theme-adaptive badge colors for contract statuses.
 */
export function getContractStatusBadge(status, isDark = false) {
    switch (status) {
        case 'active':
        case 'signed':
            return {
                bg: isDark ? 'rgba(52, 211, 153, 0.16)' : '#d1fae5',
                color: isDark ? '#34d399' : '#065f46',
                border: isDark ? 'rgba(52, 211, 153, 0.3)' : '#a7f3d0',
            };
        case 'archived':
            return {
                bg: isDark ? 'rgba(148, 163, 184, 0.16)' : '#f1f5f9',
                color: isDark ? '#94a3b8' : '#475569',
                border: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
            };
        case 'expiring':
            return {
                bg: isDark ? 'rgba(251, 113, 133, 0.16)' : '#ffe4e6',
                color: isDark ? '#fb7185' : '#9f1239',
                border: isDark ? 'rgba(251, 113, 133, 0.3)' : '#fecdd3',
            };
        case 'expired':
            return {
                bg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2',
                color: isDark ? '#f87171' : '#991b1b',
                border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5',
            };
        default:
            return {
                bg: isDark ? 'rgba(129, 140, 248, 0.16)' : '#e0e7ff',
                color: isDark ? '#818cf8' : '#3730a3',
                border: isDark ? 'rgba(129, 140, 248, 0.3)' : '#c7d2fe',
            };
    }
}
