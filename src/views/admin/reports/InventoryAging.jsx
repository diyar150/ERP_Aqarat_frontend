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
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const AS_OF_PRESETS = ['today', 'yesterday', 'month_start', 'month_end', 'custom'];
const BUCKETS = ['0-30', '31-60', '61-90', '90+'];
const STATUSES = ['available', 'reserved', 'under_contract', 'sold', 'rented'];
const BUCKET_COLORS = {
    '0-30': '#0f766e',
    '31-60': '#0369a1',
    '61-90': '#b45309',
    '90+': '#be123c',
};
const STATUS_COLORS = {
    available: '#0f766e',
    reserved: '#0369a1',
    under_contract: '#7c3aed',
    sold: '#1e3a5f',
    rented: '#b45309',
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

function asOfForPreset(preset) {
    const today = baghdadToday();
    if (preset === 'today') return today;
    if (preset === 'yesterday') return shiftDays(today, -1);
    if (preset === 'month_start') return `${today.slice(0, 8)}01`;
    if (preset === 'month_end') {
        const [y, m] = today.split('-').map(Number);
        const last = new Date(Date.UTC(y, m, 0));
        return last.toISOString().slice(0, 10);
    }
    return today;
}

function asNumber(value) {
    const n = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}


function bucketLabel(bucket, t) {
    const map = {
        '0-30': t('reports.summary.bucket_0_30'),
        '31-60': t('reports.summary.bucket_31_60'),
        '61-90': t('reports.summary.bucket_61_90'),
        '90+': t('reports.summary.bucket_90_plus'),
    };
    return map[bucket] || bucket;
}

function KpiCard({ label, value, hint, accent }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0, borderTop: accent ? `3px solid ${accent}` : undefined }}>
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

function ChartTooltip({ active, payload, label }) {
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
                    {entry.name}: {entry.value}
                </Typography>
            ))}
        </Paper>
    );
}

