import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { userError, userFieldErrors } from './userForm.js';

const emptyForm = {
    username: '',
    email: '',
    password: '',
    phone_number: '',
    address: '',
    role_id: '',
    branch_id: '',
};

export default function UserCreate() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [roles, setRoles] = useState([]);
    const [offices, setOffices] = useState([]);
    const [ready, setReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('admin/roles/all'),
            fetch.get('branches/options'),
        ]).then(([rolesRes, officeRes]) => {
            if (!active) return;
            setRoles(rolesRes.data?.data || []);
            setOffices(officeRes.data?.data?.branches || []);
            setReady(true);
        }).catch((err) => {
            if (active) setError(userError(err, t));
        });
        return () => { active = false; };
    }, [t]);

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
        const email = String(form.email || '').trim();
        const phone = String(form.phone_number || '').trim();
        if (!String(form.username || '').trim()) next.username = t('common.required');
        if (!String(form.password || '').trim()) next.password = t('common.required');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('user.email_invalid');
        if (!email && !phone) next.phone_number = t('user.email_or_phone_required');
        if (!form.role_id) next.role_id = t('common.required');
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
            await fetch.post('admin/users', {
                username: form.username.trim(),
                email: form.email.trim() || null,
                password: form.password,
                phone_number: form.phone_number.trim() || null,
                address: form.address.trim() || null,
                role_id: form.role_id,
                branch_id: form.branch_id || null,
            });
            navigate('/admin/users/index');
        } catch (err) {
            const fields = userFieldErrors(err);
            if (fields) setFieldErrors(fields);
            else setError(userError(err, t, 'user.create_error'));
        } finally {
            setSaving(false);
        }
    };

    if (!ready && !error) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('user.create_title')}
                description={t('user.create_hint')}
                action={(
                    <Button onClick={() => navigate('/admin/users/index')}>{t('user.back')}</Button>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack component="form" spacing={2} onSubmit={save} noValidate>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            label={t('user.username')}
                            value={form.username}
                            onChange={setField('username')}
                            required
                            error={Boolean(fieldErrors.username)}
                            helperText={fieldErrors.username}
                            disabled={saving}
                        />
                        <TextField
                            label={t('user.password')}
                            type="password"
                            value={form.password}
                            onChange={setField('password')}
                            required
                            error={Boolean(fieldErrors.password)}
                            helperText={fieldErrors.password || t('user.password_placeholder')}
                            disabled={saving}
                        />
                        <TextField
                            label={t('user.email')}
                            type="email"
                            value={form.email}
                            onChange={setField('email')}
                            error={Boolean(fieldErrors.email)}
                            helperText={fieldErrors.email}
                            disabled={saving}
                            slotProps={{ htmlInput: { dir: 'ltr', autoComplete: 'email' } }}
                        />
                        <TextField
                            label={t('user.phone_number')}
                            value={form.phone_number}
                            onChange={setField('phone_number')}
                            error={Boolean(fieldErrors.phone_number)}
                            helperText={fieldErrors.phone_number || t('user.email_or_phone_required')}
                            disabled={saving}
                            slotProps={{ htmlInput: { dir: 'ltr' } }}
                        />
                        <TextField
                            select
                            label={t('user.role')}
                            value={form.role_id}
                            onChange={setField('role_id')}
                            required
                            error={Boolean(fieldErrors.role_id)}
                            helperText={fieldErrors.role_id}
                            disabled={saving}
                        >
                            <MenuItem value="">{t('user.select_role')}</MenuItem>
                            {roles.map((role) => (
                                <MenuItem key={role.id} value={String(role.id)}>{role.name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label={t('user.office')}
                            value={form.branch_id}
                            onChange={setField('branch_id')}
                            error={Boolean(fieldErrors.branch_id)}
                            helperText={fieldErrors.branch_id || t('user.office_hint')}
                            disabled={saving}
                        >
                            <MenuItem value="">{t('user.all_offices')}</MenuItem>
                            {offices.map((office) => (
                                <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label={t('user.address')}
                            value={form.address}
                            onChange={setField('address')}
                            disabled={saving}
                            sx={{ gridColumn: { md: '1 / -1' } }}
                        />
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained" disabled={saving}>
                            {saving ? t('common.processing') : t('user.save')}
                        </Button>
                        <Button disabled={saving} onClick={() => navigate('/admin/users/index')}>
                            {t('common.cancel')}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
