import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert, Avatar, Box, Button, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import fetch from '@/utils/fetch';

const TIMEZONES = [
    'Asia/Baghdad',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Asia/Tehran',
    'Asia/Istanbul',
    'Europe/London',
    'UTC',
];

function profileError(err, t) {
    const fields = err.response?.data?.error?.fields || {};
    if (fields.file) return t('workspace.logo_invalid');
    if (fields.email) return t('workspace.email_invalid');
    if (fields.website) return t('workspace.website_invalid');
    if (fields.name) return t('workspace.name_required');
    if (fields.timezone) return t('workspace.timezone_invalid');
    if (fields.locale) return t('workspace.locale_invalid');
    if (fields.base_currency_id) return t('workspace.currency_required');
    return err.response?.data?.error?.message || t('login.error');
}

const EMPTY = {
    name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    registration_number: '',
    tax_number: '',
    license_number: '',
    base_currency_id: '',
    timezone: 'Asia/Baghdad',
    locale: 'ckb',
};

function toForm(data) {
    return {
        ...EMPTY,
        name: data?.name || '',
        phone: data?.phone || '',
        email: data?.email || '',
        website: data?.website || '',
        address: data?.address || '',
        city: data?.city || '',
        registration_number: data?.registration_number || '',
        tax_number: data?.tax_number || '',
        license_number: data?.license_number || '',
        base_currency_id: data?.base_currency_id || '',
        timezone: data?.timezone || 'Asia/Baghdad',
        locale: data?.locale || 'ckb',
    };
}

export default function Edit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [workspace, setWorkspace] = useState(null);
    const [form, setForm] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const applyWorkspace = (data) => {
        setWorkspace(data);
        if (!data?.has_logo) setLogoUrl('');
        setForm(toForm(data));
    };

    useEffect(() => {
        let active = true;
        fetch.get('agency')
            .then((res) => {
                if (active) applyWorkspace(res.data?.data);
            })
            .catch(() => {
                if (active) setError(t('operations.load_error'));
            });
        return () => { active = false; };
    }, [t]);

    useEffect(() => {
        if (!workspace?.has_logo) return undefined;
        let active = true;
        let objectUrl = '';
        fetch.get('agency/logo', { responseType: 'blob' })
            .then((res) => {
                if (!active) return;
                objectUrl = URL.createObjectURL(res.data);
                setLogoUrl(objectUrl);
            })
            .catch(() => {
                if (active) setLogoUrl('');
            });
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [workspace?.has_logo, workspace?.updated_at]);

    const setField = (key) => (event) => {
        setForm({ ...form, [key]: event.target.value });
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const validate = () => {
        const errors = {};
        const required = t('common.required');
        if (!String(form.name || '').trim()) errors.name = required;
        if (!form.base_currency_id) errors.base_currency_id = required;
        if (!form.timezone) errors.timezone = required;
        if (!form.locale) errors.locale = required;
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
            await fetch.patch('agency', {
                ...form,
                name: form.name.trim(),
                base_currency_id: Number(form.base_currency_id),
            });
            navigate('/admin/agency/show');
        } catch (err) {
            setError(profileError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const uploadLogo = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const body = new FormData();
        body.append('file', file);
        setSaving(true);
        setError('');
        try {
            const res = await fetch.post('agency/logo', body);
            applyWorkspace(res.data.data);
        } catch (err) {
            setError(profileError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const removeLogo = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch.delete('agency/logo');
            applyWorkspace(res.data.data);
        } catch (err) {
            setError(profileError(err, t));
        } finally {
            setSaving(false);
        }
    };

    if (!form) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                {error
                    ? <Alert severity="error">{error}</Alert>
                    : <Typography>{t('login.loading')}</Typography>}
            </Box>
        );
    }

    const zones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('workspace.edit_title')}
                description={t('workspace.hint')}
                action={(
                    <Button onClick={() => navigate('/admin/agency/show')} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2} component="form" onSubmit={save} noValidate>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography fontWeight={700} mb={2}>{t('workspace.identity')}</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, mb: 2 }}>
                        <Avatar src={workspace?.has_logo ? (logoUrl || undefined) : undefined} variant="rounded" sx={{ width: 72, height: 72, bgcolor: 'action.hover', color: 'text.primary', fontWeight: 700 }}>
                            {(form.name || 'A').slice(0, 1)}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" color="text.secondary" mb={1}>{t('workspace.logo_hint')}</Typography>
                            <Can permission="agency:update">
                                <Stack direction="row" spacing={1}>
                                    <Button variant="outlined" component="label" disabled={saving}>
                                        {t('workspace.upload_logo')}
                                        <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} />
                                    </Button>
                                    {workspace?.has_logo && (
                                        <Button variant="text" color="warning" disabled={saving} onClick={removeLogo}>
                                            {t('workspace.remove_logo')}
                                        </Button>
                                    )}
                                </Stack>
                            </Can>
                        </Box>
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            label={t('workspace.name')}
                            value={form.name}
                            onChange={setField('name')}
                            required
                            error={Boolean(fieldErrors.name)}
                            helperText={fieldErrors.name}
                            slotProps={{ htmlInput: { maxLength: 255 } }}
                        />
                        <TextField label={t('workspace.phone')} value={form.phone} onChange={setField('phone')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 32 } }} />
                        <TextField label={t('workspace.email')} value={form.email} onChange={setField('email')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 255 } }} />
                        <TextField label={t('workspace.website')} value={form.website} onChange={setField('website')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 255 } }} />
                    </Box>
                </Paper>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography fontWeight={700} mb={2}>{t('workspace.legal')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField label={t('workspace.address')} value={form.address} onChange={setField('address')} slotProps={{ htmlInput: { maxLength: 255 } }} />
                        <TextField label={t('workspace.city')} value={form.city} onChange={setField('city')} slotProps={{ htmlInput: { maxLength: 120 } }} />
                        <TextField label={t('workspace.registration_number')} value={form.registration_number} onChange={setField('registration_number')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 80 } }} />
                        <TextField label={t('workspace.tax_number')} value={form.tax_number} onChange={setField('tax_number')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 80 } }} />
                        <TextField label={t('workspace.license_number')} value={form.license_number} onChange={setField('license_number')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 80 } }} />
                    </Box>
                </Paper>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography fontWeight={700} mb={2}>{t('workspace.regional')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            select
                            required
                            label={t('workspace.base_currency')}
                            value={form.base_currency_id}
                            onChange={setField('base_currency_id')}
                            error={Boolean(fieldErrors.base_currency_id)}
                            helperText={fieldErrors.base_currency_id}
                        >
                            {(workspace?.currencies || []).map((currency) => (
                                <MenuItem key={currency.id} value={currency.id}>
                                    {currency.code} — {currency.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            required
                            label={t('workspace.timezone')}
                            value={form.timezone}
                            onChange={setField('timezone')}
                            error={Boolean(fieldErrors.timezone)}
                            helperText={fieldErrors.timezone}
                        >
                            {zones.map((zone) => (
                                <MenuItem key={zone} value={zone}>{zone}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            required
                            label={t('workspace.locale')}
                            value={form.locale}
                            onChange={setField('locale')}
                            error={Boolean(fieldErrors.locale)}
                            helperText={fieldErrors.locale}
                        >
                            <MenuItem value="ckb">کوردی</MenuItem>
                            <MenuItem value="ar">العربية</MenuItem>
                            <MenuItem value="en">English</MenuItem>
                        </TextField>
                    </Box>
                </Paper>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" disabled={saving}>{t('workspace.save')}</Button>
                </Stack>
            </Stack>
        </Box>
    );
}
