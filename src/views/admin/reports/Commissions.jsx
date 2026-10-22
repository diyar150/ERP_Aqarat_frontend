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

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd', 'custom'];
const SPLIT_COLORS = { agency: '#0f766e', staff: '#1e3a5f' };

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

function ChartTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;
    return (
        <Paper variant="outlined" sx={{ p: 1.25 }}>
            {label ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
            ) : null}
            {payload.map((entry) => (
                <Typography key={entry.dataKey || entry.name} variant="body2" sx={{ color: entry.color || entry.payload?.fill }}>
                    {entry.name}: {moneyLabel(entry.value, currency)}
                </Typography>
            ))}
        </Paper>
    );
}

export default function Commissions() {
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
    const [kind, setKind] = useState(params.get('kind') || '');
    const [posted, setPosted] = useState(params.get('posted') || '');
    const [dealType, setDealType] = useState(params.get('type') || '');
    const [query, setQuery] = useState(params.get('q') || '');
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [view, setView] = useState('workspace');
    const [page, setPage] = useState(1);
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
        if (kind) next.set('kind', kind);
        if (posted) next.set('posted', posted);
        if (dealType) next.set('type', dealType);
        if (query) next.set('q', query);
        setParams(next, { replace: true });
    }, [from, to, kind, posted, dealType, query, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (from) request.from = from;
        if (to) request.to = to;
        fetch.get('operations/reports/commissions', { params: request })
            .then((res) => {
                if (!active) return;
                setReport(res.data?.data || null);
                setError('');
                setLoadedKey(requestKey);
                setPage(1);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.response?.data?.error?.message || t('reports.load_error'));
                setReport(null);
                setLoadedKey(requestKey);
            });
        return () => { active = false; };
    }, [from, to, requestKey, t]);

    const summary = report?.summary || {};
    const currency = summary.base_currency_code || report?.filters?.base_currency_code || '';
    const items = report?.items || [];

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return items.filter((row) => {
            if (kind && row.beneficiary_kind !== kind) return false;
            if (posted === 'yes' && !row.posted) return false;
            if (posted === 'no' && row.posted) return false;
            if (dealType && row.transaction_type !== dealType) return false;
            if (!term) return true;
            const hay = [
                row.commission_id,
                row.beneficiary_kind,
                row.staff_name,
                row.property_reference,
                row.transaction_id,
                row.deal_status,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(term);
        });
    }, [items, kind, posted, dealType, query]);

    const pageRows = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page]);

    const filteredTotals = useMemo(() => {
        let agency = 0;
        let staff = 0;
        let postedBase = 0;
        let postedCount = 0;
        for (const row of filtered) {
            const amount = asNumber(row.amount);
            if (row.beneficiary_kind === 'staff') staff += amount;
            else agency += amount;
            if (row.posted) {
                postedCount += 1;
                postedBase += asNumber(row.base_amount || row.amount);
            }
        }
        return {
            agency,
            staff,
            postedBase,
            postedCount,
            pendingCount: filtered.length - postedCount,
        };
    }, [filtered]);

    const splitRows = useMemo(() => ([
        { key: 'agency', name: t('reports.beneficiary_agency'), value: filteredTotals.agency },
        { key: 'staff', name: t('reports.beneficiary_staff'), value: filteredTotals.staff },
    ]).filter((row) => row.value > 0), [filteredTotals.agency, filteredTotals.staff, t]);

    const trendRows = useMemo(() => {
        const buckets = new Map();
        for (const row of filtered) {
            const periodKey = (row.occurred_on || '').slice(0, 7) || t('reports.unposted_period');
            const current = buckets.get(periodKey) || { period: periodKey, agency: 0, staff: 0, posted: 0 };
            if (row.beneficiary_kind === 'staff') current.staff += asNumber(row.amount);
            else current.agency += asNumber(row.amount);
            if (row.posted) current.posted += asNumber(row.base_amount || row.amount);
            buckets.set(periodKey, current);
        }
        return [...buckets.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
    }, [filtered, t]);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = [
        from ? `${t('operations.from')}: ${from}` : '',
        to ? `${t('operations.to')}: ${to}` : '',
        kind ? `${t('reports.beneficiary')}: ${t(`reports.beneficiary_${kind}`)}` : '',
        dealType ? `${t('transactions.type')}: ${t(`transactions.types.${dealType}`)}` : '',
        currency ? `${t('finance.currency')}: ${currency}` : '',
    ].filter(Boolean);

    const summaryCards = [
        { label: t('reports.summary.lines'), value: String(filtered.length) },
        { label: t('reports.summary.posted_base'), value: moneyLabel(filteredTotals.postedBase, currency) },
        { label: t('reports.summary.agency_amount'), value: moneyLabel(filteredTotals.agency, currency) },
        { label: t('reports.summary.staff_amount'), value: moneyLabel(filteredTotals.staff, currency) },
    ];

    const tableColumns = [
        {
            key: 'commission_id',
            header: t('reports.id'),
            locked: true,
            render: (row) => `#${row.commission_id}`,
        },
        {
            key: 'beneficiary_kind',
            header: t('reports.beneficiary'),
            render: (row) => t(`reports.beneficiary_${row.beneficiary_kind}`, { defaultValue: row.beneficiary_kind }),
        },
        {
            key: 'staff_name',
            header: t('reports.agent'),
            render: (row) => row.staff_name || '—',
        },
        {
            key: 'amount',
            header: t('reports.amount'),
            render: (row) => moneyLabel(row.amount, row.currency_code || currency),
        },
        {
            key: 'posted',
            header: t('reports.posting'),
            render: (row) => (
                <StatusChip
                    status={row.posted ? 'posted' : 'draft'}
                    label={row.posted ? t('reports.posted') : t('reports.unposted')}
                />
            ),
        },
        {
            key: 'occurred_on',
            header: t('reports.date'),
            render: (row) => row.occurred_on || '—',
        },
        {
            key: 'property_reference',
            header: t('properties.reference'),
            render: (row) => row.property_reference || '—',
        },
        {
            key: 'transaction_type',
            header: t('transactions.type'),
            render: (row) => (
                <StatusChip
                    status={row.transaction_type}
                    label={t(`transactions.types.${row.transaction_type}`, { defaultValue: row.transaction_type })}
                />
            ),
        },
        {
            key: 'deal_status',
            header: t('workspace_ui.status'),
            render: (row) => (
                <StatusChip
                    status={row.deal_status}
                    label={t(`transactions.statuses.${row.deal_status}`, { defaultValue: row.deal_status })}
                />
            ),
        },
    ];

    const pdfColumns = [
        { key: 'commission_id', header: t('reports.id'), width: '10%', render: (row) => String(row.commission_id) },
        {
            key: 'beneficiary_kind',
            header: t('reports.beneficiary'),
            width: '12%',
            render: (row) => t(`reports.beneficiary_${row.beneficiary_kind}`, { defaultValue: row.beneficiary_kind }),
        },
        { key: 'staff_name', header: t('reports.agent'), width: '14%', render: (row) => row.staff_name || '—' },
        { key: 'amount', header: t('reports.amount'), width: '14%', render: (row) => moneyLabel(row.amount, row.currency_code || currency) },
        { key: 'posted', header: t('reports.posting'), width: '10%', render: (row) => (row.posted ? t('reports.posted') : t('reports.unposted')) },
        { key: 'occurred_on', header: t('reports.date'), width: '12%', render: (row) => row.occurred_on || '—' },
        { key: 'property_reference', header: t('properties.reference'), width: '14%', render: (row) => row.property_reference || '—' },
        { key: 'deal_status', header: t('workspace_ui.status'), width: '14%', render: (row) => row.deal_status || '—' },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.commissions_title')}
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
                title={t('reports.commissions_title')}
                description={t('reports.commissions_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/admin/transactions/index" variant="outlined">
                            {t('transactions.title')}
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
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
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
                            label={t('reports.beneficiary')}
                            value={kind}
                            onChange={(event) => { setKind(event.target.value); setPage(1); }}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            <MenuItem value="agency">{t('reports.beneficiary_agency')}</MenuItem>
                            <MenuItem value="staff">{t('reports.beneficiary_staff')}</MenuItem>
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label={t('reports.posting')}
                            value={posted}
                            onChange={(event) => { setPosted(event.target.value); setPage(1); }}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            <MenuItem value="yes">{t('reports.posted')}</MenuItem>
                            <MenuItem value="no">{t('reports.unposted')}</MenuItem>
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label={t('transactions.type')}
                            value={dealType}
                            onChange={(event) => { setDealType(event.target.value); setPage(1); }}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            <MenuItem value="sale">{t('transactions.types.sale')}</MenuItem>
                            <MenuItem value="rent">{t('transactions.types.rent')}</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            label={t('workspace_ui.search')}
                            value={query}
                            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
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
                    label={t('reports.summary.lines')}
                    value={loading ? '…' : String(filtered.length)}
                    hint={t('reports.commissions_posted_split', {
                        posted: filteredTotals.postedCount,
                        pending: filteredTotals.pendingCount,
                    })}
                />
                <KpiCard
                    label={t('reports.summary.posted_base')}
                    value={loading ? '…' : moneyLabel(filteredTotals.postedBase, currency)}
                    hint={t('reports.commissions_posted_hint')}
                />
                <KpiCard
                    label={t('reports.summary.agency_amount')}
                    value={loading ? '…' : moneyLabel(filteredTotals.agency, currency)}
                />
                <KpiCard
                    label={t('reports.summary.staff_amount')}
                    value={loading ? '…' : moneyLabel(filteredTotals.staff, currency)}
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
                                    <Typography fontWeight={700}>{t('reports.commissions_trend')}</Typography>
                                    <Typography variant="body2" color="text.secondary">{t('reports.commissions_trend_hint')}</Typography>
                                </Box>
                                {currency ? <Typography variant="caption" color="text.secondary">{currency}</Typography> : null}
                            </Stack>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : trendRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: { xs: 280, md: 320 } }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={trendRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} width={72} />
                                            <Tooltip content={<ChartTooltip currency={currency} />} />
                                            <Legend />
                                            <Bar dataKey="agency" name={t('reports.beneficiary_agency')} fill={SPLIT_COLORS.agency} radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="staff" name={t('reports.beneficiary_staff')} fill={SPLIT_COLORS.staff} radius={[4, 4, 0, 0]} stackId="a" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.commissions_split')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.commissions_split_hint')}
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : splitRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: 260 }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={splitRows}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={58}
                                                outerRadius={88}
                                                paddingAngle={2}
                                            >
                                                {splitRows.map((row) => (
                                                    <Cell key={row.key} fill={SPLIT_COLORS[row.key] || '#94a3b8'} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip currency={currency} />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>
                    </Box>

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.commissions_detail')}</Typography>
                        <DataTable
                            columns={tableColumns}
                            rows={pageRows}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={page}
                            limit={limit}
                            total={filtered.length}
                            onPageChange={setPage}
                            rowKey="commission_id"
                            onRowClick={(row) => navigate(`/admin/transactions/${row.transaction_id}/show`)}
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
