import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import Can from '@/components/auth/Can.jsx';
import { groupPriceInput, plainPrice } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { PropertyMapPicker } from '@/components/maps';
import { propertyError } from './propertyError.js';

const TYPES = ['apartment', 'house', 'villa', 'land', 'commercial', 'office', 'warehouse', 'building'];
const PURPOSES = ['sale', 'rent', 'sale_or_rent'];
const FEATURES = ['parking', 'furnished', 'elevator', 'balcony', 'garden', 'pool', 'security', 'generator', 'air_conditioning', 'storage'];

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });

const emptyOwner = {
    display_name: '',
    share_percent: '100',
    effective_from: today(),
};

const emptyForm = {
    reference_number: '',
    title: '',
    description: '',
    property_type: 'apartment',
    purpose: 'sale',
    price: '',
    currency_id: '',
    area: '',
    rooms: '',
    bathrooms: '',
    floors: '',
    year_built: '',
    address: '',
    city: '',
    city_id: '',
    district: '',
    neighborhood: '',
    neighborhood_id: '',
    assigned_user_id: '',
    branch_id: '',
    key_branch_id: '',
    parent_property_id: '',
    deed_number: '',
    available_from: '',
    available_to: '',
    features: [],
    latitude: '',
    longitude: '',
    attributes: null,
};

function toForm(property) {
    return {
        reference_number: property.reference_number || '',
        title: property.title || '',
        description: property.description || '',
        property_type: property.property_type || 'apartment',
        purpose: property.purpose || 'sale',
        price: property.price == null || property.price === '' ? '' : groupPriceInput(property.price),
        currency_id: property.currency_id ? String(property.currency_id) : '',
        area: property.area ?? '',
        rooms: property.rooms ?? '',
        bathrooms: property.bathrooms ?? '',
        floors: property.floors ?? '',
        year_built: property.year_built ?? '',
        address: property.address || '',
        city: property.city || '',
        city_id: property.city_id ? String(property.city_id) : '',
        district: property.district || '',
        neighborhood: property.neighborhood || '',
        neighborhood_id: property.neighborhood_id ? String(property.neighborhood_id) : '',
        assigned_user_id: property.assigned_user_id ? String(property.assigned_user_id) : '',
        branch_id: property.branch_id ? String(property.branch_id) : '',
        branch_name: property.branch_name || '',
        key_branch_id: property.key_branch_id ? String(property.key_branch_id) : '',
        parent_property_id: property.parent_property_id ? String(property.parent_property_id) : '',
        deed_number: property.deed_number || '',
        available_from: property.available_from || '',
        available_to: property.available_to || '',
        features: property.features || [],
        latitude: property.latitude ?? '',
        longitude: property.longitude ?? '',
        attributes: property.attributes || null,
    };
}

function optionalNumber(value) {
    return value === '' || value == null ? null : Number(value);
}

