import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, MenuItem, TextField } from '@mui/material';
import { Search } from '@mui/icons-material';

const fieldSx = {
    minWidth: 0,
    flex: { xs: '1 1 100%', sm: '1 1 180px' },
    maxWidth: { xs: '100%', sm: 280 },
    '& .MuiInputBase-input': { minWidth: 0 },
};

export default function ListToolbar({ search = '', onSearch, filters = [], end = null }) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(search);

    useEffect(() => {
        setDraft(search);
    }, [search]);

    useEffect(() => {
        const next = draft.trim();
        if (next === search) return undefined;
        const handle = setTimeout(() => onSearch(next), 300);
        return () => clearTimeout(handle);
    }, [draft, search, onSearch]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                mb: 2,
                alignItems: 'center',
            }}
        >
            <TextField
                fullWidth
                size="small"
                label={t('workspace_ui.search')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ me: 1, color: 'text.secondary' }} /> } }}
                sx={fieldSx}
            />
            {filters.map((filter) => (
                filter.type === 'date' ? (
                    <TextField
                        key={filter.key}
                        fullWidth
                        size="small"
                        type="date"
                        label={filter.label}
                        value={filter.value || ''}
                        onChange={(event) => filter.onChange(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={fieldSx}
                    />
                ) : (
                    <TextField
                        key={filter.key}
                        fullWidth
                        select
                        size="small"
                        label={filter.label}
                        value={filter.value || ''}
                        disabled={Boolean(filter.disabled)}
                        onChange={(event) => filter.onChange(event.target.value)}
                        sx={fieldSx}
                    >
                        <MenuItem value="">{filter.allLabel || t('workspace_ui.all')}</MenuItem>
                        {filter.options.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                    </TextField>
                )
            ))}
            {end ? (
                <Box
                    sx={{
                        minWidth: 0,
                        flex: { xs: '1 1 100%', sm: '0 0 auto' },
                        display: 'flex',
                        alignItems: 'center',
                        '& .MuiToggleButtonGroup-root': { display: 'flex', maxWidth: '100%' },
                        '& .MuiToggleButton-root': { whiteSpace: 'nowrap', lineHeight: 1.3 },
                    }}
                >
                    {end}
                </Box>
            ) : null}
        </Box>
    );
}
