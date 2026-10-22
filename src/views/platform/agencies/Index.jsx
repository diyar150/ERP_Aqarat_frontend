import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { currencyLabel } from '@/utils/money.js';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { platformCan, usePlatformAuthStore } from '@/store/platformAuthStore';

const SUBSCRIPTION_FILTERS = ['trialing', 'active', 'grace', 'expired', 'cancelled', 'none'];
const RECOVERY_CHIPS = ['cancelled', 'expired', 'grace', 'none'];

function formatDate(value) {
    const text = String(value || '').slice(0, 10);
    return text || '—';
}

export default function AgenciesIndex() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const admin = usePlatformAuthStore((state) => state.admin);
    const canCreate = platformCan(admin, 'agencies.create');

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.state) params.state = filters.state;
        if (filters.subscription) params.subscription = filters.subscription;
        const res = await fetch.get('platform/agencies', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage, { filters: { state: 'active', subscription: '' } });
    const archived = list.filters.state === 'archived';
    const subscriptionFilter = list.filters.subscription || '';

    const columns = [
        {
            key: 'name',
            locked: true,
            header: t('platform.agency_name'),
            render: (row) => <Typography fontWeight={600}>{row.name}</Typography>,
        },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            render: (row) => (
                <StatusChip
                    status={archived ? 'archived' : row.status}
                    label={archived
                        ? t('platform.stats.archived')
                        : t(`platform.agency_statuses.${row.status}`, { defaultValue: row.status })}
                />
            ),
        },
        {
            key: 'phone',
            header: t('platform.phone'),
            render: (row) => (row.phone ? <span dir="ltr">{row.phone}</span> : '—'),
        },
        {
            key: 'email',
            header: t('platform.email'),
            render: (row) => (row.email ? <span dir="ltr">{row.email}</span> : '—'),
        },
        {
            key: 'plan',
            header: t('platform.plan'),
            render: (row) => row.subscription?.plan_name || row.subscription?.plan_code || '—',
        },
        {
            key: 'subscription',
            header: t('platform.subscriptions'),
            render: (row) => (row.subscription
                ? (
                    <StatusChip
                        status={row.subscription.status}
                        label={t(`platform.subscription_statuses.${row.subscription.status}`, {
                            defaultValue: row.subscription.status,
                        })}
                    />
                )
                : '—'),
        },
        {
            key: 'ends',
            header: t('platform.ends_on'),
            render: (row) => formatDate(row.subscription?.ends_on),
        },
        {
            key: 'currency',
            header: t('platform.currency'),
            render: (row) => currencyLabel(row.base_currency_code) || '—',
        },
        {
            key: 'created',
            header: t('common.created_at'),
            render: (row) => formatDate(row.created_at),
        },
        {
            key: 'actions',
            locked: true,
            header: t('workspace_ui.actions'),
            pin: 'end',
            render: (row) => (
                <Stack direction="row" spacing={0.25} onClick={(event) => event.stopPropagation()}>
                    <ActionIconButton
                        action="view"
                        onClick={() => navigate(`/platform/agencies/${row.id}`)}
                    />
                </Stack>
            ),
        },
    ];

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: '100%',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            <PageHeader
                title={t('platform.agencies_title')}
                description={t('platform.agencies_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button variant="outlined" onClick={() => list.reload()} disabled={list.loading}>
                            {t('common.refresh')}
                        </Button>
                        {canCreate && (
                            <Button variant="contained" onClick={() => navigate('/platform/agencies/create')}>
                                {t('platform.create_agency')}
                            </Button>
                        )}
                    </Stack>
                )}
            />

            {list.error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => list.setError('')}>
                    {list.error}
                </Alert>
            )}

            <Paper variant="outlined" sx={{ px: 2, py: 1.25, mb: 2 }}>
                <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        {t('platform.agencies_list_hint')}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            {t('platform.subscription_recovery_quick')}
                        </Typography>
                        {RECOVERY_CHIPS.map((key) => (
                            <Chip
                                key={key}
                                size="small"
                                clickable
                                color={subscriptionFilter === key ? 'warning' : 'default'}
                                variant={subscriptionFilter === key ? 'filled' : 'outlined'}
                                label={key === 'none'
                                    ? t('platform.subscription_none')
                                    : t(`platform.subscription_statuses.${key}`)}
                                onClick={() => list.setFilter(
                                    'subscription',
                                    subscriptionFilter === key ? '' : key,
                                )}
                            />
                        ))}
                    </Stack>
                </Stack>
            </Paper>

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'subscription',
                        label: t('platform.subscription_filter'),
                        value: subscriptionFilter,
                        onChange: (value) => list.setFilter('subscription', value),
                        options: SUBSCRIPTION_FILTERS.map((key) => ({
                            value: key,
                            label: key === 'none'
                                ? t('platform.subscription_none')
                                : t(`platform.subscription_statuses.${key}`),
                        })),
                    },
                ]}
                end={(
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={list.filters.state || 'active'}
                        onChange={(_event, value) => {
                            if (value) list.setFilter('state', value);
                        }}
                    >
                        <ToggleButton value="active">{t('platform.stats.active')}</ToggleButton>
                        <ToggleButton value="suspended">{t('platform.stats.suspended')}</ToggleButton>
                        <ToggleButton value="archived">{t('platform.stats.archived')}</ToggleButton>
                    </ToggleButtonGroup>
                )}
            />

            <DataTable
                fill
                columns={columns}
                rows={list.items}
                loading={list.loading}
                empty={archived ? t('platform.agencies_empty_archived') : t('platform.agencies_empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={(row) => navigate(`/platform/agencies/${row.id}`)}
            />
        </Box>
    );
}
