import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import fetch from '@/utils/fetch';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { moneyLabel } from '@/utils/money.js';

const OPEN = new Set(['trialing', 'active', 'grace']);

function Fact({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography fontWeight={600} sx={{ wordBreak: 'break-word' }}>{value || '—'}</Typography>
        </Box>
    );
}

function KpiCard({ label, value, hint }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.75, wordBreak: 'break-word' }}>
                {value}
            </Typography>
            {hint ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {hint}
                </Typography>
            ) : null}
        </Paper>
    );
}


function daysBetween(fromIso, toIso) {
    if (!fromIso || !toIso) return null;
    const from = new Date(`${fromIso}T12:00:00Z`);
    const to = new Date(`${toIso}T12:00:00Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    return Math.round((to - from) / 86400000);
}

function baghdadToday() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function permissionCount(limits) {
    if (!limits || typeof limits !== 'object') return 0;
    const list = limits.permissions;
    return Array.isArray(list) ? list.length : Object.keys(limits).length;
}

export default function Subscription() {
    const { t } = useTranslation();
    const [plans, setPlans] = useState([]);
    const [current, setCurrent] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState(null);

    const load = async () => {
        const [planRes, currentRes] = await Promise.all([
            fetch.get('subscription/plans'),
            fetch.get('subscription'),
        ]);
        return {
            plans: planRes.data?.data || [],
            current: currentRes.data?.data || null,
        };
    };

    useEffect(() => {
        let active = true;
        load()
            .then((data) => {
                if (!active) return;
                setPlans(data.plans);
                setCurrent(data.current);
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.error?.message || t('login.error'));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [t]);

    const planName = useMemo(() => {
        if (!current?.plan_code) return '';
        return plans.find((plan) => plan.code === current.plan_code)?.name || current.plan_code;
    }, [current, plans]);

    const today = baghdadToday();
    const isOpen = Boolean(current && OPEN.has(current.status));
    const daysLeft = current?.ends_on ? daysBetween(today, current.ends_on) : null;
    const termLength = current?.starts_on && current?.ends_on
        ? daysBetween(current.starts_on, current.ends_on)
        : null;
    const elapsed = termLength != null && daysLeft != null
        ? Math.min(100, Math.max(0, Math.round(((termLength - Math.max(daysLeft, 0)) / Math.max(termLength, 1)) * 100)))
        : 0;

    const runStart = async (planCode) => {
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const res = await fetch.post('subscription', { plan_code: planCode });
            setCurrent(res.data.data);
            setNotice(t('subscription.started'));
            setConfirm(null);
        } catch (err) {
            setError(err.response?.data?.error?.message || t('login.error'));
        } finally {
            setSaving(false);
        }
    };

    const confirmAction = () => {
        if (!confirm) return;
        if (confirm.type === 'start') return runStart(confirm.planCode);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('subscription.title')}
                description={t('subscription.hint')}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Stack spacing={2}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' },
                            gap: 1.5,
                        }}
                    >
                        <KpiCard
                            label={t('subscription.status')}
                            value={current ? t(`subscription.${current.status}`, { defaultValue: current.status }) : t('subscription.none')}
                            hint={current ? planName : t('subscription.none_hint')}
                        />
                        <KpiCard
                            label={t('subscription.price')}
                            value={current ? moneyLabel(current.price_amount, current.currency_code) : '—'}
                            hint={current
                                ? t(`platform.intervals.${current.billing_interval}`, { defaultValue: current.billing_interval })
                                : undefined}
                        />
                        <KpiCard
                            label={t('subscription.ends')}
                            value={current?.ends_on || '—'}
                            hint={daysLeft == null
                                ? undefined
                                : daysLeft >= 0
                                    ? t('subscription.days_left', { days: daysLeft })
                                    : t('subscription.days_over', { days: Math.abs(daysLeft) })}
                        />
                        <KpiCard
                            label={t('subscription.access')}
                            value={isOpen ? t('subscription.access_open') : t('subscription.access_closed')}
                            hint={current?.grace_ends_on
                                ? t('subscription.grace_until', { date: current.grace_ends_on })
                                : undefined}
                        />
                    </Box>

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
                        >
                            <Box>
                                <Typography fontWeight={700}>{t('subscription.current')}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('subscription.current_hint')}
                                </Typography>
                            </Box>
                            {current ? (
                                <StatusChip
                                    status={current.status}
                                    label={t(`subscription.${current.status}`, { defaultValue: current.status })}
                                />
                            ) : null}
                        </Stack>

                        {!current ? (
                            <Alert severity="info">{t('subscription.none')}</Alert>
                        ) : (
                            <Stack spacing={2}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                                        gap: 2,
                                    }}
                                >
                                    <Fact label={t('subscription.plan')} value={planName} />
                                    <Fact label={t('subscription.plan_code')} value={current.plan_code} />
                                    <Fact
                                        label={t('subscription.interval')}
                                        value={t(`platform.intervals.${current.billing_interval}`, {
                                            defaultValue: current.billing_interval,
                                        })}
                                    />
                                    <Fact label={t('subscription.price')} value={moneyLabel(current.price_amount, current.currency_code)} />
                                    <Fact label={t('subscription.starts')} value={current.starts_on} />
                                    <Fact label={t('subscription.ends')} value={current.ends_on} />
                                    <Fact label={t('subscription.trial_ends')} value={current.trial_ends_on} />
                                    <Fact label={t('subscription.grace_ends')} value={current.grace_ends_on} />
                                    <Fact
                                        label={t('subscription.provider')}
                                        value={current.billing_provider || t('subscription.provider_manual')}
                                    />
                                </Box>

                                {termLength != null && termLength > 0 ? (
                                    <Box>
                                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mb: 0.75 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('subscription.term_progress')}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {elapsed}%
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={elapsed}
                                            color={current.status === 'grace' || current.status === 'expired' ? 'warning' : 'primary'}
                                            sx={{ height: 8, borderRadius: 1 }}
                                        />
                                    </Box>
                                ) : null}

                                <Can permission="agency:manage">
                                    {!isOpen ? (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('subscription.restart_hint')}
                                        </Typography>
                                    ) : null}
                                </Can>
                            </Stack>
                        )}
                    </Paper>

                    <Can permission="agency:manage">
                        <Box>
                            <Typography fontWeight={700} sx={{ mb: 0.5 }}>{t('subscription.plans')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                {isOpen ? t('subscription.plans_locked_hint') : t('subscription.plans_hint')}
                            </Typography>

                            {plans.length === 0 ? (
                                <Paper variant="outlined" sx={{ p: 3 }}>
                                    <Typography color="text.secondary">{t('subscription.no_plans')}</Typography>
                                </Paper>
                            ) : (
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
                                        gap: 1.5,
                                    }}
                                >
                                    {plans.map((plan) => {
                                        const selected = current?.plan_code === plan.code && isOpen;
                                        const features = permissionCount(plan.feature_limits);
                                        return (
                                            <Paper
                                                key={plan.code}
                                                variant="outlined"
                                                sx={{
                                                    p: 2.5,
                                                    height: '100%',
                                                    borderColor: selected ? 'primary.main' : undefined,
                                                    bgcolor: selected ? 'action.hover' : undefined,
                                                }}
                                            >
                                                <Stack spacing={1.5} sx={{ height: '100%' }}>
                                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                        <Box>
                                                            <Typography fontWeight={700}>{plan.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{plan.code}</Typography>
                                                        </Box>
                                                        {selected ? (
                                                            <StatusChip status="active" label={t('subscription.current_plan')} />
                                                        ) : null}
                                                    </Stack>

                                                    <Box>
                                                        <Typography variant="h5" fontWeight={800}>
                                                            {moneyLabel(plan.price_amount, plan.currency_code)}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {t(`platform.intervals.${plan.billing_interval}`, {
                                                                defaultValue: plan.billing_interval,
                                                            })}
                                                        </Typography>
                                                    </Box>

                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2">
                                                            {t('subscription.trial_days')}: {plan.trial_days}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {t('subscription.grace_days')}: {plan.grace_days}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {t('subscription.features', { count: features })}
                                                        </Typography>
                                                    </Stack>

                                                    <Box sx={{ flexGrow: 1 }} />

                                                    <Button
                                                        variant={selected ? 'outlined' : 'contained'}
                                                        disabled={saving || isOpen}
                                                        onClick={() => setConfirm({
                                                            type: 'start',
                                                            planCode: plan.code,
                                                            planName: plan.name,
                                                        })}
                                                    >
                                                        {selected
                                                            ? t('subscription.current_plan')
                                                            : isOpen
                                                                ? t('subscription.change_locked')
                                                                : t('subscription.start')}
                                                    </Button>
                                                </Stack>
                                            </Paper>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    </Can>
                </Stack>
            )}

            <Dialog open={Boolean(confirm)} onClose={() => (!saving ? setConfirm(null) : null)} fullWidth maxWidth="xs">
                <DialogTitle>{t('subscription.start_title')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('subscription.start_confirm', { plan: confirm?.planName || confirm?.planCode })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button disabled={saving} onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={saving}
                        onClick={confirmAction}
                    >
                        {saving ? t('common.saving', { defaultValue: '…' }) : t('common.confirm', { defaultValue: t('common.save') })}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
