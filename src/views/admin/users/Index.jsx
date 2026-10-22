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
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import fetch from '@/utils/fetch';
import { canAny } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import Can from '@/components/auth/Can.jsx';
import { ActionIconButton } from '@/components/common';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { userError } from './userForm.js';

const STAFF_VIEW = ['users.view', 'staff:view'];
const STAFF_CREATE = ['users.create', 'staff:manage'];
const STAFF_EDIT = ['users.edit', 'staff:manage'];
const STAFF_DELETE = ['users.delete', 'staff:manage'];

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

export default function UserIndex() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const currentUserId = user?.id;
    const canView = canAny(user, STAFF_VIEW);
    const canEdit = canAny(user, STAFF_EDIT);
    const canRemove = canAny(user, STAFF_DELETE);
    const [pending, setPending] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = {
            page,
            limit: 25,
            search: q || '',
            searchBy: 'name',
        };
        if (filters.status === 'active' || filters.status === 'disabled') {
            params.status = filters.status;
        }
        const res = await fetch.get('admin/users', { params });
        return {
            items: res.data?.data || [],
            total: Number(res.data?.total || 0),
            limit: Number(res.data?.limit || 25),
            summary: res.data?.summary || null,
        };
    }, []);

    const list = usePagedList(fetchPage);
    const summary = list.payload?.summary || { users: list.total, active: 0, disabled: 0 };

    const runAction = async () => {
        if (!pending) return;
        setBusy(true);
        list.setError('');
        try {
            if (pending.type === 'delete') {
                await fetch.delete(`admin/users/${pending.user.id}`);
                setNotice(t('user.delete_success'));
            } else {
                await fetch.patch(`admin/users/${pending.user.id}/status`, { status: pending.nextStatus });
                setNotice(pending.nextStatus === 'disabled' ? t('user.disable_success') : t('user.enable_success'));
            }
            setPending(null);
            list.reload();
        } catch (err) {
            list.setError(userError(err, t, pending.type === 'delete' ? 'user.delete_error' : 'user.status_error'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('user.title')}
                description={t('user.hint')}
                action={(
                    <Can permission={STAFF_CREATE} any>
                        <Button variant="contained" onClick={() => navigate('/admin/users/create')}>
                            {t('user.add_new')}
                        </Button>
                    </Can>
                )}
            />

            {list.error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => list.setError('')}>{list.error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <SummaryCard label={t('user.summary_users')} value={summary.users} />
                <SummaryCard label={t('user.summary_active')} value={summary.active} />
                <SummaryCard label={t('user.summary_disabled')} value={summary.disabled} />
            </Stack>

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'status',
                        label: t('user.status'),
                        value: list.filters.status || '',
                        allLabel: t('user.status_all'),
                        onChange: (value) => list.setFilter('status', value),
                        options: [
                            { value: 'active', label: t('user.status_active') },
                            { value: 'disabled', label: t('user.status_disabled') },
                        ],
                    },
                ]}
            />

            <DataTable
                columns={[
                    {
                        key: 'username',
                        locked: true,
                        header: t('user.username'),
                        render: (row) => (
                            <Typography variant="body2" fontWeight={600}>{row.username}</Typography>
                        ),
                    },
                    {
                        key: 'email',
                        header: t('user.email'),
                        render: (row) => (
                            <Typography variant="body2" dir="ltr">{row.email || '—'}</Typography>
                        ),
                    },
                    {
                        key: 'phone',
                        header: t('user.phone_number'),
                        render: (row) => (
                            <Typography variant="body2" dir="ltr">{row.phone_number || '—'}</Typography>
                        ),
                    },
                    {
                        key: 'role',
                        header: t('user.role'),
                        render: (row) => row.role_name || '—',
                    },
                    {
                        key: 'office',
                        header: t('user.office'),
                        render: (row) => row.branch_name || t('user.all_offices'),
                    },
                    {
                        key: 'status',
                        header: t('user.status'),
                        render: (row) => (
                            <StatusChip
                                status={row.status === 'disabled' ? 'disabled' : 'active'}
                                label={row.status === 'disabled' ? t('user.status_disabled') : t('user.status_active')}
                            />
                        ),
                    },
                    {
                        key: 'actions',
                        header: t('workspace_ui.actions'),
                        pin: 'end',
                        render: (row) => {
                            const isSelf = Number(row.id) === Number(currentUserId);
                            const isDisabled = row.status === 'disabled';
                            return (
                                <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
                                    {canView && (
                                        <ActionIconButton
                                            action="view"
                                            onClick={() => navigate(`/admin/users/${row.id}/show`)}
                                        />
                                    )}
                                    {canEdit && (
                                        <ActionIconButton
                                            action="edit"
                                            onClick={() => navigate(`/admin/users/${row.id}/edit`)}
                                        />
                                    )}
                                    {canEdit && !isSelf && (
                                        <Tooltip title={isDisabled ? t('user.enable') : t('user.disable')}>
                                            <IconButton
                                                size="small"
                                                color={isDisabled ? 'success' : 'warning'}
                                                aria-label={isDisabled ? t('user.enable') : t('user.disable')}
                                                onClick={() => setPending({
                                                    type: 'status',
                                                    user: row,
                                                    nextStatus: isDisabled ? 'active' : 'disabled',
                                                })}
                                            >
                                                {isDisabled
                                                    ? <CheckCircleIcon fontSize="small" />
                                                    : <BlockOutlinedIcon fontSize="small" />}
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {canRemove && !isSelf && (
                                        <ActionIconButton
                                            action="delete"
                                            onClick={() => setPending({ type: 'delete', user: row })}
                                        />
                                    )}
                                </Stack>
                            );
                        },
                    },
                ]}
                rows={list.items}
                loading={list.loading}
                empty={t('user.empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
                onRowClick={canView ? (row) => navigate(`/admin/users/${row.id}/show`) : undefined}
            />

            <Dialog open={Boolean(pending)} onClose={() => (!busy ? setPending(null) : null)} fullWidth maxWidth="xs">
                <DialogTitle>
                    {pending?.type === 'delete'
                        ? t('user.delete_title')
                        : pending?.nextStatus === 'disabled'
                            ? t('user.disable_confirm_title')
                            : t('user.enable_confirm_title')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {pending?.type === 'delete'
                            ? t('user.delete_confirm', { name: pending?.user?.username })
                            : pending?.nextStatus === 'disabled'
                                ? t('user.disable_confirm')
                                : t('user.enable_confirm')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setPending(null)}>{t('common.cancel')}</Button>
                    <Button
                        color={pending?.type === 'delete' || pending?.nextStatus === 'disabled' ? 'error' : 'primary'}
                        variant="contained"
                        disabled={busy}
                        onClick={runAction}
                    >
                        {busy
                            ? t('common.processing')
                            : pending?.type === 'delete'
                                ? t('common.delete')
                                : pending?.nextStatus === 'disabled'
                                    ? t('user.disable')
                                    : t('user.enable')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
