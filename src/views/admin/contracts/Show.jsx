import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import PdfReportPreview from '@/components/common/PdfReportPreview.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import useIsRTL from '@/hooks/useIsRTL';
import { loadPdfCompany } from '@/utils/pdfCompany';
import ContractStatusDialog from './ContractStatusDialog.jsx';
import ContractInvoicePdf from './ContractInvoicePdf.jsx';
import {
    contractAmount,
    contractError,
    contractFileSize,
    contractNumber,
    contractPeriod,
    contractWhen,
    downloadContractFile,
} from './contractForm.js';

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Box>{value || '—'}</Box>
        </Box>
    );
}

export default function Show() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const isRTL = useIsRTL();
    const user = useAuthStore((state) => state.user);
    const canDownload = can(user, 'document:download');
    const canIssue = can(user, 'document:generate');
    const [contract, setContract] = useState(null);
    const [error, setError] = useState('');
    const [reasonOpen, setReasonOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [company, setCompany] = useState({});
    const [invoice, setInvoice] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [invoiceError, setInvoiceError] = useState('');
    const [activeDocId, setActiveDocId] = useState(null);

    useEffect(() => {
        let active = true;
        loadPdfCompany().then((brand) => { if (active) setCompany(brand); }).catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        fetch.get(`documents/contracts/${id}`)
            .then((res) => {
                if (!active) return;
                const row = res.data?.data || null;
                setContract(row);
                setActiveDocId(row?.document_id || null);
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 404) navigate('/admin/contracts/index');
                else setError(contractError(err, t));
            });
        return () => { active = false; };
    }, [id, navigate, t]);

    useEffect(() => {
        if (!id || !canDownload) {
            setInvoice(null);
            setInvoiceError('');
            setInvoiceLoading(false);
            return undefined;
        }
        let active = true;
        setInvoiceLoading(true);
        setInvoiceError('');
        const params = {};
        if (activeDocId) params.document_id = activeDocId;
        fetch.get(`documents/contracts/${id}/invoice`, { params })
            .then((res) => {
                if (active) setInvoice(res.data?.data || null);
            })
            .catch((err) => {
                if (!active) return;
                setInvoice(null);
                setInvoiceError(contractError(err, t));
            })
            .finally(() => {
                if (active) setInvoiceLoading(false);
            });
        return () => { active = false; };
    }, [id, activeDocId, canDownload, t]);

    const download = async (row = contract) => {
        setError('');
        try {
            await downloadContractFile(row);
        } catch (err) {
            setError(contractError(err, t));
        }
    };

    const sign = async () => {
        if (!contract) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch.patch(`documents/contracts/${id}`, {
                template_id: contract.template_id,
                status: 'signed',
                version: contract.row_version,
            });
            setContract(res.data?.data || contract);
        } catch (err) {
            setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async () => {
        if (!contract) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch.patch(`documents/contracts/${id}`, {
                template_id: contract.template_id,
                status: contract.status === 'archived' ? 'active' : 'archived',
                reason: reason.trim(),
                version: contract.row_version,
            });
            setContract(res.data?.data || contract);
            setReasonOpen(false);
            setReason('');
        } catch (err) {
            setError(contractError(err, t));
        } finally {
            setSaving(false);
        }
    };

    const exportDate = useMemo(() => {
        const raw = invoice?.generated_at || contract?.created_at;
        if (!raw) return format(new Date(), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');
        return format(new Date(raw), isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');
    }, [invoice?.generated_at, contract?.created_at, isRTL]);

    const pdfDoc = invoice ? (
        <ContractInvoicePdf
            title={invoice.title}
            body={invoice.body}
            sections={invoice.sections}
            forceRtl={invoice.locale === 'ar' || invoice.locale === 'ckb' ? true : null}
            company={company}
            exportDate={exportDate}
            exportDateLabel={t('expenses.generated_at')}
            addressLabel={t('agency.address', { defaultValue: 'Address:' })}
            isRTL={isRTL}
        />
    ) : null;

    if (!contract) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                {error || <CircularProgress size={28} />}
            </Box>
        );
    }

    const archived = contract.status === 'archived';
    const signed = contract.status === 'signed';
    const parties = contract.parties || [];

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <PageHeader
                title={`${contractNumber(contract.id)} · ${contract.reference_number || ''}`}
                description={t('contracts.show_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button onClick={() => navigate('/admin/contracts/index')}>{t('contracts.back')}</Button>
                        {contract.property_id && (
                            <Button onClick={() => navigate(`/admin/properties/${contract.property_id}/show`)}>{t('contracts.open_property')}</Button>
                        )}
                        {canIssue && !archived && !signed && (
                            <Button variant="contained" disabled={saving} onClick={sign}>{t('contracts.sign')}</Button>
                        )}
                        {canIssue && (
                            <Button onClick={() => navigate(`/admin/contracts/create?renew=${contract.id}`)}>{t('contracts.renew')}</Button>
                        )}
                        {canIssue && (
                            <Button
                                color={archived ? 'primary' : 'error'}
                                onClick={() => { setReason(''); setReasonOpen(true); }}
                            >
                                {t(archived ? 'contracts.restore' : 'contracts.archive')}
                            </Button>
                        )}
                        {canIssue && !archived && !signed && (
                            <Can permission="document:generate">
                                <Button variant="contained" onClick={() => navigate(`/admin/contracts/${id}/edit`)}>{t('contracts.reissue')}</Button>
                            </Can>
                        )}
                    </Stack>
                )}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {contract.current_deal_status === 'cancelled' && <Alert severity="warning" sx={{ mb: 2 }}>{t('contracts.deal_cancelled')}</Alert>}
            {contract.term_state === 'expiring' && <Alert severity="warning" sx={{ mb: 2 }}>{t('contracts.term_expiring')}</Alert>}
            {contract.term_state === 'expired' && <Alert severity="warning" sx={{ mb: 2 }}>{t('contracts.term_expired')}</Alert>}

            {canDownload && (
                <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 520, mb: 2 }}>
                    <PdfReportPreview
                        loading={invoiceLoading}
                        ready={!invoiceLoading && Boolean(pdfDoc) && !invoiceError}
                        empty={!invoiceLoading && (!invoice || Boolean(invoiceError))}
                        emptyLabel={invoiceError || t('contracts.empty')}
                        document={pdfDoc}
                    />
                </Paper>
            )}

            <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        <Fact label={t('contracts.deal')} value={contract.reference_number} />
                        <Fact label={t('contracts.type')} value={t(`contracts.${contract.transaction_type}`)} />
                        <Fact
                            label={t('contracts.status')}
                            value={<StatusChip status={contract.status} label={t(`contracts.${contract.status}`)} />}
                        />
                        <Fact
                            label={t('contracts.property')}
                            value={[contract.property_reference, contract.property_title].filter(Boolean).join(' · ') || '—'}
                        />
                        <Fact label={t('contracts.branch')} value={contract.branch_name || '—'} />
                        <Fact label={t('contracts.amount')} value={contractAmount(contract)} />
                        <Fact label={t('contracts.period')} value={contractPeriod(contract)} />
                        <Fact label={t('contracts.template')} value={contract.template_name || '—'} />
                        <Fact label={t('contracts.file')} value={`${contract.original_name || '—'} · ${contractFileSize(contract.byte_size)}`} />
                        <Fact label={t('contracts.issued_by')} value={contract.issued_by || '—'} />
                        <Fact label={t('contracts.date')} value={contractWhen(contract.created_at)} />
                        <Fact
                            label={t('contracts.parties')}
                            value={parties.length
                                ? parties.map((party) => `${t(`transactions.roles.${party.role}`, { defaultValue: party.role })} ${party.name}`).join(' · ')
                                : '—'}
                        />
                        {contract.status_reason && (
                            <Fact
                                label={t('contracts.reason')}
                                value={[contract.status_reason, contract.status_changed_by, contractWhen(contract.status_changed_at)].filter((part) => part && part !== '—').join(' · ')}
                            />
                        )}
                    </Box>
                </Paper>
                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Typography fontWeight={700} sx={{ px: { xs: 2, md: 3 }, pt: 2 }}>{t('contracts.versions')}</Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('contracts.version')}</TableCell>
                                <TableCell>{t('contracts.template')}</TableCell>
                                <TableCell>{t('contracts.file')}</TableCell>
                                <TableCell>{t('contracts.date')}</TableCell>
                                <TableCell>{t('contracts.issued_by')}</TableCell>
                                {canDownload && <TableCell />}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(contract.versions || []).map((version) => (
                                <TableRow
                                    key={version.version_no}
                                    selected={Number(version.document_id) === Number(activeDocId)}
                                    hover
                                >
                                    <TableCell>{version.version_no}</TableCell>
                                    <TableCell>{version.template_name}</TableCell>
                                    <TableCell>{version.original_name}</TableCell>
                                    <TableCell>{contractWhen(version.created_at)}</TableCell>
                                    <TableCell>{version.issued_by || '—'}</TableCell>
                                    {canDownload && (
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                <Button
                                                    size="small"
                                                    onClick={() => setActiveDocId(version.document_id)}
                                                >
                                                    {t('contracts.preview')}
                                                </Button>
                                                <Button size="small" onClick={() => download(version)}>
                                                    {t('contracts.download')}
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            </Stack>
            <ContractStatusDialog
                open={reasonOpen}
                title={t(archived ? 'contracts.restore_title' : 'contracts.archive_title')}
                body={t(archived ? 'contracts.restore_confirm' : 'contracts.archive_confirm', { number: contractNumber(contract.id) })}
                reason={reason}
                onReason={setReason}
                onClose={() => setReasonOpen(false)}
                onConfirm={changeStatus}
                busy={saving}
                confirmLabel={t(archived ? 'contracts.restore' : 'contracts.archive')}
                color={archived ? 'primary' : 'error'}
            />
        </Box>
    );
}
