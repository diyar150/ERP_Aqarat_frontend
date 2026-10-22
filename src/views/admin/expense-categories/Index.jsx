import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function categoryError(err, t, fallbackKey) {
    return err?.response?.data?.error?.message
        || err?.response?.data?.message
        || t(fallbackKey);
}

const emptyForm = { name: '' };

export default function ExpenseCategoryIndex() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canEdit = can(user, 'expense_categories.edit');
    const canRemove = can(user, 'expense_categories.delete');

    const [dialog, setDialog] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [fieldError, setFieldError] = useState('');
    const [saving, setSaving] = useState(false);
    const [pending, setPending] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [notice, setNotice] = useState('');

    const fetchPage = useCallback(async ({ page, q }) => {
        const params = { page, limit: 25 };
        if (q) params.search = q;
        const res = await fetch.get('admin/expense-categories', { params });
        return {
            items: res.data?.data || [],
            total: Number(res.data?.total || 0),
            limit: Number(res.data?.limit || 25),
        };
    }, []);

    const list = usePagedList(fetchPage);
    const inUse = list.items.reduce((sum, row) => sum + Number(row.expense_count || 0), 0);

    const openCreate = () => {
        setForm(emptyForm);
        setFieldError('');
        setDialog({ mode: 'create' });
    };

    const openEdit = (row) => {
        setForm({ name: row.name || '' });
        setFieldError('');
        setDialog({ mode: 'edit', id: row.id, name: row.name });
    };

    const closeDialog = () => {
        if (saving) return;
        setDialog(null);
        setForm(emptyForm);
        setFieldError('');
    };

    const save = async () => {
        const name = String(form.name || '').trim();
        if (!name) {
            setFieldError(t('common.required'));
            return;
        }
        setSaving(true);
        list.setError('');
        try {
            if (dialog?.mode === 'edit') {
                await fetch.put(`admin/expense-categories/${dialog.id}`, { name });
                setNotice(t('expense_categories.update_success'));
            } else {
                await fetch.post('admin/expense-categories', { name });
                setNotice(t('expense_categories.create_success'));
            }
            setDialog(null);
            setForm(emptyForm);
            list.reload();
        } catch (err) {
            const message = categoryError(err, t, dialog?.mode === 'edit'
                ? 'expense_categories.update_error'
                : 'expense_categories.create_error');
            const field = err?.response?.data?.errors?.name;
            if (field) setFieldError(Array.isArray(field) ? field[0] : field);
            else list.setError(message);
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!pending) return;
        setRemoving(true);
        list.setError('');
        try {
            await fetch.delete(`admin/expense-categories/${pending.id}`);
            setPending(null);
            setNotice(t('expense_categories.delete_success'));
            list.reload();
        } catch (err) {
            list.setError(categoryError(err, t, 'expense_categories.delete_error'));
        } finally {
            setRemoving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('expense_categories.title')}
                description={t('expense_categories.hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button variant="outlined" onClick={() => navigate('/admin/expenses/index')}>
                            {t('expense_categories.back')}
                        </Button>
                        <Can permission="expense_categories.create">
                            <Button variant="contained" onClick={openCreate}>
                                {t('expense_categories.add_new')}
                            </Button>
                        </Can>
                    </Stack>
                )}
            />

            {list.error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => list.setError('')}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <SummaryCard label={t('expense_categories.summary_count')} value={list.total} />
                <SummaryCard label={t('expense_categories.summary_in_use')} value={inUse} />
            </Stack>

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
            />

            <DataTable
                columns={[
                    {
                        key: 'name',
                        locked: true,
                        header: t('expense_categories.name'),
                        render: (row) => (
                            <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                        ),
                    },
                    {
                        key: 'expense_count',
                        header: t('expense_categories.expense_count'),
                        render: (row) => Number(row.expense_count || 0),
                    },
                    {
                        key: 'actions',
                        header: t('workspace_ui.actions'),
                        pin: 'end',
                        render: (row) => (
                            <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                                {canEdit && (
                                    <ActionIconButton action="edit" onClick={() => openEdit(row)} />
                                )}
                                {canRemove && (
                                    <ActionIconButton
                                        action="delete"
                                        disabled={Number(row.expense_count || 0) > 0}
                                        title={Number(row.expense_count || 0) > 0
                                            ? t('expense_categories.cannot_delete')
                                            : t('common.delete')}
                                        onClick={() => setPending(row)}
                                    />
                                )}
                            </Stack>
                        ),
                    },
                ]}
                rows={list.items}
                loading={list.loading}
                empty={t('expense_categories.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
            />

            <Dialog open={Boolean(dialog)} onClose={closeDialog} fullWidth maxWidth="xs">
                <DialogTitle>
                    {dialog?.mode === 'edit'
                        ? t('expense_categories.edit_title')
                        : t('expense_categories.add_new')}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('expense_categories.form_hint')}
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        required
                        size="small"
                        label={t('expense_categories.name')}
                        placeholder={t('expense_categories.name_placeholder')}
                        value={form.name}
                        disabled={saving}
                        error={Boolean(fieldError)}
                        helperText={fieldError || ' '}
                        onChange={(event) => {
                            setForm({ name: event.target.value });
                            if (fieldError) setFieldError('');
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                save();
                            }
                        }}
                        sx={{ mt: 0.5 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={saving} onClick={closeDialog}>{t('common.cancel')}</Button>
                    <Button variant="contained" disabled={saving} onClick={save}>
                        {saving ? t('common.saving', { defaultValue: '…' }) : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(pending)} onClose={() => (!removing ? setPending(null) : null)} fullWidth maxWidth="xs">
                <DialogTitle>{t('expense_categories.delete_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('expense_categories.delete_confirm', { name: pending?.name })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button disabled={removing} onClick={() => setPending(null)}>{t('common.cancel')}</Button>
                    <Button color="error" variant="contained" disabled={removing} onClick={remove}>
                        {removing ? t('common.processing', { defaultValue: '…' }) : t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
