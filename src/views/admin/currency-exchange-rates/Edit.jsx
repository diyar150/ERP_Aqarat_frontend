import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { formatNumber } from '@/utils/format';
import {
    asDateInput,
    currencyLabel,
    rateError,
    rateFieldErrors,
} from './rateForm.js';

export default function CurrencyExchangeRateEdit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [currencies, setCurrencies] = useState([]);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('admin/currencies', { params: { page: 1, limit: 500 } }),
            fetch.get(`admin/currency-exchange-rates/${id}`),
        ])
            .then(([currenciesRes, itemRes]) => {
                if (!active) return;
                const rows = Array.isArray(currenciesRes.data?.data)
                    ? currenciesRes.data.data
                    : (Array.isArray(currenciesRes.data) ? currenciesRes.data : []);
                setCurrencies(rows);
                const data = itemRes.data?.data || itemRes.data;
                if (!data?.id) {
                    navigate('/admin/currency-exchange-rates/index');
                    return;
                }
                setForm({
                    base_currency_id: String(data.base_currency_id),
                    variable_currency_id: String(data.variable_currency_id),
                    base_amount: data.base_amount != null ? String(data.base_amount) : '',
                    variable_amount: data.variable_amount != null ? String(data.variable_amount) : '',
                    effective_date: asDateInput(data.effective_date),
                });
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 404) navigate('/admin/currency-exchange-rates/index');
                else setError(rateError(err, t));
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

    const setField = (key) => (event) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
        clearFieldError(key);
    };

    const validate = () => {
        const next = {};
        if (!form.base_currency_id) next.base_currency_id = t('common.required');
        if (!form.variable_currency_id) next.variable_currency_id = t('common.required');
        else if (form.variable_currency_id === form.base_currency_id) {
            next.variable_currency_id = t('currency_exchange_rates.same_currency');
        }
        if (!String(form.base_amount ?? '').trim()) next.base_amount = t('common.required');
        else if (!(Number(form.base_amount) > 0)) next.base_amount = t('currency_exchange_rates.amount_invalid');
        if (!String(form.variable_amount ?? '').trim()) next.variable_amount = t('common.required');
        else if (!(Number(form.variable_amount) > 0)) next.variable_amount = t('currency_exchange_rates.amount_invalid');
        if (!form.effective_date) next.effective_date = t('common.required');
        return next;
    };

    const save = async (event) => {
        event.preventDefault();
        const next = validate();
        if (Object.keys(next).length) {
            setFieldErrors(next);
            setError('');
            return;
        }
        setSaving(true);
        setError('');
        setFieldErrors({});
        try {
            await fetch.put(`admin/currency-exchange-rates/${id}`, {
                base_currency_id: Number(form.base_currency_id),
                variable_currency_id: Number(form.variable_currency_id),
                base_amount: Number(form.base_amount),
                variable_amount: Number(form.variable_amount),
                effective_date: form.effective_date,
            });
            navigate('/admin/currency-exchange-rates/index');
        } catch (err) {
            const fields = rateFieldErrors(err);
            if (fields) setFieldErrors(fields);
            else setError(rateError(err, t, 'currency_exchange_rates.update_error'));
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
                <Alert severity="error">{error || t('currency_exchange_rates.not_found')}</Alert>
                <Button sx={{ mt: 2 }} onClick={() => navigate('/admin/currency-exchange-rates/index')}>
                    {t('currency_exchange_rates.back')}
                </Button>
            </Box>
        );
    }

    const base = currencies.find((row) => String(row.id) === String(form.base_currency_id));
    const variable = currencies.find((row) => String(row.id) === String(form.variable_currency_id));
    const previewRate = Number(form.base_amount) > 0 && Number(form.variable_amount) > 0
        ? Number(form.variable_amount) / Number(form.base_amount)
        : null;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('currency_exchange_rates.edit_title')}
                description={t('currency_exchange_rates.edit_hint')}
                action={(
                    <Button onClick={() => navigate('/admin/currency-exchange-rates/index')}>
                        {t('currency_exchange_rates.back')}
                    </Button>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack component="form" spacing={2} onSubmit={save} noValidate>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            select
                            label={t('currency_exchange_rates.base_currency')}
                            value={form.base_currency_id}
                            onChange={setField('base_currency_id')}
                            required
                            error={Boolean(fieldErrors.base_currency_id)}
                            helperText={fieldErrors.base_currency_id || t('currency_exchange_rates.base_hint')}
                            disabled={saving}
                        >
                            {currencies.map((currency) => (
                                <MenuItem key={currency.id} value={String(currency.id)}>
                                    {currencyLabel(currency)}
                                    {currency.is_main_currency ? ` · ${t('currencies.main')}` : ''}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('currency_exchange_rates.variable_currency')}
                            value={form.variable_currency_id}
                            onChange={setField('variable_currency_id')}
                            required
                            error={Boolean(fieldErrors.variable_currency_id)}
                            helperText={fieldErrors.variable_currency_id}
                            disabled={saving}
                        >
                            {currencies
                                .filter((currency) => String(currency.id) !== String(form.base_currency_id))
                                .map((currency) => (
                                    <MenuItem key={currency.id} value={String(currency.id)}>
                                        {currencyLabel(currency)}
                                    </MenuItem>
                                ))}
                        </TextField>
                        <TextField
                            label={`${t('currency_exchange_rates.base_amount')}${base?.symbol ? ` (${base.symbol})` : ''}`}
                            value={form.base_amount}
                            onChange={setField('base_amount')}
                            required
                            error={Boolean(fieldErrors.base_amount)}
                            helperText={fieldErrors.base_amount || t('currency_exchange_rates.amount_hint')}
                            disabled={saving}
                            slotProps={{ htmlInput: { inputMode: 'decimal', dir: 'ltr' } }}
                        />
                        <TextField
                            label={`${t('currency_exchange_rates.variable_amount')}${variable?.symbol ? ` (${variable.symbol})` : ''}`}
                            value={form.variable_amount}
                            onChange={setField('variable_amount')}
                            required
                            error={Boolean(fieldErrors.variable_amount)}
                            helperText={fieldErrors.variable_amount}
                            disabled={saving}
                            slotProps={{ htmlInput: { inputMode: 'decimal', dir: 'ltr' } }}
                        />
                        <TextField
                            type="date"
                            label={t('currency_exchange_rates.effective_date')}
                            value={form.effective_date}
                            onChange={setField('effective_date')}
                            required
                            error={Boolean(fieldErrors.effective_date)}
                            helperText={fieldErrors.effective_date || t('currency_exchange_rates.date_hint')}
                            disabled={saving}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Box>

                    {previewRate != null && (
                        <Alert severity="info">
                            <Typography variant="body2">
                                {t('currency_exchange_rates.preview_rate', {
                                    rate: formatNumber(previewRate, 6),
                                    base: base?.symbol || t('currency_exchange_rates.base_currency'),
                                    variable: variable?.symbol || t('currency_exchange_rates.variable_currency'),
                                })}
                            </Typography>
                        </Alert>
                    )}

                    <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained" disabled={saving}>
                            {saving ? t('common.processing') : t('currency_exchange_rates.save')}
                        </Button>
                        <Button disabled={saving} onClick={() => navigate('/admin/currency-exchange-rates/index')}>
                            {t('common.cancel')}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
