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
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { PARTY_ROLES, PIPELINE_STAGES, partyWhen } from './partyForm.js';

const KINDS = ['person', 'organization'];

function exportCsv(items, t) {
    if (!items || items.length === 0) return;
    const headers = [
        t('parties.name'),
        t('parties.kind'),
        t('parties.roles_label'),
        t('parties.pipeline_stage', { defaultValue: 'Stage' }),
        t('parties.phone'),
        t('parties.email'),
        t('parties.branch'),
        t('parties.city'),
        t('parties.created'),
    ];
    const rows = items.map((p) => [
        `"${(p.display_name || '').replace(/"/g, '""')}"`,
        `"${t(p.party_kind === 'organization' ? 'parties.organization' : 'parties.person')}"`,
        `"${(p.roles || []).map((r) => t(`parties.roles.${r}`, r)).join(', ')}"`,
        `"${p.pipeline_stage ? t(`parties.pipeline_stages.${p.pipeline_stage}`, p.pipeline_stage) : ''}"`,
        `"${(p.phone || '').replace(/"/g, '""')}"`,
        `"${(p.email || '').replace(/"/g, '""')}"`,
        `"${(p.branch_name || '').replace(/"/g, '""')}"`,
        `"${(p.city_name || '').replace(/"/g, '""')}"`,
        `"${partyWhen(p.created_at).slice(0, 10)}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `parties-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: '1 1 140px', minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function roleLabel(roles, t) {
    if (!roles?.length) return '—';
    return roles.map((name) => t(`parties.roles.${name}`, name)).join(', ');
}

export default function Report() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params] = useSearchParams();
    const [query, setQuery] = useState(params.get('q') || '');
    const [kind, setKind] = useState(params.get('kind') || '');
    const [role, setRole] = useState(params.get('role') || '');
    const [stage, setStage] = useState(params.get('stage') || '');
    const [branch, setBranch] = useState(params.get('branch') || '');
    const [city, setCity] = useState(params.get('city') || '');
    const [state, setState] = useState(params.get('state') === 'archived' ? 'archived' : '');
    const [offices, setOffices] = useState([]);
    const [cities, setCities] = useState([]);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({
        supplier_name: DEFAULT_SUPPLIER_NAME,
        address: '',
    });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);

    const requestKey = JSON.stringify([query, kind, role, stage, branch, city, state]);
    const loading = loadedKey !== requestKey || !brandReady;

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('branches/options'),
            fetch.get('locations/catalog'),
        ]).then(([branchRes, cityRes]) => {
            if (!active) return;
            setOffices(branchRes.data?.data?.branches || []);
            setCities(cityRes.data?.data?.cities || []);
        }).catch(() => {});
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
                if (!active) return;
                setCompany({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
            })
            .finally(() => {
                if (active) setBrandReady(true);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        const request = {};
        if (query) request.q = query;
        if (kind) request.kind = kind;
        if (role) request.role = role;
        if (stage) request.stage = stage;
        if (branch) request.branch = branch;
        if (city) request.city = city;
        if (state) request.state = state;
        const key = JSON.stringify([query, kind, role, stage, branch, city, state]);
        fetch.get('parties/report', { params: request })
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
    }, [query, kind, role, stage, branch, city, state, t]);

    const summary = report?.summary || {
        parties: 0,
        persons: 0,
        organizations: 0,
        leads: 0,
        clients: 0,
        owners: 0,
    };
    const items = report?.items || [];
    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = useMemo(() => [
        query ? `${t('workspace_ui.search')}: ${query}` : '',
        kind ? `${t('parties.kind')}: ${t(`parties.${kind}`)}` : '',
        role ? `${t('parties.role')}: ${t(`parties.roles.${role}`)}` : '',
        stage ? `${t('parties.pipeline_stage', { defaultValue: 'Stage' })}: ${t(`parties.pipeline_stages.${stage}`, t(`reports_suite.${stage}`, stage))}` : '',
        branch ? `${t('parties.branch')}: ${offices.find((row) => String(row.id) === String(branch))?.name || branch}` : '',
        city ? `${t('parties.city')}: ${cities.find((row) => String(row.id) === String(city))?.name || city}` : '',
        state === 'archived' ? `${t('workspace_ui.status')}: ${t('parties.archived')}` : '',
    ].filter(Boolean), [query, kind, role, stage, branch, city, state, offices, cities, t]);

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const columns = [
        { key: 'name', header: t('parties.name'), width: '18%', render: (row) => row.display_name || '—' },
        { key: 'kind', header: t('parties.kind'), width: '10%', render: (row) => t(row.party_kind === 'organization' ? 'parties.organization' : 'parties.person') },
        { key: 'phone', header: t('parties.phone'), width: '12%', render: (row) => row.phone || '—' },
        { key: 'email', header: t('parties.email'), width: '14%', render: (row) => row.email || '—' },
        { key: 'roles', header: t('parties.role'), width: '16%', render: (row) => roleLabel(row.roles, t) },
        { key: 'branch', header: t('parties.branch'), width: '12%', render: (row) => row.branch_name || '—' },
        { key: 'city', header: t('parties.city'), width: '10%', render: (row) => row.city_name || '—' },
        { key: 'date', header: t('parties.created'), width: '8%', render: (row) => partyWhen(row.created_at).slice(0, 10) },
    ];

    const pdfDoc = (
        <PdfReportShell
            title={t('parties.report_title')}
            company={footerCompany}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('workspace.address', { defaultValue: 'Address' })}
            isRTL={isRTL}
            summary={[
                { label: t('parties.summary_parties'), value: summary.parties },
                { label: t('parties.summary_people'), value: summary.persons },
                { label: t('parties.summary_organizations'), value: summary.organizations },
                { label: t('parties.summary_leads'), value: summary.leads },
                { label: t('parties.roles.client'), value: summary.clients },
                { label: t('parties.roles.owner'), value: summary.owners },
            ]}
        >
            <PdfTable columns={columns} rows={items} isRTL={isRTL} emptyLabel={t('parties.empty')} />
        </PdfReportShell>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
            <PageHeader
                title={t('parties.report_title')}
                description={t('parties.report_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadOutlinedIcon />}
                            onClick={() => exportCsv(items, t)}
                            disabled={items.length === 0}
                        >
                            {t('parties.export_csv', { defaultValue: 'Export CSV' })}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackOutlinedIcon />}
                            onClick={() => navigate('/admin/parties/index')}
                        >
                            {t('parties.back')}
                        </Button>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <SummaryCard label={t('parties.summary_parties')} value={summary.parties} />
                <SummaryCard label={t('parties.summary_people')} value={summary.persons} />
                <SummaryCard label={t('parties.summary_organizations')} value={summary.organizations} />
                <SummaryCard label={t('parties.summary_leads')} value={summary.leads} />
                <SummaryCard label={t('parties.roles.client')} value={summary.clients} />
                <SummaryCard label={t('parties.roles.owner')} value={summary.owners} />
            </Stack>
            <Box sx={{ mb: 2 }}>
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    filters={[
                        {
                            key: 'kind',
                            label: t('parties.kind'),
                            value: kind,
                            allLabel: t('parties.all_kinds'),
                            onChange: setKind,
                            options: KINDS.map((item) => ({ value: item, label: t(`parties.${item}`) })),
                        },
                        {
                            key: 'role',
                            label: t('parties.role'),
                            value: role,
                            allLabel: t('parties.all_roles'),
                            onChange: setRole,
                            options: PARTY_ROLES.map((name) => ({ value: name, label: t(`parties.roles.${name}`) })),
                        },
                        {
                            key: 'stage',
                            label: t('parties.pipeline_stage', { defaultValue: 'Stage' }),
                            value: stage,
                            allLabel: t('parties.all_stages', { defaultValue: 'All stages' }),
                            onChange: setStage,
                            options: PIPELINE_STAGES.map((s) => ({
                                value: s,
                                label: t(`parties.pipeline_stages.${s}`, t(`reports_suite.${s}`, s)),
                            })),
                        },
                        ...(offices.length ? [{
                            key: 'branch',
                            label: t('parties.branch'),
                            value: branch,
                            allLabel: t('parties.all_branches'),
                            onChange: setBranch,
                            options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                        }] : []),
                        ...(cities.length ? [{
                            key: 'city',
                            label: t('parties.city'),
                            value: city,
                            allLabel: t('parties.all_cities'),
                            onChange: setCity,
                            options: cities.map((row) => ({ value: String(row.id), label: row.name })),
                        }] : []),
                        {
                            key: 'state',
                            label: t('parties.list'),
                            value: state,
                            allLabel: t('parties.active'),
                            onChange: setState,
                            options: [{ value: 'archived', label: t('parties.archived') }],
                        },
                    ]}
                />
            </Box>
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520 }}>
                <PdfReportPreview
                    loading={loading}
                    ready={!loading && brandReady}
                    empty={!loading && brandReady && items.length === 0}
                    emptyLabel={t('parties.empty')}
                    document={pdfDoc}
                />
            </Paper>
        </Box>
    );
}
