import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel } from '@/utils/money.js';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import ContractStatusDialog from './ContractStatusDialog.jsx';
import { contractAmount, contractError, contractNumber, contractParties, contractPeriod, contractWhen } from './contractForm.js';

const TYPES = ['sale', 'rent'];
const DEAL_STATUSES = ['draft', 'open', 'completed', 'cancelled'];
const TERMS = ['expiring', 'expired'];
const OPTIONAL_COLUMNS = ['type', 'property', 'branch', 'parties', 'period', 'user', 'date'];

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: '1 1 140px', minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

export default function Index() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const canDownload = can(user, 'document:download');
    const canIssue = can(user, 'document:generate');
    const [offices, setOffices] = useState([]);
    const [pending, setPending] = useState(null);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25, status: filters.state === 'archived' ? 'archived' : 'active' };
        if (q) params.q = q;
        if (filters.type) params.type = filters.type;
        if (filters.deal) params.deal = filters.deal;
        if (filters.term) params.term = filters.term;
        if (filters.branch) params.branch = filters.branch;
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        const res = await fetch.get('documents/contracts', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage, {
        q: params.get('q') || '',
        filters: {
            type: params.get('type') || '',
            deal: params.get('deal') || '',
            term: params.get('term') || '',
            branch: params.get('branch') || '',
            from: params.get('from') || '',
            to: params.get('to') || '',
            state: (params.get('state') === 'archived' || params.get('status') === 'archived') ? 'archived' : '',
        },
    });

    const { applyQuery } = list;
    useEffect(() => {
        applyQuery({
            q: params.get('q') || '',
            filters: {
                type: params.get('type') || '',
                deal: params.get('deal') || '',
                term: params.get('term') || '',
                branch: params.get('branch') || '',
                from: params.get('from') || '',
                to: params.get('to') || '',
                state: (params.get('state') === 'archived' || params.get('status') === 'archived') ? 'archived' : '',
            },
        });
    }, [applyQuery, params]);

    const summary = list.payload?.summary || { contracts: 0, sales: 0, rents: 0, active: 0, archived: 0, totals: [] };
    const archived = list.filters.state === 'archived';
    const columns = useColumnVisibility('contracts.table.columns', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);

    const changeStatus = async () => {
        if (!pending) return;
        setSaving(true);
        list.setError('');
        try {
            await fetch.patch(`documents/contracts/${pending.id}`, {
                template_id: pending.template_id,
                status: archived ? 'active' : 'archived',
                reason: reason.trim(),
                version: pending.row_version,
            });
            setNotice(t(archived ? 'contracts.restored' : 'contracts.archived_notice'));
            setPending(null);
            setReason('');
            list.reload();
        } catch (err) {
            list.setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const openReport = () => {
        const params = new URLSearchParams();
        if (list.query) params.set('q', list.query);
        if (list.filters.type) params.set('type', list.filters.type);
        params.set('status', archived ? 'archived' : 'active');
        if (list.filters.deal) params.set('deal', list.filters.deal);
        if (list.filters.term) params.set('term', list.filters.term);
        if (list.filters.branch) params.set('branch', list.filters.branch);
        if (list.filters.from) params.set('from', list.filters.from);
        if (list.filters.to) params.set('to', list.filters.to);
        const query = params.toString();
        navigate(query ? `/admin/contracts/report?${query}` : '/admin/contracts/report');
    };

    const pickerColumns = [
        { key: 'number', label: t('contracts.number'), locked: true },
        { key: 'deal', label: t('contracts.deal'), locked: true },
        { key: 'type', label: t('contracts.type') },
        { key: 'property', label: t('contracts.property') },
        { key: 'branch', label: t('contracts.branch') },
        { key: 'parties', label: t('contracts.parties') },
        { key: 'amount', label: t('contracts.amount'), locked: true },
        { key: 'period', label: t('contracts.period') },
        { key: 'user', label: t('contracts.issued_by') },
        { key: 'date', label: t('contracts.date') },
        { key: 'actions', label: t('workspace_ui.actions'), locked: true },
    ];

    const tableColumns = [
        {
            key: 'number',
            locked: true,
            header: t('contracts.number'),
            render: (row) => (
                <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{contractNumber(row.id)}</Typography>
                    <StatusChip status={row.status} label={t(`contracts.${row.status}`)} />
                </Stack>
            ),
        },
        {
            key: 'deal',
            locked: true,
            header: t('contracts.deal'),
            render: (row) => (
                <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                    <Typography fontWeight={600}>{row.reference_number || '—'}</Typography>
                    {row.transaction_status && (
                        <StatusChip status={row.transaction_status} label={t(`transactions.statuses.${row.transaction_status}`)} />
                    )}
                </Stack>
            ),
        },
        {
            key: 'type',
            header: t('contracts.type'),
            render: (row) => <StatusChip status={row.transaction_type} label={t(`contracts.${row.transaction_type}`)} />,
        },
        {
            key: 'property',
            header: t('contracts.property'),
            render: (row) => [row.property_reference, row.property_title].filter(Boolean).join(' · ') || '—',
        },
        { key: 'branch', header: t('contracts.branch'), render: (row) => row.branch_name || '—' },
        { key: 'parties', header: t('contracts.parties'), render: (row) => contractParties(row, t) },
        { key: 'amount', locked: true, header: t('contracts.amount'), render: (row) => contractAmount(row) },
        {
            key: 'period',
            header: t('contracts.period'),
            render: (row) => (
                <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                    <span>{contractPeriod(row)}</span>
                    {(row.term_state === 'expiring' || row.term_state === 'expired') && (
                        <StatusChip status={row.term_state} label={t(`contracts.${row.term_state}`)} />
                    )}
                </Stack>
            ),
        },
        { key: 'user', header: t('contracts.issued_by'), render: (row) => row.issued_by || '—' },
        { key: 'date', header: t('contracts.date'), render: (row) => contractWhen(row.created_at) },
        {
            key: 'actions',
            locked: true,
            header: (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span>{t('workspace_ui.actions')}</span>
                    <ColumnPicker columns={pickerColumns} hidden={columns.hidden} onToggle={columns.toggle} onReset={columns.reset} />
                </Stack>
            ),
            pin: 'end',
            render: (row) => (
                <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                    <ActionIconButton action="view" onClick={() => navigate(`/admin/contracts/${row.id}/show`)} />
                    {!archived && row.status !== 'signed' && canIssue && <ActionIconButton action="edit" onClick={() => navigate(`/admin/contracts/${row.id}/edit`)} />}
                    {canDownload && (
                        <ActionIconButton
                            action="print"
                            title={t('contracts.preview')}
                            onClick={() => navigate(`/admin/contracts/${row.id}/show`)}
                        />
                    )}
                    {canIssue && (
                        <ActionIconButton
                            action={archived ? 'restore' : 'delete'}
                            title={t(archived ? 'contracts.restore' : 'contracts.archive')}
                            onClick={() => { setReason(''); setPending(row); }}
                        />
                    )}
                </Stack>
            ),
        },
    ];

    const totals = summary.totals || [];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('contracts.title')}
                description={t('contracts.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Can permission="document:generate">
                            <Button onClick={() => navigate('/admin/contracts/templates')}>{t('contracts.templates')}</Button>
                        </Can>
                        <Button onClick={openReport}>{t('contracts.report')}</Button>
                        <Can permission="document:generate">
                            <Button variant="contained" onClick={() => navigate('/admin/contracts/create')}>{t('contracts.add_new')}</Button>
                        </Can>
                    </Stack>
                )}
            />
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <SummaryCard label={t('contracts.summary_contracts')} value={summary.contracts} />
                <SummaryCard label={t('contracts.summary_sales')} value={summary.sales} />
                <SummaryCard label={t('contracts.summary_rents')} value={summary.rents} />
                <SummaryCard label={t('contracts.expiring')} value={summary.expiring || 0} />
                {totals.map((row) => {
                    const currency = currencyLabel(row.symbol || row.currency_code);
                    return (
                        <SummaryCard
                            key={row.currency_code || currency || 'value'}
                            label={currency ? `${t('contracts.value')} · ${currency}` : t('contracts.value')}
                            value={formatPrice(row.total)}
                        />
                    );
                })}
            </Stack>
            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'type',
                        label: t('contracts.type'),
                        value: list.filters.type || '',
                        allLabel: t('contracts.all_types'),
                        onChange: (value) => list.setFilter('type', value),
                        options: TYPES.map((type) => ({ value: type, label: t(`contracts.${type}`) })),
                    },
                    {
                        key: 'deal',
                        label: t('contracts.deal_status'),
                        value: list.filters.deal || '',
                        allLabel: t('contracts.all_statuses'),
                        onChange: (value) => list.setFilter('deal', value),
                        options: DEAL_STATUSES.map((status) => ({ value: status, label: t(`transactions.statuses.${status}`) })),
                    },
                    {
                        key: 'term',
                        label: t('contracts.term'),
                        value: list.filters.term || '',
                        allLabel: t('contracts.all_terms'),
                        onChange: (value) => list.setFilter('term', value),
                        options: TERMS.map((term) => ({ value: term, label: t(`contracts.${term}`) })),
                    },
                    ...(offices.length && !user?.branch_id ? [{
                        key: 'branch',
                        label: t('contracts.branch'),
                        value: list.filters.branch || '',
                        allLabel: t('contracts.all_branches'),
                        onChange: (value) => list.setFilter('branch', value),
                        options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                    }] : []),
                    {
                        key: 'from',
                        type: 'date',
                        label: t('contracts.from'),
                        value: list.filters.from || '',
                        onChange: (value) => list.setFilter('from', value),
                    },
                    {
                        key: 'to',
                        type: 'date',
                        label: t('contracts.to'),
                        value: list.filters.to || '',
                        onChange: (value) => list.setFilter('to', value),
                    },
                ]}
                end={(
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={archived ? 'archived' : 'active'}
                        onChange={(_, value) => {
                            if (value) list.setFilter('state', value === 'archived' ? 'archived' : '');
                        }}
                    >
                        <ToggleButton value="active">{t('contracts.active')}</ToggleButton>
                        <ToggleButton value="archived">
                            {summary.archived > 0 ? `${t('contracts.archived')} (${summary.archived})` : t('contracts.archived')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                )}
            />
            <DataTable
                columns={tableColumns.filter((column) => column.locked || !hidden.has(column.key))}
                rows={list.items}
                loading={list.loading}
                empty={archived ? t('contracts.empty_archived') : t('contracts.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={archived ? undefined : (row) => navigate(`/admin/contracts/${row.id}/show`)}
            />
            <ContractStatusDialog
                open={Boolean(pending)}
                title={t(archived ? 'contracts.restore_title' : 'contracts.archive_title')}
                body={t(archived ? 'contracts.restore_confirm' : 'contracts.archive_confirm', { number: pending ? contractNumber(pending.id) : '' })}
                reason={reason}
                onReason={setReason}
                onClose={() => setPending(null)}
                onConfirm={changeStatus}
                busy={saving}
                confirmLabel={t(archived ? 'contracts.restore' : 'contracts.archive')}
                color={archived ? 'primary' : 'error'}
            />
        </Box>
    );
}
