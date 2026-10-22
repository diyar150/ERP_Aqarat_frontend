import { useCallback, useEffect, useState } from 'react';
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
import { canAny } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { formatCurrency, formatNumber } from '@/utils/format';
import { asDateInput, rateError } from './rateForm.js';

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

export default function CurrencyExchangeRateIndex() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canEdit = canAny(user, ['currency_rates.edit', 'currencies.edit']);
    const canRemove = canAny(user, ['currency_rates.delete', 'currencies.delete']);

    const [currencies, setCurrencies] = useState([]);
    const [pending, setPending] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get('admin/currencies', { params: { page: 1, limit: 500 } })
            .then((res) => {
                if (!active) return;
                const rows = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
                setCurrencies(rows);
            })
            .catch(() => {
                if (active) setCurrencies([]);
            });
        return () => { active = false; };
    }, []);

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = {
            page,
            limit: 25,
            search: q || '',
            searchField: 'currency',
        };
        if (filters?.variable_currency_id) params.variable_currency_id = filters.variable_currency_id;
        if (filters?.effective_date) params.effective_date = filters.effective_date;
        const res = await fetch.get('admin/currency-exchange-rates', { params });
        const payload = res.data?.success ? res.data : res.data;
        return {
            items: Array.isArray(payload?.data) ? payload.data : [],
            total: Number(payload?.total || 0),
            limit: Number(payload?.limit || 25),
            summary: payload?.summary || null,
        };
    }, []);

    const list = usePagedList(fetchPage);
    const summary = list.payload?.summary || {
        rates: list.total,
        pairs: 0,
        latest_date: null,
    };

    const remove = async () => {
        if (!pending) return;
        setRemoving(true);
        list.setError('');
        try {
            await fetch.delete(`admin/currency-exchange-rates/${pending.id}`);
            setPending(null);
            setNotice(t('currency_exchange_rates.delete_success'));
            list.reload();
        } catch (err) {
            list.setError(rateError(err, t, 'currency_exchange_rates.delete_error'));
        } finally {
            setRemoving(false);
        }
    };

    const pairLabel = (row) => {
        const base = row.base_currency_symbol || row.base_currency_name || '—';
        const variable = row.variable_currency_symbol || row.variable_currency_name || '—';
        return `${base} → ${variable}`;
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('currency_exchange_rates.title')}
                description={t('currency_exchange_rates.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Can permission="currencies.view">
                            <Button variant="outlined" onClick={() => navigate('/admin/currencies/index')}>
                                {t('currency_exchange_rates.back_currencies')}
                            </Button>
                        </Can>
                        <Can permission={['currency_rates.create', 'currencies.create']} any>
                            <Button variant="contained" onClick={() => navigate('/admin/currency-exchange-rates/create')}>
                                {t('currency_exchange_rates.add_new')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />

            {list.error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => list.setError('')}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <SummaryCard label={t('currency_exchange_rates.summary_rates')} value={summary.rates} />
                <SummaryCard label={t('currency_exchange_rates.summary_pairs')} value={summary.pairs} />
                <SummaryCard
                    label={t('currency_exchange_rates.summary_latest')}
                    value={asDateInput(summary.latest_date) || t('currency_exchange_rates.summary_none')}
                />
            </Stack>

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'variable_currency_id',
                        label: t('currency_exchange_rates.variable_currency'),
                        value: list.filters.variable_currency_id || '',
                        onChange: (value) => list.setFilter('variable_currency_id', value),
                        options: currencies.map((currency) => ({
                            value: String(currency.id),
                            label: `${currency.name}${currency.symbol ? ` (${currency.symbol})` : ''}`,
                        })),
                    },
                    {
                        key: 'effective_date',
                        type: 'date',
                        label: t('currency_exchange_rates.effective_date'),
                        value: list.filters.effective_date || '',
                        onChange: (value) => list.setFilter('effective_date', value),
                    },
                ]}
            />

            <DataTable
                columns={[
                    {
                        key: 'pair',
                        locked: true,
                        header: t('currency_exchange_rates.pair'),
                        render: (row) => (
                            <Box>
                                <Typography variant="body2" fontWeight={600}>{pairLabel(row)}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {row.base_currency_name} → {row.variable_currency_name}
                                </Typography>
                            </Box>
                        ),
                    },
                    {
                        key: 'base_amount',
                        header: t('currency_exchange_rates.base_amount'),
                        render: (row) => (
                            <Typography variant="body2" dir="ltr" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(row.base_amount, row.base_currency_symbol, 6)}
                            </Typography>
                        ),
                    },
                    {
                        key: 'variable_amount',
                        header: t('currency_exchange_rates.variable_amount'),
                        render: (row) => (
                            <Typography variant="body2" dir="ltr" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(row.variable_amount, row.variable_currency_symbol, 6)}
                            </Typography>
                        ),
                    },
                    {
                        key: 'exchange_rate',
                        header: t('currency_exchange_rates.exchange_rate'),
                        render: (row) => (
                            <Typography variant="body2" dir="ltr" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatNumber(row.exchange_rate ?? 0, 6)}
                            </Typography>
                        ),
                    },
                    {
                        key: 'effective_date',
                        header: t('currency_exchange_rates.effective_date'),
                        render: (row) => (
                            <Typography variant="body2" dir="ltr">
                                {asDateInput(row.effective_date) || '—'}
                            </Typography>
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
                                        onClick={() => navigate(`/admin/currency-exchange-rates/${row.id}/edit`)}
                                    />
                                )}
                                {canRemove && (
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
                empty={t('currency_exchange_rates.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={canEdit ? (row) => navigate(`/admin/currency-exchange-rates/${row.id}/edit`) : undefined}
            />

            <Dialog open={Boolean(pending)} onClose={() => (!removing ? setPending(null) : null)} fullWidth maxWidth="xs">
                <DialogTitle>{t('currency_exchange_rates.delete_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('currency_exchange_rates.delete_confirm', {
                            pair: pending ? pairLabel(pending) : '',
                            date: pending ? asDateInput(pending.effective_date) : '',
                        })}
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
