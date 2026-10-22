import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { formatPrice, currencyLabel } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

const TYPES = ['apartment', 'house', 'villa', 'land', 'commercial', 'office', 'warehouse', 'building'];
const PURPOSES = ['sale', 'rent', 'sale_or_rent'];
const STATUSES = ['draft', 'available', 'reserved', 'under_contract', 'sold', 'rented', 'inactive', 'archived'];

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: '1 1 140px', minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function propertyWhen(value) {
    if (!value) return '—';
    return String(value).replace('T', ' ').slice(0, 10);
}

function propertyPrice(row, t) {
    if (row.price == null || row.price === '') return t('properties.no_price');
    return `${formatPrice(row.price)} ${currencyLabel(row.currency_code)}`.trim();
}

export default function Report() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params] = useSearchParams();
    const [query, setQuery] = useState(params.get('q') || '');
    const [status, setStatus] = useState(params.get('status') || '');
    const [purpose, setPurpose] = useState(params.get('purpose') || '');
    const [propertyType, setPropertyType] = useState(params.get('property_type') || '');
    const [branch, setBranch] = useState(params.get('branch') || '');
    const [city, setCity] = useState(params.get('city') || '');
    const [neighborhood, setNeighborhood] = useState(params.get('neighborhood') || '');
    const [state, setState] = useState(params.get('state') === 'archived' ? 'archived' : '');
    const [offices, setOffices] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({
        supplier_name: DEFAULT_SUPPLIER_NAME,
        address: '',
    });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);

    const requestKey = JSON.stringify([query, status, purpose, propertyType, branch, city, neighborhood, state]);
    const loading = loadedKey !== requestKey || !brandReady;
    const neighborhoodOptions = useMemo(() => {
        const selected = catalog.find((item) => String(item.id) === String(city));
        return (selected?.neighborhoods || []).map((item) => ({ value: String(item.id), label: item.name }));
    }, [catalog, city]);

    useEffect(() => {
        let active = true;
        Promise.all([fetch.get('branches/options'), fetch.get('locations/catalog')])
            .then(([officesRes, placesRes]) => {
                if (!active) return;
                setOffices(officesRes.data?.data?.branches || []);
                setCatalog(placesRes.data?.data?.cities || []);
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
        if (status) request.status = status;
        if (purpose) request.purpose = purpose;
        if (propertyType) request.property_type = propertyType;
        if (branch) request.branch = branch;
        if (city) request.city = city;
        if (neighborhood) request.neighborhood = neighborhood;
        if (state) request.state = state;
        const key = JSON.stringify([query, status, purpose, propertyType, branch, city, neighborhood, state]);
        fetch.get('properties/report', { params: request })
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
    }, [query, status, purpose, propertyType, branch, city, neighborhood, state, t]);

    const summary = report?.summary || {
        properties: 0,
        available: 0,
        reserved: 0,
        under_contract: 0,
        sold: 0,
        rented: 0,
        draft: 0,
        for_sale: 0,
        for_rent: 0,
    };
    const items = report?.items || [];
    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const filterLines = useMemo(() => [
        query ? `${t('workspace_ui.search')}: ${query}` : '',
        status ? `${t('workspace_ui.status')}: ${t(`properties.statuses.${status}`)}` : '',
        purpose ? `${t('properties.purpose')}: ${t(`properties.purposes.${purpose}`)}` : '',
        propertyType ? `${t('properties.type')}: ${t(`properties.types.${propertyType}`)}` : '',
        branch ? `${t('properties.branch')}: ${offices.find((row) => String(row.id) === String(branch))?.name || branch}` : '',
        city ? `${t('properties.city')}: ${catalog.find((row) => String(row.id) === String(city))?.name || city}` : '',
        neighborhood ? `${t('properties.neighborhood')}: ${neighborhoodOptions.find((row) => row.value === String(neighborhood))?.label || neighborhood}` : '',
        state === 'archived' ? `${t('workspace_ui.status')}: ${t('properties.archived')}` : '',
    ].filter(Boolean), [query, status, purpose, propertyType, branch, city, neighborhood, state, offices, catalog, neighborhoodOptions, t]);

    const columns = [
        { key: 'reference', header: t('properties.reference'), width: '11%', render: (row) => row.reference_number || '—' },
        { key: 'title', header: t('properties.name'), width: '18%', render: (row) => row.title || '—' },
        { key: 'type', header: t('properties.type'), width: '10%', render: (row) => t(`properties.types.${row.property_type}`) },
        { key: 'purpose', header: t('properties.purpose'), width: '10%', render: (row) => t(`properties.purposes.${row.purpose}`) },
        { key: 'status', header: t('workspace_ui.status'), width: '11%', render: (row) => t(`properties.statuses.${row.status}`) },
        { key: 'price', header: t('properties.price'), width: '12%', render: (row) => propertyPrice(row, t) },
        { key: 'city', header: t('properties.city'), width: '10%', render: (row) => row.city || '—' },
        { key: 'branch', header: t('properties.branch'), width: '10%', render: (row) => row.branch_name || '—' },
        { key: 'date', header: t('properties.created'), width: '8%', render: (row) => propertyWhen(row.created_at) },
    ];

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t('properties.report_title')}
            company={footerCompany}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('workspace.address', { defaultValue: 'Address' })}
            isRTL={isRTL}
            summary={[
                { label: t('properties.summary_properties'), value: summary.properties },
                { label: t('properties.statuses.available'), value: summary.available },
                { label: t('properties.statuses.reserved'), value: summary.reserved },
                { label: t('properties.statuses.under_contract'), value: summary.under_contract },
                { label: t('properties.statuses.sold'), value: summary.sold },
                { label: t('properties.statuses.rented'), value: summary.rented },
            ]}
        >
            <PdfTable columns={columns} rows={items} isRTL={isRTL} emptyLabel={t('properties.empty')} />
        </PdfReportShell>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('properties.report_title')}
                description={t('properties.report_hint')}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => navigate('/admin/properties/index')}>{t('properties.back')}</Button>
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <SummaryCard label={t('properties.summary_properties')} value={summary.properties} />
                <SummaryCard label={t('properties.statuses.available')} value={summary.available} />
                <SummaryCard label={t('properties.statuses.reserved')} value={summary.reserved} />
                <SummaryCard label={t('properties.statuses.under_contract')} value={summary.under_contract} />
                <SummaryCard label={t('properties.statuses.sold')} value={summary.sold} />
                <SummaryCard label={t('properties.statuses.rented')} value={summary.rented} />
            </Stack>
            <Box sx={{ mb: 2 }}>
                <ListToolbar
                    search={query}
                    onSearch={setQuery}
                    filters={[
                        {
                            key: 'status',
                            label: t('workspace_ui.status'),
                            value: status,
                            allLabel: t('properties.all_statuses'),
                            onChange: setStatus,
                            options: STATUSES.map((item) => ({ value: item, label: t(`properties.statuses.${item}`) })),
                        },
                        {
                            key: 'purpose',
                            label: t('properties.purpose'),
                            value: purpose,
                            allLabel: t('properties.all_purposes'),
                            onChange: setPurpose,
                            options: PURPOSES.map((item) => ({ value: item, label: t(`properties.purposes.${item}`) })),
                        },
                        {
                            key: 'property_type',
                            label: t('properties.type'),
                            value: propertyType,
                            allLabel: t('properties.all_types'),
                            onChange: setPropertyType,
                            options: TYPES.map((item) => ({ value: item, label: t(`properties.types.${item}`) })),
                        },
                        ...(offices.length ? [{
                            key: 'branch',
                            label: t('properties.branch'),
                            value: branch,
                            allLabel: t('properties.all_branches'),
                            onChange: setBranch,
                            options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                        }] : []),
                        {
                            key: 'city',
                            label: t('properties.city'),
                            value: city,
                            allLabel: t('properties.all_cities'),
                            onChange: (value) => {
                                setCity(value);
                                setNeighborhood('');
                            },
                            options: catalog.map((item) => ({ value: String(item.id), label: item.name })),
                        },
                        {
                            key: 'neighborhood',
                            label: t('properties.neighborhood'),
                            value: city ? neighborhood : '',
                            allLabel: t('properties.all_neighborhoods'),
                            disabled: !city,
                            onChange: setNeighborhood,
                            options: neighborhoodOptions,
                        },
                        {
                            key: 'state',
                            label: t('properties.list'),
                            value: state,
                            allLabel: t('properties.active'),
                            onChange: setState,
                            options: [{ value: 'archived', label: t('properties.archived') }],
                        },
                    ]}
                />
            </Box>
            <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520 }}>
                <PdfReportPreview
                    loading={loading}
                    ready={!loading && brandReady}
                    empty={!loading && brandReady && items.length === 0}
                    emptyLabel={t('properties.empty')}
                    document={pdfDoc}
                />
            </Paper>
        </Box>
    );
}
