import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert,
    Box,
    Button,
    Chip,
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
    AccountBalance,
    Block,
    Business,
    HistoryEdu,
    ReceiptLong,
    SwapHoriz,
} from '@mui/icons-material';
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
import { useAuthStore } from '@/store/authStore';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';
import { printFinanceVoucher } from '@/views/admin/finance/printFinanceVoucher.jsx';

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd', 'custom'];
const ENTRY_TYPES = ['payment', 'expense', 'commission', 'receivable', 'reversal'];
const STATUS_COLORS = { void: '#be123c', reversed: '#b45309', posted: '#059669' };
const TYPE_COLORS = {
    payment: '#0f766e',
    expense: '#1e3a5f',
    commission: '#7c3aed',
    receivable: '#0369a1',
    reversal: '#475569',
};

const OPTIONAL_COLUMNS = [
    'date',
    'branch',
    'entry_type',
    'direction',
    'reference',
    'void_reason',
    'voided_by',
    'voided_at',
    'related_voucher',
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

function formatWhen(value, isRTL) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 19);
    return format(date, isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');
}

function ChartTooltip({ active, payload, label, moneyMode, currency }) {
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
                    {entry.name}: {moneyMode ? moneyLabel(entry.value, currency) : entry.value}
                </Typography>
            ))}
        </Paper>
    );
}

