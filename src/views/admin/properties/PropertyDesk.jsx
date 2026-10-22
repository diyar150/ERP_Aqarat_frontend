import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel, moneyLabel } from '@/utils/money.js';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';

const ACTIVITY_TYPES = ['note', 'call', 'viewing'];
const COST_KINDS = ['expense', 'commission'];
const today = () => new Date().toISOString().slice(0, 10);

function when(value) {
    if (!value) return '';
    return String(value).replace('T', ' ').slice(0, 16);
}

export default function PropertyDesk({ property, onReload }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activityType, setActivityType] = useState('note');
    const [activityBody, setActivityBody] = useState('');
    const [currencies, setCurrencies] = useState([]);
    const [cost, setCost] = useState({ cost_kind: 'expense', description: '', amount: '', currency_id: '', occurred_on: today() });
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get('agency')
            .then((res) => {
                if (!active) return;
                const rows = res.data?.data?.currencies || [];
                setCurrencies(rows);
                setCost((current) => (current.currency_id || !rows[0] ? current : { ...current, currency_id: String(rows[0].id) }));
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const submit = async (path, body, reset) => {
        setError('');
        try {
            await fetch.post(`properties/${property.id}/${path}`, body);
            reset();
            await onReload();
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const removeCost = async (costId) => {
        setError('');
        try {
            await fetch.delete(`properties/${property.id}/costs/${costId}`);
            await onReload();
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const rent = property.purpose === 'rent' || property.purpose === 'sale_or_rent';

    return (
        <Stack spacing={2}>
            {error && <Typography color="error">{error}</Typography>}
            {property.parent_property_id && (
                <Paper sx={{ p: 3 }}>
                    <Typography fontWeight={700} mb={1}>{t('properties.building')}</Typography>
                    <Button onClick={() => navigate(`/admin/properties/${property.parent_property_id}/show`)}>
                        {t('properties.unit_of', { name: property.parent_title || property.parent_property_id })}
                    </Button>
                </Paper>
            )}
            {property.property_type === 'building' && (
                <Paper sx={{ p: 3 }}>
                    <Typography fontWeight={700} mb={1}>{t('properties.units')}</Typography>
                    {(property.units || []).length === 0 && <Typography color="text.secondary">{t('properties.units_empty')}</Typography>}
                    <Stack spacing={0.5}>
                        {(property.units || []).map((unit) => (
                            <Button key={unit.id} onClick={() => navigate(`/admin/properties/${unit.id}/show`)} sx={{ justifyContent: 'flex-start' }}>
                                {unit.title} · {unit.reference_number}
                            </Button>
                        ))}
                    </Stack>
                </Paper>
            )}
            {rent && (
                <Paper sx={{ p: 3 }}>
                    <Typography fontWeight={700} mb={0.5}>{t('properties.availability')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('properties.availability_hint')}</Typography>
                    <Typography>
                        {property.available_from || '—'}
                        {property.available_to ? ` – ${property.available_to}` : ''}
                    </Typography>
                    {(property.occupancy || []).map((row) => (
                        <Typography key={row.id} color="text.secondary">
                            {row.reference_number} · {t('properties.occupied', { start: row.period_start, end: row.period_end || '—' })}
                        </Typography>
                    ))}
                </Paper>
            )}
            <Paper sx={{ p: 3 }}>
                <Typography fontWeight={700} mb={0.5}>{t('properties.buyers')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('properties.buyers_hint')}</Typography>
                {(property.buyers || []).length === 0 && <Typography color="text.secondary">{t('properties.buyers_empty')}</Typography>}
                <Stack spacing={0.5}>
                    {(property.buyers || []).map((buyer) => (
                        <Button key={buyer.id} onClick={() => navigate(`/admin/parties/${buyer.id}/show`)} sx={{ justifyContent: 'flex-start' }}>
                            {buyer.display_name}
                            {buyer.phone ? ` · ${buyer.phone}` : ''}
                            {buyer.city ? ` · ${buyer.city}` : ''}
                        </Button>
                    ))}
                </Stack>
            </Paper>
            <Paper sx={{ p: 3 }}>
                <Typography fontWeight={700} mb={1}>{t('properties.price_history')}</Typography>
                {(property.price_history || []).length === 0 && <Typography color="text.secondary">{t('properties.price_history_empty')}</Typography>}
                {(property.price_history || []).map((row) => (
                    <Typography key={row.id}>
                        {row.price == null ? t('properties.no_price') : moneyLabel(row.price, row.currency_code, '')}
                        {' · '}
                        {when(row.created_at)}
                    </Typography>
                ))}
            </Paper>
            <Paper sx={{ p: 3 }}>
                <Typography fontWeight={700} mb={0.5}>{t('properties.costs')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('properties.costs_hint')}</Typography>
                {(property.costs || []).length === 0 && <Typography color="text.secondary">{t('properties.costs_empty')}</Typography>}
                {(property.costs || []).map((row) => (
                    <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ flex: 1 }}>
                            {t(`properties.cost_kinds.${row.cost_kind}`)} · {row.description} · {moneyLabel(row.amount, row.currency_code, '')} · {row.occurred_on}
                        </Typography>
                        <Can permission="property:update">
                            <ActionIconButton action="delete" onClick={() => removeCost(row.id)} />
                        </Can>
                    </Stack>
                ))}
                <Can permission="property:update">
                    <Stack spacing={1} mt={2}>
                        <TextField select size="small" label={t('properties.costs')} value={cost.cost_kind} onChange={(event) => setCost({ ...cost, cost_kind: event.target.value })}>
                            {COST_KINDS.map((kind) => <MenuItem key={kind} value={kind}>{t(`properties.cost_kinds.${kind}`)}</MenuItem>)}
                        </TextField>
                        <TextField size="small" label={t('properties.cost_description')} value={cost.description} onChange={(event) => setCost({ ...cost, description: event.target.value })} />
                        <TextField size="small" label={t('properties.price')} value={cost.amount} onChange={(event) => setCost({ ...cost, amount: event.target.value })} />
                        <TextField select size="small" label={t('properties.currency')} value={cost.currency_id} onChange={(event) => setCost({ ...cost, currency_id: event.target.value })}>
                            {currencies.map((currency) => <MenuItem key={currency.id} value={String(currency.id)}>{currency.code}</MenuItem>)}
                        </TextField>
                        <TextField size="small" type="date" label={t('properties.cost_date')} value={cost.occurred_on} onChange={(event) => setCost({ ...cost, occurred_on: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                        <Button variant="contained" disabled={!cost.description.trim() || !cost.amount || !cost.currency_id} onClick={() => submit('costs', {
                            cost_kind: cost.cost_kind,
                            description: cost.description.trim(),
                            amount: cost.amount,
                            currency_id: Number(cost.currency_id),
                            occurred_on: cost.occurred_on,
                        }, () => setCost((current) => ({ ...current, description: '', amount: '' })))}>{t('properties.add_cost')}</Button>
                    </Stack>
                </Can>
            </Paper>
            <Paper sx={{ p: 3 }}>
                <Typography fontWeight={700} mb={1}>{t('properties.activity')}</Typography>
                {(property.activities || []).length === 0 && <Typography color="text.secondary">{t('properties.activity_empty')}</Typography>}
                <Stack spacing={1} mb={2}>
                    {(property.activities || []).map((row) => (
                        <Stack key={row.id}>
                            <Typography variant="caption" color="text.secondary">{t(`properties.activity_types.${row.activity_type}`)} · {when(row.occurred_at)}{row.created_by_name ? ` · ${row.created_by_name}` : ''}</Typography>
                            <Typography>{row.body}</Typography>
                        </Stack>
                    ))}
                </Stack>
                <Can permission="property:update">
                    <Stack spacing={1}>
                        <TextField select size="small" label={t('properties.activity')} value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                            {ACTIVITY_TYPES.map((type) => <MenuItem key={type} value={type}>{t(`properties.activity_types.${type}`)}</MenuItem>)}
                        </TextField>
                        <TextField multiline minRows={2} label={t('properties.activity_types.note')} value={activityBody} onChange={(event) => setActivityBody(event.target.value)} />
                        <Button variant="contained" disabled={!activityBody.trim()} onClick={() => submit('activities', { activity_type: activityType, body: activityBody.trim() }, () => setActivityBody(''))}>{t('properties.add_activity')}</Button>
                    </Stack>
                </Can>
            </Paper>
        </Stack>
    );
}
