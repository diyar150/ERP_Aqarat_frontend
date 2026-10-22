import { useCallback, useEffect, useRef, useState } from 'react';
import { groupPriceInput, moneyLabel, plainPrice } from '@/utils/money.js';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Chip,
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
import {
    AccountBalance,
    AccountBalanceWallet,
    Add,
    Assessment,
    MonetizationOn,
    Security,
    SwapHoriz,
    TrendingDown,
    TrendingUp,
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import fetch from '@/utils/fetch';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import RecordDialog from '@/components/workspace/RecordDialog.jsx';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import useIsRTL from '@/hooks/useIsRTL';
import { printFinanceVoucher } from './printFinanceVoucher.jsx';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
const ENTRY_TYPES = ['payment', 'commission', 'expense', 'reversal'];
const POST_TYPES = ['payment', 'commission'];
const STATUSES = ['posted', 'void', 'reversed'];
const FIGURES = [
    { key: 'cash_in', labelKey: 'finance.cash_in' },
    { key: 'cash_out', labelKey: 'finance.cash_out' },
    { key: 'commissions', labelKey: 'finance.commissions' },
    { key: 'cash_balance', labelKey: 'finance.cash_balance' },
];

const FIGURE_CONFIG = {
    cash_in: {
        color: 'success.main',
        bgColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: '#10b981',
        icon: TrendingUp,
    },
    cash_out: {
        color: 'error.main',
        bgColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: '#ef4444',
        icon: TrendingDown,
    },
    commissions: {
        color: 'secondary.main',
        bgColor: 'rgba(139, 92, 246, 0.08)',
        borderColor: '#8b5cf6',
        icon: MonetizationOn,
    },
    cash_balance: {
        color: 'primary.main',
        bgColor: 'rgba(59, 130, 246, 0.08)',
        borderColor: '#3b82f6',
        icon: AccountBalance,
    },
};

const OPTIONAL_COLUMNS = ['date', 'office', 'type', 'direction', 'status'];

const emptyForm = () => ({
    entry_type: 'payment',
    direction: 'in',
    amount: '',
    currency_id: '',
    branch_id: '',
    occurred_on: today(),
    reference_number: '',
});

const emptyTransfer = () => ({
    from_branch_id: '',
    to_branch_id: '',
    amount: '',
    currency_id: '',
    occurred_on: today(),
    reference_number: '',
});

function validateEntry(form, { lockedOffice, t }) {
    const errors = {};
    const required = t('common.required');
    const plain = plainPrice(form.amount);
    const amountNum = Number(plain);
    if (plain == null || !Number.isFinite(amountNum) || amountNum <= 0) {
        errors.amount = t('common.invalid') || required;
    }
    if (!form.currency_id) errors.currency_id = required;
    if (!lockedOffice && !form.branch_id) errors.branch_id = required;
    if (!String(form.occurred_on || '').trim()) errors.occurred_on = required;
    if (!String(form.reference_number || '').trim()) errors.reference_number = required;
    return errors;
}

function validateTransfer(form, t) {
    const errors = {};
    const required = t('common.required');
    if (!form.from_branch_id) errors.from_branch_id = required;
    if (!form.to_branch_id) errors.to_branch_id = required;
    else if (String(form.from_branch_id) === String(form.to_branch_id)) {
        errors.to_branch_id = t('finance.to_office_different', { defaultValue: 'Choose a different office' });
    }
    const plain = plainPrice(form.amount);
    const amountNum = Number(plain);
    if (plain == null || !Number.isFinite(amountNum) || amountNum <= 0) {
        errors.amount = t('common.invalid') || required;
    }
    if (!form.currency_id) errors.currency_id = required;
    if (!String(form.occurred_on || '').trim()) errors.occurred_on = required;
    if (!String(form.reference_number || '').trim()) errors.reference_number = required;
    return errors;
}

function dropError(setter, key) {
    setter((current) => {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
    });
}

export default function Finance() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isRTL = useIsRTL();
    const user = useAuthStore((state) => state.user);
    const lockedOffice = user?.branch_id ? String(user.branch_id) : null;
    const [voucherBusy, setVoucherBusy] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [transfer, setTransfer] = useState(emptyTransfer);
    const [open, setOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [transferSaving, setTransferSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [transferError, setTransferError] = useState('');
    const [transferErrors, setTransferErrors] = useState({});
    const [offices, setOffices] = useState([]);
    const [queue, setQueue] = useState([]);
    const [queueBusy, setQueueBusy] = useState(null);
    const [correction, setCorrection] = useState(null);
    const [shown, setShown] = useState(null);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');
    const [correctError, setCorrectError] = useState('');
    const [correcting, setCorrecting] = useState(false);

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.entry_type) params.entry_type = filters.entry_type;
        if (filters.status) params.status = filters.status;
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        const branch = lockedOffice || filters.branch;
        if (branch) params.branch = branch;
        const res = await fetch.get('finance', { params });
        return res.data?.data || {};
    }, [lockedOffice]);

    const list = usePagedList(fetchPage);
    const columns = useColumnVisibility('finance.table.columns', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);
    const totals = list.payload?.totals || null;
    const currencies = list.payload?.currencies || [];
    const wallets = list.payload?.wallets || [];
    const totalsByCurrency = totals?.by_currency || [];

    const loadQueue = useCallback(() => {
        const params = {};
        const activeBranch = lockedOffice || list.filters.branch;
        if (activeBranch) params.branch = activeBranch;
        fetch.get('finance/commission-queue', { params })
            .then((res) => setQueue(res.data?.data?.items || []))
            .catch(() => setQueue([]));
    }, [lockedOffice, list.filters.branch]);

    useEffect(() => {
        let active = true;
        fetch.get('branches/options')
            .then((res) => {
                if (active) setOffices(res.data?.data?.branches || []);
            })
            .catch(() => { });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        loadQueue();
    }, [loadQueue, list.payload]);

    const setField = (key) => (event) => {
        const value = key === 'amount' ? groupPriceInput(event.target.value) : event.target.value;
        setForm((current) => {
            const next = { ...current, [key]: value };
            if (key === 'entry_type') {
                next.direction = value === 'payment' ? current.direction || 'in' : 'in';
            }
            return next;
        });
        dropError(setFormErrors, key);
    };

    const setTransferField = (key) => (event) => {
        const value = key === 'amount' ? groupPriceInput(event.target.value) : event.target.value;
        setTransfer((current) => ({ ...current, [key]: value }));
        dropError(setTransferErrors, key);
    };

    const openPost = () => {
        const defaultBranch = lockedOffice
            || String(offices.find((row) => row.is_main)?.id || offices[0]?.id || '');
        setForm({
            ...emptyForm(),
            currency_id: String(totals?.base_currency_id || currencies[0]?.id || ''),
            branch_id: defaultBranch,
        });
        setFormError('');
        setFormErrors({});
        setOpen(true);
    };

    const openTransfer = () => {
        const defaultFrom = lockedOffice
            || String(offices.find((row) => row.is_main)?.id || offices[0]?.id || '');
        const defaultTo = String(offices.find((row) => String(row.id) !== defaultFrom)?.id || '');
        setTransfer({
            ...emptyTransfer(),
            from_branch_id: defaultFrom,
            to_branch_id: defaultTo,
            currency_id: String(totals?.base_currency_id || currencies[0]?.id || ''),
        });
        setTransferError('');
        setTransferErrors({});
        setTransferOpen(true);
    };

    const postKey = useRef(crypto.randomUUID());

    const postEntry = async (event) => {
        event.preventDefault();
        const nextErrors = validateEntry(form, { lockedOffice, t });
        if (Object.keys(nextErrors).length) {
            setFormErrors(nextErrors);
            setFormError('');
            return;
        }
        setFormErrors({});
        setSaving(true);
        setFormError('');
        try {
            const direction = form.entry_type === 'payment' ? form.direction : 'in';
            const payload = {
                entry_type: form.entry_type,
                direction,
                amount: plainPrice(form.amount),
                currency_id: Number(form.currency_id),
                occurred_on: form.occurred_on,
            };
            const reference = String(form.reference_number || '').trim();
            if (reference) payload.reference_number = reference;
            const officeId = Number(lockedOffice || form.branch_id);
            if (Number.isInteger(officeId) && officeId > 0) {
                payload.branch_id = officeId;
            }
            await fetch.post('finance', {
                entries: [payload],
            }, { headers: { 'Idempotency-Key': postKey.current } });
            postKey.current = crypto.randomUUID();
            setOpen(false);
            list.reload();
            loadQueue();
        } catch (err) {
            const fields = err.response?.data?.error?.fields;
            if (fields && Object.keys(fields).length) setFormErrors(fields);
            else setFormError(err.response?.data?.error?.message || t('finance.save_error'));
        } finally {
            setSaving(false);
        }
    };

    const submitTransfer = async (event) => {
        event.preventDefault();
        const nextErrors = validateTransfer(transfer, t);
        if (Object.keys(nextErrors).length) {
            setTransferErrors(nextErrors);
            setTransferError('');
            return;
        }
        setTransferErrors({});
        setTransferSaving(true);
        setTransferError('');
        try {
            const body = {
                from_branch_id: Number(transfer.from_branch_id),
                to_branch_id: Number(transfer.to_branch_id),
                amount: plainPrice(transfer.amount),
                currency_id: Number(transfer.currency_id),
                occurred_on: transfer.occurred_on,
            };
            const reference = String(transfer.reference_number || '').trim();
            if (reference) body.reference_number = reference;
            await fetch.post('finance/transfers', body);
            setTransferOpen(false);
            list.reload();
        } catch (err) {
            const fields = err.response?.data?.error?.fields;
            if (fields && Object.keys(fields).length) setTransferErrors(fields);
            else setTransferError(err.response?.data?.error?.message || t('finance.save_error'));
        } finally {
            setTransferSaving(false);
        }
    };

    const settleQueue = async (row) => {
        const isPay = row.action === 'pay';
        const result = await Swal.fire({
            title: isPay ? t('finance.pay_confirm_title') : t('finance.collect_confirm_title'),
            text: `${moneyLabel(row.amount, row.currency_code, '')} · ${row.deal_reference}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: isPay ? t('finance.pay') : t('finance.collect'),
            cancelButtonText: t('common.cancel'),
            confirmButtonColor: isPay ? '#d97706' : '#059669',
        });
        if (!result.isConfirmed) return;

        setQueueBusy(row.id);
        list.setError('');
        try {
            const path = isPay
                ? `finance/commissions/${row.id}/pay`
                : `finance/commissions/${row.id}/collect`;
            await fetch.post(path, { occurred_on: today() });
            list.reload();
            loadQueue();
            Swal.fire({
                icon: 'success',
                title: t('common.success'),
                text: t('finance.settle_success'),
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (err) {
            const msg = err.response?.data?.error?.message || t('finance.save_error');
            list.setError(msg);
            Swal.fire({
                icon: 'error',
                title: t('common.error'),
                text: msg,
            });
        } finally {
            setQueueBusy(null);
        }
    };

    const openCorrect = (row, action) => {
        const next = { row, action };
        setCorrection(next);
        setShown(next);
        setReason('');
        setReasonError('');
        setCorrectError('');
    };

    const submitCorrect = async () => {
        if (!correction) return;
        if (!reason.trim()) {
            setReasonError(t('common.required'));
            return;
        }
        setCorrecting(true);
        setCorrectError('');
        setReasonError('');
        list.setError('');
        try {
            await fetch.post(`finance/${correction.row.id}/${correction.action}`, { reason: reason.trim() });
            setCorrection(null);
            list.reload();
            loadQueue();
        } catch (err) {
            const fields = err.response?.data?.error?.fields;
            if (fields?.reason) setReasonError(fields.reason);
            else setCorrectError(err.response?.data?.error?.message || t('finance.save_error'));
        } finally {
            setCorrecting(false);
        }
    };

    const printVoucher = async (id) => {
        setVoucherBusy(id);
        try {
            await printFinanceVoucher({ entryId: id, t, isRTL });
        } finally {
            setVoucherBusy(null);
        }
    };

    const pickerColumns = [
        { key: 'invoice_id', label: t('finance.invoice_id'), locked: true },
        { key: 'reference', label: t('finance.reference'), locked: true },
        { key: 'date', label: t('finance.date') },
        { key: 'office', label: t('finance.office') },
        { key: 'type', label: t('finance.type') },
        { key: 'direction', label: t('finance.direction') },
        { key: 'status', label: t('workspace_ui.status') },
        { key: 'amount', label: t('finance.amount'), locked: true },
        { key: 'actions', label: t('workspace_ui.actions'), locked: true },
    ];

    const tableColumns = [
        {
            key: 'invoice_id',
            locked: true,
            header: t('finance.invoice_id'),
            render: (row) => (
                <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                        fontFamily: 'monospace',
                        color: 'primary.main',
                        letterSpacing: 0.5,
                    }}
                >
                    {row.invoice_id || `FIN-${row.id}`}
                </Typography>
            ),
        },
        {
            key: 'reference',
            locked: true,
            header: t('finance.reference'),
            render: (row) => row.reference_number || '—',
        },
        { key: 'date', header: t('finance.date'), render: (row) => row.occurred_on },
        { key: 'office', header: t('finance.office'), render: (row) => row.branch_name || '—' },
        {
            key: 'type',
            header: t('finance.type'),
            render: (row) => {
                if (String(row.reference_number || '').startsWith('STAFF-COM-')) {
                    return t('finance.staff_commission');
                }
                if (String(row.reference_number || '').startsWith('XFER-')) {
                    return t('finance.transfer');
                }
                return t(`finance.types.${row.entry_type}`, { defaultValue: row.entry_type });
            },
        },
        {
            key: 'direction',
            header: t('finance.direction'),
            render: (row) => (
                <Chip
                    size="small"
                    variant="outlined"
                    label={t(row.direction === 'out' ? 'finance.out' : 'finance.in')}
                    color={row.direction === 'out' ? 'warning' : 'success'}
                    sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                />
            ),
        },
        { key: 'status', header: t('workspace_ui.status'), render: (row) => <StatusChip status={row.status} label={t(`finance.statuses.${row.status}`)} /> },
        {
            key: 'amount',
            locked: true,
            header: t('finance.amount'),
            render: (row) => {
                const isOut = row.direction === 'out';
                const isVoid = row.status === 'void' || row.status === 'reversed';
                return (
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                            fontVariantNumeric: 'tabular-nums',
                            textDecoration: isVoid ? 'line-through' : 'none',
                            color: isVoid
                                ? 'text.disabled'
                                : isOut
                                    ? 'error.main'
                                    : 'success.main',
                        }}
                    >
                        {isOut ? '-' : '+'}{moneyLabel(row.amount, row.currency_code, '')}
                    </Typography>
                );
            },
        },
        {
            key: 'actions',
            locked: true,
            header: (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                    <span>{t('workspace_ui.actions')}</span>
                    <ColumnPicker columns={pickerColumns} hidden={columns.hidden} onToggle={columns.toggle} onReset={columns.reset} />
                </Stack>
            ),
            pin: 'end',
            render: (row) => (
                <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                    <ActionIconButton
                        action="print"
                        title={t('finance.voucher')}
                        disabled={voucherBusy === row.id}
                        onClick={() => printVoucher(row.id)}
                    />
                    {row.status === 'posted' && row.entry_type !== 'reversal' ? (
                        <Can permission="financial:record">
                            <ActionIconButton action="void" onClick={() => openCorrect(row, 'void')} />
                            <ActionIconButton action="reverse" onClick={() => openCorrect(row, 'reverse')} />
                        </Can>
                    ) : null}
                </Stack>
            ),
        },
    ];

    const officeFilter = lockedOffice ? [] : [{
        key: 'branch',
        label: t('finance.office'),
        value: list.filters.branch || '',
        onChange: (value) => list.setFilter('branch', value),
        options: offices.map((office) => ({ value: String(office.id), label: office.name })),
    }];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('finance.title')}
                description={t('workspace_ui.finance_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<Assessment />}
                            onClick={() => navigate('/admin/finance/report')}
                        >
                            {t('finance.report')}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Security />}
                            onClick={() => navigate('/admin/reports/finance-audit')}
                        >
                            {t('reports.finance_audit_title')}
                        </Button>
                        <Can permission="financial:record">
                            {!lockedOffice && (
                                <Button
                                    variant="outlined"
                                    startIcon={<SwapHoriz />}
                                    onClick={openTransfer}
                                >
                                    {t('finance.transfer')}
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={openPost}
                            >
                                {t('finance.post')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            {list.filters.from && list.filters.to && list.filters.from > list.filters.to && (
                <Alert severity="warning" sx={{ mb: 2 }}>{t('finance.date_range_error')}</Alert>
            )}
            {wallets.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5, mb: 2 }}>
                    {wallets.map((wallet) => (
                        <Paper
                            key={wallet.currency_id}
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                borderInlineStart: '4px solid',
                                borderInlineStartColor: 'primary.main',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 },
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                                    {t('finance.wallet', { code: wallet.currency_code })}
                                </Typography>
                                <AccountBalanceWallet fontSize="small" sx={{ color: 'primary.main', opacity: 0.8 }} />
                            </Stack>
                            <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {moneyLabel(wallet.balance, wallet.currency_code)}
                            </Typography>
                        </Paper>
                    ))}
                </Box>
            )}
            {totals && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 2 }}>
                    {FIGURES.map((item) => {
                        const cfg = FIGURE_CONFIG[item.key] || FIGURE_CONFIG.cash_balance;
                        const IconComponent = cfg.icon;
                        return (
                            <Paper
                                key={item.key}
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    borderInlineStart: '4px solid',
                                    borderInlineStartColor: cfg.borderColor,
                                    transition: 'all 0.2s ease',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 1 },
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        {t(item.labelKey)}
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 0.5,
                                            borderRadius: 1,
                                            bgcolor: cfg.bgColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <IconComponent sx={{ fontSize: 18, color: cfg.color }} />
                                    </Box>
                                </Stack>
                                {(totalsByCurrency.length > 0 ? totalsByCurrency : [{ currency_code: '', [item.key]: totals[item.key] }]).map((row) => (
                                    <Typography
                                        key={`${item.key}-${row.currency_code || 'base'}`}
                                        variant="subtitle1"
                                        fontWeight={700}
                                        sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.35 }}
                                    >
                                        {moneyLabel(row[item.key], row.currency_code)}
                                    </Typography>
                                ))}
                            </Paper>
                        );
                    })}
                </Box>
            )}
            {queue.length > 0 && (
                <Stack spacing={2} sx={{ mb: 2 }}>
                    {(() => {
                        const toCollect = queue.filter((row) => row.action === 'collect');
                        const toPay = queue.filter((row) => row.action === 'pay');
                        const queueColumns = [
                            { key: 'deal_reference', header: t('finance.deal'), render: (row) => row.deal_reference },
                            { key: 'property_reference', header: t('properties.reference'), render: (row) => row.property_reference || '—' },
                            { key: 'staff_name', header: t('reports.agent'), render: (row) => row.staff_name || '—' },
                            { key: 'branch_name', header: t('finance.office'), render: (row) => row.branch_name || '—' },
                            { key: 'amount', header: t('finance.amount'), render: (row) => moneyLabel(row.amount, row.currency_code, '') },
                            {
                                key: 'actions',
                                header: t('workspace_ui.actions'),
                                render: (row) => (
                                    <Can permission="financial:record">
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color={row.action === 'pay' ? 'warning' : 'success'}
                                            disabled={queueBusy === row.id}
                                            onClick={() => settleQueue(row)}
                                        >
                                            {row.action === 'pay' ? t('finance.pay') : t('finance.collect')}
                                        </Button>
                                    </Can>
                                ),
                            },
                        ];
                        return (
                            <>
                                {toCollect.length > 0 && (
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('finance.collect_queue')}</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                            {t('finance.collect_queue_hint')}
                                        </Typography>
                                        <DataTable columns={queueColumns} rows={toCollect} empty={t('finance.queue_empty')} />
                                    </Paper>
                                )}
                                {toPay.length > 0 && (
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('finance.pay_queue')}</Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                            {t('finance.pay_queue_hint')}
                                        </Typography>
                                        <DataTable columns={queueColumns} rows={toPay} empty={t('finance.queue_empty')} />
                                    </Paper>
                                )}
                            </>
                        );
                    })()}
                </Stack>
            )}
            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'entry_type',
                        label: t('finance.type'),
                        value: list.filters.entry_type || '',
                        onChange: (value) => list.setFilter('entry_type', value),
                        options: ENTRY_TYPES.map((type) => ({ value: type, label: t(`finance.types.${type}`) })),
                    },
                    {
                        key: 'status',
                        label: t('workspace_ui.status'),
                        value: list.filters.status || '',
                        onChange: (value) => list.setFilter('status', value),
                        options: STATUSES.map((status) => ({ value: status, label: t(`finance.statuses.${status}`) })),
                    },
                    ...officeFilter,
                    { key: 'from', label: t('operations.from'), type: 'date', value: list.filters.from || '', onChange: (value) => list.setFilter('from', value) },
                    { key: 'to', label: t('operations.to'), type: 'date', value: list.filters.to || '', onChange: (value) => list.setFilter('to', value) },
                ]}
            />
            <DataTable
                columns={tableColumns.filter((column) => column.locked || !hidden.has(column.key))}
                rows={list.items}
                loading={list.loading}
                empty={t('finance.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
            />
            <RecordDialog open={open} title={t('finance.post')} onClose={() => setOpen(false)} onSubmit={postEntry} saving={saving} submitLabel={t('finance.save')} noValidate>
                {formError && <Alert severity="error">{formError}</Alert>}
                <TextField select label={t('finance.type')} value={form.entry_type} onChange={setField('entry_type')}>
                    {POST_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>{t(`finance.types.${type}`)}</MenuItem>
                    ))}
                </TextField>
                {form.entry_type === 'payment' && (
                    <TextField select label={t('finance.direction')} value={form.direction} onChange={setField('direction')}>
                        <MenuItem value="in">{t('finance.in')}</MenuItem>
                        <MenuItem value="out">{t('finance.out')}</MenuItem>
                    </TextField>
                )}
                <TextField label={t('finance.amount')} value={form.amount} onChange={setField('amount')} required error={Boolean(formErrors.amount)} helperText={formErrors.amount} />
                <TextField select label={t('finance.currency')} value={form.currency_id} onChange={setField('currency_id')} required error={Boolean(formErrors.currency_id)} helperText={formErrors.currency_id}>
                    {currencies.map((currency) => (
                        <MenuItem key={currency.id} value={String(currency.id)}>{currency.code}</MenuItem>
                    ))}
                </TextField>
                {!lockedOffice && (
                    <TextField select label={t('finance.office')} value={form.branch_id} onChange={setField('branch_id')} required error={Boolean(formErrors.branch_id)} helperText={formErrors.branch_id}>
                        {offices.map((office) => (
                            <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>
                        ))}
                    </TextField>
                )}
                <TextField label={t('finance.date')} type="date" value={form.occurred_on} onChange={setField('occurred_on')} slotProps={{ inputLabel: { shrink: true } }} required error={Boolean(formErrors.occurred_on)} helperText={formErrors.occurred_on} />
                <TextField label={t('finance.reference')} value={form.reference_number} onChange={setField('reference_number')} required error={Boolean(formErrors.reference_number)} helperText={formErrors.reference_number} />
            </RecordDialog>
            <RecordDialog
                open={transferOpen}
                title={t('finance.transfer')}
                onClose={() => setTransferOpen(false)}
                onSubmit={submitTransfer}
                saving={transferSaving}
                submitLabel={t('finance.transfer_save')}
                noValidate
            >
                {transferError && <Alert severity="error">{transferError}</Alert>}
                <TextField select label={t('finance.from_office')} value={transfer.from_branch_id} onChange={setTransferField('from_branch_id')} required error={Boolean(transferErrors.from_branch_id)} helperText={transferErrors.from_branch_id}>
                    {offices.map((office) => (
                        <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>
                    ))}
                </TextField>
                <TextField select label={t('finance.to_office')} value={transfer.to_branch_id} onChange={setTransferField('to_branch_id')} required error={Boolean(transferErrors.to_branch_id)} helperText={transferErrors.to_branch_id}>
                    {offices.map((office) => (
                        <MenuItem key={office.id} value={String(office.id)}>{office.name}</MenuItem>
                    ))}
                </TextField>
                <TextField label={t('finance.amount')} value={transfer.amount} onChange={setTransferField('amount')} required error={Boolean(transferErrors.amount)} helperText={transferErrors.amount} />
                <TextField select label={t('finance.currency')} value={transfer.currency_id} onChange={setTransferField('currency_id')} required error={Boolean(transferErrors.currency_id)} helperText={transferErrors.currency_id}>
                    {currencies.map((currency) => (
                        <MenuItem key={currency.id} value={String(currency.id)}>{currency.code}</MenuItem>
                    ))}
                </TextField>
                <TextField label={t('finance.date')} type="date" value={transfer.occurred_on} onChange={setTransferField('occurred_on')} slotProps={{ inputLabel: { shrink: true } }} required error={Boolean(transferErrors.occurred_on)} helperText={transferErrors.occurred_on} />
                <TextField label={t('finance.reference')} value={transfer.reference_number} onChange={setTransferField('reference_number')} required error={Boolean(transferErrors.reference_number)} helperText={transferErrors.reference_number} />
            </RecordDialog>
            <Dialog
                open={Boolean(correction)}
                onClose={() => { if (!correcting) setCorrection(null); }}
                slotProps={{ transition: { onExited: () => setShown(null) } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    {t(shown?.action === 'reverse' ? 'finance.reverse_title' : 'finance.void_title')}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t(shown?.action === 'reverse' ? 'finance.reverse_warning' : 'finance.void_warning')}
                    </Alert>
                    {correctError && <Alert severity="error" sx={{ mb: 2 }}>{correctError}</Alert>}
                    <DialogContentText>
                        {shown?.row?.invoice_id || (shown?.row ? `FIN-${shown.row.id}` : '')}
                        {shown?.row ? ` · ${moneyLabel(shown.row.amount, shown.row.currency_code, '')}` : ''}
                    </DialogContentText>
                    <TextField
                        fullWidth
                        autoFocus
                        sx={{ mt: 2 }}
                        label={t('finance.reason')}
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setReasonError('');
                        }}
                        required
                        error={Boolean(reasonError)}
                        helperText={reasonError || t('finance.reason_hint')}
                        multiline
                        minRows={2}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCorrection(null)} disabled={correcting}>{t('common.cancel')}</Button>
                    <Button
                        color={shown?.action === 'void' ? 'error' : 'warning'}
                        variant="contained"
                        onClick={submitCorrect}
                        disabled={correcting}
                    >
                        {t(shown?.action === 'reverse' ? 'finance.reverse' : 'finance.void')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
