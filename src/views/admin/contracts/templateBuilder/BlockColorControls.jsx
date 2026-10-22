import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    BACKGROUND_COLOR_PRESETS,
    DEFAULT_TEXT_COLOR,
    TEXT_COLOR_PRESETS,
} from './blockCatalog.js';

function Swatch({ hex, selected, label, onSelect, empty }) {
    return (
        <Tooltip title={label} enterDelay={400}>
            <Box
                component="button"
                type="button"
                aria-label={label}
                aria-pressed={selected}
                onClick={() => onSelect(hex)}
                sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '1.5px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: empty ? 'transparent' : (hex || '#fff'),
                    p: 0,
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: selected ? (theme) => `0 0 0 2px ${theme.palette.primary.main}33` : 'none',
                    backgroundImage: empty
                        ? 'linear-gradient(135deg, transparent 46%, #94a3b8 46%, #94a3b8 54%, transparent 54%)'
                        : 'none',
                    '&:hover': {
                        borderColor: 'primary.main',
                    },
                    '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                    },
                }}
            />
        </Tooltip>
    );
}

function SwatchRow({ label, value, presets, onChange }) {
    return (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: 36, flexShrink: 0, lineHeight: 1.2 }}
            >
                {label}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                {presets.map((preset) => (
                    <Swatch
                        key={preset.id}
                        hex={preset.hex}
                        empty={preset.hex == null}
                        selected={(value || null) === (preset.hex || null)}
                        label={preset.id}
                        onSelect={onChange}
                    />
                ))}
            </Stack>
        </Stack>
    );
}

export default function BlockColorControls({ textColor, backgroundColor, onChange }) {
    const { t } = useTranslation();
    const ink = textColor || DEFAULT_TEXT_COLOR;
    const fill = backgroundColor || 'transparent';

    return (
        <Box
            sx={{
                mt: 1.25,
                pt: 1.25,
                borderTop: 1,
                borderColor: 'divider',
            }}
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.25}
                sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
            >
                <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <SwatchRow
                        label={t('contracts.builder.color_text')}
                        value={textColor}
                        presets={TEXT_COLOR_PRESETS}
                        onChange={(hex) => onChange({ textColor: hex })}
                    />
                    <SwatchRow
                        label={t('contracts.builder.color_fill')}
                        value={backgroundColor}
                        presets={BACKGROUND_COLOR_PRESETS}
                        onChange={(hex) => onChange({ backgroundColor: hex })}
                    />
                </Stack>
                <Box
                    aria-hidden
                    sx={{
                        alignSelf: { xs: 'stretch', sm: 'center' },
                        minWidth: { sm: 88 },
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: fill === 'transparent' ? 'action.hover' : fill,
                        color: ink,
                        border: 1,
                        borderColor: 'divider',
                        typography: 'caption',
                        fontWeight: 600,
                        textAlign: 'center',
                    }}
                >
                    {t('contracts.builder.color_sample')}
                </Box>
            </Stack>
        </Box>
    );
}
