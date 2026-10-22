import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { userError } from './userForm.js';

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography sx={{ wordBreak: 'break-word' }}>{value || '—'}</Typography>
        </Box>
    );
}

export default function UserShow() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get(`admin/users/${id}`)
            .then((res) => {
                if (!active) return;
                const row = res.data?.data || res.data;
                if (!row?.id) {
                    navigate('/admin/users/index');
                    return;
                }
                setUser(row);
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 404) navigate('/admin/users/index');
                else setError(userError(err, t));
            });
        return () => { active = false; };
    }, [id, navigate, t]);

    if (!user && !error) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={user?.username || t('user.detail_title')}
                description={t('user.show_hint')}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => navigate('/admin/users/index')}>{t('user.back')}</Button>
                        <Can permission={['users.edit', 'staff:manage']} any>
                            <Button variant="contained" onClick={() => navigate(`/admin/users/${id}/edit`)}>
                                {t('common.edit')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {user && (
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                        <Typography fontWeight={700}>{t('user.details')}</Typography>
                        <StatusChip
                            status={user.status === 'disabled' ? 'disabled' : 'active'}
                            label={user.status === 'disabled' ? t('user.status_disabled') : t('user.status_active')}
                        />
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        <Fact label={t('user.username')} value={user.username} />
                        <Fact label={t('user.role')} value={user.role_name} />
                        <Fact label={t('user.office')} value={user.branch_name || t('user.all_offices')} />
                        <Fact label={t('user.email')} value={user.email} />
                        <Fact label={t('user.phone_number')} value={user.phone_number} />
                        <Fact label={t('user.status')} value={user.status === 'disabled' ? t('user.status_disabled') : t('user.status_active')} />
                        <Fact label={t('user.address')} value={user.address} />
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
