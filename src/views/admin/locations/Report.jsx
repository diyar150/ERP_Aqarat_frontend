import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import HolidayVillageOutlinedIcon from '@mui/icons-material/HolidayVillageOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { loadPdfCompany } from '@/utils/pdfCompany';
import { getMetricColorTokens } from './metricColors.js';

const STATUSES = ['active', 'inactive'];

function SummaryCard({ label, value, sublabel, color = 'city' }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                px: 2,
                py: 1.5,
                flex: '1 1 140px',
                minWidth: 140,
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': (theme) => ({
                    borderColor: getMetricColorTokens(color, theme).hoverBorder,
                }),
            }}
        >
            <Typography variant="caption" color="text.secondary" noWrap display="block">
                {label}
            </Typography>
            <Typography variant="h6" fontWeight={700}>
                {value}
            </Typography>
            {sublabel && (
                <Typography variant="caption" color="text.secondary">
                    {sublabel}
                </Typography>
            )}
        </Paper>
    );
}

function flattenCities(cities, t) {
    const rows = [];
    for (const city of cities || []) {
        rows.push({
            id: `city-${city.id}`,
            name: city.name,
            code: city.code || '—',
            status: t(`locations.statuses.${city.status}`),
            neighborhoods: city.neighborhood_count,
            properties: city.property_count,
            branches: city.branch_count ?? 0,
            parties: city.party_count ?? 0,
            level: 'city',
        });
        for (const neighborhood of city.neighborhoods || []) {
            rows.push({
                id: `nbh-${neighborhood.id}`,
                name: `  ${neighborhood.name}`,
                code: '—',
                status: t(`locations.statuses.${neighborhood.status}`),
                neighborhoods: '—',
                properties: neighborhood.property_count,
                branches: neighborhood.branch_count ?? 0,
                parties: '—',
                level: 'neighborhood',
            });
        }
        if ((city.neighborhoods || []).length === 0) {
            rows.push({
                id: `empty-${city.id}`,
                name: `  ${t('locations.empty_neighborhoods')}`,
                code: '—',
                status: '—',
                neighborhoods: '—',
                properties: '—',
                branches: '—',
                parties: '—',
                level: 'empty',
            });
        }
    }
    return rows;
}

