import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import PdfReportShell from '@/components/common/PdfReportShell.jsx';
import { PdfTable } from '@/components/common/PdfReportTable.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { DEFAULT_SUPPLIER_NAME, loadPdfCompany } from '@/utils/pdfCompany';

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: '1 1 140px', minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value ?? '—'}</Typography>
        </Paper>
    );
}

function cellValue(row, key) {
    const value = row?.[key];
    if (value == null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    return String(value);
}

export default function ReportRunner({ config }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const [params] = useSearchParams();
    const [from, setFrom] = useState(params.get('from') || '');
    const [to, setTo] = useState(params.get('to') || '');
    const [asOf, setAsOf] = useState(params.get('as_of') || '');
    const [branch, setBranch] = useState(params.get('branch') || params.get('branch_id') || '');
    const [offices, setOffices] = useState([]);
    const [report, setReport] = useState(null);
    const [company, setCompany] = useState({ supplier_name: DEFAULT_SUPPLIER_NAME, address: '' });
    const [brandReady, setBrandReady] = useState(false);
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);

    const requestKey = JSON.stringify([from, to, asOf, branch]);
    const loading = loadedKey !== requestKey || !brandReady;

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
        let active = true;
        const request = {};
        if (config.filters.includes('from') && from) request.from = from;
        if (config.filters.includes('to') && to) request.to = to;
        if (config.filters.includes('as_of') && asOf) request.as_of = asOf;
        if (config.filters.includes('branch') && branch) request.branch_id = branch;
        fetch.get(config.endpoint, { params: request })
            .then((res) => {
                if (!active) return;
                setReport(res.data?.data || null);
                setError('');
                setLoadedKey(requestKey);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.response?.data?.error?.message || t('reports.load_error'));
                setLoadedKey(requestKey);
            });
        return () => { active = false; };
    }, [config.endpoint, config.filters, from, to, asOf, branch, requestKey, t]);

    const summary = report?.summary || {};
    const items = report?.items || [];
    const generated = report?.generated_at
        ? format(new Date(report.generated_at), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm')
        : format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');

    const columns = useMemo(
        () => (config.columns || []).map((col) => ({
            key: col.key,
            header: t(col.headerKey),
            width: col.width || `${Math.floor(100 / Math.max(config.columns.length, 1))}%`,
            render: (row) => cellValue(row, col.key),
        })),
        [config.columns, t],
    );

    const summaryCards = (config.summaryKeys || []).map((key) => ({
        label: t(`reports.summary.${key}`, { defaultValue: t(`operations.${key}`, { defaultValue: key }) }),
        value: summary[key],
    }));

    const filterLines = [
        from ? `${t('operations.from')}: ${from}` : '',
        to ? `${t('operations.to')}: ${to}` : '',
        asOf ? `${t('reports.as_of')}: ${asOf}` : '',
        branch ? `${t('properties.branch')}: ${offices.find((row) => String(row.id) === String(branch))?.name || branch}` : '',
    ].filter(Boolean);

    const footerCompany = useMemo(() => ({
        ...company,
        supplier_name: company.supplier_name || DEFAULT_SUPPLIER_NAME,
        address: company.address || '',
    }), [company]);

    const pdfDoc = (
        <PdfReportShell
            title={t(config.titleKey)}
            company={footerCompany}
            filters={filterLines}
            exportDate={generated}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('workspace.address', { defaultValue: 'Address' })}
            isRTL={isRTL}
            summary={summaryCards}
        >
            <PdfTable columns={columns} rows={items} isRTL={isRTL} emptyLabel={t('reports.empty')} />
        </PdfReportShell>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t(config.titleKey)}
                description={t(config.hintKey)}
                action={(
                    <Button onClick={() => navigate('/admin/reports')}>{t('reports.back_hub')}</Button>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
                {config.filters.includes('from') && (
                    <TextField
                        type="date"
                        size="small"
                        label={t('operations.from')}
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                )}
                {config.filters.includes('to') && (
                    <TextField
                        type="date"
                        size="small"
                        label={t('operations.to')}
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                )}
                {config.filters.includes('as_of') && (
                    <TextField
                        type="date"
                        size="small"
                        label={t('reports.as_of')}
                        value={asOf}
                        onChange={(e) => setAsOf(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                )}
                {config.filters.includes('branch') && (
                    <TextField
                        select
                        size="small"
                        label={t('properties.branch')}
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        SelectProps={{ native: true }}
                        sx={{ minWidth: 180 }}
                    >
                        <option value="">{t('workspace_ui.all')}</option>
                        {offices.map((office) => (
                            <option key={office.id} value={office.id}>{office.name}</option>
                        ))}
                    </TextField>
                )}
            </Stack>
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {summaryCards.map((card) => (
                    <SummaryCard key={card.label} label={card.label} value={card.value} />
                ))}
            </Stack>
            {loading ? (
                <Typography color="text.secondary">{t('common.loading')}</Typography>
            ) : (
                <PdfReportPreview document={pdfDoc} />
            )}
        </Box>
    );
}
