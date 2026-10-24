import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import Swal from 'sweetalert2';
import fetch from '@/utils/fetch';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import RecordDialog from '@/components/workspace/RecordDialog.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { formatPrice, currencyLabel } from '@/utils/money.js';
import { dealAmount, dealPeriod, dealWhen } from './transactionForm.js';
import { transactionError } from './transactionError.js';

const ACTIVITY_TYPES = ['note', 'call', 'viewing', 'follow_up'];

function Fact({ label, value }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Box sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{value || '—'}</Box>
        </Box>
    );
}

function money(value, symbol) {
    if (value == null || value === '') return '—';
    return `${formatPrice(value)}${symbol ? ` ${symbol}` : ''}`;
}

function todayInBaghdad() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
}

function ResponsiveTable({ children }) {
    return (
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 560 }}>
                {children}
            </Table>
        </TableContainer>
    );
}

export default function Show() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [tab, setTab] = useState('overview');
    const [deal, setDeal] = useState(null);
    const [reason, setReason] = useState('');
    const [expense, setExpense] = useState({ amount: '', reference_number: '' });
    const [voidingId, setVoidingId] = useState(null);
    const [voidReason, setVoidReason] = useState('');
    const entryKey = useRef(crypto.randomUUID());
    const [contracts, setContracts] = useState([]);
    const [error, setError] = useState('');
    const [loadedId, setLoadedId] = useState(null);
    const [activityType, setActivityType] = useState('note');
    const [activityBody, setActivityBody] = useState('');
    const [activitySaving, setActivitySaving] = useState(false);
    const [amendOpen, setAmendOpen] = useState(false);
    const [amendSaving, setAmendSaving] = useState(false);
    const [amendReason, setAmendReason] = useState('');
    const [amendForm, setAmendForm] = useState({
        purchase_price: '',
        down_payment: '',
        rent_amount: '',
        deposit_amount: '',
        period_start: '',
        period_end: '',
        buyer_side: '',
        seller_side: '',
        commission_kind: 'percent',
    });
    const [cloneOpen, setCloneOpen] = useState(false);
    const [cloneRef, setCloneRef] = useState('');
    const [cloneSaving, setCloneSaving] = useState(false);
    const [offerForm, setOfferForm] = useState({ offer_kind: 'offer', side: 'buyer', amount: '', note: '' });
    const [offerSaving, setOfferSaving] = useState(false);

    useEffect(() => {
        let active = true;
        Promise.allSettled([
            fetch.get(`transactions/${id}`),
            fetch.get('documents/contracts', { params: { transaction_id: id } }),
        ]).then(([dealRes, contractRes]) => {
            if (!active) return;
            if (dealRes.status === 'fulfilled') {
                setDeal(dealRes.value.data.data);
                setError('');
                if (contractRes.status === 'fulfilled') setContracts(contractRes.value.data?.data || []);
            } else {
                setError(dealRes.reason?.response?.data?.error?.message || t('login.error'));
            }
            setLoadedId(id);
        });
        return () => { active = false; };
    }, [id, t]);

    const setStatus = async (status) => {
        setError('');
        try {
            const res = await fetch.post(`transactions/${id}/status`, {
                status,
                cancel_reason: status === 'cancelled' ? reason : null,
                version: deal.row_version,
            });
            setDeal(res.data.data);
        } catch (err) {
            const message = err.response?.data?.error?.message || '';
            if (err.response?.status === 409 && /updated/i.test(message))
                setError(t('transactions.stale'));
            else
                setError(message || t('login.error'));
        }
    };

    const handleDeleteDraft = async () => {
        const result = await Swal.fire({
            title: t('transactions.delete_confirm_title', { defaultValue: 'Delete Transaction?' }),
            text: t('transactions.delete_confirm_text', {
                defaultValue: `Are you sure you want to delete transaction "${deal.reference_number}"? This action cannot be undone.`,
                ref: deal.reference_number,
            }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: t('workspace_ui.confirm_delete', { defaultValue: 'Yes, delete it' }),
            cancelButtonText: t('common.cancel', { defaultValue: 'Cancel' }),
        });

        if (!result.isConfirmed) return;

        try {
            await fetch.delete(`transactions/${deal.id}`);
            await Swal.fire({
                icon: 'success',
                title: t('transactions.deleted_success', { defaultValue: 'Transaction deleted' }),
                timer: 1800,
                showConfirmButton: false,
            });
            navigate('/admin/transactions/index');
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: t('common.error', { defaultValue: 'Cannot delete transaction' }),
                text: transactionError(err, t),
            });
        }
    };

    const postActivity = async (event) => {
        event.preventDefault();
        if (!activityBody.trim()) return;
        setActivitySaving(true);
        setError('');
        try {
            const res = await fetch.post(`transactions/${id}/activities`, {
                activity_type: activityType,
                body: activityBody.trim(),
            });
            setDeal(res.data.data);
            setActivityBody('');
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        } finally {
            setActivitySaving(false);
        }
    };

    const openAmend = () => {
        const sale = deal.transaction_type === 'sale';
        const buyerSide = (deal.commissions || []).find((line) => line.payer_side === (sale ? 'buyer' : 'renter'));
        const sellerSide = (deal.commissions || []).find((line) => line.payer_side === (sale ? 'seller' : 'owner'));
        const first = (deal.commissions || []).find((line) => line.beneficiary_kind === 'agency');
        setAmendForm({
            purchase_price: deal.purchase_price || '',
            down_payment: deal.down_payment || '',
            rent_amount: deal.rent_amount || '',
            deposit_amount: deal.deposit_amount || '',
            period_start: deal.period_start || '',
            period_end: deal.period_end || '',
            buyer_side: buyerSide
                ? (buyerSide.calc_kind === 'percent' ? buyerSide.rate_percent : buyerSide.amount)
                : (first?.calc_kind === 'percent' ? first.rate_percent : first?.amount) || '',
            seller_side: sellerSide
                ? (sellerSide.calc_kind === 'percent' ? sellerSide.rate_percent : sellerSide.amount)
                : '',
            commission_kind: (buyerSide || first)?.calc_kind || 'percent',
        });
        setAmendReason('');
        setAmendOpen(true);
    };

    const cloneDeal = async (event) => {
        event.preventDefault();
        setCloneSaving(true);
        setError('');
        try {
            const res = await fetch.post(`transactions/${id}/clone`, { reference_number: cloneRef.trim() });
            setCloneOpen(false);
            navigate(`/admin/transactions/${res.data.data.id}/show`);
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        } finally {
            setCloneSaving(false);
        }
    };

    const postOffer = async (event) => {
        event.preventDefault();
        setOfferSaving(true);
        setError('');
        try {
            const res = await fetch.post(`transactions/${id}/offers`, {
                offer_kind: offerForm.offer_kind,
                side: offerForm.side,
                amount: offerForm.amount,
                note: offerForm.note || null,
            });
            setDeal(res.data.data);
            setOfferForm((current) => ({ ...current, amount: '', note: '' }));
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        } finally {
            setOfferSaving(false);
        }
    };

    const decideOffer = async (offerId, status, apply = false) => {
        setError('');
        try {
            const res = await fetch.post(`transactions/${id}/offers/${offerId}/decide`, { status, apply });
            setDeal(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const saveAmend = async (event) => {
        event.preventDefault();
        setAmendSaving(true);
        setError('');
        const sale = deal.transaction_type === 'sale';
        const principalRole = sale ? 'buyer' : 'renter';
        const counterpartyRole = sale ? 'seller' : 'owner';
        const commissions = [];
        if (amendForm.buyer_side) {
            commissions.push(amendForm.commission_kind === 'percent'
                ? { beneficiary_kind: 'agency', payer_side: principalRole, calc_kind: 'percent', rate_percent: amendForm.buyer_side }
                : { beneficiary_kind: 'agency', payer_side: principalRole, calc_kind: 'flat', amount: amendForm.buyer_side });
        }
        if (amendForm.seller_side) {
            commissions.push(amendForm.commission_kind === 'percent'
                ? { beneficiary_kind: 'agency', payer_side: counterpartyRole, calc_kind: 'percent', rate_percent: amendForm.seller_side }
                : { beneficiary_kind: 'agency', payer_side: counterpartyRole, calc_kind: 'flat', amount: amendForm.seller_side });
        }
        try {
            const res = await fetch.patch(`transactions/${id}`, {
                reference_number: deal.reference_number,
                transaction_type: deal.transaction_type,
                property_id: deal.property_id,
                currency_id: deal.currency_id,
                assigned_user_id: deal.assigned_user_id,
                parties: (deal.parties || []).map((party) => ({
                    party_id: party.party_id,
                    participant_role: party.participant_role,
                })),
                purchase_price: sale ? amendForm.purchase_price : null,
                down_payment: sale ? (amendForm.down_payment || '0') : null,
                rent_amount: sale ? null : amendForm.rent_amount,
                deposit_amount: sale ? null : (amendForm.deposit_amount || '0'),
                period_start: sale ? null : amendForm.period_start,
                period_end: sale ? null : amendForm.period_end,
                commissions,
                version: deal.row_version,
                ...(deal.status === 'open' ? { amend_reason: amendReason.trim() } : {}),
            });
            setDeal(res.data.data);
            setAmendOpen(false);
        } catch (err) {
            const message = err.response?.data?.error?.message || '';
            if (err.response?.status === 409 && /updated/i.test(message))
                setError(t('transactions.stale'));
            else
                setError(message || t('login.error'));
        } finally {
            setAmendSaving(false);
        }
    };

    const downloadContract = async (documentId) => {
        const res = await fetch.get(`documents/${documentId}/file`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contract.pdf';
        link.click();
        URL.revokeObjectURL(url);
    };

    const postExpense = async (event) => {
        event.preventDefault();
        setError('');
        try {
            const res = await fetch.post(`transactions/${id}/entries`, {
                entries: [{
                    entry_type: 'expense',
                    direction: 'out',
                    amount: expense.amount,
                    reference_number: expense.reference_number,
                    occurred_on: todayInBaghdad(),
                }],
            }, { headers: { 'Idempotency-Key': entryKey.current } });
            entryKey.current = crypto.randomUUID();
            setDeal(res.data.data);
            setExpense({ amount: '', reference_number: '' });
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const voidEntry = async (entryId) => {
        setError('');
        try {
            const res = await fetch.post(`transactions/${id}/entries/${entryId}/void`, { reason: voidReason.trim() });
            setDeal(res.data.data);
            setVoidingId(null);
            setVoidReason('');
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        }
    };

    const loading = loadedId !== id;
    if (loading && !error) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center', width: '100%', flex: 1, minHeight: '100%' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    const symbol = currencyLabel(deal?.currency_symbol || deal?.currency_code);
    const opening = deal?.opening;
    const terms = opening ? {
        ...deal,
        purchase_price: opening.purchase_price ?? deal.purchase_price,
        down_payment: opening.down_payment ?? deal.down_payment,
        rent_amount: opening.rent_amount ?? deal.rent_amount,
        deposit_amount: opening.deposit_amount ?? deal.deposit_amount,
        period_start: opening.period_start ?? deal.period_start,
        period_end: opening.period_end ?? deal.period_end,
    } : deal;
    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                flex: 1,
                minHeight: '100%',
            }}
        >
            <PageHeader
                title={deal?.reference_number || t('transactions.title')}
                description={deal
                    ? [deal.property_title, t(`transactions.types.${deal.transaction_type}`)].filter(Boolean).join(' · ')
                    : t('transactions.hint')}
                action={deal ? (
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusChip status={deal.status} label={t(`transactions.statuses.${deal.status}`)} />
                        <Button onClick={() => navigate('/admin/transactions/index')}>{t('transactions.back')}</Button>
                    </Stack>
                ) : null}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {deal && (
                <Stack spacing={2} sx={{ width: '100%' }}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('transactions.workflow')}</Typography>
                        <Stack spacing={0.75} sx={{ mb: 2 }}>
                            {[
                                {
                                    key: 'parties',
                                    done: (() => {
                                        const roles = new Set((deal.parties || []).map((party) => party.participant_role));
                                        return deal.transaction_type === 'sale'
                                            ? roles.has('buyer') && roles.has('seller')
                                            : roles.has('renter') && roles.has('owner');
                                    })(),
                                    label: t('transactions.checklist_parties'),
                                },
                                {
                                    key: 'commission',
                                    done: (deal.commissions || []).some((line) => line.beneficiary_kind === 'agency' && Number(line.amount) > 0),
                                    label: t('transactions.checklist_commission'),
                                },
                                {
                                    key: 'open',
                                    done: deal.status === 'open' || deal.status === 'completed',
                                    label: t('transactions.checklist_open'),
                                },
                                {
                                    key: 'contract',
                                    done: Boolean(deal.has_contract) || (contracts || []).length > 0,
                                    label: t('transactions.checklist_contract'),
                                },
                                {
                                    key: 'complete',
                                    done: deal.status === 'completed',
                                    label: t('transactions.checklist_complete'),
                                },
                            ].map((step) => (
                                <Typography key={step.key} color={step.done ? 'success.main' : 'text.secondary'}>
                                    {step.done ? '✓' : '○'} {step.label}
                                </Typography>
                            ))}
                        </Stack>
                        {deal.status === 'open' && !deal.has_contract && (contracts || []).length === 0 ? (
                            <Alert severity="warning" sx={{ mb: 2 }}>{t('transactions.complete_without_contract')}</Alert>
                        ) : null}
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('transactions.commercial')}</Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: '1fr 1fr',
                                    md: '1fr 1fr 1fr',
                                    lg: '1fr 1fr 1fr 1fr',
                                },
                                gap: 2,
                            }}
                        >
                            <Fact label={t('transactions.property')} value={[deal.property_reference, deal.property_title].filter(Boolean).join(' · ')} />
                            <Fact label={t('transactions.branch')} value={deal.branch_name} />
                            <Fact label={t('transactions.agent')} value={deal.agent_name} />
                            <Fact label={t('transactions.value')} value={dealAmount(terms)} />
                            {deal.transaction_type === 'sale' ? (
                                <>
                                    <Fact label={t('transactions.down_payment')} value={money(terms.down_payment, symbol)} />
                                    <Fact label={t('transactions.balance')} value={money(terms.balance ?? deal.balance, symbol)} />
                                </>
                            ) : (
                                <>
                                    <Fact label={t('transactions.deposit')} value={money(terms.deposit_amount, symbol)} />
                                    <Fact label={t('transactions.period')} value={dealPeriod(terms)} />
                                </>
                            )}
                            <Fact label={t('transactions.date')} value={dealWhen(deal.created_at)} />
                            {deal.opening ? <Fact label={t('transactions.opening')} value={dealWhen(deal.opening.created_at)} /> : null}
                            {deal.cancel_reason ? <Fact label={t('transactions.cancel_reason')} value={deal.cancel_reason} /> : null}
                        </Box>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2, flexWrap: 'wrap' }}>
                            {deal.property_id ? (
                                <Button onClick={() => navigate(`/admin/properties/${deal.property_id}/show`)}>{t('transactions.open_property')}</Button>
                            ) : null}
                            <Button onClick={() => navigate(`/admin/transactions/${deal.id}/print`)}>{t('transactions.print_summary')}</Button>
                            <Can permission="transaction:create">
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setCloneRef(`${deal.reference_number}-C`);
                                        setCloneOpen(true);
                                    }}
                                >
                                    {t('transactions.clone')}
                                </Button>
                            </Can>
                            {deal.can_amend && (
                                <Can permission="transaction:create">
                                    <Button variant="outlined" onClick={openAmend}>
                                        {deal.status === 'open' ? t('transactions.amend') : t('transactions.edit_terms')}
                                    </Button>
                                </Can>
                            )}
                            {deal.status === 'draft' && (
                                <Can permission={['transaction:create', 'financial:record']}>
                                    <Button variant="contained" onClick={() => setStatus('open')}>{t('transactions.open')}</Button>
                                </Can>
                            )}
                            {deal.status === 'draft' && (
                                <Can permission="transaction:create">
                                    <Button variant="outlined" color="error" onClick={handleDeleteDraft}>
                                        {t('transactions.delete', { defaultValue: 'Delete Draft' })}
                                    </Button>
                                </Can>
                            )}
                            {deal.status === 'open' && (
                                <Can permission="document:generate">
                                    <Button variant="contained" onClick={() => navigate(`/admin/contracts/create?deal=${deal.id}`)}>{t('transactions.issue_contract')}</Button>
                                </Can>
                            )}
                            {deal.status === 'open' && (
                                <Can permission="transaction:create">
                                    <Button variant="outlined" onClick={() => setStatus('completed')}>{t('transactions.complete')}</Button>
                                </Can>
                            )}
                        </Stack>
                        {deal.status !== 'cancelled' && deal.status !== 'completed' && (
                            <Can permission="transaction:create">
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    sx={{ mt: 2, alignItems: { sm: 'center' }, maxWidth: { sm: 560 } }}
                                >
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={t('transactions.cancel_reason')}
                                        value={reason}
                                        onChange={(event) => setReason(event.target.value)}
                                    />
                                    <Button disabled={!reason.trim()} onClick={() => setStatus('cancelled')} sx={{ flexShrink: 0 }}>
                                        {t('transactions.cancel')}
                                    </Button>
                                </Stack>
                            </Can>
                        )}
                    </Paper>

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>
                            <Tab value="overview" label={t('transactions.overview')} />
                            <Tab value="activity" label={`${t('transactions.activity')} (${(deal.activities || []).length})`} />
                            <Tab value="offers" label={`${t('transactions.offers')} (${(deal.offers || []).length})`} />
                            <Tab value="finance" label={t('transactions.journal')} />
                            <Tab value="documents" label={`${t('transactions.contracts')} (${(contracts || []).length})`} />
                            <Tab value="history" label={t('transactions.history')} />
                        </Tabs>

                        {tab === 'overview' && (
                            <Stack spacing={3}>
                                <Box>
                                    <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('transactions.parties')}</Typography>
                                    <ResponsiveTable>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>{t('transactions.party')}</TableCell>
                                                <TableCell>{t('transactions.role')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(deal.parties || []).length === 0 && (
                                                <TableRow><TableCell colSpan={2}>—</TableCell></TableRow>
                                            )}
                                            {(deal.parties || []).map((party) => (
                                                <TableRow key={`${party.party_id}-${party.participant_role}`}>
                                                    <TableCell>{party.display_name}</TableCell>
                                                    <TableCell>{t(`transactions.roles.${party.participant_role}`)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </ResponsiveTable>
                                </Box>
                                <Box>
                                    <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('transactions.commission')}</Typography>
                                    <ResponsiveTable>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>{t('transactions.beneficiary')}</TableCell>
                                                <TableCell>{t('transactions.payer_side')}</TableCell>
                                                <TableCell>{t('transactions.commission_kind')}</TableCell>
                                                <TableCell>{t('transactions.value')}</TableCell>
                                                <TableCell>{t('workspace_ui.status')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(deal.commissions || []).length === 0 && (
                                                <TableRow><TableCell colSpan={5}>{t('transactions.no_commission')}</TableCell></TableRow>
                                            )}
                                            {(deal.commissions || []).map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell>
                                                        {line.beneficiary_kind === 'staff'
                                                            ? t('transactions.staff_commission')
                                                            : t('transactions.agency_commission')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {line.payer_side
                                                            ? t(`transactions.roles.${line.payer_side}`)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {line.calc_kind === 'percent'
                                                            ? `${Number(line.rate_percent)}% × ${money(line.rate_base, symbol)}`
                                                            : t('transactions.commission_flat')}
                                                    </TableCell>
                                                    <TableCell>{money(line.amount, symbol)}</TableCell>
                                                    <TableCell>{line.status || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </ResponsiveTable>
                                </Box>
                            </Stack>
                        )}

                        {tab === 'activity' && (
                            <Box>
                                {(deal.activities || []).length === 0 && (
                                    <Typography color="text.secondary" sx={{ mb: 1 }}>{t('transactions.activity_empty')}</Typography>
                                )}
                                <Stack spacing={1} sx={{ mb: 2 }}>
                                    {(deal.activities || []).map((row) => (
                                        <Box key={row.id}>
                                            <Typography variant="body2" fontWeight={600}>
                                                {t(`transactions.activity_types.${row.activity_type}`)}
                                                {' · '}
                                                {dealWhen(row.occurred_at)}
                                                {row.created_by_name ? ` · ${row.created_by_name}` : ''}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">{row.body}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                                {deal.status !== 'cancelled' && (
                                    <Can permission="transaction:create">
                                        <Box
                                            component="form"
                                            onSubmit={postActivity}
                                            sx={{
                                                display: 'grid',
                                                gap: 1,
                                                gridTemplateColumns: { xs: '1fr', sm: '160px 1fr auto' },
                                                alignItems: 'start',
                                            }}
                                        >
                                            <TextField select size="small" label={t('transactions.activity_type')} value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                                                {ACTIVITY_TYPES.map((type) => (
                                                    <MenuItem key={type} value={type}>{t(`transactions.activity_types.${type}`)}</MenuItem>
                                                ))}
                                            </TextField>
                                            <TextField size="small" fullWidth label={t('transactions.activity_note')} value={activityBody} onChange={(event) => setActivityBody(event.target.value)} />
                                            <Button type="submit" variant="contained" disabled={activitySaving || !activityBody.trim()}>{t('transactions.add_activity')}</Button>
                                        </Box>
                                    </Can>
                                )}
                                {(deal.amendments || []).length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography fontWeight={700} sx={{ mb: 1 }}>{t('transactions.amendments')}</Typography>
                                        {(deal.amendments || []).map((row) => (
                                            <Typography key={row.id} variant="body2" color="text.secondary">
                                                {dealWhen(row.created_at)}
                                                {row.created_by_name ? ` · ${row.created_by_name}` : ''}
                                                {' — '}
                                                {row.reason}
                                            </Typography>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        )}

                        {tab === 'offers' && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('transactions.offers_hint')}</Typography>
                                {(deal.offers || []).length === 0 && (
                                    <Typography color="text.secondary" sx={{ mb: 1 }}>{t('transactions.offers_empty')}</Typography>
                                )}
                                <Stack spacing={1} sx={{ mb: 2 }}>
                                    {(deal.offers || []).map((offer) => (
                                        <Stack
                                            key={offer.id}
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1}
                                            sx={{ alignItems: { sm: 'center' } }}
                                        >
                                            <Typography sx={{ flex: 1, minWidth: 0 }}>
                                                {t(`transactions.offer_kinds.${offer.offer_kind}`)}
                                                {' · '}
                                                {t(`transactions.roles.${offer.side}`, { defaultValue: offer.side })}
                                                {' · '}
                                                {money(offer.amount, symbol)}
                                                {' · '}
                                                {t(`transactions.offer_statuses.${offer.status}`)}
                                                {offer.note ? ` — ${offer.note}` : ''}
                                            </Typography>
                                            {offer.status === 'pending' && deal.status !== 'cancelled' && deal.status !== 'completed' && (
                                                <Can permission="transaction:create">
                                                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                                        <Button size="small" onClick={() => decideOffer(offer.id, 'accepted', true)}>{t('transactions.offer_accept_apply')}</Button>
                                                        <Button size="small" onClick={() => decideOffer(offer.id, 'accepted', false)}>{t('transactions.offer_accept')}</Button>
                                                        <Button size="small" onClick={() => decideOffer(offer.id, 'rejected')}>{t('transactions.offer_reject')}</Button>
                                                        <Button size="small" onClick={() => decideOffer(offer.id, 'withdrawn')}>{t('transactions.offer_withdraw')}</Button>
                                                    </Stack>
                                                </Can>
                                            )}
                                        </Stack>
                                    ))}
                                </Stack>
                                {deal.status !== 'cancelled' && deal.status !== 'completed' && (
                                    <Can permission="transaction:create">
                                        <Box
                                            component="form"
                                            onSubmit={postOffer}
                                            sx={{
                                                display: 'grid',
                                                gap: 1,
                                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr auto' },
                                                alignItems: 'start',
                                            }}
                                        >
                                            <TextField select size="small" label={t('transactions.offer_kind')} value={offerForm.offer_kind} onChange={(event) => setOfferForm({ ...offerForm, offer_kind: event.target.value })}>
                                                <MenuItem value="offer">{t('transactions.offer_kinds.offer')}</MenuItem>
                                                <MenuItem value="counter">{t('transactions.offer_kinds.counter')}</MenuItem>
                                            </TextField>
                                            <TextField select size="small" label={t('transactions.offer_side')} value={offerForm.side} onChange={(event) => setOfferForm({ ...offerForm, side: event.target.value })}>
                                                {(deal.transaction_type === 'sale' ? ['buyer', 'seller', 'agency'] : ['renter', 'owner', 'agency']).map((side) => (
                                                    <MenuItem key={side} value={side}>{t(`transactions.roles.${side}`, { defaultValue: side })}</MenuItem>
                                                ))}
                                            </TextField>
                                            <TextField size="small" label={t('transactions.offer_amount')} value={offerForm.amount} onChange={(event) => setOfferForm({ ...offerForm, amount: event.target.value })} required />
                                            <TextField size="small" label={t('transactions.activity_note')} value={offerForm.note} onChange={(event) => setOfferForm({ ...offerForm, note: event.target.value })} />
                                            <Button type="submit" variant="contained" disabled={offerSaving || !offerForm.amount}>{t('transactions.add_offer')}</Button>
                                        </Box>
                                    </Can>
                                )}
                            </Box>
                        )}

                        {tab === 'finance' && (
                            <Box>
                                <ResponsiveTable>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('transactions.reference')}</TableCell>
                                            <TableCell>{t('transactions.type')}</TableCell>
                                            <TableCell>{t('transactions.date')}</TableCell>
                                            <TableCell>{t('transactions.value')}</TableCell>
                                            <TableCell>{t('workspace_ui.status')}</TableCell>
                                            <TableCell>{t('transactions.void_reason')}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(deal.financial_entries || []).length === 0 && (
                                            <TableRow><TableCell colSpan={7}>{t('transactions.no_entries')}</TableCell></TableRow>
                                        )}
                                        {(deal.financial_entries || []).map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>{entry.reference_number}</TableCell>
                                                <TableCell>{t(`finance.types.${entry.entry_type}`, { defaultValue: entry.entry_type })}</TableCell>
                                                <TableCell>{dealWhen(entry.occurred_on)}</TableCell>
                                                <TableCell>{money(entry.amount, symbol)}</TableCell>
                                                <TableCell><StatusChip status={entry.status} label={t(`finance.statuses.${entry.status}`, { defaultValue: entry.status })} /></TableCell>
                                                <TableCell>{entry.void_reason || '—'}</TableCell>
                                                <TableCell align="right">
                                                    {entry.status === 'posted' && entry.entry_type !== 'reversal' && (
                                                        <Can permission="financial:record">
                                                            {voidingId === entry.id ? (
                                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { sm: 280 } }}>
                                                                    <TextField size="small" fullWidth label={t('transactions.void_reason')} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} />
                                                                    <Button size="small" onClick={() => voidEntry(entry.id)} disabled={!voidReason.trim()}>{t('transactions.void')}</Button>
                                                                </Stack>
                                                            ) : (
                                                                <Button size="small" onClick={() => { setVoidingId(entry.id); setVoidReason(''); }}>{t('transactions.void')}</Button>
                                                            )}
                                                        </Can>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </ResponsiveTable>
                                {(deal.status === 'open' || deal.status === 'completed') && (
                                    <Can permission="financial:record">
                                        <Box
                                            component="form"
                                            onSubmit={postExpense}
                                            sx={{
                                                mt: 2,
                                                display: 'grid',
                                                gap: 1,
                                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr auto' },
                                                alignItems: 'start',
                                            }}
                                        >
                                            <TextField size="small" fullWidth label={t('transactions.expense_amount')} value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} />
                                            <TextField size="small" fullWidth label={t('transactions.reference')} value={expense.reference_number} onChange={(event) => setExpense({ ...expense, reference_number: event.target.value })} />
                                            <Button type="submit" variant="contained" sx={{ justifySelf: { xs: 'stretch', md: 'start' } }}>{t('transactions.post_expense')}</Button>
                                        </Box>
                                    </Can>
                                )}
                            </Box>
                        )}

                        {tab === 'documents' && (
                            <Box>
                                {(contracts || []).length === 0 && <Typography color="text.secondary">{t('contracts.empty')}</Typography>}
                                <Stack spacing={1}>
                                    {contracts.map((contract) => (
                                        <Stack
                                            key={contract.id}
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1}
                                            sx={{ alignItems: { sm: 'center' } }}
                                        >
                                            <Typography sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                                                {contract.reference_number || contract.original_name || `#${contract.id}`}
                                            </Typography>
                                            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                                <Button size="small" onClick={() => navigate(`/admin/contracts/${contract.id}/show`)}>{t('contracts.open')}</Button>
                                                <Can permission="document:download">
                                                    <Button size="small" onClick={() => downloadContract(contract.document_id)}>{t('transactions.download_contract')}</Button>
                                                </Can>
                                            </Stack>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {tab === 'history' && (
                            <ResponsiveTable>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('workspace_ui.status')}</TableCell>
                                        <TableCell>{t('transactions.changed_by')}</TableCell>
                                        <TableCell>{t('transactions.date')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(deal.status_history || []).length === 0 && (
                                        <TableRow><TableCell colSpan={3}>—</TableCell></TableRow>
                                    )}
                                    {(deal.status_history || []).map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                {row.from_status ? t(`transactions.statuses.${row.from_status}`) : '—'}
                                                {' → '}
                                                {t(`transactions.statuses.${row.to_status}`)}
                                            </TableCell>
                                            <TableCell>{row.changed_by || '—'}</TableCell>
                                            <TableCell>{dealWhen(row.created_at)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </ResponsiveTable>
                        )}
                    </Paper>
                </Stack>
            )}
            {deal && (
                <RecordDialog
                    open={cloneOpen}
                    title={t('transactions.clone')}
                    onClose={() => setCloneOpen(false)}
                    onSubmit={cloneDeal}
                    saving={cloneSaving}
                    submitLabel={t('transactions.clone_save')}
                >
                    <TextField
                        label={t('transactions.reference')}
                        value={cloneRef}
                        onChange={(event) => setCloneRef(event.target.value)}
                        required
                        helperText={t('transactions.clone_hint')}
                    />
                </RecordDialog>
            )}
            {deal && (
                <RecordDialog
                    open={amendOpen}
                    title={deal.status === 'open' ? t('transactions.amend') : t('transactions.edit_terms')}
                    onClose={() => setAmendOpen(false)}
                    onSubmit={saveAmend}
                    saving={amendSaving}
                    submitLabel={t('transactions.save')}
                >
                    {deal.status === 'open' && (
                        <TextField
                            label={t('transactions.amend_reason')}
                            value={amendReason}
                            onChange={(event) => setAmendReason(event.target.value)}
                            required
                            helperText={t('transactions.amend_hint')}
                        />
                    )}
                    {deal.transaction_type === 'sale' ? (
                        <>
                            <TextField label={t('transactions.price')} value={amendForm.purchase_price} onChange={(event) => setAmendForm({ ...amendForm, purchase_price: event.target.value })} required />
                            <TextField label={t('transactions.down_payment')} value={amendForm.down_payment} onChange={(event) => setAmendForm({ ...amendForm, down_payment: event.target.value })} />
                        </>
                    ) : (
                        <>
                            <TextField label={t('transactions.rent')} value={amendForm.rent_amount} onChange={(event) => setAmendForm({ ...amendForm, rent_amount: event.target.value })} required />
                            <TextField label={t('transactions.deposit')} value={amendForm.deposit_amount} onChange={(event) => setAmendForm({ ...amendForm, deposit_amount: event.target.value })} />
                            <TextField label={t('transactions.period_start')} type="date" value={amendForm.period_start} onChange={(event) => setAmendForm({ ...amendForm, period_start: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} required />
                            <TextField label={t('transactions.period_end')} type="date" value={amendForm.period_end} onChange={(event) => setAmendForm({ ...amendForm, period_end: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} required />
                        </>
                    )}
                    <TextField select label={t('transactions.commission_kind')} value={amendForm.commission_kind} onChange={(event) => setAmendForm({ ...amendForm, commission_kind: event.target.value })}>
                        <MenuItem value="flat">{t('transactions.commission_flat')}</MenuItem>
                        <MenuItem value="percent">{t('transactions.commission_percent')}</MenuItem>
                    </TextField>
                    <TextField
                        label={t('transactions.commission_from', {
                            side: t(`transactions.roles.${deal.transaction_type === 'sale' ? 'buyer' : 'renter'}`),
                        })}
                        value={amendForm.buyer_side}
                        onChange={(event) => setAmendForm({ ...amendForm, buyer_side: event.target.value })}
                    />
                    <TextField
                        label={t('transactions.commission_from', {
                            side: t(`transactions.roles.${deal.transaction_type === 'sale' ? 'seller' : 'owner'}`),
                        })}
                        value={amendForm.seller_side}
                        onChange={(event) => setAmendForm({ ...amendForm, seller_side: event.target.value })}
                    />
                </RecordDialog>
            )}
        </Box>
    );
}
