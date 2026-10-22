import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Button, Checkbox, FormControlLabel, FormGroup, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';

export default function ColumnPicker({ columns, hidden, onToggle, onReset }) {
    const { t } = useTranslation();
    const [anchor, setAnchor] = useState(null);
    const hiddenSet = new Set(hidden);

    return (
        <>
            <Tooltip title={t('workspace_ui.columns')}>
                <IconButton
                    size="small"
                    aria-label={t('workspace_ui.columns')}
                    aria-haspopup="dialog"
                    aria-expanded={Boolean(anchor)}
                    onClick={(event) => {
                        event.stopPropagation();
                        setAnchor(event.currentTarget);
                    }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Stack sx={{ p: 1.5, minWidth: 220 }}>
                    <Typography variant="subtitle2" sx={{ px: 1, pb: 0.5 }}>{t('workspace_ui.columns')}</Typography>
                    <FormGroup>
                        {columns.map((column) => (
                            <FormControlLabel
                                key={column.key}
                                sx={{ mx: 0 }}
                                control={(
                                    <Checkbox
                                        size="small"
                                        checked={column.locked || !hiddenSet.has(column.key)}
                                        disabled={column.locked}
                                        onChange={() => onToggle(column.key)}
                                    />
                                )}
                                label={column.label}
                            />
                        ))}
                    </FormGroup>
                    <Button size="small" onClick={onReset} disabled={hidden.length === 0} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                        {t('workspace_ui.columns_reset')}
                    </Button>
                </Stack>
            </Popover>
        </>
    );
}
