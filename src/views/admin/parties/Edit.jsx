import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { PartyFields, PreferenceFields } from './PartyFields.jsx';
import {
    PROPERTY_TYPES,
    PURPOSES,
    emptyParty,
    emptyPreference,
    partyError,
    partyPayload,
    preferenceFromParty,
    preferencePayload,
    validateParty,
} from './partyForm.js';

export default function Edit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [loadedId, setLoadedId] = useState(null);
    const [preference, setPreference] = useState(emptyPreference);
    const [hadPreference, setHadPreference] = useState(false);
    const [catalog, setCatalog] = useState([]);
    const [branches, setBranches] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        fetch.get('locations/catalog')
            .then((res) => {
                if (active) setCatalog(res.data?.data?.cities || []);
            })
            .catch(() => {});
        fetch.get('branches/options')
            .then((res) => {
                if (active) setBranches(res.data?.data?.branches || []);
            })
            .catch(() => {});
        fetch.get('agency')
            .then((res) => {
                if (active) setCurrencies(res.data?.data?.currencies || []);
            })
            .catch(() => {});
        fetch.get(`parties/${id}`)
            .then((res) => {
                if (!active) return;
                const party = res.data.data;
                setForm({
                    ...emptyParty,
                    display_name: party.display_name || '',
                    email: party.email || '',
                    phone: party.phone || '',
                    address: party.address || '',
                    party_kind: party.party_kind || 'person',
                    roles: party.roles?.length ? party.roles : ['lead'],
                    pipeline_stage: party.pipeline_stage || 'lead',
                    branch_id: party.branch_id ? String(party.branch_id) : '',
                    city_id: party.city_id ? String(party.city_id) : '',
                    branch_name: party.branch_name || '',
                    city_name: party.city_name || '',
                });
                setHadPreference(Boolean(party.preference));
                setPreference(preferenceFromParty(party.preference));
                setLoadedId(id);
                setError('');
            })
            .catch((err) => {
                if (!active) return;
                setForm(null);
                setLoadedId(id);
                setError(partyError(err, t));
            });
        return () => { active = false; };
    }, [id, t]);

    const onChange = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };
    const onPreference = (key, value) => setPreference((current) => ({ ...current, [key]: value }));
    const onToggleRole = (name) => {
        setForm((current) => {
            const roles = current.roles.includes(name)
                ? current.roles.filter((item) => item !== name)
                : [...current.roles, name];
            return { ...current, roles: roles.length ? roles : current.roles };
        });
    };

    const save = async (event) => {
        event.preventDefault();
        const errors = validateParty(form, { branches, t });
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            setError('');
            return;
        }
        setSaving(true);
        setError('');
        setFieldErrors({});
        try {
            await fetch.patch(`parties/${id}`, partyPayload(form));
            const filled = Object.values(preference).some((value) => value !== '' && value != null);
            if (hadPreference || filled) {
                await fetch.put(`parties/${id}/preferences`, preferencePayload(preference));
            }
            navigate(`/admin/parties/${id}/show`);
        } catch (err) {
            setError(partyError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const current = String(loadedId) === String(id);
    if (!current || (!form && !error)) {
        return <Typography sx={{ p: 3 }}>{t('login.loading')}</Typography>;
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
            <PageHeader
                title={form?.display_name || t('parties.edit_title')}
                action={<Button onClick={() => navigate(`/admin/parties/${id}/show`)} disabled={saving}>{t('common.cancel')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {form && (
                <Box component="form" onSubmit={save} noValidate>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} sx={{ mb: 2 }}>{t('parties.details')}</Typography>
                        <PartyFields
                            form={form}
                            onChange={onChange}
                            onToggleRole={onToggleRole}
                            branches={branches}
                            cities={catalog}
                            fieldErrors={fieldErrors}
                        />
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
                        <Typography fontWeight={700}>{t('parties.preferences')}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('parties.preferences_hint')}</Typography>
                        <PreferenceFields form={preference} onChange={onPreference} types={PROPERTY_TYPES} purposes={PURPOSES} catalog={catalog} currencies={currencies} />
                    </Paper>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2 }}>
                        <Button type="submit" variant="contained" disabled={saving}>{t('parties.save')}</Button>
                    </Stack>
                </Box>
            )}
        </Box>
    );
}
