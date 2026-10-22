import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import { currencyLabel } from '@/utils/money.js';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { formatNumber } from '@/utils/format';
import { currencyError } from './currencyForm.js';

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

export default function CurrencyIndex() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'currencies.edit');
    const canRemove = can(user, 'currencies.delete');

    const [pending, setPending] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [notice, setNotice] = useState('');

    const fetchPage = useCallback(async ({ page, q }) => {
        const params = { page, limit: 25, search: q || '', searchField: 'name' };
        const res = await fetch.get('admin/currencies', { params });
        const payload = res.data?.success ? res.data : res.data;
        return {
            items: Array.isArray(payload?.data) ? payload.data : [],
            total: Number(payload?.total || 0),
            limit: Number(payload?.limit || 25),
            summary: payload?.summary || null,
        };
    }, []);

    const list = usePagedList(fetchPage);
    const summary = list.payload?.summary || { currencies: list.total, main: 0 };

    const remove = async () => {
        if (!pending) return;
        setRemoving(true);
        list.setError('');
        try {
            await fetch.delete(`admin/currencies/${pending.id}`);
            setPending(null);
            setNotice(t('currencies.delete_success'));
            list.reload();
        } catch (err) {
            list.setError(currencyError(err, t, 'currencies.delete_error'));
        } finally {
            setRemoving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('currencies.title')}
                description={t('currencies.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Can permission="currency_rates.view">
                            <Button variant="outlined" onClick={() => navigate('/admin/currency-exchange-rates/index')}>
                                {t('currencies.rates')}
                            </Button>
                        </Can>
                        <Can permission="currencies.create">
                            <Button variant="contained" onClick={() => navigate('/admin/currencies/create')}>
                                {t('currencies.add_new')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />

            {list.error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => list.setError('')}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <SummaryCard label={t('currencies.summary_count')} value={summary.currencies} />
                <SummaryCard
                    label={t('currencies.summary_main')}
                    value={summary.main > 0 ? t('currencies.main_set') : t('currencies.main_missing')}
                />
            </Stack>

            <ListToolbar search={list.query} onSearch={list.setSearch} />

            <DataTable
                columns={[
                    {
                        key: 'name',
                        locked: true,
                        header: t('currencies.name'),
                        render: (row) => (
                            <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                        ),
                    },
                    {
                        key: 'symbol',
                        header: t('currencies.symbol'),
                        render: (row) => (
                            <Typography variant="body2">{currencyLabel(row.symbol || row.code) || '—'}</Typography>
                        ),
                    },
                    {
                        key: 'exchange_rate',
                        header: t('currencies.exchange_rate'),
                        render: (row) => (
                            <Typography variant="body2" dir="ltr" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatNumber(row.exchange_rate ?? 0, 6)}
                            </Typography>
                        ),
                    },
                    {
                        key: 'main',
                        header: t('currencies.is_main_currency'),
                        render: (row) => (
                            <StatusChip
                                status={row.is_main_currency ? 'active' : 'inactive'}
                                label={row.is_main_currency ? t('currencies.main') : t('currencies.secondary')}
                            />
                        ),
                    },
                    {
                        key: 'actions',
                        header: t('workspace_ui.actions'),
                        pin: 'end',
                        render: (row) => (
                            <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                                {canEdit && (
                                    <ActionIconButton
                                        action="edit"
                                        onClick={() => navigate(`/admin/currencies/${row.id}/edit`)}
                                    />
                                )}
                                {canRemove && !row.is_main_currency && (
                                    <ActionIconButton
                                        action="delete"
                                        onClick={() => setPending(row)}
                                    />
                                )}
                            </Stack>
                        ),
                    },
                ]}
                rows={list.items}
                loading={list.loading}
                empty={t('currencies.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={canEdit ? (row) => navigate(`/admin/currencies/${row.id}/edit`) : undefined}
            />

            <Dialog open={Boolean(pending)} onClose={() => (!removing ? setPending(null) : null)} fullWidth maxWidth="xs">
                <DialogTitle>{t('currencies.delete_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('currencies.delete_confirm', { name: pending?.name || pending?.symbol })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button disabled={removing} onClick={() => setPending(null)}>{t('common.cancel')}</Button>
                    <Button color="error" variant="contained" disabled={removing} onClick={remove}>
                        {removing ? t('common.processing') : t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
