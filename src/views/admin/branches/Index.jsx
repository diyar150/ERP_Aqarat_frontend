import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { balanceTone, moneyLabel } from '@/utils/money.js';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import WalletAmount from './WalletAmount.jsx';

const STATUSES = ['active', 'inactive'];

function SummaryCard({ label, value, amount, currency }) {
    const tone = amount != null ? balanceTone(amount) : 'neutral';
    const color = tone === 'positive'
        ? 'success.dark'
        : tone === 'negative'
            ? 'error.dark'
            : 'text.primary';
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography
                variant="h6"
                fontWeight={700}
                sx={{ color: amount != null ? color : 'inherit', fontVariantNumeric: 'tabular-nums' }}
            >
                {amount != null ? moneyLabel(amount, currency) : value}
            </Typography>
        </Paper>
    );
}

function WalletsStack({ wallets }) {
    if (!Array.isArray(wallets) || wallets.length === 0) {
        return <Typography variant="body2" color="text.secondary">—</Typography>;
    }
    return (
        <Stack spacing={0.35} alignItems="flex-start">
            {wallets.map((row) => (
                <WalletAmount
                    key={row.currency_code || row.currency_id}
                    value={row.balance}
                    currency={row.currency_code}
                />
            ))}
        </Stack>
    );
}

export default function Index() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'branch:update');

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.status) params.status = filters.status;
        const res = await fetch.get('branches', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage);
    const summary = list.payload?.summary || { branches: 0, active: 0, wallet_total: '0', currency_code: '' };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('branches.title')}
                description={t('branches.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button variant="outlined" onClick={() => navigate('/admin/reports/branch-wallets')}>
                            {t('reports.branch_wallets_title')}
                        </Button>
                        <Can permission="branch:create">
                            <Button variant="contained" onClick={() => navigate('/admin/branches/create')}>
                                {t('branches.create')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                <SummaryCard label={t('branches.summary_branches')} value={summary.branches} />
                <SummaryCard label={t('branches.summary_active')} value={summary.active} />
                <SummaryCard
                    label={t('branches.summary_wallet')}
                    amount={summary.wallet_total}
                    currency={summary.currency_code}
                />
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">{t('branches.summary_wallets_native')}</Typography>
                    <Box sx={{ mt: 0.5 }}>
                        <WalletsStack wallets={summary.wallets_total} />
                    </Box>
                </Paper>
            </Stack>
            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'status',
                        label: t('workspace_ui.status'),
                        value: list.filters.status || '',
                        onChange: (value) => list.setFilter('status', value),
                        options: STATUSES.map((status) => ({ value: status, label: t(`branches.statuses.${status}`) })),
                    },
                ]}
            />
            <DataTable
                columns={[
                    {
                        key: 'name',
                        header: t('branches.name'),
                        render: (row) => (
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <span>{row.name}</span>
                                {row.is_main && <Chip size="small" label={t('branches.main')} color="primary" variant="outlined" />}
                            </Stack>
                        ),
                    },
                    { key: 'code', header: t('branches.code'), render: (row) => row.code || '—' },
                    { key: 'city', header: t('branches.city'), render: (row) => row.city || '—' },
                    { key: 'neighborhood', header: t('branches.neighborhood'), render: (row) => row.neighborhood || '—' },
                    { key: 'phone', header: t('branches.phone'), render: (row) => row.phone || '—' },
                    { key: 'status', header: t('workspace_ui.status'), render: (row) => <StatusChip status={row.status} label={t(`branches.statuses.${row.status}`)} /> },
                    {
                        key: 'wallet',
                        header: t('branches.wallet'),
                        render: (row) => (
                            <Stack spacing={0.5} alignItems="flex-start">
                                <WalletsStack wallets={row.wallets} />
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
                                    {t('branches.book_total')}:
                                    <WalletAmount value={row.wallet?.balance} currency={row.wallet?.currency_code} />
                                </Typography>
                            </Stack>
                        ),
                    },
                    {
                        key: 'actions',
                        header: t('workspace_ui.actions'),
                        pin: 'end',
                        render: (row) => (
                            <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                                <ActionIconButton action="view" onClick={() => navigate(`/admin/branches/${row.id}/show`)} />
                                {canEdit && <ActionIconButton action="edit" onClick={() => navigate(`/admin/branches/${row.id}/edit`)} />}
                            </Stack>
                        ),
                    },
                ]}
                rows={list.items}
                loading={list.loading}
                empty={t('branches.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={(row) => navigate(`/admin/branches/${row.id}/show`)}
            />
        </Box>
    );
}
