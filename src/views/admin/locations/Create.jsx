import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import HolidayVillageOutlinedIcon from '@mui/icons-material/HolidayVillageOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { locationError } from './locationError.js';

const emptyForm = { name: '', code: '', status: 'active', notes: '' };

export default function Create() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [initialNeighborhoods, setInitialNeighborhoods] = useState([]);
    const [neighborhoodInput, setNeighborhoodInput] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const setField = (key) => (event) => {
        let value = event.target.value;
        if (key === 'code') {
            value = value.toUpperCase();
        }
        setForm((current) => ({ ...current, [key]: value }));
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const addInitialNeighborhood = () => {
        const trimmed = neighborhoodInput.trim();
        if (!trimmed) return;
        if (initialNeighborhoods.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
            return;
        }
        setInitialNeighborhoods((prev) => [...prev, trimmed]);
        setNeighborhoodInput('');
    };

    const removeInitialNeighborhood = (index) => {
        setInitialNeighborhoods((prev) => prev.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addInitialNeighborhood();
        }
    };

    const save = async (event) => {
        event.preventDefault();
        const trimmedName = String(form.name || '').trim();
        if (!trimmedName) {
            setFieldErrors({ name: t('common.required') });
            setError('');
            return;
        }

        setSaving(true);
        setError('');
        setFieldErrors({});

        try {
            const res = await fetch.post('locations/cities', {
                name: trimmedName,
                code: form.code.trim() || null,
                status: form.status,
                notes: form.notes.trim() || null,
            });

            const cityId = res.data?.data?.id;

            // Sequentially create initial neighborhoods if provided
            if (cityId && initialNeighborhoods.length > 0) {
                for (const nbhName of initialNeighborhoods) {
                    try {
                        await fetch.post(`locations/cities/${cityId}/neighborhoods`, {
                            name: nbhName,
                            status: 'active',
                        });
                    } catch {
                        // Continue saving remaining neighborhoods
                    }
                }
            }

            navigate(`/admin/locations/${cityId}/show`);
        } catch (err) {
            setError(locationError(err, t));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('locations.create')}
                description={t('locations.hint')}
                action={(
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackOutlinedIcon />}
                        onClick={() => navigate('/admin/locations/index')}
                    >
                        {t('locations.back')}
                    </Button>
                )}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Stack spacing={3} component="form" onSubmit={save} noValidate sx={{ width: '100%' }}>
                {/* City Details */}
                <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                        <LocationCityOutlinedIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#1d4ed8' }} />
                        <Typography variant="h6" fontWeight={700}>
                            {t('locations.details')}
                        </Typography>
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr 1fr' }, gap: 2.5 }}>
                        <TextField
                            label={t('locations.name')}
                            value={form.name}
                            onChange={setField('name')}
                            required
                            autoFocus
                            error={Boolean(fieldErrors.name)}
                            helperText={fieldErrors.name}
                            fullWidth
                        />

                        <TextField
                            label={t('locations.code')}
                            value={form.code}
                            onChange={setField('code')}
                            helperText={t('locations.code_hint')}
                            slotProps={{ htmlInput: { dir: 'ltr', maxLength: 20 } }}
                            fullWidth
                        />

                        <TextField
                            select
                            label={t('workspace_ui.status')}
                            value={form.status}
                            onChange={setField('status')}
                            fullWidth
                        >
                            <MenuItem value="active">{t('locations.statuses.active')}</MenuItem>
                            <MenuItem value="inactive">{t('locations.statuses.inactive')}</MenuItem>
                        </TextField>

                        <TextField
                            label={t('locations.notes')}
                            value={form.notes}
                            onChange={setField('notes')}
                            multiline
                            minRows={3}
                            sx={{ gridColumn: '1 / -1' }}
                            fullWidth
                        />
                    </Box>
                </Paper>

                {/* Optional Initial Neighborhoods */}
                <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                        <HolidayVillageOutlinedIcon sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#2dd4bf' : '#0f766e' }} />
                        <Typography variant="h6" fontWeight={700}>
                            {t('locations.initial_neighborhoods')}
                        </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        {t('locations.initial_neighborhoods_hint')}
                    </Typography>

                    <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder={t('locations.initial_neighborhood_placeholder')}
                            value={neighborhoodInput}
                            onChange={(e) => setNeighborhoodInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            sx={{ flex: { xs: 1, sm: '0 1 540px' } }}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<AddCircleOutlineOutlinedIcon />}
                            onClick={addInitialNeighborhood}
                            disabled={!neighborhoodInput.trim()}
                        >
                            {t('locations.add_neighborhood')}
                        </Button>
                    </Stack>

                    {initialNeighborhoods.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {initialNeighborhoods.map((name, index) => (
                                <Chip
                                    key={name}
                                    label={name}
                                    onDelete={() => removeInitialNeighborhood(index)}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    )}
                </Paper>

                {/* Action Buttons */}
                <Stack direction="row" spacing={1.5}>
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ minWidth: 140 }}
                    >
                        {t('locations.save')}
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        disabled={saving}
                        onClick={() => navigate('/admin/locations/index')}
                    >
                        {t('common.cancel')}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
