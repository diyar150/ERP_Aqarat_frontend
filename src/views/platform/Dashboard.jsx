import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';

function StatCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2.5, py: 2, flex: '1 1 160px', minWidth: 150 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h4" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

export default function PlatformDashboard() {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get('platform/dashboard')
            .then((res) => {
                if (active) setData(res.data?.data || null);
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.error?.message || t('platform.load_error'));
            });
        return () => { active = false; };
    }, [t]);

    const agencies = data?.agencies || {};
    const subscriptions = data?.subscriptions || {};

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader title={t('platform.dashboard_title')} description={t('platform.dashboard_hint')} />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('platform.nav.agencies')}</Typography>
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap' }}>
                <StatCard label={t('platform.stats.total')} value={agencies.total ?? '—'} />
                <StatCard label={t('platform.stats.active')} value={agencies.active ?? '—'} />
                <StatCard label={t('platform.stats.suspended')} value={agencies.suspended ?? '—'} />
                <StatCard label={t('platform.stats.archived')} value={agencies.archived ?? '—'} />
            </Stack>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{t('platform.subscriptions')}</Typography>
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <StatCard label={t('platform.stats.trialing')} value={subscriptions.trialing ?? '—'} />
                <StatCard label={t('platform.stats.sub_active')} value={subscriptions.active ?? '—'} />
                <StatCard label={t('platform.stats.grace')} value={subscriptions.grace ?? '—'} />
                <StatCard label={t('platform.stats.expired')} value={subscriptions.expired ?? '—'} />
                <StatCard label={t('platform.stats.cancelled')} value={subscriptions.cancelled ?? '—'} />
                <StatCard label={t('platform.stats.trials_ending')} value={subscriptions.trials_ending ?? '—'} />
            </Stack>
        </Box>
    );
}
