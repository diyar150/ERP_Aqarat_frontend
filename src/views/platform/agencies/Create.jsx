import { useEffect, useState } from 'react';
import { currencyLabel } from '@/utils/money.js';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';

const TIMEZONES = [
    'Asia/Baghdad',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Asia/Tehran',
    'Asia/Istanbul',
    'Europe/London',
    'UTC',
];

const empty = {
    name: '',
    base_currency_code: 'IQD',
    owner_username: '',
    owner_email: '',
    owner_password: '',
    owner_password_confirm: '',
    owner_phone: '',
    locale: 'ckb',
    timezone: 'Asia/Baghdad',
    plan_code: '',
};

function apiError(err, fallback) {
    const raw = err?.response?.data;
    return {
        message: raw?.error?.message || raw?.message || fallback,
        fields: raw?.error?.fields || {},
    };
}

export default function AgencyCreate() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState(empty);
    const [plans, setPlans] = useState([]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        let active = true;
        fetch.get('platform/plans')
            .then((res) => {
                if (!active) return;
                const items = res.data?.data?.items || [];
                setPlans(items);
                setForm((current) => ({
                    ...current,
                    plan_code: current.plan_code || items[0]?.code || '',
                }));
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const setField = (key) => (event) => {
        const value = event.target.value;
        setForm((current) => ({ ...current, [key]: value }));
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
        if (!form.base_currency_code) errors.base_currency_code = required;
        if (!String(form.owner_username || '').trim()) errors.owner_username = required;
        if (!String(form.owner_email || '').trim()) errors.owner_email = required;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email.trim())) {
            errors.owner_email = t('platform.owner_email_invalid');
        }
        if (!form.owner_password) errors.owner_password = required;
        else if (form.owner_password.length < 8 || form.owner_password.length > 128) {
            errors.owner_password = t('platform.admin_password_hint');
        }
        if (!form.owner_password_confirm) errors.owner_password_confirm = required;
        else if (form.owner_password !== form.owner_password_confirm) {
            errors.owner_password_confirm = t('platform.admin_password_mismatch');
        }
        if (form.owner_phone && form.owner_phone.length > 32) {
            errors.owner_phone = t('platform.admin_phone_invalid');
        }
        if (!form.locale) errors.locale = required;
        if (!form.timezone) errors.timezone = required;
        return errors;
    };

    const submit = async (event) => {
        event.preventDefault();
        if (saving) return;
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
            const res = await fetch.post('platform/agencies', {
                name: form.name.trim(),
                base_currency_code: form.base_currency_code,
                owner_username: form.owner_username.trim(),
                owner_email: form.owner_email.trim(),
                owner_password: form.owner_password,
                owner_phone: form.owner_phone.trim() || null,
                locale: form.locale,
                timezone: form.timezone,
                plan_code: form.plan_code || null,
            });
            const id = res.data?.data?.id;
            navigate(id ? `/platform/agencies/${id}` : '/platform/agencies');
        } catch (err) {
            const parsed = apiError(err, t('platform.save_error'));
            setError(parsed.message);
            setFieldErrors(parsed.fields || {});
        } finally {
            setSaving(false);
        }
    };

    const zones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('platform.create_agency')}
                description={t('platform.create_agency_hint')}
                action={(
                    <Button onClick={() => navigate('/platform/agencies')} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2} component="form" onSubmit={submit} noValidate>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography fontWeight={700} mb={2}>{t('platform.agency_section')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            label={t('platform.agency_name')}
                            value={form.name}
                            onChange={setField('name')}
                            required
                            autoFocus
                            error={Boolean(fieldErrors.name)}
                            helperText={fieldErrors.name}
                            sx={{ gridColumn: { md: '1 / -1' } }}
                            slotProps={{ htmlInput: { maxLength: 255 } }}
                        />
                        <TextField
                            select
                            label={t('platform.currency')}
                            value={form.base_currency_code}
                            onChange={setField('base_currency_code')}
                            required
                            error={Boolean(fieldErrors.base_currency_code)}
                            helperText={fieldErrors.base_currency_code}
                        >
                            <MenuItem value="IQD">{currencyLabel("IQD")}</MenuItem>
                            <MenuItem value="USD">{currencyLabel("USD")}</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label={t('platform.plan')}
                            value={form.plan_code}
                            onChange={setField('plan_code')}
                        >
                            <MenuItem value="">{t('platform.no_plan')}</MenuItem>
                            {plans.map((plan) => (
                                <MenuItem key={plan.id} value={plan.code}>
                                    {plan.name} ({plan.code})
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography fontWeight={700} mb={2}>{t('platform.owner_section')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            label={t('platform.owner_username')}
                            value={form.owner_username}
                            onChange={setField('owner_username')}
                            required
                            error={Boolean(fieldErrors.owner_username)}
                            helperText={fieldErrors.owner_username}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                        />
                        <TextField
                            label={t('platform.owner_email')}
                            type="email"
                            value={form.owner_email}
                            onChange={setField('owner_email')}
                            required
                            error={Boolean(fieldErrors.owner_email)}
                            helperText={fieldErrors.owner_email}
                            slotProps={{ htmlInput: { dir: 'ltr', maxLength: 255 } }}
                        />
                        <TextField
                            label={t('platform.owner_phone')}
                            value={form.owner_phone}
                            onChange={setField('owner_phone')}
                            error={Boolean(fieldErrors.owner_phone)}
                            helperText={fieldErrors.owner_phone}
                            slotProps={{ htmlInput: { dir: 'ltr', maxLength: 32, inputMode: 'tel' } }}
                        />
                        <Box sx={{ display: { xs: 'none', md: 'block' } }} />
                        <TextField
                            label={t('platform.owner_password')}
                            type={showPassword ? 'text' : 'password'}
                            value={form.owner_password}
                            onChange={setField('owner_password')}
                            required
                            error={Boolean(fieldErrors.owner_password)}
                            helperText={fieldErrors.owner_password || t('platform.admin_password_hint')}
                            autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => setShowPassword((current) => !current)}
                                            aria-label={t('login.toggle_secret')}
                                        >
                                            {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            label={t('platform.password_confirm')}
                            type={showPassword ? 'text' : 'password'}
                            value={form.owner_password_confirm}
                            onChange={setField('owner_password_confirm')}
                            required
                            error={Boolean(fieldErrors.owner_password_confirm)}
                            helperText={fieldErrors.owner_password_confirm}
                            autoComplete="new-password"
                        />
                    </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography fontWeight={700} mb={2}>{t('platform.regional_section')}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            select
                            required
                            label={t('platform.locale')}
                            value={form.locale}
                            onChange={setField('locale')}
                            error={Boolean(fieldErrors.locale)}
                            helperText={fieldErrors.locale}
                        >
                            <MenuItem value="ckb">کوردی</MenuItem>
                            <MenuItem value="ar">العربية</MenuItem>
                            <MenuItem value="en">English</MenuItem>
                        </TextField>
                        <TextField
                            select
                            required
                            label={t('platform.timezone')}
                            value={form.timezone}
                            onChange={setField('timezone')}
                            error={Boolean(fieldErrors.timezone)}
                            helperText={fieldErrors.timezone}
                        >
                            {zones.map((zone) => (
                                <MenuItem key={zone} value={zone}>{zone}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Paper>

                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button onClick={() => navigate('/platform/agencies')} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" variant="contained" disabled={saving}>
                        {saving ? t('common.updating') : t('common.save')}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
