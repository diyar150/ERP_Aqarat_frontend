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
import { currencyLabel, moneyLabel } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const AS_OF_PRESETS = ['today', 'yesterday', 'month_start', 'month_end', 'custom'];
const EXPOSURE_COLORS = [
    '#0f766e', '#1e3a5f', '#b45309', '#7c3aed', '#0369a1',
    '#be123c', '#15803d', '#9333ea', '#c2410c', '#475569',
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


function toneColor(value) {
    const n = asNumber(value);
    if (n > 0) return 'success.main';
    if (n < 0) return 'error.main';
    return 'inherit';
}

function KpiCard({ label, value, tone, hint }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mt: 0.75, color: tone ? toneColor(value) : 'inherit', wordBreak: 'break-word' }}
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
            {label ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {label}
                </Typography>
            ) : null}
            {payload.map((entry) => (
                <Typography key={entry.dataKey || entry.name} variant="body2" sx={{ color: entry.color }}>
                    {entry.name}: {moneyLabel(entry.value, currency)}
                </Typography>
            ))}
        </Paper>
    );
}

export default function CurrencyPosition() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params, setParams] = useSearchParams();
    const [asOfPreset, setAsOfPreset] = useState(() => (params.get('as_of') ? 'custom' : 'today'));
    const [asOf, setAsOf] = useState(params.get('as_of') || asOfForPreset('today'));
    const [fxFilter, setFxFilter] = useState(params.get('fx') || '');
    const [query, setQuery] = useState(params.get('q') || '');
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [view, setView] = useState('workspace');

    const requestKey = JSON.stringify([asOf]);
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
        if (asOf) next.set('as_of', asOf);
        if (fxFilter) next.set('fx', fxFilter);
        if (query) next.set('q', query);
        setParams(next, { replace: true });
    }, [asOf, fxFilter, query, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (asOf) request.as_of = asOf;
        fetch.get('operations/reports/currency-position', { params: request })
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
    }, [asOf, requestKey, t]);

    const summary = report?.summary || {};
    const baseCurrency = summary.base_currency_code || report?.filters?.base_currency_code || '';
    const items = report?.items || [];

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return items.filter((row) => {
            const unrealized = asNumber(row.unrealized);
            if (fxFilter === 'gain' && unrealized <= 0) return false;
            if (fxFilter === 'loss' && unrealized >= 0) return false;
            if (fxFilter === 'flat' && unrealized !== 0) return false;
            if (!term) return true;
            return String(row.currency_code || '').toLowerCase().includes(term);
        });
    }, [items, fxFilter, query]);

    const filteredTotals = useMemo(() => {
        let book = 0;
        let mtm = 0;
        let gains = 0;
        let losses = 0;
        for (const row of filtered) {
            book += asNumber(row.book_base);
            mtm += asNumber(row.mtm_base);
            const u = asNumber(row.unrealized);
            if (u > 0) gains += u;
            else if (u < 0) losses += u;
        }
        return {
            currencies: filtered.length,
            book,
            mtm,
            unrealized: mtm - book,
            gains,
            losses,
        };
    }, [filtered]);

    const comparisonRows = useMemo(() => filtered.map((row) => ({
        code: row.currency_code,
        book: asNumber(row.book_base),
        mtm: asNumber(row.mtm_base),
        unrealized: asNumber(row.unrealized),
    })), [filtered]);

    const exposureRows = useMemo(() => (
        filtered
            .map((row, index) => ({
                key: row.currency_code,
                name: row.currency_code,
                value: Math.abs(asNumber(row.mtm_base)),
                signed: asNumber(row.mtm_base),
                color: EXPOSURE_COLORS[index % EXPOSURE_COLORS.length],
            }))
            .filter((row) => row.value > 0)
            .sort((a, b) => b.value - a.value)
    ), [filtered]);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = [
        asOf ? `${t('reports.as_of')}: ${asOf}` : '',
        fxFilter ? `${t('reports.currency_position_fx')}: ${t(`reports.currency_position_fx_${fxFilter}`)}` : '',
        baseCurrency ? `${t('reports.currency_position_base')}: ${baseCurrency}` : '',
    ].filter(Boolean);

    const summaryCards = [
        { label: t('reports.summary.currencies'), value: String(filteredTotals.currencies) },
        { label: t('reports.summary.book_base_total'), value: moneyLabel(filteredTotals.book, baseCurrency) },
        { label: t('reports.summary.mtm_base_total'), value: moneyLabel(filteredTotals.mtm, baseCurrency) },
        { label: t('reports.summary.unrealized_total'), value: moneyLabel(filteredTotals.unrealized, baseCurrency) },
    ];

    const tableColumns = [
        {
            key: 'currency_code',
            header: t('platform.currency'),
            locked: true,
            render: (row) => (
                <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{currencyLabel(row.currency_code)}</Typography>
                    {row.currency_code === baseCurrency ? (
                        <Typography variant="caption" color="text.secondary">
                            {t('reports.currency_position_base')}
                        </Typography>
                    ) : null}
                </Stack>
            ),
        },
        {
            key: 'native_balance',
            header: t('reports.native_balance'),
            render: (row) => moneyLabel(row.native_balance, row.currency_code),
        },
        {
            key: 'book_base',
            header: t('reports.book_base'),
            render: (row) => moneyLabel(row.book_base, baseCurrency),
        },
        {
            key: 'mtm_base',
            header: t('reports.mtm_base'),
            render: (row) => moneyLabel(row.mtm_base, baseCurrency),
        },
        {
            key: 'mtm_rate',
            header: t('reports.currency_position_rate'),
            render: (row) => {
                if (row.currency_code === baseCurrency) return '1';
                const rate = asNumber(row.mtm_rate);
                return rate ? rate.toFixed(6) : '—';
            },
        },
        {
            key: 'unrealized',
            header: t('reports.unrealized'),
            render: (row) => (
                <Typography component="span" fontWeight={700} sx={{ color: toneColor(row.unrealized) }}>
                    {moneyLabel(row.unrealized, baseCurrency)}
                </Typography>
            ),
        },
        {
            key: 'fx_status',
            header: t('workspace_ui.status'),
            render: (row) => {
                const n = asNumber(row.unrealized);
                const key = n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat';
                return (
                    <StatusChip
                        status={key === 'gain' ? 'posted' : key === 'loss' ? 'void' : 'draft'}
                        label={t(`reports.currency_position_fx_${key}`)}
                    />
                );
            },
        },
    ];

    const pdfColumns = [
        { key: 'currency_code', header: t('platform.currency'), width: '12%', render: (row) => currencyLabel(row.currency_code) || '—' },
        { key: 'native_balance', header: t('reports.native_balance'), width: '18%', render: (row) => moneyLabel(row.native_balance, row.currency_code) },
        { key: 'book_base', header: t('reports.book_base'), width: '18%', render: (row) => moneyLabel(row.book_base, baseCurrency) },
        { key: 'mtm_base', header: t('reports.mtm_base'), width: '18%', render: (row) => moneyLabel(row.mtm_base, baseCurrency) },
        { key: 'mtm_rate', header: t('reports.currency_position_rate'), width: '14%', render: (row) => (row.currency_code === baseCurrency ? '1' : String(row.mtm_rate || '—')) },
        { key: 'unrealized', header: t('reports.unrealized'), width: '20%', render: (row) => moneyLabel(row.unrealized, baseCurrency) },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.currency_position_title')}
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
                title={t('reports.currency_position_title')}
                description={t('reports.currency_position_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/admin/currencies/index" variant="outlined">
                            {t('currencies.title')}
                        </Button>
                        <Button component={RouterLink} to="/admin/currency-exchange-rates/index" variant="outlined">
                            {t('currency_exchange_rates.title')}
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
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
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
                            label={t('reports.currency_position_fx')}
                            value={fxFilter}
                            onChange={(event) => setFxFilter(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            <MenuItem value="gain">{t('reports.currency_position_fx_gain')}</MenuItem>
                            <MenuItem value="loss">{t('reports.currency_position_fx_loss')}</MenuItem>
                            <MenuItem value="flat">{t('reports.currency_position_fx_flat')}</MenuItem>
                        </TextField>
                        <TextField
                            size="small"
                            label={t('workspace_ui.search')}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="USD, IQD…"
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
                    label={t('reports.summary.currencies')}
                    value={loading ? '…' : String(filteredTotals.currencies)}
                    hint={t('reports.currency_position_count_hint')}
                />
                <KpiCard
                    label={t('reports.summary.book_base_total')}
                    value={loading ? '…' : moneyLabel(filteredTotals.book, baseCurrency)}
                    hint={t('reports.currency_position_book_hint')}
                />
                <KpiCard
                    label={t('reports.summary.mtm_base_total')}
                    value={loading ? '…' : moneyLabel(filteredTotals.mtm, baseCurrency)}
                    hint={t('reports.currency_position_mtm_hint')}
                />
                <KpiCard
                    label={t('reports.summary.unrealized_total')}
                    value={loading ? '…' : moneyLabel(filteredTotals.unrealized, baseCurrency)}
                    tone
                    hint={t('reports.currency_position_fx_split', {
                        gains: moneyLabel(filteredTotals.gains, baseCurrency),
                        losses: moneyLabel(filteredTotals.losses, baseCurrency),
                    })}
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
                                    <Typography fontWeight={700}>{t('reports.currency_position_compare')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.currency_position_compare_hint')}
                                    </Typography>
                                </Box>
                                {baseCurrency ? (
                                    <Typography variant="caption" color="text.secondary">{baseCurrency}</Typography>
                                ) : null}
                            </Stack>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : comparisonRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: { xs: 280, md: 320 } }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={comparisonRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} width={72} />
                                            <Tooltip content={<ChartTooltip currency={baseCurrency} />} />
                                            <Legend />
                                            <Bar dataKey="book" name={t('reports.book_base')} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="mtm" name={t('reports.mtm_base')} fill="#0f766e" radius={[4, 4, 0, 0]} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.currency_position_exposure')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.currency_position_exposure_hint')}
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : exposureRows.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: 260 }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={exposureRows}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={58}
                                                outerRadius={88}
                                                paddingAngle={2}
                                            >
                                                {exposureRows.map((row) => (
                                                    <Cell key={row.key} fill={row.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip currency={baseCurrency} />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>
                    </Box>

                    {comparisonRows.some((row) => row.unrealized !== 0) ? (
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box>
                                    <Typography fontWeight={700}>{t('reports.currency_position_fx_chart')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.currency_position_fx_chart_hint')}
                                    </Typography>
                                </Box>
                                {baseCurrency ? (
                                    <Typography variant="caption" color="text.secondary">{baseCurrency}</Typography>
                                ) : null}
                            </Stack>
                            <Box sx={{ width: '100%', height: { xs: 240, md: 280 } }} dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={comparisonRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                        <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} width={72} />
                                        <Tooltip content={<ChartTooltip currency={baseCurrency} />} />
                                        <Bar dataKey="unrealized" name={t('reports.unrealized')} radius={[4, 4, 0, 0]}>
                                            {comparisonRows.map((row) => (
                                                <Cell
                                                    key={row.code}
                                                    fill={row.unrealized >= 0 ? '#0f766e' : '#be123c'}
                                                />
                                            ))}
                                        </Bar>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    ) : null}

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.currency_position_detail')}</Typography>
                        <DataTable
                            columns={tableColumns}
                            rows={filtered}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={1}
                            limit={Math.max(filtered.length, 25)}
                            total={filtered.length}
                            onPageChange={() => {}}
                            rowKey="currency_code"
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
