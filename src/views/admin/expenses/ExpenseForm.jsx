import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { currencyLabel, groupPriceInput, plainPrice } from '@/utils/money.js';
import { cashChanged, validateExpense } from './expenseForm.js';

export default function ExpenseForm({
    title,
    initial,
    offices,
    categories,
    currencies,
    saving,
    error,
    askReason = false,
    officeLocked = false,
    currencyLocked = false,
    notice = '',
    onSubmit,
    onCancel,
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState(initial);
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
        const value = event.target.value;
        setForm((current) => ({ ...current, [key]: value }));
        clearFieldError(key);
    };

    const save = (event) => {
        event.preventDefault();
        const nextErrors = validateExpense(form, { offices, askReason, initial, t });
        if (Object.keys(nextErrors).length) {
            setFieldErrors(nextErrors);
            return;
        }
        const changed = askReason && cashChanged(initial, form);
        setFieldErrors({});
        onSubmit({
            name: form.name.trim(),
            expense_category_id: form.expense_category_id ? Number(form.expense_category_id) : '',
            currency_id: form.currency_id ? Number(form.currency_id) : '',
            branch_id: form.branch_id ? Number(form.branch_id) : '',
            price: plainPrice(form.price),
            date: form.date,
            note: form.note.trim() || null,
            reason: changed ? String(form.reason).trim() : null,
        }, setFieldErrors);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>{title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('expenses.branch_hint')}</Typography>
                </Box>
                <Button onClick={onCancel}>{t('common.cancel')}</Button>
            </Stack>
            {notice && <Alert severity="info" sx={{ mb: 2 }}>{notice}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack component="form" spacing={2} onSubmit={save} noValidate>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField label={t('expenses.name')} value={form.name} onChange={setField('name')} required error={Boolean(fieldErrors.name)} helperText={fieldErrors.name} />
                        <TextField select label={t('expenses.category')} value={form.expense_category_id || ''} onChange={setField('expense_category_id')} required error={Boolean(fieldErrors.expense_category_id)} helperText={fieldErrors.expense_category_id}>
                            <MenuItem value="">{t('expenses.select_category')}</MenuItem>
                            {categories.map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}
                        </TextField>
                        <TextField
                            label={t('expenses.price')}
                            value={form.price}
                            onChange={(event) => {
                                setForm((current) => ({ ...current, price: groupPriceInput(event.target.value) }));
                                clearFieldError('price');
                            }}
                            required
                            error={Boolean(fieldErrors.price)}
                            helperText={fieldErrors.price}
                            slotProps={{ htmlInput: { inputMode: 'decimal', dir: 'ltr' } }}
                        />
                        <TextField
                            select
                            label={t('expenses.currency')}
                            value={form.currency_id || ''}
                            onChange={setField('currency_id')}
                            required
                            disabled={currencyLocked}
                            error={Boolean(fieldErrors.currency_id)}
                            helperText={fieldErrors.currency_id || (currencyLocked ? t('expenses.currency_locked') : '')}
                        >
                            <MenuItem value="">{t('expenses.currency')}</MenuItem>
                            {currencies.map((currency) => (
                                <MenuItem key={currency.id} value={String(currency.id)}>
                                    {currencyLabel(currency.symbol || currency.code)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('expenses.branch')}
                            value={form.branch_id || ''}
                            onChange={setField('branch_id')}
                            required
                            disabled={officeLocked || offices.length === 0}
                            error={Boolean(fieldErrors.branch_id)}
                            helperText={fieldErrors.branch_id || (officeLocked ? t('expenses.office_locked') : t('expenses.branch_hint'))}
                        >
                            {offices.map((office) => (
                                <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField label={t('expenses.date')} type="date" value={form.date || ''} onChange={setField('date')} required error={Boolean(fieldErrors.date)} helperText={fieldErrors.date} slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField label={t('expenses.note')} value={form.note} onChange={setField('note')} multiline minRows={3} sx={{ gridColumn: { md: '1 / -1' } }} />
                        {askReason && (
                            <TextField
                                label={t('expenses.reason')}
                                value={form.reason || ''}
                                onChange={setField('reason')}
                                error={Boolean(fieldErrors.reason)}
                                helperText={fieldErrors.reason || t('expenses.reason_hint')}
                                sx={{ gridColumn: { md: '1 / -1' } }}
                            />
                        )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained" disabled={saving}>{t('expenses.save')}</Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
