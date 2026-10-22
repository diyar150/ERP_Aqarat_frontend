import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { loadPdfCompany } from '@/utils/pdfCompany';
import { contractAmount, contractError, contractNumber, contractParties, contractPeriod, contractWhen } from './contractForm.js';

const TYPES = ['sale', 'rent'];
const STATUSES = ['active', 'archived'];
const DEAL_STATUSES = ['draft', 'open', 'completed', 'cancelled'];
const TERMS = ['expiring', 'expired'];

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: '1 1 140px', minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
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
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('contracts.report_title')}
                description={t('contracts.report_hint')}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => navigate('/admin/contracts/index')}>{t('contracts.back')}</Button>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <SummaryCard label={t('contracts.summary_contracts')} value={summary.contracts} />
                <SummaryCard label={t('contracts.summary_sales')} value={summary.sales} />
                <SummaryCard label={t('contracts.summary_rents')} value={summary.rents} />
                <SummaryCard label={t('contracts.active')} value={summary.active} />
                <SummaryCard label={t('contracts.archived')} value={summary.archived} />
                <SummaryCard label={t('contracts.expiring')} value={summary.expiring || 0} />
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
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520 }}>
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
