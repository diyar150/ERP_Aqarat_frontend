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
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import fetch from '@/utils/fetch';
import { can } from '@/auth/can';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/workspace/PageHeader.jsx';
import { StatusChip } from '@/components/workspace/DataTable.jsx';
import { expenseError } from '../expenses/expenseForm.js';

const TZ = 'Asia/Baghdad';

function baghdadToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function currentYear() {
    return Number(baghdadToday().slice(0, 4));
}

function monthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function monthEnd(key) {
    const [year, monthNumber] = String(key).split('-').map(Number);
    return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function monthDaySpan(key) {
    const lastDay = Number(monthEnd(key).slice(8, 10));
    return `1–${lastDay}`;
}

function nextMonthKey(lockedThrough) {
    if (!lockedThrough) return null;
    const [year, month] = lockedThrough.split('-').map(Number);
    if (month === 12) return `${year + 1}-01`;
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function previousMonthKey(today) {
    const [year, month] = today.split('-').map(Number);
    if (month === 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** Next finished month that can be closed (Odoo-style lock advance). */
function nextClosableMonth(lockedThrough, today) {
    const candidate = lockedThrough ? nextMonthKey(lockedThrough) : previousMonthKey(today);
    if (!candidate) return null;
    if (monthEnd(candidate) >= today) return null;
    return candidate;
}

function monthState(key, lockedThrough, today, closableKey) {
    const end = monthEnd(key);
    if (end >= today) {
        return key === today.slice(0, 7) ? 'in_progress' : 'future';
    }
    if (lockedThrough && end <= lockedThrough) return 'closed';
    if (closableKey && key === closableKey) return 'current';
    return 'open';
}

function SummaryCard({ label, value }) {
    return (
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function MonthCell({
    label,
    daySpan,
    state,
    canAct,
    busy,
    onClose,
    onReopen,
}) {
    const { t } = useTranslation();
    const statusLabel = {
        closed: t('periods.status_closed'),
        open: t('periods.status_open'),
        current: t('periods.status_current'),
        in_progress: t('periods.status_in_progress'),
        future: t('periods.status_future'),
    }[state];

    const actionable = canAct && !busy && (state === 'closed' || state === 'open' || state === 'current');
    const tone = {
        closed: { borderColor: 'divider', bgcolor: 'action.hover' },
        current: { borderColor: 'primary.main', bgcolor: 'action.selected' },
        open: { borderColor: 'success.light', bgcolor: 'background.paper' },
        in_progress: { borderColor: 'divider', bgcolor: 'background.paper', opacity: 0.7 },
        future: { borderColor: 'divider', bgcolor: 'background.default', opacity: 0.55 },
    }[state];

    return (
        <Box
            component="button"
            type="button"
            disabled={!actionable}
            onClick={() => {
                if (state === 'closed') onReopen();
                else if (state === 'open' || state === 'current') onClose();
            }}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.25,
                p: 1.25,
                minHeight: 88,
                border: 1,
                borderRadius: 1,
                textAlign: 'start',
                cursor: actionable ? 'pointer' : 'default',
                ...tone,
                '&:disabled': { cursor: 'default' },
                '&:hover:not(:disabled)': { borderColor: 'primary.main' },
            }}
        >
            <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
            <Typography variant="caption" color="text.secondary">{daySpan}</Typography>
            <Typography variant="caption" fontWeight={600} sx={{ mt: 'auto' }}>
                {statusLabel}
            </Typography>
        </Box>
    );
}

export default function Index() {
    const { t, i18n } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const canClose = can(user, 'expenses.edit');
    const [books, setBooks] = useState(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(currentYear);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [confirm, setConfirm] = useState(null);

    const today = baghdadToday();

    const load = async () => {
        const res = await fetch.get('admin/expenses/books');
        return res.data?.data || null;
    };

    useEffect(() => {
        let active = true;
        load()
            .then((data) => {
                if (!active) return;
                setBooks(data);
            })
            .catch((err) => {
                if (active) setError(expenseError(err, t));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [t]);

    const offices = useMemo(() => books?.offices || [], [books?.offices]);
    const canAct = Boolean(books?.agency_wide && canClose);

    const summary = useMemo(() => {
        const closed = offices.filter((office) => office.books_closed_on).length;
        return {
            offices: offices.length,
            closed,
            open: Math.max(0, offices.length - closed),
        };
    }, [offices]);

    const monthLabels = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(i18n.language || 'en', { month: 'short', timeZone: 'UTC' });
        return Array.from({ length: 12 }, (_, index) => {
            const key = monthKey(year, index + 1);
            return {
                key,
                label: formatter.format(new Date(Date.UTC(year, index, 1))),
                daySpan: t('periods.day_span', { span: monthDaySpan(key) }),
            };
        });
    }, [year, i18n.language, t]);

    const runChange = async (office, type, month) => {
        setBusyId(office.id);
        setError('');
        setNotice('');
        try {
            const body = { branch_id: Number(office.id) };
            if (type === 'close') body.month = month;
            if (type === 'reopen') body.month = month;
            await fetch.post(`admin/expenses/books/${type}`, body);
            setBooks(await load());
            setNotice(t('periods.saved'));
            setConfirm(null);
        } catch (err) {
            setError(expenseError(err, t));
            setConfirm(null);
        } finally {
            setBusyId(null);
        }
    };

    if (loading && !books) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title={t('periods.title')}
                description={t('periods.hint')}
                action={(
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <IconButton
                            size="small"
                            aria-label={t('periods.prev_year')}
                            onClick={() => setYear((value) => value - 1)}
                        >
                            <ChevronLeftIcon />
                        </IconButton>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 64, textAlign: 'center' }}>
                            {year}
                        </Typography>
                        <IconButton
                            size="small"
                            aria-label={t('periods.next_year')}
                            onClick={() => setYear((value) => value + 1)}
                            disabled={year >= currentYear()}
                        >
                            <ChevronRightIcon />
                        </IconButton>
                        {year !== currentYear() ? (
                            <Button size="small" onClick={() => setYear(currentYear())}>
                                {t('periods.this_year')}
                            </Button>
                        ) : null}
                    </Stack>
                )}
            />

            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            {notice ? (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
                    {notice}
                </Alert>
            ) : null}
            {!canAct && books ? (
                <Alert severity="info" sx={{ mb: 2 }}>{t('periods.locked')}</Alert>
            ) : null}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <SummaryCard label={t('periods.summary_offices')} value={summary.offices} />
                <SummaryCard label={t('periods.summary_closed')} value={summary.closed} />
                <SummaryCard label={t('periods.summary_open')} value={summary.open} />
            </Stack>

            {!offices.length ? (
                <Alert severity="info">{t('periods.empty')}</Alert>
            ) : (
                <Stack spacing={2}>
                    {offices.map((office) => {
                        const lockedThrough = office.books_closed_on || null;
                        const closableKey = nextClosableMonth(lockedThrough, today);
                        return (
                            <Paper key={office.id} variant="outlined" sx={{ p: 2 }}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
                                >
                                    <Box>
                                        <Typography fontWeight={700}>{office.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {lockedThrough
                                                ? t('periods.closed_through', { date: lockedThrough })
                                                : t('periods.no_lock')}
                                        </Typography>
                                    </Box>
                                    <StatusChip
                                        status={lockedThrough ? 'inactive' : 'open'}
                                        label={lockedThrough ? t('periods.status_closed') : t('periods.status_open')}
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gap: 1,
                                        gridTemplateColumns: {
                                            xs: 'repeat(2, minmax(0, 1fr))',
                                            sm: 'repeat(3, minmax(0, 1fr))',
                                            md: 'repeat(4, minmax(0, 1fr))',
                                            lg: 'repeat(6, minmax(0, 1fr))',
                                        },
                                    }}
                                >
                                    {monthLabels.map((month) => {
                                        const state = monthState(month.key, lockedThrough, today, closableKey);
                                        return (
                                            <MonthCell
                                                key={month.key}
                                                label={month.label}
                                                daySpan={month.daySpan}
                                                state={state}
                                                canAct={canAct}
                                                busy={busyId === office.id}
                                                onClose={() => setConfirm({
                                                    type: 'close',
                                                    office,
                                                    month: month.key,
                                                    daySpan: monthDaySpan(month.key),
                                                    monthLabel: month.label,
                                                })}
                                                onReopen={() => setConfirm({
                                                    type: 'reopen',
                                                    office,
                                                    month: month.key,
                                                    daySpan: monthDaySpan(month.key),
                                                    monthLabel: month.label,
                                                })}
                                            />
                                        );
                                    })}
                                </Box>
                            </Paper>
                        );
                    })}
                </Stack>
            )}

            <Dialog
                open={Boolean(confirm)}
                onClose={() => { if (!busyId) setConfirm(null); }}
            >
                <DialogTitle>
                    {confirm?.type === 'reopen' ? t('periods.reopen_title') : t('periods.close_title')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {confirm?.type === 'reopen'
                            ? t('periods.reopen_confirm', {
                                name: confirm?.office?.name || '',
                                month: confirm?.monthLabel || confirm?.month || '',
                                days: confirm?.daySpan || '',
                            })
                            : t('periods.close_confirm', {
                                name: confirm?.office?.name || '',
                                month: confirm?.monthLabel || confirm?.month || '',
                                days: confirm?.daySpan || '',
                            })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(null)} disabled={Boolean(busyId)}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color={confirm?.type === 'reopen' ? 'warning' : 'primary'}
                        disabled={Boolean(busyId)}
                        onClick={() => confirm && runChange(confirm.office, confirm.type, confirm.month)}
                    >
                        {busyId
                            ? t('common.processing')
                            : (confirm?.type === 'reopen' ? t('periods.reopen') : t('periods.close'))}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