function exportCsv(cities, summary, t) {
    if (!cities || cities.length === 0) return;
    const headers = [
        t('locations.name'),
        t('locations.code'),
        t('workspace_ui.status'),
        t('locations.neighborhoods'),
        t('locations.properties'),
        t('locations.branches'),
        t('locations.parties'),
    ];
    const rows = [];
    for (const city of cities) {
        rows.push([
            `"${(city.name || '').replace(/"/g, '""')}"`,
            `"${(city.code || '').replace(/"/g, '""')}"`,
            `"${t(`locations.statuses.${city.status}`)}"`,
            city.neighborhood_count || 0,
            city.property_count || 0,
            city.branch_count || 0,
            city.party_count || 0,
        ]);
        for (const nbh of city.neighborhoods || []) {
            rows.push([
                `"  ${(nbh.name || '').replace(/"/g, '""')}"`,
                '""',
                `"${t(`locations.statuses.${nbh.status}`)}"`,
                '""',
                nbh.property_count || 0,
                nbh.branch_count || 0,
                '""',
            ]);
        }
    }
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `locations-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export default function Report() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({});
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const requestKey = JSON.stringify([query, status]);
    const loading = loadedKey !== requestKey;

    useEffect(() => {
        let active = true;
        loadPdfCompany().then((brand) => { if (active) setCompany(brand); }).catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        const params = {};
        if (query) params.q = query;
        if (status) params.status = status;
        const key = JSON.stringify([query, status]);
        fetch.get('locations/report', { params })
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
    }, [query, status, t]);

    const summary = report?.summary || {
        cities: 0,
        active: 0,
        inactive: 0,
        neighborhoods: 0,
        properties: 0,
        branches: 0,
        parties: 0,
        unassigned: 0,
    };
    const cities = useMemo(() => report?.cities || [], [report]);
    const rows = useMemo(() => flattenCities(cities, t), [cities, t]);
    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = useMemo(() => [
        query ? `${t('workspace_ui.search')}: ${query}` : '',
        status ? `${t('workspace_ui.status')}: ${t(`locations.statuses.${status}`)}` : '',
    ].filter(Boolean), [query, status, t]);

    const columns = [
        { key: 'name', header: t('locations.name'), width: '28%', render: (row) => row.name },
        { key: 'code', header: t('locations.code'), width: '12%', render: (row) => row.code },
        { key: 'status', header: t('workspace_ui.status'), width: '12%', render: (row) => row.status },
        { key: 'neighborhoods', header: t('locations.neighborhoods'), width: '12%', render: (row) => row.neighborhoods },
        { key: 'properties', header: t('locations.properties'), width: '12%', render: (row) => row.properties },
        { key: 'branches', header: t('locations.branches'), width: '12%', render: (row) => row.branches },
        { key: 'parties', header: t('locations.parties'), width: '12%', render: (row) => row.parties },
    ];

    const pdfDoc = (
        <PdfReportShell
            title={t('locations.report_title')}
            company={company}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={isRTL}
            summary={[
                { label: t('locations.summary_cities'), value: summary.cities },
                { label: t('locations.summary_active'), value: summary.active },
                { label: t('locations.summary_inactive'), value: summary.inactive },
                { label: t('locations.summary_neighborhoods'), value: summary.neighborhoods },
                { label: t('locations.properties'), value: summary.properties },
                { label: t('locations.branches'), value: summary.branches },
                { label: t('locations.parties'), value: summary.parties },
                { label: t('locations.unassigned'), value: summary.unassigned },
            ]}
        >
            <PdfTable columns={columns} rows={rows} isRTL={isRTL} emptyLabel={t('locations.empty')} />
        </PdfReportShell>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }} className="location-report">
            <PageHeader
                title={t('locations.report_title')}
                description={t('locations.report_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackOutlinedIcon />}
                            onClick={() => navigate('/admin/locations/index')}
                        >
                            {t('locations.back')}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownloadOutlinedIcon />}
                            onClick={() => exportCsv(cities, summary, t)}
                            disabled={cities.length === 0}
                        >
                            {t('locations.export_csv')}
                        </Button>
                    </Stack>
                )}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* KPI Summary Row */}
            <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }} useFlexGap flexWrap="wrap">
                <SummaryCard label={t('locations.summary_cities')} value={summary.cities} color="city" />
                <SummaryCard label={t('locations.summary_active')} value={summary.active} color="success" />
                <SummaryCard label={t('locations.summary_inactive')} value={summary.inactive} color="warning" />
                <SummaryCard label={t('locations.summary_neighborhoods')} value={summary.neighborhoods} color="neighborhood" />
                <SummaryCard label={t('locations.properties')} value={summary.properties} color="properties" />
                <SummaryCard label={t('locations.branches')} value={summary.branches} color="branches" />
                <SummaryCard label={t('locations.parties')} value={summary.parties} color="parties" />
                <SummaryCard label={t('locations.unassigned')} value={summary.unassigned} color="error" />
            </Stack>

            {/* Filters */}
            <Box sx={{ mb: 2 }}>
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    searchPlaceholder={t('locations.filter_search_placeholder')}
                    filters={[
                        {
                            key: 'status',
                            label: t('workspace_ui.status'),
                            value: status,
                            onChange: setStatus,
                            options: [
                                { value: '', label: t('locations.all_statuses') },
                                ...STATUSES.map((item) => ({
                                    value: item,
                                    label: t(`locations.statuses.${item}`),
                                })),
                            ],
                        },
                    ]}
                />
            </Box>

            {/* PDF Preview */}
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520, borderRadius: 2 }}>
                <PdfReportPreview
                    loading={loading}
                    ready={!loading}
                    empty={!loading && cities.length === 0}
                    emptyLabel={t('locations.empty')}
                    document={pdfDoc}
                />
            </Paper>

            {!loading && summary.unassigned > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {t('locations.unassigned_hint', { count: summary.unassigned })}
                </Typography>
            )}
        </Box>
    );
}
