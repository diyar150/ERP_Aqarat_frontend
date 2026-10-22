import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import ListToolbar from '@/components/workspace/ListToolbar.jsx';
import { platformCan, usePlatformAuthStore } from '@/store/platformAuthStore';

function parsePermissions(limits) {
    let parsed = limits;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return [];
        }
    }
    return Array.isArray(parsed?.permissions)
        ? parsed.permissions.filter((item) => typeof item === 'string').sort()
        : [];
}

function toDraft(plan) {
    return {
        name: plan.name || '',
        billing_interval: plan.billing_interval || 'year',
        price_amount: plan.price_amount == null ? '' : String(plan.price_amount),
        trial_days: plan.trial_days == null ? '0' : String(plan.trial_days),
        grace_days: plan.grace_days == null ? '0' : String(plan.grace_days),
        permissions: parsePermissions(plan.feature_limits),
    };
}

function normalizeDraft(draft) {
    return {
        name: String(draft?.name || '').trim(),
        billing_interval: draft?.billing_interval === 'month' ? 'month' : 'year',
        price_amount: String(draft?.price_amount ?? '').trim(),
        trial_days: String(draft?.trial_days ?? '').trim(),
        grace_days: String(draft?.grace_days ?? '').trim(),
        permissions: [...(draft?.permissions || [])].map(String).sort(),
    };
}

function sameDraft(a, b) {
    const left = normalizeDraft(a);
    const right = normalizeDraft(b);
    return (
        left.name === right.name
        && left.billing_interval === right.billing_interval
        && left.price_amount === right.price_amount
        && left.trial_days === right.trial_days
        && left.grace_days === right.grace_days
        && left.permissions.join('|') === right.permissions.join('|')
    );
}

function apiError(err, fallback) {
    const raw = err?.response?.data;
    return {
        message: raw?.error?.message || raw?.message || fallback,
        fields: raw?.error?.fields || {},
    };
}

function formatMoney(value, currency) {
    const amount = value == null || value === '' ? '—' : String(value);
    return currency ? `${amount} ${currency}` : amount;
}

function localizeFeaturePermission(t, i18n, item) {
    const key = `platform.feature_permissions.${String(item.name || '').replace(':', '.')}`;
    if (i18n.exists(key)) return t(key);
    return item.description || item.name;
}

const emptyCreate = {
    code: '',
    name: '',
    billing_interval: 'year',
    price_amount: '',
    currency_code: 'USD',
    trial_days: '0',
    grace_days: '0',
    permissions: [],
};

