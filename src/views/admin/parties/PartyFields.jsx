import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { currencyLabel } from '@/utils/money.js';
import { PARTY_ROLES, PIPELINE_STAGES } from './partyForm.js';

export function PartyFields({ form, onChange, onToggleRole, branches = [], cities = [], fieldErrors = {} }) {
    const { t } = useTranslation();
    const setField = (key) => (event) => onChange(key, event.target.value);
    const setBranch = (event) => {
        const branchId = event.target.value;
        const next = branches.find((item) => String(item.id) === String(branchId));
        const previous = branches.find((item) => String(item.id) === String(form.branch_id));
        const followsOffice = !form.city_id || (previous?.city_id && String(form.city_id) === String(previous.city_id));
        const nextCity = next?.city_id && cities.some((city) => String(city.id) === String(next.city_id))
            ? String(next.city_id)
            : '';
        onChange('branch_id', branchId);
        if (followsOffice)
            onChange('city_id', nextCity);
    };

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
                label={t('parties.name')}
                value={form.display_name}
                onChange={setField('display_name')}
                required
                autoFocus
                error={Boolean(fieldErrors.display_name)}
                helperText={fieldErrors.display_name}
                slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField select label={t('parties.kind')} value={form.party_kind} onChange={setField('party_kind')}>
                <MenuItem value="person">{t('parties.person')}</MenuItem>
                <MenuItem value="organization">{t('parties.organization')}</MenuItem>
            </TextField>
            <TextField
                select
                label={t('parties.pipeline_stage', { defaultValue: 'Pipeline Stage' })}
                value={form.pipeline_stage || 'lead'}
                onChange={setField('pipeline_stage')}
            >
                {PIPELINE_STAGES.map((stage) => (
                    <MenuItem key={stage} value={stage}>
                        {t(`parties.pipeline_stages.${stage}`, t(`reports_suite.${stage}`, stage))}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                select
                label={t('parties.branch')}
                value={form.branch_id || ''}
                onChange={setBranch}
                required={branches.length > 0}
                error={Boolean(fieldErrors.branch_id)}
                helperText={fieldErrors.branch_id || t('parties.branch_hint')}
            >
                {branches.length === 0 && <MenuItem value="">{t('parties.none')}</MenuItem>}
                {branches.map((office) => <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>)}
                {form.branch_id && !branches.some((office) => String(office.id) === String(form.branch_id)) && (
                    <MenuItem value={String(form.branch_id)}>{form.branch_name || form.branch_id}</MenuItem>
                )}
            </TextField>
            <TextField select label={t('parties.city')} value={form.city_id || ''} onChange={setField('city_id')} helperText={cities.length === 0 ? t('parties.no_cities') : undefined}>
                <MenuItem value="">{t('parties.none')}</MenuItem>
                {cities.map((city) => <MenuItem key={city.id} value={String(city.id)}>{city.name}</MenuItem>)}
                {form.city_id && !cities.some((city) => String(city.id) === String(form.city_id)) && (
                    <MenuItem value={String(form.city_id)}>{form.city_name || form.city_id}</MenuItem>
                )}
            </TextField>
            <TextField label={t('parties.phone')} value={form.phone} onChange={setField('phone')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 32 } }} />
            <TextField label={t('parties.email')} value={form.email} onChange={setField('email')} slotProps={{ htmlInput: { dir: 'ltr', maxLength: 255, type: 'email' } }} />
            <TextField label={t('parties.address')} value={form.address} onChange={setField('address')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 2000 } }} sx={{ gridColumn: { md: '1 / -1' } }} />
            <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Typography variant="caption" color="text.secondary">{t('parties.roles_label')}</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {PARTY_ROLES.map((name) => (
                        <Button key={name} type="button" size="small" variant={form.roles.includes(name) ? 'contained' : 'outlined'} onClick={() => onToggleRole(name)}>
                            {t(`parties.roles.${name}`)}
                        </Button>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}

export function PreferenceFields({ form, onChange, types, purposes, catalog = [], currencies = [] }) {
    const { t } = useTranslation();
    const setField = (key) => (event) => onChange(key, event.target.value);
    const city = catalog.find((item) => item.name === form.city);
    const neighborhoods = city?.neighborhoods || [];
    const setCity = (event) => {
        onChange('city', event.target.value);
        onChange('district', '');
    };

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField select label={t('parties.purpose')} value={form.purpose} onChange={setField('purpose')}>
                <MenuItem value="">{t('parties.none')}</MenuItem>
                {purposes.map((purpose) => <MenuItem key={purpose} value={purpose}>{t(`properties.purposes.${purpose}`)}</MenuItem>)}
            </TextField>
            <TextField select label={t('parties.type')} value={form.property_type} onChange={setField('property_type')}>
                <MenuItem value="">{t('parties.none')}</MenuItem>
                {types.map((type) => <MenuItem key={type} value={type}>{t(`properties.types.${type}`)}</MenuItem>)}
            </TextField>
            <TextField label={t('parties.min_price')} value={form.min_price} onChange={setField('min_price')} slotProps={{ htmlInput: { dir: 'ltr', inputMode: 'decimal' } }} />
            <TextField label={t('parties.max_price')} value={form.max_price} onChange={setField('max_price')} slotProps={{ htmlInput: { dir: 'ltr', inputMode: 'decimal' } }} />
            <TextField select label={t('parties.currency')} value={form.currency_id || ''} onChange={setField('currency_id')}>
                <MenuItem value="">{t('parties.none')}</MenuItem>
                {currencies.map((currency) => (
                    <MenuItem key={currency.id} value={String(currency.id)}>
                        {currencyLabel(currency.symbol || currency.code)}
                    </MenuItem>
                ))}
                {form.currency_id && !currencies.some((currency) => String(currency.id) === String(form.currency_id)) && (
                    <MenuItem value={String(form.currency_id)}>{currencyLabel(form.currency_code) || form.currency_id}</MenuItem>
                )}
            </TextField>
            {catalog.length > 0 ? (
                <TextField select label={t('parties.preferred_city')} value={form.city} onChange={setCity}>
                    <MenuItem value="">{t('parties.none')}</MenuItem>
                    {catalog.map((item) => <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>)}
                    {form.city && !catalog.some((item) => item.name === form.city) && (
                        <MenuItem value={form.city}>{form.city}</MenuItem>
                    )}
                </TextField>
            ) : (
                <TextField label={t('parties.preferred_city')} value={form.city} onChange={setField('city')} slotProps={{ htmlInput: { maxLength: 120 } }} />
            )}
            {catalog.length > 0 ? (
                <TextField select label={t('parties.district')} value={form.district} onChange={setField('district')} disabled={!form.city}>
                    <MenuItem value="">{t('parties.none')}</MenuItem>
                    {neighborhoods.map((item) => <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>)}
                    {form.district && !neighborhoods.some((item) => item.name === form.district) && (
                        <MenuItem value={form.district}>{form.district}</MenuItem>
                    )}
                </TextField>
            ) : (
                <TextField label={t('parties.district')} value={form.district} onChange={setField('district')} slotProps={{ htmlInput: { maxLength: 120 } }} />
            )}
            <TextField label={t('parties.min_area')} value={form.min_area} onChange={setField('min_area')} slotProps={{ htmlInput: { dir: 'ltr', inputMode: 'decimal' } }} />
            <TextField label={t('parties.max_area')} value={form.max_area} onChange={setField('max_area')} slotProps={{ htmlInput: { dir: 'ltr', inputMode: 'decimal' } }} />
            <TextField label={t('parties.rooms')} value={form.rooms} onChange={setField('rooms')} slotProps={{ htmlInput: { dir: 'ltr', inputMode: 'numeric' } }} />
            <TextField label={t('parties.bathrooms')} value={form.bathrooms} onChange={setField('bathrooms')} slotProps={{ htmlInput: { dir: 'ltr', inputMode: 'numeric' } }} />
            <TextField label={t('parties.requirements')} value={form.requirements} onChange={setField('requirements')} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 5000 } }} sx={{ gridColumn: { md: '1 / -1' } }} />
        </Box>
    );
}
