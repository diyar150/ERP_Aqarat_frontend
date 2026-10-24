import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Paper,
    Stack,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import {
    HandshakeOutlined as DealsIcon,
    MonetizationOnOutlined as SaleIcon,
    KeyOutlined as RentIcon,
    PendingActionsOutlined as OpenIcon,
    AlarmOutlined as ExpiringIcon,
    FileDownloadOutlined as ExportIcon,
} from '@mui/icons-material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { useAuthStore } from '@/store/authStore';
import { loadPdfCompany } from '@/utils/pdfCompany';
import { dealAmount, dealParties, dealPeriod, dealWhen } from './transactionForm.js';
import { getTransactionPalette } from './transactionColors.js';

const TYPES = ['sale', 'rent'];
const DESKS = ['working', 'closed'];
const TERMS = ['expiring', 'expired'];

function ReportMetricCard({
    paletteKey,
    label,
    value,
    icon: IconComponent,
}) {
    const theme = useTheme();
    const colors = getTransactionPalette(theme, paletteKey);

    return (
        <Card
            variant="outlined"
            sx={{
                flex: '1 1 160px',
                minWidth: 150,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: colors.borderColor,
                backgroundColor: colors.bgColor,
                boxShadow: 'none',
            }}
        >
            <CardContent sx={{ p: '14px 16px !important' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: theme.palette.mode === 'dark' ? 'text.secondary' : 'text.primary',
                                display: 'block',
                                noWrap: true,
                            }}
                        >
                            {label}
                        </Typography>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                mt: 0.25,
                                color: colors.iconColor,
                                lineHeight: 1.2,
                            }}
                        >
                            {value}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(colors.iconColor, theme.palette.mode === 'dark' ? 0.2 : 0.12),
                            color: colors.iconColor,
                            flexShrink: 0,
                        }}
                    >
                        <IconComponent sx={{ fontSize: 22 }} />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function exportReportCsv(items, t) {
    if (!items || items.length === 0) return;
    const headers = [
        t('transactions.reference', { defaultValue: 'Reference' }),
        t('transactions.property', { defaultValue: 'Property' }),
        t('transactions.type', { defaultValue: 'Type' }),
        t('workspace_ui.status', { defaultValue: 'Status' }),
        t('transactions.value', { defaultValue: 'Amount' }),
        t('transactions.currency', { defaultValue: 'Currency' }),
        t('transactions.parties', { defaultValue: 'Parties' }),
        t('transactions.period_start', { defaultValue: 'Period Start' }),
        t('transactions.period_end', { defaultValue: 'Period End' }),
        t('transactions.branch', { defaultValue: 'Branch' }),
        t('transactions.agent', { defaultValue: 'Agent' }),
        t('transactions.date', { defaultValue: 'Created' }),
    ];

    const rows = items.map((deal) => {
        const partiesText = (deal.parties || []).map((p) => `${p.name || ''} (${p.role || ''})`).join('; ');
        const amount = deal.transaction_type === 'sale' ? deal.purchase_price : deal.rent_amount;
        return [
            `"${(deal.reference_number || '').replace(/"/g, '""')}"`,
            `"${([deal.property_reference, deal.property_title].filter(Boolean).join(' - ')).replace(/"/g, '""')}"`,
            `"${t(`transactions.types.${deal.transaction_type}`, { defaultValue: deal.transaction_type })}"`,
            `"${t(`transactions.statuses.${deal.status}`, { defaultValue: deal.status })}"`,
            `"${amount != null && amount !== '' ? amount : ''}"`,
            `"${deal.currency_code || ''}"`,
            `"${partiesText.replace(/"/g, '""')}"`,
            `"${deal.period_start || ''}"`,
            `"${deal.period_end || ''}"`,
            `"${(deal.branch_name || '').replace(/"/g, '""')}"`,
            `"${(deal.agent_name || '').replace(/"/g, '""')}"`,
            `"${dealWhen(deal.created_at)}"`,
        ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export default function Report() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const user = useAuthStore((state) => state.user);
    const lockedOffice = Boolean(user?.branch_id);
    const [params] = useSearchParams();
    const [query, setQuery] = useState(params.get('q') || '');
    const [type, setType] = useState(params.get('type') || '');
    const [desk, setDesk] = useState(params.get('desk') || '');
    const [status, setStatus] = useState(params.get('status') || '');
    const [term, setTerm] = useState(params.get('term') || '');
    const [branch, setBranch] = useState(params.get('branch') || '');
    const [from, setFrom] = useState(params.get('from') || '');
    const [to, setTo] = useState(params.get('to') || '');
    const [offices, setOffices] = useState([]);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({});
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);

    const requestKey = JSON.stringify([query, type, desk, status, term, branch, from, to]);
    const loading = loadedKey !== requestKey;
    const statuses = desk === 'closed'
        ? ['completed', 'cancelled']
        : desk === 'working'
            ? ['draft', 'open']
            : ['draft', 'open', 'completed', 'cancelled'];

    useEffect(() => {
        let active = true;
        if (!lockedOffice) {
            fetch.get('branches/options')
                .then((res) => {
                    if (active) setOffices(res.data?.data?.branches || []);
                })
                .catch(() => {});
        }
        loadPdfCompany().then((brand) => { if (active) setCompany(brand); }).catch(() => {});
        return () => { active = false; };
    }, [lockedOffice]);

    useEffect(() => {
        let active = true;
        const request = {};
        if (query) request.q = query;
        if (type) request.transaction_type = type;
        if (desk) request.desk = desk;
        if (status) request.status = status;
        if (term) request.term = term;
        if (branch) request.branch = branch;
        if (from) request.from = from;
        if (to) request.to = to;
        const key = JSON.stringify([query, type, desk, status, term, branch, from, to]);
        fetch.get('transactions/report', { params: request })
            .then((res) => {
                if (!active) return;
                setReport(res.data?.data || null);
                setError('');
                setLoadedKey(key);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.response?.data?.error?.message || t('login.error'));
                setLoadedKey(key);
            });
        return () => { active = false; };
    }, [query, type, desk, status, term, branch, from, to, t]);

    const summary = report?.summary || { deals: 0, sales: 0, rents: 0, open: 0, expiring: 0 };
    const items = report?.items || [];
    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = useMemo(() => [
        query ? `${t('workspace_ui.search')}: ${query}` : '',
        type ? `${t('transactions.type')}: ${t(`transactions.types.${type}`)}` : '',
        desk ? `${t('transactions.desk')}: ${t(`transactions.${desk}`)}` : '',
        status ? `${t('workspace_ui.status')}: ${t(`transactions.statuses.${status}`)}` : '',
        term ? `${t('transactions.term')}: ${t(`transactions.${term}`)}` : '',
        branch ? `${t('transactions.branch')}: ${offices.find((row) => String(row.id) === String(branch))?.name || branch}` : '',
        from ? `${t('transactions.from')}: ${from}` : '',
        to ? `${t('transactions.to')}: ${to}` : '',
    ].filter(Boolean), [query, type, desk, status, term, branch, from, to, offices, t]);

    const columns = [
        { key: 'reference', header: t('transactions.reference'), width: '12%', render: (row) => row.reference_number },
        { key: 'property', header: t('transactions.property'), width: '16%', render: (row) => [row.property_reference, row.property_title].filter(Boolean).join(' · ') || '—' },
        { key: 'type', header: t('transactions.type'), width: '8%', render: (row) => t(`transactions.types.${row.transaction_type}`) },
        { key: 'status', header: t('workspace_ui.status'), width: '9%', render: (row) => t(`transactions.statuses.${row.status}`) },
        { key: 'parties', header: t('transactions.parties'), width: '16%', render: (row) => dealParties(row, t) },
        { key: 'value', header: t('transactions.value'), width: '12%', render: (row) => dealAmount(row) },
        { key: 'period', header: t('transactions.period'), width: '11%', render: (row) => dealPeriod(row) },
        { key: 'branch', header: t('transactions.branch'), width: '10%', render: (row) => row.branch_name || '—' },
        { key: 'date', header: t('transactions.date'), width: '6%', render: (row) => dealWhen(row.created_at) },
    ];

    const pdfDoc = (
        <PdfReportShell
            title={t('transactions.report_title')}
            company={company}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={isRTL}
            summary={[
                { label: t('transactions.summary_deals'), value: summary.deals },
                { label: t('transactions.summary_sales'), value: summary.sales },
                { label: t('transactions.summary_rents'), value: summary.rents },
                { label: t('transactions.statuses.open'), value: summary.open },
                { label: t('transactions.expiring'), value: summary.expiring || 0 },
            ]}
        >
            <PdfTable columns={columns} rows={items} isRTL={isRTL} emptyLabel={t('transactions.empty')} />
        </PdfReportShell>
    );

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                minHeight: '100%',
            }}
        >
            <PageHeader
                title={t('transactions.report_title')}
                description={t('transactions.report_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<ExportIcon />}
                            onClick={() => exportReportCsv(items, t)}
                            disabled={!items || items.length === 0}
                        >
                            {t('transactions.export_csv', { defaultValue: 'Export CSV' })}
                        </Button>
                        <Button onClick={() => navigate('/admin/transactions/index')}>{t('transactions.back')}</Button>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <ReportMetricCard paletteKey="total" label={t('transactions.summary_deals')} value={summary.deals} icon={DealsIcon} />
                <ReportMetricCard paletteKey="sale" label={t('transactions.summary_sales')} value={summary.sales} icon={SaleIcon} />
                <ReportMetricCard paletteKey="rent" label={t('transactions.summary_rents')} value={summary.rents} icon={RentIcon} />
                <ReportMetricCard paletteKey="open" label={t('transactions.statuses.open')} value={summary.open} icon={OpenIcon} />
                <ReportMetricCard paletteKey="expiring" label={t('transactions.expiring')} value={summary.expiring || 0} icon={ExpiringIcon} />
            </Stack>
            <Box sx={{ mb: 2 }}>
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    filters={[
                        {
                            key: 'type',
                            label: t('transactions.type'),
                            value: type,
                            allLabel: t('transactions.all_types'),
                            onChange: setType,
                            options: TYPES.map((item) => ({ value: item, label: t(`transactions.types.${item}`) })),
                        },
                        {
                            key: 'desk',
                            label: t('transactions.desk'),
                            value: desk,
                            allLabel: t('transactions.all_statuses'),
                            onChange: (value) => {
                                setDesk(value);
                                setStatus('');
                            },
                            options: DESKS.map((item) => ({ value: item, label: t(`transactions.${item}`) })),
                        },
                        {
                            key: 'status',
                            label: t('workspace_ui.status'),
                            value: status,
                            allLabel: t('transactions.all_statuses'),
                            onChange: setStatus,
                            options: statuses.map((item) => ({ value: item, label: t(`transactions.statuses.${item}`) })),
                        },
                        {
                            key: 'term',
                            label: t('transactions.term'),
                            value: term,
                            allLabel: t('transactions.all_terms'),
                            onChange: setTerm,
                            options: TERMS.map((item) => ({ value: item, label: t(`transactions.${item}`) })),
                        },
                        ...(!lockedOffice && offices.length ? [{
                            key: 'branch',
                            label: t('transactions.branch'),
                            value: branch,
                            allLabel: t('transactions.all_branches'),
                            onChange: setBranch,
                            options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                        }] : []),
                        { key: 'from', type: 'date', label: t('transactions.from'), value: from, onChange: setFrom },
                        { key: 'to', type: 'date', label: t('transactions.to'), value: to, onChange: setTo },
                    ]}
                />
            </Box>
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520 }}>
                <PdfReportPreview
                    loading={loading}
                    ready={!loading}
                    empty={!loading && items.length === 0}
                    emptyLabel={t('transactions.empty')}
                    document={pdfDoc}
                />
            </Paper>
        </Box>
    );
}
