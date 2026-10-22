import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
    ComposedChart,
    Legend,
    Line,
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
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd', 'custom'];

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


function toneColor(tone, value) {
    const n = asNumber(value);
    if (tone === 'in') return 'success.main';
    if (tone === 'out') return 'text.primary';
    if (tone === 'net' || tone === 'closing') return n < 0 ? 'error.main' : 'success.main';
    return 'inherit';
}

function KpiCard({ label, value, tone, hint }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mt: 0.75, color: tone ? toneColor(tone, value) : 'inherit', wordBreak: 'break-word' }}
            >
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

function ChartTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;
    return (
        <Paper variant="outlined" sx={{ p: 1.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
            {payload.map((entry) => (
                <Typography key={entry.dataKey} variant="body2" sx={{ color: entry.color }}>
                    {entry.name}: {moneyLabel(entry.value, currency)}
                </Typography>
            ))}
        </Paper>
    );
}

export default function BranchWallets() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params, setParams] = useSearchParams();
    const [period, setPeriod] = useState(() => {
        if (params.get('from') || params.get('to')) return 'custom';
        return '30d';
    });
    const initialRange = periodRange(period === 'custom' ? '30d' : period) || { from: '', to: '' };
    const [from, setFrom] = useState(params.get('from') || initialRange.from);
    const [to, setTo] = useState(params.get('to') || initialRange.to);
    const [branch, setBranch] = useState(params.get('branch') || params.get('branch_id') || '');
    const [status, setStatus] = useState(params.get('status') || '');
    const [query, setQuery] = useState(params.get('q') || '');
    const [offices, setOffices] = useState([]);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [view, setView] = useState('workspace');

    const requestKey = JSON.stringify([from, to, branch]);
    const loading = loadedKey !== requestKey;

    useEffect(() => {
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => {});
        loadPdfCompany()
            .then((brand) => {
                if (!active) return;
                setCompany({
                    ...brand,
                    supplier_name: brand.supplier_name || DEFAULT_SUPPLIER_NAME,
                    address: brand.address || '',
                });
            })
            .catch(() => {
                if (active) setCompany({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
            })
            .finally(() => {
                if (active) setBrandReady(true);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const next = new URLSearchParams();
        if (from) next.set('from', from);
        if (to) next.set('to', to);
        if (branch) next.set('branch', branch);
        if (status) next.set('status', status);
        if (query) next.set('q', query);
        setParams(next, { replace: true });
    }, [from, to, branch, status, query, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (from) request.from = from;
        if (to) request.to = to;
        if (branch) request.branch_id = branch;
        fetch.get('operations/reports/branch-wallets', { params: request })
            .then((res) => {
                if (!active) return;
                setReport(res.data?.data || null);
                setError('');
                setLoadedKey(requestKey);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.response?.data?.error?.message || t('reports.load_error'));
                setReport(null);
                setLoadedKey(requestKey);
            });
        return () => { active = false; };
    }, [from, to, branch, requestKey, t]);

    const summary = report?.summary || {};
    const currency = summary.base_currency_code || report?.filters?.base_currency_code || '';
    const items = useMemo(() => report?.items || [], [report?.items]);

    const walletBalance = (row, code) => {
        const found = (row.wallets || []).find((wallet) => wallet.currency_code === code);
        return found?.closing ?? '0.0000';
    };

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return items.filter((row) => {
            if (status && row.status !== status) return false;
            if (!term) return true;
            const hay = [row.branch_name, row.branch_code, row.status].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(term);
        });
    }, [items, status, query]);

    const filteredTotals = useMemo(() => {
        let opening = 0;
        let inflow = 0;
        let outflow = 0;
        let closing = 0;
        for (const row of filtered) {
            opening += asNumber(row.opening);
            inflow += asNumber(row.inflow);
            outflow += asNumber(row.outflow);
            closing += asNumber(row.closing);
        }
        return { opening, inflow, outflow, closing, net: inflow - outflow };
    }, [filtered]);

    const chartRows = useMemo(() => filtered.map((row) => ({
        name: row.branch_code || row.branch_name,
        fullName: row.branch_name,
        inflow: asNumber(row.inflow),
        outflow: asNumber(row.outflow),
        closing: asNumber(row.closing),
        opening: asNumber(row.opening),
    })), [filtered]);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const officeName = offices.find((row) => String(row.id) === String(branch))?.name || '';
    const filterLines = [
        from ? `${t('operations.from')}: ${from}` : '',
        to ? `${t('operations.to')}: ${to}` : '',
        branch ? `${t('properties.branch')}: ${officeName || branch}` : '',
        currency ? `${t('finance.currency')}: ${currency}` : '',
    ].filter(Boolean);

    const summaryCards = [
        { label: t('reports.summary.branches'), value: String(filtered.length) },
        { label: t('reports.summary.opening'), value: moneyLabel(filteredTotals.opening, currency) },
        { label: t('reports.summary.inflow'), value: moneyLabel(filteredTotals.inflow, currency) },
        { label: t('reports.summary.outflow'), value: moneyLabel(filteredTotals.outflow, currency) },
        { label: t('reports.summary.closing'), value: moneyLabel(filteredTotals.closing, currency) },
    ];

    const tableColumns = [
        {
            key: 'branch_name',
            header: t('properties.branch'),
            locked: true,
            render: (row) => (
                <Stack spacing={0.25}>
                    <Typography fontWeight={600}>
                        {row.branch_name}
                        {row.is_main ? ` · ${t('reports.main_branch')}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{row.branch_code || '—'}</Typography>
                </Stack>
            ),
        },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            render: (row) => (
                <StatusChip
                    status={row.status}
                    label={t(`branches.statuses.${row.status}`, { defaultValue: row.status })}
                />
            ),
        },
        {
            key: 'opening',
            header: t('reports.opening'),
            render: (row) => moneyLabel(row.opening, currency),
        },
        {
            key: 'inflow',
            header: t('reports.inflow'),
            render: (row) => (
                <Typography component="span" sx={{ color: toneColor('in', row.inflow) }}>
                    {moneyLabel(row.inflow, currency)}
                </Typography>
            ),
        },
        {
            key: 'outflow',
            header: t('reports.outflow'),
            render: (row) => moneyLabel(row.outflow, currency),
        },
        {
            key: 'net',
            header: t('reports.net_movement'),
            render: (row) => {
                const net = asNumber(row.inflow) - asNumber(row.outflow);
                return (
                    <Typography component="span" fontWeight={700} sx={{ color: toneColor('net', net) }}>
                        {moneyLabel(net, currency)}
                    </Typography>
                );
            },
        },
        {
            key: 'closing',
            header: t('reports.closing'),
            render: (row) => (
                <Typography component="span" fontWeight={700} sx={{ color: toneColor('closing', row.closing) }}>
                    {moneyLabel(row.closing, currency)}
                </Typography>
            ),
        },
        {
            key: 'closing_iqd',
            header: t('reports.closing_iqd'),
            render: (row) => {
                const value = walletBalance(row, 'IQD');
                return (
                    <Typography component="span" fontWeight={700} sx={{ color: toneColor('closing', value) }}>
                        {moneyLabel(value, 'IQD')}
                    </Typography>
                );
            },
        },
        {
            key: 'closing_usd',
            header: t('reports.closing_usd'),
            render: (row) => {
                const value = walletBalance(row, 'USD');
                return (
                    <Typography component="span" fontWeight={700} sx={{ color: toneColor('closing', value) }}>
                        {moneyLabel(value, 'USD')}
                    </Typography>
                );
            },
        },
    ];

    const pdfColumns = [
        { key: 'branch_name', header: t('properties.branch'), width: '18%', render: (row) => row.branch_name || '—' },
        { key: 'branch_code', header: t('reports.code'), width: '8%', render: (row) => row.branch_code || '—' },
        { key: 'opening', header: t('reports.opening'), width: '12%', render: (row) => moneyLabel(row.opening, currency) },
        { key: 'inflow', header: t('reports.inflow'), width: '12%', render: (row) => moneyLabel(row.inflow, currency) },
        { key: 'outflow', header: t('reports.outflow'), width: '12%', render: (row) => moneyLabel(row.outflow, currency) },
        { key: 'closing', header: t('reports.closing'), width: '12%', render: (row) => moneyLabel(row.closing, currency) },
        { key: 'closing_iqd', header: t('reports.closing_iqd'), width: '13%', render: (row) => moneyLabel(walletBalance(row, 'IQD'), 'IQD') },
        { key: 'closing_usd', header: t('reports.closing_usd'), width: '13%', render: (row) => moneyLabel(walletBalance(row, 'USD'), 'USD') },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.branch_wallets_title')}
            company={footerCompany}
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
                title={t('reports.branch_wallets_title')}
                description={t('reports.branch_wallets_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/admin/branches/index" variant="outlined">
                            {t('branches.title', { defaultValue: t('properties.branch') })}
                        </Button>
                        <Button component={RouterLink} to="/admin/finance" variant="outlined">
                            {t('operations.view_ledger')}
                        </Button>
                        <Button onClick={() => navigate('/admin/reports')}>{t('reports.back_hub')}</Button>
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
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
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
                            label={t('properties.branch')}
                            value={branch}
                            onChange={(event) => setBranch(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            {offices.map((office) => (
                                <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label={t('workspace_ui.status')}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            <MenuItem value="active">{t('branches.statuses.active', { defaultValue: 'Active' })}</MenuItem>
                            <MenuItem value="inactive">{t('branches.statuses.inactive', { defaultValue: 'Inactive' })}</MenuItem>
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
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, minmax(0, 1fr))' },
                    gap: 1.5,
                    mb: 2,
                }}
            >
                <KpiCard
                    label={t('reports.summary.branches')}
                    value={loading ? '…' : String(filtered.length)}
                    hint={t('reports.branch_wallets_offices_hint')}
                />
                <KpiCard
                    label={t('reports.summary.opening')}
                    value={loading ? '…' : moneyLabel(filteredTotals.opening, currency)}
                    hint={!from ? t('reports.branch_wallets_opening_hint') : undefined}
                />
                <KpiCard
                    label={t('reports.summary.inflow')}
                    value={loading ? '…' : moneyLabel(filteredTotals.inflow, currency)}
                    tone="in"
                />
                <KpiCard
                    label={t('reports.summary.outflow')}
                    value={loading ? '…' : moneyLabel(filteredTotals.outflow, currency)}
                    tone="out"
                />
                <KpiCard
                    label={t('reports.summary.closing')}
                    value={loading ? '…' : moneyLabel(filteredTotals.closing, currency)}
                    tone="closing"
                    hint={t('reports.branch_wallets_net_hint', { net: moneyLabel(filteredTotals.net, currency) })}
                />
            </Box>

            {view === 'workspace' ? (
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box>
                                <Typography fontWeight={700}>{t('reports.branch_wallets_chart')}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('reports.branch_wallets_chart_hint')}
                                </Typography>
                            </Box>
                            {currency ? <Typography variant="caption" color="text.secondary">{currency}</Typography> : null}
                        </Stack>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : chartRows.length === 0 ? (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <Typography color="text.secondary">{t('reports.empty')}</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', height: { xs: 300, md: 360 } }} dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={chartRows.length > 6 ? -25 : 0} textAnchor={chartRows.length > 6 ? 'end' : 'middle'} height={chartRows.length > 6 ? 60 : 30} />
                                        <YAxis tick={{ fontSize: 12 }} width={72} />
                                        <Tooltip
                                            content={<ChartTooltip currency={currency} />}
                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || _}
                                        />
                                        <Legend />
                                        <Bar dataKey="inflow" name={t('reports.inflow')} fill="#0f766e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="outflow" name={t('reports.outflow')} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="closing" name={t('reports.closing')} stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Paper>

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.branch_wallets_detail')}</Typography>
                        <DataTable
                            columns={tableColumns}
                            rows={filtered}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={1}
                            limit={Math.max(filtered.length, 25)}
                            total={filtered.length}
                            onPageChange={() => {}}
                            rowKey="branch_id"
                            onRowClick={(row) => navigate(`/admin/branches/${row.branch_id}/show`)}
                        />
                    </Box>
                </Stack>
            ) : (
                <Paper variant="outlined" sx={{ p: { xs: 1, md: 1.5 } }}>
                    <PdfReportPreview
                        ready={brandReady && !loading && Boolean(report)}
                        loading={loading || !brandReady}
                        empty={false}
                        emptyLabel={t('reports.empty')}
                        document={pdfDoc}
                    />
                </Paper>
            )}
        </Box>
    );
}