export default function FinanceAudit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const user = useAuthStore((state) => state.user);
    const lockedOffice = user?.branch_id ? String(user.branch_id) : null;

    const [params, setParams] = useSearchParams();
    const [period, setPeriod] = useState(() => {
        if (params.get('from') || params.get('to')) return 'custom';
        return '30d';
    });
    const initialRange = periodRange(period === 'custom' ? '30d' : period) || { from: '', to: '' };
    const [from, setFrom] = useState(params.get('from') || initialRange.from);
    const [to, setTo] = useState(params.get('to') || initialRange.to);
    const [branch, setBranch] = useState(params.get('branch') || lockedOffice || '');
    const [status, setStatus] = useState(params.get('status') || '');
    const [entryType, setEntryType] = useState(params.get('type') || '');
    const [query, setQuery] = useState(params.get('q') || '');
    const [page, setPage] = useState(1);
    const [report, setReport] = useState(null);
    const [offices, setOffices] = useState([]);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [view, setView] = useState('workspace');
    const [voucherBusy, setVoucherBusy] = useState(null);
    const limit = 25;

    const columns = useColumnVisibility('finance_audit.columns', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);

    const activeBranch = lockedOffice || branch;
    const requestKey = JSON.stringify([from, to, activeBranch]);
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
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => { });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        const next = new URLSearchParams();
        if (from) next.set('from', from);
        if (to) next.set('to', to);
        if (activeBranch) next.set('branch', activeBranch);
        if (status) next.set('status', status);
        if (entryType) next.set('type', entryType);
        if (query) next.set('q', query);
        setParams(next, { replace: true });
    }, [from, to, activeBranch, status, entryType, query, setParams]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (from) request.from = from;
        if (to) request.to = to;
        if (activeBranch) request.branch_id = activeBranch;

        fetch.get('operations/reports/finance-audit', { params: request })
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
    }, [from, to, activeBranch, requestKey, t]);

    const items = report?.items || [];

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return items.filter((row) => {
            if (status && row.status !== status) return false;
            if (entryType && row.entry_type !== entryType) return false;
            if (!term) return true;
            const hay = [
                row.id,
                row.invoice_id,
                row.entry_type,
                row.status,
                row.branch_name,
                row.reference_number,
                row.void_reason,
                row.voided_by_name,
                row.currency_code,
                row.reverses_entry_id,
                row.reversal_invoice_id,
                row.original_invoice_id,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(term);
        });
    }, [items, status, entryType, query]);

    useEffect(() => {
        setPage(1);
    }, [from, to, activeBranch, status, entryType, query, requestKey]);

    const pageRows = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page]);

    const filteredTotals = useMemo(() => {
        let voided = 0;
        let reversed = 0;
        let reversals = 0;
        let voidedBase = 0;
        let reversedBase = 0;
        let baseAmount = 0;
        const byPeriod = new Map();
        const byType = new Map();

        for (const row of filtered) {
            const rowBase = asNumber(row.base_amount || row.amount);
            baseAmount += rowBase;
            if (row.status === 'void') {
                voided += 1;
                voidedBase += rowBase;
            } else if (row.status === 'reversed') {
                reversed += 1;
                reversedBase += rowBase;
            } else if (row.entry_type === 'reversal') {
                reversals += 1;
            }
            const when = row.voided_at || row.occurred_on || '';
            const periodKey = String(when).slice(0, 7) || t('reports.unposted_period');
            const bucket = byPeriod.get(periodKey) || { period: periodKey, voided: 0, reversed: 0 };
            if (row.status === 'void') bucket.voided += 1;
            else if (row.status === 'reversed') bucket.reversed += 1;
            byPeriod.set(periodKey, bucket);
            byType.set(row.entry_type, (byType.get(row.entry_type) || 0) + 1);
        }

        return {
            lines: filtered.length,
            voided,
            reversed,
            reversals,
            voidedBase,
            reversedBase,
            baseAmount,
            byPeriod,
            byType,
        };
    }, [filtered, t]);

    const trendRows = useMemo(() => (
        [...filteredTotals.byPeriod.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)))
    ), [filteredTotals.byPeriod]);

    const statusRows = useMemo(() => ([
        { key: 'void', name: t('finance.statuses.void'), value: filteredTotals.voided },
        { key: 'reversed', name: t('finance.statuses.reversed'), value: filteredTotals.reversed },
    ]).filter((row) => row.value > 0), [filteredTotals.voided, filteredTotals.reversed, t]);

    const typeRows = useMemo(() => (
        [...filteredTotals.byType.entries()]
            .map(([key, value]) => ({
                key,
                name: t(`finance.types.${key}`, { defaultValue: key }),
                value,
            }))
            .sort((a, b) => b.value - a.value)
    ), [filteredTotals.byType, t]);

    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const branchName = offices.find((b) => String(b.id) === String(activeBranch))?.name;
    const filterLines = [
        from ? `${t('operations.from')}: ${from}` : '',
        to ? `${t('operations.to')}: ${to}` : '',
        branchName ? `${t('finance.office')}: ${branchName}` : '',
        status ? `${t('workspace_ui.status')}: ${t(`finance.statuses.${status}`, { defaultValue: status })}` : '',
        entryType ? `${t('reports.entry_type')}: ${t(`finance.types.${entryType}`, { defaultValue: entryType })}` : '',
    ].filter(Boolean);

    const summaryCards = [
        { label: t('reports.summary.lines'), value: String(filteredTotals.lines) },
        { label: t('reports.summary.voided'), value: String(filteredTotals.voided) },
        { label: t('reports.summary.reversed'), value: String(filteredTotals.reversed) },
        { label: t('reports.finance_audit_base_total'), value: moneyLabel(filteredTotals.baseAmount) },
    ];

    const handlePrintVoucher = async (id) => {
        setVoucherBusy(id);
        try {
            await printFinanceVoucher({ entryId: id, t, isRTL });
        } finally {
            setVoucherBusy(null);
        }
    };

    const pickerColumns = [
        { key: 'invoice_id', label: t('finance.invoice_id'), locked: true },
        { key: 'date', label: t('finance.date') },
        { key: 'branch', label: t('finance.office') },
        { key: 'entry_type', label: t('reports.entry_type') },
        { key: 'direction', label: t('finance.direction') },
        { key: 'status', label: t('workspace_ui.status'), locked: true },
        { key: 'amount', label: t('reports.amount'), locked: true },
        { key: 'reference', label: t('reports.reference') },
        { key: 'void_reason', label: t('reports.void_reason') },
        { key: 'voided_by', label: t('reports.voided_by') },
        { key: 'voided_at', label: t('reports.voided_at') },
        { key: 'related_voucher', label: t('reports.finance_audit_reverses') },
        { key: 'actions', label: t('workspace_ui.actions'), locked: true },
    ];

    const tableColumns = [
        {
            key: 'invoice_id',
            header: t('finance.invoice_id'),
            locked: true,
            render: (row) => (
                <Box>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                            fontFamily: 'monospace',
                            color: 'primary.main',
                            letterSpacing: 0.5,
                        }}
                    >
                        {row.invoice_id || `FIN-${row.id}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        #{row.id}
                    </Typography>
                </Box>
            ),
        },
        {
            key: 'date',
            header: t('finance.date'),
            render: (row) => row.occurred_on || '—',
        },
        {
            key: 'branch',
            header: t('finance.office'),
            render: (row) => row.branch_name ? (
                <Chip
                    size="small"
                    variant="outlined"
                    icon={<Business sx={{ fontSize: '14px !important' }} />}
                    label={row.branch_name}
                    sx={{ borderRadius: 1 }}
                />
            ) : '—',
        },
        {
            key: 'entry_type',
            header: t('reports.entry_type'),
            render: (row) => (
                <Typography variant="body2" fontWeight={500}>
                    {t(`finance.types.${row.entry_type}`, { defaultValue: row.entry_type })}
                </Typography>
            ),
        },
        {
            key: 'direction',
            header: t('finance.direction'),
            render: (row) => (
                <Chip
                    size="small"
                    label={row.direction === 'in' ? t('finance.in') : t('finance.out')}
                    color={row.direction === 'in' ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ fontWeight: 600, minWidth: 48 }}
                />
            ),
        },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            locked: true,
            render: (row) => (
                <StatusChip
                    status={row.status}
                    label={t(`finance.statuses.${row.status}`, { defaultValue: row.status })}
                />
            ),
        },
        {
            key: 'amount',
            header: t('reports.amount'),
            locked: true,
            render: (row) => {
                const isOut = row.direction === 'out';
                return (
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                            fontVariantNumeric: 'tabular-nums',
                            textDecoration: row.status === 'void' ? 'line-through' : 'none',
                            color: row.status === 'void'
                                ? 'text.disabled'
                                : isOut
                                    ? 'error.main'
                                    : 'success.main',
                        }}
                    >
                        {isOut ? '-' : '+'}{moneyLabel(row.amount, row.currency_code)}
                    </Typography>
                );
            },
        },
        {
            key: 'reference',
            header: t('reports.reference'),
            render: (row) => row.reference_number || '—',
        },
        {
            key: 'void_reason',
            header: t('reports.void_reason'),
            render: (row) => (
                <Typography variant="body2" sx={{ maxWidth: 220, whiteSpace: 'normal', color: 'text.secondary' }}>
                    {row.void_reason || '—'}
                </Typography>
            ),
        },
        {
            key: 'voided_by',
            header: t('reports.voided_by'),
            render: (row) => row.voided_by_name || '—',
        },
        {
            key: 'voided_at',
            header: t('reports.voided_at'),
            render: (row) => formatWhen(row.voided_at, isRTL),
        },
        {
            key: 'related_voucher',
            header: t('reports.finance_audit_reverses'),
            render: (row) => {
                if (row.status === 'reversed') {
                    const target = row.reversal_invoice_id || (row.reversal_id ? `FIN-${row.reversal_id}` : null);
                    if (!target) return '—';
                    return (
                        <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={`↩ ${target}`}
                            title={t('reports.finance_audit_linked_reversal')}
                            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                    );
                }
                if (row.entry_type === 'reversal') {
                    const target = row.original_invoice_id || (row.original_id ? `FIN-${row.original_id}` : null);
                    if (!target) return '—';
                    return (
                        <Chip
                            size="small"
                            color="info"
                            variant="outlined"
                            label={`⤺ ${target}`}
                            title={t('reports.finance_audit_linked_original')}
                            sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                    );
                }
                return '—';
            },
        },
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
                    <ActionIconButton
                        action="print"
                        title={t('finance.voucher')}
                        disabled={voucherBusy === row.id}
                        onClick={() => handlePrintVoucher(row.id)}
                    />
                </Stack>
            ),
        },
    ];

    const pdfColumns = [
        { key: 'invoice_id', header: t('finance.invoice_id'), width: '12%', render: (row) => row.invoice_id || `FIN-${row.id}` },
        { key: 'date', header: t('finance.date'), width: '10%', render: (row) => row.occurred_on || '—' },
        { key: 'branch', header: t('finance.office'), width: '12%', render: (row) => row.branch_name || '—' },
        { key: 'entry_type', header: t('reports.entry_type'), width: '10%', render: (row) => t(`finance.types.${row.entry_type}`, { defaultValue: row.entry_type }) },
        { key: 'status', header: t('workspace_ui.status'), width: '8%', render: (row) => t(`finance.statuses.${row.status}`, { defaultValue: row.status }) },
        { key: 'amount', header: t('reports.amount'), width: '12%', render: (row) => `${row.direction === 'out' ? '-' : '+'}${moneyLabel(row.amount, row.currency_code)}` },
        { key: 'reference', header: t('reports.reference'), width: '12%', render: (row) => row.reference_number || '—' },
        { key: 'void_reason', header: t('reports.void_reason'), width: '14%', render: (row) => row.void_reason || '—' },
        { key: 'voided_by', header: t('reports.voided_by'), width: '10%', render: (row) => row.voided_by_name || '—' },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('reports.finance_audit_title')}
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
                title={t('reports.finance_audit_title')}
                description={t('reports.finance_audit_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            component={RouterLink}
                            to="/admin/finance"
                            variant="outlined"
                            startIcon={<ReceiptLong />}
                        >
                            {t('operations.view_ledger')}
                        </Button>
                        <Button
                            component={RouterLink}
                            to="/admin/audit"
                            variant="outlined"
                            startIcon={<HistoryEdu />}
                        >
                            {t('admin_sidebar.audit')}
                        </Button>
                        <Button onClick={() => navigate('/admin/reports')}>{t('reports.back_hub')}</Button>
                    </Stack>
                )}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {from && to && from > to && (
                <Alert severity="warning" sx={{ mb: 2 }}>{t('finance.date_range_error')}</Alert>
            )}

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
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: '1fr 1fr',
                                md: lockedOffice ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                                lg: lockedOffice ? 'repeat(5, 1fr)' : 'repeat(6, 1fr)',
                            },
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
                        {!lockedOffice && (
                            <TextField
                                select
                                size="small"
                                label={t('finance.office')}
                                value={branch}
                                onChange={(event) => setBranch(event.target.value)}
                            >
                                <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                                {offices.map((office) => (
                                    <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>
                                ))}
                            </TextField>
                        )}
                        <TextField
                            select
                            size="small"
                            label={t('workspace_ui.status')}
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            <MenuItem value="void">{t('finance.statuses.void')}</MenuItem>
                            <MenuItem value="reversed">{t('finance.statuses.reversed')}</MenuItem>
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label={t('reports.entry_type')}
                            value={entryType}
                            onChange={(event) => setEntryType(event.target.value)}
                        >
                            <MenuItem value="">{t('workspace_ui.all')}</MenuItem>
                            {ENTRY_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {t(`finance.types.${type}`, { defaultValue: type })}
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
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        borderInlineStart: '4px solid',
                        borderInlineStartColor: 'primary.main',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                            {t('reports.summary.lines')}
                        </Typography>
                        <HistoryEdu fontSize="small" sx={{ color: 'primary.main', opacity: 0.8 }} />
                    </Stack>
                    <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {loading ? '…' : String(filteredTotals.lines)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t('reports.finance_audit_lines_hint')}
                    </Typography>
                </Paper>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        borderInlineStart: '4px solid',
                        borderInlineStartColor: STATUS_COLORS.void,
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                            {t('reports.summary.voided')}
                        </Typography>
                        <Block fontSize="small" sx={{ color: STATUS_COLORS.void, opacity: 0.8 }} />
                    </Stack>
                    <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', color: STATUS_COLORS.void }}>
                        {loading ? '…' : String(filteredTotals.voided)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {moneyLabel(filteredTotals.voidedBase)} · {t('reports.finance_audit_voided_hint')}
                    </Typography>
                </Paper>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        borderInlineStart: '4px solid',
                        borderInlineStartColor: STATUS_COLORS.reversed,
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                            {t('reports.summary.reversed')}
                        </Typography>
                        <SwapHoriz fontSize="small" sx={{ color: STATUS_COLORS.reversed, opacity: 0.8 }} />
                    </Stack>
                    <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', color: STATUS_COLORS.reversed }}>
                        {loading ? '…' : String(filteredTotals.reversed)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {moneyLabel(filteredTotals.reversedBase)} · {t('reports.finance_audit_reversed_hint')}
                    </Typography>
                </Paper>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        borderInlineStart: '4px solid',
                        borderInlineStartColor: 'info.main',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                            {t('reports.finance_audit_base_total')}
                        </Typography>
                        <AccountBalance fontSize="small" sx={{ color: 'info.main', opacity: 0.8 }} />
                    </Stack>
                    <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {loading ? '…' : moneyLabel(filteredTotals.baseAmount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t('reports.finance_audit_base_hint')}
                    </Typography>
                </Paper>
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
                                    <Typography fontWeight={700}>{t('reports.finance_audit_trend')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.finance_audit_trend_hint')}
                                    </Typography>
                                </Box>
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
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={48} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend />
                                            <Bar dataKey="voided" name={t('finance.statuses.void')} fill={STATUS_COLORS.void} stackId="a" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="reversed" name={t('finance.statuses.reversed')} fill={STATUS_COLORS.reversed} stackId="a" radius={[4, 4, 0, 0]} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Paper>

                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('reports.finance_audit_split')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {t('reports.finance_audit_split_hint')}
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
                                                    <Cell key={row.key} fill={STATUS_COLORS[row.key] || '#94a3b8'} />
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

                    {typeRows.length > 0 ? (
                        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2.5 } }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box>
                                    <Typography fontWeight={700}>{t('reports.finance_audit_by_type')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('reports.finance_audit_by_type_hint')}
                                    </Typography>
                                </Box>
                            </Stack>
                            <Box sx={{ width: '100%', height: { xs: 240, md: 280 } }} dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={typeRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={48} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="value" name={t('reports.count')} radius={[4, 4, 0, 0]}>
                                            {typeRows.map((row) => (
                                                <Cell key={row.key} fill={TYPE_COLORS[row.key] || '#94a3b8'} />
                                            ))}
                                        </Bar>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    ) : null}

                    <Box>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('reports.finance_audit_detail')}</Typography>
                        <DataTable
                            columns={tableColumns.filter((col) => col.locked || !hidden.has(col.key))}
                            rows={pageRows}
                            loading={loading}
                            empty={t('reports.empty')}
                            page={page}
                            limit={limit}
                            total={filtered.length}
                            onPageChange={setPage}
                            rowKey="id"
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
