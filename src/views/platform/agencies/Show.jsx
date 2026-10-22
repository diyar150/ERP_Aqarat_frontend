import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import { currencyLabel } from '@/utils/money.js';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { platformCan, usePlatformAuthStore } from '@/store/platformAuthStore';

const LOCALES = { ckb: 'کوردی', ar: 'العربية', en: 'English' };

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography fontWeight={600}>{value || '—'}</Typography>
        </Box>
    );
}

function formatDate(value) {
    const text = String(value || '').slice(0, 10);
    return text || '—';
}

function apiMessage(err, fallback) {
    return err?.response?.data?.error?.message || err?.response?.data?.message || fallback;
}

export default function AgencyShow() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const admin = usePlatformAuthStore((state) => state.admin);
    const canStatus = platformCan(admin, 'agencies.status');
    const canArchive = platformCan(admin, 'agencies.archive');
    const canSubscription = platformCan(admin, 'subscriptions.manage');
    const canInvoiceView = platformCan(admin, 'invoices.view');
    const canInvoiceManage = platformCan(admin, 'invoices.manage');
    const canInvoiceVoid = platformCan(admin, 'invoices.void');

    const [agency, setAgency] = useState(null);
    const [plans, setPlans] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [planCode, setPlanCode] = useState('');
    const [extendDays, setExtendDays] = useState('30');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [invoiceForm, setInvoiceForm] = useState({ amount: '', due_on: '', notes: '', issue: true });
    const [loadedId, setLoadedId] = useState(id);

    // Reset stale UI when navigating to another agency (adjust state during render).
    if (id !== loadedId) {
        setLoadedId(id);
        setAgency(null);
        setPlans([]);
        setInvoices([]);
        setPlanCode('');
        setError('');
        setNotice('');
        setConfirm(null);
        setInvoiceForm({ amount: '', due_on: '', notes: '', issue: true });
    }

    const applyLoaded = useCallback((agencyRes, plansRes, invoicesRes) => {
        const body = agencyRes.data?.data || null;
        setAgency(body);
        const items = plansRes.data?.data?.items || [];
        setPlans(items);
        setPlanCode(body?.subscription?.plan_code || items[0]?.code || '');
        if (invoicesRes) setInvoices(invoicesRes.data?.data?.items || []);
    }, []);

    const fetchAgencyBundle = useCallback(() => {
        const requests = [
            fetch.get(`platform/agencies/${id}`),
            fetch.get('platform/plans'),
        ];
        if (canInvoiceView) requests.push(fetch.get(`platform/agencies/${id}/invoices`));
        return Promise.all(requests);
    }, [id, canInvoiceView]);

    const load = useCallback(async () => {
        const [agencyRes, plansRes, invoicesRes] = await fetchAgencyBundle();
        applyLoaded(agencyRes, plansRes, invoicesRes);
    }, [applyLoaded, fetchAgencyBundle]);

    useEffect(() => {
        let active = true;
        fetchAgencyBundle()
            .then(([agencyRes, plansRes, invoicesRes]) => {
                if (!active) return;
                applyLoaded(agencyRes, plansRes, invoicesRes);
            })
            .catch((err) => {
                if (active) setError(apiMessage(err, t('platform.load_error')));
            });
        return () => { active = false; };
    }, [applyLoaded, fetchAgencyBundle, t]);

    const run = async (action, successMessage) => {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await action();
            await load();
            setNotice(successMessage || t('platform.saved'));
            setConfirm(null);
        } catch (err) {
            setError(apiMessage(err, t('platform.save_error')));
            setConfirm(null);
        } finally {
            setBusy(false);
        }
    };

    const runConfirmed = async () => {
        if (!confirm || busy) return;
        if (confirm.type === 'suspend') {
            await run(
                () => fetch.patch(`platform/agencies/${id}/status`, { status: 'suspended' }),
                t('platform.agency_suspended'),
            );
            return;
        }
        if (confirm.type === 'activate') {
            await run(
                () => fetch.patch(`platform/agencies/${id}/status`, { status: 'active' }),
                t('platform.agency_activated'),
            );
            return;
        }
        if (confirm.type === 'archive') {
            await run(
                () => fetch.patch(`platform/agencies/${id}/archive`),
                t('platform.agency_archived'),
            );
            return;
        }
        if (confirm.type === 'restore') {
            await run(
                () => fetch.patch(`platform/agencies/${id}/restore`),
                t('platform.agency_restored'),
            );
            return;
        }
        if (confirm.type === 'assign') {
            await run(
                () => fetch.post(`platform/agencies/${id}/subscription`, { plan_code: planCode }),
                t('platform.subscription_assigned'),
            );
            return;
        }
        if (confirm.type === 'cancel') {
            await run(
                () => fetch.post(`platform/agencies/${id}/subscription/cancel`),
                t('platform.subscription_cancelled'),
            );
        }
    };

    const extendSubscription = async () => {
        const days = Number(extendDays);
        if (!Number.isInteger(days) || days < 1 || days > 3660) {
            setError(t('platform.extend_days_invalid'));
            return;
        }
        await run(
            () => fetch.post(`platform/agencies/${id}/subscription/extend`, { days }),
            t('platform.subscription_extended'),
        );
    };

    const createInvoice = async () => {
        const amount = Number(invoiceForm.amount);
        if (!Number.isFinite(amount) || amount < 0) {
            setError(t('platform.plan_price_invalid'));
            return;
        }
        await run(
            async () => {
                await fetch.post(`platform/agencies/${id}/invoices`, {
                    amount,
                    due_on: invoiceForm.due_on || null,
                    notes: invoiceForm.notes || null,
                    issue: Boolean(invoiceForm.issue),
                    currency_code: agency?.base_currency_code,
                });
                setInvoiceForm({ amount: '', due_on: '', notes: '', issue: true });
            },
            t('platform.invoice_created'),
        );
    };

    const invoiceAction = async (invoice, action) => {
        const messages = {
            issue: t('platform.invoice_issued'),
            pay: t('platform.invoice_paid'),
            void: t('platform.invoice_voided'),
        };
        await run(
            () => fetch.post(`platform/invoices/${invoice.id}/${action}`),
            messages[action],
        );
    };

    if (!agency && !error) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    }

    const archived = Boolean(agency?.deleted_at);
    const subStatus = agency?.subscription?.status || '';
    const subscriptionOpen = ['trialing', 'active', 'grace'].includes(subStatus);
    const needsRecovery = !archived && (!agency?.subscription || ['cancelled', 'expired', 'grace'].includes(subStatus));
    const confirmCopy = {
        suspend: {
            title: t('platform.confirm_suspend_agency_title'),
            body: t('platform.confirm_suspend_agency', { name: agency?.name || '' }),
            action: t('platform.suspend'),
            color: 'warning',
        },
        activate: {
            title: t('platform.confirm_activate_agency_title'),
            body: t('platform.confirm_activate_agency', { name: agency?.name || '' }),
            action: t('platform.activate'),
            color: 'success',
        },
        archive: {
            title: t('platform.confirm_archive_agency_title'),
            body: t('platform.confirm_archive_agency', { name: agency?.name || '' }),
            action: t('platform.archive_agency'),
            color: 'error',
        },
        restore: {
            title: t('platform.confirm_restore_agency_title'),
            body: t('platform.confirm_restore_agency', { name: agency?.name || '' }),
            action: t('platform.restore_agency'),
            color: 'success',
        },
        assign: {
            title: needsRecovery
                ? t('platform.confirm_reactivate_plan_title')
                : t('platform.confirm_assign_plan_title'),
            body: needsRecovery
                ? t('platform.confirm_reactivate_plan', { plan: planCode || '—' })
                : t('platform.confirm_assign_plan', { plan: planCode || '—' }),
            action: needsRecovery ? t('platform.reactivate_plan') : t('platform.assign_plan'),
            color: needsRecovery ? 'warning' : 'primary',
        },
        cancel: {
            title: t('platform.confirm_cancel_subscription_title'),
            body: t('platform.confirm_cancel_subscription', { name: agency?.name || '' }),
            action: t('platform.cancel_subscription'),
            color: 'error',
        },
    }[confirm?.type] || null;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={agency?.name || t('platform.agencies_title')}
                description={t('platform.agency_detail_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button onClick={() => navigate('/platform/agencies')} disabled={busy}>
                            {t('platform.back')}
                        </Button>
                        {agency && !archived && canStatus && (
                            agency.status === 'active' ? (
                                <Button
                                    color="warning"
                                    variant="outlined"
                                    disabled={busy}
                                    onClick={() => setConfirm({ type: 'suspend' })}
                                >
                                    {t('platform.suspend')}
                                </Button>
                            ) : (
                                <Button
                                    color="success"
                                    variant="outlined"
                                    disabled={busy}
                                    onClick={() => setConfirm({ type: 'activate' })}
                                >
                                    {t('platform.activate')}
                                </Button>
                            )
                        )}
                        {agency && canArchive && (
                            archived ? (
                                <Button
                                    color="success"
                                    variant="contained"
                                    disabled={busy}
                                    onClick={() => setConfirm({ type: 'restore' })}
                                >
                                    {t('platform.restore_agency')}
                                </Button>
                            ) : (
                                <Button
                                    color="error"
                                    variant="outlined"
                                    disabled={busy}
                                    onClick={() => setConfirm({ type: 'archive' })}
                                >
                                    {t('platform.archive_agency')}
                                </Button>
                            )
                        )}
                    </Stack>
                )}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {notice && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
                    {notice}
                </Alert>
            )}

            {agency && (
                <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, mb: 2 }}>
                            <Avatar
                                variant="rounded"
                                sx={{ width: 72, height: 72, bgcolor: 'action.hover', color: 'text.primary', fontWeight: 700 }}
                            >
                                {(agency.name || 'A').slice(0, 1)}
                            </Avatar>
                            <Box>
                                <Typography fontWeight={700}>{t('workspace.identity')}</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <StatusChip
                                        status={archived ? 'archived' : agency.status}
                                        label={archived
                                            ? t('platform.stats.archived')
                                            : t(`platform.agency_statuses.${agency.status}`, { defaultValue: agency.status })}
                                    />
                                </Box>
                            </Box>
                        </Stack>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('platform.agency_name')} value={agency.name} />
                            <Fact label={t('platform.phone')} value={agency.phone} />
                            <Fact label={t('platform.email')} value={agency.email} />
                            <Fact label={t('workspace.website')} value={agency.website} />
                            <Fact label={t('common.updated_at')} value={formatDate(agency.updated_at)} />
                        </Box>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} mb={2}>{t('workspace.legal')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('workspace.address')} value={agency.address} />
                            <Fact label={t('workspace.city')} value={agency.city} />
                            <Fact label={t('workspace.registration_number')} value={agency.registration_number} />
                            <Fact label={t('workspace.tax_number')} value={agency.tax_number} />
                            <Fact label={t('workspace.license_number')} value={agency.license_number} />
                        </Box>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} mb={2}>{t('workspace.regional')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Fact label={t('platform.currency')} value={currencyLabel(agency.base_currency_code)} />
                            <Fact label={t('platform.timezone')} value={agency.timezone} />
                            <Fact label={t('platform.locale')} value={LOCALES[agency.locale] || agency.locale} />
                        </Box>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} mb={2}>{t('platform.usage_section')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                            <Fact label={t('platform.counts.users')} value={agency.counts?.users} />
                            <Fact label={t('platform.counts.properties')} value={agency.counts?.properties} />
                            <Fact label={t('platform.counts.parties')} value={agency.counts?.parties} />
                            <Fact label={t('platform.counts.branches')} value={agency.counts?.branches} />
                        </Box>
                        <Typography fontWeight={600} mb={1}>{t('platform.owners_section')}</Typography>
                        {(agency.owners || []).length === 0 ? (
                            <Typography color="text.secondary">{t('platform.owners_empty')}</Typography>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                {agency.owners.map((owner) => (
                                    <Paper key={owner.id} variant="outlined" sx={{ p: 1.5 }}>
                                        <Typography fontWeight={600}>{owner.username}</Typography>
                                        <Typography variant="body2" color="text.secondary" dir="ltr">{owner.email || '—'}</Typography>
                                        <Typography variant="body2" color="text.secondary" dir="ltr">{owner.phone_number || '—'}</Typography>
                                    </Paper>
                                ))}
                            </Box>
                        )}
                    </Paper>

                    {!archived && (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: { xs: 2, md: 3 },
                                borderColor: needsRecovery ? 'warning.main' : undefined,
                            }}
                        >
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
                            >
                                <Box>
                                    <Typography fontWeight={700}>{t('platform.subscriptions')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {needsRecovery
                                            ? t('platform.subscription_recovery_section_hint')
                                            : t('platform.subscription_section_hint')}
                                    </Typography>
                                </Box>
                                {agency.subscription ? (
                                    <StatusChip
                                        status={agency.subscription.status}
                                        label={t(`platform.subscription_statuses.${agency.subscription.status}`, {
                                            defaultValue: agency.subscription.status,
                                        })}
                                    />
                                ) : (
                                    <StatusChip status="draft" label={t('platform.subscription_none')} />
                                )}
                            </Stack>

                            {needsRecovery && (
                                <Alert
                                    severity="warning"
                                    sx={{ mb: 2 }}
                                    action={canSubscription ? (
                                        <Button
                                            color="inherit"
                                            size="small"
                                            variant="outlined"
                                            disabled={busy || !planCode}
                                            onClick={() => setConfirm({ type: 'assign' })}
                                        >
                                            {t('platform.reactivate_plan')}
                                        </Button>
                                    ) : undefined}
                                >
                                    {t('platform.subscription_recovery_banner', {
                                        status: agency.subscription
                                            ? t(`platform.subscription_statuses.${agency.subscription.status}`, {
                                                defaultValue: agency.subscription.status,
                                            })
                                            : t('platform.subscription_none'),
                                    })}
                                </Alert>
                            )}

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                                <Fact
                                    label={t('platform.plan')}
                                    value={agency.subscription?.plan_name || agency.subscription?.plan_code}
                                />
                                <Fact
                                    label={t('workspace_ui.status')}
                                    value={agency.subscription
                                        ? t(`platform.subscription_statuses.${agency.subscription.status}`, {
                                            defaultValue: agency.subscription.status,
                                        })
                                        : t('platform.subscription_none')}
                                />
                                <Fact label={t('platform.ends_on')} value={formatDate(agency.subscription?.ends_on)} />
                            </Box>
                            {canSubscription && (
                                <Stack spacing={1.5}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }} useFlexGap>
                                        <TextField
                                            select
                                            size="small"
                                            label={t('platform.plan')}
                                            value={planCode}
                                            onChange={(event) => setPlanCode(event.target.value)}
                                            sx={{ minWidth: 180 }}
                                        >
                                            {plans.map((plan) => (
                                                <MenuItem key={plan.id} value={plan.code}>{plan.name}</MenuItem>
                                            ))}
                                        </TextField>
                                        <Button
                                            variant="contained"
                                            color={needsRecovery ? 'warning' : 'primary'}
                                            disabled={busy || !planCode}
                                            onClick={() => setConfirm({ type: 'assign' })}
                                        >
                                            {needsRecovery ? t('platform.reactivate_plan') : t('platform.assign_plan')}
                                        </Button>
                                        <TextField
                                            size="small"
                                            type="number"
                                            label={t('platform.extend_days')}
                                            value={extendDays}
                                            onChange={(event) => setExtendDays(event.target.value)}
                                            sx={{ width: 140 }}
                                            inputProps={{ min: 1, max: 3660 }}
                                        />
                                        <Button
                                            variant="outlined"
                                            disabled={busy || !agency.subscription}
                                            onClick={extendSubscription}
                                        >
                                            {t('platform.extend')}
                                        </Button>
                                        <Button
                                            color="error"
                                            variant="outlined"
                                            disabled={busy || !subscriptionOpen}
                                            onClick={() => setConfirm({ type: 'cancel' })}
                                        >
                                            {t('platform.cancel_subscription')}
                                        </Button>
                                    </Stack>
                                    {needsRecovery ? (
                                        <Typography variant="caption" color="text.secondary">
                                            {t('platform.subscription_recovery_actions_hint')}
                                        </Typography>
                                    ) : null}
                                </Stack>
                            )}
                        </Paper>
                    )}

                    {canInvoiceView && !archived && (
                        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                            <Typography fontWeight={700} sx={{ mb: 2 }}>{t('platform.invoices')}</Typography>
                            {canInvoiceManage && (
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
                                    <TextField
                                        size="small"
                                        label={t('platform.invoice_amount')}
                                        value={invoiceForm.amount}
                                        onChange={(event) => setInvoiceForm((c) => ({ ...c, amount: event.target.value }))}
                                        sx={{ width: 140 }}
                                        inputProps={{ inputMode: 'decimal', dir: 'ltr' }}
                                    />
                                    <TextField
                                        size="small"
                                        type="date"
                                        label={t('platform.invoice_due_on')}
                                        value={invoiceForm.due_on}
                                        onChange={(event) => setInvoiceForm((c) => ({ ...c, due_on: event.target.value }))}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        size="small"
                                        label={t('platform.invoice_notes')}
                                        value={invoiceForm.notes}
                                        onChange={(event) => setInvoiceForm((c) => ({ ...c, notes: event.target.value }))}
                                        sx={{ minWidth: 180, flex: 1 }}
                                    />
                                    <Button variant="contained" disabled={busy} onClick={createInvoice}>
                                        {t('platform.invoice_create')}
                                    </Button>
                                </Stack>
                            )}
                            {invoices.length === 0 ? (
                                <Typography color="text.secondary">{t('platform.invoice_empty')}</Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {invoices.map((invoice) => (
                                        <Paper key={invoice.id} variant="outlined" sx={{ p: 1.5 }}>
                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1}
                                                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                                            >
                                                <Box>
                                                    <Typography fontWeight={600} dir="ltr">{invoice.number}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {invoice.amount}
                                                        {' '}
                                                        {invoice.currency_code}
                                                        {' · '}
                                                        {t(`platform.invoice_statuses.${invoice.status}`, { defaultValue: invoice.status })}
                                                        {invoice.due_on ? ` · ${formatDate(invoice.due_on)}` : ''}
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" spacing={1}>
                                                    {canInvoiceManage && invoice.status === 'draft' && (
                                                        <Button size="small" disabled={busy} onClick={() => invoiceAction(invoice, 'issue')}>
                                                            {t('platform.invoice_issue')}
                                                        </Button>
                                                    )}
                                                    {canInvoiceManage && invoice.status === 'issued' && (
                                                        <Button size="small" disabled={busy} onClick={() => invoiceAction(invoice, 'pay')}>
                                                            {t('platform.invoice_pay')}
                                                        </Button>
                                                    )}
                                                    {canInvoiceVoid && (invoice.status === 'draft' || invoice.status === 'issued') && (
                                                        <Button size="small" color="error" disabled={busy} onClick={() => invoiceAction(invoice, 'void')}>
                                                            {t('platform.invoice_void')}
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    )}
                </Stack>
            )}

            <Dialog
                open={Boolean(confirm)}
                onClose={() => { if (!busy) setConfirm(null); }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>{confirmCopy?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{confirmCopy?.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(null)} disabled={busy}>{t('common.cancel')}</Button>
                    <Button
                        variant="contained"
                        color={confirmCopy?.color || 'primary'}
                        disabled={busy}
                        onClick={runConfirmed}
                    >
                        {confirmCopy?.action}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
