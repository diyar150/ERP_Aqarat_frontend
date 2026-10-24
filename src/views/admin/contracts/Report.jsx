import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert,
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { loadPdfCompany } from '@/utils/pdfCompany';
import {
    contractAmount,
    contractNumber,
    contractParties,
    contractPeriod,
    contractWhen,
} from './contractForm.js';
import { contractError } from './contractError.js';
import { getContractColor, getContractMetricCardStyle } from './contractColors.js';

const TYPES = ['sale', 'rent'];
const STATUSES = ['active', 'archived'];
const DEAL_STATUSES = ['draft', 'open', 'completed', 'cancelled'];
const TERMS = ['expiring', 'expired'];

function KpiMetricCard({ type, label, value, isSelected, onClick }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const colors = getContractColor(type, isDark);
    const cardSx = getContractMetricCardStyle(type, isDark, isSelected);

    return (
        <Paper
            variant="outlined"
            onClick={onClick}
            sx={{ ...cardSx, minWidth: 150 }}
        >
            <Typography variant="caption" sx={{ color: colors.iconColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                {value}
            </Typography>
        </Paper>
    );
}

function exportContractsCsv(items, t) {
    if (!items || !items.length) return;
    const headers = [
        `"${t('contracts.number')}"`,
        `"${t('contracts.deal')}"`,
        `"${t('contracts.type')}"`,
        `"${t('contracts.status')}"`,
        `"${t('contracts.property')}"`,
        `"${t('contracts.parties')}"`,
        `"${t('contracts.amount')}"`,
        `"${t('contracts.period')}"`,
        `"${t('contracts.date')}"`,
    ];

    const rows = items.map((row) => {
        const amount = row.transaction_type === 'rent' ? row.rent_amount : row.purchase_price;
        const propTitle = [row.property_reference, row.property_title].filter(Boolean).join(' · ');
        const partiesStr = (row.parties || [])
            .map((p) => `${t(`transactions.roles.${p.role}`, { defaultValue: p.role })}: ${p.name}`)
            .join('; ');
        const period = row.transaction_type === 'rent'
            ? `${contractWhen(row.period_start)} – ${contractWhen(row.period_end)}`
            : '';

        return [
            `"${contractNumber(row.id)}"`,
            `"${(row.reference_number || '').replace(/"/g, '""')}"`,
            `"${t(`contracts.${row.transaction_type}`, { defaultValue: row.transaction_type })}"`,
            `"${t(`contracts.${row.status}`, { defaultValue: row.status })}"`,
            `"${propTitle.replace(/"/g, '""')}"`,
            `"${partiesStr.replace(/"/g, '""')}"`,
            `"${amount != null && amount !== '' ? amount : ''}"`,
            `"${period.replace(/"/g, '""')}"`,
            `"${contractWhen(row.created_at)}"`,
        ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contracts-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function Report() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params] = useSearchParams();
    const [query, setQuery] = useState(params.get('q') || '');
    const [type, setType] = useState(params.get('type') || '');
    const [status, setStatus] = useState(params.get('status') || '');
    const [deal, setDeal] = useState(params.get('deal') || '');
    const [term, setTerm] = useState(params.get('term') || '');
    const [branch, setBranch] = useState(params.get('branch') || '');
    const [from, setFrom] = useState(params.get('from') || '');
    const [to, setTo] = useState(params.get('to') || '');
    const [offices, setOffices] = useState([]);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({});
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);

    const requestKey = JSON.stringify([query, type, status, deal, term, branch, from, to]);
    const loading = loadedKey !== requestKey;

    useEffect(() => {
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => {});
        loadPdfCompany().then((brand) => { if (active) setCompany(brand); }).catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        const request = {};
        if (query) request.q = query;
        if (type) request.type = type;
        if (status) request.status = status;
        if (deal) request.deal = deal;
        if (term) request.term = term;
        if (branch) request.branch = branch;
        if (from) request.from = from;
        if (to) request.to = to;
        const key = JSON.stringify([query, type, status, deal, term, branch, from, to]);
        fetch.get('documents/contracts/report', { params: request })
            .then((res) => {
                if (!active) return;
                setReport(res.data?.data || null);
                setError('');
                setLoadedKey(key);
            })
            .catch((err) => {
                if (!active) return;
                setError(contractError(err, t));
                setLoadedKey(key);
            });
        return () => { active = false; };
    }, [query, type, status, deal, term, branch, from, to, t]);

    const summary = report?.summary || { contracts: 0, sales: 0, rents: 0, active: 0, archived: 0, expiring: 0, expired: 0 };
    const items = report?.items || [];
    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = useMemo(() => [
        query ? `${t('workspace_ui.search')}: ${query}` : '',
        type ? `${t('contracts.type')}: ${t(`contracts.${type}`)}` : '',
        status ? `${t('contracts.status')}: ${t(`contracts.${status}`)}` : '',
        deal ? `${t('contracts.deal_status')}: ${t(`transactions.statuses.${deal}`)}` : '',
        term ? `${t('contracts.term')}: ${t(`contracts.${term}`)}` : '',
        branch ? `${t('contracts.branch')}: ${offices.find((row) => String(row.id) === String(branch))?.name || branch}` : '',
        from ? `${t('contracts.from')}: ${from}` : '',
        to ? `${t('contracts.to')}: ${to}` : '',
    ].filter(Boolean), [query, type, status, deal, term, branch, from, to, offices, t]);

    const columns = [
        { key: 'number', header: t('contracts.number'), width: '10%', render: (row) => contractNumber(row.id) },
        { key: 'deal', header: t('contracts.deal'), width: '12%', render: (row) => row.reference_number || '—' },
        { key: 'type', header: t('contracts.type'), width: '8%', render: (row) => t(`contracts.${row.transaction_type}`) },
        { key: 'status', header: t('contracts.status'), width: '9%', render: (row) => t(`contracts.${row.status}`) },
        { key: 'property', header: t('contracts.property'), width: '16%', render: (row) => [row.property_reference, row.property_title].filter(Boolean).join(' · ') || '—' },
        { key: 'parties', header: t('contracts.parties'), width: '16%', render: (row) => contractParties(row, t) },
        { key: 'amount', header: t('contracts.amount'), width: '11%', render: (row) => contractAmount(row) },
        { key: 'period', header: t('contracts.period'), width: '10%', render: (row) => contractPeriod(row) },
        { key: 'date', header: t('contracts.date'), width: '8%', render: (row) => contractWhen(row.created_at) },
    ];

    const pdfDoc = (
        <PdfReportShell
            title={t('contracts.report_title')}
            company={company}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={isRTL}
            summary={[
                { label: t('contracts.summary_contracts'), value: summary.contracts },
                { label: t('contracts.summary_sales'), value: summary.sales },
                { label: t('contracts.summary_rents'), value: summary.rents },
                { label: t('contracts.active'), value: summary.active },
                { label: t('contracts.archived'), value: summary.archived },
                { label: t('contracts.expiring'), value: summary.expiring || 0 },
            ]}
        >
            <PdfTable columns={columns} rows={items} isRTL={isRTL} emptyLabel={t('contracts.empty')} />
        </PdfReportShell>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <PageHeader
                title={t('contracts.report_title')}
                description={t('contracts.report_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            onClick={() => exportContractsCsv(items, t)}
                            disabled={loading || items.length === 0}
                        >
                            {t('contracts.export_csv') || 'Export CSV'}
                        </Button>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/admin/contracts/index')}
                        >
                            {t('contracts.back')}
                        </Button>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* KPI Cards Strip */}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', width: '100%' }}>
                <KpiMetricCard
                    type="total"
                    label={t('contracts.summary_contracts')}
                    value={summary.contracts}
                    isSelected={!type && !status && !term}
                    onClick={() => { setType(''); setStatus(''); setTerm(''); }}
                />
                <KpiMetricCard
                    type="sale"
                    label={t('contracts.summary_sales')}
                    value={summary.sales}
                    isSelected={type === 'sale'}
                    onClick={() => setType(type === 'sale' ? '' : 'sale')}
                />
                <KpiMetricCard
                    type="rent"
                    label={t('contracts.summary_rents')}
                    value={summary.rents}
                    isSelected={type === 'rent'}
                    onClick={() => setType(type === 'rent' ? '' : 'rent')}
                />
                <KpiMetricCard
                    type="active"
                    label={t('contracts.active')}
                    value={summary.active}
                    isSelected={status === 'active'}
                    onClick={() => setStatus(status === 'active' ? '' : 'active')}
                />
                <KpiMetricCard
                    type="expiring"
                    label={t('contracts.expiring')}
                    value={summary.expiring || 0}
                    isSelected={term === 'expiring'}
                    onClick={() => setTerm(term === 'expiring' ? '' : 'expiring')}
                />
                <KpiMetricCard
                    type="archived"
                    label={t('contracts.archived')}
                    value={summary.archived}
                    isSelected={status === 'archived'}
                    onClick={() => setStatus(status === 'archived' ? '' : 'archived')}
                />
            </Stack>

            <Box sx={{ mb: 2 }}>
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    filters={[
                        {
                            key: 'type',
                            label: t('contracts.type'),
                            value: type,
                            allLabel: t('contracts.all_types'),
                            onChange: setType,
                            options: TYPES.map((item) => ({ value: item, label: t(`contracts.${item}`) })),
                        },
                        {
                            key: 'status',
                            label: t('contracts.status'),
                            value: status,
                            allLabel: t('contracts.all_statuses'),
                            onChange: setStatus,
                            options: STATUSES.map((item) => ({ value: item, label: t(`contracts.${item}`) })),
                        },
                        {
                            key: 'deal',
                            label: t('contracts.deal_status'),
                            value: deal,
                            allLabel: t('contracts.all_statuses'),
                            onChange: setDeal,
                            options: DEAL_STATUSES.map((item) => ({ value: item, label: t(`transactions.statuses.${item}`) })),
                        },
                        {
                            key: 'term',
                            label: t('contracts.term'),
                            value: term,
                            allLabel: t('contracts.all_terms'),
                            onChange: setTerm,
                            options: TERMS.map((item) => ({ value: item, label: t(`contracts.${item}`) })),
                        },
                        ...(offices.length ? [{
                            key: 'branch',
                            label: t('contracts.branch'),
                            value: branch,
                            allLabel: t('contracts.all_branches'),
                            onChange: setBranch,
                            options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                        }] : []),
                        { key: 'from', type: 'date', label: t('contracts.from'), value: from, onChange: setFrom },
                        { key: 'to', type: 'date', label: t('contracts.to'), value: to, onChange: setTo },
                    ]}
                />
            </Box>
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520, borderRadius: 2 }}>
                <PdfReportPreview
                    loading={loading}
                    ready={!loading}
                    empty={!loading && items.length === 0}
                    emptyLabel={t('contracts.empty')}
                    document={pdfDoc}
                />
            </Paper>
        </Box>
    );
}