export default function Create() {
    const { id } = useParams();
    const editing = Boolean(id);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [owner, setOwner] = useState(emptyOwner);
    const [currencies, setCurrencies] = useState([]);
    const [agents, setAgents] = useState([]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [catalog, setCatalog] = useState([]);
    const [branches, setBranches] = useState([]);
    const [buildings, setBuildings] = useState([]);

    useEffect(() => {
        let active = true;
        const requests = [fetch.get('agency'), fetch.get('properties/agents'), fetch.get('locations/catalog'), fetch.get('branches/options'), fetch.get('properties/buildings')];
        if (editing) requests.push(fetch.get(`properties/${id}`));
        Promise.all(requests)
            .then(([agency, staff, places, offices, structures, property]) => {
                if (!active) return;
                const branchList = offices.data?.data?.branches || [];
                setCurrencies(agency.data?.data?.currencies || []);
                setAgents(staff.data?.data?.items || []);
                setCatalog(places.data?.data?.cities || []);
                setBranches(branchList);
                setBuildings(structures.data?.data?.items || []);
                if (property) {
                    setForm(toForm(property.data.data));
                    return;
                }
                const main = branchList.find((office) => office.is_main) || branchList[0];
                if (!main) return;
                setForm((current) => (current.branch_id ? current : { ...current, branch_id: String(main.id) }));
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.error?.message || t('login.error'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [editing, id, t]);

    const clearFieldError = (key) => {
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const priceRef = useRef(null);
    const setField = (key) => (event) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
        clearFieldError(key);
    };
    const setPrice = (event) => {
        const caretDigits = event.target.value.slice(0, event.target.selectionStart ?? 0).replace(/[^\d.]/g, '').length;
        const next = groupPriceInput(event.target.value);
        setForm((current) => ({ ...current, price: next }));
        clearFieldError('price');
        requestAnimationFrame(() => {
            const input = priceRef.current;
            if (!input) return;
            let seen = 0;
            let pos = next.length;
            if (caretDigits <= 0) pos = 0;
            else {
                for (let index = 0; index < next.length; index += 1) {
                    if (/[\d.]/.test(next[index])) seen += 1;
                    if (seen === caretDigits) {
                        pos = index + 1;
                        break;
                    }
                }
            }
            input.setSelectionRange(pos, pos);
        });
    };
    const setCity = (event) => {
        const cityId = event.target.value;
        const city = catalog.find((item) => String(item.id) === String(cityId));
        setForm((current) => ({
            ...current,
            city_id: cityId,
            neighborhood_id: '',
            city: cityId ? (city?.name || '') : (current.city_id ? '' : current.city),
            neighborhood: cityId || current.city_id ? '' : current.neighborhood,
        }));
        clearFieldError('city_id');
    };
    const setOwnerField = (key) => (event) => {
        setOwner((current) => ({ ...current, [key]: event.target.value }));
        clearFieldError(key);
    };
    const cityChoices = !form.city_id || catalog.some((item) => String(item.id) === String(form.city_id))
        ? catalog
        : [{ id: form.city_id, name: form.city, neighborhoods: [] }, ...catalog];
    const matchedNeighborhoods = cityChoices.find((item) => String(item.id) === String(form.city_id))?.neighborhoods || [];
    const neighborhoods = !form.neighborhood_id || matchedNeighborhoods.some((item) => String(item.id) === String(form.neighborhood_id))
        ? matchedNeighborhoods
        : [{ id: form.neighborhood_id, name: form.neighborhood }, ...matchedNeighborhoods];
    const toggleFeature = (name) => setForm((current) => ({
        ...current,
        features: current.features.includes(name)
            ? current.features.filter((item) => item !== name)
            : [...current.features, name],
    }));

    const validate = () => {
        const errors = {};
        const required = t('common.required');
        if (!String(form.reference_number || '').trim()) errors.reference_number = required;
        if (!String(form.title || '').trim()) errors.title = required;
        if (!String(plainPrice(form.price) || '').trim()) errors.price = required;
        if (!form.currency_id) errors.currency_id = required;
        if (branches.length > 0 && !form.branch_id) errors.branch_id = required;
        if (!String(form.address || '').trim()) errors.address = required;
        if (!editing && catalog.length > 0 && !form.city_id) errors.city_id = required;
        if (!editing) {
            if (!String(owner.display_name || '').trim()) errors.display_name = required;
            if (!String(owner.share_percent || '').trim()) errors.share_percent = required;
            if (!String(owner.effective_from || '').trim()) errors.effective_from = required;
        }
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
        const payload = {
            reference_number: form.reference_number.trim(),
            title: form.title.trim(),
            description: form.description || null,
            property_type: form.property_type,
            purpose: form.purpose,
            price: plainPrice(form.price),
            currency_id: form.currency_id ? Number(form.currency_id) : null,
            area: form.area || null,
            rooms: optionalNumber(form.rooms),
            bathrooms: optionalNumber(form.bathrooms),
            floors: optionalNumber(form.floors),
            year_built: optionalNumber(form.year_built),
            address: form.address.trim() || null,
            city_id: form.city_id ? Number(form.city_id) : null,
            neighborhood_id: form.neighborhood_id ? Number(form.neighborhood_id) : null,
            city: form.city_id ? null : (form.city || null),
            district: form.district || null,
            neighborhood: form.neighborhood_id ? null : (form.city_id ? null : (form.neighborhood || null)),
            assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
            branch_id: form.branch_id ? Number(form.branch_id) : null,
            key_branch_id: form.key_branch_id ? Number(form.key_branch_id) : null,
            available_to: form.available_to || null,
            parent_property_id: form.property_type === 'building' || !form.parent_property_id ? null : Number(form.parent_property_id),
            deed_number: form.deed_number || null,
            available_from: form.available_from || null,
            features: form.features,
            latitude: form.latitude || null,
            longitude: form.longitude || null,
            attributes: form.attributes,
        };
        try {
            const res = editing
                ? await fetch.patch(`properties/${id}`, payload)
                : await fetch.post('properties', payload);
            const propertyId = res.data.data.id;
            if (!editing) {
                await fetch.put(`properties/${propertyId}/ownerships`, {
                    display_name: owner.display_name.trim(),
                    share_percent: owner.share_percent,
                    effective_from: owner.effective_from,
                });
            }
            navigate(`/admin/properties/${propertyId}/show`);
        } catch (err) {
            setError(propertyError(err, t));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <PageHeader
                title={editing ? t('properties.edit_title') : t('properties.create')}
                action={(
                    <Button onClick={() => navigate(editing ? `/admin/properties/${id}/show` : '/admin/properties/index')}>
                        {t('common.cancel')}
                    </Button>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {!loading && (
                <Stack component="form" spacing={2} onSubmit={save} noValidate sx={{ width: '100%' }}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} sx={{ mb: 2 }}>{t('properties.details')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <TextField
                                label={t('properties.reference')}
                                value={form.reference_number}
                                onChange={setField('reference_number')}
                                required
                                error={Boolean(fieldErrors.reference_number)}
                                helperText={fieldErrors.reference_number}
                            />
                            <TextField
                                label={t('properties.name')}
                                value={form.title}
                                onChange={setField('title')}
                                required
                                error={Boolean(fieldErrors.title)}
                                helperText={fieldErrors.title}
                            />
                            <TextField select label={t('properties.type')} value={form.property_type} onChange={setField('property_type')}>
                                {TYPES.map((type) => <MenuItem key={type} value={type}>{t(`properties.types.${type}`)}</MenuItem>)}
                            </TextField>
                            <TextField select label={t('properties.purpose')} value={form.purpose} onChange={setField('purpose')}>
                                {PURPOSES.map((purpose) => <MenuItem key={purpose} value={purpose}>{t(`properties.purposes.${purpose}`)}</MenuItem>)}
                            </TextField>
                            <TextField
                                label={t('properties.price')}
                                value={form.price}
                                onChange={setPrice}
                                required
                                error={Boolean(fieldErrors.price)}
                                helperText={fieldErrors.price}
                                inputRef={priceRef}
                                slotProps={{ htmlInput: { inputMode: 'decimal', dir: 'ltr' } }}
                            />
                            <TextField
                                select
                                label={t('properties.currency')}
                                value={form.currency_id}
                                onChange={setField('currency_id')}
                                required
                                error={Boolean(fieldErrors.currency_id)}
                                helperText={fieldErrors.currency_id}
                            >
                                <MenuItem value="">{t('properties.no_price')}</MenuItem>
                                {currencies.map((currency) => <MenuItem key={currency.id} value={String(currency.id)}>{currency.code}</MenuItem>)}
                            </TextField>
                            <TextField label={t('properties.area')} value={form.area} onChange={setField('area')} />
                            <TextField label={t('properties.rooms')} value={form.rooms} onChange={setField('rooms')} />
                            <TextField label={t('properties.bathrooms')} value={form.bathrooms} onChange={setField('bathrooms')} />
                            <TextField label={t('properties.floors')} value={form.floors} onChange={setField('floors')} />
                            <TextField label={t('properties.year_built')} value={form.year_built} onChange={setField('year_built')} />
                            <TextField label={t('properties.deed_number')} value={form.deed_number} onChange={setField('deed_number')} />
                            <TextField label={t('properties.available_from')} type="date" value={form.available_from} onChange={setField('available_from')} slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField label={t('properties.available_to')} type="date" value={form.available_to} onChange={setField('available_to')} slotProps={{ inputLabel: { shrink: true } }} helperText={t('properties.availability_hint')} />
                            {form.property_type !== 'building' && (
                                <TextField select label={t('properties.part_of_building')} value={form.parent_property_id || ''} onChange={setField('parent_property_id')}>
                                    <MenuItem value="">—</MenuItem>
                                    {buildings.filter((building) => String(building.id) !== String(id || '')).map((building) => (
                                        <MenuItem key={building.id} value={String(building.id)}>{building.title}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                            <TextField
                                select
                                label={t('properties.branch')}
                                value={form.branch_id || ''}
                                onChange={setField('branch_id')}
                                required={branches.length > 0}
                                error={Boolean(fieldErrors.branch_id)}
                                helperText={fieldErrors.branch_id || t('properties.branch_hint')}
                            >
                                {branches.length === 0 && <MenuItem value="">—</MenuItem>}
                                {branches.map((office) => <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>)}
                                {form.branch_id && !branches.some((office) => String(office.id) === String(form.branch_id)) && (
                                    <MenuItem value={String(form.branch_id)}>{form.branch_name || form.branch_id}</MenuItem>
                                )}
                            </TextField>
                            <TextField select label={t('properties.keys')} value={form.key_branch_id || ''} onChange={setField('key_branch_id')} helperText={t('properties.keys_hint')}>
                                <MenuItem value="">{t('properties.no_keys')}</MenuItem>
                                {branches.map((office) => <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>)}
                            </TextField>
                            <TextField select label={t('properties.agent')} value={form.assigned_user_id} onChange={setField('assigned_user_id')}>
                                <MenuItem value="">{t('properties.no_agent')}</MenuItem>
                                {agents.map((agent) => <MenuItem key={agent.id} value={String(agent.id)}>{agent.username}</MenuItem>)}
                            </TextField>
                            <TextField label={t('properties.description')} value={form.description} onChange={setField('description')} multiline minRows={3} sx={{ gridColumn: { md: '1 / -1' } }} />
                            <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('properties.features')}</Typography>
                                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                    {FEATURES.map((feature) => (
                                        <Chip
                                            key={feature}
                                            label={t(`properties.feature_names.${feature}`)}
                                            color={form.features.includes(feature) ? 'primary' : 'default'}
                                            variant={form.features.includes(feature) ? 'filled' : 'outlined'}
                                            onClick={() => toggleFeature(feature)}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} sx={{ mb: 2 }}>{t('properties.location')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <TextField
                                label={t('properties.address')}
                                value={form.address}
                                onChange={setField('address')}
                                required
                                error={Boolean(fieldErrors.address)}
                                helperText={fieldErrors.address}
                                sx={{ gridColumn: { md: '1 / -1' } }}
                            />
                            {catalog.length === 0 && (
                                <Alert severity="info" sx={{ gridColumn: { md: '1 / -1' } }}>
                                    {t('locations.catalog_empty')}
                                    <Can permission="location:create">
                                        <Button component={Link} to="/admin/locations/index" size="small" sx={{ marginInlineStart: 1 }}>{t('locations.open_locations')}</Button>
                                    </Can>
                                </Alert>
                            )}
                            <TextField
                                select
                                label={t('properties.city')}
                                value={form.city_id}
                                onChange={setCity}
                                required={!editing && catalog.length > 0}
                                error={Boolean(fieldErrors.city_id)}
                                helperText={fieldErrors.city_id}
                            >
                                <MenuItem value="">{!form.city_id && form.city ? form.city : t('locations.pick_city')}</MenuItem>
                                {cityChoices.map((city) => <MenuItem key={city.id} value={String(city.id)}>{city.name}</MenuItem>)}
                            </TextField>
                            <TextField select label={t('properties.neighborhood')} value={form.neighborhood_id} onChange={setField('neighborhood_id')} disabled={!form.city_id}>
                                <MenuItem value="">{!form.neighborhood_id && form.neighborhood && !form.city_id ? form.neighborhood : t('locations.no_neighborhood')}</MenuItem>
                                {neighborhoods.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
                            </TextField>
                            <TextField label={t('properties.district')} value={form.district} onChange={setField('district')} />
                            <PropertyMapPicker
                                latitude={form.latitude}
                                longitude={form.longitude}
                                onChange={({ latitude, longitude }) => setForm((current) => ({
                                    ...current,
                                    latitude,
                                    longitude,
                                }))}
                            />
                        </Box>
                    </Paper>
                    {!editing && (
                        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                            <Typography fontWeight={700} sx={{ mb: 2 }}>{t('properties.owners')}</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                <TextField
                                    label={t('properties.owner_name')}
                                    value={owner.display_name}
                                    onChange={setOwnerField('display_name')}
                                    required
                                    error={Boolean(fieldErrors.display_name)}
                                    helperText={fieldErrors.display_name}
                                />
                                <TextField
                                    label={t('properties.share')}
                                    value={owner.share_percent}
                                    onChange={setOwnerField('share_percent')}
                                    required
                                    error={Boolean(fieldErrors.share_percent)}
                                    helperText={fieldErrors.share_percent}
                                />
                                <TextField
                                    label={t('properties.effective_from')}
                                    type="date"
                                    value={owner.effective_from}
                                    onChange={setOwnerField('effective_from')}
                                    required
                                    error={Boolean(fieldErrors.effective_from)}
                                    helperText={fieldErrors.effective_from}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Box>
                        </Paper>
                    )}
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" disabled={saving}>{t('properties.save')}</Button>
                    </Stack>
                </Stack>
            )}
        </Box>
    );
}
