import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Avatar, Box, Button, Paper, Stack, Typography } from '@mui/material';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import fetch from '@/utils/fetch';

const LOCALES = { ckb: 'کوردی', ar: 'العربية', en: 'English' };

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography>{value || '—'}</Typography>
        </Box>
    );
}

export default function Show() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [workspace, setWorkspace] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        fetch.get('agency')
            .then((res) => {
                if (active) setWorkspace(res.data?.data || null);
            })
            .catch(() => {
                if (active) setError(t('operations.load_error'));
            });
        return () => { active = false; };
    }, [t]);

    useEffect(() => {
        if (!workspace?.has_logo) return undefined;
        let active = true;
        let objectUrl = '';
        fetch.get('agency/logo', { responseType: 'blob' })
            .then((res) => {
                if (!active) return;
                objectUrl = URL.createObjectURL(res.data);
                setLogoUrl(objectUrl);
            })
            .catch(() => {
                if (active) setLogoUrl('');
            });
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [workspace?.has_logo, workspace?.updated_at]);

    const setStatus = async (status) => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch.patch('agency/status', { status });
            setWorkspace(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        } finally {
            setSaving(false);
        }
    };

    if (!workspace && !error) {
        return <Typography sx={{ p: 3 }}>{t('login.loading')}</Typography>;
    }

    const currency = (workspace?.currencies || []).find((item) => item.id === workspace?.base_currency_id);
    const currencyLabel = currency ? `${currency.code} — ${currency.name}` : '';

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={workspace?.name || t('workspace.title')}
                description={t('workspace.hint')}
                action={(
                    <Can permission="agency:update">
                        <Button variant="contained" onClick={() => navigate('/admin/agency/edit')}>
                            {t('common.edit')}
                        </Button>
                    </Can>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {workspace && (
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, mb: 2 }}>
                            <Avatar
                                src={workspace.has_logo ? (logoUrl || undefined) : undefined}
                                variant="rounded"
                                sx={{ width: 72, height: 72, bgcolor: 'action.hover', color: 'text.primary', fontWeight: 700 }}
                            >
                                {(workspace.name || 'A').slice(0, 1)}
                            </Avatar>
                            <Box>
                                <Typography fontWeight={700}>{t('workspace.identity')}</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <StatusChip status={workspace.status} label={t(`workspace.${workspace.status}`, workspace.status)} />
                                </Box>
                            </Box>
                        </Stack>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('workspace.name')} value={workspace.name} />
                            <Fact label={t('workspace.phone')} value={workspace.phone} />
                            <Fact label={t('workspace.email')} value={workspace.email} />
                            <Fact label={t('workspace.website')} value={workspace.website} />
                        </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} mb={2}>{t('workspace.legal')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('workspace.address')} value={workspace.address} />
                            <Fact label={t('workspace.city')} value={workspace.city} />
                            <Fact label={t('workspace.registration_number')} value={workspace.registration_number} />
                            <Fact label={t('workspace.tax_number')} value={workspace.tax_number} />
                            <Fact label={t('workspace.license_number')} value={workspace.license_number} />
                        </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} mb={2}>{t('workspace.regional')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('workspace.base_currency')} value={currencyLabel} />
                            <Fact label={t('workspace.timezone')} value={workspace.timezone} />
                            <Fact label={t('workspace.locale')} value={LOCALES[workspace.locale] || workspace.locale} />
                        </Box>
                    </Paper>
                    <Can permission="agency:manage">
                        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                                <Typography>
                                    {t('workspace.status')}: {t(`workspace.${workspace.status}`, workspace.status)}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button variant="outlined" disabled={saving} onClick={() => setStatus('active')}>
                                        {t('workspace.activate')}
                                    </Button>
                                    <Button variant="outlined" color="warning" disabled={saving} onClick={() => setStatus('suspended')}>
                                        {t('workspace.suspend')}
                                    </Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    </Can>
                </Stack>
            )}
        </Box>
    );
}
