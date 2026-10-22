import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { PartyFields } from './PartyFields.jsx';
import { emptyParty, partyError, partyPayload, validateParty } from './partyForm.js';

export default function Create() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyParty);
    const [branches, setBranches] = useState([]);
    const [cities, setCities] = useState([]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('branches/options'),
            fetch.get('locations/catalog'),
        ]).then(([branchRes, cityRes]) => {
            if (!active) return;
            const offices = branchRes.data?.data?.branches || [];
            const cityList = cityRes.data?.data?.cities || [];
            setBranches(offices);
            setCities(cityList);
            const main = offices.find((office) => office.is_main) || offices[0];
            if (!main) return;
            const officeCity = main.city_id && cityList.some((city) => String(city.id) === String(main.city_id))
                ? String(main.city_id)
                : '';
            setForm((current) => (current.branch_id ? current : {
                ...current,
                branch_id: String(main.id),
                city_id: current.city_id || officeCity,
            }));
        }).catch(() => { });
        return () => { active = false; };
    }, []);

    const onChange = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };
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
            const res = await fetch.post('parties', partyPayload(form));
            navigate(`/admin/parties/${res.data.data.id}/show`);
        } catch (err) {
            setError(partyError(err, t));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
            <PageHeader
                title={t('parties.create')}
                action={<Button onClick={() => navigate('/admin/parties/index')}>{t('parties.back')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" component="form" onSubmit={save} noValidate sx={{ p: { xs: 2, md: 3 } }}>
                <Typography fontWeight={700} sx={{ mb: 2 }}>{t('parties.details')}</Typography>
                <PartyFields
                    form={form}
                    onChange={onChange}
                    onToggleRole={onToggleRole}
                    branches={branches}
                    cities={cities}
                    fieldErrors={fieldErrors}
                />
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2 }}>
                    <Button type="submit" variant="contained" disabled={saving}>{t('parties.save')}</Button>
                </Stack>
            </Paper>
        </Box>
    );
}
