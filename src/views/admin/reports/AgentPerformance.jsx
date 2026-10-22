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
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import fetch from '@/utils/fetch';
import { moneyLabel } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import DataTable from '@/components/workspace/DataTable.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd', 'custom'];
const CHART_COLORS = {
    listings: '#94a3b8',
    deals: '#0369a1',
    completed: '#0f766e',
    commission: '#7c3aed',
    sale: '#1e3a5f',
    rent: '#b45309',
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

function ChartTooltip({ active, payload, label, moneyKeys = [] }) {
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
                    {entry.name}: {moneyKeys.includes(entry.dataKey) ? moneyLabel(entry.value) : entry.value}
                </Typography>
            ))}
        </Paper>
    );
}

export default function AgentPerformance() {
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
    const [branch, setBranch] = useState(params.get('branch') || '');
    const [query, setQuery] = useState(params.get('q') || '');
    const [sortBy, setSortBy] = useState(params.get('sort') || 'completed');
    const [page, setPage] = useState(1);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [view, setView] = useState('workspace');
    const limit = 25;

    const requestKey = JSON.stringify([from, to]);
    const loading = loadedKey !== requestKey;

    useEffect(() => {
        let active = true;
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
        if (query) next.set('q', query);
        if (sortBy && sortBy !== 'completed') next.set('sort', sortBy);
        setParams(next, { replace: true });
    }, [from, to, branch, query, sortBy, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (from) request.from = from;
        if (to) request.to = to;
        fetch.get('operations/reports/agent-performance', { params: request })
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
    }, [from, to, requestKey, t]);

    const items = report?.items || [];

    const branches = useMemo(() => {
        const set = new Set();
        for (const row of items) {
            if (row.branch_name) set.add(row.branch_name);
        }
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [items]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        const rows = items.filter((row) => {
            if (branch && row.branch_name !== branch) return false;
            if (!term) return true;
            const hay = [row.username, row.full_name, row.branch_name].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(term);
        });
        const sorter = {
            completed: (a, b) => asNumber(b.completed) - asNumber(a.completed),
            deals: (a, b) => asNumber(b.deals) - asNumber(a.deals),
            listings: (a, b) => asNumber(b.listings) - asNumber(a.listings),
            commission: (a, b) => asNumber(b.staff_commission) - asNumber(a.staff_commission),
            volume: (a, b) => (asNumber(b.sale_volume) + asNumber(b.rent_volume)) - (asNumber(a.sale_volume) + asNumber(a.rent_volume)),
            name: (a, b) => String(a.username || '').localeCompare(String(b.username || '')),
        };
        return [...rows].sort(sorter[sortBy] || sorter.completed);
    }, [items, branch, query, sortBy]);

    useEffect(() => {
        setPage(1);
    }, [from, to, branch, query, sortBy, requestKey]);

    const pageRows = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page]);

    const filteredTotals = useMemo(() => {
        let listings = 0;
        let deals = 0;
        let completed = 0;
        let sale = 0;
        let rent = 0;
        let commission = 0;
        let activities = 0;
        for (const row of filtered) {
            listings += asNumber(row.listings);
            deals += asNumber(row.deals);
            completed += asNumber(row.completed);
            sale += asNumber(row.sale_volume);
            rent += asNumber(row.rent_volume);
            commission += asNumber(row.staff_commission);
            activities += asNumber(row.activities);
        }
        const closeRate = deals > 0 ? Math.round((completed / deals) * 100) : 0;
        const top = filtered[0] || null;
        return {
            agents: filtered.length,
            listings,
            deals,
            completed,
            sale,
            rent,
            commission,
            activities,
            closeRate,
            top,
        };
    }, [filtered]);

    const activityRows = useMemo(() => filtered.slice(0, 10).map((row) => ({
        name: row.username,
        listings: asNumber(row.listings),
        deals: asNumber(row.deals),
        completed: asNumber(row.completed),
    })), [filtered]);

    const volumeRows = useMemo(() => filtered.slice(0, 10).map((row) => ({
        name: row.username,
        sale: asNumber(row.sale_volume),
        rent: asNumber(row.rent_volume),
        commission: asNumber(row.staff_commission),
    })), [filtered]);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = [
        from ? `${t('operations.from')}: ${from}` : '',
        to ? `${t('operations.to')}: ${to}` : '',
        branch ? `${t('properties.branch')}: ${branch}` : '',
    ].filter(Boolean);

    const summaryCards = [
        { label: t('reports.summary.agents'), value: String(filteredTotals.agents) },
        { label: t('reports.summary.listings'), value: String(filteredTotals.listings) },
        { label: t('reports.summary.deals'), value: String(filteredTotals.deals) },
        { label: t('reports.summary.completed'), value: String(filteredTotals.completed) },
    ];

    const tableColumns = [
        {
            key: 'username',
            header: t('reports.agent'),
            locked: true,
            render: (row) => (
                <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{row.username || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.branch_name || '—'}</Typography>
                </Stack>
            ),
        },
        {
            key: 'listings',
            header: t('reports.listings'),
            render: (row) => String(row.listings ?? 0),
        },
        {
            key: 'deals',
            header: t('reports.deals'),
            render: (row) => String(row.deals ?? 0),
        },
        {
            key: 'completed',
            header: t('reports.completed'),
            render: (row) => (
                <Typography component="span" fontWeight={700} color="success.main">
                    {row.completed ?? 0}
                </Typography>
            ),
        },
        {
            key: 'close_rate',
            header: t('reports.agent_performance_close_rate'),
            render: (row) => {
                const deals = asNumber(row.deals);
                if (!deals) return '—';
                return `${Math.round((asNumber(row.completed) / deals) * 100)}%`;
            },
        },
        {
            key: 'sale_volume',
            header: t('reports.sale_volume'),
            render: (row) => moneyLabel(row.sale_volume),
        },
        {
            key: 'rent_volume',
            header: t('reports.rent_volume'),
            render: (row) => moneyLabel(row.rent_volume),
        },
        {
            key: 'staff_commission',
            header: t('reports.staff_commission'),
            render: (row) => (
                <Typography component="span" fontWeight={700}>
                    {moneyLabel(row.staff_commission)}
                </Typography>
            ),
        },
        {
            key: 'activities',
            header: t('reports.activities'),
            render: (row) => String(row.activities ?? 0),
        },
    ];

    const pdfColumns = [
        { key: 'username', header: t('reports.agent'), width: '14%', render: (row) => row.username || '—' },
        { key: 'branch_name', header: t('properties.branch'), width: '12%', render: (row) => row.branch_name || '—' },
        { key: 'listings', header: t('reports.listings'), width: '9%', render: (row) => String(row.listings ?? 0) },
        { key: 'deals', header: t('reports.deals'), width: '9%', render: (row) => String(row.deals ?? 0) },
        { key: 'completed', header: t('reports.completed'), width: '10%', render: (row) => String(row.completed ?? 0) },
        { key: 'sale_volume', header: t('reports.sale_volume'), width: '14%', render: (row) => moneyLabel(row.sale_volume) },
        { key: 'rent_volume', header: t('reports.rent_volume'), width: '14%', render: (row) => moneyLabel(row.rent_volume) },
        { key: 'staff_commission', header: t('reports.staff_commission'), width: '18%', render: (row) => moneyLabel(row.staff_commission) },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.agent_performance_title')}
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
                title={t('reports.agent_performance_title')}
                description={t('reports.agent_performance_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/admin/transactions/index" variant="outlined">
                            {t('transactions.title')}
                        </Button>
                        <Button component={RouterLink} to="/admin/reports/commissions" variant="outlined">
                            {t('operations.commissions')}
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
                            {branches.map((name) => (
                                <MenuItem key={name} value={name}>{name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label={t('reports.agent_performance_sort')}
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                        >
                            <MenuItem value="completed">{t('reports.completed')}</MenuItem>
                            <MenuItem value="deals">{t('reports.deals')}</MenuItem>
                            <MenuItem value="listings">{t('reports.listings')}</MenuItem>
                            <MenuItem value="commission">{t('reports.staff_commission')}</MenuItem>
                            <MenuItem value="volume">{t('reports.agent_performance_volume')}</MenuItem>
                            <MenuItem value="name">{t('reports.agent')}</MenuItem>
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
                    label={t('reports.summary.agents')}
                    value={loading ? '…' : String(filteredTotals.agents)}
                    hint={filteredTotals.top
                        ? t('reports.agent_performance_top_hint', { name: filteredTotals.top.username })
                        : undefined}
                />
                <KpiCard
                    label={t('reports.summary.listings')}
                    value={loading ? '…' : String(filteredTotals.listings)}
                    hint={t('reports.agent_performance_listings_hint')}
                />
                <KpiCard
                    label={t('reports.summary.deals')}
                    value={loading ? '…' : String(filteredTotals.deals)}
                    hint={t('reports.agent_performance_close_hint', { rate: filteredTotals.closeRate })}
                />
                <KpiCard
                    label={t('reports.summary.completed')}
                    value={loading ? '…' : String(filteredTotals.completed)}
                    hint={t('reports.agent_performance_commission_hint', {
                        amount: moneyLabel(filteredTotals.commission),
                    })}
                />
            </Box>

            {view === 'workspace' ? (
                <Stack spacing={2}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                            gap: 2,
                        }}
                    >
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box>
                                    <Typography fontWeight={700}>{t('reports.agent_performance_pipeline')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.agent_performance_pipeline_hint')}
                                    </Typography>
                                </Box>
                            </Stack>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : activityRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: { xs: 280, md: 320 } }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={activityRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11 }}
                                                interval={0}
                                                angle={activityRows.length > 5 ? -20 : 0}
                                                textAnchor={activityRows.length > 5 ? 'end' : 'middle'}
                                                height={activityRows.length > 5 ? 56 : 30}
                                            />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend />
                                            <Bar dataKey="listings" name={t('reports.listings')} fill={CHART_COLORS.listings} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="deals" name={t('reports.deals')} fill={CHART_COLORS.deals} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="completed" name={t('reports.completed')} fill={CHART_COLORS.completed} radius={[4, 4, 0, 0]} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box>
                                    <Typography fontWeight={700}>{t('reports.agent_performance_money')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.agent_performance_money_hint')}
                                    </Typography>
                                </Box>
                            </Stack>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : volumeRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: { xs: 280, md: 320 } }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={volumeRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11 }}
                                                interval={0}
                                                angle={volumeRows.length > 5 ? -20 : 0}
                                                textAnchor={volumeRows.length > 5 ? 'end' : 'middle'}
                                                height={volumeRows.length > 5 ? 56 : 30}
                                            />
                                            <YAxis tick={{ fontSize: 12 }} width={64} />
                                            <Tooltip content={<ChartTooltip moneyKeys={['sale', 'rent', 'commission']} />} />
                                            <Legend />
                                            <Bar dataKey="sale" name={t('reports.sale_volume')} fill={CHART_COLORS.sale} stackId="v" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="rent" name={t('reports.rent_volume')} fill={CHART_COLORS.rent} stackId="v" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="commission" name={t('reports.staff_commission')} fill={CHART_COLORS.commission} radius={[4, 4, 0, 0]} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>
                    </Box>

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.agent_performance_detail')}</Typography>
                        <DataTable
                            columns={tableColumns}
                            rows={pageRows}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={page}
                            limit={limit}
                            total={filtered.length}
                            onPageChange={setPage}
                            rowKey="user_id"
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
