import { Box, Typography } from '@mui/material';
import { balanceTone, moneyLabel } from '@/utils/money.js';

const TONE = {
    positive: {
        color: 'success.dark',
        bg: 'success.main',
        border: 'success.light',
    },
    negative: {
        color: 'error.dark',
        bg: 'error.main',
        border: 'error.light',
    },
    neutral: {
        color: 'text.primary',
        bg: 'action.hover',
        border: 'divider',
    },
};

/**
 * Modern wallet balance: green when positive, red when negative.
 * @param {'inline' | 'card'} variant
 */
export default function WalletAmount({
    value,
    currency,
    label,
    variant = 'inline',
    empty = '—',
}) {
    const tone = balanceTone(value);
    const palette = TONE[tone];
    const text = moneyLabel(value, currency, empty);

    if (variant === 'card') {
        return (
            <Box
                sx={{
                    px: 2,
                    py: 1.75,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: palette.border,
                    bgcolor: (theme) => {
                        if (tone === 'neutral') return theme.palette.action.hover;
                        const base = tone === 'positive'
                            ? theme.palette.success.main
                            : theme.palette.error.main;
                        return theme.palette.mode === 'dark'
                            ? `${base}22`
                            : `${base}14`;
                    },
                    borderInlineStart: '3px solid',
                    borderInlineStartColor: tone === 'neutral'
                        ? 'divider'
                        : (tone === 'positive' ? 'success.main' : 'error.main'),
                }}
            >
                {label ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {label}
                    </Typography>
                ) : null}
                <Typography
                    variant="h5"
                    fontWeight={700}
                    sx={{
                        color: palette.color,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                    }}
                >
                    {text}
                </Typography>
            </Box>
        );
    }

    return (
        <Typography
            component="span"
            variant="body2"
            fontWeight={600}
            sx={{
                color: palette.color,
                fontVariantNumeric: 'tabular-nums',
                display: 'inline',
            }}
        >
            {text}
        </Typography>
    );
}
