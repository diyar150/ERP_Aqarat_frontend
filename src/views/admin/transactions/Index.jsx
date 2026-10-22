import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import Can from '@/components/auth/Can.jsx';
import ActionIconButton from '@/components/common/ActionIconButton.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import { useAuthStore } from '@/store/authStore';
import { dealAmount, dealParties, dealPeriod, dealWhen } from './transactionForm.js';
import DealBoard from './DealBoard.jsx';

const OPTIONAL_COLUMNS = ['type', 'parties', 'period', 'branch', 'agent', 'date'];
const TERMS = ['expiring', 'expired'];

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function buildBoardParams(filters = {}, query = '') {
    const params = { desk: filters.desk === 'closed' ? 'closed' : 'working' };
    if (query) params.q = query;
    if (filters.status) params.status = filters.status;
    if (filters.transaction_type) params.transaction_type = filters.transaction_type;
    if (filters.term) params.term = filters.term;
    if (filters.branch) params.branch = filters.branch;
    if (filters.attention) params.attention = filters.attention;
    if (filters.agent) params.agent = filters.agent;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    return params;
}

export default function Index() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);
    const lockedOffice = Boolean(user?.branch_id);
    const [offices, setOffices] = useState([]);
    const [agents, setAgents] = useState([]);
    const [view, setView] = useState(params.get('view') === 'board' ? 'board' : 'table');
    const [board, setBoard] = useState({ columns: { draft: [], open: [], completed: [], cancelled: [] }, summary: null });
    const [boardLoading, setBoardLoading] = useState(() => params.get('view') === 'board');
    const [boardError, setBoardError] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const query = { page, limit: 25, desk: filters.desk === 'closed' ? 'closed' : 'working' };
        if (q) query.q = q;
        if (filters.status) query.status = filters.status;
        if (filters.transaction_type) query.transaction_type = filters.transaction_type;
        if (filters.term) query.term = filters.term;
        if (filters.branch) query.branch = filters.branch;
        if (filters.attention) query.attention = filters.attention;
        if (filters.agent) query.agent = filters.agent;
        if (filters.from) query.from = filters.from;
        if (filters.to) query.to = filters.to;
        const res = await fetch.get('transactions', { params: query });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage, {
        q: params.get('q') || '',
        filters: {
            desk: params.get('desk') === 'closed' ? 'closed' : '',
            status: params.get('status') || '',
            transaction_type: params.get('transaction_type') || params.get('type') || '',
            term: params.get('term') || '',
            branch: params.get('branch') || '',
            attention: params.get('attention') || '',
            agent: params.get('agent') || '',
            from: params.get('from') || '',
            to: params.get('to') || '',
        },
    });

    const { applyQuery } = list;
    useEffect(() => {
        applyQuery({
            q: params.get('q') || '',
            filters: {
                desk: params.get('desk') === 'closed' ? 'closed' : '',
                status: params.get('status') || '',
                transaction_type: params.get('transaction_type') || params.get('type') || '',
                term: params.get('term') || '',
                branch: params.get('branch') || '',
                attention: params.get('attention') || '',
                agent: params.get('agent') || '',
                from: params.get('from') || '',
                to: params.get('to') || '',
            },
        });
    }, [applyQuery, params]);

    // Legacy deep-link: /transactions?create=1&property_id=&type=
    useEffect(() => {
        if (params.get('create') !== '1') return;
        const next = new URLSearchParams();
        if (params.get('property_id')) next.set('property_id', params.get('property_id'));
        if (params.get('type')) next.set('type', params.get('type'));
        navigate(`/admin/transactions/create?${next.toString()}`, { replace: true });
    }, [params, navigate]);

    const summary = (view === 'board' ? board.summary : list.payload?.summary) || {
        deals: 0, sales: 0, rents: 0, open: 0, expiring: 0, working: 0, closed: 0,
    };
    const closed = list.filters.desk === 'closed';
    const statuses = closed ? ['completed', 'cancelled'] : ['draft', 'open'];
    const columns = useColumnVisibility('transactions.table.columns', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);

    const loadBoard = useCallback(async () => {
        setBoardLoading(true);
        setBoardError('');
        try {
            const res = await fetch.get('transactions/board', { params: buildBoardParams(list.filters, list.query) });
            setBoard(res.data?.data || { columns: {}, summary: null });
        } catch (err) {
            setBoardError(err.response?.data?.error?.message || t('login.error'));
        } finally {
            setBoardLoading(false);
        }
    }, [list.filters, list.query, t]);

    useEffect(() => {
        if (view !== 'board') return undefined;
        let cancelled = false;

        fetch.get('transactions/board', { params: buildBoardParams(list.filters, list.query) })
            .then((res) => {
                if (cancelled) return;
                setBoard(res.data?.data || { columns: {}, summary: null });
                setBoardError('');
            })
            .catch((err) => {
                if (cancelled) return;
                setBoardError(err.response?.data?.error?.message || t('login.error'));
            })
            .finally(() => {
                if (!cancelled) setBoardLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [view, list.filters, list.query, t]);

    const moveDeal = async (deal, status) => {
        setBoardError('');
        try {
            await fetch.post(`transactions/${deal.id}/status`, {
                status,
                cancel_reason: status === 'cancelled' ? cancelReason.trim() : null,
                version: deal.row_version,
            });
            if (status === 'cancelled') setCancelReason('');
            await loadBoard();
            list.reload?.();
        } catch (err) {
            const message = err.response?.data?.error?.message || '';
            setBoardError(message || t('login.error'));
            await loadBoard();
        }
    };

    useEffect(() => {
        let active = true;
        const requests = [fetch.get('properties/agents')];
        if (!lockedOffice) requests.push(fetch.get('branches/options'));
        Promise.all(requests)
            .then(([agentsRes, officesRes]) => {
                if (!active) return;
                const payload = agentsRes.data?.data;
                setAgents(payload?.items || payload || []);
                if (officesRes) setOffices(officesRes.data?.data?.branches || officesRes.data?.data || []);
            })
            .catch(() => {});
        return () => { active = false; };
    }, [lockedOffice]);

    const openReport = () => {
        const query = new URLSearchParams();
        query.set('desk', closed ? 'closed' : 'working');
        if (list.query) query.set('q', list.query);
        if (list.filters.status) query.set('status', list.filters.status);
        if (list.filters.transaction_type) query.set('type', list.filters.transaction_type);
        if (list.filters.term) query.set('term', list.filters.term);
        if (list.filters.branch) query.set('branch', list.filters.branch);
        if (list.filters.from) query.set('from', list.filters.from);
        if (list.filters.to) query.set('to', list.filters.to);
        navigate(`/admin/transactions/report?${query.toString()}`);
    };

    const tableColumns = [
        { key: 'reference', header: t('transactions.reference'), locked: true, render: (row) => row.reference_number },
        { key: 'property', header: t('transactions.property'), locked: true, render: (row) => [row.property_reference, row.property_title].filter(Boolean).join(' · ') || '—' },
        { key: 'type', header: t('transactions.type'), render: (row) => <StatusChip status={row.transaction_type} label={t(`transactions.types.${row.transaction_type}`)} /> },
        { key: 'status', header: t('workspace_ui.status'), locked: true, render: (row) => <StatusChip status={row.status} label={t(`transactions.statuses.${row.status}`)} /> },
        { key: 'amount', header: t('transactions.value'), locked: true, render: dealAmount },
        { key: 'parties', header: t('transactions.parties'), render: (row) => dealParties(row, t) },
        {
            key: 'period',
            header: t('transactions.period'),
            render: (row) => (
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>{dealPeriod(row)}</span>
                    {row.term_state === 'expiring' || row.term_state === 'expired' ? (
                        <StatusChip status={row.term_state} label={t(`transactions.${row.term_state}`)} />
                    ) : null}
                </Stack>
            ),
        },
        { key: 'branch', header: t('transactions.branch'), render: (row) => row.branch_name || '—' },
        { key: 'agent', header: t('transactions.agent'), render: (row) => row.agent_name || '—' },
        { key: 'date', header: t('transactions.date'), render: (row) => dealWhen(row.created_at) },
        {
            key: 'actions',
            header: '',
            locked: true,
            align: 'right',
            render: (row) => (
                <ActionIconButton action="view" onClick={(event) => { event.stopPropagation(); navigate(`/admin/transactions/${row.id}/show`); }} />
            ),
        },
    ];

    const agentOptions = Array.isArray(agents) ? agents : [];

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
                title={t('transactions.title')}
                description={t('transactions.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button variant="outlined" onClick={openReport}>{t('transactions.report')}</Button>
                        <Can permission="transaction:create">
                            <Button variant="contained" onClick={() => navigate('/admin/transactions/create')}>{t('transactions.create')}</Button>
                        </Can>
                    </Stack>
                )}
            />
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <SummaryCard label={t('transactions.summary_deals')} value={summary.deals} />
                <SummaryCard label={t('transactions.summary_sales')} value={summary.sales} />
                <SummaryCard label={t('transactions.summary_rents')} value={summary.rents} />
                <SummaryCard label={t('transactions.statuses.open')} value={summary.open} />
                <SummaryCard label={t('transactions.expiring')} value={summary.expiring || 0} />
            </Stack>
            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'transaction_type',
                        label: t('transactions.type'),
                        value: list.filters.transaction_type || '',
                        allLabel: t('transactions.all_types'),
                        onChange: (value) => list.setFilter('transaction_type', value),
                        options: ['sale', 'rent'].map((type) => ({ value: type, label: t(`transactions.types.${type}`) })),
                    },
                    {
                        key: 'status',
                        label: t('workspace_ui.status'),
                        value: list.filters.status || '',
                        allLabel: t('transactions.all_statuses'),
                        onChange: (value) => list.setFilter('status', value),
                        options: statuses.map((status) => ({ value: status, label: t(`transactions.statuses.${status}`) })),
                    },
                    {
                        key: 'term',
                        label: t('transactions.term'),
                        value: list.filters.term || '',
                        allLabel: t('transactions.all_terms'),
                        onChange: (value) => list.setFilter('term', value),
                        options: TERMS.map((term) => ({ value: term, label: t(`transactions.${term}`) })),
                    },
                    {
                        key: 'attention',
                        label: t('transactions.attention'),
                        value: list.filters.attention || '',
                        allLabel: t('transactions.all_attention'),
                        onChange: (value) => list.setFilter('attention', value),
                        options: [
                            { value: 'missing_contract', label: t('transactions.attention_missing_contract') },
                            { value: 'commission_pending', label: t('transactions.attention_commission_pending') },
                        ],
                    },
                    ...(agentOptions.length ? [{
                        key: 'agent',
                        label: t('transactions.agent'),
                        value: list.filters.agent || '',
                        allLabel: t('transactions.all_agents'),
                        onChange: (value) => list.setFilter('agent', value),
                        options: agentOptions.map((agent) => ({ value: String(agent.id), label: agent.username })),
                    }] : []),
                    ...(!lockedOffice && offices.length ? [{
                        key: 'branch',
                        label: t('transactions.branch'),
                        value: list.filters.branch || '',
                        allLabel: t('transactions.all_branches'),
                        onChange: (value) => list.setFilter('branch', value),
                        options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                    }] : []),
                    { key: 'from', type: 'date', label: t('transactions.from'), value: list.filters.from || '', onChange: (value) => list.setFilter('from', value) },
                    { key: 'to', type: 'date', label: t('transactions.to'), value: list.filters.to || '', onChange: (value) => list.setFilter('to', value) },
                ]}
                end={(
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={view}
                            onChange={(_, value) => {
                                if (!value) return;
                                setView(value);
                                if (value === 'board') setBoardLoading(true);
                                const next = new URLSearchParams(params);
                                if (value === 'board') next.set('view', 'board');
                                else next.delete('view');
                                setParams(next, { replace: true });
                            }}
                        >
                            <ToggleButton value="table">{t('transactions.view_table')}</ToggleButton>
                            <ToggleButton value="board">{t('transactions.view_board')}</ToggleButton>
                        </ToggleButtonGroup>
                        {view === 'table' && (
                            <ColumnPicker
                                columns={OPTIONAL_COLUMNS.map((key) => ({ key, label: t(`transactions.${key}`) }))}
                                hidden={columns.hidden}
                                onToggle={columns.toggle}
                                onReset={columns.reset}
                            />
                        )}
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={closed ? 'closed' : 'working'}
                            onChange={(_, value) => {
                                if (!value) return;
                                list.setFilter('status', '');
                                list.setFilter('desk', value === 'closed' ? 'closed' : '');
                            }}
                        >
                            <ToggleButton value="working">{t('transactions.working')}</ToggleButton>
                            <ToggleButton value="closed">
                                {summary.closed > 0 ? `${t('transactions.closed')} (${summary.closed})` : t('transactions.closed')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                )}
            />
            {(list.error || boardError) && <Alert severity="error" sx={{ mb: 2 }}>{list.error || boardError}</Alert>}
            {view === 'board' ? (
                boardLoading ? (
                    <Typography color="text.secondary">{t('transactions.loading')}</Typography>
                ) : (
                    <DealBoard
                        columns={board.columns}
                        onMove={moveDeal}
                        cancelReason={cancelReason}
                        onCancelReason={setCancelReason}
                    />
                )
            ) : (
                <DataTable
                    fill
                    columns={tableColumns.filter((column) => column.locked || !hidden.has(column.key))}
                    rows={list.items}
                    loading={list.loading}
                    empty={closed ? t('transactions.empty_closed') : t('transactions.empty')}
                    page={list.page}
                    limit={list.limit}
                    total={list.total}
                    onPageChange={list.setPage}
                    onRowClick={(row) => navigate(`/admin/transactions/${row.id}/show`)}
                />
            )}
        </Box>
    );
}