export default function PlansIndex() {
    const { t, i18n } = useTranslation();
    const admin = usePlatformAuthStore((state) => state.admin);
    const canCreate = platformCan(admin, 'plans.create');
    const canUpdate = platformCan(admin, 'plans.update');
    const canRetire = platformCan(admin, 'plans.retire');

    const [plans, setPlans] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [baselines, setBaselines] = useState({});
    const [drafts, setDrafts] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [query, setQuery] = useState('');
    const [intervalFilter, setIntervalFilter] = useState('');
    const [showRetired, setShowRetired] = useState(false);
    const [confirmPlan, setConfirmPlan] = useState(null);
    const [retirePlan, setRetirePlan] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState(emptyCreate);
    const [createErrors, setCreateErrors] = useState({});
    const [creating, setCreating] = useState(false);

    const applyPlans = useCallback((items) => {
        const nextDrafts = {};
        const nextBaselines = {};
        for (const plan of items) {
            const draft = toDraft(plan);
            nextDrafts[plan.id] = draft;
            nextBaselines[plan.id] = draft;
        }
        setPlans(items);
        setDrafts(nextDrafts);
        setBaselines(nextBaselines);
        setFieldErrors({});
    }, []);

    const load = useCallback(async ({ force = false } = {}) => {
        if (!force) {
            const hasDirty = Object.keys(drafts).some((id) => {
                const plan = plans.find((item) => String(item.id) === String(id));
                if (!plan) return false;
                return !sameDraft(drafts[id], baselines[id] || toDraft(plan));
            });
            if (hasDirty && !window.confirm(t('platform.plans_refresh_dirty'))) return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch.get('platform/plans', {
                params: showRetired ? { include_retired: 1 } : undefined,
            });
            applyPlans(res.data?.data?.items || []);
        } catch (err) {
            setError(apiError(err, t('platform.load_error')).message);
        } finally {
            setLoading(false);
        }
    }, [applyPlans, baselines, drafts, plans, showRetired, t]);

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('platform/plans', { params: showRetired ? { include_retired: 1 } : undefined }),
            fetch.get('platform/permission-catalog'),
        ])
            .then(([plansRes, catalogRes]) => {
                if (!active) return;
                applyPlans(plansRes.data?.data?.items || []);
                setCatalog(catalogRes.data?.data?.items || []);
            })
            .catch((err) => {
                if (active) setError(apiError(err, t('platform.load_error')).message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showRetired]);

    const setDraft = (id, key) => (event) => {
        const value = event.target.value;
        setDrafts((current) => ({
            ...current,
            [id]: { ...current[id], [key]: value },
        }));
        setFieldErrors((current) => {
            const planErrors = current[id];
            if (!planErrors?.[key]) return current;
            const nextPlan = { ...planErrors };
            delete nextPlan[key];
            return { ...current, [id]: nextPlan };
        });
    };

    const togglePermission = (id, permission) => {
        setDrafts((current) => {
            const draft = current[id] || { permissions: [] };
            const set = new Set(draft.permissions || []);
            if (set.has(permission)) set.delete(permission);
            else set.add(permission);
            return {
                ...current,
                [id]: { ...draft, permissions: [...set].sort() },
            };
        });
    };

    const discard = (plan) => {
        const baseline = baselines[plan.id] || toDraft(plan);
        setDrafts((current) => ({ ...current, [plan.id]: { ...baseline, permissions: [...(baseline.permissions || [])] } }));
        setFieldErrors((current) => ({ ...current, [plan.id]: {} }));
    };

    const validateDraft = (draft) => {
        const errors = {};
        const name = String(draft.name || '').trim();
        if (!name) errors.name = t('platform.plan_name_required');
        else if (name.length > 100) errors.name = t('platform.plan_name_too_long');

        if (draft.billing_interval !== 'month' && draft.billing_interval !== 'year') {
            errors.billing_interval = t('platform.plan_interval_invalid');
        }

        const price = Number(draft.price_amount);
        if (draft.price_amount === '' || !Number.isFinite(price) || price < 0) {
            errors.price_amount = t('platform.plan_price_invalid');
        }

        const trial = Number(draft.trial_days);
        if (
            draft.trial_days === ''
            || !Number.isInteger(trial)
            || trial < 0
            || trial > 3650
        ) {
            errors.trial_days = t('platform.plan_trial_invalid');
        }

        const grace = Number(draft.grace_days);
        if (
            draft.grace_days === ''
            || !Number.isInteger(grace)
            || grace < 0
            || grace > 3650
        ) {
            errors.grace_days = t('platform.plan_grace_invalid');
        }

        return errors;
    };

    const requestSave = (plan) => {
        const draft = drafts[plan.id] || toDraft(plan);
        const errors = validateDraft(draft);
        if (Object.keys(errors).length) {
            setFieldErrors((current) => ({ ...current, [plan.id]: errors }));
            setError('');
            return;
        }
        setConfirmPlan(plan);
    };

    const save = async () => {
        const plan = confirmPlan;
        if (!plan || savingId) return;
        const draft = drafts[plan.id] || toDraft(plan);
        const errors = validateDraft(draft);
        if (Object.keys(errors).length) {
            setFieldErrors((current) => ({ ...current, [plan.id]: errors }));
            setConfirmPlan(null);
            return;
        }

        setSavingId(plan.id);
        setError('');
        setNotice('');
        try {
            const res = await fetch.patch(`platform/plans/${plan.id}`, {
                name: String(draft.name).trim(),
                billing_interval: draft.billing_interval,
                price_amount: Number(draft.price_amount),
                trial_days: Number(draft.trial_days),
                grace_days: Number(draft.grace_days),
                feature_limits: { permissions: draft.permissions || [] },
            });
            const updated = res.data?.data;
            if (updated?.id) {
                setPlans((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
                const nextDraft = toDraft(updated);
                setDrafts((current) => ({ ...current, [updated.id]: nextDraft }));
                setBaselines((current) => ({ ...current, [updated.id]: nextDraft }));
            } else {
                await load({ force: true });
            }
            setFieldErrors((current) => ({ ...current, [plan.id]: {} }));
            setNotice(t('platform.plan_saved', { name: String(draft.name).trim() || plan.code }));
            setConfirmPlan(null);
        } catch (err) {
            const parsed = apiError(err, t('platform.save_error'));
            setError(parsed.message);
            if (parsed.fields && Object.keys(parsed.fields).length) {
                setFieldErrors((current) => ({ ...current, [plan.id]: parsed.fields }));
            }
            setConfirmPlan(null);
        } finally {
            setSavingId(null);
        }
    };

    const confirmRetire = async () => {
        const plan = retirePlan;
        if (!plan || savingId) return;
        setSavingId(plan.id);
        setError('');
        try {
            await fetch.delete(`platform/plans/${plan.id}`);
            setNotice(t('platform.plan_retired'));
            setRetirePlan(null);
            await load({ force: true });
        } catch (err) {
            setError(apiError(err, t('platform.save_error')).message);
            setRetirePlan(null);
        } finally {
            setSavingId(null);
        }
    };

    const submitCreate = async (event) => {
        event?.preventDefault?.();
        if (creating) return;
        const errors = {};
        const code = createForm.code.trim().toLowerCase();
        if (!code) errors.code = t('platform.plan_code_required');
        else if (!/^[a-z][a-z0-9_-]{1,49}$/.test(code)) errors.code = t('platform.plan_code_hint');
        const draftErrors = validateDraft(createForm);
        Object.assign(errors, draftErrors);
        if (Object.keys(errors).length) {
            setCreateErrors(errors);
            return;
        }
        setCreating(true);
        setError('');
        try {
            await fetch.post('platform/plans', {
                code,
                name: createForm.name.trim(),
                billing_interval: createForm.billing_interval,
                price_amount: Number(createForm.price_amount),
                currency_code: createForm.currency_code || 'USD',
                trial_days: Number(createForm.trial_days),
                grace_days: Number(createForm.grace_days),
                feature_limits: { permissions: createForm.permissions || [] },
            });
            setNotice(t('platform.plan_created'));
            setCreateOpen(false);
            setCreateForm(emptyCreate);
            setCreateErrors({});
            await load({ force: true });
        } catch (err) {
            const parsed = apiError(err, t('platform.save_error'));
            setCreateErrors(parsed.fields || {});
            setError(parsed.message);
        } finally {
            setCreating(false);
        }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return plans.filter((plan) => {
            if (intervalFilter && plan.billing_interval !== intervalFilter) return false;
            if (!q) return true;
            const haystack = `${plan.code || ''} ${plan.name || ''} ${drafts[plan.id]?.name || ''}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [plans, drafts, query, intervalFilter]);

    const dirtyCount = useMemo(
        () => plans.filter((plan) => !sameDraft(drafts[plan.id], baselines[plan.id] || toDraft(plan))).length,
        [plans, drafts, baselines],
    );

    const permissionEditor = (selected, onToggle, disabled) => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('platform.plan_permissions')}</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {t('platform.plan_permissions_hint')}
            </Typography>
            <FormGroup sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 0.5,
                maxHeight: 220,
                overflow: 'auto',
                pr: 1,
            }}
            >
                {catalog.map((item) => (
                    <FormControlLabel
                        key={item.name}
                        control={(
                            <Checkbox
                                size="small"
                                checked={(selected || []).includes(item.name)}
                                onChange={() => onToggle(item.name)}
                                disabled={disabled}
                            />
                        )}
                        label={(
                            <Typography variant="body2" component="span">
                                {localizeFeaturePermission(t, i18n, item)}
                            </Typography>
                        )}
                    />
                ))}
            </FormGroup>
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('platform.plans_title')}
                description={t('platform.plans_hint')}
                action={(
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        {dirtyCount > 0 && (
                            <Chip
                                size="small"
                                color="warning"
                                variant="outlined"
                                label={t('platform.plans_unsaved', { count: dirtyCount })}
                            />
                        )}
                        <FormControlLabel
                            control={(
                                <Checkbox
                                    size="small"
                                    checked={showRetired}
                                    onChange={(event) => setShowRetired(event.target.checked)}
                                />
                            )}
                            label={t('platform.show_retired_plans')}
                        />
                        <Button
                            variant="outlined"
                            onClick={() => load()}
                            disabled={loading || Boolean(savingId)}
                        >
                            {t('common.refresh')}
                        </Button>
                        {canCreate && (
                            <Button variant="contained" onClick={() => { setCreateOpen(true); setCreateErrors({}); }}>
                                {t('platform.create_plan')}
                            </Button>
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

            <ListToolbar
                search={query}
                onSearch={setQuery}
                filters={[
                    {
                        key: 'interval',
                        label: t('platform.interval'),
                        value: intervalFilter,
                        allLabel: t('workspace_ui.all'),
                        onChange: setIntervalFilter,
                        options: [
                            { value: 'month', label: t('platform.intervals.month') },
                            { value: 'year', label: t('platform.intervals.year') },
                        ],
                    },
                ]}
            />

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} />
                </Box>
            )}

            {!loading && filtered.length === 0 && (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        {plans.length === 0 ? t('platform.plans_empty') : t('platform.plans_empty_filtered')}
                    </Typography>
                </Paper>
            )}

            {!loading && (
                <Stack spacing={2}>
                    {filtered.map((plan) => {
                        const draft = drafts[plan.id] || toDraft(plan);
                        const errors = fieldErrors[plan.id] || {};
                        const dirty = !sameDraft(draft, baselines[plan.id] || toDraft(plan));
                        const saving = savingId === plan.id;
                        const retired = Boolean(plan.retired || plan.deleted_at);
                        const editable = canUpdate && !retired;

                        return (
                            <Paper key={plan.id} variant="outlined" sx={{ p: { xs: 2, md: 3 }, opacity: retired ? 0.75 : 1 }}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
                                >
                                    <Box>
                                        <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
                                            <Typography fontWeight={700}>{plan.code}</Typography>
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={t(`platform.intervals.${plan.billing_interval}`, {
                                                    defaultValue: plan.billing_interval,
                                                })}
                                            />
                                            {retired && (
                                                <Chip size="small" color="default" label={t('platform.plan_retired_badge')} />
                                            )}
                                            {dirty && (
                                                <Chip size="small" color="warning" label={t('platform.plan_dirty')} />
                                            )}
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            {formatMoney(plan.price_amount, plan.currency_code)}
                                            {' · '}
                                            {t('platform.plan_permissions_count', { count: (draft.permissions || []).length })}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        {editable && (
                                            <>
                                                <Button
                                                    variant="outlined"
                                                    disabled={!dirty || saving}
                                                    onClick={() => discard(plan)}
                                                >
                                                    {t('common.reset')}
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    disabled={!dirty || saving}
                                                    onClick={() => requestSave(plan)}
                                                >
                                                    {saving ? t('common.updating') : t('common.save')}
                                                </Button>
                                            </>
                                        )}
                                        {canRetire && !retired && (
                                            <Button
                                                color="error"
                                                variant="outlined"
                                                disabled={saving}
                                                onClick={() => setRetirePlan(plan)}
                                            >
                                                {t('platform.retire_plan')}
                                            </Button>
                                        )}
                                    </Stack>
                                </Stack>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr' },
                                        gap: 2,
                                    }}
                                >
                                    <TextField
                                        label={t('platform.plan_name')}
                                        value={draft.name}
                                        onChange={setDraft(plan.id, 'name')}
                                        required
                                        disabled={!editable}
                                        error={Boolean(errors.name)}
                                        helperText={errors.name}
                                        slotProps={{ htmlInput: { maxLength: 100 } }}
                                    />
                                    <TextField
                                        select
                                        label={t('platform.interval')}
                                        value={draft.billing_interval || 'year'}
                                        onChange={setDraft(plan.id, 'billing_interval')}
                                        disabled={!editable}
                                        error={Boolean(errors.billing_interval)}
                                        helperText={errors.billing_interval}
                                    >
                                        <MenuItem value="month">{t('platform.intervals.month')}</MenuItem>
                                        <MenuItem value="year">{t('platform.intervals.year')}</MenuItem>
                                    </TextField>
                                    <TextField
                                        label={`${t('platform.price')}${plan.currency_code ? ` (${plan.currency_code})` : ''}`}
                                        value={draft.price_amount}
                                        onChange={setDraft(plan.id, 'price_amount')}
                                        required
                                        disabled={!editable}
                                        error={Boolean(errors.price_amount)}
                                        helperText={errors.price_amount}
                                        inputProps={{ inputMode: 'decimal', dir: 'ltr' }}
                                    />
                                    <TextField
                                        label={t('platform.trial_days')}
                                        value={draft.trial_days}
                                        onChange={setDraft(plan.id, 'trial_days')}
                                        required
                                        disabled={!editable}
                                        error={Boolean(errors.trial_days)}
                                        helperText={errors.trial_days}
                                        inputProps={{ inputMode: 'numeric', dir: 'ltr' }}
                                    />
                                    <TextField
                                        label={t('platform.grace_days')}
                                        value={draft.grace_days}
                                        onChange={setDraft(plan.id, 'grace_days')}
                                        required
                                        disabled={!editable}
                                        error={Boolean(errors.grace_days)}
                                        helperText={errors.grace_days}
                                        inputProps={{ inputMode: 'numeric', dir: 'ltr' }}
                                    />
                                </Box>
                                {permissionEditor(
                                    draft.permissions,
                                    (permission) => togglePermission(plan.id, permission),
                                    !editable,
                                )}
                            </Paper>
                        );
                    })}
                </Stack>
            )}

            <Dialog
                open={Boolean(confirmPlan)}
                onClose={() => { if (!savingId) setConfirmPlan(null); }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>{t('platform.confirm_save_plan_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('platform.confirm_save_plan', {
                            name: drafts[confirmPlan?.id]?.name || confirmPlan?.name || confirmPlan?.code || '',
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmPlan(null)} disabled={Boolean(savingId)}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="contained" disabled={Boolean(savingId)} onClick={save}>
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(retirePlan)}
                onClose={() => { if (!savingId) setRetirePlan(null); }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>{t('platform.confirm_retire_plan_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('platform.confirm_retire_plan', { name: retirePlan?.name || retirePlan?.code || '' })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRetirePlan(null)} disabled={Boolean(savingId)}>
                        {t('common.cancel')}
                    </Button>
                    <Button color="error" variant="contained" disabled={Boolean(savingId)} onClick={confirmRetire}>
                        {t('platform.retire_plan')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={createOpen}
                onClose={() => { if (!creating) setCreateOpen(false); }}
                fullWidth
                maxWidth="md"
                component="form"
                onSubmit={submitCreate}
            >
                <DialogTitle>{t('platform.create_plan')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                            gap: 2,
                        }}
                        >
                            <TextField
                                label={t('platform.plan_code')}
                                value={createForm.code}
                                onChange={(event) => setCreateForm((c) => ({ ...c, code: event.target.value }))}
                                required
                                error={Boolean(createErrors.code)}
                                helperText={createErrors.code || t('platform.plan_code_hint')}
                                inputProps={{ dir: 'ltr' }}
                            />
                            <TextField
                                label={t('platform.plan_name')}
                                value={createForm.name}
                                onChange={(event) => setCreateForm((c) => ({ ...c, name: event.target.value }))}
                                required
                                error={Boolean(createErrors.name)}
                                helperText={createErrors.name}
                            />
                            <TextField
                                select
                                label={t('platform.interval')}
                                value={createForm.billing_interval}
                                onChange={(event) => setCreateForm((c) => ({ ...c, billing_interval: event.target.value }))}
                            >
                                <MenuItem value="month">{t('platform.intervals.month')}</MenuItem>
                                <MenuItem value="year">{t('platform.intervals.year')}</MenuItem>
                            </TextField>
                            <TextField
                                label={t('platform.price')}
                                value={createForm.price_amount}
                                onChange={(event) => setCreateForm((c) => ({ ...c, price_amount: event.target.value }))}
                                required
                                error={Boolean(createErrors.price_amount)}
                                helperText={createErrors.price_amount}
                                inputProps={{ inputMode: 'decimal', dir: 'ltr' }}
                            />
                            <TextField
                                label={t('platform.currency')}
                                value={createForm.currency_code}
                                onChange={(event) => setCreateForm((c) => ({ ...c, currency_code: event.target.value.toUpperCase() }))}
                                inputProps={{ dir: 'ltr', maxLength: 3 }}
                            />
                            <TextField
                                label={t('platform.trial_days')}
                                value={createForm.trial_days}
                                onChange={(event) => setCreateForm((c) => ({ ...c, trial_days: event.target.value }))}
                                error={Boolean(createErrors.trial_days)}
                                helperText={createErrors.trial_days}
                            />
                            <TextField
                                label={t('platform.grace_days')}
                                value={createForm.grace_days}
                                onChange={(event) => setCreateForm((c) => ({ ...c, grace_days: event.target.value }))}
                                error={Boolean(createErrors.grace_days)}
                                helperText={createErrors.grace_days}
                            />
                        </Box>
                        {permissionEditor(
                            createForm.permissions,
                            (permission) => {
                                setCreateForm((current) => {
                                    const set = new Set(current.permissions || []);
                                    if (set.has(permission)) set.delete(permission);
                                    else set.add(permission);
                                    return { ...current, permissions: [...set].sort() };
                                });
                            },
                            creating,
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)} disabled={creating}>{t('common.cancel')}</Button>
                    <Button type="submit" variant="contained" disabled={creating}>
                        {creating ? t('common.updating') : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