export default function InventoryAging() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params, setParams] = useSearchParams();
    const [asOfPreset, setAsOfPreset] = useState(() => (params.get('as_of') ? 'custom' : 'today'));
    const [asOf, setAsOf] = useState(params.get('as_of') || asOfForPreset('today'));
    const [branch, setBranch] = useState(params.get('branch') || params.get('branch_id') || '');
    const [bucket, setBucket] = useState(params.get('bucket') || '');
    const [status, setStatus] = useState(params.get('status') || '');
    const [purpose, setPurpose] = useState(params.get('purpose') || '');
    const [query, setQuery] = useState(params.get('q') || '');
    const [page, setPage] = useState(1);
    const [offices, setOffices] = useState([]);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [view, setView] = useState('workspace');
    const limit = 25;

    const requestKey = JSON.stringify([asOf, branch]);
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
        if (asOf) next.set('as_of', asOf);
        if (branch) next.set('branch', branch);
        if (bucket) next.set('bucket', bucket);
        if (status) next.set('status', status);
        if (purpose) next.set('purpose', purpose);
        if (query) next.set('q', query);
        setParams(next, { replace: true });
    }, [asOf, branch, bucket, status, purpose, query, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (asOf) request.as_of = asOf;
        if (branch) request.branch_id = branch;
        fetch.get('operations/reports/inventory-aging', { params: request })
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
    }, [asOf, branch, requestKey, t]);

    const items = report?.items || [];

    const purposes = useMemo(() => {
        const set = new Set();
        for (const row of items) {
            if (row.purpose) set.add(row.purpose);
        }
        return [...set].sort();
    }, [items]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return items.filter((row) => {
            if (bucket && row.bucket !== bucket) return false;
            if (status && row.status !== status) return false;
            if (purpose && row.purpose !== purpose) return false;
            if (!term) return true;
            const hay = [
                row.reference_number,
                row.title,
                row.status,
                row.purpose,
                row.agent_name,
                row.branch_name,
                row.bucket,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(term);
        });
    }, [items, bucket, status, purpose, query]);

    useEffect(() => {
        setPage(1);
    }, [asOf, branch, bucket, status, purpose, query, requestKey]);

    const pageRows = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page]);

    const filteredTotals = useMemo(() => {
        const counts = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
        const byStatus = new Map();
        let daysSum = 0;
        let active = 0;
        let closed = 0;
        for (const row of filtered) {
            counts[row.bucket] = (counts[row.bucket] || 0) + 1;
            byStatus.set(row.status, (byStatus.get(row.status) || 0) + 1);
            daysSum += asNumber(row.days_on_market);
            if (['sold', 'rented'].includes(row.status)) closed += 1;
            else active += 1;
        }
        return {
            properties: filtered.length,
            counts,
            byStatus,
            avgDays: filtered.length ? Math.round(daysSum / filtered.length) : 0,
            active,
            closed,
            stale: counts['90+'] || 0,
        };
    }, [filtered]);

    const bucketRows = useMemo(() => BUCKETS.map((key) => ({
        key,
        name: bucketLabel(key, t),
        value: filteredTotals.counts[key] || 0,
        color: BUCKET_COLORS[key],
    })), [filteredTotals.counts, t]);

    const statusRows = useMemo(() => (
        [...filteredTotals.byStatus.entries()]
            .map(([key, value]) => ({
                key,
                name: t(`properties.statuses.${key}`, { defaultValue: key }),
                value,
                color: STATUS_COLORS[key] || '#94a3b8',
            }))
            .sort((a, b) => b.value - a.value)
    ), [filteredTotals.byStatus, t]);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const officeName = offices.find((row) => String(row.id) === String(branch))?.name || '';
    const filterLines = [
        asOf ? `${t('reports.as_of')}: ${asOf}` : '',
        branch ? `${t('properties.branch')}: ${officeName || branch}` : '',
        bucket ? `${t('reports.bucket')}: ${bucketLabel(bucket, t)}` : '',
        status ? `${t('workspace_ui.status')}: ${t(`properties.statuses.${status}`, { defaultValue: status })}` : '',
        purpose ? `${t('properties.purpose')}: ${t(`properties.purposes.${purpose}`, { defaultValue: purpose })}` : '',
    ].filter(Boolean);

    const summaryCards = [
        { label: t('reports.summary.properties'), value: String(filteredTotals.properties) },
        { label: t('reports.summary.bucket_0_30'), value: String(filteredTotals.counts['0-30'] || 0) },
        { label: t('reports.summary.bucket_31_60'), value: String(filteredTotals.counts['31-60'] || 0) },
        { label: t('reports.summary.bucket_61_90'), value: String(filteredTotals.counts['61-90'] || 0) },
        { label: t('reports.summary.bucket_90_plus'), value: String(filteredTotals.counts['90+'] || 0) },
    ];

    const tableColumns = [
        {
            key: 'reference_number',
            header: t('properties.reference'),
            locked: true,
            render: (row) => (
                <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{row.reference_number || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                        {row.title || '—'}
                    </Typography>
                </Stack>
            ),
        },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            render: (row) => (
                <StatusChip
                    status={row.status}
                    label={t(`properties.statuses.${row.status}`, { defaultValue: row.status })}
                />
            ),
        },
        {
            key: 'purpose',
            header: t('properties.purpose'),
            render: (row) => t(`properties.purposes.${row.purpose}`, { defaultValue: row.purpose || '—' }),
        },
        {
            key: 'listed_on',
            header: t('reports.listed_on'),
            render: (row) => row.listed_on || '—',
        },
        {
            key: 'days_on_market',
            header: t('reports.days_on_market'),
            render: (row) => (
                <Typography component="span" fontWeight={700}>
                    {row.days_on_market ?? 0}
                </Typography>
            ),
        },
        {
            key: 'bucket',
            header: t('reports.bucket'),
            render: (row) => (
                <StatusChip
                    status={row.bucket === '90+' ? 'void' : row.bucket === '0-30' ? 'posted' : 'draft'}
                    label={bucketLabel(row.bucket, t)}
                />
            ),
        },
        {
            key: 'price',
            header: t('reports.amount'),
            render: (row) => moneyLabel(row.price, row.currency_code),
        },
        {
            key: 'agent_name',
            header: t('reports.agent'),
            render: (row) => row.agent_name || '—',
        },
        {
            key: 'branch_name',
            header: t('properties.branch'),
            render: (row) => row.branch_name || '—',
        },
    ];

    const pdfColumns = [
        { key: 'reference_number', header: t('properties.reference'), width: '12%', render: (row) => row.reference_number || '—' },
        { key: 'title', header: t('properties.name'), width: '18%', render: (row) => row.title || '—' },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            width: '12%',
            render: (row) => t(`properties.statuses.${row.status}`, { defaultValue: row.status }),
        },
        { key: 'listed_on', header: t('reports.listed_on'), width: '12%', render: (row) => row.listed_on || '—' },
        { key: 'days_on_market', header: t('reports.days_on_market'), width: '10%', render: (row) => String(row.days_on_market ?? 0) },
        { key: 'bucket', header: t('reports.bucket'), width: '10%', render: (row) => row.bucket || '—' },
        { key: 'agent_name', header: t('reports.agent'), width: '13%', render: (row) => row.agent_name || '—' },
        { key: 'branch_name', header: t('properties.branch'), width: '13%', render: (row) => row.branch_name || '—' },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.inventory_aging_title')}
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

    const applyAsOfPreset = (next) => {
        setAsOfPreset(next);
        if (next === 'custom') return;
        setAsOf(asOfForPreset(next));
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('reports.inventory_aging_title')}
                description={t('reports.inventory_aging_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/admin/properties/index" variant="outlined">
                            {t('properties.title')}
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
                            value={asOfPreset}
                            onChange={(_, value) => { if (value) applyAsOfPreset(value); }}
                            sx={{ flexWrap: 'wrap' }}
                        >
                            {AS_OF_PRESETS.map((key) => (
                                <ToggleButton key={key} value={key}>
                                    {t(`reports.as_of_presets.${key}`)}
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
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
                            gap: 1.5,
                        }}
                    >
                        <TextField
                            type="date"
                            size="small"
                            label={t('reports.as_of')}
                            value={asOf}
                            onChange={(event) => {
                                setAsOfPreset('custom');
                                setAsOf(event.target.value);
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
                            label={t('reports.bucket')}
                            value={bucket}
                            onChange={(event) => setBucket(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            {BUCKETS.map((key) => (
                                <MenuItem key={key} value={key}>{bucketLabel(key, t)}</MenuItem>
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
                            {STATUSES.map((key) => (
                                <MenuItem key={key} value={key}>
                                    {t(`properties.statuses.${key}`, { defaultValue: key })}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label={t('properties.purpose')}
                            value={purpose}
                            onChange={(event) => setPurpose(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            {purposes.map((key) => (
                                <MenuItem key={key} value={key}>
                                    {t(`properties.purposes.${key}`, { defaultValue: key })}
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
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, minmax(0, 1fr))' },
                    gap: 1.5,
                    mb: 2,
                }}
            >
                <KpiCard
                    label={t('reports.summary.properties')}
                    value={loading ? '…' : String(filteredTotals.properties)}
                    hint={t('reports.inventory_aging_active_hint', {
                        active: filteredTotals.active,
                        closed: filteredTotals.closed,
                    })}
                />
                <KpiCard
                    label={t('reports.summary.bucket_0_30')}
                    value={loading ? '…' : String(filteredTotals.counts['0-30'] || 0)}
                    accent={BUCKET_COLORS['0-30']}
                />
                <KpiCard
                    label={t('reports.summary.bucket_31_60')}
                    value={loading ? '…' : String(filteredTotals.counts['31-60'] || 0)}
                    accent={BUCKET_COLORS['31-60']}
                />
                <KpiCard
                    label={t('reports.summary.bucket_61_90')}
                    value={loading ? '…' : String(filteredTotals.counts['61-90'] || 0)}
                    accent={BUCKET_COLORS['61-90']}
                />
                <KpiCard
                    label={t('reports.summary.bucket_90_plus')}
                    value={loading ? '…' : String(filteredTotals.counts['90+'] || 0)}
                    accent={BUCKET_COLORS['90+']}
                    hint={t('reports.inventory_aging_avg_hint', { days: filteredTotals.avgDays })}
                />
            </Box>

            {view === 'workspace' ? (
                <Stack spacing={2}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(260px, 0.8fr)' },
                            gap: 2,
                        }}
                    >
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box>
                                    <Typography fontWeight={700}>{t('reports.inventory_aging_buckets')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.inventory_aging_buckets_hint')}
                                    </Typography>
                                </Box>
                            </Stack>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : bucketRows.every((row) => row.value === 0) ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: { xs: 280, md: 320 } }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={bucketRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={48} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="value" name={t('reports.count')} radius={[4, 4, 0, 0]}>
                                                {bucketRows.map((row) => (
                                                    <Cell key={row.key} fill={row.color} />
                                                ))}
                                            </Bar>
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.inventory_aging_status')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.inventory_aging_status_hint')}
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : statusRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: 260 }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusRows}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={58}
                                                outerRadius={88}
                                                paddingAngle={2}
                                            >
                                                {statusRows.map((row) => (
                                                    <Cell key={row.key} fill={row.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>
                    </Box>

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.inventory_aging_detail')}</Typography>
                        <DataTable
                            columns={tableColumns}
                            rows={pageRows}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={page}
                            limit={limit}
                            total={filtered.length}
                            onPageChange={setPage}
                            rowKey="id"
                            onRowClick={(row) => navigate(`/admin/properties/${row.id}/show`)}
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
