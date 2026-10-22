import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    LinearProgress,
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
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd', 'custom'];
const STAGES = ['lead', 'qualified', 'viewing', 'negotiating', 'won', 'lost'];
const STAGE_COLORS = {
    lead: '#94a3b8',
    qualified: '#0369a1',
    viewing: '#0f766e',
    negotiating: '#7c3aed',
    won: '#15803d',
    lost: '#be123c',
    unset: '#64748b',
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

function stageLabel(stage, t) {
    if (!stage) return '—';
    if (stage === 'unset') return t('reports.crm_funnel_unset');
    return t(`reports.summary.${stage}`, { defaultValue: stage });
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

export default function CrmFunnel() {
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
    const [detailTab, setDetailTab] = useState(params.get('tab') || 'stages');
    const [query, setQuery] = useState(params.get('q') || '');
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
        if (detailTab && detailTab !== 'stages') next.set('tab', detailTab);
        if (query) next.set('q', query);
        setParams(next, { replace: true });
    }, [from, to, detailTab, query, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (from) request.from = from;
        if (to) request.to = to;
        fetch.get('operations/reports/crm-funnel', { params: request })
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

    const summary = report?.summary || {};
    const items = report?.items || [];

    const stageItems = useMemo(
        () => items.filter((row) => row.kind === 'stage'),
        [items],
    );

    const transitionItems = useMemo(
        () => items.filter((row) => row.kind === 'transition'),
        [items],
    );

    const funnelRows = useMemo(() => {
        const max = Math.max(...STAGES.map((stage) => asNumber(summary[stage])), 1);
        return STAGES.map((stage) => {
            const count = asNumber(summary[stage]);
            return {
                stage,
                name: stageLabel(stage, t),
                count,
                share: Math.round((count / max) * 100),
                color: STAGE_COLORS[stage],
            };
        });
    }, [summary, t]);

    const transitionRows = useMemo(() => {
        const term = query.trim().toLowerCase();
        return transitionItems
            .filter((row) => {
                if (!term) return true;
                const hay = [row.from_stage, row.to_stage, row.count].filter(Boolean).join(' ').toLowerCase();
                return hay.includes(term) || stageLabel(row.from_stage, t).toLowerCase().includes(term)
                    || stageLabel(row.to_stage, t).toLowerCase().includes(term);
            })
            .map((row, index) => ({
                ...row,
                row_key: `${row.from_stage || 'null'}→${row.to_stage || 'null'}|${index}`,
                label: `${stageLabel(row.from_stage, t)} → ${stageLabel(row.to_stage, t)}`,
            }))
            .sort((a, b) => asNumber(b.count) - asNumber(a.count));
    }, [transitionItems, query, t]);

    const topTransitions = useMemo(() => transitionRows.slice(0, 8).map((row) => ({
        name: row.label,
        count: asNumber(row.count),
        to: row.to_stage,
    })), [transitionRows]);

    useEffect(() => {
        setPage(1);
    }, [from, to, detailTab, query, requestKey]);

    const tableSource = detailTab === 'transitions' ? transitionRows : stageItems.map((row, index) => ({
        ...row,
        row_key: `stage|${row.stage}|${index}`,
        count: asNumber(row.count),
    }));

    const pageRows = useMemo(() => {
        const start = (page - 1) * limit;
        return tableSource.slice(start, start + limit);
    }, [tableSource, page]);

    const openPipeline = STAGES
        .filter((stage) => !['won', 'lost'].includes(stage))
        .reduce((sum, stage) => sum + asNumber(summary[stage]), 0);
    const decided = asNumber(summary.won) + asNumber(summary.lost);
    const winRate = asNumber(summary.win_rate);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = [
        from ? `${t('operations.from')}: ${from}` : '',
        to ? `${t('operations.to')}: ${to}` : '',
        t('reports.crm_funnel_snapshot_note'),
    ].filter(Boolean);

    const summaryCards = STAGES.map((stage) => ({
        label: stageLabel(stage, t),
        value: String(asNumber(summary[stage])),
    })).concat([
        { label: t('reports.summary.win_rate'), value: `${winRate}%` },
    ]);

    const stageColumns = [
        {
            key: 'stage',
            header: t('reports.stage'),
            locked: true,
            render: (row) => (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STAGE_COLORS[row.stage] || '#94a3b8' }} />
                    <Typography fontWeight={700}>{stageLabel(row.stage, t)}</Typography>
                </Stack>
            ),
        },
        {
            key: 'count',
            header: t('reports.count'),
            render: (row) => (
                <Typography component="span" fontWeight={700}>{asNumber(row.count)}</Typography>
            ),
        },
        {
            key: 'share',
            header: t('reports.share'),
            render: (row) => {
                const total = openPipeline + decided || 1;
                const pct = Math.round((asNumber(row.count) / total) * 100);
                return (
                    <Box sx={{ minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                        <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                                mt: 0.5,
                                height: 6,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                                '& .MuiLinearProgress-bar': { bgcolor: STAGE_COLORS[row.stage] || '#94a3b8' },
                            }}
                        />
                    </Box>
                );
            },
        },
    ];

    const transitionColumns = [
        {
            key: 'from_stage',
            header: t('reports.from_stage'),
            locked: true,
            render: (row) => stageLabel(row.from_stage, t),
        },
        {
            key: 'to_stage',
            header: t('reports.to_stage'),
            render: (row) => (
                <StatusChip
                    status={row.to_stage === 'won' ? 'posted' : row.to_stage === 'lost' ? 'void' : 'draft'}
                    label={stageLabel(row.to_stage, t)}
                />
            ),
        },
        {
            key: 'count',
            header: t('reports.count'),
            render: (row) => (
                <Typography component="span" fontWeight={700}>{asNumber(row.count)}</Typography>
            ),
        },
    ];

    const pdfStageColumns = [
        { key: 'stage', header: t('reports.stage'), width: '40%', render: (row) => stageLabel(row.stage, t) },
        { key: 'count', header: t('reports.count'), width: '30%', render: (row) => String(asNumber(row.count)) },
        {
            key: 'share',
            header: t('reports.share'),
            width: '30%',
            render: (row) => {
                const total = openPipeline + decided || 1;
                return `${Math.round((asNumber(row.count) / total) * 100)}%`;
            },
        },
    ];

    const pdfTransitionColumns = [
        { key: 'from_stage', header: t('reports.from_stage'), width: '35%', render: (row) => stageLabel(row.from_stage, t) },
        { key: 'to_stage', header: t('reports.to_stage'), width: '35%', render: (row) => stageLabel(row.to_stage, t) },
        { key: 'count', header: t('reports.count'), width: '30%', render: (row) => String(asNumber(row.count)) },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.crm_funnel_title')}
            company={footerCompany}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('workspace.address', { defaultValue: 'Address' })}
            isRTL={isRTL}
            summary={summaryCards}
        >
            <PdfTable columns={pdfStageColumns} rows={stageItems} isRTL={isRTL} emptyLabel={t('reports.empty')} />
            {transitionRows.length > 0 ? (
                <PdfTable columns={pdfTransitionColumns} rows={transitionRows} isRTL={isRTL} emptyLabel={t('reports.empty')} />
            ) : null}
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
                title={t('reports.crm_funnel_title')}
                description={t('reports.crm_funnel_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/admin/parties/index" variant="outlined">
                            {t('parties.title', { defaultValue: t('admin_sidebar.parties') })}
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
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1.2fr' },
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
                            helperText={t('reports.crm_funnel_period_hint')}
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
                            size="small"
                            label={t('workspace_ui.search')}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            disabled={detailTab !== 'transitions'}
                            helperText={detailTab === 'transitions' ? t('reports.crm_funnel_search_hint') : ' '}
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
                    label={t('reports.crm_funnel_open')}
                    value={loading ? '…' : String(openPipeline)}
                    hint={t('reports.crm_funnel_open_hint', { unset: asNumber(summary.unset) })}
                />
                <KpiCard
                    label={t('reports.summary.won')}
                    value={loading ? '…' : String(asNumber(summary.won))}
                    accent={STAGE_COLORS.won}
                    hint={t('reports.crm_funnel_won_hint')}
                />
                <KpiCard
                    label={t('reports.summary.lost')}
                    value={loading ? '…' : String(asNumber(summary.lost))}
                    accent={STAGE_COLORS.lost}
                    hint={t('reports.crm_funnel_lost_hint')}
                />
                <KpiCard
                    label={t('reports.summary.win_rate')}
                    value={loading ? '…' : `${winRate}%`}
                    hint={t('reports.crm_funnel_win_hint', { decided })}
                />
            </Box>

            {view === 'workspace' ? (
                <Stack spacing={2}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(280px, 0.85fr)' },
                            gap: 2,
                        }}
                    >
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box>
                                    <Typography fontWeight={700}>{t('reports.crm_funnel_chart')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.crm_funnel_chart_hint')}
                                    </Typography>
                                </Box>
                            </Stack>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : funnelRows.every((row) => row.count === 0) ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.empty')}</Typography>
                                </Box>
                            ) : (
                                <Stack spacing={1.25} sx={{ py: 1 }}>
                                    {funnelRows.map((row) => (
                                        <Box key={row.stage}>
                                            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">{row.count}</Typography>
                                            </Stack>
                                            <Box
                                                sx={{
                                                    height: 28,
                                                    borderRadius: 1,
                                                    bgcolor: 'action.hover',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        width: `${Math.max(row.share, row.count > 0 ? 6 : 0)}%`,
                                                        bgcolor: row.color,
                                                        transition: 'width 0.3s ease',
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.crm_funnel_moves')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.crm_funnel_moves_hint')}
                            </Typography>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : topTransitions.length === 0 ? (
                                <Box sx={{ py: 8, textAlign: 'center' }}>
                                    <Typography color="text.secondary">{t('reports.crm_funnel_no_moves')}</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ width: '100%', height: 300 }} dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart
                                            layout="vertical"
                                            data={topTransitions}
                                            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={120}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend />
                                            <Bar dataKey="count" name={t('reports.count')} radius={[0, 4, 4, 0]}>
                                                {topTransitions.map((row) => (
                                                    <Cell key={row.name} fill={STAGE_COLORS[row.to] || '#1e3a5f'} />
                                                ))}
                                            </Bar>
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>
                    </Box>

                    <Box>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
                        >
                            <Typography fontWeight={700}>{t('reports.crm_funnel_detail')}</Typography>
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={detailTab}
                                onChange={(_, value) => { if (value) setDetailTab(value); }}
                            >
                                <ToggleButton value="stages">{t('reports.crm_funnel_tab_stages')}</ToggleButton>
                                <ToggleButton value="transitions">{t('reports.crm_funnel_tab_moves')}</ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                        <DataTable
                            columns={detailTab === 'transitions' ? transitionColumns : stageColumns}
                            rows={pageRows}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={page}
                            limit={limit}
                            total={tableSource.length}
                            onPageChange={setPage}
                            rowKey="row_key"
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
