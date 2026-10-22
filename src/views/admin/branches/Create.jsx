import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { branchError } from './branchError.js';

const emptyForm = {
    name: '',
    code: '',
    phone: '',
    address: '',
    city_id: '',
    neighborhood_id: '',
    status: 'active',
    notes: '',
};

export default function Create() {
    
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [catalog, setCatalog] = useState([]);
    const [catalogReady, setCatalogReady] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const clearFieldError = (key) => {
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const setField = (key) => (event) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
        clearFieldError(key);
    };
    const setCity = (event) => {
        setForm((current) => ({ ...current, city_id: event.target.value, neighborhood_id: '' }));
        clearFieldError('city_id');
    };

    useEffect(() => {
        let active = true;
        fetch.get('locations/catalog')
            .then((res) => {
                if (active) setCatalog(res.data?.data?.cities || []);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setCatalogReady(true);
            });
        return () => { active = false; };
    }, []);

    const validate = () => {
        const errors = {};
        if (!String(form.name || '').trim()) errors.name = t('common.required');
        if (catalog.length > 0 && !form.city_id) errors.city_id = t('common.required');
        return errors;
    };

    const save = async (event) => {
        event.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            setError('');
            return;
        }
        setSaving(true);
        setError('');
        setFieldErrors({});
        try {
            const res = await fetch.post('branches', {
                name: form.name.trim(),
                code: form.code || null,
                phone: form.phone || null,
                address: form.address || null,
                city_id: Number(form.city_id),
                neighborhood_id: form.neighborhood_id ? Number(form.neighborhood_id) : null,
                status: form.status,
                notes: form.notes || null,
            });
            navigate(`/admin/branches/${res.data.data.id}/show`);
        } catch (err) {
            setError(branchError(err, t));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('branches.create')}
                description={t('branches.hint')}
                action={<Button onClick={() => navigate('/admin/branches/index')}>{t('branches.back')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" component="form" onSubmit={save} noValidate sx={{ p: { xs: 2, md: 3 } }}>
                <Typography fontWeight={700} sx={{ mb: 2 }}>{t('branches.details')}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                        label={t('branches.name')}
                        value={form.name}
                        onChange={setField('name')}
                        required
                        autoFocus
                        error={Boolean(fieldErrors.name)}
                        helperText={fieldErrors.name}
                        slotProps={{ htmlInput: { maxLength: 120 } }}
                    />
                    <TextField label={t('branches.code')} value={form.code} onChange={setField('code')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 20 } }} />
                    <TextField label={t('branches.phone')} value={form.phone} onChange={setField('phone')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 40 } }} />
                    <TextField label={t('branches.address')} value={form.address} onChange={setField('address')} slotProps={{ htmlInput: { maxLength: 255 } }} sx={{ gridColumn: { md: '1 / -1' } }} />
                    {catalog.length === 0 && (
                        <Alert severity="info" sx={{ gridColumn: { md: '1 / -1' } }}>
                            {t('branches.catalog_empty')}
                            <Can permission="location:create">
                                <Button component={Link} to="/admin/locations/index" size="small" sx={{ marginInlineStart: 1 }}>{t('locations.open_locations')}</Button>
                            </Can>
                        </Alert>
                    )}
                    <TextField
                        select
                        label={t('branches.city')}
                        value={form.city_id}
                        onChange={setCity}
                        required={catalog.length > 0}
                        error={Boolean(fieldErrors.city_id)}
                        helperText={fieldErrors.city_id}
                    >
                        <MenuItem value="">{t('locations.pick_city')}</MenuItem>
                        {catalog.map((city) => <MenuItem key={city.id} value={String(city.id)}>{city.name}</MenuItem>)}
                    </TextField>
                    <TextField select label={t('branches.neighborhood')} value={form.neighborhood_id} onChange={setField('neighborhood_id')} disabled={!form.city_id}>
                        <MenuItem value="">{t('locations.no_neighborhood')}</MenuItem>
                        {(catalog.find((city) => String(city.id) === String(form.city_id))?.neighborhoods || []).map((item) => (
                            <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                        ))}
                    </TextField>
                    <TextField select label={t('workspace_ui.status')} value={form.status} onChange={setField('status')}>
                        <MenuItem value="active">{t('branches.statuses.active')}</MenuItem>
                        <MenuItem value="inactive">{t('branches.statuses.inactive')}</MenuItem>
                    </TextField>
                    <TextField label={t('branches.notes')} value={form.notes} onChange={setField('notes')} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { md: '1 / -1' } }} />
                </Box>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2 }}>
                    <Button type="submit" variant="contained" disabled={saving || !catalogReady || catalog.length === 0}>{t('branches.save')}</Button>
                </Stack>
            </Paper>
        </Box>
    );
}
