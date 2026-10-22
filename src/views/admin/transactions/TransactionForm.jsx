import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import {
    emptyTransactionForm,
    optionLabel,
    validateTransactionCreate,
} from './transactionForm.js';

function FormSection({ title, hint, children }) {
    return (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ mb: 2 }}>
                <Typography fontWeight={700}>{title}</Typography>
                {hint ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {hint}
                    </Typography>
                ) : null}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {children}
            </Box>
        </Paper>
    );
}

export default function TransactionForm({
    initial = {},
    currencies = [],
    agents = [],
    saving = false,
    error = '',
    onSubmit,
    onCancel,
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState(() => ({
        ...emptyTransactionForm,
        ...initial.form,
    }));
    const [property, setProperty] = useState(initial.property || null);
    const [principal, setPrincipal] = useState(initial.principal || null);
    const [counterparty, setCounterparty] = useState(initial.counterparty || null);
    const [staffAgent, setStaffAgent] = useState(initial.staffAgent || null);
    const [propertyQuery, setPropertyQuery] = useState(
        initial.property ? optionLabel(initial.property, ['reference_number', 'title']) : '',
    );
    const [principalQuery, setPrincipalQuery] = useState(initial.principal?.display_name || '');
    const [counterpartyQuery, setCounterpartyQuery] = useState(initial.counterparty?.display_name || '');
    const [propertyOptions, setPropertyOptions] = useState(initial.property ? [initial.property] : []);
    const [principalOptions, setPrincipalOptions] = useState(initial.principal ? [initial.principal] : []);
    const [counterpartyOptions, setCounterpartyOptions] = useState(
        initial.counterparty ? [initial.counterparty] : [],
    );
    const [fieldErrors, setFieldErrors] = useState({});

    const sale = form.transaction_type === 'sale';
    const principalRole = sale ? 'buyer' : 'renter';
    const counterpartyRole = sale ? 'seller' : 'owner';
    const agentOptions = Array.isArray(agents) ? agents : [];

    const clearFieldError = (key) => {
        setFieldErrors((current) => (current[key] ? { ...current, [key]: '' } : current));
    };

    const setField = (key) => (event) => {
        const value = event.target.value;
        setForm((current) => ({ ...current, [key]: value }));
        clearFieldError(key);
        if (key === 'transaction_type') {
            setFieldErrors((current) => ({
                ...current,
                purchase_price: '',
                rent_amount: '',
                period_start: '',
                period_end: '',
                down_payment: '',
            }));
        }
        if (key === 'buyer_side' || key === 'seller_side') {
            setFieldErrors((current) => ({ ...current, buyer_side: '', seller_side: '' }));
        }
    };

    useEffect(() => {
        let active = true;
        const handle = setTimeout(() => {
            fetch.get('properties', { params: { q: propertyQuery.trim(), limit: 25 } })
                .then((res) => {
                    if (active) setPropertyOptions(res.data?.data?.items || []);
                })
                .catch(() => {
                    if (active) setPropertyOptions([]);
                });
        }, 300);
        return () => {
            active = false;
            clearTimeout(handle);
        };
    }, [propertyQuery]);

    useEffect(() => {
        let active = true;
        const handle = setTimeout(() => {
            fetch.get('parties', { params: { q: principalQuery.trim(), limit: 25 } })
                .then((res) => {
                    if (active) setPrincipalOptions(res.data?.data?.items || []);
                })
                .catch(() => {
                    if (active) setPrincipalOptions([]);
                });
        }, 300);
        return () => {
            active = false;
            clearTimeout(handle);
        };
    }, [principalQuery]);

    useEffect(() => {
        let active = true;
        const handle = setTimeout(() => {
            fetch.get('parties', { params: { q: counterpartyQuery.trim(), limit: 25 } })
                .then((res) => {
                    if (active) setCounterpartyOptions(res.data?.data?.items || []);
                })
                .catch(() => {
                    if (active) setCounterpartyOptions([]);
                });
        }, 300);
        return () => {
            active = false;
            clearTimeout(handle);
        };
    }, [counterpartyQuery]);

    const save = (event) => {
        event.preventDefault();
        const nextErrors = validateTransactionCreate({
            form,
            property,
            principal,
            counterparty,
            staffAgent,
            sale,
            t,
        });
        if (Object.keys(nextErrors).length) {
            setFieldErrors(nextErrors);
            return;
        }
        setFieldErrors({});
        onSubmit({
            form,
            property,
            principal,
            counterparty,
            staffAgent,
        }, setFieldErrors);
    };

    return (
        <Stack component="form" spacing={2} onSubmit={save} noValidate>
            {error ? <Alert severity="error">{error}</Alert> : null}

            <FormSection title={t('transactions.details')} hint={t('transactions.create_hint')}>
                <TextField
                    label={t('transactions.reference')}
                    value={form.reference_number}
                    onChange={setField('reference_number')}
                    required
                    error={Boolean(fieldErrors.reference_number)}
                    helperText={fieldErrors.reference_number}
                />
                <TextField select label={t('transactions.type')} value={form.transaction_type} onChange={setField('transaction_type')}>
                    <MenuItem value="sale">{t('transactions.types.sale')}</MenuItem>
                    <MenuItem value="rent">{t('transactions.types.rent')}</MenuItem>
                </TextField>
            </FormSection>

            <FormSection title={t('transactions.parties')} hint={t('transactions.checklist_parties')}>
                <Autocomplete
                    sx={{ gridColumn: { md: '1 / -1' } }}
                    options={propertyOptions}
                    value={property}
                    inputValue={propertyQuery}
                    onInputChange={(_, value) => setPropertyQuery(value)}
                    onChange={(_, value) => {
                        setProperty(value);
                        clearFieldError('property');
                        if (value?.currency_id && !form.currency_id) {
                            setForm((current) => ({ ...current, currency_id: value.currency_id }));
                            clearFieldError('currency_id');
                        }
                    }}
                    getOptionLabel={(option) => optionLabel(option, ['reference_number', 'title'])}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    filterOptions={(options) => options}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t('transactions.search_property')}
                            required
                            error={Boolean(fieldErrors.property)}
                            helperText={fieldErrors.property}
                        />
                    )}
                />
                <Autocomplete
                    options={principalOptions}
                    value={principal}
                    inputValue={principalQuery}
                    onInputChange={(_, value) => setPrincipalQuery(value)}
                    onChange={(_, value) => {
                        setPrincipal(value);
                        clearFieldError('principal');
                    }}
                    getOptionLabel={(option) => option.display_name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    filterOptions={(options) => options}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t(`transactions.roles.${principalRole}`)}
                            required
                            error={Boolean(fieldErrors.principal)}
                            helperText={fieldErrors.principal}
                        />
                    )}
                />
                <Autocomplete
                    options={counterpartyOptions}
                    value={counterparty}
                    inputValue={counterpartyQuery}
                    onInputChange={(_, value) => setCounterpartyQuery(value)}
                    onChange={(_, value) => {
                        setCounterparty(value);
                        clearFieldError('counterparty');
                    }}
                    getOptionLabel={(option) => option.display_name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    filterOptions={(options) => options}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={t(`transactions.roles.${counterpartyRole}`)}
                            required
                            error={Boolean(fieldErrors.counterparty)}
                            helperText={fieldErrors.counterparty}
                        />
                    )}
                />
            </FormSection>

            <FormSection title={t('transactions.commercial')}>
                <TextField
                    select
                    label={t('transactions.currency')}
                    value={form.currency_id}
                    onChange={setField('currency_id')}
                    required
                    error={Boolean(fieldErrors.currency_id)}
                    helperText={fieldErrors.currency_id}
                >
                    {currencies.map((currency) => (
                        <MenuItem key={currency.id} value={currency.id}>{currency.code}</MenuItem>
                    ))}
                </TextField>
                {sale ? (
                    <>
                        <TextField
                            label={t('transactions.price')}
                            value={form.purchase_price}
                            onChange={setField('purchase_price')}
                            required
                            error={Boolean(fieldErrors.purchase_price)}
                            helperText={fieldErrors.purchase_price}
                        />
                        <TextField
                            label={t('transactions.down_payment')}
                            value={form.down_payment}
                            onChange={setField('down_payment')}
                            error={Boolean(fieldErrors.down_payment)}
                            helperText={fieldErrors.down_payment}
                        />
                    </>
                ) : (
                    <>
                        <TextField
                            label={t('transactions.rent')}
                            value={form.rent_amount}
                            onChange={setField('rent_amount')}
                            required
                            error={Boolean(fieldErrors.rent_amount)}
                            helperText={fieldErrors.rent_amount}
                        />
                        <TextField
                            label={t('transactions.deposit')}
                            value={form.deposit_amount}
                            onChange={setField('deposit_amount')}
                        />
                        <TextField
                            label={t('transactions.period_start')}
                            type="date"
                            value={form.period_start}
                            onChange={setField('period_start')}
                            slotProps={{ inputLabel: { shrink: true } }}
                            required
                            error={Boolean(fieldErrors.period_start)}
                            helperText={fieldErrors.period_start}
                        />
                        <TextField
                            label={t('transactions.period_end')}
                            type="date"
                            value={form.period_end}
                            onChange={setField('period_end')}
                            slotProps={{ inputLabel: { shrink: true } }}
                            required
                            error={Boolean(fieldErrors.period_end)}
                            helperText={fieldErrors.period_end}
                        />
                    </>
                )}
            </FormSection>

            <FormSection title={t('transactions.commission_sides')} hint={t('transactions.checklist_commission')}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ gridColumn: { md: '1 / -1' } }}>
                    <TextField select label={t('transactions.commission_kind')} value={form.buyer_side_kind} onChange={setField('buyer_side_kind')} sx={{ minWidth: 140 }}>
                        <MenuItem value="flat">{t('transactions.commission_flat')}</MenuItem>
                        <MenuItem value="percent">{t('transactions.commission_percent')}</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('transactions.commission_from', { side: t(`transactions.roles.${principalRole}`) })}
                        value={form.buyer_side}
                        onChange={setField('buyer_side')}
                        error={Boolean(fieldErrors.buyer_side)}
                        helperText={fieldErrors.buyer_side || (form.buyer_side_kind === 'percent' ? t('transactions.commission_rate_hint') : undefined)}
                    />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ gridColumn: { md: '1 / -1' } }}>
                    <TextField select label={t('transactions.commission_kind')} value={form.seller_side_kind} onChange={setField('seller_side_kind')} sx={{ minWidth: 140 }}>
                        <MenuItem value="flat">{t('transactions.commission_flat')}</MenuItem>
                        <MenuItem value="percent">{t('transactions.commission_percent')}</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        label={t('transactions.commission_from', { side: t(`transactions.roles.${counterpartyRole}`) })}
                        value={form.seller_side}
                        onChange={setField('seller_side')}
                        error={Boolean(fieldErrors.seller_side)}
                        helperText={fieldErrors.seller_side || (form.seller_side_kind === 'percent' ? t('transactions.commission_rate_hint') : undefined)}
                    />
                </Stack>
            </FormSection>

            <FormSection title={t('transactions.staff_commission')} hint={t('transactions.staff_commission_hint')}>
                <Autocomplete
                    sx={{ gridColumn: { md: '1 / -1' } }}
                    options={agentOptions}
                    value={staffAgent}
                    onChange={(_, value) => {
                        setStaffAgent(value);
                        if (!value) clearFieldError('staff_amount');
                    }}
                    getOptionLabel={(option) => option.username || option.display_name || option.full_name || String(option.id || '')}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} label={t('transactions.staff_agent')} />}
                />
                {staffAgent ? (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ gridColumn: { md: '1 / -1' } }}>
                        <TextField select label={t('transactions.commission_kind')} value={form.staff_kind} onChange={setField('staff_kind')} sx={{ minWidth: 140 }}>
                            <MenuItem value="flat">{t('transactions.commission_flat')}</MenuItem>
                            <MenuItem value="percent">{t('transactions.commission_percent')}</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            label={form.staff_kind === 'percent' ? t('transactions.commission_rate') : t('transactions.commission')}
                            value={form.staff_amount}
                            onChange={setField('staff_amount')}
                            error={Boolean(fieldErrors.staff_amount)}
                            helperText={fieldErrors.staff_amount || t('transactions.staff_commission_hint')}
                        />
                    </Stack>
                ) : null}
            </FormSection>

            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pb: 1 }}>
                <Button onClick={onCancel}>{t('common.cancel')}</Button>
                <Button type="submit" variant="contained" disabled={saving}>{t('transactions.save')}</Button>
            </Stack>
        </Stack>
    );
}
