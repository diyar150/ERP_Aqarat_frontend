import { useCallback, useState } from 'react';
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
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import DataTable, { StatusChip } from '@/components/workspace/DataTable.jsx';
import { usePagedList } from '@/components/workspace/usePagedList.js';
import { ActionIconButton } from '@/components/common';
import { platformCan, usePlatformAuthStore } from '@/store/platformAuthStore';

const emptyForm = { name: '', phone: '', password: '', passwordConfirm: '', role: 'ops' };
const ROLE_OPTIONS = ['owner', 'ops', 'billing', 'support'];

function apiError(err, fallback) {
    const raw = err?.response?.data;
    return {
        message: raw?.error?.message || raw?.message || fallback,
        fields: raw?.error?.fields || {},
    };
}

function formatDate(value) {
    const text = String(value || '').slice(0, 10);
    return text || '—';
}

export default function AdminsIndex() {
    const { t } = useTranslation();
    const me = usePlatformAuthStore((state) => state.admin);
    const canManageAdmins = platformCan(me, 'admins.manage');
    const isOwner = me?.role === 'owner';
    const [dialog, setDialog] = useState(null); // 'create' | 'edit' | null
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [notice, setNotice] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [confirm, setConfirm] = useState(null); // { type: 'status'|'archive', row }

    const fetchPage = useCallback(async ({ page, q, filters }) => {
        const params = { page, limit: 25 };
        if (q) params.q = q;
        if (filters.status) params.status = filters.status;
        const res = await fetch.get('platform/admins', { params });
        return res.data?.data || {};
    }, []);

    const list = usePagedList(fetchPage, { filters: { status: '' } });

    const isSelf = (row) => Number(row?.id) === Number(me?.id);

    const resetFormState = () => {
        setDialog(null);
        setEditing(null);
        setForm(emptyForm);
        setFormError('');
        setFieldErrors({});
        setShowPassword(false);
    };

    const closeForm = () => {
        if (saving) return;
        resetFormState();
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormError('');
        setFieldErrors({});
        setShowPassword(false);
        setDialog('create');
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm({
            name: row.name || '',
            phone: row.phone || '',
            password: '',
            passwordConfirm: '',
            role: row.role || 'ops',
        });
        setFormError('');
        setFieldErrors({});
        setShowPassword(false);
        setDialog('edit');
    };

    const setField = (key) => (event) => {
        const value = event.target.value;
        setForm((current) => ({ ...current, [key]: value }));
        setFieldErrors((current) => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const validateForm = (mode) => {
        const errors = {};
        const name = form.name.trim();
        const phone = form.phone.trim();
        const password = form.password;
        const passwordConfirm = form.passwordConfirm;

        if (!name) errors.name = t('platform.admin_name_required');
        else if (name.length > 120) errors.name = t('platform.admin_name_too_long');

        if (!phone) errors.phone = t('platform.admin_phone_required');
        else if (phone.length < 7 || phone.length > 32) errors.phone = t('platform.admin_phone_invalid');

        if (mode === 'create') {
            if (!password) errors.password = t('platform.admin_password_required');
            else if (password.length < 8 || password.length > 128) errors.password = t('platform.admin_password_hint');
            if (password !== passwordConfirm) errors.passwordConfirm = t('platform.admin_password_mismatch');
        } else if (password) {
            if (password.length < 8 || password.length > 128) errors.password = t('platform.admin_password_hint');
            if (password !== passwordConfirm) errors.passwordConfirm = t('platform.admin_password_mismatch');
        }

        return errors;
    };

    const submitForm = async (event) => {
        event?.preventDefault?.();
        if (saving) return;

        const mode = dialog;
        const errors = validateForm(mode);
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            setFormError('');
            return;
        }

        setSaving(true);
        setFormError('');
        setFieldErrors({});
        setNotice('');

        try {
            if (mode === 'create') {
                await fetch.post('platform/admins', {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    password: form.password,
                    role: form.role || 'ops',
                });
                setNotice(t('platform.admin_created'));
            } else if (mode === 'edit' && editing) {
                const payload = {
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    role: form.role || 'ops',
                };
                if (form.password) payload.password = form.password;
                await fetch.patch(`platform/admins/${editing.id}`, payload);
                setNotice(t('platform.admin_updated'));
            }
            resetFormState();
            list.reload();
        } catch (err) {
            const parsed = apiError(err, t('platform.save_error'));
            setFormError(parsed.message);
            setFieldErrors(parsed.fields || {});
        } finally {
            setSaving(false);
        }
    };

    const runConfirmedAction = async () => {
        if (!confirm?.row || busyId) return;
        const { type, row } = confirm;
        setBusyId(row.id);
        setNotice('');
        list.setError('');
        try {
            if (type === 'status') {
                const nextStatus = row.status === 'active' ? 'disabled' : 'active';
                await fetch.patch(`platform/admins/${row.id}`, { status: nextStatus });
                setNotice(nextStatus === 'active' ? t('platform.admin_enabled') : t('platform.admin_disabled'));
            } else if (type === 'archive') {
                await fetch.delete(`platform/admins/${row.id}`);
                setNotice(t('platform.admin_archived'));
            }
            setConfirm(null);
            list.reload();
        } catch (err) {
            const parsed = apiError(err, t('platform.save_error'));
            list.setError(parsed.message);
            setConfirm(null);
        } finally {
            setBusyId(null);
        }
    };

    const passwordField = (required) => (
        <TextField
            label={t('platform.password')}
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={setField('password')}
            required={required}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password || (required ? t('platform.admin_password_hint') : t('platform.admin_password_optional'))}
            autoComplete="new-password"
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                            edge="end"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={t('login.toggle_secret')}
                        >
                            {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </IconButton>
                    </InputAdornment>
                ),
            }}
        />
    );

    const columns = [
        {
            key: 'name',
            locked: true,
            header: t('platform.admin_name'),
            render: (row) => (
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <Typography fontWeight={600}>{row.name}</Typography>
                    {isSelf(row) && <Chip size="small" color="primary" variant="outlined" label={t('platform.admin_you')} />}
                </Stack>
            ),
        },
        {
            key: 'phone',
            header: t('platform.phone'),
            render: (row) => <span dir="ltr">{row.phone || '—'}</span>,
        },
        {
            key: 'role',
            header: t('platform.role'),
            render: (row) => t(`platform.roles.${row.role}`, { defaultValue: row.role || '—' }),
        },
        {
            key: 'status',
            header: t('workspace_ui.status'),
            render: (row) => (
                <StatusChip
                    status={row.status}
                    label={t(`platform.admin_statuses.${row.status}`, { defaultValue: row.status })}
                />
            ),
        },
        {
            key: 'created',
            header: t('common.created_at'),
            render: (row) => formatDate(row.created_at),
        },
        {
            key: 'updated',
            header: t('common.updated_at'),
            render: (row) => formatDate(row.updated_at),
        },
        {
            key: 'actions',
            locked: true,
            header: t('workspace_ui.actions'),
            pin: 'end',
            render: (row) => {
                const self = isSelf(row);
                const busy = busyId === row.id;
                const active = row.status === 'active';
                return (
                    <Stack direction="row" spacing={0.25} alignItems="center" onClick={(event) => event.stopPropagation()}>
                        <ActionIconButton
                            action="edit"
                            disabled={busy}
                            onClick={() => openEdit(row)}
                        />
                        <IconButton
                            size="small"
                            color={active ? 'warning' : 'success'}
                            disabled={busy || self}
                            aria-label={active ? t('platform.disable') : t('platform.enable')}
                            title={self ? t('platform.admin_cannot_self_disable') : (active ? t('platform.disable') : t('platform.enable'))}
                            onClick={() => setConfirm({ type: 'status', row })}
                        >
                            {active ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                        <ActionIconButton
                            action="delete"
                            disabled={busy || self}
                            title={self ? t('platform.admin_cannot_self_archive') : t('platform.archive_admin')}
                            onClick={() => setConfirm({ type: 'archive', row })}
                        />
                    </Stack>
                );
            },
        },
    ];

    const confirmTitle = confirm?.type === 'archive'
        ? t('platform.confirm_archive_admin_title')
        : confirm?.row?.status === 'active'
            ? t('platform.confirm_disable_admin_title')
            : t('platform.confirm_enable_admin_title');

    const confirmBody = confirm?.type === 'archive'
        ? t('platform.confirm_archive_admin', { name: confirm?.row?.name || '' })
        : confirm?.row?.status === 'active'
            ? t('platform.confirm_disable_admin', { name: confirm?.row?.name || '' })
            : t('platform.confirm_enable_admin', { name: confirm?.row?.name || '' });

    const confirmActionLabel = confirm?.type === 'archive'
        ? t('common.yes_delete')
        : confirm?.row?.status === 'active'
            ? t('platform.disable')
            : t('platform.enable');

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('platform.admins_title')}
                description={t('platform.admins_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button variant="outlined" onClick={() => list.reload()} disabled={list.loading}>
                            {t('common.refresh')}
                        </Button>
                        {canManageAdmins && (
                            <Button variant="contained" onClick={openCreate}>
                                {t('platform.create_admin')}
                            </Button>
                        )}
                    </Stack>
                )}
            />

            {list.error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => list.setError('')}>
                    {list.error}
                </Alert>
            )}
            {notice && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
                    {notice}
                </Alert>
            )}

            <ListToolbar
                search={list.query}
                onSearch={list.setSearch}
                filters={[
                    {
                        key: 'status',
                        label: t('workspace_ui.status'),
                        value: list.filters.status || '',
                        allLabel: t('workspace_ui.all'),
                        onChange: (value) => list.setFilter('status', value),
                        options: [
                            { value: 'active', label: t('platform.admin_statuses.active') },
                            { value: 'disabled', label: t('platform.admin_statuses.disabled') },
                        ],
                    },
                ]}
            />

            <DataTable
                columns={columns}
                rows={list.items}
                loading={list.loading}
                empty={t('platform.admins_empty')}
                page={list.page}
                limit={list.limit}
                total={list.total}
                onPageChange={list.setPage}
            />

            <Dialog
                open={Boolean(dialog)}
                onClose={closeForm}
                fullWidth
                maxWidth="sm"
                component="form"
                onSubmit={submitForm}
            >
                <DialogTitle>
                    {dialog === 'edit' ? t('platform.edit_admin') : t('platform.create_admin')}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {formError && <Alert severity="error">{formError}</Alert>}
                        <TextField
                            label={t('platform.admin_name')}
                            value={form.name}
                            onChange={setField('name')}
                            required
                            autoFocus
                            error={Boolean(fieldErrors.name)}
                            helperText={fieldErrors.name}
                        />
                        <TextField
                            label={t('platform.phone')}
                            value={form.phone}
                            onChange={setField('phone')}
                            required
                            error={Boolean(fieldErrors.phone)}
                            helperText={fieldErrors.phone}
                            inputProps={{ dir: 'ltr', inputMode: 'tel' }}
                        />
                        <TextField
                            select
                            label={t('platform.role')}
                            value={form.role || 'ops'}
                            onChange={setField('role')}
                            disabled={!isOwner}
                            error={Boolean(fieldErrors.role)}
                            helperText={fieldErrors.role}
                        >
                            {ROLE_OPTIONS.map((role) => (
                                <MenuItem key={role} value={role}>
                                    {t(`platform.roles.${role}`)}
                                </MenuItem>
                            ))}
                        </TextField>
                        {passwordField(dialog === 'create')}
                        <TextField
                            label={t('platform.password_confirm')}
                            type={showPassword ? 'text' : 'password'}
                            value={form.passwordConfirm}
                            onChange={setField('passwordConfirm')}
                            required={dialog === 'create' || Boolean(form.password)}
                            error={Boolean(fieldErrors.passwordConfirm)}
                            helperText={fieldErrors.passwordConfirm}
                            autoComplete="new-password"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeForm} disabled={saving}>{t('common.cancel')}</Button>
                    <Button type="submit" variant="contained" disabled={saving}>
                        {saving ? t('common.updating') : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(confirm)}
                onClose={() => { if (!busyId) setConfirm(null); }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>{confirmTitle}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{confirmBody}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(null)} disabled={Boolean(busyId)}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color={confirm?.type === 'archive' || confirm?.row?.status === 'active' ? 'error' : 'success'}
                        disabled={Boolean(busyId)}
                        onClick={runConfirmedAction}
                    >
                        {confirmActionLabel}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
