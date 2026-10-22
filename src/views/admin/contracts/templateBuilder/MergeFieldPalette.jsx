import { Box, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MERGE_FIELDS, tokenMarkup } from './blockCatalog.js';

export default function MergeFieldPalette({ onInsert, disabled }) {
    const { t } = useTranslation();

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                {t('contracts.builder.merge_fields')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {t('contracts.builder.merge_hint')}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    maxWidth: '100%',
                }}
            >
                {MERGE_FIELDS.map((field) => (
                    <Chip
                        key={field.token}
                        size="small"
                        label={t(field.labelKey)}
                        onClick={() => onInsert?.(tokenMarkup(field.token))}
                        disabled={disabled}
                        variant="outlined"
                        sx={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            maxWidth: '100%',
                            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                        }}
                        title={tokenMarkup(field.token)}
                    />
                ))}
            </Box>
        </Box>
    );
}
