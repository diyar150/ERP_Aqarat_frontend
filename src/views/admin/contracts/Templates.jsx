import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
    ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { loadPdfCompany } from '@/utils/pdfCompany';
import ContractInvoicePdf from './ContractInvoicePdf.jsx';
import { contractError, contractWhen } from './contractForm.js';
import { localeIsRtl } from './templateBuilder/blockCatalog.js';

export default function Templates() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('active');
    const [tick, setTick] = useState(0);
    const [rows, setRows] = useState([]);
    const [loadedKey, setLoadedKey] = useState('');
    const [error, setError] = useState('');
    const [company, setCompany] = useState({});
    const [preview, setPreview] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const requestKey = `${status}:${tick}`;
    const loading = loadedKey !== requestKey;

    useEffect(() => {
        let active = true;
        loadPdfCompany().then((brand) => { if (active) setCompany(brand); }).catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        fetch.get('documents/templates/register', { params: { status } })
            .then((res) => {
                if (!active) return;
                setRows(res.data?.data?.items || []);
                setLoadedKey(requestKey);
            })
            .catch((err) => {
                if (!active) return;
                setError(contractError(err, t));
                setLoadedKey(requestKey);
            });
        return () => { active = false; };
    }, [requestKey, status, t]);

    const reload = () => setTick((current) => current + 1);

    const archive = async (row) => {
        setError('');
        try {
            await fetch.post(`documents/templates/${row.id}/${row.status === 'archived' ? 'restore' : 'archive'}`);
            reload();
        } catch (err) {
            setError(contractError(err, t));
        }
    };

    const clone = async (row) => {
        setError('');
        try {
            const res = await fetch.post(`documents/templates/${row.id}/clone`);
            const created = res.data?.data;
            if (created?.id) navigate(`/admin/contracts/templates/${created.id}/edit`);
            else reload();
        } catch (err) {
            setError(contractError(err, t));
        }
    };

    const publish = async (row) => {
        setError('');
        try {
            await fetch.post(`documents/templates/${row.id}/${row.lifecycle === 'published' ? 'unpublish' : 'publish'}`);
            reload();
        } catch (err) {
            setError(contractError(err, t));
        }
    };

    const openPreview = async (row) => {
        setError('');
        setPreview(row);
        setPreviewLoading(true);
        setPreviewError('');
        setInvoice(null);
        try {
            const res = await fetch.get(`documents/templates/${row.id}/invoice`);
            setInvoice(res.data?.data || null);
        } catch (err) {
            setPreviewError(contractError(err, t));
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setPreview(null);
        setPreviewError('');
        setInvoice(null);
    };

    const previewRtl = invoice ? localeIsRtl(invoice.locale) : false;
    const exportDate = useMemo(
        () => format(new Date(), previewRtl ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm'),
        [previewRtl],
    );

    const pdfDoc = invoice ? (
        <ContractInvoicePdf
            title={invoice.title}
            body={invoice.body}
            sections={invoice.sections}
            watermark={invoice.watermark}
            forceRtl={localeIsRtl(invoice.locale)}
            company={company}
            exportDate={exportDate}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={localeIsRtl(invoice.locale)}
        />
    ) : null;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('contracts.templates')}
                description={t('contracts.template_hint')}
                action={<Button onClick={() => navigate('/admin/contracts/index')}>{t('contracts.back')}</Button>}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <ToggleButtonGroup exclusive size="small" value={status} onChange={(_, value) => { if (value) setStatus(value); }}>
                    <ToggleButton value="active">{t('contracts.active')}</ToggleButton>
                    <ToggleButton value="archived">{t('contracts.archived')}</ToggleButton>
                </ToggleButtonGroup>
                {status === 'active' && (
                    <Button variant="contained" onClick={() => navigate('/admin/contracts/templates/new')}>
                        {t('contracts.new_template')}
                    </Button>
                )}
            </Stack>
            <Paper variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('contracts.template_name')}</TableCell>
                            <TableCell>{t('contracts.builder.deal_type')}</TableCell>
                            <TableCell>{t('contracts.builder.locale')}</TableCell>
                            <TableCell>{t('contracts.builder.lifecycle')}</TableCell>
                            <TableCell>{t('contracts.status')}</TableCell>
                            <TableCell>{t('contracts.date')}</TableCell>
                            <TableCell align="right">{t('workspace_ui.actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Typography color="text.secondary">{t(status === 'archived' ? 'contracts.template_empty_archived' : 'contracts.template_empty')}</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                        <span>{row.name}</span>
                                        {row.is_default && <Chip size="small" label={t('contracts.builder.default_badge')} />}
                                    </Stack>
                                </TableCell>
                                <TableCell>{t(`contracts.builder.deal_${row.deal_type || 'both'}`)}</TableCell>
                                <TableCell>{t(`contracts.builder.locale_${row.locale || 'en'}`)}</TableCell>
                                <TableCell>
                                    <StatusChip
                                        status={row.lifecycle || 'draft'}
                                        label={t(`contracts.builder.lifecycle_${row.lifecycle || 'draft'}`)}
                                    />
                                </TableCell>
                                <TableCell><StatusChip status={row.status} label={t(`contracts.${row.status}`)} /></TableCell>
                                <TableCell>{contractWhen(row.updated_at || row.created_at)}</TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        {row.status === 'active' && <Button size="small" onClick={() => openPreview(row)}>{t('contracts.preview')}</Button>}
                                        {row.status === 'active' && (
                                            <Button size="small" onClick={() => navigate(`/admin/contracts/templates/${row.id}/edit`)}>
                                                {t('contracts.edit_template')}
                                            </Button>
                                        )}
                                        {row.status === 'active' && (
                                            <Button size="small" onClick={() => clone(row)}>{t('contracts.builder.clone')}</Button>
                                        )}
                                        {row.status === 'active' && (
                                            <Button size="small" onClick={() => publish(row)}>
                                                {t(row.lifecycle === 'published' ? 'contracts.builder.unpublish' : 'contracts.builder.publish')}
                                            </Button>
                                        )}
                                        <Button size="small" color={row.status === 'archived' ? 'primary' : 'error'} onClick={() => archive(row)}>
                                            {t(row.status === 'archived' ? 'contracts.restore' : 'contracts.archive')}
                                        </Button>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
            <Dialog open={Boolean(preview)} onClose={closePreview} fullWidth maxWidth="lg">
                <DialogTitle>{preview?.name || t('contracts.preview')}</DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520, m: 2 }}>
                        <PdfReportPreview
                            loading={previewLoading}
                            ready={!previewLoading && Boolean(pdfDoc) && !previewError}
                            empty={!previewLoading && (!invoice || Boolean(previewError))}
                            emptyLabel={previewError || t('contracts.empty')}
                            document={pdfDoc}
                            height={640}
                        />
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePreview}>{t('contracts.back')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
