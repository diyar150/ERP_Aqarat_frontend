import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    MenuItem,
    Paper,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import {
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import fetch from '@/utils/fetch';
import { moneyLabel } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd', 'custom'];
const SUB_COLORS = {
    trialing: '#0369a1',
    active: '#0f766e',
    grace: '#b45309',
    expired: '#be123c',
    cancelled: '#64748b',
};
const INV_COLORS = {
    draft: '#94a3b8',
    issued: '#0369a1',
    paid: '#0f766e',
    void: '#64748b',
};
const AGENCY_COLORS = {
    active: '#0f766e',
    suspended: '#b45309',
    archived: '#64748b',
};

function baghdadToday() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function shiftDays(isoDate, days) {
    const date = new Date(`${isoDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function periodRange(period) {
    const to = baghdadToday();
    if (period === 'all') return { from: '', to: '' };
    if (period === '7d') return { from: shiftDays(to, -6), to };
    if (period === '30d') return { from: shiftDays(to, -29), to };
    if (period === 'mtd') return { from: `${to.slice(0, 8)}01`, to };
    if (period === 'ytd') return { from: `${to.slice(0, 4)}-01-01`, to };
    return null;
}

function asNumber(value) {
    const n = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}


function KpiCard({ label, value, hint }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.75, wordBreak: 'break-word' }}>
                {value}
            </Typography>
            {hint ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {hint}
                </Typography>
            ) : null}
        </Paper>
    );
}

function ChartTooltip({ active, payload, label, moneyMode }) {
    if (!active || !payload?.length) return null;
    return (
        <Paper variant="outlined" sx={{ p: 1.25 }}>
            {label ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {label}
                </Typography>
            ) : null}
            {payload.map((entry) => (
                <Typography key={entry.dataKey || entry.name} variant="body2" sx={{ color: entry.color }}>
                    {entry.name}: {moneyMode ? moneyLabel(entry.value) : entry.value}
                </Typography>
            ))}
        </Paper>
    );
}

export default function PlatformSaasReports() {
    const { t } = useTranslation();
    const isRTL = useIsRTL();
    const [params, setParams] = useSearchParams();
    const [period, setPeriod] = useState(() => {
        if (params.get('from') || params.get('to')) return 'custom';
        return '30d';
    });
    const initialRange = periodRange(period === 'custom' ? '30d' : period) || { from: '', to: '' };
    const [from, setFrom] = useState(params.get('from') || initialRange.from);
    const [to, setTo] = useState(params.get('to') || initialRange.to);
    const [status, setStatus] = useState(params.get('status') || '');
    const [query, setQuery] = useState(params.get('q') || '');
    const [page, setPage] = useState(1);
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [view, setView] = useState('workspace');
    const limit = 25;

    const requestKey = JSON.stringify([from, to]);
    const loading = loadedKey !== requestKey;

    useEffect(() => {
        const next = new URLSearchParams();
        if (from) next.set('from', from);
        if (to) next.set('to', to);
        if (status) next.set('status', status);
        if (query) next.set('q', query);
        setParams(next, { replace: true });
    }, [from, to, status, query, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (from) request.from = from;
        if (to) request.to = to;
        fetch.get('platform/reports/saas', { params: request })
            .then((res) => {
                if (!active) return;
                setReport(res.data?.data || null);
                setError('');
                setLoadedKey(requestKey);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.response?.data?.error?.message || t('platform.load_error'));
                setReport(null);
                setLoadedKey(requestKey);
            });
        return () => { active = false; };
    }, [from, to, requestKey, t]);

    const summary = report?.summary || {};
    const items = report?.items || [];

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return items
            .filter((row) => {
                if (status && row.status !== status) return false;
                if (!term) return true;
                const hay = [row.number, row.agency_id, row.status, row.currency_code]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return hay.includes(term);
            })
            .map((row, index) => ({ ...row, row_key: `${row.number || 'inv'}|${row.agency_id}|${index}` }));
    }, [items, status, query]);

    useEffect(() => {
        setPage(1);
    }, [from, to, status, query, requestKey]);

    const pageRows = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page]);

    const filteredInvoiceTotals = useMemo(() => {
        let collected = 0;
        let open = 0;
        const byStatus = { draft: 0, issued: 0, paid: 0, void: 0 };
        for (const row of filtered) {
            byStatus[row.status] = (byStatus[row.status] || 0) + 1;
            if (row.status === 'paid') collected += asNumber(row.amount);
            if (row.status === 'issued') open += asNumber(row.amount);
        }
        return { collected, open, byStatus, count: filtered.length };
    }, [filtered]);

    const subRows = useMemo(() => ([
        { key: 'trialing', name: t('platform.subscription_statuses.trialing'), value: asNumber(summary.subs_trialing) },
        { key: 'active', name: t('platform.subscription_statuses.active'), value: asNumber(summary.subs_active) },
        { key: 'grace', name: t('platform.subscription_statuses.grace'), value: asNumber(summary.subs_grace) },
        { key: 'expired', name: t('platform.subscription_statuses.expired'), value: asNumber(summary.subs_expired) },
        { key: 'cancelled', name: t('platform.subscription_statuses.cancelled'), value: asNumber(summary.subs_cancelled) },
    ]).filter((row) => row.value > 0), [summary, t]);

    const agencyRows = useMemo(() => ([
        { key: 'active', name: t('platform.agency_statuses.active'), value: asNumber(summary.agencies_active) },
        { key: 'suspended', name: t('platform.agency_statuses.suspended'), value: asNumber(summary.agencies_suspended) },
        { key: 'archived', name: t('reports.saas.agencies_archived'), value: asNumber(summary.agencies_archived) },
    ]), [summary, t]);

    const invoiceStatusRows = useMemo(() => (
        ['draft', 'issued', 'paid', 'void'].map((key) => ({
            key,
            name: t(`platform.invoice_statuses.${key}`),
            value: filteredInvoiceTotals.byStatus[key] || 0,
        }))
    ), [filteredInvoiceTotals.byStatus, t]);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = [
        from ? `${t('operations.from')}: ${from}` : '',
        to ? `${t('operations.to')}: ${to}` : '',
        status ? `${t('workspace_ui.status')}: ${t(`platform.invoice_statuses.${status}`, { defaultValue: status })}` : '',
        t('reports.saas.snapshot_note'),
    ].filter(Boolean);

    const summaryCards = [
        { label: t('reports.saas.agencies_active'), value: String(asNumber(summary.agencies_active)) },
        { label: t('reports.saas.mrr'), value: moneyLabel(summary.mrr) },
        { label: t('reports.saas.arr'), value: moneyLabel(summary.arr) },
        { label: t('reports.saas.subs_active'), value: String(asNumber(summary.subs_active)) },
        { label: t('reports.saas.subs_trialing'), value: String(asNumber(summary.subs_trialing)) },
        { label: t('reports.saas.trials_ending'), value: String(asNumber(summary.trials_ending_14d)) },
        { label: t('reports.saas.revenue_collected'), value: moneyLabel(filteredInvoiceTotals.collected) },
        { label: t('reports.saas.invoices_issued'), value: String(filteredInvoiceTotals.byStatus.issued || 0) },
    ];

    const tableColumns = [
        {
            key: 'number',
            header: t('platform.invoice_number'),
            locked: true,
            render: (row) => <Typography fontWeight={700}>{row.number || '—'}</Typography>,
        },
        {
            key: 'agency_id',
            header: t('platform.agency_name'),
            render: (row) => (
                <Button
                    component={RouterLink}
                    to={`/platform/agencies/${row.agency_id}`}
                    size="small"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    #{row.agency_id}
                </Button>
            ),
        },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            render: (row) => (
                <StatusChip
                    status={row.status}
                    label={t(`platform.invoice_statuses.${row.status}`, { defaultValue: row.status })}
                />
            ),
        },
        {
            key: 'amount',
            header: t('reports.amount'),
            render: (row) => moneyLabel(row.amount, row.currency_code),
        },
        {
            key: 'due_on',
            header: t('platform.invoice_due_on'),
            render: (row) => row.due_on || '—',
        },
        {
            key: 'issued_at',
            header: t('reports.saas.issued_at'),
            render: (row) => (row.issued_at ? String(row.issued_at).slice(0, 10) : '—'),
        },
        {
            key: 'paid_at',
            header: t('reports.saas.paid_at'),
            render: (row) => (row.paid_at ? String(row.paid_at).slice(0, 10) : '—'),
        },
    ];

    const pdfColumns = [
        { key: 'number', header: t('platform.invoice_number'), width: '16%', render: (row) => row.number || '—' },
        { key: 'agency_id', header: t('platform.agency_name'), width: '12%', render: (row) => String(row.agency_id) },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            width: '12%',
            render: (row) => t(`platform.invoice_statuses.${row.status}`, { defaultValue: row.status }),
        },
        { key: 'amount', header: t('reports.amount'), width: '16%', render: (row) => moneyLabel(row.amount, row.currency_code) },
        { key: 'due_on', header: t('platform.invoice_due_on'), width: '14%', render: (row) => row.due_on || '—' },
        {
            key: 'issued_at',
            header: t('reports.saas.issued_at'),
            width: '15%',
            render: (row) => (row.issued_at ? String(row.issued_at).slice(0, 10) : '—'),
        },
        {
            key: 'paid_at',
            header: t('reports.saas.paid_at'),
            width: '15%',
            render: (row) => (row.paid_at ? String(row.paid_at).slice(0, 10) : '—'),
        },
    ];

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.saas.title')}
            company={{ supplier_name: 'Platform', address: '' }}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('workspace.address', { defaultValue: 'Address' })}
            isRTL={isRTL}
            summary={summaryCards}
        >
            <PdfTable columns={pdfColumns} rows={filtered} isRTL={isRTL} emptyLabel={t('reports.empty')} />
        </PdfReportShell>
    );

    const applyPeriod = (next) => {
        setPeriod(next);
        if (next === 'custom') return;
        const range = periodRange(next);
        if (!range) return;
        setFrom(range.from);
        setTo(range.to);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('reports.saas.title')}
                description={t('reports.saas.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/platform/agencies" variant="outlined">
                            {t('platform.nav.agencies', { defaultValue: t('platform.agency_name') })}
                        </Button>
                        <Button component={RouterLink} to="/platform/plans" variant="outlined">
                            {t('platform.nav.plans')}
                        </Button>
                    </Stack>
                )}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={period}
                            onChange={(_, value) => { if (value) applyPeriod(value); }}
                            sx={{ flexWrap: 'wrap' }}
                        >
                            {PERIODS.map((key) => (
                                <ToggleButton key={key} value={key}>
                                    {t(`reports.periods.${key}`)}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={view}
                            onChange={(_, value) => { if (value) setView(value); }}
                        >
                            <ToggleButton value="workspace">{t('reports.view_workspace')}</ToggleButton>
                            <ToggleButton value="pdf">{t('reports.view_pdf')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                            gap: 1.5,
                        }}
                    >
                        <TextField
                            type="date"
                            size="small"
                            label={t('operations.from')}
                            value={from}
                            onChange={(event) => {
                                setPeriod('custom');
                                setFrom(event.target.value);
                            }}
                            slotProps={{ inputLabel: { shrink: true } }}
                            helperText={t('reports.saas.period_hint')}
                        />
                        <TextField
                            type="date"
                            size="small"
                            label={t('operations.to')}
                            value={to}
                            onChange={(event) => {
                                setPeriod('custom');
                                setTo(event.target.value);
                            }}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            select
                            size="small"
                            label={t('workspace_ui.status')}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            {['draft', 'issued', 'paid', 'void'].map((key) => (
                                <MenuItem key={key} value={key}>
                                    {t(`platform.invoice_statuses.${key}`)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            size="small"
                            label={t('workspace_ui.search')}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </Box>
                </Stack>
            </Paper>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' },
                    gap: 1.5,
                    mb: 2,
                }}
            >
                <KpiCard
                    label={t('reports.saas.agencies_active')}
                    value={loading ? '…' : String(asNumber(summary.agencies_active))}
                    hint={t('reports.saas.agencies_hint', {
                        total: asNumber(summary.agencies_total),
                        suspended: asNumber(summary.agencies_suspended),
                    })}
                />
                <KpiCard
                    label={t('reports.saas.mrr')}
                    value={loading ? '…' : moneyLabel(summary.mrr)}
                    hint={t('reports.saas.arr_hint', { arr: moneyLabel(summary.arr) })}
                />
                <KpiCard
                    label={t('reports.saas.subs_active')}
                    value={loading ? '…' : String(asNumber(summary.subs_active))}
                    hint={t('reports.saas.subs_hint', {
                        trialing: asNumber(summary.subs_trialing),
                        grace: asNumber(summary.subs_grace),
                    })}
                />
                <KpiCard
                    label={t('reports.saas.revenue_collected')}
                    value={loading ? '…' : moneyLabel(filteredInvoiceTotals.collected)}
                    hint={t('reports.saas.revenue_hint', {
                        open: moneyLabel(filteredInvoiceTotals.open),
                        trials: asNumber(summary.trials_ending_14d),
                    })}
                />
            </Box>

            {view === 'workspace' ? (
                <Stack spacing={2}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
                            gap: 2,
                        }}
                    >
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.saas.subs_chart')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.saas.subs_chart_hint')}
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : subRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: 260 }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={subRows}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={54}
                                                outerRadius={84}
                                                paddingAngle={2}
                                            >
                                                {subRows.map((row) => (
                                                    <Cell key={row.key} fill={SUB_COLORS[row.key] || '#94a3b8'} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.saas.agencies_chart')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.saas.agencies_chart_hint')}
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: 260 }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={agencyRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="value" name={t('reports.count')} radius={[4, 4, 0, 0]}>
                                                {agencyRows.map((row) => (
                                                    <Cell key={row.key} fill={AGENCY_COLORS[row.key] || '#94a3b8'} />
                                                ))}
                                            </Bar>
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.saas.invoices_chart')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.saas.invoices_chart_hint')}
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : invoiceStatusRows.every((row) => row.value === 0) ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: 260 }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={invoiceStatusRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="value" name={t('reports.count')} radius={[4, 4, 0, 0]}>
                                                {invoiceStatusRows.map((row) => (
                                                    <Cell key={row.key} fill={INV_COLORS[row.key] || '#94a3b8'} />
                                                ))}
                                            </Bar>
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>
                    </Box>

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.saas.invoices_detail')}</Typography>
                        <DataTable
                            columns={tableColumns}
                            rows={pageRows}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={page}
                            limit={limit}
                            total={filtered.length}
                            onPageChange={setPage}
                            rowKey="row_key"
                        />
                    </Box>
                </Stack>
            ) : (
                <Paper variant="outlined" sx={{ p: { xs: 1, md: 1.5 } }}>
                    <PdfReportPreview
                        ready={!loading && Boolean(report)}
                        loading={loading}
                        empty={false}
                        emptyLabel={t('reports.empty')}
                        document={pdfDoc}
                    />
                </Paper>
            )}
        </Box>
    );
}
