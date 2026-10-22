import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import fetch from '@/utils/fetch';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import ColumnPicker from '@/components/workspace/ColumnPicker.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { useColumnVisibility } from '@/components/workspace/useColumnVisibility.js';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { formatPrice, currencyLabel, moneyLabel } from '@/utils/money.js';
import { expenseError, expenseNumber, expenseWhen } from './expenseForm.js';

const OPTIONAL_COLUMNS = ['category', 'branch', 'date', 'user'];

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

export default function Index() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'expenses.edit');
    const canRemove = can(user, 'expenses.delete');
    const canApprove = can(user, 'expenses.approve');
    const [pending, setPending] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState(null);
    const [restoring, setRestoring] = useState(false);
    const [offices, setOffices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [reason, setReason] = useState('');
    const [restoreReason, setRestoreReason] = useState('');
    const [notice, setNotice] = useState('');
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [deciding, setDeciding] = useState(false);
    const attachId = useRef(null);
    const fileInput = useRef(null);
    const lockedOffice = user?.branch_id || null;

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('branches/options'),
            fetch.get('admin/expense-categories/all'),
        ]).then(([branchRes, categoryRes]) => {
            if (!active) return;
            setOffices(branchRes.data?.data?.branches || []);
            setCategories(categoryRes.data?.data || []);
        }).catch(() => {});
        return () => { active = false; };
    }, []);

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.branch) params.branch = filters.branch;
        if (filters.category) params.category = filters.category;
        if (filters.start) params.start = filters.start;
        if (filters.end) params.end = filters.end;
        if (filters.state === 'archived') params.state = 'archived';
        if (filters.approval) params.approval = filters.approval;
        const res = await fetch.get('admin/expenses', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage);
    const summary = list.payload?.summary || { expenses: 0, archived: 0, totals: [] };
    const archived = list.filters.state === 'archived';
    const columns = useColumnVisibility('expenses.table.columns', OPTIONAL_COLUMNS);
    const hidden = new Set(columns.hidden);

    const remove = async () => {
        if (!pending) return;
        setRemoving(true);
        list.setError('');
        try {
            await fetch.delete(`admin/expenses/${pending.id}`, { data: { reason: reason.trim() } });
            setPending(null);
            setReason('');
            list.reload();
        } catch (err) {
            list.setError(expenseError(err, t));
        } finally {
            setRemoving(false);
        }
    };

    const restore = async () => {
        if (!restoreTarget) return;
        setRestoring(true);
        list.setError('');
        try {
            await fetch.post(`admin/expenses/${restoreTarget.id}/restore`, { reason: restoreReason.trim() });
            setRestoreTarget(null);
            setRestoreReason('');
            list.reload();
        } catch (err) {
            list.setError(expenseError(err, t));
        } finally {
            setRestoring(false);
        }
    };

    const approve = async (row) => {
        setDeciding(true);
        list.setError('');
        try {
            await fetch.post(`admin/expenses/${row.id}/approve`);
            setNotice(t('expenses.approved'));
            list.reload();
        } catch (err) {
            list.setError(expenseError(err, t));
        } finally {
            setDeciding(false);
        }
    };

    const reject = async () => {
        if (!rejectTarget) return;
        setDeciding(true);
        list.setError('');
        try {
            await fetch.post(`admin/expenses/${rejectTarget.id}/reject`, { reason: rejectReason.trim() });
            setRejectTarget(null);
            setRejectReason('');
            list.reload();
        } catch (err) {
            list.setError(expenseError(err, t));
        } finally {
            setDeciding(false);
        }
    };

    const openAttach = (id) => {
        attachId.current = id;
        if (!fileInput.current) return;
        fileInput.current.value = '';
        fileInput.current.click();
    };

    const uploadReceipt = async (event) => {
        const file = event.target.files?.[0];
        const id = attachId.current;
        event.target.value = '';
        if (!file || !id) return;
        setNotice('');
        list.setError('');
        try {
            const body = new FormData();
            body.append('file', file);
            await fetch.post(`admin/expenses/${id}/receipts`, body);
            setNotice(t('expenses.attached'));
            list.reload();
        } catch (err) {
            list.setError(expenseError(err, t));
        }
    };

    const pickerColumns = [
        { key: 'number', label: t('expenses.number'), locked: true },
        { key: 'name', label: t('expenses.name'), locked: true },
        { key: 'category', label: t('expenses.category') },
        { key: 'price', label: t('expenses.price'), locked: true },
        { key: 'branch', label: t('expenses.branch') },
        { key: 'date', label: t('expenses.date') },
        { key: 'user', label: t('expenses.user') },
        { key: 'actions', label: t('workspace_ui.actions'), locked: true },
    ];

    const tableColumns = [
        {
            key: 'number',
            locked: true,
            header: t('expenses.number'),
            render: (row) => (
                <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {expenseNumber(row.id)}
                </Typography>
            ),
        },
        {
            key: 'name',
            locked: true,
            header: t('expenses.name'),
            render: (row) => (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Typography fontWeight={600}>{row.name}</Typography>
                    {row.deleted_at
                        ? <StatusChip status="archived" label={t('expenses.archived')} />
                        : <StatusChip status={row.approval_status || 'pending'} label={t(`expenses.${row.approval_status || 'pending'}`)} />}
                </Stack>
            ),
        },
        { key: 'category', header: t('expenses.category'), render: (row) => row.category_name || '—' },
        {
            key: 'price',
            locked: true,
            header: t('expenses.price'),
            render: (row) => moneyLabel(row.price, row.currency_symbol || row.currency_code, ''),
        },
        { key: 'branch', header: t('expenses.branch'), render: (row) => row.branch_name || '—' },
        { key: 'date', header: t('expenses.date'), render: (row) => expenseWhen(row.date) },
        { key: 'user', header: t('expenses.user'), render: (row) => row.user_name || '—' },
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
                    {archived ? (
                        canRemove && <ActionIconButton action="restore" onClick={() => { setRestoreReason(''); setRestoreTarget(row); }} />
                    ) : (
                        <>
                            {canApprove && row.approval_status === 'pending' && !row.books_closed && (
                                <>
                                    <Tooltip title={t('expenses.approve')}>
                                        <IconButton size="small" color="success" aria-label={t('expenses.approve')} disabled={deciding} onClick={() => approve(row)}>
                                            <CheckCircleIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('expenses.reject')}>
                                        <IconButton size="small" color="error" aria-label={t('expenses.reject')} disabled={deciding} onClick={() => { setRejectReason(''); setRejectTarget(row); }}>
                                            <HighlightOffIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                            {canEdit && (
                                <Tooltip title={t('expenses.add_receipt')}>
                                    <IconButton size="small" aria-label={t('expenses.add_receipt')} onClick={() => openAttach(row.id)}>
                                        <Badge badgeContent={row.receipt_count || 0} color="primary" invisible={!row.receipt_count}>
                                            <AttachFileIcon fontSize="small" />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                            )}
                            <ActionIconButton action="view" onClick={() => navigate(`/admin/expenses/${row.id}/show`)} />
                            {canEdit && <ActionIconButton action="edit" onClick={() => navigate(`/admin/expenses/${row.id}/edit`)} />}
                            {canRemove && <ActionIconButton action="delete" onClick={() => { setReason(''); setPending(row); }} />}
                        </>
                    )}
                </Stack>
            ),
        },
    ];

    const totals = summary.totals || [];

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: '100%',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            <PageHeader
                title={t('expenses.title')}
                description={t('expenses.branch_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Can permission="expense_categories.view">
                            <Button variant="outlined" onClick={() => navigate('/admin/expense-categories/index')}>
                                {t('expense_categories.title')}
                            </Button>
                        </Can>
                        <Can permission="expenses.view">
                            <Button onClick={() => {
                                const params = new URLSearchParams();
                                if (list.query) params.set('search', list.query);
                                if (list.filters.category) params.set('category_id', list.filters.category);
                                if (list.filters.branch) params.set('branch_id', list.filters.branch);
                                if (list.filters.start) params.set('start_date', list.filters.start);
                                if (list.filters.end) params.set('end_date', list.filters.end);
                                if (list.filters.approval) params.set('approval', list.filters.approval);
                                if (list.filters.state === 'archived') params.set('state', 'archived');
                                const query = params.toString();
                                navigate(query ? `/admin/expenses/report?${query}` : '/admin/expenses/report');
                            }}
                            >
                                {t('expenses.report')}
                            </Button>
                        </Can>
                        <Can permission="expenses.create">
                            <Button variant="contained" onClick={() => navigate('/admin/expenses/create')}>{t('expenses.add_new')}</Button>
                        </Can>
                    </Stack>
                )}
            />
            {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
            <input ref={fileInput} hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={uploadReceipt} />
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <SummaryCard label={t('expenses.summary_count')} value={summary.expenses} />
                <SummaryCard label={t('expenses.waiting')} value={summary.pending || 0} />
                {totals.length === 0 && <SummaryCard label={t('expenses.total_sum')} value="—" />}
                {totals.map((row) => {
                    const currency = currencyLabel(row.symbol || row.currency_code);
                    return (
                        <SummaryCard
                            key={row.currency_code || currency}
                            label={currency ? `${t('expenses.total_sum')} · ${currency}` : t('expenses.total_sum')}
                            value={formatPrice(row.total_price)}
                        />
                    );
                })}
            </Stack>
            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'approval',
                        label: t('expenses.status'),
                        value: list.filters.approval || '',
                        allLabel: t('expenses.all_statuses'),
                        onChange: (value) => list.setFilter('approval', value),
                        options: ['pending', 'approved', 'rejected'].map((status) => ({ value: status, label: t(`expenses.${status}`) })),
                    },
                    {
                        key: 'category',
                        label: t('expenses.category'),
                        value: list.filters.category || '',
                        allLabel: t('expenses.all_categories'),
                        onChange: (value) => list.setFilter('category', value),
                        options: categories.map((category) => ({ value: String(category.id), label: category.name })),
                    },
                    ...(lockedOffice ? [] : [{
                        key: 'branch',
                        label: t('expenses.branch'),
                        value: list.filters.branch || '',
                        allLabel: t('expenses.all_branches'),
                        onChange: (value) => list.setFilter('branch', value),
                        options: offices.map((office) => ({ value: String(office.id), label: office.name })),
                    }]),
                    {
                        key: 'start',
                        type: 'date',
                        label: t('expenses.start_date'),
                        value: list.filters.start || '',
                        onChange: (value) => list.setFilter('start', value),
                    },
                    {
                        key: 'end',
                        type: 'date',
                        label: t('expenses.end_date'),
                        value: list.filters.end || '',
                        onChange: (value) => list.setFilter('end', value),
                    },
                ]}
                end={(
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={archived ? 'archived' : 'active'}
                        onChange={(_, value) => {
                            if (value) list.setFilter('state', value === 'archived' ? 'archived' : '');
                        }}
                    >
                        <ToggleButton value="active">{t('expenses.active')}</ToggleButton>
                        <ToggleButton value="archived">
                            {summary.archived > 0 ? `${t('expenses.archived')} (${summary.archived})` : t('expenses.archived')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                )}
            />
            <DataTable
                fill
                columns={tableColumns.filter((column) => column.locked || !hidden.has(column.key))}
                rows={list.items}
                loading={list.loading}
                empty={archived ? t('expenses.empty_archived') : t('expenses.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={archived ? undefined : (row) => navigate(`/admin/expenses/${row.id}/show`)}
            />
            <Dialog open={Boolean(rejectTarget)} onClose={() => { if (!deciding) setRejectTarget(null); }}>
                <DialogTitle>{t('expenses.reject_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{rejectTarget?.name}</DialogContentText>
                    <TextField fullWidth sx={{ mt: 2 }} label={t('expenses.reason')} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} helperText={t('expenses.reason_hint')} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectTarget(null)} disabled={deciding}>{t('common.cancel')}</Button>
                    <Button color="error" variant="contained" onClick={reject} disabled={deciding || !rejectReason.trim()}>{t('expenses.reject')}</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={Boolean(pending)} onClose={() => { if (!removing) setPending(null); }}>
                <DialogTitle>{t('expenses.delete_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('expenses.delete_confirm', { name: pending?.name || '' })}</DialogContentText>
                    <TextField fullWidth sx={{ mt: 2 }} label={t('expenses.reason')} value={reason} onChange={(event) => setReason(event.target.value)} helperText={t('expenses.reason_hint')} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPending(null)} disabled={removing}>{t('common.cancel')}</Button>
                    <Button color="error" variant="contained" onClick={remove} disabled={removing || !reason.trim()}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={Boolean(restoreTarget)} onClose={() => { if (!restoring) setRestoreTarget(null); }}>
                <DialogTitle>{t('expenses.restore_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('expenses.restore_confirm', { name: restoreTarget?.name || '' })}</DialogContentText>
                    <TextField fullWidth sx={{ mt: 2 }} label={t('expenses.reason')} value={restoreReason} onChange={(event) => setRestoreReason(event.target.value)} helperText={t('expenses.reason_hint')} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRestoreTarget(null)} disabled={restoring}>{t('common.cancel')}</Button>
                    <Button variant="contained" onClick={restore} disabled={restoring || !restoreReason.trim()}>{t('common.restore')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
