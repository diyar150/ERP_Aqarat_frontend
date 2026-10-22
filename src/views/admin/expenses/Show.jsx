import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import fetch from '@/utils/fetch';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { formatPrice, signedPrice, moneyLabel } from '@/utils/money.js';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { expenseError, expenseNumber, expenseWhen } from './expenseForm.js';

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
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'expenses.edit');
    const canApprove = can(user, 'expenses.approve');
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const fileRef = useRef(null);
    const [expense, setExpense] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(
        () => fetch.get(`admin/expenses/${id}`).then((res) => res.data?.data || null),
        [id],
    );

    useEffect(() => {
        let active = true;
        load()
            .then((row) => {
                if (active) setExpense(row);
            })
            .catch((err) => {
                if (!active) return;
                if (err.response?.status === 404) navigate('/admin/expenses/index');
                else setError(expenseError(err, t));
            });
        return () => { active = false; };
    }, [load, navigate, t]);

    const refresh = async () => {
        setExpense(await load());
    };

    const approve = async () => {
        setBusy(true);
        setError('');
        try {
            await fetch.post(`admin/expenses/${id}/approve`);
            await refresh();
        } catch (err) {
            setError(expenseError(err, t));
        } finally {
            setBusy(false);
        }
    };

    const reject = async () => {
        setBusy(true);
        setError('');
        try {
            await fetch.post(`admin/expenses/${id}/reject`, { reason: rejectReason.trim() });
            setRejectOpen(false);
            setRejectReason('');
            await refresh();
        } catch (err) {
            setError(expenseError(err, t));
        } finally {
            setBusy(false);
        }
    };

    const upload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setBusy(true);
        setError('');
        try {
            const body = new FormData();
            body.append('file', file);
            await fetch.post(`admin/expenses/${id}/receipts`, body);
            await refresh();
        } catch (err) {
            setError(expenseError(err, t));
        } finally {
            setBusy(false);
        }
    };

    const download = async (receipt) => {
        setError('');
        try {
            const res = await fetch.get(`admin/expenses/${id}/receipts/${receipt.id}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = receipt.original_name || 'receipt';
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(expenseError(err, t));
        }
    };

    const removeReceipt = async (receipt) => {
        setBusy(true);
        setError('');
        try {
            await fetch.delete(`admin/expenses/${id}/receipts/${receipt.id}`);
            await refresh();
        } catch (err) {
            setError(expenseError(err, t));
        } finally {
            setBusy(false);
        }
    };

    if (!expense) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                {error || <CircularProgress size={28} />}
            </Box>
        );
    }

    const amount = moneyLabel(expense.price, expense.currency_symbol || expense.currency_code, '');
    const converted = expense.converted_symbol && String(expense.converted_symbol) !== String(expense.currency_symbol)
        ? `${formatPrice(expense.converted_price)} ${expense.converted_symbol}`
        : null;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 1, minHeight: '100%' }}>
            <PageHeader
                title={expense.name}
                description={t('expenses.branch_hint')}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => navigate('/admin/expenses/index')}>{t('common.back')}</Button>
                        {canApprove && expense.approval_status === 'pending' && !expense.books_closed && (
                            <>
                                <Button color="error" disabled={busy} onClick={() => { setRejectReason(''); setRejectOpen(true); }}>{t('expenses.reject')}</Button>
                                <Button variant="contained" disabled={busy} onClick={approve}>{t('expenses.approve')}</Button>
                            </>
                        )}
                        {canEdit && !expense.books_closed && (
                            <Button variant="contained" onClick={() => navigate(`/admin/expenses/${id}/edit`)}>{t('common.edit')}</Button>
                        )}
                    </Stack>
                )}
            />
            {expense.books_closed && <Alert severity="info" sx={{ mb: 2 }}>{t('expenses.month_closed')}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Fact label={t('expenses.number')} value={expenseNumber(expense.id)} />
                    <Fact label={t('expenses.status')} value={<StatusChip status={expense.approval_status || 'pending'} label={t(`expenses.${expense.approval_status || 'pending'}`)} />} />
                    <Fact label={t('expenses.approval_note')} value={[expense.approval_note, expense.approver_name].filter(Boolean).join(' · ')} />
                    <Fact label={t('expenses.category')} value={expense.category_name} />
                    <Fact label={t('expenses.price')} value={amount} />
                    <Fact label={t('expenses.converted_price')} value={converted} />
                    <Fact label={t('expenses.date')} value={expense.date} />
                    <Fact label={t('expenses.branch')} value={expense.branch_name} />
                    <Fact
                        label={t('expenses.wallet')}
                        value={(
                            <Stack spacing={0.25}>
                                {(expense.branch_wallets || []).map((row) => (
                                    <Typography key={row.currency_code || row.currency_id} variant="body2">
                                        {moneyLabel(row.balance, row.currency_code, '')}
                                    </Typography>
                                ))}
                                {expense.branch_wallet != null && (
                                    <Typography variant="caption" color="text.secondary">
                                        {t('branches.book_total')}: {signedPrice(expense.branch_wallet)}
                                    </Typography>
                                )}
                            </Stack>
                        )}
                    />
                    <Fact label={t('expenses.user')} value={expense.user_name} />
                    <Fact label={t('expenses.note')} value={expense.note} />
                </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                <Typography fontWeight={700} sx={{ mb: 1.5 }}>{t('expenses.journal')}</Typography>
                {(expense.journal || []).length === 0 && <Typography color="text.secondary">{t('expenses.empty')}</Typography>}
                <Stack spacing={1.25}>
                    {(expense.journal || []).map((line) => (
                        <Box key={line.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1fr 1.4fr' }, gap: 1 }}>
                            <Fact label={t('expenses.reference')} value={line.reference_number} />
                            <Fact label={t('expenses.date')} value={expenseWhen(line.occurred_on)} />
                            <Fact label={t('expenses.price')} value={moneyLabel(line.amount, line.currency_symbol || line.currency_code, '')} />
                            <Fact label={t('expenses.status')} value={t(`expenses.${line.status}`, line.status)} />
                            <Fact label={t('expenses.reason')} value={[line.reason, line.actor].filter(Boolean).join(' · ')} />
                        </Box>
                    ))}
                    {(expense.events || []).filter((event) => event.action === 'expense.restore').map((event) => (
                        <Fact key={event.id} label={t('expenses.restore_title')} value={[event.reason, event.actor].filter(Boolean).join(' · ')} />
                    ))}
                </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box>
                        <Typography fontWeight={700}>{t('expenses.receipts')}</Typography>
                        <Typography variant="body2" color="text.secondary">{t('expenses.receipt_hint')}</Typography>
                    </Box>
                    {canEdit && (
                        <Button variant="outlined" disabled={busy || (expense.receipts || []).length >= 5} onClick={() => fileRef.current?.click()}>
                            {t('expenses.add_receipt')}
                        </Button>
                    )}
                </Stack>
                <input ref={fileRef} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={upload} />
                {(expense.receipts || []).length === 0 && <Typography color="text.secondary">{t('expenses.no_receipts')}</Typography>}
                <Stack spacing={1}>
                    {(expense.receipts || []).map((receipt) => (
                        <Stack key={receipt.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Button onClick={() => download(receipt)}>{receipt.original_name}</Button>
                            {canEdit && <Button color="error" disabled={busy} onClick={() => removeReceipt(receipt)}>{t('common.delete')}</Button>}
                        </Stack>
                    ))}
                </Stack>
            </Paper>
            <Dialog open={rejectOpen} onClose={() => { if (!busy) setRejectOpen(false); }}>
                <DialogTitle>{t('expenses.reject_title')}</DialogTitle>
                <DialogContent>
                    <TextField fullWidth sx={{ mt: 1 }} label={t('expenses.reason')} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} helperText={t('expenses.reason_hint')} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectOpen(false)} disabled={busy}>{t('common.cancel')}</Button>
                    <Button color="error" variant="contained" onClick={reject} disabled={busy || !rejectReason.trim()}>{t('expenses.reject')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
