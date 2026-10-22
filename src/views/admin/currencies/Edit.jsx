import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControlLabel,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { currencyError, currencyFieldErrors } from './currencyForm.js';

export default function CurrencyEdit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [ready, setReady] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let active = true;
        fetch.get(`admin/currencies/${id}`)
            .then((res) => {
                if (!active) return;
                const data = res.data?.data || res.data;
                if (!data?.id) {
                    navigate('/admin/currencies/index');
                    return;
                }
                setReady({ name: data.name || '', symbol: data.symbol || '' });
                setForm({
                    exchange_rate: data.exchange_rate != null ? String(data.exchange_rate) : '',
                    is_main_currency: Boolean(data.is_main_currency),
                });
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 404) navigate('/admin/currencies/index');
                else setError(currencyError(err, t));
            });
        return () => { active = false; };
    }, [id, navigate, t]);

    const clearFieldError = (key) => {
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const setRate = (event) => {
        setForm((current) => ({ ...current, exchange_rate: event.target.value }));
        clearFieldError('exchange_rate');
    };

    const setMain = (event) => {
        const checked = event.target.checked;
        setForm((current) => ({
            ...current,
            is_main_currency: checked,
            exchange_rate: checked ? '1' : current.exchange_rate,
        }));
        clearFieldError('is_main_currency');
        clearFieldError('exchange_rate');
    };

    const save = async (event) => {
        event.preventDefault();
        const next = {};
        if (!String(form.exchange_rate ?? '').trim()) next.exchange_rate = t('common.required');
        else if (!(Number(form.exchange_rate) > 0)) next.exchange_rate = t('currencies.rate_invalid');
        if (Object.keys(next).length) {
            setFieldErrors(next);
            setError('');
            return;
        }
        setSaving(true);
        setError('');
        setFieldErrors({});
        try {
            await fetch.put(`admin/currencies/${id}`, {
                exchange_rate: Number(form.exchange_rate),
                is_main_currency: Boolean(form.is_main_currency),
            });
            navigate('/admin/currencies/index');
        } catch (err) {
            const fields = currencyFieldErrors(err);
            if (fields) setFieldErrors(fields);
            else setError(currencyError(err, t, 'currencies.update_error'));
        } finally {
            setSaving(false);
        }
    };

    if (!form && !error) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (!form) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Alert severity="error">{error || t('currencies.not_found')}</Alert>
                <Button sx={{ mt: 2 }} onClick={() => navigate('/admin/currencies/index')}>{t('currencies.back')}</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('currencies.edit_title')}
                description={t('currencies.edit_hint')}
                action={<Button onClick={() => navigate('/admin/currencies/index')}>{t('currencies.back')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                    <Typography fontWeight={700}>{ready?.name}</Typography>
                    <Typography color="text.secondary" dir="ltr">{ready?.symbol}</Typography>
                    <StatusChip
                        status={form.is_main_currency ? 'active' : 'inactive'}
                        label={form.is_main_currency ? t('currencies.main') : t('currencies.secondary')}
                    />
                </Stack>
                <Stack component="form" spacing={2} onSubmit={save} noValidate>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            label={t('currencies.exchange_rate')}
                            value={form.exchange_rate}
                            onChange={setRate}
                            required
                            error={Boolean(fieldErrors.exchange_rate)}
                            helperText={fieldErrors.exchange_rate || t('currencies.rate_hint')}
                            disabled={saving || form.is_main_currency}
                            slotProps={{ htmlInput: { inputMode: 'decimal', dir: 'ltr' } }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.is_main_currency}
                                    onChange={setMain}
                                    disabled={saving}
                                />
                            }
                            label={t('currencies.is_main_currency')}
                            sx={{ alignSelf: 'center', m: 0 }}
                        />
                    </Box>
                    {fieldErrors.is_main_currency && (
                        <Alert severity="error">{fieldErrors.is_main_currency}</Alert>
                    )}
                    <Alert severity="info">{t('currencies.edit_locked_hint')}</Alert>
                    <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained" disabled={saving}>
                            {saving ? t('common.processing') : t('currencies.save')}
                        </Button>
                        <Button disabled={saving} onClick={() => navigate('/admin/currencies/index')}>
                            {t('common.cancel')}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
