import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
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
    city: '',
    neighborhood_id: '',
    neighborhood: '',
    status: 'active',
    notes: '',
    is_main: false,
};

export default function Edit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [catalog, setCatalog] = useState([]);
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
            .catch(() => {});
        fetch.get(`branches/${id}`)
            .then((res) => {
                if (!active) return;
                const branch = res.data.data;
                setForm({
                    ...emptyForm,
                    name: branch.name || '',
                    code: branch.code || '',
                    phone: branch.phone || '',
                    address: branch.address || '',
                    city_id: branch.city_id ? String(branch.city_id) : '',
                    city: branch.city || '',
                    neighborhood_id: branch.neighborhood_id ? String(branch.neighborhood_id) : '',
                    neighborhood: branch.neighborhood || '',
                    status: branch.status || 'active',
                    notes: branch.notes || '',
                    is_main: Boolean(branch.is_main),
                });
            })
            .catch((err) => {
                if (active) setError(branchError(err, t));
            });
        return () => { active = false; };
    }, [id, t]);

    const validate = () => {
        const errors = {};
        if (!String(form.name || '').trim()) errors.name = t('common.required');
        if (!form.city_id) errors.city_id = t('common.required');
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
            await fetch.patch(`branches/${id}`, {
                name: form.name.trim(),
                code: form.code || null,
                phone: form.phone || null,
                address: form.address || null,
                city_id: Number(form.city_id),
                neighborhood_id: form.neighborhood_id ? Number(form.neighborhood_id) : null,
                status: form.status,
                notes: form.notes || null,
                is_main: form.is_main,
            });
            navigate(`/admin/branches/${id}/show`);
        } catch (err) {
            setError(branchError(err, t));
        } finally {
            setSaving(false);
        }
    };

    if (!form && !error) {
        return <Typography sx={{ p: 3 }}>{t('login.loading')}</Typography>;
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('branches.edit_title')}
                description={t('branches.hint')}
                action={<Button onClick={() => navigate(`/admin/branches/${id}/show`)} disabled={saving}>{t('common.cancel')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {form && (
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
                        {catalog.length === 0 && !form.city_id && (
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
                            required
                            error={Boolean(fieldErrors.city_id)}
                            helperText={fieldErrors.city_id}
                        >
                            {form.city_id === '' && <MenuItem value="">{t('locations.pick_city')}</MenuItem>}
                            {catalog.map((city) => <MenuItem key={city.id} value={String(city.id)}>{city.name}</MenuItem>)}
                            {form.city_id && !catalog.some((city) => String(city.id) === String(form.city_id)) && (
                                <MenuItem value={String(form.city_id)}>{form.city}</MenuItem>
                            )}
                        </TextField>
                        <TextField select label={t('branches.neighborhood')} value={form.neighborhood_id} onChange={setField('neighborhood_id')} disabled={!form.city_id}>
                            <MenuItem value="">{t('locations.no_neighborhood')}</MenuItem>
                            {(catalog.find((city) => String(city.id) === String(form.city_id))?.neighborhoods || []).map((item) => (
                                <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                            ))}
                            {form.neighborhood_id && !(catalog.find((city) => String(city.id) === String(form.city_id))?.neighborhoods || []).some((item) => String(item.id) === String(form.neighborhood_id)) && (
                                <MenuItem value={String(form.neighborhood_id)}>{form.neighborhood}</MenuItem>
                            )}
                        </TextField>
                        <TextField select label={t('workspace_ui.status')} value={form.status} onChange={setField('status')} disabled={form.is_main}>
                            <MenuItem value="active">{t('branches.statuses.active')}</MenuItem>
                            <MenuItem value="inactive">{t('branches.statuses.inactive')}</MenuItem>
                        </TextField>
                        <TextField label={t('branches.notes')} value={form.notes} onChange={setField('notes')} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { md: '1 / -1' } }} />
                    </Box>
                    <FormControlLabel
                        sx={{ mt: 1 }}
                        control={(
                            <Checkbox
                                checked={form.is_main}
                                disabled={form.is_main}
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    is_main: event.target.checked,
                                    status: event.target.checked ? 'active' : current.status,
                                }))}
                            />
                        )}
                        label={form.is_main ? t('branches.main') : t('branches.make_main')}
                    />
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2 }}>
                        <Button type="submit" variant="contained" disabled={saving}>{t('branches.save')}</Button>
                    </Stack>
                </Paper>
            )}
        </Box>
    );
}
