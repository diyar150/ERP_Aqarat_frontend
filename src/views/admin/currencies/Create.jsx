import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    FormControlLabel,
    Paper,
    Stack,
    Switch,
    TextField,
} from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { currencyError, currencyFieldErrors } from './currencyForm.js';

const emptyForm = {
    name: '',
    symbol: '',
    exchange_rate: '',
    is_main_currency: false,
};

export default function CurrencyCreate() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

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

    const validate = () => {
        const next = {};
        if (!String(form.name || '').trim()) next.name = t('common.required');
        if (!String(form.symbol || '').trim()) next.symbol = t('common.required');
        if (!String(form.exchange_rate ?? '').trim()) next.exchange_rate = t('common.required');
        else if (!(Number(form.exchange_rate) > 0)) next.exchange_rate = t('currencies.rate_invalid');
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
            await fetch.post('admin/currencies', {
                name: form.name.trim(),
                symbol: form.symbol.trim(),
                exchange_rate: Number(form.exchange_rate),
                is_main_currency: Boolean(form.is_main_currency),
            });
            navigate('/admin/currencies/index');
        } catch (err) {
            const fields = currencyFieldErrors(err);
            if (fields) setFieldErrors(fields);
            else setError(currencyError(err, t, 'currencies.create_error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('currencies.create_title')}
                description={t('currencies.create_hint')}
                action={<Button onClick={() => navigate('/admin/currencies/index')}>{t('currencies.back')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack component="form" spacing={2} onSubmit={save} noValidate>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            label={t('currencies.name')}
                            value={form.name}
                            onChange={setField('name')}
                            required
                            placeholder={t('currencies.name_placeholder')}
                            error={Boolean(fieldErrors.name)}
                            helperText={fieldErrors.name}
                            disabled={saving}
                        />
                        <TextField
                            label={t('currencies.symbol')}
                            value={form.symbol}
                            onChange={setField('symbol')}
                            required
                            placeholder={t('currencies.symbol_placeholder')}
                            error={Boolean(fieldErrors.symbol)}
                            helperText={fieldErrors.symbol}
                            disabled={saving}
                            slotProps={{ htmlInput: { dir: 'ltr' } }}
                        />
                        <TextField
                            label={t('currencies.exchange_rate')}
                            value={form.exchange_rate}
                            onChange={setField('exchange_rate')}
                            required
                            placeholder={t('currencies.exchange_rate_placeholder')}
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
                    <Alert severity="info">{t('currencies.main_hint')}</Alert>
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
