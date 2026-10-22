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
import DataTable from '@/components/workspace/DataTable.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd', 'custom'];
const KPI_KEYS = [
    { key: 'cash_in', tone: 'in' },
    { key: 'cash_out', tone: 'out' },
    { key: 'net_cash', tone: 'net' },
    { key: 'commissions', tone: 'commission' },
    { key: 'balance', tone: 'balance' },
];

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
    if (tone === 'in' || tone === 'commission') return 'success.main';
    if (tone === 'out') return 'text.primary';
    if (tone === 'net' || tone === 'balance') return n < 0 ? 'error.main' : 'success.main';
    return 'inherit';
}

function KpiCard({ label, value, tone, hint }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.75, color: toneColor(tone, value), wordBreak: 'break-word' }}>
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

export default function PnlCash() {
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
        setParams(next, { replace: true });
    }, [from, to, branch, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (from) request.from = from;
        if (to) request.to = to;
        if (branch) request.branch_id = branch;
        fetch.get('operations/reports/pnl-cash', { params: request })
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
    const items = report?.items || [];
    const currency = summary.base_currency_code || report?.filters?.base_currency_code || '';

    const chartRows = useMemo(() => items.map((row) => ({
        period: row.period,
        cash_in: asNumber(row.cash_in),
        cash_out: asNumber(row.cash_out),
        net_cash: asNumber(row.net_cash),
        commissions: asNumber(row.commissions),
    })), [items]);

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

    const summaryCards = KPI_KEYS.map(({ key }) => ({
        label: t(`reports.summary.${key}`),
        value: moneyLabel(summary[key], currency),
    }));

    const tableColumns = [
        { key: 'period', header: t('reports.period'), locked: true, render: (row) => row.period },
        { key: 'cash_in', header: t('reports.cash_in'), render: (row) => moneyLabel(row.cash_in, currency) },
        { key: 'cash_out', header: t('reports.cash_out'), render: (row) => moneyLabel(row.cash_out, currency) },
        {
            key: 'net_cash',
            header: t('reports.net_cash'),
            render: (row) => (
                <Typography component="span" fontWeight={700} sx={{ color: toneColor('net', row.net_cash) }}>
                    {moneyLabel(row.net_cash, currency)}
                </Typography>
            ),
        },
        { key: 'commissions', header: t('operations.commissions'), render: (row) => moneyLabel(row.commissions, currency) },
    ];

    const pdfColumns = [
        { key: 'period', header: t('reports.period'), width: '20%', render: (row) => row.period || '—' },
        { key: 'cash_in', header: t('reports.cash_in'), width: '20%', render: (row) => moneyLabel(row.cash_in, currency) },
        { key: 'cash_out', header: t('reports.cash_out'), width: '20%', render: (row) => moneyLabel(row.cash_out, currency) },
        { key: 'net_cash', header: t('reports.net_cash'), width: '20%', render: (row) => moneyLabel(row.net_cash, currency) },
        { key: 'commissions', header: t('operations.commissions'), width: '20%', render: (row) => moneyLabel(row.commissions, currency) },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.pnl_cash_title')}
            company={footerCompany}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('workspace.address', { defaultValue: 'Address' })}
            isRTL={isRTL}
            summary={summaryCards}
        >
            <PdfTable columns={pdfColumns} rows={items} isRTL={isRTL} emptyLabel={t('reports.empty')} />
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
                title={t('reports.pnl_cash_title')}
                description={t('reports.pnl_cash_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
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
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
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
                {KPI_KEYS.map(({ key, tone }) => (
                    <KpiCard
                        key={key}
                        label={t(`reports.summary.${key}`)}
                        value={loading ? '…' : moneyLabel(summary[key], currency)}
                        tone={tone}
                        hint={key === 'commissions' ? t('reports.pnl_cash_commission_hint') : undefined}
                    />
                ))}
            </Box>

            {view === 'workspace' ? (
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box>
                                <Typography fontWeight={700}>{t('reports.pnl_cash_trend')}</Typography>
                                <Typography variant="body2" color="text.secondary">{t('reports.pnl_cash_trend_hint')}</Typography>
                            </Box>
                            {currency ? (
                                <Typography variant="caption" color="text.secondary">{currency}</Typography>
                            ) : null}
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
                            <Box sx={{ width: '100%', height: { xs: 280, md: 340 } }} dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} width={72} />
                                        <Tooltip content={<ChartTooltip currency={currency} />} />
                                        <Legend />
                                        <Bar dataKey="cash_in" name={t('reports.cash_in')} fill="#0f766e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="cash_out" name={t('reports.cash_out')} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="net_cash" name={t('reports.net_cash')} stroke="#1e3a5f" strokeWidth={2} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Paper>

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.pnl_cash_by_month')}</Typography>
                        <DataTable
                            columns={tableColumns}
                            rows={items}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={1}
                            limit={Math.max(items.length, 25)}
                            total={items.length}
                            onPageChange={() => {}}
                            rowKey="period"
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
