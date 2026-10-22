import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { alpha } from '@mui/material/styles';
import {
    Alert,
    Badge,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Tab,
    Tabs,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    AccountBalanceWallet,
    AddHomeWork,
    Apartment,
    AttachMoney,
    Business,
    Check,
    CheckCircle,
    Description,
    DoneAll,
    MonetizationOn,
    Notifications,
    People,
    PersonAdd,
    ReceiptLong,
    Refresh,
    TrendingDown,
    TrendingUp,
    WarningAmber,
} from '@mui/icons-material';
import fetch from '@/utils/fetch';
import { currencyLabel, formatPrice, signedPrice } from '@/utils/money.js';
import Can from '@/components/auth/Can.jsx';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { useAuthStore } from '@/store/authStore';
import { can, canAny } from '@/auth/can';
import useIsRTL from '@/hooks/useIsRTL';

const PERIODS = ['all', '7d', '30d', 'mtd', 'ytd'];

function baghdadToday() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function shiftDays(isoDate, days) {
    const date = new Date(`${isoDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function periodRange(period) {
    if (period === 'all') return { from: '', to: '' };
    const to = baghdadToday();
    if (period === '7d') return { from: shiftDays(to, -6), to };
    if (period === '30d') return { from: shiftDays(to, -29), to };
    if (period === 'mtd') return { from: `${to.slice(0, 8)}01`, to };
    if (period === 'ytd') return { from: `${to.slice(0, 4)}-01-01`, to };
    return { from: '', to: '' };
}

function getGreeting(t) {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t('operations.good_morning', { defaultValue: 'Good morning' });
    if (hour >= 12 && hour < 17) return t('operations.good_afternoon', { defaultValue: 'Good afternoon' });
    return t('operations.good_evening', { defaultValue: 'Good evening' });
}

function formatWhen(value, isRTL) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 19);
    return format(date, isRTL ? 'yyyy/M/d HH:mm' : 'M/d/yyyy HH:mm');
}

function notificationIcon(type) {
    if (type?.includes('contract')) return <Description fontSize="small" sx={{ color: 'warning.main' }} />;
    if (type?.includes('deal')) return <ReceiptLong fontSize="small" sx={{ color: 'primary.main' }} />;
    if (type?.includes('payment') || type?.includes('finance')) return <AccountBalanceWallet fontSize="small" sx={{ color: 'success.main' }} />;
    if (type?.includes('expense')) return <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />;
    return <Notifications fontSize="small" sx={{ color: 'info.main' }} />;
}

export default function Dashboard() {
    const { t } = useTranslation();
    const isRTL = useIsRTL();
    const user = useAuthStore((state) => state.user);
    const refreshUser = useAuthStore((state) => state.refreshUser);

    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all');
    const [readingId, setReadingId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [notifTab, setNotifTab] = useState('all');
    const [refreshedRestricted, setRefreshedRestricted] = useState(false);

    const range = useMemo(() => periodRange(period), [period]);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const params = {};
            if (range.from) params.from = range.from;
            if (range.to) params.to = range.to;
            const res = await fetch.get('operations/dashboard', { params });
            setData(res.data?.data || null);
        } catch {
            setError(t('operations.load_error'));
        } finally {
            if (!silent) setLoading(false);
        }
    }, [range.from, range.to, t]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!data?.subscription?.restricted || refreshedRestricted) return;
        setRefreshedRestricted(true);
        refreshUser().catch(() => { });
    }, [data?.subscription?.restricted, refreshedRestricted, refreshUser]);

    const markRead = async (id) => {
        setError('');
        setReadingId(id);
        try {
            const res = await fetch.post(`operations/notifications/${id}/read`, {});
            const updated = res.data?.data;
            setData((current) => {
                if (!current) return current;
                const wasUnread = (current.notifications || []).some((item) => item.id === id && !item.read_at);
                return {
                    ...current,
                    notifications: (current.notifications || []).map((item) => (
                        item.id === id
                            ? { ...item, read_at: updated?.read_at || new Date().toISOString() }
                            : item
                    )),
                    counts: {
                        ...current.counts,
                        unread_notifications: wasUnread
                            ? Math.max(0, Number(current.counts?.unread_notifications || 0) - 1)
                            : Number(current.counts?.unread_notifications || 0),
                    },
                };
            });
        } catch {
            setError(t('operations.load_error'));
        } finally {
            setReadingId(null);
        }
    };

    const markAllRead = async () => {
        setError('');
        setMarkingAll(true);
        try {
            await fetch.post('operations/notifications/mark-all-read', {});
            setData((current) => {
                if (!current) return current;
                return {
                    ...current,
                    notifications: (current.notifications || []).map((item) => ({
                        ...item,
                        read_at: item.read_at || new Date().toISOString(),
                    })),
                    counts: {
                        ...current.counts,
                        unread_notifications: 0,
                    },
                };
            });
        } catch {
            setError(t('operations.load_error'));
        } finally {
            setMarkingAll(false);
        }
    };

    const finance = data?.finance || {};
    const wallets = finance.wallets || [];
    const counts = data?.counts || {};
    const status = data?.subscription?.status;
    const branchInfo = data?.branch || null;

    const money = (key) => {
        const raw = key === 'balance'
            ? (finance.cash_balance ?? finance.balance)
            : (finance[key] ?? (key === 'cash_in' ? finance.income : null));
        if (raw == null) return '—';
        const amount = key === 'balance' ? signedPrice(raw) : formatPrice(raw);
        return `${amount} ${currencyLabel(finance.base_currency_code)}`.trim();
    };

    const balanceNum = Number(String(finance.cash_balance ?? finance.balance ?? 0).replace(/[^\d.-]/g, ''));
    const isBalanceNegative = Number.isFinite(balanceNum) && balanceNum < 0;

    const unread = Number(counts.unread_notifications || 0);
    const showFinance = can(user, 'financial:view');

    const quickActions = [
        {
            key: 'new_property',
            to: '/admin/properties/create',
            permission: 'property:create',
            label: t('properties.create'),
            icon: <AddHomeWork fontSize="small" />,
            color: 'primary',
        },
        {
            key: 'new_party',
            to: '/admin/parties/create',
            permission: 'party:create',
            label: t('parties.create'),
            icon: <PersonAdd fontSize="small" />,
            color: 'info',
        },
        {
            key: 'new_deal',
            to: '/admin/transactions/create',
            permission: 'transaction:create',
            label: t('transactions.create'),
            icon: <ReceiptLong fontSize="small" />,
            color: 'success',
        },
        {
            key: 'new_entry',
            to: '/admin/finance',
            permission: 'financial:record',
            label: t('finance.post'),
            icon: <AttachMoney fontSize="small" />,
            color: 'warning',
        },
        {
            key: 'new_expense',
            to: '/admin/expenses/create',
            permission: 'expenses.create',
            label: t('expenses.create_title'),
            icon: <TrendingDown fontSize="small" />,
            color: 'error',
        },
        {
            key: 'new_contract',
            to: '/admin/contracts/create',
            permission: 'document:generate',
            label: t('contracts.create_title'),
            icon: <Description fontSize="small" />,
            color: 'secondary',
        },
    ].filter((action) => (
        Array.isArray(action.permission)
            ? (action.any ? canAny(user, action.permission) : action.permission.every((name) => can(user, name)))
            : can(user, action.permission)
    ));

    const activityCards = [
        {
            key: 'properties',
            label: t('operations.properties', 'Total Properties'),
            value: counts.properties,
            to: '/admin/properties/index',
            permission: 'property:view',
            icon: <Apartment fontSize="small" />,
            accent: 'primary.main',
        },
        {
            key: 'available_properties',
            label: t('operations.available_properties', 'Available Listings'),
            value: counts.available_properties,
            to: '/admin/properties/index?status=available',
            permission: 'property:view',
            icon: <CheckCircle fontSize="small" />,
            accent: 'success.main',
        },
        {
            key: 'clients',
            label: t('operations.clients', 'Clients & Contacts'),
            value: counts.parties,
            to: '/admin/parties/index',
            permission: 'party:view',
            icon: <People fontSize="small" />,
            accent: 'info.main',
        },
        {
            key: 'open_deals',
            label: t('operations.open_deals', 'Working Deals'),
            value: counts.open_deals,
            to: '/admin/transactions/index?desk=working&status=open',
            permission: ['transaction:create', 'financial:view'],
            any: true,
            icon: <ReceiptLong fontSize="small" />,
            accent: 'warning.main',
        },
        {
            key: 'contracts_active',
            label: t('operations.contracts_active', 'Active Contracts'),
            value: counts.contracts_active,
            to: '/admin/contracts/index',
            permission: ['document:generate', 'document:download'],
            any: true,
            icon: <Description fontSize="small" />,
            accent: 'secondary.main',
        },
        {
            key: 'contracts_expiring',
            label: t('operations.contracts_expiring', 'Contracts Ending Soon'),
            value: counts.contracts_expiring,
            to: '/admin/contracts/index?term=expiring',
            permission: ['document:generate', 'document:download'],
            any: true,
            icon: <WarningAmber fontSize="small" />,
            accent: counts.contracts_expiring > 0 ? 'error.main' : 'text.secondary',
            highlight: counts.contracts_expiring > 0,
        },
    ];

    const notificationsList = (data?.notifications || []).filter((item) => {
        if (notifTab === 'unread') return !item.read_at;
        return true;
    });

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Executive Welcome & Top Bar */}
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, md: 2.5 },
                    mb: 2.5,
                    borderRadius: 2.5,
                }}
            >
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                >
                    <Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="h5" fontWeight={800} letterSpacing={-0.3}>
                                {getGreeting(t)}, {user?.full_name || user?.name || user?.username || ''}
                            </Typography>
                            {branchInfo ? (
                                <Chip
                                    size="small"
                                    icon={<Business sx={{ fontSize: '14px !important' }} />}
                                    label={branchInfo.name}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                />
                            ) : (
                                <Chip
                                    size="small"
                                    icon={<Apartment sx={{ fontSize: '14px !important' }} />}
                                    label={t('operations.hq_scope', { defaultValue: 'Headquarters · Agency View' })}
                                    variant="outlined"
                                    sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                />
                            )}
                            {status && (
                                <Chip
                                    size="small"
                                    label={t(`operations.status_${status}`, status)}
                                    color={status === 'active' ? 'success' : 'warning'}
                                    variant="filled"
                                    sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'capitalize' }}
                                />
                            )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            {t('workspace_ui.dashboard_hint')} · {data?.as_of || baghdadToday()}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={period}
                            onChange={(_, value) => { if (value) setPeriod(value); }}
                            sx={{
                                '& .MuiToggleButton-root': {
                                    px: 1.5,
                                    py: 0.5,
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                },
                            }}
                        >
                            {PERIODS.map((item) => (
                                <ToggleButton key={item} value={item}>
                                    {t(`reports.periods.${item}`, { defaultValue: t(`operations.period_${item}`, item) })}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>

                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => load()}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Refresh />}
                            sx={{ fontWeight: 600, minHeight: 36 }}
                        >
                            {t('operations.refresh', { defaultValue: 'Refresh' })}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2, borderRadius: 2 }}
                    action={(
                        <Button color="inherit" size="small" onClick={() => load()} disabled={loading}>
                            {t('dashboard.retry', { defaultValue: 'Retry' })}
                        </Button>
                    )}
                >
                    {error}
                </Alert>
            )}

            {data?.subscription?.restricted && (
                <Alert
                    severity="warning"
                    sx={{ mb: 2.5, borderRadius: 2 }}
                    action={(
                        <Button color="inherit" size="small" component={RouterLink} to="/admin/subscription">
                            {t('operations.renew')}
                        </Button>
                    )}
                >
                    {t('operations.restricted', { status: t(`operations.status_${status}`, status || '') })}
                </Alert>
            )}

            {loading && !data ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 14 }}>
                    <CircularProgress size={36} thickness={4} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
                        {t('common.loading', { defaultValue: 'Loading operations overview…' })}
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' }, gap: 2.5, alignItems: 'start' }}>
                    <Stack spacing={3}>
                        {/* Actionable Alerts (Needs Attention) */}
                        {(counts.contracts_expiring > 0 || counts.draft_properties > 0) && (
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                                    {t('operations.attention', { defaultValue: 'Needs attention' })}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: counts.contracts_expiring > 0 && counts.draft_properties > 0 ? '1fr 1fr' : '1fr' }, gap: 1.5 }}>
                                    {counts.contracts_expiring > 0 && (
                                        <Can permission={['document:generate', 'document:download']} any>
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    borderInlineStart: '4px solid',
                                                    borderInlineStartColor: 'warning.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 1.5,
                                                }}
                                            >
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <WarningAmber color="warning" />
                                                    <Box>
                                                        <Typography fontWeight={700} variant="body2">
                                                            {counts.contracts_expiring} {t('operations.contracts_expiring')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {t('operations.contracts_expiring_hint', { defaultValue: t('contracts.expiring_hint', 'Leases reaching term end within 30 days') })}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="warning"
                                                    component={RouterLink}
                                                    to="/admin/contracts/index?term=expiring"
                                                    sx={{ fontWeight: 600, flexShrink: 0 }}
                                                >
                                                    {t('common.view', { defaultValue: 'View' })}
                                                </Button>
                                            </Paper>
                                        </Can>
                                    )}

                                    {counts.draft_properties > 0 && (
                                        <Can permission="property:view">
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    borderInlineStart: '4px solid',
                                                    borderInlineStartColor: 'info.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 1.5,
                                                }}
                                            >
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <Apartment color="info" />
                                                    <Box>
                                                        <Typography fontWeight={700} variant="body2">
                                                            {counts.draft_properties} {t('operations.draft_properties')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {t('operations.draft_properties_hint', { defaultValue: t('properties.draft_hint', 'Unpublished listings ready for review') })}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                    component={RouterLink}
                                                    to="/admin/properties/index?status=draft"
                                                    sx={{ fontWeight: 600, flexShrink: 0 }}
                                                >
                                                    {t('common.view', { defaultValue: 'View' })}
                                                </Button>
                                            </Paper>
                                        </Can>
                                    )}
                                </Box>
                            </Box>
                        )}

                        {/* Quick Actions Bar */}
                        {quickActions.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                                    {t('operations.quick_actions', { defaultValue: 'Quick actions' })}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>
                                    {quickActions.map((action) => (
                                        <Paper
                                            key={action.key}
                                            variant="outlined"
                                            component={RouterLink}
                                            to={action.to}
                                            sx={{
                                                p: 1.5,
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                borderRadius: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.25,
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    borderColor: `${action.color}.main`,
                                                    bgcolor: 'action.hover',
                                                    transform: 'translateY(-2px)',
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 1.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: (thm) => alpha(thm.palette[action.color]?.main || thm.palette.primary.main, 0.12),
                                                    color: `${action.color}.main`,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {action.icon}
                                            </Box>
                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                {action.label}
                                            </Typography>
                                        </Paper>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Operational Activity Metrics */}
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                                {t('workspace_ui.activity')}
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.5 }}>
                                {activityCards.map((card) => (
                                    <Can key={card.key} permission={card.permission} any={card.any}>
                                        <Paper
                                            variant="outlined"
                                            component={RouterLink}
                                            to={card.to}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                borderInlineStart: '4px solid',
                                                borderInlineStartColor: card.accent,
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: 2,
                                                    bgcolor: 'action.hover',
                                                },
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                                                    {card.label}
                                                </Typography>
                                                <Box sx={{ color: card.accent, opacity: 0.85, display: 'flex' }}>
                                                    {card.icon}
                                                </Box>
                                            </Stack>
                                            <Typography
                                                variant="h5"
                                                fontWeight={800}
                                                sx={{
                                                    fontVariantNumeric: 'tabular-nums',
                                                    color: card.highlight ? 'error.main' : 'inherit',
                                                }}
                                            >
                                                {loading ? '…' : (card.value ?? 0)}
                                            </Typography>
                                        </Paper>
                                    </Can>
                                ))}
                            </Box>
                        </Box>

                        {/* Financial Deck */}
                        {showFinance && (
                            <Box>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    sx={{ mb: 1.25, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                                >
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                                        {t('workspace_ui.money')}
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            component={RouterLink}
                                            to="/admin/reports"
                                            sx={{ fontWeight: 600, py: 0.25 }}
                                        >
                                            {t('admin_sidebar.financial_reports')}
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="text"
                                            component={RouterLink}
                                            to="/admin/finance"
                                            sx={{ fontWeight: 600, py: 0.25 }}
                                        >
                                            {t('operations.view_ledger', { defaultValue: 'Ledger' })}
                                        </Button>
                                    </Stack>
                                </Stack>

                                {/* Multi-Currency Wallets */}
                                {wallets.length > 0 && (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 1.5 }}>
                                        {wallets.map((wallet) => (
                                            <Paper
                                                key={wallet.currency_id}
                                                variant="outlined"
                                                component={RouterLink}
                                                to="/admin/reports/branch-wallets"
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    borderInlineStart: '4px solid',
                                                    borderInlineStartColor: wallet.currency_code === 'IQD' ? 'success.main' : 'primary.main',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': { transform: 'translateY(-2px)', bgcolor: 'action.hover' },
                                                }}
                                            >
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                                                        {t('finance.wallet', { code: wallet.currency_code })}
                                                    </Typography>
                                                    <AccountBalanceWallet fontSize="small" sx={{ color: wallet.currency_code === 'IQD' ? 'success.main' : 'primary.main', opacity: 0.85 }} />
                                                </Stack>
                                                <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {loading ? '…' : `${formatPrice(wallet.balance)} ${currencyLabel(wallet.currency_code)}`.trim()}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </Box>
                                )}

                                {/* Main Financial Indicators */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
                                    {/* Cash In */}
                                    <Paper
                                        variant="outlined"
                                        component={RouterLink}
                                        to="/admin/finance?direction=in"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            borderInlineStart: '4px solid',
                                            borderInlineStartColor: 'success.main',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { transform: 'translateY(-2px)', bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                                                {t('finance.cash_in')}
                                            </Typography>
                                            <TrendingUp fontSize="small" sx={{ color: 'success.main', opacity: 0.85 }} />
                                        </Stack>
                                        <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.main' }}>
                                            {loading ? '…' : `+${money('cash_in')}`}
                                        </Typography>
                                    </Paper>

                                    {/* Cash Out */}
                                    <Paper
                                        variant="outlined"
                                        component={RouterLink}
                                        to="/admin/finance?direction=out"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            borderInlineStart: '4px solid',
                                            borderInlineStartColor: 'error.main',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { transform: 'translateY(-2px)', bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                                                {t('finance.cash_out')}
                                            </Typography>
                                            <TrendingDown fontSize="small" sx={{ color: 'error.main', opacity: 0.85 }} />
                                        </Stack>
                                        <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>
                                            {loading ? '…' : `-${money('cash_out')}`}
                                        </Typography>
                                    </Paper>

                                    {/* Commissions */}
                                    <Paper
                                        variant="outlined"
                                        component={RouterLink}
                                        to="/admin/reports/commissions"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            borderInlineStart: '4px solid',
                                            borderInlineStartColor: 'secondary.main',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { transform: 'translateY(-2px)', bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                                                {t('operations.commissions')}
                                            </Typography>
                                            <MonetizationOn fontSize="small" sx={{ color: 'secondary.main', opacity: 0.85 }} />
                                        </Stack>
                                        <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', color: 'secondary.main' }}>
                                            {loading ? '…' : money('commissions')}
                                        </Typography>
                                    </Paper>

                                    {/* Net Cash Balance */}
                                    <Paper
                                        variant="outlined"
                                        component={RouterLink}
                                        to="/admin/finance"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            borderInlineStart: '4px solid',
                                            borderInlineStartColor: isBalanceNegative ? 'error.main' : 'primary.main',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { transform: 'translateY(-2px)', bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                                                {t('finance.cash_balance')}
                                            </Typography>
                                            <AccountBalanceWallet fontSize="small" sx={{ color: isBalanceNegative ? 'error.main' : 'primary.main', opacity: 0.85 }} />
                                        </Stack>
                                        <Typography
                                            variant="h6"
                                            fontWeight={800}
                                            sx={{
                                                fontVariantNumeric: 'tabular-nums',
                                                color: isBalanceNegative ? 'error.main' : 'inherit',
                                            }}
                                        >
                                            {loading ? '…' : money('balance')}
                                        </Typography>
                                    </Paper>
                                </Box>
                            </Box>
                        )}
                    </Stack>

                    {/* Operational Feed & Notifications Panel */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            position: 'sticky',
                            top: 20,
                        }}
                    >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Notifications fontSize="small" color="primary" />
                                <Typography variant="h6" fontWeight={800} fontSize="1.05rem">
                                    {t('operations.notifications')}
                                </Typography>
                            </Stack>

                            {unread > 0 && (
                                <Tooltip title={t('operations.mark_all_read', { defaultValue: 'Mark all as read' })}>
                                    <Button
                                        size="small"
                                        variant="text"
                                        disabled={markingAll}
                                        onClick={markAllRead}
                                        startIcon={markingAll ? <CircularProgress size={12} /> : <DoneAll fontSize="small" />}
                                        sx={{ fontSize: '0.75rem', fontWeight: 600, px: 1 }}
                                    >
                                        {t('operations.mark_all_read', { defaultValue: 'Mark all read' })}
                                    </Button>
                                </Tooltip>
                            )}
                        </Stack>

                        <Tabs
                            value={notifTab}
                            onChange={(_, value) => setNotifTab(value)}
                            sx={{
                                minHeight: 36,
                                mb: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                                '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8125rem', fontWeight: 600 },
                            }}
                        >
                            <Tab value="all" label={t('operations.all_notifications', { defaultValue: 'All' })} />
                            <Tab
                                value="unread"
                                label={(
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>{t('operations.unread_only', { defaultValue: 'Unread' })}</span>
                                        {unread > 0 && (
                                            <Chip
                                                size="small"
                                                label={unread}
                                                color="warning"
                                                sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700 }}
                                            />
                                        )}
                                    </Stack>
                                )}
                            />
                        </Tabs>

                        {
                            notificationsList.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <CheckCircle sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        {notifTab === 'unread'
                                            ? t('operations.operational_health', { defaultValue: 'All notifications read' })
                                            : t('operations.empty')}
                                    </Typography>
                                </Box>
                            ) : (
                                <Stack spacing={1.5}>
                                    {notificationsList.map((item) => {
                                        const isUnread = !item.read_at;
                                        return (
                                            <Paper
                                                key={item.id}
                                                variant="outlined"
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    borderInlineStart: isUnread ? '3px solid' : '1px solid',
                                                    borderInlineStartColor: isUnread ? 'primary.main' : 'divider',
                                                    transition: 'all 0.15s ease',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }}
                                            >
                                                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                                    <Box sx={{ mt: 0.25, flexShrink: 0 }}>
                                                        {notificationIcon(item.notification_type)}
                                                    </Box>
                                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                                            <Typography variant="body2" fontWeight={isUnread ? 700 : 500} noWrap>
                                                                {t(`operations.${item.notification_type}`, item.notification_type)}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.7rem' }}>
                                                                {formatWhen(item.created_at, isRTL)}
                                                            </Typography>
                                                        </Stack>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, wordBreak: 'break-word' }}>
                                                            {item.title}
                                                        </Typography>
                                                    </Box>

                                                    {isUnread && (
                                                        <Tooltip title={t('operations.mark_read')}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => markRead(item.id)}
                                                                disabled={readingId === item.id}
                                                                sx={{ color: 'primary.main', flexShrink: 0, p: 0.5 }}
                                                            >
                                                                {readingId === item.id ? (
                                                                    <CircularProgress size={14} />
                                                                ) : (
                                                                    <Check fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            )
                        }
                    </Paper >

                    {/* Metadata Footer */}
                    {
                        data?.as_of && (
                            <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1', mt: 1 }}>
                                {t('operations.as_of', { date: data.as_of })}
                                {data.finance?.from && data.finance?.to
                                    ? ` · ${data.finance.from} → ${data.finance.to}`
                                    : ''}
                            </Typography>
                        )
                    }
                </Box >
            )}
        </Box >
    );
}
